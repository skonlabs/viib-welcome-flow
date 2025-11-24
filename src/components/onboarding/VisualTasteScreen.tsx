import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface VisualTasteScreenProps {
  onContinue: (selections: string[]) => void;
}

export const VisualTasteScreen = ({ onContinue }: VisualTasteScreenProps) => {
  const [selectedPosters, setSelectedPosters] = useState<string[]>([]);

  const posters = [
    { id: "1", title: "Epic Sci-Fi", mood: "Expansive", gradient: "from-blue-900 via-indigo-800 to-purple-900" },
    { id: "2", title: "Intimate Drama", mood: "Emotional", gradient: "from-rose-900 via-pink-800 to-red-900" },
    { id: "3", title: "Mystery Thriller", mood: "Tense", gradient: "from-slate-900 via-gray-800 to-zinc-900" },
    { id: "4", title: "Feel-Good Comedy", mood: "Uplifting", gradient: "from-amber-700 via-orange-600 to-yellow-700" },
    { id: "5", title: "Nature Documentary", mood: "Inspiring", gradient: "from-emerald-900 via-teal-800 to-cyan-900" },
    { id: "6", title: "Historical Epic", mood: "Grand", gradient: "from-amber-900 via-brown-800 to-stone-900" },
  ];

  const togglePoster = (posterId: string) => {
    setSelectedPosters((prev) =>
      prev.includes(posterId)
        ? prev.filter((id) => id !== posterId)
        : [...prev, posterId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-aurora" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="space-y-10">
          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-light text-foreground">
              What draws you in?
            </h2>
            <p className="text-sm text-muted-foreground">
              Select at least 2 visual styles that appeal to you
            </p>
          </div>

          {/* Poster Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {posters.map((poster, index) => (
              <motion.div
                key={poster.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="relative"
              >
                <button
                  onClick={() => togglePoster(poster.id)}
                  className={`relative w-full aspect-[2/3] rounded-2xl bg-gradient-to-br ${poster.gradient} overflow-hidden transition-all duration-300 group ${
                    selectedPosters.includes(poster.id)
                      ? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]"
                      : "hover:scale-[1.02]"
                  }`}
                >
                  {/* Selected Indicator */}
                  {selectedPosters.includes(poster.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-5 h-5 text-background" />
                    </motion.div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
                    <p className="text-sm font-normal text-white">
                      {poster.title}
                    </p>
                    <p className="text-xs text-white/60">
                      {poster.mood}
                    </p>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Action */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => onContinue(selectedPosters)}
              disabled={selectedPosters.length < 2}
              size="lg"
              className="px-10 h-12 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              {selectedPosters.length < 2 
                ? `Select ${2 - selectedPosters.length} more`
                : `Continue with ${selectedPosters.length} selections`
              }
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
