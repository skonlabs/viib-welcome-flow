import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { BackButton } from "./BackButton";

interface VisualTasteScreenProps {
  onContinue: (selections: string[]) => void;
  onBack: () => void;
}

export const VisualTasteScreen = ({ onContinue, onBack }: VisualTasteScreenProps) => {
  const [selectedPosters, setSelectedPosters] = useState<string[]>([]);

  const posters = [
    { id: "1", title: "Epic Sci-Fi", mood: "Expansive Worlds", gradient: "from-blue-600 via-indigo-700 to-purple-800", image: "🚀" },
    { id: "2", title: "Intimate Drama", mood: "Deep Emotions", gradient: "from-rose-600 via-pink-700 to-red-800", image: "❤️" },
    { id: "3", title: "Mystery Thriller", mood: "Edge of Seat", gradient: "from-slate-700 via-gray-800 to-zinc-900", image: "🔍" },
    { id: "4", title: "Feel-Good Comedy", mood: "Pure Joy", gradient: "from-amber-500 via-orange-600 to-yellow-600", image: "😄" },
    { id: "5", title: "Nature Documentary", mood: "Awe & Wonder", gradient: "from-emerald-600 via-teal-700 to-cyan-800", image: "🌿" },
    { id: "6", title: "Historical Epic", mood: "Grand Scale", gradient: "from-amber-700 via-brown-800 to-stone-900", image: "⚔️" },
  ];

  const togglePoster = (posterId: string) => {
    setSelectedPosters((prev) =>
      prev.includes(posterId)
        ? prev.filter((id) => id !== posterId)
        : [...prev, posterId]
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-6xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-12">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="text-gradient">What speaks to you?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Pick at least 2 visual styles that capture your attention
            </p>
          </motion.div>

          {/* Poster Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {posters.map((poster, index) => {
              const isSelected = selectedPosters.includes(poster.id);
              
              return (
                <motion.div
                  key={poster.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.08,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="relative group"
                >
                  <motion.button
                    onClick={() => togglePoster(poster.id)}
                    whileHover={{ scale: 1.05, y: -10 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-full aspect-[2/3] rounded-3xl overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${poster.gradient} transition-all duration-300`} />
                    
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
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-white">
                      <motion.span 
                        className="text-6xl"
                        animate={{
                          scale: isSelected ? [1, 1.2, 1] : 1,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {poster.image}
                      </motion.span>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1 text-white">
                      <p className="text-lg font-bold">
                        {poster.title}
                      </p>
                      <p className="text-sm text-white/70">
                        {poster.mood}
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

          {/* Action */}
          <motion.div
            className="flex justify-center pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => onContinue(selectedPosters)}
              disabled={selectedPosters.length < 2}
              size="2xl"
              variant="gradient"
              className="group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              {selectedPosters.length < 2 
                ? `Select ${2 - selectedPosters.length} more to continue`
                : `Continue with ${selectedPosters.length} selections`
              }
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
