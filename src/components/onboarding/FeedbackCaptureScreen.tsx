import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Meh, ArrowRight } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";

interface FeedbackCaptureScreenProps {
  onContinue: (feedback: string) => void;
  onBack: () => void;
}

export const FeedbackCaptureScreen = ({ onContinue, onBack }: FeedbackCaptureScreenProps) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string>("");

  const feedbackOptions = [
    { id: "love", label: "Love it", icon: "😍", color: "from-green-500 to-emerald-600" },
    { id: "like", label: "Like it", icon: "👍", color: "from-blue-500 to-cyan-600" },
    { id: "ok", label: "It's okay", icon: "😐", color: "from-yellow-500 to-orange-600" },
    { id: "notforme", label: "Not for me", icon: "👎", color: "from-red-500 to-pink-600" },
  ];

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
        <div className="space-y-12">
          {/* Header */}
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">How did this feel?</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Your feedback helps ViiB learn your taste
            </p>
          </motion.div>

          {/* Feedback Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {feedbackOptions.map((option, index) => (
              <motion.button
                key={option.id}
                onClick={() => setSelectedFeedback(option.id)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                whileHover={{ scale: 1.1, y: -8 }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
              >
                <div
                  className={`relative p-8 rounded-3xl transition-all duration-300 ${
                    selectedFeedback === option.id
                      ? "ring-4 ring-white shadow-2xl"
                      : "ring-1 ring-white/10"
                  }`}
                >
                  <div
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${option.color} ${
                      selectedFeedback === option.id ? "opacity-80" : "opacity-40 group-hover:opacity-60"
                    } transition-opacity`}
                  />

                  {selectedFeedback === option.id && (
                    <motion.div
                      className="absolute inset-0 bg-white/20 rounded-3xl"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}

                  <div className="relative flex flex-col items-center gap-3">
                    <motion.span
                      className="text-5xl"
                      animate={
                        selectedFeedback === option.id
                          ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
                          : {}
                      }
                      transition={{ duration: 0.5 }}
                    >
                      {option.icon}
                    </motion.span>
                    <span className="text-white font-semibold text-sm">
                      {option.label}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Emoji Slider Trail Effect */}
          {selectedFeedback && (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="glass-card rounded-2xl px-8 py-4">
                <p className="text-muted-foreground">
                  ViiB is learning your preferences...
                </p>
              </div>
            </motion.div>
          )}

          {/* Continue */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={() => onContinue(selectedFeedback)}
              disabled={!selectedFeedback}
              size="2xl"
              variant="gradient"
              className="shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              Continue
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
