import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen = ({ onContinue }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-hero animate-gradient" />
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative">
            <h1 className="text-6xl font-light tracking-wider text-foreground glow-primary">
              ViiB
            </h1>
            <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse-glow" />
          </div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          className="space-y-4 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h2 className="text-3xl font-light text-foreground">
            Welcome to ViiB
          </h2>
          <p className="text-lg text-muted-foreground tracking-wide">
            Your personal space for discovering what truly feels right.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="relative px-12 py-6 text-lg font-light tracking-wide bg-primary/90 hover:bg-primary border-2 border-primary/50 glow-primary transition-all duration-300 hover:scale-105"
          >
            Begin Your Vibe
          </Button>
        </motion.div>

        {/* Footer Microcopy */}
        <motion.p
          className="text-sm text-muted-foreground/70 tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          Private by design · No noise · Only what matters
        </motion.p>
      </motion.div>
    </div>
  );
};
