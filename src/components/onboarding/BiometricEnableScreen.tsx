import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Fingerprint, ArrowRight } from "lucide-react";

interface BiometricEnableScreenProps {
  onEnable: () => void;
  onSkip: () => void;
}

export const BiometricEnableScreen = ({ onEnable, onSkip }: BiometricEnableScreenProps) => {
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        <div className="space-y-10">
          {/* Icon */}
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-r from-primary to-accent opacity-60" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Fingerprint className="w-16 h-16 text-white" />
              </div>
            </motion.div>
          </motion.div>

          {/* Text */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-gradient">
              Unlock ViiB faster
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Use Face ID or Touch ID for quick, secure access to your personalized experience
            </p>
          </motion.div>

          {/* Buttons */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={onEnable}
              size="lg"
              className="w-full h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            >
              Enable Secure Unlock
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <button
              onClick={onSkip}
              className="w-full text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </motion.div>

          {/* Security Badge */}
          <motion.div
            className="glass-card rounded-2xl p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              🔒 Your biometric data never leaves your device and is secured by your phone's built-in encryption
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
