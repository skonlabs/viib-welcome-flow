import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ArrowLeft } from "lucide-react";
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

// Get color based on position
const getColorFromPosition = (x: number, y: number): string => {
  const hue = x * 1.2; // 0-120 (red to green)
  const saturation = 70 + (100 - y) * 0.3;
  const lightness = 50 + y * 0.15;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Get emoji based on quadrant
const getQuadrantEmoji = (valence: number, arousal: number): string => {
  if (arousal > 0 && valence > 0) return '🤩';
  if (arousal > 0 && valence <= 0) return '😤';
  if (arousal <= 0 && valence > 0) return '😌';
  return '😔';
};

// Get mood label based on position
const getMoodLabel = (valence: number, arousal: number): string => {
  const v = valence;
  const a = arousal;
  
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

export const MoodCalibrationScreen = ({
  onContinue,
  onBack,
  initialEnergy = 0.5,
  initialPositivity = 50
}: MoodCalibrationScreenProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emotions, setEmotions] = useState<EmotionState[]>([]);
  const { toast } = useToast();

  // Fetch emotions for reference points
  useEffect(() => {
    const fetchEmotions = async () => {
      const { data } = await supabase
        .from('emotion_master')
        .select('id, emotion_label, valence, arousal, category')
        .not('valence', 'is', null)
        .not('arousal', 'is', null);
      
      if (data) {
        setEmotions(data);
      }
    };
    fetchEmotions();
  }, []);

  // Load user's last mood
  useEffect(() => {
    const loadLastMood = async () => {
      const userId = localStorage.getItem('viib_user_id');
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
  }, []);

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

      // Find the closest emotion
      let closestEmotion = emotions[0];
      let minDistance = Infinity;

      for (const emotion of emotions) {
        if (emotion.valence === null || emotion.arousal === null) continue;
        const distance = Math.sqrt(
          Math.pow(emotion.valence - valence, 2) +
          Math.pow(emotion.arousal - arousal, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestEmotion = emotion;
        }
      }

      if (!closestEmotion) {
        toast({
          title: "Error",
          description: "Could not determine mood",
          variant: "destructive"
        });
        return;
      }

      // Calculate energy percentage from arousal
      const energyPercentage = Math.round(((arousal + 1) / 2) * 100);

      // Delete old emotion states before saving new one
      await supabase
        .from('user_emotion_states')
        .delete()
        .eq('user_id', userId);

      // Call the translate_mood_to_emotion RPC
      const { error: rpcError } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: closestEmotion.emotion_label,
        p_energy_percentage: energyPercentage
      });

      if (rpcError) throw rpcError;

      // Update last onboarding step
      await supabase
        .from('users')
        .update({ last_onboarding_step: '/app/onboarding/mood' })
        .eq('id', userId);

      toast({
        title: "Mood Saved",
        description: `Your vibe is set to ${moodLabel}!`
      });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('viib-mood-changed'));

      // Continue to next step
      onContinue({
        energy: (arousal + 1) / 2,
        positivity: (valence + 1) / 2 * 100
      });
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "Failed to save your mood. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <BackButton onClick={onBack} />
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10 opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]" 
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div 
              ref={mapRef}
              className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl cursor-crosshair touch-none select-none overflow-hidden"
              style={{
                background: `
                  radial-gradient(ellipse at 100% 0%, hsl(120 70% 50% / 0.3), transparent 50%),
                  radial-gradient(ellipse at 0% 0%, hsl(0 70% 50% / 0.3), transparent 50%),
                  radial-gradient(ellipse at 100% 100%, hsl(180 50% 50% / 0.3), transparent 50%),
                  radial-gradient(ellipse at 0% 100%, hsl(240 50% 50% / 0.3), transparent 50%),
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
          </motion.div>

          {/* Quadrant hints */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground max-w-sm mx-auto">
            <div className="text-left">😤 Tense / Angry</div>
            <div className="text-right">🤩 Excited / Happy</div>
            <div className="text-left">😔 Sad / Tired</div>
            <div className="text-right">😌 Calm / Peaceful</div>
          </div>

          {/* Save button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleTuneMood}
              disabled={isSaving}
              className="w-full max-w-sm mx-auto flex gap-2"
              size="lg"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Set My Vibe
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
