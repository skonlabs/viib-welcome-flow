import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, Apple } from "lucide-react";

interface EntryMethodScreenProps {
  onSelectMethod: (method: "email" | "phone" | "apple") => void;
}

export const EntryMethodScreen = ({ onSelectMethod }: EntryMethodScreenProps) => {
  const methods = [
    { id: "apple" as const, icon: Apple, label: "Continue with Apple" },
    { id: "phone" as const, icon: Phone, label: "Continue with Phone" },
    { id: "email" as const, icon: Mail, label: "Continue with Email" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-focus animate-gradient" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Glass Card */}
        <div className="glass-card rounded-3xl p-8 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-light text-foreground">
              Choose how to continue
            </h2>
          </div>

          {/* Method Buttons */}
          <div className="space-y-4">
            {methods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Button
                  onClick={() => onSelectMethod(method.id)}
                  className="w-full h-14 text-base font-light bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] group"
                >
                  <method.icon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                  {method.label}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Microcopy */}
          <motion.p
            className="text-sm text-center text-muted-foreground/70 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Your data stays yours. Always.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};
