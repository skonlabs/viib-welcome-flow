import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MoodCalibrationScreenProps {
  onContinue: (mood: { energy: number; positivity: number }) => void;
  onBack: () => void;
  initialEnergy?: number;
  initialPositivity?: number;
}

export const MoodCalibrationScreen = ({ 
  onContinue, 
  onBack, 
  initialEnergy = 50, 
  initialPositivity = 50 
}: MoodCalibrationScreenProps) => {
  const [energy, setEnergy] = useState([initialEnergy]);
  const [positivity, setPositivity] = useState([initialPositivity]);
  const [convertedEmotion, setConvertedEmotion] = useState<string | null>(null);
  const { toast } = useToast();

  // Update local state when initial values change (e.g., when navigating back)
  useEffect(() => {
    setEnergy([initialEnergy]);
  }, [initialEnergy]);

  useEffect(() => {
    setPositivity([initialPositivity]);
  }, [initialPositivity]);

  const mood = useMemo(() => {
    const e = energy[0];
    const p = positivity[0];

    if (e > 65 && p > 65) return { label: "Excited & Joyful", emoji: "🎉", color: "#f97316" };
    if (e < 35 && p > 65) return { label: "Peaceful & Content", emoji: "😌", color: "#06b6d4" };
    if (e > 65 && p < 35) return { label: "Intense & Driven", emoji: "🔥", color: "#ef4444" };
    if (e < 35 && p < 35) return { label: "Contemplative", emoji: "🌙", color: "#8b5cf6" };
    return { label: "Balanced & Open", emoji: "✨", color: "#a855f7" };
  }, [energy, positivity]);

  // Note: Real-time emotion conversion disabled due to database constraint issue
  // The mood label shown below updates in real-time as you move the sliders

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <BackButton onClick={onBack} />
      
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
      <FloatingParticles />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-8">
          {/* Header */}
          <motion.div
            className="text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">How do you feel?</span>
            </h2>
            <p className="text-muted-foreground text-base">
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
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full glass-card flex flex-col items-center justify-center gap-3">
                <motion.span 
                  className="text-5xl sm:text-6xl"
                  key={mood.emoji}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {mood.emoji}
                </motion.span>
                <motion.p 
                  className="text-lg font-semibold text-foreground text-center px-4"
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
            className="space-y-6 glass-card rounded-3xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {/* Energy Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">😴 Relaxed</span>
                <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                  Energy Level
                </span>
                <span className="text-sm text-muted-foreground">Energized 🚀</span>
              </div>
              <Slider
                value={energy}
                onValueChange={setEnergy}
                max={100}
                step={1}
                className="cursor-pointer [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-lg"
              />
            </div>

            {/* Positivity Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">🌧️ Serious</span>
                <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                  Mood Tone
                </span>
                <span className="text-sm text-muted-foreground">Uplifting ☀️</span>
              </div>
              <Slider
                value={positivity}
                onValueChange={setPositivity}
                max={100}
                step={1}
                className="cursor-pointer [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-lg"
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
              size="2xl"
              variant="gradient"
              className="group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              Tune My Vibe
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
