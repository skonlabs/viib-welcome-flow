import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface MoodMapProps {
  onMoodSaved: () => void;
  onBack: () => void;
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

// Get color based on emotion position
const getEmotionColor = (valence: number, arousal: number): string => {
  // Map to hue: negative=red/orange, positive=green/blue
  // High arousal = more saturated
  const hue = ((valence + 1) / 2) * 120; // 0-120 (red to green)
  const saturation = 60 + arousal * 20;
  const lightness = 45 + (1 - arousal) * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Emoji mapping for emotions
const emotionEmojis: Record<string, string> = {
  happy: '😊',
  excited: '🤩',
  calm: '😌',
  content: '🙂',
  sad: '😢',
  tired: '😴',
  anxious: '😰',
  angry: '😠',
  frustrated: '😤',
  bored: '😑',
  curious: '🤔',
  inspired: '✨',
  hopeful: '🌟',
  nostalgic: '🥹',
  romantic: '🥰',
  adventurous: '🚀',
  stressed: '😫',
  overwhelmed: '🤯',
  lonely: '🥺',
  melancholic: '😔',
};

export const MoodMap = ({ onMoodSaved, onBack }: MoodMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [emotions, setEmotions] = useState<EmotionState[]>([]);

  // Fetch emotions
  useEffect(() => {
    const fetchEmotions = async () => {
      const { data } = await supabase
        .from('emotion_master')
        .select('id, emotion_label, valence, arousal, category')
        .eq('category', 'user_state')
        .not('valence', 'is', null)
        .not('arousal', 'is', null);
      
      if (data) {
        setEmotions(data as EmotionState[]);
      }
    };
    fetchEmotions();
  }, []);

  // Load user's last mood
  useEffect(() => {
    const loadLastMood = async () => {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId || emotions.length === 0) return;

      const { data } = await supabase
        .from('user_emotion_states')
        .select('emotion_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.emotion_id) {
        const lastEmotion = emotions.find(e => e.id === data.emotion_id);
        if (lastEmotion) {
          setSelectedEmotion(lastEmotion);
        }
      }
    };
    loadLastMood();
  }, [emotions]);

  const handleSelectEmotion = (emotion: EmotionState) => {
    setSelectedEmotion(emotion);
  };

  const handleSaveMood = async () => {
    if (!selectedEmotion) {
      toast.error('Please select a mood first');
      return;
    }

    const userId = localStorage.getItem('viib_user_id');
    if (!userId) {
      toast.error('Please log in to save your mood');
      return;
    }

    setIsSaving(true);
    try {
      const energyPercentage = Math.round(((selectedEmotion.arousal! + 1) / 2) * 100);

      const { error: rpcError } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.emotion_label,
        p_energy_percentage: energyPercentage
      });

      if (rpcError) throw rpcError;

      toast.success(`Mood set to ${selectedEmotion.emotion_label}!`);
      onMoodSaved();
    } catch (error) {
      console.error('Error saving mood:', error);
      toast.error('Failed to save mood');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">How are you feeling?</h1>
          <p className="text-sm text-muted-foreground">Tap an emotion that matches your mood</p>
        </div>
      </div>

      {/* Selected emotion display */}
      <div className="px-4 py-2">
        <AnimatePresence mode="wait">
          {selectedEmotion ? (
            <motion.div
              key={selectedEmotion.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center gap-3 p-4 rounded-xl"
              style={{
                backgroundColor: `${getEmotionColor(selectedEmotion.valence!, selectedEmotion.arousal!)}20`,
                borderColor: getEmotionColor(selectedEmotion.valence!, selectedEmotion.arousal!),
                borderWidth: 2,
              }}
            >
              <span className="text-4xl">
                {emotionEmojis[selectedEmotion.emotion_label] || '🎭'}
              </span>
              <span 
                className="text-2xl font-bold capitalize"
                style={{ color: getEmotionColor(selectedEmotion.valence!, selectedEmotion.arousal!) }}
              >
                {selectedEmotion.emotion_label}
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/30 border-2 border-dashed border-muted-foreground/30"
            >
              <span className="text-4xl opacity-50">🎭</span>
              <span className="text-lg text-muted-foreground">Tap an emotion below</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2D Mood Map with Emotion Bubbles */}
      <div className="flex-1 p-4">
        <div 
          ref={mapRef}
          className="relative w-full h-full min-h-[400px] max-h-[500px] rounded-2xl overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 100% 0%, hsl(120 70% 50% / 0.15), transparent 50%),
              radial-gradient(ellipse at 0% 0%, hsl(0 70% 50% / 0.15), transparent 50%),
              radial-gradient(ellipse at 100% 100%, hsl(180 50% 50% / 0.15), transparent 50%),
              radial-gradient(ellipse at 0% 100%, hsl(240 50% 50% / 0.15), transparent 50%),
              hsl(var(--card))
            `
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-foreground/10" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-foreground/10" />
          </div>

          {/* Axis labels */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-foreground/40 font-medium">
            ⚡ High Energy
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-foreground/40 font-medium">
            😴 Low Energy
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-medium">
            😔
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-medium">
            😊
          </div>

          {/* Emotion Bubbles */}
          {emotions.map((emotion) => {
            if (emotion.valence === null || emotion.arousal === null) return null;
            const pos = emotionToPosition(emotion.valence, emotion.arousal);
            const color = getEmotionColor(emotion.valence, emotion.arousal);
            const isSelected = selectedEmotion?.id === emotion.id;
            const emoji = emotionEmojis[emotion.emotion_label] || '🎭';
            
            return (
              <motion.button
                key={emotion.id}
                className="absolute flex flex-col items-center gap-0.5 cursor-pointer group"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => handleSelectEmotion(emotion)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: isSelected ? 1.2 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {/* Bubble background */}
                <motion.div
                  className="relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg"
                  style={{
                    backgroundColor: isSelected ? color : `${color}cc`,
                    boxShadow: isSelected 
                      ? `0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.3)` 
                      : `0 2px 8px rgba(0,0,0,0.2)`,
                  }}
                  animate={{
                    boxShadow: isSelected 
                      ? `0 0 25px ${color}, 0 4px 12px rgba(0,0,0,0.3)` 
                      : `0 2px 8px rgba(0,0,0,0.2)`,
                  }}
                >
                  <span className="text-2xl">{emoji}</span>
                  
                  {/* Selection ring */}
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-white"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.div>
                
                {/* Label */}
                <span 
                  className="text-[10px] font-medium capitalize px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  style={{ 
                    color: color,
                    opacity: isSelected ? 1 : undefined,
                  }}
                >
                  {emotion.emotion_label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="p-4">
        <Button
          onClick={handleSaveMood}
          disabled={isSaving || !selectedEmotion}
          className="w-full gap-2"
          size="lg"
        >
          <Sparkles className="h-4 w-4" />
          {isSaving ? 'Saving...' : selectedEmotion ? `Set Mood: ${selectedEmotion.emotion_label}` : 'Select a Mood'}
        </Button>
      </div>
    </div>
  );
};

export default MoodMap;
