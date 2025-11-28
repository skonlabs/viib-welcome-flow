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
  initialEnergy = 0.5, 
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
    intensityMultiplier: number;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch emotion states from emotion_master table with energy profiles
  useEffect(() => {
    const fetchEmotionStates = async () => {
      const { data, error } = await supabase
        .from('emotion_master')
        .select(`
          id, 
          emotion_label, 
          valence, 
          arousal,
          emotion_energy_profile (
            intensity_multiplier
          )
        `)
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
          arousal: emotion.arousal || 0,
          intensityMultiplier: (emotion.emotion_energy_profile as any)?.[0]?.intensity_multiplier || 1.0
        }));
        setEmotionStates(mapped);
      }
    };

    fetchEmotionStates();
  }, []);

  // Get the closest emotion state based ONLY on positivity (mood tone slider)
  // Energy should NOT affect which base emotion is selected
  const selectedEmotion = useMemo(() => {
    if (emotionStates.length === 0) return null;
    
    // Normalize positivity to match valence scale (-1 to 1)
    const targetValence = (positivity[0] / 100) * 2 - 1; // Convert 0-100 to -1 to 1
    
    // Find emotion with closest valence
    return emotionStates.reduce((prev, curr) => {
      const prevDistance = Math.abs(prev.valence - targetValence);
      const currDistance = Math.abs(curr.valence - targetValence);
      return currDistance < prevDistance ? curr : prev;
    });
  }, [positivity, emotionStates]);

  // Update local state when initial values change (e.g., when navigating back)
  useEffect(() => {
    setEnergy([initialEnergy]);
  }, [initialEnergy]);

  useEffect(() => {
    setPositivity([initialPositivity]);
  }, [initialPositivity]);

  // Update top display using DB functions when mood tone or energy changes
  useEffect(() => {
    const updateDisplayEmotion = async () => {
      if (!selectedEmotion) return;
      
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) return;

      try {
        // Convert energy from 0-1 to 0-100 for the RPC function
        const energyPercentage = energy[0] * 100;
        
        // Call translate_mood_to_emotion to store the emotion state
        await supabase.rpc('translate_mood_to_emotion', {
          p_user_id: userId,
          p_mood_text: selectedEmotion.label,
          p_energy_percentage: energyPercentage
        });

        // Get the display phrase from the database
        const { data: displayPhrase, error } = await supabase.rpc('get_display_emotion_phrase', {
          p_user_id: userId
        });

        if (error) {
          console.error('Error getting display phrase:', error);
          return;
        }

        setConvertedEmotion({
          label: displayPhrase || 'Emotionally Balanced',
          emoji: getEmotionEmoji(selectedEmotion.label),
          color: getEmotionColor(selectedEmotion.valence)
        });
      } catch (error) {
        console.error('Error updating display emotion:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      updateDisplayEmotion();
    }, 300); // Debounce

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

      // Convert energy from 0-1 to 0-100 for the RPC function
      const energyPercentage = energy[0] * 100;
      
      // Call translate_mood_to_emotion which converts mood text + energy to correct emotion and stores it
      const { error } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energyPercentage
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
      
      {/* Enhanced Background with Dynamic Colors */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{
              background: `radial-gradient(circle, ${convertedEmotion?.color || mood.color}80 0%, transparent 70%)`
            }}
            animate={{
              x: [0, 120, 0],
              y: [0, -60, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40"
            style={{
              background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)"
            }}
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0]
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
        className="relative z-10 w-full max-w-3xl"
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
            <h2 className="text-5xl font-bold">
              <span className="text-gradient">How do you feel?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Tune your emotional state with intuitive controls
            </p>
          </motion.div>

          {/* Enhanced Emotion Display with Radial Progress */}
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Animated Glow Ring */}
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl"
                animate={{
                  backgroundColor: [
                    (convertedEmotion?.color || mood.color) + "40", 
                    (convertedEmotion?.color || mood.color) + "80", 
                    (convertedEmotion?.color || mood.color) + "40"
                  ],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Energy Level Ring */}
              <svg className="absolute inset-0 w-64 h-64 sm:w-72 sm:h-72 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={convertedEmotion?.color || mood.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - energy[0]) }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 8px ${convertedEmotion?.color || mood.color})` }}
                />
              </svg>

              {/* Central Emotion Card */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full glass-card flex flex-col items-center justify-center gap-4 border-2 border-white/10">
                <motion.span 
                  className="text-7xl sm:text-8xl"
                  key={convertedEmotion?.emoji || mood.emoji}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {convertedEmotion?.emoji || mood.emoji}
                </motion.span>
                <motion.div
                  key={convertedEmotion?.label || mood.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center px-6"
                >
                  <p 
                    className="text-xl font-bold mb-1"
                    style={{ color: convertedEmotion?.color || mood.color }}
                  >
                    {convertedEmotion?.label || mood.label}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {Math.round(energy[0] * 100)}% Energy
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Modern Control Panel */}
          <motion.div
            className="space-y-8 glass-card rounded-3xl p-8 border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {/* Energy Slider with Visual Feedback */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">😴</span>
                  <span className="text-sm font-medium text-muted-foreground">Relaxed</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Energy Level
                  </span>
                  <motion.span 
                    className="text-lg font-bold"
                    style={{ color: convertedEmotion?.color || mood.color }}
                    key={energy[0]}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {Math.round(energy[0] * 100)}%
                  </motion.span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Energized</span>
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
              
              {/* Energy Progress Bar */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, ${convertedEmotion?.color || mood.color}40, ${convertedEmotion?.color || mood.color})`,
                    boxShadow: `0 0 20px ${convertedEmotion?.color || mood.color}80`
                  }}
                  animate={{ width: `${energy[0] * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <Slider
                value={energy}
                onValueChange={setEnergy}
                max={1.0}
                step={0.1}
                className="cursor-pointer [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-[0_0_20px_rgba(168,85,247,0.5)] [&_[role=slider]]:transition-all [&_[role=slider]]:hover:scale-110"
              />
            </div>

            {/* Mood Tone Slider with Emoji Markers */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">😔 Negative</span>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Mood Tone
                </span>
                <span className="text-sm font-medium text-muted-foreground">Positive 😊</span>
              </div>

              {/* Mood Progress Bar */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, #3b82f6, #06b6d4, #10b981)`,
                    boxShadow: `0 0 20px ${convertedEmotion?.color || mood.color}80`
                  }}
                  animate={{ width: `${positivity[0]}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <Slider
                value={positivity}
                onValueChange={setPositivity}
                max={100}
                step={emotionStates.length > 0 ? Math.round(100 / (emotionStates.length - 1)) : 1}
                className="cursor-pointer [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-2 [&_[role=slider]]:shadow-[0_0_20px_rgba(168,85,247,0.5)] [&_[role=slider]]:transition-all [&_[role=slider]]:hover:scale-110"
              />
              
              {/* Interactive Emotion Markers */}
              {emotionStates.length > 0 && (
                <div className="flex justify-between px-1 mt-4">
                  {emotionStates.map((state) => (
                    <motion.button
                      key={state.id}
                      onClick={() => setPositivity([state.value])}
                      className={`flex flex-col items-center gap-1 text-center cursor-pointer transition-all ${
                        selectedEmotion?.id === state.id ? 'scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      whileHover={{ scale: 1.2, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ flex: 1 }}
                    >
                      <span className="text-2xl">{getEmotionEmoji(state.label)}</span>
                      <span 
                        className={`text-[10px] ${selectedEmotion?.id === state.id ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
                        style={{ 
                          maxWidth: '60px', 
                          wordBreak: 'break-word',
                          color: selectedEmotion?.id === state.id ? getEmotionColor(state.valence) : undefined
                        }}
                      >
                        {state.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Enhanced Continue Button */}
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
              className="group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.6)] hover:shadow-[0_25px_60px_-15px_rgba(168,85,247,0.8)] transition-all"
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
