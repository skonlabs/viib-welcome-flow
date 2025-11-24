import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, Apple, ArrowRight } from "lucide-react";

interface EntryMethodScreenProps {
  onSelectMethod: (method: "email" | "phone" | "apple") => void;
}

export const EntryMethodScreen = ({ onSelectMethod }: EntryMethodScreenProps) => {
  const methods = [
    { 
      id: "apple" as const, 
      icon: Apple, 
      label: "Continue with Apple",
      gradient: "from-gray-800 to-black",
      iconColor: "text-white"
    },
    { 
      id: "email" as const, 
      icon: Mail, 
      label: "Continue with Email",
      gradient: "from-primary to-accent",
      iconColor: "text-white"
    },
    { 
      id: "phone" as const, 
      icon: Phone, 
      label: "Continue with Phone",
      gradient: "from-secondary to-primary",
      iconColor: "text-white"
    },
  ];

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

          {/* Method Cards */}
          <div className="space-y-4">
            {methods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: 0.3 + index * 0.1, 
                  type: "spring",
                  stiffness: 100
                }}
              >
                <motion.button
                  onClick={() => onSelectMethod(method.id)}
                  className={`w-full group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r ${method.gradient} transition-all duration-300`}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <method.icon className={`w-6 h-6 ${method.iconColor}`} />
                      </div>
                      <span className="text-white font-medium text-lg">
                        {method.label}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-2 group-hover:text-white transition-all duration-300" />
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-white/10"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Privacy Note */}
          <motion.div
            className="glass-card rounded-2xl p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              🔒 Your privacy matters. We use enterprise-grade encryption 
              and never share your data.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
