import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StreamingPlatformsScreenProps {
  onContinue: (platforms: string[]) => void;
}

export const StreamingPlatformsScreen = ({ onContinue }: StreamingPlatformsScreenProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const platforms = [
    { id: "netflix", name: "Netflix", color: "hsl(0, 100%, 50%)" },
    { id: "prime", name: "Prime Video", color: "hsl(190, 100%, 45%)" },
    { id: "hulu", name: "Hulu", color: "hsl(140, 70%, 50%)" },
    { id: "apple", name: "Apple TV+", color: "hsl(0, 0%, 20%)" },
    { id: "disney", name: "Disney+", color: "hsl(220, 90%, 50%)" },
    { id: "hbo", name: "HBO Max", color: "hsl(270, 70%, 50%)" },
  ];

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-warm animate-gradient" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass-card rounded-3xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-light text-foreground">
              Where do you usually watch?
            </h2>
            <p className="text-sm text-muted-foreground">
              We'll only recommend what you can actually watch
            </p>
          </div>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <button
                  onClick={() => togglePlatform(platform.id)}
                  className={`relative w-full aspect-video rounded-2xl border-2 transition-all duration-300 hover:scale-105 overflow-hidden ${
                    selectedPlatforms.includes(platform.id)
                      ? "border-primary glow-primary"
                      : "border-border/30 hover:border-primary/50"
                  }`}
                  style={{
                    background: selectedPlatforms.includes(platform.id)
                      ? `linear-gradient(135deg, ${platform.color}40, ${platform.color}20)`
                      : "rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {selectedPlatforms.includes(platform.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 bg-primary rounded-full p-1"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                  <div className="flex items-center justify-center h-full">
                    <p className="text-lg font-medium text-foreground">
                      {platform.name}
                    </p>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Continue Button */}
          <Button
            onClick={() => onContinue(selectedPlatforms)}
            disabled={selectedPlatforms.length === 0}
            className="w-full h-14 text-lg font-light bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02]"
          >
            Continue
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
