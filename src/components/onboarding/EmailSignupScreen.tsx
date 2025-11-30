import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Check, X, AlertCircle } from "@/icons";
import { BackButton } from "./BackButton";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { FloatingParticles } from "./FloatingParticles";

const emailSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
});

interface EmailSignupScreenProps {
  onContinue: (email: string, password: string) => void;
  onBack: () => void;
}

export const EmailSignupScreen = ({ onContinue, onBack }: EmailSignupScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");

  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = getPasswordStrength();
  
  // Map strength (0-5) to 3 levels: Weak (1-2), Medium (3), Strong (4-5)
  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 2) return "Weak";
    if (strength === 3) return "Medium";
    return "Strong";
  };
  
  const getStrengthColor = () => {
    if (strength === 0) return "";
    if (strength <= 2) return "hsl(0, 84%, 60%)"; // Red
    if (strength === 3) return "hsl(38, 92%, 50%)"; // Orange
    return "hsl(142, 71%, 45%)"; // Green
  };
  
  const strengthLabel = getStrengthLabel();
  const strengthColor = getStrengthColor();

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
  ];

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse({ email: value });
      setEmailError("");
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setEmailError(err.errors[0].message);
      }
      return false;
    }
  };

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = !emailError && email.trim().length > 0 && strength >= 3 && passwordsMatch;

  const handleSignup = async () => {
    if (!isValid) return;

    setLoading(true);
    setError("");

    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email, is_email_verified, onboarding_completed')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        setError("Unable to verify email. Please try again.");
        return;
      }

      if (existingUser) {
        // If email verified and onboarding complete, they should use login
        if (existingUser.is_email_verified && existingUser.onboarding_completed) {
          setError("This email address is already registered. Please sign in instead.");
          return;
        }
        
        // SECURITY: Always require OTP verification, even for incomplete onboarding
        // This prevents someone from entering another person's email and gaining access
      }

      // Send OTP to email
      const { data, error: invokeError } = await supabase.functions.invoke("send-email-otp", {
        body: { email },
      });

      if (invokeError) {
        setError("Unable to send verification code. Please check your email and try again.");
        return;
      }

      if (data?.error) {
        setError("Unable to send verification code. Please try again later.");
        return;
      }

      // Success - proceed to OTP verification
      onContinue(email, password);
    } catch (err) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <BackButton onClick={onBack} />
      
      {/* Background container - fixed positioning */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40"
            style={{
              background: "radial-gradient(circle, #a855f7 0%, transparent 70%)"
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

      {/* Floating Particles */}
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
            className="text-center space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 mb-2">
              <span className="text-5xl">🔐</span>
            </div>
            <h2 className="text-4xl font-bold mt-4">
              <span className="text-gradient">Create your account</span>
            </h2>
            <p className="text-base text-[#9ca3af] mt-2">
              Set up your secure credentials
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            className="rounded-[32px] p-10 space-y-6 backdrop-blur-xl bg-[#1e293b]/90 border border-[#334155]/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
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
                  if (e.target.value) {
                    validateEmail(e.target.value);
                  } else {
                    setEmailError("");
                  }
                }}
                onBlur={() => email && validateEmail(email)}
                placeholder="you@example.com"
                className={`h-[56px] text-base bg-[#0f172a]/60 border-[#1e293b] focus:border-cyan-500/50 focus:bg-[#0f172a] rounded-2xl placeholder:text-[#475569] transition-all ${
                  emailError ? "border-red-500/50" : ""
                }`}
              />
              {emailError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-red-400"
                >
                  <AlertCircle className="w-4 h-4" />
                  {emailError}
                </motion.div>
              )}
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
                    if (confirmPassword && e.target.value !== confirmPassword) {
                      setPasswordMatchError("Passwords do not match");
                    } else {
                      setPasswordMatchError("");
                    }
                  }}
                  placeholder="Create a strong password"
                  className="h-[56px] text-base bg-[#0f172a]/60 border-[#1e293b] focus:border-cyan-500/50 focus:bg-[#0f172a] pr-12 rounded-2xl placeholder:text-[#475569] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Strength Indicator */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: strengthColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(strength / 5) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-sm font-medium" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-2">
                    {requirements.map((req, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50" />
                        )}
                        <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
                          {req.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm text-[#94a3b8] font-normal">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (password && e.target.value !== password) {
                      setPasswordMatchError("Passwords do not match");
                    } else {
                      setPasswordMatchError("");
                    }
                  }}
                  placeholder="Confirm your password"
                  className={`h-[56px] text-base bg-[#0f172a]/60 border-[#1e293b] focus:border-cyan-500/50 focus:bg-[#0f172a] pr-12 rounded-2xl placeholder:text-[#475569] transition-all ${
                    passwordMatchError ? "border-red-500/50" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordMatchError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-red-400"
                >
                  <AlertCircle className="w-4 h-4" />
                  {passwordMatchError}
                </motion.div>
              )}
              {passwordsMatch && confirmPassword && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-green-400"
                >
                  <Check className="w-4 h-4" />
                  Passwords match
                </motion.div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div className="pt-6 space-y-4">
              <Button
                onClick={handleSignup}
                disabled={!isValid || loading}
                variant="gradient"
                size="2xl"
                className="w-full"
                loading={loading}
              >
                {!loading && "Send Code"}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
              <button
                onClick={onBack}
                className="w-full text-sm text-[#94a3b8] hover:text-white transition-colors"
              >
                Use a different method
              </button>
              <p className="text-sm text-center text-[#94a3b8]">
                Already have an account?{" "}
                <button
                  onClick={() => window.location.href = "/login?tab=email"}
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Sign In
                </button>
              </p>
            </div>
          </motion.div>

          {/* Privacy Note */}
          <motion.p
            className="text-xs text-center text-[#64748b]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            🔒 Your email is encrypted and never shared
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
};
