import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface StreamingPlatformsScreenProps {
  onContinue: (platforms: string[]) => void;
  onBack: () => void;
  initialPlatforms?: string[];
}

export const StreamingPlatformsScreen = ({ onContinue, onBack, initialPlatforms = [] }: StreamingPlatformsScreenProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms);

  const platforms = [
    { id: "netflix", name: "Netflix", color: "#E50914" },
    { id: "prime", name: "Prime Video", color: "#00A8E1" },
    { id: "hbo", name: "HBO Max", color: "#B300F6" },
    { id: "disney", name: "Disney+", color: "#0063E5" },
    { id: "hulu", name: "Hulu", color: "#1CE783" },
    { id: "apple", name: "Apple TV+", color: "#000000" },
  ];

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-black">
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
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="space-y-16">
          {/* Header */}
          <motion.div
            className="text-center space-y-5"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              initial={{ scale: 0.8, rotateX: -20 }}
              animate={{ scale: 1, rotateX: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 80, damping: 20 }}
            >
              <h2 className="text-4xl font-bold">
                <span className="text-gradient">
                  Your streaming world
                </span>
              </h2>
            </motion.div>
            <motion.p 
              className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Select the platforms you have access to. We'll only recommend content you can actually watch.
            </motion.p>
          </motion.div>

          {/* Platform Grid */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {platforms.map((platform, index) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              
              return (
                <motion.button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  initial={{ opacity: 0, scale: 0.5, y: 50, rotateX: -30 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                  transition={{ 
                    delay: 0.7 + (0.1 * index),
                    type: "spring",
                    stiffness: 120,
                    damping: 12
                  }}
                  whileHover={{ 
                    scale: 1.08, 
                    y: -12,
                    rotateY: 5,
                    transition: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  whileTap={{ scale: 0.92 }}
                  className="relative overflow-hidden rounded-3xl group perspective-1000"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Multi-layer glow effect */}
                  <div
                    className="absolute -inset-2 rounded-3xl blur-2xl transition-opacity duration-500"
                    style={{ 
                      background: `radial-gradient(circle at center, ${platform.color}66, transparent 60%)`,
                      opacity: isSelected ? 0.7 : 0
                    }}
                  />

                  {/* Outer glow ring */}
                  <div
                    className="absolute -inset-1 rounded-3xl transition-opacity duration-500"
                    style={{ 
                      background: `conic-gradient(from 0deg, ${platform.color}66, transparent, ${platform.color}66)`,
                      opacity: isSelected ? 0.6 : 0
                    }}
                  />

                  {/* Card container */}
                  <div className={`relative aspect-video overflow-hidden rounded-3xl border transition-all duration-500 ${
                    isSelected
                      ? "border-white/50 shadow-2xl"
                      : "border-white/10 shadow-lg hover:border-white/30"
                  }`}>
                    {/* Background gradient */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: isSelected 
                          ? `linear-gradient(135deg, ${platform.color}40, ${platform.color}20)`
                          : "rgba(255, 255, 255, 0.03)"
                      }}
                    />
                    
                    {/* Enhanced glass effect */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
                    <div className="absolute inset-0 bg-white/[0.02]" />

                    {/* Selection wave effect */}
                    <AnimatePresence>
                      {isSelected && (
                        <>
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-tl from-white/20 via-white/5 to-transparent"
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                          />
                        </>
                      )}
                    </AnimatePresence>

                    {/* Orbiting particles on selection */}
                    {isSelected && (
                      <>
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1.5 h-1.5 rounded-full"
                            style={{ 
                              backgroundColor: platform.color,
                              left: '50%',
                              top: '50%',
                              boxShadow: `0 0 10px ${platform.color}`
                            }}
                            animate={{
                              x: [0, Math.cos(i * 45 * Math.PI / 180) * 60],
                              y: [0, Math.sin(i * 45 * Math.PI / 180) * 60],
                              scale: [0, 1.5, 0],
                              opacity: [0, 1, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.1,
                              ease: "easeOut"
                            }}
                          />
                        ))}
                      </>
                    )}
                    
                    {/* Content */}
                    <div className="relative z-10 h-full flex items-center justify-center p-4">
                      <span className="text-white font-bold text-lg sm:text-xl text-center drop-shadow-lg">
                        {platform.name}
                      </span>
                    </div>

                    {/* Selection checkmark */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-lg"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Continue Button */}
          <motion.div
            className="flex flex-col items-center gap-4 pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="relative group">
                {/* Static glow on hover */}
                <div
                  className="absolute -inset-2 bg-gradient-to-r from-primary to-accent blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                />

                <Button
                  onClick={() => onContinue(selectedPlatforms)}
                  disabled={selectedPlatforms.length === 0}
                  size="2xl"
                  variant="gradient"
                  className="relative rounded-full shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)] border border-white/20"
                >
                  <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                    <span className="hidden sm:inline">Continue with {selectedPlatforms.length || "0"} {selectedPlatforms.length === 1 ? 'platform' : 'platforms'}</span>
                    <span className="sm:hidden">Continue ({selectedPlatforms.length || "0"})</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                </Button>
              </div>
            </motion.div>
            
            <motion.button
              onClick={() => onContinue([])}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Skip for now
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
