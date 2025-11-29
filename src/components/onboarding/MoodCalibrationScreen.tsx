import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import deeplyCalmImage from "@/assets/deeply-calm.png";
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
  const [hoveredEnergyBar, setHoveredEnergyBar] = useState<number | null>(null);
  const [convertedEmotion, setConvertedEmotion] = useState<{
    label: string;
  }>({
    label: 'Balanced'
  });
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

  // Fetch saved mood data when component mounts
  useEffect(() => {
    const fetchSavedMood = async () => {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) return;

      try {
        // Get the most recent emotion state for this user
        const { data: savedEmotion, error } = await supabase
          .from('user_emotion_states')
          .select('intensity, emotion_id, emotion_master(emotion_label, valence)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !savedEmotion) {
          console.log('No saved mood found, using defaults');
          return;
        }

        console.log('Restored saved mood:', savedEmotion);

        // Restore energy level (intensity is 0-1)
        const savedEnergy = Math.min(savedEmotion.intensity, 1.0);
        setEnergy([savedEnergy]);

        // Find and set the emotion in the carousel
        if (emotionStates.length > 0 && savedEmotion.emotion_master) {
          const emotionLabel = (savedEmotion.emotion_master as any).emotion_label;
          const emotionIndex = emotionStates.findIndex(
            e => e.label.toLowerCase() === emotionLabel.toLowerCase()
          );
          if (emotionIndex >= 0) {
            setCurrentEmotionIndex(emotionIndex);
          }
        }

        // Get the display phrase
        const { data: displayPhrase } = await supabase.rpc('get_display_emotion_phrase', {
          p_user_id: userId
        });
        
        if (displayPhrase) {
          setConvertedEmotion({ label: displayPhrase });
        }
      } catch (error) {
        console.error('Error fetching saved mood:', error);
      }
    };

    // Only fetch if we have emotion states loaded
    if (emotionStates.length > 0) {
      fetchSavedMood();
    }
  }, [emotionStates]);

  // Get the currently selected emotion from the carousel
  const selectedEmotion = useMemo(() => {
    if (emotionStates.length === 0) return {
      id: 'default',
      label: 'Balanced',
      value: 50,
      valence: 0,
      arousal: 0,
      intensityMultiplier: 1.0
    };
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
    setEnergy([Math.min(initialEnergy, 1.0)]);
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
        // Energy is 0-1.0, convert to percentage 0-100 for the RPC function
        const energyPercentage = energy[0] * 100;

        console.log('Updating display emotion:', {
          mood_text: selectedEmotion.label,
          energy_percentage: energyPercentage,
          energy_raw: energy[0]
        });

        // Call translate_mood_to_emotion to get the converted emotion
        const { data: emotionData, error: translateError } = await supabase.rpc('translate_mood_to_emotion', {
          p_user_id: userId,
          p_mood_text: selectedEmotion.label,
          p_energy_percentage: energyPercentage
        });

        if (translateError) {
          console.error('Error translating mood:', translateError);
          return;
        }

        console.log('Translate emotion response:', emotionData);

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

        console.log('Display phrase:', displayPhrase);

        setConvertedEmotion({
          label: displayPhrase || 'Emotionally Balanced'
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

  // Helper function to get emotion emoji based on emotion label
  const getEmotionEmoji = (label: string): string => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('excited') || lowerLabel.includes('joy') || lowerLabel.includes('ecstatic')) return '😄';
    if (lowerLabel.includes('happy') || lowerLabel.includes('content')) return '😊';
    if (lowerLabel.includes('calm') || lowerLabel.includes('peaceful') || lowerLabel.includes('serene')) return '😌';
    if (lowerLabel.includes('sad') || lowerLabel.includes('down')) return '😢';
    if (lowerLabel.includes('anxious') || lowerLabel.includes('stress') || lowerLabel.includes('worried')) return '😰';
    if (lowerLabel.includes('angry') || lowerLabel.includes('frustrated')) return '😠';
    if (lowerLabel.includes('tired') || lowerLabel.includes('exhausted')) return '😴';
    if (lowerLabel.includes('bored') || lowerLabel.includes('meh') || lowerLabel.includes('drained')) return '😑';
    if (lowerLabel.includes('lonely') || lowerLabel.includes('isolated') || lowerLabel.includes('alone')) return '😔';
    if (lowerLabel.includes('hopeful') || lowerLabel.includes('optimistic')) return '🙂';
    if (lowerLabel.includes('love') || lowerLabel.includes('affection')) return '🥰';
    if (lowerLabel.includes('surprise') || lowerLabel.includes('amazed')) return '😲';
    if (lowerLabel.includes('balanced')) return '😌';
    return '😌'; // default calm
  };

  // Helper function to get intensity from emotion label
  const getIntensityLevel = (label: string): number => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('deeply') || lowerLabel.includes('profoundly') || lowerLabel.includes('overwhelmingly')) return 1.0;
    if (lowerLabel.includes('strongly') || lowerLabel.includes('intensely') || lowerLabel.includes('extremely')) return 0.8;
    if (lowerLabel.includes('very') || lowerLabel.includes('quite')) return 0.6;
    if (lowerLabel.includes('peacefully') || lowerLabel.includes('softly') || lowerLabel.includes('mildly')) return 0.3;
    return 0.5; // default medium intensity
  };

  // Helper function to get color based on emotion and intensity
  const getEmotionColorWithIntensity = (label: string, valence: number): string => {
    const lowerLabel = label.toLowerCase();
    const intensity = getIntensityLevel(label);
    
    // Angry/Frustrated - Red shades
    if (lowerLabel.includes('angry') || lowerLabel.includes('frustrated')) {
      const hue = 0; // red
      const saturation = 70 + (intensity * 30); // 70-100%
      const lightness = 55 - (intensity * 15); // 55-40%
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Sad - Blue shades
    if (lowerLabel.includes('sad') || lowerLabel.includes('down')) {
      const hue = 220; // blue
      const saturation = 60 + (intensity * 30);
      const lightness = 55 - (intensity * 20);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Anxious/Stressed - Orange/Yellow shades
    if (lowerLabel.includes('anxious') || lowerLabel.includes('stress') || lowerLabel.includes('worried')) {
      const hue = 30; // orange
      const saturation = 70 + (intensity * 25);
      const lightness = 55 - (intensity * 10);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Lonely/Alone - Purple/Grey shades
    if (lowerLabel.includes('lonely') || lowerLabel.includes('alone') || lowerLabel.includes('isolated')) {
      const hue = 270; // purple
      const saturation = 40 + (intensity * 30);
      const lightness = 50 - (intensity * 15);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Bored/Drained - Grey shades
    if (lowerLabel.includes('bored') || lowerLabel.includes('drained') || lowerLabel.includes('tired')) {
      const hue = 210;
      const saturation = 15 + (intensity * 20);
      const lightness = 50 - (intensity * 10);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Happy/Excited - Yellow/Green shades
    if (lowerLabel.includes('happy') || lowerLabel.includes('excited') || lowerLabel.includes('joy')) {
      const hue = 45; // yellow-green
      const saturation = 75 + (intensity * 20);
      const lightness = 55 - (intensity * 10);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Hopeful/Optimistic - Green shades
    if (lowerLabel.includes('hopeful') || lowerLabel.includes('optimistic') || lowerLabel.includes('balanced')) {
      const hue = 160; // cyan-green
      const saturation = 60 + (intensity * 25);
      const lightness = 50;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Calm/Peaceful - Cyan/Light Blue shades
    if (lowerLabel.includes('calm') || lowerLabel.includes('peaceful') || lowerLabel.includes('serene')) {
      const hue = 190; // cyan
      const saturation = 55 + (intensity * 25);
      const lightness = 55 - (intensity * 5);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Default based on valence
    if (valence > 0.5) return '#10b981'; // positive - green
    if (valence < -0.5) return '#3b82f6'; // negative - blue
    return '#06b6d4'; // neutral - cyan
  };

  // Helper function to get color based on valence (kept for backward compatibility)
  const getEmotionColor = (valence: number): string => {
    if (valence > 0.5) return '#10b981'; // positive - green
    if (valence < -0.5) return '#3b82f6'; // negative - blue
    return '#06b6d4'; // neutral - cyan
  };
  const mood = useMemo(() => {
    const emotionLabel = selectedEmotion.label;
    const emotionId = selectedEmotion.id;

    // Display the converted emotion based on both valence and arousal
    return {
      label: emotionLabel,
      color: getEmotionColor(selectedEmotion.valence),
      emotionId: emotionId
    };
  }, [selectedEmotion]);
  const handleTuneMood = async () => {
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

      // Energy is already 0-1.0, send it directly
      const energyValue = Math.min(energy[0], 1.0);

      console.log('Saving mood:', {
        mood_text: selectedEmotion.label,
        energy_value: energyValue,
        converted_emotion: convertedEmotion.label
      });

      // Call translate_mood_to_emotion with energy as 0-1.0
      const { data, error } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energyValue * 100 // Backend expects percentage 0-100
      });

      if (error) {
        console.error('Error translating mood:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save your mood. Please try again.",
          variant: "destructive"
        });
        return;
      }

      console.log('Mood saved successfully:', data);

      // Verify the emotion was saved
      const { data: savedEmotion, error: verifyError } = await supabase
        .from('user_emotion_states')
        .select('intensity, emotion_master(emotion_label)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !savedEmotion) {
        console.error('Emotion not saved properly:', verifyError);
        toast({
          title: "Warning",
          description: "Your mood may not have been saved correctly.",
          variant: "destructive"
        });
      } else {
        console.log('Verified saved emotion:', savedEmotion);
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
          background: `radial-gradient(circle, ${getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence)}80 0%, transparent 70%)`
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
              We'll use your mood to recommend perfect titles for you
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
                    {/* Emotion Emoji with Waves */}
                    <div className="relative flex items-center justify-center h-48">
                      {/* Animated Waves */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full border-2"
                          style={{
                            borderColor: `${getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence)}40`,
                          }}
                          initial={{ width: 0, height: 0, opacity: 0 }}
                          animate={{
                            width: [0, 200 + i * 40, 240 + i * 40],
                            height: [0, 200 + i * 40, 240 + i * 40],
                            opacity: [0, 0.6, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 1,
                            ease: "easeOut",
                          }}
                        />
                      ))}
                      
                      {/* Emoji or Image */}
                      <motion.div
                        className="relative z-10"
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: [0, 3, -3, 0],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        {(convertedEmotion?.label || selectedEmotion.label).toLowerCase().includes('deeply') && 
                         (convertedEmotion?.label || selectedEmotion.label).toLowerCase().includes('calm') ? (
                          <img 
                            src={deeplyCalmImage} 
                            alt="Deeply Calm" 
                            className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                          />
                        ) : (
                          <span className="text-8xl sm:text-9xl">
                            {getEmotionEmoji(convertedEmotion?.label || selectedEmotion.label)}
                          </span>
                        )}
                      </motion.div>
                    </div>

                    {/* Emotion Label */}
                    <div className="space-y-2">
                      <h3 className="text-3xl sm:text-4xl font-bold capitalize" style={{
                    color: getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence)
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
                    background: index === currentEmotionIndex ? getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence) : 'rgba(255,255,255,0.2)'
                  }} animate={{
                    scale: index === currentEmotionIndex ? 1.5 : 1
                  }} />)}
                    </div>
                  </motion.div>}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Energy Intensity Control */}
          <motion.div 
            className="glass-card rounded-3xl p-6 border border-white/10 space-y-4" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm font-medium text-foreground/60">💤 Low</span>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-foreground/60">Energy</p>
                <motion.p 
                  className="text-xl sm:text-2xl font-bold" 
                  style={{
                    color: getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence)
                  }} 
                  key={energy[0]} 
                  animate={{ scale: [1.2, 1] }}
                >
                  {Math.round(energy[0] * 100)}%
                </motion.p>
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground/60">High ⚡</span>
            </div>

            {/* Visual Energy Bars */}
            <div className="flex gap-1.5 h-24 sm:h-28 items-end">
              {Array.from({ length: 10 }).map((_, i) => {
                const barLevel = (i + 1) / 10; // 0.1, 0.2, 0.3, ... 1.0
                const isActive = barLevel <= energy[0];
                const isHovered = hoveredEnergyBar !== null && (i + 1) <= hoveredEnergyBar;
                const barHeight = ((i + 1) / 10) * 100;
                
                return (
                  <motion.button
                    key={i}
                    className="flex-1 rounded-t-xl transition-all touch-manipulation cursor-pointer"
                    style={{
                      background: (isActive || isHovered)
                        ? '#06b6d4' // cyan-500
                        : 'rgba(255,255,255,0.1)',
                      opacity: isHovered && !isActive ? 0.7 : 1,
                      height: `${barHeight}%`,
                      minWidth: '8px'
                    }}
                    onClick={() => setEnergy([Math.min((i + 1) / 10, 1.0)])}
                    onMouseEnter={() => setHoveredEnergyBar(i + 1)}
                    onMouseLeave={() => setHoveredEnergyBar(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Set energy to ${(i + 1) * 10}%`}
                  />
                );
              })}
            </div>

            <p className="text-xs text-center text-foreground/60">
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
            <Button onClick={handleTuneMood} disabled={isSaving} size="2xl" variant="gradient" className="w-full group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.6)] hover:shadow-[0_25px_60px_-15px_rgba(168,85,247,0.8)] transition-all">
              {isSaving ? "Saving Your Vibe..." : "Tune My Vibe"}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>;
};