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
    { id: "1", title: "Sci-Fi Epic", gradient: "from-blue-500 to-purple-600" },
    { id: "2", title: "Romantic Drama", gradient: "from-pink-400 to-rose-600" },
    { id: "3", title: "Thriller", gradient: "from-gray-700 to-gray-900" },
    { id: "4", title: "Comedy", gradient: "from-yellow-400 to-orange-500" },
    { id: "5", title: "Documentary", gradient: "from-green-500 to-teal-600" },
  ];

  const togglePoster = (posterId: string) => {
    setSelectedPosters((prev) =>
      prev.includes(posterId)
        ? prev.filter((id) => id !== posterId)
        : [...prev, posterId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-focus animate-gradient" />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="glass-card rounded-3xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-light text-foreground">
              Which of these feel like your kind of watch?
            </h2>
            <p className="text-sm text-muted-foreground">
              Select at least 2
            </p>
          </div>

          {/* Poster Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {posters.map((poster, index) => (
              <motion.div
                key={poster.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -10 }}
                className="relative"
              >
                <button
                  onClick={() => togglePoster(poster.id)}
                  className={`relative w-full aspect-[2/3] rounded-2xl bg-gradient-to-br ${poster.gradient} overflow-hidden transition-all duration-300 ${
                    selectedPosters.includes(poster.id)
                      ? "ring-4 ring-primary glow-primary scale-105"
                      : "hover:scale-105"
                  }`}
                >
                  {selectedPosters.includes(poster.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 bg-primary rounded-full p-2"
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-sm font-light text-white">
                      {poster.title}
                    </p>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Continue Button */}
          <Button
            onClick={() => onContinue(selectedPosters)}
            disabled={selectedPosters.length < 2}
            className="w-full h-14 text-lg font-light bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02]"
          >
            Continue ({selectedPosters.length}/5)
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
