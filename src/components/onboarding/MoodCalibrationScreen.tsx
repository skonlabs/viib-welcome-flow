import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
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
  initialEnergy = 0.5,
  initialPositivity = 50
}: MoodCalibrationScreenProps) => {
  const [energy, setEnergy] = useState([initialEnergy]);
  const [positivity, setPositivity] = useState([initialPositivity]);
  const [currentEmotionIndex, setCurrentEmotionIndex] = useState(0);
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
  const {
    toast
  } = useToast();

  // Fetch emotion states from emotion_master table with energy profiles
  useEffect(() => {
    const fetchEmotionStates = async () => {
      const {
        data,
        error
      } = await supabase.from('emotion_master').select(`
          id, 
          emotion_label, 
          valence, 
          arousal,
          emotion_energy_profile (
            intensity_multiplier
          )
        `).eq('category', 'user_state').order('valence', {
        ascending: true
      });
      if (error) {
        console.error('Error fetching emotion states:', error);
        return;
      }
      if (data && data.length > 0) {
        // Map emotions to slider positions (0-100) based on valence
        const mapped = data.map((emotion, index) => ({
          id: emotion.id,
          label: emotion.emotion_label,
          value: Math.round(index / (data.length - 1) * 100),
          valence: emotion.valence || 0,
          arousal: emotion.arousal || 0,
          intensityMultiplier: (emotion.emotion_energy_profile as any)?.[0]?.intensity_multiplier || 1.0
        }));
        setEmotionStates(mapped);
      }
    };
    fetchEmotionStates();
  }, []);

  // Get the currently selected emotion from the carousel
  const selectedEmotion = useMemo(() => {
    if (emotionStates.length === 0) return null;
    return emotionStates[currentEmotionIndex];
  }, [currentEmotionIndex, emotionStates]);

  // Navigation functions for carousel
  const goToNextEmotion = () => {
    setCurrentEmotionIndex(prev => (prev + 1) % emotionStates.length);
  };
  const goToPrevEmotion = () => {
    setCurrentEmotionIndex(prev => (prev - 1 + emotionStates.length) % emotionStates.length);
  };
  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      goToPrevEmotion();
    } else if (info.offset.x < -swipeThreshold) {
      goToNextEmotion();
    }
  };

  // Update local state when initial values change (e.g., when navigating back)
  useEffect(() => {
    setEnergy([initialEnergy]);
  }, [initialEnergy]);

  // Set initial emotion index based on saved data
  useEffect(() => {
    if (emotionStates.length > 0 && initialPositivity) {
      const targetValence = initialPositivity / 100 * 2 - 1;
      const closestIndex = emotionStates.reduce((prevIdx, curr, currIdx) => {
        const prevDistance = Math.abs(emotionStates[prevIdx].valence - targetValence);
        const currDistance = Math.abs(curr.valence - targetValence);
        return currDistance < prevDistance ? currIdx : prevIdx;
      }, 0);
      setCurrentEmotionIndex(closestIndex);
    }
  }, [emotionStates, initialPositivity]);

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
        const {
          data: displayPhrase,
          error
        } = await supabase.rpc('get_display_emotion_phrase', {
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
      return {
        label: "Loading...",
        emoji: "⏳",
        color: "#a855f7"
      };
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
        variant: "destructive"
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
          variant: "destructive"
        });
        return;
      }

      // Convert energy from 0-1 to 0-100 for the RPC function
      const energyPercentage = energy[0] * 100;

      // Call translate_mood_to_emotion which converts mood text + energy to correct emotion and stores it
      const {
        error
      } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energyPercentage
      });
      if (error) {
        console.error('Error translating mood:', error);
        toast({
          title: "Error",
          description: "Failed to save your mood. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Proceed to next step
      onContinue({
        energy: energy[0],
        positivity: positivity[0]
      });
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <BackButton onClick={onBack} />
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" style={{
          background: `radial-gradient(circle, ${convertedEmotion?.color || mood.color}80 0%, transparent 70%)`
        }} animate={{
          x: [0, 120, 0],
          y: [0, -60, 0],
          scale: [1, 1.2, 1]
        }} transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
        </div>
      </div>

      <FloatingParticles />

      {/* Content */}
      <motion.div className="relative z-10 w-full max-w-lg mx-auto" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      duration: 0.8
    }}>
        <div className="space-y-8">
          {/* Header */}
          <motion.div className="text-center space-y-3" initial={{
          opacity: 0,
          y: -20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }}>
            <h2 className="text-3xl sm:text-4xl font-bold">
              <span className="text-gradient">How do you feel?</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Swipe through moods • Tap energy bars
            </p>
          </motion.div>

          {/* Emotion Carousel */}
          <motion.div className="relative" initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: 0.4
        }}>
            <div className="relative overflow-hidden rounded-3xl glass-card p-8 border border-white/10">
              {/* Navigation Arrows */}
              <button onClick={goToPrevEmotion} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 glass-card p-2 rounded-full hover:scale-110 transition-transform" aria-label="Previous emotion">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goToNextEmotion} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 glass-card p-2 rounded-full hover:scale-110 transition-transform" aria-label="Next emotion">
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Emotion Card - Swipeable */}
              <AnimatePresence mode="wait">
                {selectedEmotion && <motion.div key={selectedEmotion.id} drag="x" dragConstraints={{
                left: 0,
                right: 0
              }} dragElastic={0.2} onDragEnd={handleDragEnd} initial={{
                opacity: 0,
                x: 100
              }} animate={{
                opacity: 1,
                x: 0
              }} exit={{
                opacity: 0,
                x: -100
              }} transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }} className="text-center space-y-6 cursor-grab active:cursor-grabbing">
                    {/* Emoji */}
                    <motion.div className="text-8xl sm:text-9xl" animate={{
                  scale: [1, 1.1, 1]
                }} transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}>
                      {getEmotionEmoji(selectedEmotion.label)}
                    </motion.div>

                    {/* Emotion Label */}
                    <div className="space-y-2">
                      <h3 className="text-3xl sm:text-4xl font-bold capitalize" style={{
                    color: getEmotionColor(selectedEmotion.valence)
                  }}>
                        {convertedEmotion?.label || selectedEmotion.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Swipe or use arrows to change
                      </p>
                    </div>

                    {/* Emotion Dots */}
                    <div className="flex justify-center gap-2">
                      {emotionStates.map((_, index) => <motion.div key={index} className="w-2 h-2 rounded-full" style={{
                    background: index === currentEmotionIndex ? getEmotionColor(selectedEmotion.valence) : 'rgba(255,255,255,0.2)'
                  }} animate={{
                    scale: index === currentEmotionIndex ? 1.5 : 1
                  }} />)}
                    </div>
                  </motion.div>}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Energy Intensity Control */}
          <motion.div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.6
        }}>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">💤 Low</span>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Energy</p>
                <motion.p className="text-xl sm:text-2xl font-bold" style={{
                color: convertedEmotion?.color || mood.color
              }} key={energy[0]} animate={{
                scale: [1.2, 1]
              }}>
                  {Math.round(energy[0] * 100)}%
                </motion.p>
              </div>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">High ⚡</span>
            </div>

            {/* Visual Energy Bars */}
            <div className="flex gap-1.5 h-24 sm:h-28 items-end">
              {Array.from({
              length: 10
            }).map((_, i) => <motion.button key={i} className="flex-1 rounded-t-xl transition-all touch-manipulation" style={{
              background: i < energy[0] * 10 ? `linear-gradient(to top, ${convertedEmotion?.color || mood.color}40, ${convertedEmotion?.color || mood.color})` : 'rgba(255,255,255,0.05)',
              height: `${(i + 1) / 10 * 100}%`
            }} onClick={() => setEnergy([(i + 1) / 10])} whileHover={{
              scale: 1.05
            }} whileTap={{
              scale: 0.95
            }} animate={{
              boxShadow: i < energy[0] * 10 ? `0 0 15px ${convertedEmotion?.color || mood.color}90` : 'none'
            }} aria-label={`Set energy to ${(i + 1) * 10}%`} />)}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Tap any bar to set your energy level
            </p>
          </motion.div>

          {/* Continue Button */}
          <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.8
        }}>
            <Button onClick={handleTuneMood} disabled={isSaving || !selectedEmotion} size="2xl" variant="gradient" className="w-full group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.6)] hover:shadow-[0_25px_60px_-15px_rgba(168,85,247,0.8)] transition-all">Tun In My Vibe{isSaving ? "Saving Your Vibe..." : "Lock In My Vibe"}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>;
};