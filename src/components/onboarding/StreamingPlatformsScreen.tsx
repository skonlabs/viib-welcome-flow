import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

interface StreamingPlatformsScreenProps {
  onContinue: (platforms: string[]) => void;
}

export const StreamingPlatformsScreen = ({ onContinue }: StreamingPlatformsScreenProps) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 gradient-ocean opacity-80" />
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
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
              <span className="text-gradient">Your streaming world</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select the platforms you have access to. We'll only recommend content you can actually watch.
            </p>
          </motion.div>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {platforms.map((platform, index) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              
              return (
                <motion.button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200
                  }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <div 
                    className={`relative aspect-video rounded-2xl overflow-hidden transition-all duration-300 ${
                      isSelected 
                        ? "ring-2 ring-white shadow-2xl" 
                        : "ring-1 ring-white/10 hover:ring-white/30"
                    }`}
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${platform.color}40, ${platform.color}20)`
                        : "rgba(255, 255, 255, 0.03)"
                    }}
                  >
                    <div className="absolute inset-0 backdrop-blur-sm" />
                    
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg"
                        >
                          <Check className="w-5 h-5 text-black" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="relative h-full flex items-center justify-center p-4">
                      <span className="text-white font-bold text-lg text-center">
                        {platform.name}
                      </span>
                    </div>

                    {isSelected && (
                      <motion.div
                        className="absolute inset-0"
                        style={{ backgroundColor: platform.color }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                      />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Actions */}
          <motion.div
            className="flex flex-col items-center gap-4 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => onContinue(selectedPlatforms)}
              disabled={selectedPlatforms.length === 0}
              size="lg"
              className="group px-12 h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            >
              Continue with {selectedPlatforms.length || "0"} {selectedPlatforms.length === 1 ? 'platform' : 'platforms'}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
            <button
              onClick={() => onContinue([])}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Skip for now
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
