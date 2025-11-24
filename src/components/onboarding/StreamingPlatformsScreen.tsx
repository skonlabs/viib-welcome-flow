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
    { id: "netflix", name: "Netflix" },
    { id: "prime", name: "Prime Video" },
    { id: "hbo", name: "HBO Max" },
    { id: "disney", name: "Disney+" },
    { id: "hulu", name: "Hulu" },
    { id: "apple", name: "Apple TV+" },
  ];

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-ocean" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-10">
          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-light text-foreground">
              Select your streaming services
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              We'll only recommend content available on platforms you have access to
            </p>
          </div>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {platforms.map((platform, index) => (
              <motion.button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={`relative aspect-video rounded-2xl p-6 flex items-center justify-center transition-all duration-300 ${
                  selectedPlatforms.includes(platform.id)
                    ? "glass-card border-primary/50 shadow-lg shadow-primary/5"
                    : "glass-subtle hover:bg-card/50"
                }`}
              >
                {selectedPlatforms.includes(platform.id) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-background" />
                  </motion.div>
                )}
                <span className="text-foreground font-normal text-base">
                  {platform.name}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Action */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <Button
              onClick={() => onContinue(selectedPlatforms)}
              disabled={selectedPlatforms.length === 0}
              size="lg"
              className="px-10 h-12 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              Continue with {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'service' : 'services'}
            </Button>
            <button
              onClick={() => onContinue([])}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
