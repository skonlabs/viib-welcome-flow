import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingParticles } from "@/components/onboarding/FloatingParticles";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });

type Step = "email" | "otp" | "password";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
    return strength;
  };

  const strength = getPasswordStrength();
  
  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 2) return "Weak";
    if (strength === 3) return "Medium";
    return "Strong";
  };
  
  const getStrengthColor = () => {
    if (strength === 0) return "";
    if (strength <= 2) return "hsl(0, 84%, 60%)";
    if (strength === 3) return "hsl(38, 92%, 50%)";
    return "hsl(142, 71%, 45%)";
  };
  
  const strengthLabel = getStrengthLabel();
  const strengthColor = getStrengthColor();

  const requirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "Contains number", met: /[0-9]/.test(newPassword) },
  ];

  const handleSendOTP = async () => {
    if (!email) {
      setError("Please enter your email address");
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
      // Check if account exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, is_email_verified')
        .eq('email', email)
        .maybeSingle();

      if (checkError || !existingUser) {
        setError("No account found with this email address");
        setLoading(false);
        return;
      }

      if (!existingUser.is_email_verified) {
        setError("This email is not verified. Please complete signup first.");
        setLoading(false);
        return;
      }

      // Send OTP
      const { data, error: sendError } = await supabase.functions.invoke("send-email-otp", {
        body: { email }
      });

      if (sendError || data?.error) {
        setError("Unable to send verification code. Please try again.");
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
      // Verify OTP without creating a user (for password reset)
      const { data: verification, error: fetchError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otpCode)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !verification) {
        setError("Invalid or expired verification code");
        return;
      }

      // Check if expired
      if (new Date(verification.expires_at) < new Date()) {
        setError("Your code has expired. Please request a new code.");
        return;
      }

      // Mark as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

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

    if (strength < 3) {
      setError("Please create a stronger password");
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
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashData.hashedPassword })
        .eq('email', email);

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
            style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
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
              {step === "email" && "Enter your email address to receive a verification code"}
              {step === "otp" && `Code sent to ${email}`}
              {step === "password" && "Create a new secure password"}
            </p>
          </motion.div>

          <motion.div className="glass-card rounded-3xl p-8 space-y-6">
            {step === "email" && (
              <>
                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">Email Address</label>
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
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter new password"
                      className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Strength Indicator */}
                  {newPassword && (
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

                <div className="space-y-3">
                  <label className="text-sm text-muted-foreground">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Confirm new password"
                      className={`h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 pr-12 ${
                        confirmPassword && newPassword !== confirmPassword ? "border-red-500/50" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Passwords do not match
                    </motion.div>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
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
