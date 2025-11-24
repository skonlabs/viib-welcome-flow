import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Info } from "lucide-react";

interface RecommendationRevealScreenProps {
  userName: string;
  onContinue: () => void;
}

export const RecommendationRevealScreen = ({ userName, onContinue }: RecommendationRevealScreenProps) => {
  const recommendations = [
    {
      title: "Cosmic Odyssey",
      reason: "Matches your love for expansive sci-fi",
      mood: "🚀 Adventurous",
    },
    {
      title: "Midnight Tales",
      reason: "Perfect for your contemplative vibe",
      mood: "🌙 Reflective",
    },
    {
      title: "The Last Symphony",
      reason: "Emotional depth you appreciate",
      mood: "❤️ Moving",
    },
  ];

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
        className="relative z-10 w-full max-w-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-10">
          {/* Header */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-16 h-16 mx-auto text-gradient" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold text-gradient">
              {userName}, your ViiB is ready
            </h2>
            <p className="text-xl text-muted-foreground">
              Here's what we picked for how you feel today
            </p>
          </motion.div>

          {/* Recommendations */}
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.15, type: "spring" }}
                whileHover={{ scale: 1.02, x: 10 }}
                className="glass-card rounded-3xl p-6 cursor-pointer group"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-24 h-36 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-4xl">
                    {rec.mood.split(" ")[0]}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-gradient transition-all">
                      {rec.title}
                    </h3>
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Why this?</span> {rec.reason}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                      <span className="text-sm text-muted-foreground">{rec.mood}</span>
                    </div>
                  </div>
                  <motion.div
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            className="flex justify-center pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={onContinue}
              size="lg"
              className="px-12 h-14 text-lg font-medium bg-gradient-to-r from-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            >
              Explore All Recommendations
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
