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
        // Get all genres first
        const { data: genres, error: genreError } = await supabase
          .from('genres')
          .select('id, genre_name')
          .order('genre_name');

        if (genreError) throw genreError;

        // Track used title IDs to ensure uniqueness across genres
        const usedTitleIds = new Set<string>();
        const genreTitles: GenreTitleOption[] = [];

        for (const genre of genres || []) {
          // Get multiple titles per genre so we can find an unused one
          const { data: titleGenres, error: titleError } = await supabase
            .from('title_genres')
            .select('genre_id, title_id')
            .eq('genre_id', genre.id);

          if (titleError || !titleGenres || titleGenres.length === 0) continue;

          // Get the title details for this genre's titles
          const titleIds = titleGenres.map(tg => tg.title_id);
          
          const { data: titles, error: titlesError } = await supabase
            .from('titles')
            .select('id, name, poster_path, popularity')
            .in('id', titleIds)
            .not('poster_path', 'is', null)
            .order('popularity', { ascending: false })
            .limit(10);

          if (titlesError || !titles) continue;

          // Find the first title that hasn't been used yet
          const uniqueTitle = titles.find(t => !usedTitleIds.has(t.id));
          
          if (uniqueTitle) {
            usedTitleIds.add(uniqueTitle.id);
            genreTitles.push({
              genre_id: genre.id,
              genre_name: genre.genre_name,
              title_id: uniqueTitle.id,
              title_name: uniqueTitle.name || 'Unknown',
              poster_path: uniqueTitle.poster_path!,
            });
          }
        }

        setOptions(genreTitles);
      } catch (err) {
        console.error('Failed to load genre titles:', err);
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
    // Save visual taste preferences to database
    const userId = localStorage.getItem('viib_user_id');
    if (userId && selectedGenres.length > 0) {
      try {
        // Store as user preferences (can be used for recommendations)
        await supabase.from('user_vibe_preferences').upsert({
          user_id: userId,
          vibe_type: selectedGenres.join(',')
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('Failed to save visual taste:', err);
      }
    }
    onContinue(selectedGenres);
  };

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
        className="relative z-10 w-full max-w-6xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-8">
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
                      {/* Background: Poster */}
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
                        <p className="text-base font-bold">
                          {option.genre_name}
                        </p>
                        <p className="text-xs text-white/70 truncate">
                          {option.title_name}
                        </p>
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