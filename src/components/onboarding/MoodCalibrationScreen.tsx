import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";

interface MoodCalibrationScreenProps {
  onContinue: (mood: { energy: number; positivity: number }) => void;
}

export const MoodCalibrationScreen = ({ onContinue }: MoodCalibrationScreenProps) => {
  const [energy, setEnergy] = useState([50]);
  const [positivity, setPositivity] = useState([50]);

  const getMoodLabel = () => {
    const e = energy[0];
    const p = positivity[0];

    if (e > 65 && p > 65) return "Excited & Joyful";
    if (e < 35 && p > 65) return "Peaceful & Content";
    if (e > 65 && p < 35) return "Intense & Driven";
    if (e < 35 && p < 35) return "Contemplative & Quiet";
    return "Balanced & Open";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-sunset" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-light text-foreground">
              How are you feeling?
            </h2>
            <p className="text-muted-foreground text-sm">
              We'll match content to your current state
            </p>
          </div>

          {/* Mood Visualization */}
          <div className="flex justify-center">
            <motion.div
              className="relative w-48 h-48"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
              <div className="relative glass-card rounded-full w-full h-full flex items-center justify-center">
                <div className="text-center px-6">
                  <p className="text-lg font-light text-foreground">
                    {getMoodLabel()}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sliders */}
          <div className="space-y-8 glass-card rounded-2xl p-8">
            {/* Energy Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Relaxed</span>
                <span className="text-xs text-foreground/60 uppercase tracking-wider">Energy</span>
                <span className="text-sm text-muted-foreground">Energized</span>
              </div>
              <Slider
                value={energy}
                onValueChange={setEnergy}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Positivity Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Serious</span>
                <span className="text-xs text-foreground/60 uppercase tracking-wider">Tone</span>
                <span className="text-sm text-muted-foreground">Uplifting</span>
              </div>
              <Slider
                value={positivity}
                onValueChange={setPositivity}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => onContinue({ energy: energy[0], positivity: positivity[0] })}
              size="lg"
              className="px-10 h-12 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-foreground transition-all duration-300"
            >
              Continue
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
