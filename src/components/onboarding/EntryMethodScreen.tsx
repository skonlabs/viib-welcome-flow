import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, Apple, ArrowRight } from "lucide-react";

interface EntryMethodScreenProps {
  onSelectMethod: (method: "email" | "phone" | "apple") => void;
}

export const EntryMethodScreen = ({ onSelectMethod }: EntryMethodScreenProps) => {
  const method = { 
    id: "phone" as const, 
    icon: Phone, 
    label: "Continue with Phone",
    gradient: "from-primary to-accent",
    iconColor: "text-white"
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Animated Background */}
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
      >
        <div className="space-y-10">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">Let's get started</span>
            </h2>
            <p className="text-muted-foreground text-base">
              Choose your preferred way to sign in
            </p>
          </motion.div>

          {/* Phone Entry Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            className="pt-4"
          >
            <motion.button
              onClick={() => onSelectMethod(method.id)}
              className={`w-full group relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r ${method.gradient} shadow-2xl shadow-primary/20 transition-all duration-300`}
              whileHover={{ scale: 1.03, y: -8 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative z-10 flex flex-col items-center gap-6">
                <motion.div 
                  className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <method.icon className={`w-10 h-10 ${method.iconColor}`} strokeWidth={2.5} />
                </motion.div>
                <div className="text-center space-y-2">
                  <span className="text-white font-semibold text-2xl block">
                    {method.label}
                  </span>
                  <span className="text-white/70 text-sm">
                    We'll send you a verification code
                  </span>
                </div>
                <ArrowRight className="w-6 h-6 text-white/70 group-hover:translate-x-2 group-hover:text-white transition-all duration-300" />
              </div>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-accent to-secondary opacity-0 group-hover:opacity-100"
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>

          {/* Privacy Note */}
          <motion.p
            className="text-center text-sm font-medium text-foreground/80 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Your data stays yours. Always
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
