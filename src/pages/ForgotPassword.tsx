import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingParticles } from "@/components/onboarding/FloatingParticles";
import { useNavigate } from "react-router-dom";

type Step = "email" | "otp" | "password";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const isEmail = emailOrPhone.includes('@');

  const handleSendOTP = async () => {
    if (!emailOrPhone) {
      setError("Please enter your email or phone");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const functionName = isEmail ? "send-email-otp" : "send-phone-otp";
      const body = isEmail 
        ? { email: emailOrPhone } 
        : { phoneNumber: emailOrPhone };

      const { error: sendError } = await supabase.functions.invoke(functionName, { body });

      if (sendError) {
        setError("Unable to send verification code");
        return;
      }

      setStep("otp");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const functionName = isEmail ? "verify-email-otp" : "verify-phone-otp";
      const body = isEmail 
        ? { email: emailOrPhone, otp: otpCode } 
        : { phoneNumber: emailOrPhone, otp: otpCode };

      const { data, error: verifyError } = await supabase.functions.invoke(functionName, { body });

      if (verifyError || !data?.success) {
        setError(data?.error || "Invalid code");
        return;
      }

      setStep("password");
    } catch (err) {
      setError("Unable to verify code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please enter both passwords");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Hash the new password
      const { data: hashData, error: hashError } = await supabase.functions.invoke("hash-password", {
        body: { password: newPassword },
      });

      if (hashError || !hashData?.success) {
        setError("Unable to process password");
        return;
      }

      // Update password in database
      const updateData = isEmail
        ? { password_hash: hashData.hashedPassword }
        : { password_hash: hashData.hashedPassword };

      const query = isEmail
        ? supabase.from('users').update(updateData).eq('email', emailOrPhone)
        : supabase.from('users').update(updateData).eq('phone_number', emailOrPhone);

      const { error: updateError } = await query;

      if (updateError) {
        setError("Unable to update password");
        return;
      }

      // Success - redirect to login
      navigate('/login');
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40"
            style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
            animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[80px] opacity-30"
            style={{ background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)" }}
            animate={{ x: [0, -80, 0], y: [0, 40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <FloatingParticles />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-8">
          <motion.div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gradient">
              {step === "email" && "Reset Password"}
              {step === "otp" && "Verify Code"}
              {step === "password" && "New Password"}
            </h2>
            <p className="text-muted-foreground">
              {step === "email" && "Enter your email or phone to receive a code"}
              {step === "otp" && `Code sent to ${emailOrPhone}`}
              {step === "password" && "Create a new secure password"}
            </p>
          </motion.div>

          <motion.div className="glass-card rounded-3xl p-8 space-y-6">
            {step === "email" && (
              <>
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">Email or Phone</label>
                  <Input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => {
                      setEmailOrPhone(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com or +1234567890"
                    className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10"
                  />
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

                <Button
                  onClick={handleSendOTP}
                  disabled={loading}
                  size="2xl"
                  variant="gradient"
                  className="w-full"
                >
                  {loading ? "Sending..." : "Send Code"}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newOtp = [...otp];
                        newOtp[index] = e.target.value;
                        setOtp(newOtp);
                        setError("");
                      }}
                      className="w-12 h-14 text-center text-xl font-bold bg-white/5 border-white/10"
                    />
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

                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  size="2xl"
                  variant="gradient"
                  className="w-full"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </>
            )}

            {step === "password" && (
              <>
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter new password"
                    className="h-14 text-lg bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Confirm new password"
                    className="h-14 text-lg bg-white/5 border-white/10"
                  />
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

                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  size="2xl"
                  variant="gradient"
                  className="w-full"
                >
                  {loading ? "Updating..." : "Reset Password"}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </>
            )}

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
