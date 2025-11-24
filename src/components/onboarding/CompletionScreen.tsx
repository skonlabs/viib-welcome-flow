import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface CompletionScreenProps {
  userName: string;
  onComplete: () => void;
}

export const CompletionScreen = ({ userName, onComplete }: CompletionScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-hero animate-gradient" />

      {/* Confetti Effect */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `hsl(${Math.random() * 360}, 70%, 60%)`,
              left: `${Math.random() * 100}%`,
              top: `-5%`,
            }}
            animate={{
              y: ["0vh", "110vh"],
              rotate: [0, 360],
              opacity: [1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center space-y-8 max-w-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Icon */}
        <motion.div
          className="flex items-center justify-center"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative">
            <Sparkles className="w-24 h-24 text-accent glow-accent" />
            <motion.div
              className="absolute inset-0 blur-2xl bg-accent/30"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h1 className="text-4xl font-light text-foreground">
            Your world is ready{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-lg text-muted-foreground tracking-wide">
            ViiB has learned your vibe and is excited to show you what feels right
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <Button
            onClick={onComplete}
            size="lg"
            className="px-12 py-6 text-lg font-light bg-accent text-accent-foreground hover:bg-accent/90 glow-accent transition-all duration-300 hover:scale-105"
          >
            Enter My Flow
          </Button>
        </motion.div>

        {/* Footer Message */}
        <motion.p
          className="text-sm text-muted-foreground/70 tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          Your personalized journey begins now
        </motion.p>
      </motion.div>
    </div>
  );
};
