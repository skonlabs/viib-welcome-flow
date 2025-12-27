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

// Kids content certifications to exclude
const KIDS_CERTIFICATIONS = ['G', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'];

// Genres to display
const DISPLAY_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
];

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
        // Default to English if no preferences
        if (languageCodes.length === 0) {
          languageCodes.push('en');
        }

        // Get user's region for streaming availability
        const { data: userData } = await supabase
          .from('users')
          .select('ip_country')
          .eq('id', userId)
          .maybeSingle();

        const userRegion = userData?.ip_country || 'US';

        // Get available title IDs based on streaming services
        let availableTitleIds: Set<string> | null = null;
        
        if (streamingServiceIds.length > 0) {
          const { data: streamingTitles } = await supabase
            .from('title_streaming_availability')
            .select('title_id')
            .in('streaming_service_id', streamingServiceIds)
            .eq('region_code', userRegion);

          if (streamingTitles && streamingTitles.length > 0) {
            availableTitleIds = new Set(streamingTitles.map(t => t.title_id));
          }
        }

        // Calculate date 3 years ago
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const threeYearsAgoStr = threeYearsAgo.toISOString().split('T')[0];

        // Fetch popular movies from past 3 years in user's languages
        const { data: movies, error } = await supabase
          .from('titles')
          .select('id, name, poster_path, popularity, title_genres, certification, original_language')
          .eq('title_type', 'movie')
          .in('original_language', languageCodes)
          .not('poster_path', 'is', null)
          .not('name', 'is', null)
          .not('title_genres', 'is', null)
          .gte('release_date', threeYearsAgoStr)
          .order('popularity', { ascending: false })
          .limit(500);

        if (error) {
          console.error('Failed to load movies:', error);
          setLoading(false);
          return;
        }

        if (!movies || movies.length === 0) {
          setLoading(false);
          return;
        }

        // Filter and build genre options
        const genreToTopMovie = new Map<string, GenreTitleOption>();
        const usedMovieIds = new Set<string>();

        for (const movie of movies) {
          // Skip if not available on user's streaming services (when filter is active)
          if (availableTitleIds !== null && !availableTitleIds.has(movie.id)) {
            continue;
          }

          // Skip kids content
          if (movie.certification && KIDS_CERTIFICATIONS.includes(movie.certification)) {
            continue;
          }

          // Parse title_genres
          let genres: string[];
          try {
            genres = typeof movie.title_genres === 'string' 
              ? JSON.parse(movie.title_genres) 
              : movie.title_genres as string[];
          } catch {
            continue;
          }

          if (!genres || genres.length === 0) continue;

          // Get primary genre (first in array)
          const primaryGenre = genres[0];

          // Only consider genres we want to display
          if (!DISPLAY_GENRES.includes(primaryGenre)) continue;

          // Skip if we already have a movie for this genre or this movie was used
          if (genreToTopMovie.has(primaryGenre) || usedMovieIds.has(movie.id)) continue;

          // This is the top movie for this primary genre
          genreToTopMovie.set(primaryGenre, {
            genre_id: primaryGenre.toLowerCase().replace(/\s+/g, '-'),
            genre_name: primaryGenre,
            title_id: movie.id,
            title_name: movie.name!,
            poster_path: movie.poster_path!,
            popularity: movie.popularity || 0
          });
          usedMovieIds.add(movie.id);
        }

        // Convert to array and sort by popularity
        const genreOptions = Array.from(genreToTopMovie.values())
          .sort((a, b) => b.popularity - a.popularity);

        setOptions(genreOptions);
      } catch (err) {
        console.error('Failed to load genre options:', err);
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
              <p className="text-muted-foreground">No movies available. Please try again.</p>
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
