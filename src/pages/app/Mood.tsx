import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { FloatingParticles } from '@/components/onboarding/FloatingParticles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from '@/icons';
import deeplyCalmImage from '@/assets/deeply-calm.png';

interface EmotionState {
  id: string;
  label: string;
  value: number;
  valence: number;
  arousal: number;
  intensityMultiplier: number;
}

const Mood = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [energy, setEnergy] = useState([0.5]);
  const [currentEmotionIndex, setCurrentEmotionIndex] = useState(0);
  const [hoveredEnergyBar, setHoveredEnergyBar] = useState<number | null>(null);
  const [convertedEmotion, setConvertedEmotion] = useState<{ label: string }>({ label: 'Balanced' });
  const [emotionStates, setEmotionStates] = useState<EmotionState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch emotion states from emotion_master table
  useEffect(() => {
    const fetchEmotionStates = async () => {
      const { data, error } = await supabase
        .from('emotion_master')
        .select('id, emotion_label, valence, arousal, intensity_multiplier')
        .eq('category', 'user_state')
        .order('valence', { ascending: true });

      if (error) {
        console.error('Error fetching emotion states:', error);
        return;
      }

      if (data && data.length > 0) {
        const mapped = data.map((emotion, index) => ({
          id: emotion.id,
          label: emotion.emotion_label,
          value: Math.round(index / (data.length - 1) * 100),
          valence: emotion.valence || 0,
          arousal: emotion.arousal || 0,
          intensityMultiplier: emotion.intensity_multiplier || 1.0
        }));
        setEmotionStates(mapped);
      }
    };
    fetchEmotionStates();
  }, []);

  // Fetch saved mood data when component mounts
  useEffect(() => {
    const fetchSavedMood = async () => {
      if (!profile?.id || emotionStates.length === 0) return;

      try {
        const { data: savedEmotion, error } = await supabase
          .from('user_emotion_states')
          .select('intensity, emotion_id, emotion_master(emotion_label, valence, intensity_multiplier)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching saved mood:', error);
          return;
        }

        if (!savedEmotion) return;

        // Find and restore the mood tone selection
        const emotionLabel = (savedEmotion.emotion_master as any)?.emotion_label;
        if (emotionLabel) {
          const emotionIndex = emotionStates.findIndex(
            e => e.label.toLowerCase() === emotionLabel.toLowerCase()
          );
          if (emotionIndex >= 0) {
            setCurrentEmotionIndex(emotionIndex);
          }
        }

        // Reverse-calculate original energy from stored intensity
        const multiplier = (savedEmotion.emotion_master as any)?.intensity_multiplier || 1.0;
        const originalEnergy = savedEmotion.intensity / multiplier;
        const restoredEnergy = Math.min(Math.max(originalEnergy, 0.1), 1.0);
        setEnergy([restoredEnergy]);

        // Calculate display emotion
        const intensity = restoredEnergy;
        let prefix = '';
        if (intensity < 0.25) prefix = 'Slightly';
        else if (intensity < 0.45) prefix = 'Mildly';
        else if (intensity < 0.65) prefix = 'Moderately';
        else if (intensity < 0.85) prefix = 'Deeply';
        else prefix = 'Overwhelmingly';

        const capitalizedLabel = emotionLabel?.charAt(0).toUpperCase() + emotionLabel?.slice(1);
        setConvertedEmotion({ label: `${prefix} ${capitalizedLabel}` });
      } catch (error) {
        console.error('Error fetching saved mood:', error);
      }
    };

    fetchSavedMood();
  }, [profile?.id, emotionStates]);

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

  // Calculate display emotion on frontend
  useEffect(() => {
    if (!selectedEmotion) return;

    const intensity = energy[0];
    const emotionLabel = selectedEmotion.label;

    let prefix = '';
    if (intensity < 0.25) prefix = 'Slightly';
    else if (intensity < 0.45) prefix = 'Mildly';
    else if (intensity < 0.65) prefix = 'Moderately';
    else if (intensity < 0.85) prefix = 'Deeply';
    else prefix = 'Overwhelmingly';

    const capitalizedLabel = emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1);
    setConvertedEmotion({ label: `${prefix} ${capitalizedLabel}` });
  }, [selectedEmotion, energy]);

  // Helper function to get emotion emoji
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
    return '😌';
  };

  // Helper function to get intensity level from label
  const getIntensityLevel = (label: string): number => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('deeply') || lowerLabel.includes('profoundly') || lowerLabel.includes('overwhelmingly')) return 1.0;
    if (lowerLabel.includes('strongly') || lowerLabel.includes('intensely') || lowerLabel.includes('extremely')) return 0.8;
    if (lowerLabel.includes('very') || lowerLabel.includes('quite')) return 0.6;
    if (lowerLabel.includes('peacefully') || lowerLabel.includes('softly') || lowerLabel.includes('mildly')) return 0.3;
    return 0.5;
  };

  // Helper function to get color based on emotion and intensity
  const getEmotionColorWithIntensity = (label: string, valence: number): string => {
    const lowerLabel = label.toLowerCase();
    const intensity = getIntensityLevel(label);
    
    if (lowerLabel.includes('angry') || lowerLabel.includes('frustrated')) {
      const hue = 0;
      const saturation = 70 + (intensity * 30);
      const lightness = 55 - (intensity * 15);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('sad') || lowerLabel.includes('down')) {
      const hue = 220;
      const saturation = 60 + (intensity * 30);
      const lightness = 55 - (intensity * 20);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('anxious') || lowerLabel.includes('stress') || lowerLabel.includes('worried')) {
      const hue = 30;
      const saturation = 70 + (intensity * 25);
      const lightness = 55 - (intensity * 10);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('lonely') || lowerLabel.includes('alone') || lowerLabel.includes('isolated')) {
      const hue = 270;
      const saturation = 40 + (intensity * 30);
      const lightness = 50 - (intensity * 15);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('bored') || lowerLabel.includes('drained') || lowerLabel.includes('tired')) {
      const hue = 210;
      const saturation = 15 + (intensity * 20);
      const lightness = 50 - (intensity * 10);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('happy') || lowerLabel.includes('excited') || lowerLabel.includes('joy')) {
      const hue = 45;
      const saturation = 75 + (intensity * 20);
      const lightness = 55 - (intensity * 10);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('hopeful') || lowerLabel.includes('optimistic') || lowerLabel.includes('balanced')) {
      const hue = 160;
      const saturation = 60 + (intensity * 25);
      const lightness = 50;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (lowerLabel.includes('calm') || lowerLabel.includes('peaceful') || lowerLabel.includes('serene')) {
      const hue = 190;
      const saturation = 55 + (intensity * 25);
      const lightness = 55 - (intensity * 5);
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    if (valence > 0.5) return '#10b981';
    if (valence < -0.5) return '#3b82f6';
    return '#06b6d4';
  };

  const handleSaveMood = async () => {
    if (!profile?.id) {
      toast.error('Please log in to save your mood');
      return;
    }

    setIsSaving(true);
    try {
      const energyValue = Math.max(0.1, Math.min(energy[0], 1.0));
      const energyPercentage = energyValue * 100;

      // Call the translate_mood_to_emotion RPC
      const { error: rpcError } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: profile.id,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energyPercentage
      });

      if (rpcError) throw rpcError;

      toast.success(`Mood set to ${convertedEmotion.label}!`);
      
      // Dispatch event to notify other components to refresh recommendations
      window.dispatchEvent(new CustomEvent('viib-mood-changed'));
      
      navigate('/app/home');
    } catch (error) {
      console.error('Error saving mood:', error);
      toast.error('Failed to save mood');
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <h2 className="text-xl font-semibold">Please log in</h2>
          <p className="text-muted-foreground">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/app/home')}
        className="absolute top-4 left-4 z-20 text-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10 opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" 
            style={{
              background: `radial-gradient(circle, ${getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence)}80 0%, transparent 70%)`
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
        <div className="space-y-8">
          {/* Header */}
          <motion.div 
            className="text-center space-y-3" 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">How are you feeling?</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Update your mood to get personalized recommendations
            </p>
          </motion.div>

          {/* Emotion Carousel */}
          <motion.div 
            className="relative" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.4 }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-card/50 backdrop-blur-lg p-8 border border-border/50">
              {/* Navigation Arrows */}
              <button 
                onClick={goToPrevEmotion} 
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur p-2 rounded-full hover:scale-110 transition-transform border border-border/50" 
                aria-label="Previous emotion"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={goToNextEmotion} 
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur p-2 rounded-full hover:scale-110 transition-transform border border-border/50" 
                aria-label="Next emotion"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Emotion Card - Swipeable */}
              <AnimatePresence mode="wait">
                {selectedEmotion && (
                  <motion.div 
                    key={selectedEmotion.id} 
                    drag="x" 
                    dragConstraints={{ left: 0, right: 0 }} 
                    dragElastic={0.2} 
                    onDragEnd={handleDragEnd} 
                    initial={{ opacity: 0, x: 100 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -100 }} 
                    transition={{ type: "spring", stiffness: 300, damping: 30 }} 
                    className="text-center space-y-6 cursor-grab active:cursor-grabbing"
                  >
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
                      <h3 
                        className="text-3xl sm:text-4xl font-bold capitalize" 
                        style={{ color: getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence) }}
                      >
                        {convertedEmotion?.label || selectedEmotion.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Swipe or use arrows to change
                      </p>
                    </div>

                    {/* Emotion Dots */}
                    <div className="flex justify-center gap-2">
                      {emotionStates.map((_, index) => (
                        <motion.div 
                          key={index} 
                          className="w-2 h-2 rounded-full cursor-pointer"
                          onClick={() => setCurrentEmotionIndex(index)}
                          style={{
                            background: index === currentEmotionIndex 
                              ? getEmotionColorWithIntensity(convertedEmotion?.label || selectedEmotion.label, selectedEmotion.valence) 
                              : 'rgba(255,255,255,0.2)'
                          }} 
                          animate={{ scale: index === currentEmotionIndex ? 1.5 : 1 }} 
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Energy Intensity Control */}
          <motion.div 
            className="bg-card/50 backdrop-blur-lg rounded-3xl p-6 border border-border/50 space-y-4" 
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
                const barLevel = (i + 1) / 10;
                const isActive = barLevel <= energy[0];
                const isHovered = hoveredEnergyBar !== null && (i + 1) <= hoveredEnergyBar;
                const barHeight = ((i + 1) / 10) * 100;
                
                return (
                  <motion.button
                    key={i}
                    className="flex-1 rounded-t-xl transition-all touch-manipulation cursor-pointer"
                    style={{
                      background: (isActive || isHovered)
                        ? '#06b6d4'
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

          {/* Save Button */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.8 }}
          >
            <Button 
              onClick={handleSaveMood} 
              disabled={isSaving} 
              size="lg" 
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Sparkles className="h-4 w-4" />
              {isSaving ? "Saving Your Vibe..." : "Tune My Vibe"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Mood;