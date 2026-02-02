import { useEffect } from "react";
import { motion } from "framer-motion";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { MoodSelector } from "@/components/mood/MoodSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MoodCalibrationScreenProps {
  onContinue: (mood: {
    energy: number;
    positivity: number;
  }) => void;
  onBack: () => void;
  initialEnergy?: number;
  initialPositivity?: number;
}

export const MoodCalibrationScreen = ({
  onContinue,
  onBack,
}: MoodCalibrationScreenProps) => {
  const { toast } = useToast();
  const userId = localStorage.getItem('viib_user_id');

  useEffect(() => {
    if (!userId) {
      toast({
        title: "Session Error",
        description: "User session not found. Please sign in again.",
        variant: "destructive"
      });
    }
  }, [userId, toast]);

  if (!userId) {
    return null;
  }

  const handleMoodSaved = async (mood: { valence: number; arousal: number; label: string }) => {
    // Update last onboarding step
    const { error } = await supabase
      .from('users')
      .update({ last_onboarding_step: '/app/onboarding/mood' })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save progress. Your mood was still recorded.",
        variant: "destructive"
      });
    }

    // Continue to next step with converted values
    onContinue({
      energy: (mood.arousal + 1) / 2,
      positivity: (mood.valence + 1) / 2 * 100
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <BackButton onClick={onBack} />
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10 opacity-40" />
        </div>
      </div>

      <FloatingParticles />

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full max-w-lg mx-auto" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-6">
          {/* Header */}
          <motion.div 
            className="text-center space-y-2" 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">How are you feeling?</span>
            </h2>
            <p className="text-muted-foreground text-sm">
              Tap or drag to select your current mood
            </p>
          </motion.div>

          {/* Mood Selector */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <MoodSelector
              userId={userId}
              onMoodSaved={handleMoodSaved}
              buttonText="Set My Vibe"
              showArrowIcon
              showBackgroundEffects
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
