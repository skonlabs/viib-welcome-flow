import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Zap, Sparkles, Compass, ArrowRight, Check } from "lucide-react";
import calmImage from "@/assets/vibe-calm.png";
import energeticImage from "@/assets/vibe-energetic.png";
import curiousImage from "@/assets/vibe-curious.png";
import adventureImage from "@/assets/vibe-adventure.png";
import { BackButton } from "./BackButton";

interface UserIdentityScreenProps {
  onContinue: (data: { name: string; vibe: string }) => void;
  onBack: () => void;
}

export const UserIdentityScreen = ({ onContinue, onBack }: UserIdentityScreenProps) => {
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <BackButton onClick={onBack} />
      
      {/* Cinematic Multi-Layer Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/20 to-black" />
        
        {/* Animated mesh gradients - Layer 1 */}
        <div
          className="absolute top-0 left-0 w-full h-full opacity-40"
          style={{ 
            background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(168, 85, 247, 0.15), transparent 50%), radial-gradient(ellipse 60% 50% at 80% 50%, rgba(59, 130, 246, 0.1), transparent 50%)"
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

        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
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
                <span 
                  className="text-gradient relative z-10"
                  style={{
                    backgroundSize: '200% 200%'
                  }}
                >
                  Tell us about yourself
                </span>
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
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
              >
                {/* Border glow - initially visible to draw attention */}
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl blur-xl transition-opacity duration-500"
                  style={{ backgroundSize: '200% 200%' }}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: name ? 0 : 0.6 }}
                  whileFocus={{ opacity: 0.5 }}
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
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
                    <div
                      className="absolute -inset-2 rounded-3xl blur-2xl transition-opacity duration-500"
                      style={{ 
                        background: `radial-gradient(circle at center, ${vibe.glowColor}, transparent 60%)`,
                        opacity: isSelected ? 0.7 : 0
                      }}
                    />

                    {/* Outer glow ring */}
                    <div
                      className="absolute -inset-1 rounded-3xl transition-opacity duration-500"
                      style={{ 
                        background: `conic-gradient(from 0deg, ${vibe.glowColor}, transparent, ${vibe.glowColor})`,
                        opacity: isSelected ? 0.6 : 0
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
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${vibe.gradient} mix-blend-overlay`}
                        style={{ backgroundSize: '200% 200%' }}
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
                        initial={{ x: '-100%', opacity: 0 }}
                        whileHover={{ x: '200%', opacity: 1 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />
                      
                      {/* Content with 3D depth - Optimized spacing */}
                      <div className="relative z-10 flex flex-col items-center gap-4 p-6 sm:p-8">
                        {/* Icon with subtle animation */}
                        <div className="relative">
                          {/* Icon glow */}
                          <div
                            className="absolute inset-0 blur-xl rounded-full"
                            style={{ 
                              backgroundColor: vibe.particleColor,
                              opacity: isSelected ? 0.4 : 0
                            }}
                          />
                          <Icon 
                            className="relative w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-2xl" 
                            strokeWidth={1.5}
                          />
                        </div>
                        
                        {/* Label */}
                        <div className="flex flex-col items-center gap-1">
                          <span 
                            className="font-bold text-lg sm:text-xl text-white drop-shadow-lg text-center tracking-wide"
                          >
                            {vibe.label}
                          </span>
                          
                          {/* Description text */}
                          <motion.p
                            className="text-xs text-white/70 text-center font-medium"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            {vibe.description}
                          </motion.p>
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
                {/* Static glow on hover */}
                <div
                  className="absolute -inset-2 bg-gradient-to-r from-primary to-accent blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                />

                <Button
                  onClick={handleContinue}
                  disabled={!name || !selectedVibe}
                  size="2xl"
                  variant="gradient-large"
                  className="relative rounded-full shadow-2xl border border-white/20"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Continue
                    <ArrowRight className="w-5 h-5" />
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
