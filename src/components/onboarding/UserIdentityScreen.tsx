import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Zap, Sparkles, Brain, Moon, ArrowRight, Check } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface UserIdentityScreenProps {
  onContinue: (data: { name: string; vibe: string }) => void;
  onBack: () => void;
  initialName?: string;
  initialVibe?: string;
}

export const UserIdentityScreen = ({ onContinue, onBack, initialName = "", initialVibe = "" }: UserIdentityScreenProps) => {
  const [name, setName] = useState(initialName);
  const [selectedVibe, setSelectedVibe] = useState(initialVibe);

  // Update state when props change (when navigating back)
  useEffect(() => {
    setName(initialName);
    setSelectedVibe(initialVibe);
  }, [initialName, initialVibe]);

  const vibes = [
    { 
      id: "calm_reflective", 
      label: "Calm & Reflective", 
      description: "Slow, emotional, introspective, soothing, meaningful",
      icon: Waves,
      gradient: "from-sky-400/30 via-blue-500/40 to-indigo-400/30",
      glowColor: "rgba(56, 189, 248, 0.5)",
      particleColor: "#38bdf8",
      bgGradient: "linear-gradient(135deg, #0c4a6e 0%, #164e63 50%, #1e3a5f 100%)"
    },
    { 
      id: "light_feelgood", 
      label: "Light & Feel-Good", 
      description: "Easy, comforting, positive, low-effort",
      icon: Sparkles,
      gradient: "from-amber-300/30 via-yellow-400/40 to-orange-300/30",
      glowColor: "rgba(251, 191, 36, 0.5)",
      particleColor: "#fbbf24",
      bgGradient: "linear-gradient(135deg, #78350f 0%, #92400e 50%, #a16207 100%)"
    },
    { 
      id: "bold_energetic", 
      label: "Bold & Energetic", 
      description: "Fast-paced, exciting, adrenaline-driven",
      icon: Zap,
      gradient: "from-orange-400/30 via-red-500/40 to-rose-400/30",
      glowColor: "rgba(249, 115, 22, 0.5)",
      particleColor: "#f97316",
      bgGradient: "linear-gradient(135deg, #7c2d12 0%, #991b1b 50%, #9f1239 100%)"
    },
    { 
      id: "curious_thoughtprovoking", 
      label: "Curious & Thought-Provoking", 
      description: "Intellectual, mysterious, imaginative",
      icon: Brain,
      gradient: "from-violet-400/30 via-purple-500/40 to-fuchsia-400/30",
      glowColor: "rgba(168, 85, 247, 0.5)",
      particleColor: "#a855f7",
      bgGradient: "linear-gradient(135deg, #4c1d95 0%, #6b21a8 50%, #86198f 100%)"
    },
    { 
      id: "dark_intense", 
      label: "Dark & Intense", 
      description: "Heavy, gritty, emotionally charged",
      icon: Moon,
      gradient: "from-slate-500/30 via-zinc-600/40 to-neutral-500/30",
      glowColor: "rgba(113, 113, 122, 0.5)",
      particleColor: "#71717a",
      bgGradient: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)"
    },
  ];

  const handleContinue = () => {
    if (name && selectedVibe) {
      onContinue({ name, vibe: selectedVibe });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-black">
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

      <BackButton onClick={onBack} />
      
      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-4xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="space-y-8">
          {/* Header */}
          <motion.div
            className="text-center space-y-3"
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
                  Tell us about yourself
                </span>
              </h2>
            </motion.div>
            <motion.p 
              className="text-muted-foreground text-base sm:text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              This helps us personalize your journey
            </motion.p>
          </motion.div>

          {/* Name Input */}
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground px-2 font-medium">
                What should we call you?
              </label>
              <motion.div 
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  className="relative h-14 text-base bg-black/40 border-white/20 focus:border-primary/50 focus:bg-black/60 transition-all duration-300 backdrop-blur-2xl text-foreground placeholder:text-muted-foreground/50 rounded-2xl shadow-2xl"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Vibe Selection */}
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <motion.h3 
              className="text-xl sm:text-2xl font-semibold text-center text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              What's your viewing vibe?
            </motion.h3>
            
            {/* 5-column grid on desktop, stacked on mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
                      delay: 1.1 + (0.1 * index), 
                      type: "spring",
                      stiffness: 120,
                      damping: 12
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                      transition: { type: "spring", stiffness: 300, damping: 20 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative overflow-hidden rounded-2xl group ${
                      index === 4 ? 'col-span-2 sm:col-span-1' : ''
                    }`}
                  >
                    {/* Glow effect */}
                    <div
                      className="absolute -inset-1 rounded-2xl blur-xl transition-opacity duration-500"
                      style={{ 
                        background: `radial-gradient(circle at center, ${vibe.glowColor}, transparent 60%)`,
                        opacity: isSelected ? 0.8 : 0
                      }}
                    />

                    {/* Card */}
                    <div 
                      className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
                        isSelected
                          ? "border-white/60 shadow-2xl"
                          : "border-white/10 shadow-lg hover:border-white/30"
                      }`}
                      style={{ background: vibe.bgGradient }}
                    >
                      {/* Gradient overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${vibe.gradient} mix-blend-overlay`} />
                      
                      {/* Glass effect */}
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

                      {/* Selection particles */}
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
                                boxShadow: `0 0 8px ${vibe.particleColor}`
                              }}
                              animate={{
                                x: [0, Math.cos(i * 60 * Math.PI / 180) * 50],
                                y: [0, Math.sin(i * 60 * Math.PI / 180) * 50],
                                scale: [0, 1.2, 0],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeOut"
                              }}
                            />
                          ))}
                        </>
                      )}

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center gap-2 p-4 sm:p-5">
                        {/* Icon */}
                        <div className="relative">
                          <div
                            className="absolute inset-0 blur-lg rounded-full transition-opacity duration-300"
                            style={{ 
                              backgroundColor: vibe.particleColor,
                              opacity: isSelected ? 0.5 : 0.2
                            }}
                          />
                          <Icon 
                            className="relative w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg" 
                            strokeWidth={1.5}
                          />
                        </div>
                        
                        {/* Label & Description */}
                        <div className="flex flex-col items-center gap-1 text-center">
                          <span className="font-bold text-sm sm:text-base text-white drop-shadow-lg leading-tight">
                            {vibe.label}
                          </span>
                          <p className="text-[10px] sm:text-xs text-white/60 leading-snug line-clamp-2">
                            {vibe.description}
                          </p>
                        </div>

                        {/* Selection indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 400, damping: 15 }}
                              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                            >
                              <Check className="w-3 h-3 text-black" strokeWidth={3} />
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
            className="flex justify-center pt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: name && selectedVibe ? 1.05 : 1 }}
              whileTap={{ scale: name && selectedVibe ? 0.95 : 1 }}
            >
              <Button
                onClick={handleContinue}
                disabled={!name || !selectedVibe}
                className="group relative px-10 py-6 text-lg font-semibold rounded-2xl overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {/* Button glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                
                <span className="relative z-10 flex items-center gap-3">
                  Continue
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
