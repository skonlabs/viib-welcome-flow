import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Zap, Sparkles, Compass, ArrowRight } from "lucide-react";
import calmImage from "@/assets/vibe-calm.png";
import energeticImage from "@/assets/vibe-energetic.png";
import curiousImage from "@/assets/vibe-curious.png";
import adventureImage from "@/assets/vibe-adventure.png";

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
      description: "For peaceful, thoughtful moments",
      icon: Waves,
      image: calmImage,
      gradient: "from-blue-400/20 via-cyan-500/30 to-teal-400/20",
      glowColor: "rgba(34, 211, 238, 0.4)",
      particleColor: "#22d3ee"
    },
    { 
      id: "energetic", 
      label: "Bold & Exciting", 
      description: "For high-energy, thrilling experiences",
      icon: Zap,
      image: energeticImage,
      gradient: "from-orange-400/20 via-red-500/30 to-pink-400/20",
      glowColor: "rgba(249, 115, 22, 0.4)",
      particleColor: "#f97316"
    },
    { 
      id: "curious", 
      label: "Curious & Wonder", 
      description: "For exploring the mysterious",
      icon: Sparkles,
      image: curiousImage,
      gradient: "from-purple-400/20 via-pink-500/30 to-fuchsia-400/20",
      glowColor: "rgba(168, 85, 247, 0.4)",
      particleColor: "#a855f7"
    },
    { 
      id: "adventure", 
      label: "Adventure & Discovery", 
      description: "For journeys into the unknown",
      icon: Compass,
      image: adventureImage,
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
      {/* Cinematic Multi-Layer Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/20 to-black" />
        
        {/* Animated mesh gradients - Layer 1 */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          style={{ 
            background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(168, 85, 247, 0.15), transparent 50%), radial-gradient(ellipse 60% 50% at 80% 50%, rgba(59, 130, 246, 0.1), transparent 50%)"
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Floating orbs with parallax effect */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full blur-[80px] opacity-20"
            style={{ 
              width: `${200 + i * 80}px`,
              height: `${200 + i * 80}px`,
              background: `radial-gradient(circle, ${
                i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#3b82f6' : '#ec4899'
              } 0%, transparent 70%)`,
              left: `${10 + i * 15}%`,
              top: `${20 + i * 10}%`,
            }}
            animate={{
              x: [0, 100 + i * 30, -50 + i * 20, 0],
              y: [0, -80 + i * 15, 60 - i * 10, 0],
              scale: [1, 1.3, 0.8, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 2,
            }}
          />
        ))}

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          />
        ))}

        {/* Grid overlay with animation */}
        <motion.div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
          animate={{
            opacity: [0.02, 0.05, 0.02],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
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
            transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              initial={{ scale: 0.8, rotateX: -20 }}
              animate={{ scale: 1, rotateX: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 80, damping: 20 }}
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold relative inline-block">
                <motion.span 
                  className="text-gradient relative z-10"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    backgroundSize: '200% 200%'
                  }}
                >
                  Tell us about yourself
                </motion.span>
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm"
                  animate={{
                    x: ['-200%', '200%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut"
                  }}
                />
              </h2>
            </motion.div>
            <motion.p 
              className="text-muted-foreground text-lg sm:text-xl"
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
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground px-2 font-medium">
                What should we call you?
              </label>
              <motion.div 
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Animated border glow */}
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
                  style={{ backgroundSize: '200% 200%' }}
                  animate={{
                    backgroundPosition: name ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%',
                    opacity: name ? [0.3, 0.7, 0.3] : 0
                  }}
                  transition={{
                    backgroundPosition: { duration: 3, repeat: Infinity },
                    opacity: { duration: 2, repeat: Infinity }
                  }}
                />
                {/* Shimmer on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.8 }}
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="relative h-16 text-lg bg-black/40 border-white/20 focus:border-primary/50 focus:bg-black/60 transition-all duration-300 backdrop-blur-2xl text-foreground placeholder:text-muted-foreground/50 rounded-2xl shadow-2xl"
                />
              </motion.div>
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
                    initial={{ opacity: 0, scale: 0.5, y: 50, rotateX: -30 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                    transition={{ 
                      delay: 1.1 + (0.15 * index), 
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
                    <motion.div
                      className="absolute -inset-2 rounded-3xl blur-2xl transition-opacity duration-500"
                      style={{ 
                        background: `radial-gradient(circle at center, ${vibe.glowColor}, transparent 60%)`
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: isSelected ? [0.6, 1, 0.6] : 0,
                        scale: isSelected ? [1, 1.1, 1] : 1,
                      }}
                      whileHover={{ opacity: 0.7, scale: 1.05 }}
                      transition={{ 
                        opacity: { duration: 2, repeat: Infinity },
                        scale: { duration: 2, repeat: Infinity }
                      }}
                    />

                    {/* Outer glow ring */}
                    <motion.div
                      className="absolute -inset-1 rounded-3xl"
                      style={{ 
                        background: `conic-gradient(from 0deg, ${vibe.glowColor}, transparent, ${vibe.glowColor})`
                      }}
                      animate={{
                        rotate: isSelected ? 360 : 0,
                        opacity: isSelected ? 0.6 : 0
                      }}
                      transition={{
                        rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                        opacity: { duration: 0.5 }
                      }}
                    />

                    {/* Card container with 3D transform */}
                    <div className={`relative overflow-hidden rounded-3xl border transition-all duration-500 ${
                      isSelected
                        ? "border-white/50 shadow-2xl"
                        : "border-white/10 shadow-lg hover:border-white/30"
                    }`}>
                      {/* Background Image */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{
                          scale: isSelected ? [1, 1.1, 1] : 1,
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <img 
                          src={vibe.image} 
                          alt={vibe.label}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>

                      {/* Animated gradient overlay */}
                      <motion.div 
                        className={`absolute inset-0 bg-gradient-to-br ${vibe.gradient} mix-blend-overlay`}
                        style={{ backgroundSize: '200% 200%' }}
                        animate={{
                          backgroundPosition: isSelected ? ['0% 0%', '100% 100%', '0% 0%'] : '0% 0%',
                        }}
                        transition={{
                          backgroundPosition: { duration: 5, repeat: Infinity, ease: "linear" },
                        }}
                      />
                      
                      {/* Enhanced glass effect with noise texture */}
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
                      <motion.div 
                        className="absolute inset-0 bg-white/[0.02]"
                        animate={{
                          opacity: [0.02, 0.05, 0.02]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity
                        }}
                      />

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
                                backgroundColor: vibe.particleColor,
                                left: '50%',
                                top: '50%',
                                boxShadow: `0 0 10px ${vibe.particleColor}`
                              }}
                              animate={{
                                x: [0, Math.cos(i * 45 * Math.PI / 180) * 80],
                                y: [0, Math.sin(i * 45 * Math.PI / 180) * 80],
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

                      {/* Shimmer effect on hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '200%' }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                      
                      {/* Content with 3D depth */}
                      <div className="relative z-10 flex flex-col items-center gap-6 p-10 sm:p-12">
                        {/* Icon with pulsing glow */}
                        <motion.div
                          className="relative"
                          animate={{
                            rotateY: isSelected ? [0, 10, -10, 0] : 0,
                            scale: isSelected ? [1, 1.15, 1] : 1,
                          }}
                          transition={{
                            duration: 3,
                            repeat: isSelected ? Infinity : 0,
                          }}
                        >
                          {/* Icon glow */}
                          <motion.div
                            className="absolute inset-0 blur-xl rounded-full"
                            style={{ backgroundColor: vibe.particleColor }}
                            animate={{
                              scale: isSelected ? [1, 1.5, 1] : 1,
                              opacity: isSelected ? [0.3, 0.6, 0.3] : 0,
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                            }}
                          />
                          <Icon 
                            className="relative w-16 h-16 sm:w-20 sm:h-20 text-white drop-shadow-2xl" 
                            strokeWidth={1.5}
                          />
                        </motion.div>
                        
                        {/* Label with letter animation */}
                        <div className="flex flex-col items-center gap-2">
                          <motion.span 
                            className="font-bold text-xl sm:text-2xl text-white drop-shadow-lg text-center tracking-wide"
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
                          
                          {/* Description text */}
                          <motion.p
                            className="text-sm text-white/70 text-center font-medium"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            {vibe.description}
                          </motion.p>
                        </div>

                        {/* Selection checkmark with bounce */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-2xl"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            >
                              <motion.div 
                                className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg"
                                animate={{
                                  scale: [1, 1.2, 1],
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                }}
                              />
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
            transition={{ delay: 1.8, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="relative group">
                {/* Orbiting glow effect */}
                <motion.div
                  className="absolute -inset-4 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(168, 85, 247, 0.6), rgba(236, 72, 153, 0.6), rgba(168, 85, 247, 0.6))'
                  }}
                  animate={{
                    rotate: 360
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                
                {/* Pulsing glow */}
                <motion.div
                  className="absolute -inset-2 bg-gradient-to-r from-primary to-accent blur-xl rounded-full"
                  animate={{
                    opacity: name && selectedVibe ? [0.3, 0.7, 0.3] : 0,
                    scale: name && selectedVibe ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />

                <Button
                  onClick={handleContinue}
                  disabled={!name || !selectedVibe}
                  size="lg"
                  className="relative group px-20 h-16 text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-700 overflow-hidden rounded-full shadow-2xl border border-white/20"
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                    animate={{
                      x: ['-200%', '200%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                      ease: "easeInOut"
                    }}
                  />
                  
                  <span className="relative z-10 flex items-center gap-3">
                    Continue
                    <motion.div
                      animate={{
                        x: name && selectedVibe ? [0, 5, 0] : 0
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
