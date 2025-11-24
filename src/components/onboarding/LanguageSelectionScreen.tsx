import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, GripVertical } from "lucide-react";

interface LanguageSelectionScreenProps {
  onContinue: (languages: string[]) => void;
}

export const LanguageSelectionScreen = ({ onContinue }: LanguageSelectionScreenProps) => {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "it", name: "Italian", flag: "🇮🇹" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
  ];

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 gradient-electric opacity-20" />
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse at 20% 30%, #a855f720 0%, transparent 50%)",
            "radial-gradient(ellipse at 80% 70%, #ec489920 0%, transparent 50%)",
            "radial-gradient(ellipse at 20% 30%, #a855f720 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

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
            <h2 className="text-4xl font-bold text-gradient">
              Languages you love
            </h2>
            <p className="text-lg text-muted-foreground">
              Select all languages you enjoy watching content in
            </p>
          </motion.div>

          {/* Language Grid */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {languages.map((lang, index) => {
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
                  className={`relative p-5 rounded-2xl transition-all duration-300 ${
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
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold"
                      >
                        {priority}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">{lang.flag}</span>
                    <span className="text-foreground font-medium">
                      {lang.name}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Priority Hint */}
          {selectedLanguages.length > 1 && (
            <motion.div
              className="glass-card rounded-2xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <GripVertical className="w-4 h-4" />
                Numbers show your priority order
              </p>
            </motion.div>
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
              size="lg"
              className="px-12 h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
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
