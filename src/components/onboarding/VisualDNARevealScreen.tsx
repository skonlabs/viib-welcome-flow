import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface VisualDNARevealScreenProps {
  selections: string[];
  onContinue: () => void;
  onBack: () => void;
}

export const VisualDNARevealScreen = ({ selections, onContinue, onBack }: VisualDNARevealScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
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
        className="relative z-10 w-full max-w-4xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="space-y-12">
          {/* Header */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-16 h-16 mx-auto text-gradient" />
            </motion.div>
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">This is your Visual DNA</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Your unique taste signature is taking shape...
            </p>
          </motion.div>

          {/* Mosaic Grid - Show actual selections */}
          <motion.div
            className="grid grid-cols-3 gap-4 max-w-3xl mx-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
          >
            {selections.slice(0, 3).map((selection, index) => (
              <motion.div
                key={selection || index}
                className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-full h-full flex items-center justify-center p-2">
                  {selection ? (
                    <span className="text-sm font-medium text-center text-white/80 truncate">
                      {selection}
                    </span>
                  ) : (
                    <span className="text-4xl">
                      {["🎬", "✨", "🎭"][index]}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            {/* Fill remaining slots with placeholder if less than 3 selections */}
            {selections.length < 3 && [...Array(3 - Math.min(selections.length, 3))].map((_, index) => (
              <motion.div
                key={`placeholder-${index}`}
                className="aspect-video rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-white/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{ delay: 0.8 + (selections.length + index) * 0.1 }}
              >
                <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                  {["🎬", "✨", "🎭"][selections.length + index]}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* DNA Strands Animation */}
          <motion.div
            className="flex justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-20 rounded-full bg-gradient-to-t from-primary to-accent"
                animate={{
                  scaleY: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>

          {/* Continue */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              onClick={onContinue}
              size="2xl"
              variant="gradient"
              className="shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              Continue Building My Profile
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
