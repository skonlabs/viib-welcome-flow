import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Check, X } from "lucide-react";

interface EmailSignupScreenProps {
  onContinue: (email: string, password: string) => void;
  onBack: () => void;
}

export const EmailSignupScreen = ({ onContinue, onBack }: EmailSignupScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Excellent"][strength];
  const strengthColor = ["", "red", "orange", "yellow", "lime", "green"][strength];

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
  ];

  const isValid = email.includes("@") && strength >= 3;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 gradient-ocean opacity-80" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-3xl font-bold text-gradient">
              Create your account
            </h2>
            <p className="text-muted-foreground">
              Set up your secure credentials
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            className="glass-card rounded-3xl p-8 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* Email */}
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

            <div className="pt-4 space-y-4">
              <Button
                onClick={() => onContinue(email, password)}
                disabled={!isValid}
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                Secure My Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <button
                onClick={onBack}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different method
              </button>
            </div>
          </motion.div>

          {/* Privacy Note */}
          <motion.p
            className="text-xs text-center text-muted-foreground/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            🔒 Your email is encrypted and never shared
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
