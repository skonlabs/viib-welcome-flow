import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Zap, Sparkles, Compass, ArrowRight } from "lucide-react";

interface UserIdentityScreenProps {
  onContinue: (data: { name: string; vibe: string }) => void;
}

export const UserIdentityScreen = ({ onContinue }: UserIdentityScreenProps) => {
  const [name, setName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("");

  const vibes = [
    { 
      id: "calm", 
      label: "Calm & Reflective", 
      icon: Waves,
      gradient: "from-blue-400/20 via-cyan-500/30 to-teal-400/20",
      glowColor: "rgba(34, 211, 238, 0.4)",
      particleColor: "#22d3ee"
    },
    { 
      id: "energetic", 
      label: "Bold & Exciting", 
      icon: Zap,
      gradient: "from-orange-400/20 via-red-500/30 to-pink-400/20",
      glowColor: "rgba(249, 115, 22, 0.4)",
      particleColor: "#f97316"
    },
    { 
      id: "curious", 
      label: "Curious & Wonder", 
      icon: Sparkles,
      gradient: "from-purple-400/20 via-pink-500/30 to-fuchsia-400/20",
      glowColor: "rgba(168, 85, 247, 0.4)",
      particleColor: "#a855f7"
    },
    { 
      id: "adventure", 
      label: "Adventure & Discovery", 
      icon: Compass,
      gradient: "from-green-400/20 via-emerald-500/30 to-lime-400/20",
      glowColor: "rgba(16, 185, 129, 0.4)",
      particleColor: "#10b981"
    },
  ];

  const handleContinue = () => {
    if (name && selectedVibe) {
      onContinue({ name, vibe: selectedVibe });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-black">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 gradient-ocean opacity-60" />
        
        {/* Multiple animated orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, #ec4899 30%, transparent 70%)" }}
          animate={{
            x: [0, 150, -50, 0],
            y: [0, -80, 40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #8b5cf6 30%, transparent 70%)" }}
          animate={{
            x: [0, -100, 80, 0],
            y: [0, 60, -40, 0],
            scale: [1, 0.8, 1.1, 1],
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
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.h2 
              className="text-4xl sm:text-5xl md:text-6xl font-bold"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            >
              <span className="text-gradient">Tell us about yourself</span>
            </motion.h2>
            <motion.p 
              className="text-muted-foreground text-lg sm:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              This helps us personalize your journey
            </motion.p>
          </motion.div>

          {/* Name Input */}
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground px-2 font-medium">
                What should we call you?
              </label>
              <div className="relative group">
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-accent/50 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
                  animate={{
                    opacity: name ? [0.5, 0.8, 0.5] : 0
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="relative h-16 text-lg bg-white/5 border-white/20 focus:border-primary/50 focus:bg-white/10 transition-all duration-300 backdrop-blur-xl text-foreground placeholder:text-muted-foreground/50 rounded-2xl"
                />
              </div>
            </div>
          </motion.div>

          {/* Vibe Selection */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <motion.h3 
              className="text-2xl sm:text-3xl font-semibold text-center text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              Choose your vibe
            </motion.h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {vibes.map((vibe, index) => {
                const Icon = vibe.icon;
                const isSelected = selectedVibe === vibe.id;
                
                return (
                  <motion.button
                    key={vibe.id}
                    onClick={() => setSelectedVibe(vibe.id)}
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: 1.1 + (0.15 * index), 
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="relative overflow-hidden rounded-3xl group"
                  >
                    {/* Glow effect on hover and selection */}
                    <motion.div
                      className="absolute -inset-1 rounded-3xl blur-xl transition-opacity duration-500"
                      style={{ 
                        background: `radial-gradient(circle at center, ${vibe.glowColor}, transparent 70%)`
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: isSelected ? 0.8 : 0,
                      }}
                      whileHover={{ opacity: 0.6 }}
                    />

                    {/* Card background */}
                    <div className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
                      isSelected
                        ? "border-white/40 shadow-2xl"
                        : "border-white/10 shadow-lg hover:border-white/20"
                    }`}>
                      {/* Gradient background */}
                      <motion.div 
                        className={`absolute inset-0 bg-gradient-to-br ${vibe.gradient}`}
                        animate={{
                          scale: isSelected ? [1, 1.05, 1] : 1,
                        }}
                        transition={{
                          duration: 2,
                          repeat: isSelected ? Infinity : 0,
                        }}
                      />
                      
                      {/* Glass effect */}
                      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />

                      {/* Selection ripple effect */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            className="absolute inset-0 bg-white/20"
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Floating particles effect on selection */}
                      {isSelected && (
                        <>
                          {[...Array(6)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-1 h-1 rounded-full"
                              style={{ 
                                backgroundColor: vibe.particleColor,
                                left: '50%',
                                top: '50%',
                              }}
                              initial={{ scale: 0, x: 0, y: 0 }}
                              animate={{
                                scale: [0, 1, 0],
                                x: [0, (Math.random() - 0.5) * 100],
                                y: [0, (Math.random() - 0.5) * 100],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeOut"
                              }}
                            />
                          ))}
                        </>
                      )}
                      
                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center gap-5 p-8 sm:p-10">
                        {/* Icon with animation */}
                        <motion.div
                          animate={{
                            rotate: isSelected ? [0, 5, -5, 0] : 0,
                            scale: isSelected ? [1, 1.1, 1] : 1,
                          }}
                          transition={{
                            duration: 2,
                            repeat: isSelected ? Infinity : 0,
                          }}
                        >
                          <Icon 
                            className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-2xl" 
                            strokeWidth={1.5}
                          />
                        </motion.div>
                        
                        {/* Label */}
                        <motion.span 
                          className="font-semibold text-xl sm:text-2xl text-white drop-shadow-lg text-center"
                          animate={{
                            scale: isSelected ? [1, 1.05, 1] : 1,
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: isSelected ? Infinity : 0,
                          }}
                        >
                          {vibe.label}
                        </motion.span>

                        {/* Selection indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white flex items-center justify-center"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            >
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-accent" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            className="flex justify-center pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleContinue}
                disabled={!name || !selectedVibe}
                size="lg"
                className="group relative px-16 h-16 text-lg font-semibold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500 overflow-hidden rounded-full shadow-2xl"
              >
                {/* Button glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/50 to-accent/50 blur-xl"
                  animate={{
                    opacity: name && selectedVibe ? [0.5, 1, 0.5] : 0
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  Continue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
