import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { supabase } from "@/integrations/supabase/client";

interface TitleOption {
  id: string;
  name: string;
  poster_path: string;
}

interface VisualTasteScreenProps {
  onContinue: (selections: string[]) => void;
  onBack: () => void;
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export const VisualTasteScreen = ({ onContinue, onBack }: VisualTasteScreenProps) => {
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTitles = async () => {
      try {
        const userId = localStorage.getItem('viib_user_id');
        
        // Try to get recommendations if user has preferences set up
        if (userId) {
          const { data: recData, error: recError } = await supabase
            .rpc('get_top_recommendations_v2', {
              p_user_id: userId,
              p_limit: 12
            });

          if (!recError && recData && recData.length > 0) {
            // Get title details for recommendations
            const titleIds = recData.map((r: any) => r.title_id);
            const { data: titleDetails, error: titleError } = await supabase
              .from('titles')
              .select('id, name, poster_path')
              .in('id', titleIds)
              .not('poster_path', 'is', null);

            if (!titleError && titleDetails && titleDetails.length > 0) {
              setTitles(titleDetails.map(t => ({
                id: t.id,
                name: t.name || 'Unknown',
                poster_path: t.poster_path!
              })));
              setLoading(false);
              return;
            }
          }
        }

        // Fallback: Get popular titles with posters
        const { data, error } = await supabase
          .from('titles')
          .select('id, name, poster_path')
          .not('poster_path', 'is', null)
          .not('name', 'is', null)
          .order('popularity', { ascending: false })
          .limit(12);

        if (error) throw error;

        if (data) {
          setTitles(data.map(t => ({
            id: t.id,
            name: t.name || 'Unknown',
            poster_path: t.poster_path!
          })));
        }
      } catch (err) {
        console.error('Failed to load titles:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTitles();
  }, []);

  const toggleTitle = (titleId: string) => {
    setSelectedTitles((prev) =>
      prev.includes(titleId)
        ? prev.filter((id) => id !== titleId)
        : [...prev, titleId]
    );
  };

  const handleContinue = async () => {
    // Save selected titles as initial taste preferences
    const userId = localStorage.getItem('viib_user_id');
    if (userId && selectedTitles.length > 0) {
      try {
        // Add selected titles to watchlist as "wishlisted"
        const interactions = selectedTitles.map(titleId => ({
          user_id: userId,
          title_id: titleId,
          interaction_type: 'wishlisted' as const
        }));
        
        await supabase.from('user_title_interactions').upsert(interactions, {
          onConflict: 'user_id,title_id'
        });
      } catch (err) {
        console.error('Failed to save taste preferences:', err);
      }
    }
    onContinue(selectedTitles);
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

      <FloatingParticles />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-5xl"
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
              <span className="text-gradient">What catches your eye?</span>
            </h2>
            <p className="text-muted-foreground text-base">
              Select titles that appeal to you
            </p>
          </motion.div>

          {/* Poster Grid */}
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {titles.map((title, index) => {
                const isSelected = selectedTitles.includes(title.id);
                const posterUrl = `${TMDB_IMAGE_BASE}${title.poster_path}`;
                
                return (
                  <motion.div
                    key={title.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 100
                    }}
                    className="relative group"
                  >
                    <motion.button
                      onClick={() => toggleTitle(title.id)}
                      whileHover={{ scale: 1.08, y: -8 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden"
                    >
                      {/* Poster */}
                      <img
                        src={posterUrl}
                        alt={title.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Selection indicator */}
                      <AnimatePresence>
                        {isSelected && (
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xl"
                            >
                              <Check className="w-5 h-5 text-black" />
                            </motion.div>
                            
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 ring-3 ring-white rounded-2xl"
                            />
                          </>
                        )}
                      </AnimatePresence>
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Title on hover */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs font-medium text-white truncate text-center">
                          {title.name}
                        </p>
                      </div>
                      
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Action */}
          <motion.div
            className="flex justify-center pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleContinue}
              disabled={selectedTitles.length < 2}
              size="2xl"
              variant="gradient"
              className="group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              {selectedTitles.length < 2 
                ? `Select ${2 - selectedTitles.length} more`
                : `Continue with ${selectedTitles.length} picks`
              }
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
