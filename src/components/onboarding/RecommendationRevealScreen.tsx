import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Info } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  title: string;
  reason: string;
  mood: string;
  poster_path?: string;
}

interface RecommendationRevealScreenProps {
  userName: string;
  recommendations?: Recommendation[];
  onContinue: () => void;
  onBack: () => void;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200";

export const RecommendationRevealScreen = ({ userName, recommendations, onContinue, onBack }: RecommendationRevealScreenProps) => {
  const [personalizedRecs, setPersonalizedRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadPersonalizedFallback = async () => {
      if (recommendations && recommendations.length > 0) {
        setPersonalizedRecs(recommendations);
        setLoading(false);
        return;
      }

      try {
        const userId = localStorage.getItem('viib_user_id');
        if (!userId) {
          setPersonalizedRecs(getDefaultRecommendations(userName));
          setLoading(false);
          return;
        }

        // Get user's vibe preference
        const { data: vibeData } = await supabase
          .from('user_vibe_preferences')
          .select('vibe_type')
          .eq('user_id', userId)
          .maybeSingle();

        // Get user's emotion state
        const { data: emotionData } = await supabase
          .from('user_emotion_states')
          .select('emotion_id, intensity')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Build personalized fallback messages
        const vibe = vibeData?.vibe_type?.split(',')[0] || 'curious';
        const intensity = emotionData?.intensity || 0.5;

        const personalizedMessages = getPersonalizedMessages(userName, vibe, intensity);
        setPersonalizedRecs(personalizedMessages);
      } catch (err) {
        toast({
          title: "Notice",
          description: "Couldn't load personalized recommendations. Showing defaults.",
          variant: "destructive"
        });
        setPersonalizedRecs(getDefaultRecommendations(userName));
      } finally {
        setLoading(false);
      }
    };

    loadPersonalizedFallback();
  }, [userName, recommendations]);

  const displayRecommendations = personalizedRecs.length > 0 ? personalizedRecs : getDefaultRecommendations(userName);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-16 relative overflow-hidden bg-black">
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
        className="relative z-10 w-full max-w-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-10">
          {/* Header */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-16 h-16 mx-auto text-gradient" />
            </motion.div>
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">{userName}, your ViiB is ready</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Here's what we picked for how you feel today
            </p>
          </motion.div>

          {/* Recommendations */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-3xl p-6 animate-pulse">
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-36 rounded-2xl bg-white/10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-white/10 rounded w-3/4" />
                      <div className="h-4 bg-white/10 rounded w-full" />
                      <div className="h-8 bg-white/10 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {displayRecommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.15, type: "spring" }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="glass-card rounded-3xl p-6 cursor-pointer group"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-24 h-36 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                      {rec.poster_path ? (
                        <img
                          src={`${TMDB_IMAGE_BASE}${rec.poster_path}`}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">{rec.mood.split(" ")[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <h3 className="text-2xl font-bold text-foreground group-hover:text-gradient transition-all">
                        {rec.title}
                      </h3>
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Why this?</span> {rec.reason}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <span className="text-sm text-muted-foreground">{rec.mood}</span>
                      </div>
                    </div>
                    <motion.div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={{ x: -10 }}
                      whileHover={{ x: 0 }}
                    >
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* CTA */}
          <motion.div
            className="flex justify-center pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={onContinue}
              size="2xl"
              variant="gradient"
              className="shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              Explore All Recommendations
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

function getDefaultRecommendations(userName: string): Recommendation[] {
  return [
    {
      title: "Personalizing Your Experience",
      reason: `We're curating content based on ${userName}'s preferences`,
      mood: "✨ Discovering",
    },
    {
      title: "Matching Your Mood",
      reason: "Analyzing your emotional profile for perfect matches",
      mood: "🎯 Calibrating",
    },
    {
      title: "Building Your ViiB",
      reason: "Creating your unique recommendation engine",
      mood: "🚀 Ready",
    },
  ];
}

function getPersonalizedMessages(userName: string, vibe: string, intensity: number): Recommendation[] {
  const vibeMessages: Record<string, Recommendation[]> = {
    scifi: [
      { title: "Sci-Fi Adventures Await", reason: `${userName}, your love for expansive worlds is shaping your feed`, mood: "🚀 Cosmic" },
      { title: "Mind-Bending Stories", reason: "We're finding the perfect blend of imagination and wonder", mood: "🌌 Infinite" },
      { title: "Future Visions", reason: "Your curiosity for the unknown guides our picks", mood: "✨ Visionary" },
    ],
    drama: [
      { title: "Emotional Journeys", reason: `${userName}, deep storytelling resonates with you`, mood: "❤️ Heartfelt" },
      { title: "Character-Driven Tales", reason: "We're finding stories that speak to the soul", mood: "🎭 Moving" },
      { title: "Powerful Narratives", reason: "Your appreciation for depth shapes your recommendations", mood: "💫 Profound" },
    ],
    comedy: [
      { title: "Joy-Filled Picks", reason: `${userName}, laughter is your medicine`, mood: "😄 Joyful" },
      { title: "Feel-Good Entertainment", reason: "We're curating content to brighten your day", mood: "🌟 Uplifting" },
      { title: "Light-Hearted Fun", reason: "Your positive energy guides our selections", mood: "🎉 Fun" },
    ],
    thriller: [
      { title: "Edge-of-Seat Thrills", reason: `${userName}, you crave suspense and mystery`, mood: "🔍 Intriguing" },
      { title: "Heart-Pounding Stories", reason: "We're finding content that keeps you guessing", mood: "⚡ Intense" },
      { title: "Mystery Awaits", reason: "Your love for twists shapes your feed", mood: "🎯 Gripping" },
    ],
  };

  // Default to a generic but personalized set
  return vibeMessages[vibe] || [
    { title: "Perfect Matches Loading", reason: `${userName}, we're analyzing your unique taste profile`, mood: "✨ Personal" },
    { title: "Your Mood, Your Movies", reason: `Current energy level: ${Math.round(intensity * 100)}% - we're matching content accordingly`, mood: "🎯 Calibrated" },
    { title: "ViiB Recommendations Ready", reason: "Your personalized entertainment journey begins now", mood: "🚀 Ready" },
  ];
}
