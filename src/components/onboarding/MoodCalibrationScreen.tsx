import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";

interface MoodCalibrationScreenProps {
  onContinue: (mood: { energy: number; positivity: number }) => void;
}

export const MoodCalibrationScreen = ({ onContinue }: MoodCalibrationScreenProps) => {
  const [energy, setEnergy] = useState([50]);
  const [positivity, setPositivity] = useState([50]);

  const getMoodData = () => {
    const e = energy[0];
    const p = positivity[0];

    if (e > 65 && p > 65) return { label: "Excited & Joyful", emoji: "🎉", color: "#f97316" };
    if (e < 35 && p > 65) return { label: "Peaceful & Content", emoji: "😌", color: "#06b6d4" };
    if (e > 65 && p < 35) return { label: "Intense & Driven", emoji: "🔥", color: "#ef4444" };
    if (e < 35 && p < 35) return { label: "Contemplative", emoji: "🌙", color: "#8b5cf6" };
    return { label: "Balanced & Open", emoji: "✨", color: "#a855f7" };
  };

  const mood = getMoodData();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background */}
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
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-12">
          {/* Header */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gradient">How do you feel?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Move the sliders to match your current mood
            </p>
          </motion.div>

          {/* Mood Visualization */}
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl"
                animate={{
                  backgroundColor: [mood.color + "40", mood.color + "60", mood.color + "40"],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative w-64 h-64 rounded-full glass-card flex flex-col items-center justify-center gap-4">
                <motion.span 
                  className="text-6xl"
                  key={mood.emoji}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {mood.emoji}
                </motion.span>
                <motion.p 
                  className="text-xl font-semibold text-foreground text-center px-6"
                  key={mood.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {mood.label}
                </motion.p>
              </div>
            </motion.div>
          </motion.div>

          {/* Sliders */}
          <motion.div
            className="space-y-10 glass-card rounded-3xl p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {/* Energy Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base text-muted-foreground">😴 Relaxed</span>
                <span className="text-sm font-medium text-foreground uppercase tracking-wider">
                  Energy Level
                </span>
                <span className="text-base text-muted-foreground">Energized 🚀</span>
              </div>
              <Slider
                value={energy}
                onValueChange={setEnergy}
                max={100}
                step={1}
                className="cursor-pointer [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-lg"
              />
            </div>

            {/* Positivity Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-base text-muted-foreground">🌧️ Serious</span>
                <span className="text-sm font-medium text-foreground uppercase tracking-wider">
                  Mood Tone
                </span>
                <span className="text-base text-muted-foreground">Uplifting ☀️</span>
              </div>
              <Slider
                value={positivity}
                onValueChange={setPositivity}
                max={100}
                step={1}
                className="cursor-pointer [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-lg"
              />
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={() => onContinue({ energy: energy[0], positivity: positivity[0] })}
              size="lg"
              className="group px-12 h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            >
              Lock in my vibe
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
