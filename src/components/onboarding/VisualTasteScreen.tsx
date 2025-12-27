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
  title_name: string;
  poster_path: string;
  score: number;
  orderIndex: number;
}

interface VisualTasteScreenProps {
  onContinue: (selections: string[]) => void;
  onBack: () => void;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// Kids content certifications to exclude
const KIDS_GENRES = ['Animation', 'Family'];

// Genres to display
const DISPLAY_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Crime', 'Documentary',
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
        // Get user's language preferences
        let languageCodes: string[] = ['en']; // Default to English

        const { data: userLanguages } = await supabase
          .from('user_language_preferences')
          .select('language_code')
          .order('priority_order', { ascending: true });

        if (userLanguages && userLanguages.length > 0) {
          languageCodes = userLanguages.map(l => l.language_code);
        }
        console.log('[VisualTaste] Languages:', languageCodes);

        // Get user's streaming subscriptions and map to TMDB provider IDs
        const { data: userStreamingSubs } = await supabase
          .from('user_streaming_subscriptions')
          .select('streaming_service_id')
          .eq('is_active', true);
        
        let tmdbProviderIds: number[] = [];
        
        if (userStreamingSubs && userStreamingSubs.length > 0) {
          const serviceIds = userStreamingSubs.map(s => s.streaming_service_id);
          
          // Get TMDB provider IDs from mapping table
          const { data: providerMappings } = await supabase
            .from('tmdb_provider_mappings')
            .select('tmdb_provider_id')
            .in('service_name', serviceIds)
            .eq('is_active', true);
          
          // If no mapping found by service_name, try fetching streaming service names first
          if (!providerMappings || providerMappings.length === 0) {
            const { data: streamingServices } = await supabase
              .from('streaming_services')
              .select('service_name')
              .in('id', serviceIds);
            
            if (streamingServices && streamingServices.length > 0) {
              const serviceNames = streamingServices.map(s => s.service_name);
              const { data: mappings } = await supabase
                .from('tmdb_provider_mappings')
                .select('tmdb_provider_id')
                .in('service_name', serviceNames)
                .eq('is_active', true);
              
              if (mappings) {
                tmdbProviderIds = mappings.map(m => m.tmdb_provider_id);
              }
            }
          } else {
            tmdbProviderIds = providerMappings.map(m => m.tmdb_provider_id);
          }
        }
        
        console.log('[VisualTaste] TMDB Provider IDs:', tmdbProviderIds);

        // Call TMDB discover edge function
        const { data, error } = await supabase.functions.invoke('discover-tmdb', {
          body: {
            languages: languageCodes,
            streamingProviderIds: tmdbProviderIds,
            minRating: 6,
            minPopularity: 10,
            limit: 200,
            excludeKids: true,
            region: 'US'
          }
        });

        if (error) {
          console.error('[VisualTaste] TMDB edge function error:', error);
          setLoading(false);
          return;
        }

        const movies = data?.movies || [];
        console.log('[VisualTaste] Got', movies.length, 'movies from TMDB');

        if (movies.length === 0) {
          console.log('[VisualTaste] No movies found');
          setLoading(false);
          return;
        }

        // Movies are already sorted by language priority from edge function
        // Add a combined score for tie-breaking within genres
        const scoredMovies = movies.map((movie: any, index: number) => ({
          ...movie,
          orderIndex: index, // Preserve original order from edge function
          combinedScore: (movie.vote_average || 0) * (movie.popularity || 0)
        }));

        // Build genre options - one movie per genre, respecting order from edge function
        const genreToTopMovie = new Map<string, GenreTitleOption>();
        const usedMovies = new Set<string>();

        for (const movie of scoredMovies) {
          const genres = movie.genres || [];
          if (!genres || genres.length === 0) continue;

          // Skip if movie is primarily kids content
          const isKidsContent = genres.some((g: string) => KIDS_GENRES.includes(g));
          if (isKidsContent && genres[0] && KIDS_GENRES.includes(genres[0])) continue;

          // Get primary genre (first in array)
          const primaryGenre = genres[0];

          // Only consider genres we want to display
          if (!DISPLAY_GENRES.includes(primaryGenre)) continue;

          // Skip if we already have a movie for this genre or this movie was used
          const movieKey = movie.name;
          if (genreToTopMovie.has(primaryGenre) || usedMovies.has(movieKey)) continue;

          if (!movie.poster_path) continue;

          genreToTopMovie.set(primaryGenre, {
            genre_id: primaryGenre.toLowerCase().replace(/\s+/g, '-'),
            genre_name: primaryGenre,
            title_name: movie.name,
            poster_path: movie.poster_path,
            score: movie.combinedScore,
            orderIndex: movie.orderIndex
          });
          usedMovies.add(movieKey);
        }

        // Convert to array - sort by order index (preserves language priority from edge function)
        const genreOptions = Array.from(genreToTopMovie.values())
          .sort((a, b) => a.orderIndex - b.orderIndex);

        console.log('[VisualTaste] Genre options:', genreOptions.length, genreOptions.map(g => `${g.genre_name}: ${g.title_name} (${g.orderIndex})`));
        setOptions(genreOptions);
      } catch (err) {
        console.error('[VisualTaste] Failed to load genre options:', err);
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
    if (selectedGenres.length > 0) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .maybeSingle();
        
        if (userData?.id) {
          await supabase.from('user_vibe_preferences').upsert({
            user_id: userData.id,
            vibe_type: selectedGenres.join(',')
          }, { onConflict: 'user_id' });
        }
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
