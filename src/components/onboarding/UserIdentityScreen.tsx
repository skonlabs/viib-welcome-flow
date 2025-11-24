import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Waves, Zap, Sparkles, Compass } from "lucide-react";

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
      description: "Thoughtful, soothing content"
    },
    { 
      id: "energetic", 
      label: "Bold & Exciting", 
      icon: Zap,
      description: "Fast-paced, thrilling stories"
    },
    { 
      id: "curious", 
      label: "Curious & Wonder", 
      icon: Sparkles,
      description: "Mind-expanding, inspiring"
    },
    { 
      id: "adventure", 
      label: "Adventure & Discovery", 
      icon: Compass,
      description: "Exploratory, immersive worlds"
    },
  ];

  const handleContinue = () => {
    if (name && selectedVibe) {
      onContinue({ name, vibe: selectedVibe });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-twilight" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-10">
          {/* Name Section */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light text-foreground">
                Let's personalize your experience
              </h2>
              <p className="text-sm text-muted-foreground">
                Help us understand what you're looking for
              </p>
            </div>
            
            <div className="max-w-sm mx-auto">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                className="h-12 text-base bg-secondary/30 border-border/30 focus:border-primary/50 focus:bg-secondary/50 transition-all text-center placeholder:text-muted-foreground/50"
              />
            </div>
          </motion.div>

          {/* Vibe Selection */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-light text-foreground text-center">
              Choose your viewing mood
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vibes.map((vibe, index) => (
                <motion.button
                  key={vibe.id}
                  onClick={() => setSelectedVibe(vibe.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`p-5 rounded-2xl border transition-all duration-300 text-left ${
                    selectedVibe === vibe.id
                      ? "bg-primary/10 border-primary/50 shadow-lg shadow-primary/10"
                      : "glass-card hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      selectedVibe === vibe.id
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary/50 text-muted-foreground"
                    }`}>
                      <vibe.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-normal mb-1">
                        {vibe.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vibe.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Continue Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleContinue}
              disabled={!name || !selectedVibe}
              size="lg"
              className="px-10 h-12 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              Continue
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
