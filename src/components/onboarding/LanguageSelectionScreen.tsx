import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface LanguageSelectionScreenProps {
  onContinue: (languages: string[]) => void;
  onBack: () => void;
  initialLanguages?: string[];
}

// Map language codes to flag emojis
const languageFlags: Record<string, string> = {
  "en": "🇺🇸",
  "es": "🇪🇸",
  "fr": "🇫🇷",
  "de": "🇩🇪",
  "it": "🇮🇹",
  "pt": "🇵🇹",
  "ja": "🇯🇵",
  "ko": "🇰🇷",
  "zh": "🇨🇳",
  "hi": "🇮🇳",
  "ar": "🇸🇦",
  "ru": "🇷🇺",
  "tr": "🇹🇷",
  "nl": "🇳🇱",
  "sv": "🇸🇪",
};

export const LanguageSelectionScreen = ({ onContinue, onBack, initialLanguages = [] }: LanguageSelectionScreenProps) => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialLanguages);
  const [languages, setLanguages] = useState<Array<{ code: string; name: string; flag: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Update state when props change (when navigating back)
  useEffect(() => {
    setSelectedLanguages(initialLanguages);
  }, [initialLanguages]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const { data, error } = await supabase
          .from('language_master')
          .select('language_code, language_name')
          .order('language_name');

        if (error) throw error;

        const mappedLanguages = data.map(lang => ({
          code: lang.language_code,
          name: lang.language_name,
          flag: languageFlags[lang.language_code] || "🌐"
        }));

        setLanguages(mappedLanguages);
      } catch (error) {
        console.error('Error fetching languages:', error);
        toast({
          title: "Error loading languages",
          description: "Please refresh the page to try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, [toast]);

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
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
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-10">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">Languages you love</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Select all languages you enjoy watching content in
            </p>
          </motion.div>

          {/* Language Grid */}
          <motion.div
            className="grid grid-cols-3 gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isLoading ? (
              // Loading skeleton
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl glass-subtle animate-pulse"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 bg-white/10 rounded-full" />
                    <div className="w-16 h-3 bg-white/10 rounded" />
                  </div>
                </div>
              ))
            ) : (
              languages.map((lang, index) => {
                const isSelected = selectedLanguages.includes(lang.code);
                const priority = selectedLanguages.indexOf(lang.code) + 1;

                return (
                  <motion.button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03, type: "spring" }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-3 rounded-xl transition-all duration-300 ${
                      isSelected
                        ? "bg-white/10 ring-2 ring-primary shadow-lg shadow-primary/20"
                        : "glass-subtle hover:bg-white/5"
                    }`}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs font-bold"
                        >
                          {priority}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="text-foreground font-medium text-sm">
                        {lang.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })
            )}
          </motion.div>

          {/* Priority Hint */}
          {selectedLanguages.length > 1 && (
            <motion.p
              className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GripVertical className="w-3 h-3" />
              Numbers show your priority order
            </motion.p>
          )}

          {/* Actions */}
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => onContinue(selectedLanguages)}
              disabled={selectedLanguages.length === 0}
              size="2xl"
              variant="gradient"
              className="shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              Continue with {selectedLanguages.length} {selectedLanguages.length === 1 ? "language" : "languages"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
