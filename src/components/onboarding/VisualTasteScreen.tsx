import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { supabase } from "@/integrations/supabase/client";

interface GenreTitleOption {
  genre_id: string;
  genre_name: string;
  title_id: string;
  title_name: string;
  poster_path: string;
  popularity: number;
}

interface VisualTasteScreenProps {
  onContinue: (selections: string[]) => void;
  onBack: () => void;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export const VisualTasteScreen = ({ onContinue, onBack }: VisualTasteScreenProps) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [options, setOptions] = useState<GenreTitleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const userId = localStorage.getItem('viib_user_id');
        if (!userId) {
          setLoading(false);
          return;
        }

        // Get user's streaming subscriptions
        const { data: userStreaming } = await supabase
          .from('user_streaming_subscriptions')
          .select('streaming_service_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        const streamingServiceIds = userStreaming?.map(s => s.streaming_service_id) || [];

        // Get user's language preferences
        const { data: userLanguages } = await supabase
          .from('user_language_preferences')
          .select('language_code')
          .eq('user_id', userId);

        const languageCodes = userLanguages?.map(l => l.language_code) || [];
        // Always include English as fallback
        if (!languageCodes.includes('en')) {
          languageCodes.push('en');
        }

        // Get user's region for streaming availability
        const { data: userData } = await supabase
          .from('users')
          .select('ip_country')
          .eq('id', userId)
          .maybeSingle();

        const userRegion = userData?.ip_country || 'US';

        // Get titles available on user's streaming services
        let availableTitleIds: string[] = [];
        
        if (streamingServiceIds.length > 0) {
          const { data: streamingTitles } = await supabase
            .from('title_streaming_availability')
            .select('title_id')
            .in('streaming_service_id', streamingServiceIds)
            .eq('region_code', userRegion);

          availableTitleIds = [...new Set(streamingTitles?.map(t => t.title_id) || [])];
        }

        // Get all genres
        const { data: genres, error: genreError } = await supabase
          .from('genres')
          .select('id, genre_name')
          .order('genre_name');

        if (genreError) throw genreError;
        if (!genres || genres.length === 0) {
          setLoading(false);
          return;
        }

        // Build query for popular titles
        let titlesQuery = supabase
          .from('titles')
          .select('id, name, poster_path, popularity, original_language')
          .not('poster_path', 'is', null)
          .not('name', 'is', null)
          .in('original_language', languageCodes)
          .order('popularity', { ascending: false });

        // Filter by available titles if user has streaming preferences
        if (availableTitleIds.length > 0) {
          titlesQuery = titlesQuery.in('id', availableTitleIds.slice(0, 500));
        } else {
          titlesQuery = titlesQuery.limit(500);
        }

        const { data: popularTitles, error: titlesError } = await titlesQuery;

        if (titlesError) throw titlesError;
        if (!popularTitles || popularTitles.length === 0) {
          // Fallback: get any popular titles if filtered results are empty
          const { data: fallbackTitles } = await supabase
            .from('titles')
            .select('id, name, poster_path, popularity, original_language')
            .not('poster_path', 'is', null)
            .not('name', 'is', null)
            .order('popularity', { ascending: false })
            .limit(300);

          if (!fallbackTitles || fallbackTitles.length === 0) {
            setLoading(false);
            return;
          }
          
          // Continue with fallback titles
          await processGenreTitles(genres, fallbackTitles);
          return;
        }

        await processGenreTitles(genres, popularTitles);

      } catch (err) {
        console.error('Failed to load genre titles:', err);
        setLoading(false);
      }
    };

    const processGenreTitles = async (
      genres: { id: string; genre_name: string }[],
      popularTitles: { id: string; name: string | null; poster_path: string | null; popularity: number | null }[]
    ) => {
      try {
        // Get title-genre mappings for these titles
        const titleIds = popularTitles.map(t => t.id);
        
        const { data: titleGenres } = await supabase
          .from('title_genres')
          .select('genre_id, title_id')
          .in('title_id', titleIds);

        if (!titleGenres) {
          setLoading(false);
          return;
        }

        // Create maps
        const titleMap = new Map(popularTitles.map(t => [t.id, t]));
        const genreToTitles = new Map<string, string[]>();
        
        for (const tg of titleGenres) {
          const existing = genreToTitles.get(tg.genre_id) || [];
          existing.push(tg.title_id);
          genreToTitles.set(tg.genre_id, existing);
        }

        // Track used titles to ensure uniqueness
        const usedTitleIds = new Set<string>();
        const genreTitles: GenreTitleOption[] = [];

        // For each genre, find the most popular unused title
        for (const genre of genres) {
          const genreTitleIds = genreToTitles.get(genre.id) || [];
          
          let bestTitle = null;
          let bestPopularity = -1;

          for (const titleId of genreTitleIds) {
            if (usedTitleIds.has(titleId)) continue;
            
            const title = titleMap.get(titleId);
            if (title && title.poster_path && (title.popularity || 0) > bestPopularity) {
              bestTitle = title;
              bestPopularity = title.popularity || 0;
            }
          }

          if (bestTitle) {
            usedTitleIds.add(bestTitle.id);
            genreTitles.push({
              genre_id: genre.id,
              genre_name: genre.genre_name,
              title_id: bestTitle.id,
              title_name: bestTitle.name || 'Unknown',
              poster_path: bestTitle.poster_path!,
              popularity: bestTitle.popularity || 0
            });
          }
        }

        // Sort by popularity so most recognizable genres appear first
        genreTitles.sort((a, b) => b.popularity - a.popularity);
        setOptions(genreTitles);
      } catch (err) {
        console.error('Failed to process genre titles:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleContinue = async () => {
    const userId = localStorage.getItem('viib_user_id');
    if (userId && selectedGenres.length > 0) {
      try {
        await supabase.from('user_vibe_preferences').upsert({
          user_id: userId,
          vibe_type: selectedGenres.join(',')
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('Failed to save taste preferences:', err);
      }
    }
    onContinue(selectedGenres);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-16 relative overflow-hidden bg-black">
      <BackButton onClick={onBack} />
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40"
            style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
            animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[80px] opacity-30"
            style={{ background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)" }}
            animate={{ x: [0, -80, 0], y: [0, 40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <FloatingParticles />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-6xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            className="text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">What speaks to you?</span>
            </h2>
            <p className="text-muted-foreground text-base">
              Pick at least 2 genres that capture your attention
            </p>
          </motion.div>

          {/* Poster Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-3xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No titles available. Please try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {options.map((option, index) => {
                const isSelected = selectedGenres.includes(option.genre_id);
                const posterUrl = `${TMDB_IMAGE_BASE}${option.poster_path}`;
                
                return (
                  <motion.div
                    key={option.genre_id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 100
                    }}
                    className="relative group"
                  >
                    <motion.button
                      onClick={() => toggleGenre(option.genre_id)}
                      whileHover={{ scale: 1.05, y: -10 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative w-full aspect-[2/3] rounded-3xl overflow-hidden"
                    >
                      <img
                        src={posterUrl}
                        alt={option.genre_name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      <AnimatePresence>
                        {isSelected && (
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-2xl"
                            >
                              <Check className="w-6 h-6 text-black" />
                            </motion.div>
                            
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 ring-4 ring-white rounded-3xl"
                            />
                          </>
                        )}
                      </AnimatePresence>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-0.5 text-white">
                        <p className="text-base font-bold">{option.genre_name}</p>
                        <p className="text-xs text-white/70 truncate">{option.title_name}</p>
                      </div>
                      
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Action */}
          <motion.div
            className="flex justify-center pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleContinue}
              disabled={selectedGenres.length < 2}
              size="2xl"
              variant="gradient"
              className="group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              {selectedGenres.length < 2 
                ? `Select ${2 - selectedGenres.length} more to continue`
                : `Continue with ${selectedGenres.length} selections`
              }
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
