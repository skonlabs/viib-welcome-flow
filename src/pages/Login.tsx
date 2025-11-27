import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { FloatingParticles } from "@/components/onboarding/FloatingParticles";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });
const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, { message: "Please enter a valid phone number" });

export default function Login() {
  const [activeTab, setActiveTab] = useState("email");
  
  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Phone login state
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  
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

  // Start resend timer
  const startResendTimer = () => {
    setResendTimer(60);
  };

  // Timer countdown effect
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

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
        
        // Check onboarding status
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', data.userId)
          .single();
        
        if (userError) {
          console.error('Error checking onboarding:', userError);
          navigate("/app/home");
          return;
        }
        
        // For email login with password, we already verified identity
        // So redirect directly to onboarding without additional OTP if needed
        if (!user.onboarding_completed) {
          localStorage.setItem('viib_resume_onboarding', 'true');
          navigate("/app/onboarding/biometric");
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

      if (!user.is_active) {
        setError("Your account is inactive. Please contact support.");
        return;
      }

      // Send OTP
      const { data, error: invokeError } = await supabase.functions.invoke("send-phone-otp", {
        body: { phoneNumber: fullPhoneNumber },
      });

      if (invokeError || data?.error) {
        setError("Unable to send verification code. Please try again.");
        return;
      }

      setOtpSent(true);
      startResendTimer();
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    setLoading(true);
    setError("");

    try {
      // Verify OTP
      const { data, error: invokeError } = await supabase.functions.invoke("verify-phone-otp", {
        body: { phoneNumber: fullPhoneNumber, otpCode: otp },
      });

      if (invokeError) {
        setError("Unable to verify code. Please try again.");
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Invalid verification code");
        return;
      }

      // Get user ID
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, onboarding_completed")
        .eq("phone_number", fullPhoneNumber)
        .eq("is_active", true)
        .eq("is_phone_verified", true)
        .maybeSingle();

      if (userError || !user) {
        setError("Unable to complete sign in. Please try again.");
        return;
      }

      // Store session
      const sessionData = {
        userId: user.id,
        rememberMe: false,
        timestamp: Date.now()
      };

      sessionStorage.setItem('viib_session', JSON.stringify(sessionData));
      localStorage.setItem('viib_user_id', user.id);
      
      // Check onboarding status
      if (!user.onboarding_completed) {
        localStorage.setItem('viib_resume_onboarding', 'true');
        navigate("/app/onboarding/biometric");
      } else {
        navigate("/app/home");
      }
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-8">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
              ViiB
            </h1>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to continue your journey
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            className="glass-card rounded-3xl p-8 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              setError("");
              setOtpSent(false);
              setOtp("");
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>

              {/* Email Login Tab */}
              <TabsContent value="email" className="space-y-6 mt-6">
                {/* Email */}
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">
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
                    className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10"
                  />
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">
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
                      className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 pr-12"
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-email"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label htmlFor="remember-email" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <a
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                {error && activeTab === "email" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}

                <Button
                  onClick={handleEmailLogin}
                  disabled={loading}
                  size="2xl"
                  variant="gradient"
                  className="w-full shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
                >
                  {loading ? "Signing In..." : "Sign In"}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </TabsContent>

              {/* Phone Login Tab */}
              <TabsContent value="phone" className="space-y-6 mt-6">
                {!otpSent ? (
                  <>
                    {/* Phone Number */}
                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        Phone Number
                      </label>
                      <div className="flex gap-3">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-14 w-28 px-2 rounded-xl bg-white/5 border border-white/10 text-foreground focus:border-primary/50 focus:bg-white/10 focus:outline-none text-sm"
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
                          className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 flex-1"
                        />
                      </div>
                    </div>

                    {error && activeTab === "phone" && !otpSent && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </motion.div>
                    )}

                    <Button
                      onClick={handleSendPhoneOTP}
                      disabled={loading}
                      size="2xl"
                      variant="gradient"
                      className="w-full shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
                    >
                      {loading ? "Sending Code..." : "Send Code"}
                      {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* OTP Input */}
                    <div className="space-y-3">
                      <label className="text-sm text-muted-foreground">
                        Enter 6-digit code sent to {countryCode} {phoneNumber}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Code expires in 5 minutes
                      </p>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otp}
                          onChange={(value) => {
                            setOtp(value);
                            setError("");
                          }}
                        >
                          <InputOTPGroup className="gap-2 sm:gap-3">
                            <InputOTPSlot index={0} className="w-12 sm:w-14 h-14 sm:h-16 text-xl bg-white/5 border-white/10" />
                            <InputOTPSlot index={1} className="w-12 sm:w-14 h-14 sm:h-16 text-xl bg-white/5 border-white/10" />
                            <InputOTPSlot index={2} className="w-12 sm:w-14 h-14 sm:h-16 text-xl bg-white/5 border-white/10" />
                            <InputOTPSlot index={3} className="w-12 sm:w-14 h-14 sm:h-16 text-xl bg-white/5 border-white/10" />
                            <InputOTPSlot index={4} className="w-12 sm:w-14 h-14 sm:h-16 text-xl bg-white/5 border-white/10" />
                            <InputOTPSlot index={5} className="w-12 sm:w-14 h-14 sm:h-16 text-xl bg-white/5 border-white/10" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>

                    {error && activeTab === "phone" && otpSent && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </motion.div>
                    )}

                    <div className="space-y-3">
                      <Button
                        onClick={handleVerifyPhoneOTP}
                        disabled={loading || otp.length !== 6}
                        size="2xl"
                        variant="gradient"
                        className="w-full shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
                      >
                        {loading ? "Verifying..." : "Verify & Sign In"}
                        {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                      </Button>
                      
                      {/* Resend Code Button */}
                      <button
                        onClick={handleSendPhoneOTP}
                        disabled={resendTimer > 0 || loading}
                        className="w-full text-sm text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                      </button>

                      <button
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setError("");
                          setResendTimer(0);
                        }}
                        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Use a different number
                      </button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <p className="text-sm text-center text-muted-foreground pt-4 border-t border-white/10">
              Don't have an account?{" "}
              <a
                href="/app/onboarding/welcome"
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Sign Up
              </a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
