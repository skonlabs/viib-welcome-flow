import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";

interface OTPVerificationScreenProps {
  phone: string;
  onContinue: (otp: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
}

export const OTPVerificationScreen = ({
  phone,
  onContinue,
  onResend,
  onChangeNumber,
}: OTPVerificationScreenProps) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit) && newOtp.join("").length === 6) {
      setTimeout(() => onContinue(newOtp.join("")), 300);
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
      setTimeout(() => onContinue(newOtp.join("")), 300);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 gradient-electric opacity-20" />
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse at 20% 30%, #a855f720 0%, transparent 50%)",
            "radial-gradient(ellipse at 80% 70%, #ec489920 0%, transparent 50%)",
            "radial-gradient(ellipse at 20% 30%, #a855f720 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

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
              <span className="text-4xl">📱</span>
            </motion.div>
            <h2 className="text-3xl font-bold text-gradient">
              Check your phone
            </h2>
            <p className="text-muted-foreground">
              We sent a code to <span className="text-foreground font-medium">{phone}</span>
            </p>
          </motion.div>

          {/* OTP Input */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
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
                    className="w-14 h-16 text-center text-2xl font-bold bg-white/5 border-white/10 focus:border-primary focus:bg-white/10 focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center gap-6 text-sm">
              <button
                onClick={onResend}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Resend Code
              </button>
              <button
                onClick={onChangeNumber}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Change Number
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
