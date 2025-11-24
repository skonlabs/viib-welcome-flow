import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Sparkles, Heart, Zap, Lightbulb } from "lucide-react";

interface UserIdentityScreenProps {
  onContinue: (data: { name: string; vibe: string }) => void;
}

export const UserIdentityScreen = ({ onContinue }: UserIdentityScreenProps) => {
  const [name, setName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("");

  const vibes = [
    { id: "relaxing", label: "Relaxing & Comforting", icon: Heart },
    { id: "exciting", label: "Exciting & Energizing", icon: Zap },
    { id: "inspiring", label: "Inspiring & Thoughtful", icon: Lightbulb },
    { id: "curious", label: "Curious & Explorative", icon: Sparkles },
  ];

  const handleContinue = () => {
    if (name && selectedVibe) {
      onContinue({ name, vibe: selectedVibe });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-calm animate-gradient" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass-card rounded-3xl p-8 space-y-8">
          {/* Name Input */}
          <div className="space-y-4">
            <h2 className="text-2xl font-light text-foreground text-center">
              What should we call you?
            </h2>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-14 text-lg bg-input/50 border-border/50 focus:border-primary transition-all"
            />
          </div>

          {/* Vibe Selection */}
          <div className="space-y-4">
            <h3 className="text-xl font-light text-foreground text-center">
              How do you want ViiB to feel for you?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vibes.map((vibe, index) => (
                <motion.div
                  key={vibe.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <button
                    onClick={() => setSelectedVibe(vibe.id)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                      selectedVibe === vibe.id
                        ? "bg-primary/20 border-primary glow-primary"
                        : "bg-secondary/30 border-border/30 hover:border-primary/50"
                    }`}
                  >
                    <vibe.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-light text-foreground">
                      {vibe.label}
                    </p>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!name || !selectedVibe}
            className="w-full h-14 text-lg font-light bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02]"
          >
            Continue
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
