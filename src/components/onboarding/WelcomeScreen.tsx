import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export const WelcomeScreen = ({ onContinue }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Animated Background */}
      <div className="absolute inset-0 gradient-ocean" />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center max-w-2xl mx-auto space-y-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="space-y-6"
        >
          <h1 className="text-7xl md:text-8xl font-extralight tracking-tight text-foreground">
            ViiB
          </h1>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent" />
        </motion.div>

        {/* Tagline */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <h2 className="text-2xl md:text-3xl font-light text-foreground/90 tracking-wide">
            Discover content that resonates
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            A personalized streaming companion that understands your mood, taste, and the perfect moment to watch.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="pt-4"
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="group relative px-8 md:px-12 h-14 text-base font-normal bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-foreground transition-all duration-500 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Begin your journey
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </Button>
        </motion.div>

        {/* Privacy Note */}
        <motion.p
          className="text-xs text-muted-foreground/60 tracking-wider uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          Private · Personalized · Effortless
        </motion.p>
      </motion.div>
    </div>
  );
};
