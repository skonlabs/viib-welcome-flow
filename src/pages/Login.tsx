import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FloatingParticles } from "@/components/onboarding/FloatingParticles";
import { OTPVerificationBase } from "@/components/onboarding/OTPVerificationBase";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });
const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, { message: "Please enter a valid phone number" });

export default function Login() {
  const [searchParams] = useSearchParams();
  const loginMethod = searchParams.get('tab') || 'email'; // default to email
  
  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Phone login state
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };


  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }

    try {
      emailSchema.parse(email);
    } catch {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-password", {
        body: { email, password },
      });

      if (invokeError) {
        setError("Unable to sign in. Please check your credentials.");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.success && data?.userId) {
        // Clear any old session data first
        localStorage.removeItem('viib_user_id');
        localStorage.removeItem('viib_session');
        localStorage.removeItem('viib_resume_onboarding');
        sessionStorage.removeItem('viib_session');
        
        const sessionData = {
          userId: data.userId,
          rememberMe,
          timestamp: Date.now()
        };

        if (rememberMe) {
          localStorage.setItem('viib_session', JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem('viib_session', JSON.stringify(sessionData));
        }
        
        localStorage.setItem('viib_user_id', data.userId);
        
        // Wait a moment to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check onboarding status
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('onboarding_completed, last_onboarding_step')
          .eq('id', data.userId)
          .single();
        
        if (userError) {
          console.error('Error checking onboarding:', userError);
          navigate("/app/home");
          return;
        }
        
        if (!user.onboarding_completed) {
          localStorage.setItem('viib_resume_onboarding', 'true');
          navigate(user.last_onboarding_step || "/app/onboarding/welcome");
        } else {
          navigate("/app/home");
        }
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOTP = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

    try {
      phoneSchema.parse(fullPhoneNumber);
    } catch {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, is_active, is_phone_verified, onboarding_completed")
        .eq("phone_number", fullPhoneNumber)
        .maybeSingle();

      if (userError) {
        setError("Unable to sign in. Please try again.");
        return;
      }

      if (!user) {
        setError("No account found with this phone number. Please sign up first.");
        return;
      }

      if (!user.is_phone_verified) {
        setError("Your phone number is not verified. Please complete signup first.");
        return;
      }

      // Note: We don't check onboarding_completed here for phone login
      // After OTP verification, we'll redirect to onboarding if needed
      // This ensures security - OTP must be verified first for phone auth
      
      // Note: We also don't check is_active here because accounts with
      // incomplete onboarding will have is_active: false by design.
      // After OTP verification, we'll check onboarding and redirect appropriately.

      // Send OTP
      const { data, error: invokeError } = await supabase.functions.invoke("send-phone-otp", {
        body: { phoneNumber: fullPhoneNumber },
      });

      if (invokeError || data?.error) {
        setError("Unable to send verification code. Please try again.");
        return;
      }

      setOtpSent(true);
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async (code: string) => {
    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

    // Verify OTP
    const { data, error: invokeError } = await supabase.functions.invoke("verify-phone-otp", {
      body: { phoneNumber: fullPhoneNumber, otpCode: code },
    });

    if (invokeError) {
      throw new Error("Unable to verify code. Please try again.");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Invalid verification code");
    }

    // Get user ID and status
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, onboarding_completed, is_active, last_onboarding_step")
      .eq("phone_number", fullPhoneNumber)
      .eq("is_phone_verified", true)
      .maybeSingle();

    if (userError || !user) {
      throw new Error("Unable to complete sign in. Please try again.");
    }

    // Clear any old session data first
    localStorage.removeItem('viib_user_id');
    localStorage.removeItem('viib_session');
    localStorage.removeItem('viib_resume_onboarding');
    sessionStorage.removeItem('viib_session');
    
    // Store new session
    const sessionData = {
      userId: user.id,
      rememberMe: false,
      timestamp: Date.now()
    };

    sessionStorage.setItem('viib_session', JSON.stringify(sessionData));
    localStorage.setItem('viib_user_id', user.id);
    
    // Wait a moment to ensure localStorage is written
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check onboarding status
    if (!user.onboarding_completed) {
      localStorage.setItem('viib_resume_onboarding', 'true');
      navigate(user.last_onboarding_step || "/app/onboarding/welcome");
    } else {
      navigate("/app/home");
    }
  };

  const handleResendPhoneOTP = async () => {
    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    const { data, error: invokeError } = await supabase.functions.invoke("send-phone-otp", {
      body: { phoneNumber: fullPhoneNumber },
    });

    if (invokeError || data?.error) {
      throw new Error("Unable to send verification code. Please try again.");
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // If OTP screen is shown, use shared OTP component
  if (otpSent && loginMethod === "phone") {
    return (
      <OTPVerificationBase
        icon="📱"
        title="Check your phone"
        contactInfo={formatPhoneDisplay(`${countryCode}${phoneNumber.replace(/\D/g, '')}`)}
        onVerify={handleVerifyPhoneOTP}
        onResend={handleResendPhoneOTP}
        onChangeContact={() => {
          setOtpSent(false);
          setError("");
        }}
        changeContactLabel="Change Number"
      />
    );
  }

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40"
            style={{
              background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)"
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[80px] opacity-30"
            style={{
              background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)"
            }}
            animate={{
              x: [0, -80, 0],
              y: [0, 40, 0]
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>

      <FloatingParticles />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="space-y-8">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-primary to-cyan-400 bg-clip-text text-transparent">
              ViiB
            </h1>
            <h2 className="text-4xl font-bold text-white mt-4">
              Welcome back
            </h2>
            <p className="text-base text-[#9ca3af] mt-2">
              Sign in to continue your journey
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            className="rounded-[32px] p-10 space-y-6 backdrop-blur-xl bg-[#1e293b]/90 border border-[#334155]/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {loginMethod === 'email' ? (
              /* Email Login Form */
              <div className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm text-[#94a3b8] font-normal">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    className="h-[56px] text-base bg-[#0f172a]/60 border-[#1e293b] focus:border-cyan-500/50 focus:bg-[#0f172a] rounded-2xl placeholder:text-[#475569] transition-all"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm text-[#94a3b8] font-normal">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter your password"
                      className="h-[56px] text-base bg-[#0f172a]/60 border-[#1e293b] focus:border-cyan-500/50 focus:bg-[#0f172a] pr-12 rounded-2xl placeholder:text-[#475569] transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-email"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label htmlFor="remember-email" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <a
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Forgot password?
                  </a>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}

                <div className="pt-4">
                  <Button
                    onClick={handleEmailLogin}
                    disabled={!email || !password || loading}
                    variant="gradient"
                    size="2xl"
                    className="w-full"
                    loading={loading}
                  >
                    {!loading && "Sign In"}
                    {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                  </Button>
                </div>
              </div>
            ) : (
              /* Phone Login Form */
              <div className="space-y-6">
                {!otpSent ? (
                  <>
                    {/* Phone Number */}
                    <div className="space-y-3">
                      <label className="text-sm text-[#a1a8c4] font-normal">
                        Phone Number
                      </label>
                      <div className="flex gap-3">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-14 w-28 px-3 rounded-xl bg-[#151829]/80 border border-[#2a2f45] text-foreground focus:border-primary/50 focus:bg-[#151829] focus:outline-none text-base"
                        >
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+86">🇨🇳 +86</option>
                          <option value="+81">🇯🇵 +81</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+61">🇦🇺 +61</option>
                          <option value="+55">🇧🇷 +55</option>
                          <option value="+52">🇲🇽 +52</option>
                        </select>
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            setPhoneNumber(formatPhoneNumber(e.target.value));
                            setError("");
                          }}
                          placeholder="(123) 456-7890"
                          maxLength={14}
                          className="h-14 text-base bg-[#151829]/80 border-[#2a2f45] focus:border-primary/50 focus:bg-[#151829] flex-1 rounded-xl placeholder:text-[#6b7280]"
                        />
                      </div>
                    </div>

                    {error && !otpSent && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </motion.div>
                    )}

                    <div className="pt-2">
                      <Button
                        onClick={handleSendPhoneOTP}
                        disabled={!phoneNumber || loading}
                        variant="gradient"
                        size="2xl"
                        className="w-full"
                        loading={loading}
                      >
                        {!loading && "Send Code"}
                        {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Bottom Link */}
            <div className="pt-6 border-t border-[#334155]/30">
              <p className="text-sm text-center text-[#94a3b8]">
                Don't have an account?{" "}
                <a
                  href="/app/onboarding/welcome"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Sign Up
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
