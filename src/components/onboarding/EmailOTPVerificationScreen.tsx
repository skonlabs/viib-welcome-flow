import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface EmailOTPVerificationScreenProps {
  email: string;
  password: string;
  onContinue: () => void;
  onBack: () => void;
}

export const EmailOTPVerificationScreen = ({
  email,
  password,
  onContinue,
  onBack,
}: EmailOTPVerificationScreenProps) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    // Clear error when user starts typing
    if (error) setError("");

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit) && newOtp.join("").length === 6) {
      setTimeout(() => handleVerify(newOtp.join("")), 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    const newOtp = pastedData.slice(0, 6).split("");
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill("")]);
    if (newOtp.length === 6) {
      setTimeout(() => handleVerify(newOtp.join("")), 300);
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First check if email is already verified
      const { data: existingUser } = await supabase
        .from('users')
        .select('is_email_verified, signup_method')
        .eq('email', email)
        .maybeSingle();

      if (existingUser?.is_email_verified && existingUser?.signup_method === 'email') {
        setError("An account with this email already exists. Please sign in instead.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke("verify-email-otp", {
        body: { email, otp: code, password },
      });

      if (invokeError) {
        console.error("Invoke error:", invokeError);
        setError("Unable to connect. Please check your connection and try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Check if verification failed and show the specific error from the edge function
      if (!data?.success) {
        setError(data?.error || "Invalid code. Please check and try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Account created but sign in failed. Please try logging in.");
        return;
      }

      onContinue();
    } catch (err) {
      console.error("Verification error:", err);
      setError("Unable to verify code. Please request a new code.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    
    try {
      const { error: invokeError } = await supabase.functions.invoke("send-email-otp", {
        body: { email },
      });

      if (invokeError) {
        setError("Unable to resend code. Please try again.");
        return;
      }

      setTimer(300); // Reset to 5 minutes
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError("Unable to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
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
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mb-4"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-4xl">📧</span>
            </motion.div>
            <h2 className="text-3xl font-bold text-gradient">
              Check your email
            </h2>
            <p className="text-muted-foreground">
              We sent a code to <span className="text-foreground font-medium">{email}</span>
            </p>
          </motion.div>

          {/* OTP Input */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 * index, type: "spring" }}
                >
                  <Input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-white/5 border-white/10 focus:border-primary focus:bg-white/10 focus:ring-2 focus:ring-primary/50 transition-all ${
                      error ? "border-red-500/50" : ""
                    }`}
                  />
                </motion.div>
              ))}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2"
              >
                {error}
              </motion.div>
            )}

            <div className="flex justify-center gap-6 text-sm">
              <button
                onClick={timer === 0 ? handleResend : undefined}
                disabled={timer > 0 || resending}
                className={`flex items-center gap-2 ${
                  timer > 0 || resending
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-muted-foreground hover:text-foreground cursor-pointer"
                } transition-colors`}
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? "Sending..." : timer > 0 ? `Resend in ${formatTime(timer)}` : "Resend Code"}
              </button>
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Change Email
              </button>
            </div>
          </motion.div>

          {/* Auto Submit Indicator */}
          <motion.p
            className="text-xs text-center text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Code will auto-submit when complete
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};