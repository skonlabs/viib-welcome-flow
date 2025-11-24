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

  const getMoodGradient = () => {
    const energyValue = energy[0];
    const positivityValue = positivity[0];

    if (energyValue > 60 && positivityValue > 60) {
      return "linear-gradient(135deg, hsl(45, 100%, 60%), hsl(30, 100%, 50%))";
    } else if (energyValue < 40 && positivityValue > 60) {
      return "linear-gradient(135deg, hsl(200, 80%, 60%), hsl(160, 70%, 50%))";
    } else if (energyValue > 60 && positivityValue < 40) {
      return "linear-gradient(135deg, hsl(0, 70%, 60%), hsl(280, 60%, 50%))";
    } else {
      return "linear-gradient(135deg, hsl(240, 60%, 50%), hsl(280, 60%, 60%))";
    }
  };

  const getMoodLabel = () => {
    const energyValue = energy[0];
    const positivityValue = positivity[0];

    if (energyValue > 60 && positivityValue > 60) return "Excited & Joyful";
    if (energyValue < 40 && positivityValue > 60) return "Calm & Content";
    if (energyValue > 60 && positivityValue < 40) return "Intense & Focused";
    if (energyValue < 40 && positivityValue < 40) return "Reflective & Quiet";
    return "Balanced & Steady";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <motion.div
        className="absolute inset-0 animate-gradient"
        style={{ background: getMoodGradient() }}
        animate={{ background: getMoodGradient() }}
        transition={{ duration: 0.8 }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass-card rounded-3xl p-8 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-light text-foreground">
              How are you feeling right now?
            </h2>
            
            {/* Mood Visualization */}
            <motion.div
              className="w-40 h-40 mx-auto rounded-full flex items-center justify-center relative"
              style={{ background: getMoodGradient() }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-4 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
                <p className="text-lg font-light text-foreground text-center px-4">
                  {getMoodLabel()}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Energy Slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Calm</span>
              <span>Energy Level</span>
              <span>Energized</span>
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
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Somber</span>
              <span>Mood Tone</span>
              <span>Uplifted</span>
            </div>
            <Slider
              value={positivity}
              onValueChange={setPositivity}
              max={100}
              step={1}
              className="cursor-pointer"
            />
          </div>

          {/* Continue Button */}
          <Button
            onClick={() => onContinue({ energy: energy[0], positivity: positivity[0] })}
            className="w-full h-14 text-lg font-light bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02]"
          >
            Tune My Vibe
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
