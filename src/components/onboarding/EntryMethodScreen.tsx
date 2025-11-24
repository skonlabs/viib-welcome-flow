import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, Apple } from "lucide-react";

interface EntryMethodScreenProps {
  onSelectMethod: (method: "email" | "phone" | "apple") => void;
}

export const EntryMethodScreen = ({ onSelectMethod }: EntryMethodScreenProps) => {
  const methods = [
    { 
      id: "apple" as const, 
      icon: Apple, 
      label: "Continue with Apple",
      description: "Fast and secure"
    },
    { 
      id: "email" as const, 
      icon: Mail, 
      label: "Continue with Email",
      description: "Use your email address"
    },
    { 
      id: "phone" as const, 
      icon: Phone, 
      label: "Continue with Phone",
      description: "Get a verification code"
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-aurora" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-light text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Choose your preferred sign-in method
            </p>
          </div>

          {/* Method Cards */}
          <div className="space-y-3">
            {methods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
              >
                <button
                  onClick={() => onSelectMethod(method.id)}
                  className="w-full glass-card rounded-2xl p-5 hover:bg-card/80 transition-all duration-300 group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <method.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-normal text-base">
                        {method.label}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Privacy Note */}
          <motion.div
            className="glass-subtle rounded-xl p-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your data is encrypted and never shared with third parties. 
              We only use it to personalize your experience.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
