import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Lock, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PhoneEntryScreenProps {
  onContinue: (phone: string, countryCode: string) => void;
  onBack: () => void;
}

export const PhoneEntryScreen = ({ onContinue, onBack }: PhoneEntryScreenProps) => {
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleContinue = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    onContinue(digits, countryCode);
  };

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-gradient">
              Secure your account
            </h2>
            <p className="text-muted-foreground">
              We'll send you a verification code
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            className="glass-card rounded-3xl p-8 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground">
                Phone Number
              </label>
              <div className="flex gap-3">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-24 h-14 bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  value={formatPhoneNumber(phone)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPhone(digits.slice(0, 10));
                    setError("");
                  }}
                  placeholder="(555) 123-4567"
                  className="flex-1 h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10"
                />
              </div>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-red-400"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </div>

            <div className="pt-4 space-y-4">
              <Button
                onClick={handleContinue}
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300"
              >
                Send Code
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
            🔒 No spam. No marketing. Authentication only.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
