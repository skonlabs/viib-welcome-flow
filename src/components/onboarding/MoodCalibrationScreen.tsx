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
  const [convertedEmotion, setConvertedEmotion] = useState<{
    label: string;
    emoji: string;
    color: string;
  } | null>(null);
  const [emotionStates, setEmotionStates] = useState<Array<{
    id: string;
    label: string;
    value: number;
    valence: number;
    arousal: number;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch emotion states from emotion_master table
  useEffect(() => {
    const fetchEmotionStates = async () => {
      const { data, error } = await supabase
        .from('emotion_master')
        .select('id, emotion_label, valence, arousal')
        .eq('category', 'user_state')
        .order('valence', { ascending: true });

      if (error) {
        console.error('Error fetching emotion states:', error);
        return;
      }

      if (data && data.length > 0) {
        // Map emotions to slider positions (0-100) based on valence
        const mapped = data.map((emotion, index) => ({
          id: emotion.id,
          label: emotion.emotion_label,
          value: Math.round((index / (data.length - 1)) * 100),
          valence: emotion.valence || 0,
          arousal: emotion.arousal || 0
        }));
        setEmotionStates(mapped);
      }
    };

    fetchEmotionStates();
  }, []);

  // Get the closest emotion state based on BOTH positivity (valence) AND energy (arousal)
  const selectedEmotion = useMemo(() => {
    if (emotionStates.length === 0) return null;
    
    // Normalize positivity and energy to match valence/arousal scales (-1 to 1 for valence, 0 to 1 for arousal)
    const targetValence = (positivity[0] / 100) * 2 - 1; // Convert 0-100 to -1 to 1
    const targetArousal = energy[0] / 100; // Convert 0-100 to 0 to 1
    
    // Find emotion with closest valence AND arousal
    return emotionStates.reduce((prev, curr) => {
      const prevDistance = Math.sqrt(
        Math.pow(prev.valence - targetValence, 2) + 
        Math.pow(prev.arousal - targetArousal, 2)
      );
      const currDistance = Math.sqrt(
        Math.pow(curr.valence - targetValence, 2) + 
        Math.pow(curr.arousal - targetArousal, 2)
      );
      return currDistance < prevDistance ? curr : prev;
    });
  }, [positivity, energy, emotionStates]);

  // Update local state when initial values change (e.g., when navigating back)
  useEffect(() => {
    setEnergy([initialEnergy]);
  }, [initialEnergy]);

  useEffect(() => {
    setPositivity([initialPositivity]);
  }, [initialPositivity]);

  // Real-time emotion conversion when sliders change
  useEffect(() => {
    const convertMoodToEmotion = async () => {
      if (!selectedEmotion) return;
      
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) return;

      // Call translate_mood_to_emotion with selected mood and energy
      const { error: rpcError } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energy[0]
      });

      if (rpcError) {
        console.error('Error converting mood:', rpcError);
        return;
      }

      // Query the most recent emotion from user_emotion_states to get the converted result
      const { data: emotionData, error: queryError } = await supabase
        .from('user_emotion_states')
        .select('emotion_id, emotion_master(emotion_label, valence)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError || !emotionData) {
        console.error('Error fetching converted emotion:', queryError);
        return;
      }

      const emotionMaster = emotionData.emotion_master as { emotion_label: string; valence: number } | null;
      if (emotionMaster) {
        const convertedLabel = emotionMaster.emotion_label;
        setConvertedEmotion({
          label: convertedLabel,
          emoji: getEmotionEmoji(convertedLabel),
          color: getEmotionColor(emotionMaster.valence)
        });
      }
    };

    const timeoutId = setTimeout(() => {
      convertMoodToEmotion();
    }, 500); // Debounce to avoid too many calls

    return () => clearTimeout(timeoutId);
  }, [selectedEmotion, energy]);

  // Helper function to get emoji based on emotion label
  const getEmotionEmoji = (label: string): string => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('excited') || lowerLabel.includes('joy')) return '🎉';
    if (lowerLabel.includes('happy')) return '😊';
    if (lowerLabel.includes('calm') || lowerLabel.includes('peaceful')) return '😌';
    if (lowerLabel.includes('sad')) return '😢';
    if (lowerLabel.includes('anxious') || lowerLabel.includes('stress')) return '😰';
    if (lowerLabel.includes('angry')) return '😠';
    if (lowerLabel.includes('bored')) return '😑';
    if (lowerLabel.includes('lonely')) return '😔';
    if (lowerLabel.includes('hopeful')) return '✨';
    return '😌'; // default
  };

  // Helper function to get color based on valence
  const getEmotionColor = (valence: number): string => {
    if (valence > 0.5) return '#10b981'; // positive - green
    if (valence < -0.5) return '#3b82f6'; // negative - blue
    return '#06b6d4'; // neutral - cyan
  };

  const mood = useMemo(() => {
    if (!selectedEmotion) {
      return { label: "Loading...", emoji: "⏳", color: "#a855f7" };
    }
    
    const emotionLabel = selectedEmotion.label;
    const emotionId = selectedEmotion.id;
    
    // Display the converted emotion based on both valence and arousal
    return { 
      label: emotionLabel,
      emoji: getEmotionEmoji(emotionLabel),
      color: getEmotionColor(selectedEmotion.valence),
      emotionId: emotionId
    };
  }, [selectedEmotion]);

  const handleTuneMood = async () => {
    if (!selectedEmotion) {
      toast({
        title: "Error",
        description: "Please select a mood",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) {
        toast({
          title: "Error",
          description: "User not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Call translate_mood_to_emotion which converts mood text + energy to correct emotion and stores it
      const { error } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energy[0]
      });

      if (error) {
        console.error('Error translating mood:', error);
        toast({
          title: "Error",
          description: "Failed to save your mood. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Proceed to next step
      onContinue({ energy: energy[0], positivity: positivity[0] });
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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

          {/* Converted Emotion Display */}
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
                  backgroundColor: [
                    (convertedEmotion?.color || mood.color) + "40", 
                    (convertedEmotion?.color || mood.color) + "60", 
                    (convertedEmotion?.color || mood.color) + "40"
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full glass-card flex flex-col items-center justify-center gap-3">
                <motion.span 
                  className="text-5xl sm:text-6xl"
                  key={convertedEmotion?.emoji || mood.emoji}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {convertedEmotion?.emoji || mood.emoji}
                </motion.span>
                <motion.p 
                  className="text-lg font-semibold text-foreground text-center px-4"
                  key={convertedEmotion?.label || mood.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {convertedEmotion?.label || mood.label}
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

            {/* Positivity Slider with Emotion States */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Negative</span>
                <span className="text-xs font-medium text-foreground uppercase tracking-wider">
                  Mood Tone
                </span>
                <span className="text-sm text-muted-foreground">Positive</span>
              </div>
              
              {/* Selected Emotion Display */}
              {selectedEmotion && (
                <motion.div 
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl glass-card"
                  key={selectedEmotion.label}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="text-2xl">{getEmotionEmoji(selectedEmotion.label)}</span>
                  <span className="text-base font-semibold" style={{ color: getEmotionColor(selectedEmotion.valence) }}>
                    {selectedEmotion.label}
                  </span>
                </motion.div>
              )}

              <Slider
                value={positivity}
                onValueChange={setPositivity}
                max={100}
                step={emotionStates.length > 0 ? Math.round(100 / (emotionStates.length - 1)) : 1}
                className="cursor-pointer [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-lg"
              />
              
              {/* Emotion State Markers */}
              {emotionStates.length > 0 && (
                <div className="flex justify-between px-1 text-xs text-muted-foreground">
                  {emotionStates.map((state) => (
                    <motion.div
                      key={state.id}
                      className="flex flex-col items-center gap-1 text-center"
                      whileHover={{ scale: 1.1 }}
                      style={{ flex: 1 }}
                    >
                      <span className="text-base">{getEmotionEmoji(state.label)}</span>
                      <span 
                        className={`text-[10px] ${selectedEmotion?.id === state.id ? 'font-semibold text-foreground' : ''}`}
                        style={{ maxWidth: '60px', wordBreak: 'break-word' }}
                      >
                        {state.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
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
              onClick={handleTuneMood}
              disabled={isSaving || !selectedEmotion}
              size="2xl"
              variant="gradient"
              className="group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              {isSaving ? "Saving..." : "Tune My Vibe"}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
