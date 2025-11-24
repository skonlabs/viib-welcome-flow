import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface CompletionScreenProps {
  userName: string;
  onComplete: () => void;
}

export const CompletionScreen = ({ userName, onComplete }: CompletionScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-ocean" />

      {/* Ambient Elements */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center space-y-10 max-w-xl mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Success Icon */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Check className="w-12 h-12 text-primary" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <h1 className="text-4xl font-light text-foreground">
            You're all set{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your personalized experience is ready. ViiB has learned your preferences and is excited to help you discover your next favorite watch.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-2xl font-light text-foreground">✓</p>
              <p className="text-xs text-muted-foreground">Profile</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-light text-foreground">✓</p>
              <p className="text-xs text-muted-foreground">Preferences</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-light text-foreground">✓</p>
              <p className="text-xs text-muted-foreground">Taste Profile</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="pt-4"
        >
          <Button
            onClick={onComplete}
            size="lg"
            className="px-12 h-14 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-foreground text-base transition-all duration-300"
          >
            Start Exploring
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-xs text-muted-foreground/60 tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          Your journey begins now
        </motion.p>
      </motion.div>
    </div>
  );
};
