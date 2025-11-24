import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
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
      gradient: "from-blue-500 to-cyan-500",
      emoji: "🌊"
    },
    { 
      id: "energetic", 
      label: "Bold & Exciting", 
      icon: Zap,
      gradient: "from-orange-500 to-red-500",
      emoji: "⚡"
    },
    { 
      id: "curious", 
      label: "Curious & Wonder", 
      icon: Sparkles,
      gradient: "from-purple-500 to-pink-500",
      emoji: "✨"
    },
    { 
      id: "adventure", 
      label: "Adventure & Discovery", 
      icon: Compass,
      gradient: "from-green-500 to-emerald-500",
      emoji: "🧭"
    },
  ];

  const handleContinue = () => {
    if (name && selectedVibe) {
      onContinue({ name, vibe: selectedVibe });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-electric opacity-20" />
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse at 20% 30%, #a855f720 0%, transparent 50%)",
            "radial-gradient(ellipse at 80% 70%, #ec489920 0%, transparent 50%)",
            "radial-gradient(ellipse at 20% 30%, #a855f720 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-3xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-12">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gradient">Tell us about yourself</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              This helps us personalize your journey
            </p>
          </motion.div>

          {/* Name Input */}
          <motion.div
            className="max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground px-1">
                What should we call you?
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-14 text-lg bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 transition-all backdrop-blur-xl text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          </motion.div>

          {/* Vibe Selection */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-2xl font-semibold text-center text-foreground">
              Choose your vibe
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vibes.map((vibe, index) => (
                <motion.button
                  key={vibe.id}
                  onClick={() => setSelectedVibe(vibe.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index, type: "spring" }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative overflow-hidden rounded-3xl p-6 transition-all duration-300 ${
                    selectedVibe === vibe.id
                      ? "ring-2 ring-white shadow-2xl"
                      : "ring-1 ring-white/10"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${vibe.gradient} ${
                    selectedVibe === vibe.id ? "opacity-90" : "opacity-60"
                  } transition-opacity`} />
                  
                  {selectedVibe === vibe.id && (
                    <motion.div
                      className="absolute inset-0 bg-white/10"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                  
                  <div className="relative z-10 flex flex-col items-center gap-3 text-white">
                    <span className="text-4xl">{vibe.emoji}</span>
                    <vibe.icon className="w-8 h-8" />
                    <span className="font-semibold text-lg">
                      {vibe.label}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            className="flex justify-center pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={handleContinue}
              disabled={!name || !selectedVibe}
              size="lg"
              className="group px-12 h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            >
              Continue
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
