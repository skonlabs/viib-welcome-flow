import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, Apple, ArrowRight, Lock } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface EntryMethodScreenProps {
  onSelectMethod: (method: "email" | "phone" | "apple") => void;
  onBack: () => void;
}

export const EntryMethodScreen = ({ onSelectMethod, onBack }: EntryMethodScreenProps) => {
  const methods = [
    { 
      id: "phone" as const, 
      icon: Phone, 
      label: "Continue with Phone",
      description: "We'll send you a verification code",
      gradient: "from-primary to-accent"
    },
    { 
      id: "email" as const, 
      icon: Mail, 
      label: "Continue with Email",
      description: "Sign in with your email address",
      gradient: "from-secondary to-primary"
    }
  ];

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

          {/* Sign-in Methods */}
          <div className="space-y-4">
            {methods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, type: "spring", stiffness: 100 }}
              >
                <motion.button
                  onClick={() => onSelectMethod(method.id)}
                  className={`w-full group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r ${method.gradient} shadow-2xl shadow-primary/20 transition-all duration-300`}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative z-10 flex items-center gap-6">
                    <motion.div 
                      className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <method.icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex-1 text-left space-y-1">
                      <span className="text-white font-semibold text-xl block">
                        {method.label}
                      </span>
                      <span className="text-white/70 text-sm">
                        {method.description}
                      </span>
                    </div>
                    <ArrowRight className="w-6 h-6 text-white/70 group-hover:translate-x-2 group-hover:text-white transition-all duration-300 flex-shrink-0" />
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-accent to-secondary opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Privacy Note */}
          <motion.div
            className="flex items-center justify-center gap-2 pt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Lock className="w-3 h-3 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground/60">
              Your data stays yours. Always
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
