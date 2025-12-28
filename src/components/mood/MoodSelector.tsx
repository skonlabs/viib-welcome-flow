import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface MoodSelectorProps {
  userId: string;
  onMoodSaved: (mood: { valence: number; arousal: number; label: string }) => void;
  /** Button text - defaults to "Set My Mood" */
  buttonText?: string;
  /** Show arrow icon on button */
  showArrowIcon?: boolean;
  /** Whether to show animated background effects */
  showBackgroundEffects?: boolean;
  /** Additional class for the container */
  className?: string;
}

interface EmotionState {
  id: string;
  emotion_label: string;
  valence: number | null;
  arousal: number | null;
  category: string;
}

// Map valence (-1 to 1) and arousal (-1 to 1) to x,y percentages (0-100)
const emotionToPosition = (valence: number, arousal: number) => ({
  x: ((valence + 1) / 2) * 100,
  y: ((1 - arousal) / 2) * 100, // Invert Y so high energy is at top
});

// Map x,y percentages (0-100) to valence and arousal (-1 to 1)
const positionToEmotion = (x: number, y: number) => ({
  valence: (x / 100) * 2 - 1,
  arousal: 1 - (y / 100) * 2,
});

// Get color based on position - using app theme colors (purple/cyan/pink)
const getColorFromPosition = (x: number, y: number): string => {
  const normalizedX = x / 100;
  const normalizedY = y / 100;
  
  // Interpolate between purple (280), cyan (200), and pink (320) based on position
  let hue: number;
  if (normalizedX < 0.5) {
    // Left side: interpolate from pink (320) to purple (280)
    hue = 320 - (normalizedX * 2) * 40;
  } else {
    // Right side: interpolate from purple (280) to cyan (200)
    hue = 280 - ((normalizedX - 0.5) * 2) * 80;
  }
  
  const saturation = 80 + (1 - normalizedY) * 20;
  const lightness = 50 + normalizedY * 15;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Get emoji based on quadrant
const getQuadrantEmoji = (valence: number, arousal: number): string => {
  if (arousal > 0 && valence > 0) return '🤩'; // High energy, positive
  if (arousal > 0 && valence <= 0) return '😤'; // High energy, negative
  if (arousal <= 0 && valence > 0) return '😌'; // Low energy, positive
  return '😔'; // Low energy, negative
};

// Get mood label based on position
const getMoodLabel = (valence: number, arousal: number): string => {
  const v = valence;
  const a = arousal;
  
  // Define mood zones
  if (a > 0.5 && v > 0.5) return 'Excited';
  if (a > 0.5 && v > 0) return 'Happy';
  if (a > 0.5 && v > -0.5) return 'Tense';
  if (a > 0.5) return 'Angry';
  
  if (a > 0 && v > 0.5) return 'Delighted';
  if (a > 0 && v > 0) return 'Cheerful';
  if (a > 0 && v > -0.5) return 'Frustrated';
  if (a > 0) return 'Annoyed';
  
  if (a > -0.5 && v > 0.5) return 'Peaceful';
  if (a > -0.5 && v > 0) return 'Content';
  if (a > -0.5 && v > -0.5) return 'Bored';
  if (a > -0.5) return 'Melancholic';
  
  if (v > 0.5) return 'Calm';
  if (v > 0) return 'Relaxed';
  if (v > -0.5) return 'Tired';
  return 'Sad';
};

export const MoodSelector = ({
  userId,
  onMoodSaved,
  buttonText = 'Set My Mood',
  showArrowIcon = false,
  showBackgroundEffects = false,
  className = '',
}: MoodSelectorProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emotions, setEmotions] = useState<EmotionState[]>([]);

  // Fetch emotions for reference points - only user_state emotions
  useEffect(() => {
    const fetchEmotions = async () => {
      const { data } = await supabase
        .from('emotion_master')
        .select('id, emotion_label, valence, arousal, category')
        .eq('category', 'user_state')
        .not('valence', 'is', null)
        .not('arousal', 'is', null);
      
      if (data) {
        console.log('[MoodSelector] Loaded user_state emotions:', data.length);
        setEmotions(data);
      }
    };
    fetchEmotions();
  }, []);

  // Load user's last mood
  useEffect(() => {
    const loadLastMood = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from('user_emotion_states')
        .select('valence, arousal')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.valence !== null && data?.arousal !== null) {
        const pos = emotionToPosition(data.valence, data.arousal);
        setPosition(pos);
      }
    };
    loadLastMood();
  }, [userId]);

  const { valence, arousal } = useMemo(
    () => positionToEmotion(position.x, position.y),
    [position.x, position.y]
  );

  const moodLabel = useMemo(
    () => getMoodLabel(valence, arousal),
    [valence, arousal]
  );

  const moodEmoji = useMemo(
    () => getQuadrantEmoji(valence, arousal),
    [valence, arousal]
  );

  const positionColor = useMemo(
    () => getColorFromPosition(position.x, position.y),
    [position.x, position.y]
  );

  const handleMapInteraction = (clientX: number, clientY: number) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMapInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMapInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    handleMapInteraction(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      handleMapInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSaveMood = async () => {
    setIsSaving(true);
    try {
      // Find the closest emotion - convert UI values (-1 to 1) to emotion_master scale (0 to 1)
      const uiValence01 = (valence + 1) / 2; // Convert -1..1 to 0..1
      const uiArousal01 = (arousal + 1) / 2; // Convert -1..1 to 0..1
      
      console.log('[MoodSelector] UI values:', { valence, arousal });
      console.log('[MoodSelector] Converted to 0-1 scale:', { uiValence01, uiArousal01 });
      console.log('[MoodSelector] Available emotions count:', emotions.length);
      
      let closestEmotion = emotions[0];
      let minDistance = Infinity;

      for (const emotion of emotions) {
        if (emotion.valence === null || emotion.arousal === null) continue;
        // emotion_master values are already in 0-1 scale
        const distance = Math.sqrt(
          Math.pow(emotion.valence - uiValence01, 2) +
          Math.pow(emotion.arousal - uiArousal01, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestEmotion = emotion;
        }
      }
      
      console.log('[MoodSelector] Closest emotion found:', closestEmotion?.emotion_label, 'distance:', minDistance);

      if (!closestEmotion) {
        toast.error('Could not determine mood');
        return;
      }

      // Calculate energy percentage from arousal
      const energyPercentage = Math.round(((arousal + 1) / 2) * 100);

      // Call the translate_mood_to_emotion RPC with raw valence/arousal
      const { error: rpcError } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: closestEmotion.emotion_label,
        p_energy_percentage: energyPercentage,
        p_raw_valence: valence,
        p_raw_arousal: arousal
      });

      if (rpcError) throw rpcError;

      toast.success(`Mood set to ${moodLabel}!`);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('viib-mood-changed'));
      
      onMoodSaved({ valence, arousal, label: moodLabel });
    } catch (error) {
      console.error('Error saving mood:', error);
      toast.error('Failed to save mood');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {/* Animated background effect */}
      {showBackgroundEffects && (
        <motion.div 
          className="fixed top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none -z-10" 
          style={{
            background: `radial-gradient(circle, ${positionColor}80 0%, transparent 70%)`
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
      )}

      {/* Current mood display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={moodLabel}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="text-center"
        >
          <span className="text-5xl mb-2 block">{moodEmoji}</span>
          <span 
            className="text-2xl font-bold"
            style={{ color: positionColor }}
          >
            {moodLabel}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* 2D Mood Map */}
      <div 
        ref={mapRef}
        className="relative w-full max-w-sm aspect-square rounded-2xl cursor-crosshair touch-none select-none overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 100% 0%, hsl(200 100% 60% / 0.35), transparent 50%),
            radial-gradient(ellipse at 0% 0%, hsl(320 80% 55% / 0.35), transparent 50%),
            radial-gradient(ellipse at 100% 100%, hsl(200 80% 50% / 0.25), transparent 50%),
            radial-gradient(ellipse at 0% 100%, hsl(280 100% 70% / 0.3), transparent 50%),
            hsl(var(--card))
          `
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-foreground/10" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-foreground/10" />
        </div>

        {/* Axis labels */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-foreground/50 font-medium">
          High Energy
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-foreground/50 font-medium">
          Low Energy
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-foreground/50 font-medium writing-mode-vertical">
          Negative
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-foreground/50 font-medium writing-mode-vertical">
          Positive
        </div>

        {/* Emotion reference dots */}
        {emotions.slice(0, 12).map((emotion) => {
          if (emotion.valence === null || emotion.arousal === null) return null;
          const pos = emotionToPosition(emotion.valence, emotion.arousal);
          return (
            <div
              key={emotion.id}
              className="absolute w-2 h-2 rounded-full bg-foreground/20 pointer-events-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              title={emotion.emotion_label}
            />
          );
        })}

        {/* Current position marker */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
          }}
          animate={{
            left: `${position.x}%`,
            top: `${position.y}%`,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Outer glow */}
          <div 
            className="absolute w-16 h-16 rounded-full opacity-30 blur-md"
            style={{ 
              backgroundColor: positionColor,
              transform: 'translate(-50%, -50%)',
            }} 
          />
          {/* Main marker */}
          <div 
            className="absolute w-8 h-8 rounded-full border-4 border-white shadow-lg"
            style={{ 
              backgroundColor: positionColor,
              transform: 'translate(-50%, -50%)',
            }}
          />
          {/* Inner dot */}
          <div 
            className="absolute w-2 h-2 rounded-full bg-white"
            style={{ transform: 'translate(-50%, -50%)' }}
          />
        </motion.div>
      </div>

      {/* Quadrant hints */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-sm w-full">
        <div className="text-left">😤 Tense / Angry</div>
        <div className="text-right">🤩 Excited / Happy</div>
        <div className="text-left">😔 Sad / Tired</div>
        <div className="text-right">😌 Calm / Peaceful</div>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSaveMood}
        disabled={isSaving}
        className="w-full max-w-sm gap-2"
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        {isSaving ? 'Saving...' : buttonText}
        {showArrowIcon && !isSaving && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default MoodSelector;
