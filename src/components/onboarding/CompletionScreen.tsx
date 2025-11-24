import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

interface CompletionScreenProps {
  userName: string;
  onComplete: () => void;
}

export const CompletionScreen = ({ userName, onComplete }: CompletionScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Animated Background */}
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

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: `hsl(${Math.random() * 360}, 70%, 60%)`,
              left: `${Math.random() * 100}%`,
              top: `-5%`,
            }}
            animate={{
              y: ["0vh", "110vh"],
              x: [0, (Math.random() - 0.5) * 100],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
              opacity: [1, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center space-y-12 max-w-3xl mx-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        {/* Success Animation */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <motion.div
            className="relative"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-r from-primary via-accent to-secondary opacity-60" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
              <Sparkles className="w-16 h-16 text-white" />
            </div>
          </motion.div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold">
            <span className="text-gradient">
              {userName ? `Welcome, ${userName}!` : "You're all set!"}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your personalized entertainment universe is ready to explore. 
            ViiB has learned your unique taste and is excited to surprise you.
          </p>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          className="grid grid-cols-3 gap-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {[
            { emoji: "🎯", label: "Personalized" },
            { emoji: "🧠", label: "AI-Powered" },
            { emoji: "✨", label: "Mood-Based" },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="glass-card rounded-2xl p-6"
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="text-4xl mb-2">{feature.emoji}</div>
              <p className="text-sm text-muted-foreground">{feature.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="pt-4"
        >
          <Button
            onClick={onComplete}
            size="lg"
            className="group px-16 h-16 text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110"
          >
            <Sparkles className="mr-2 w-6 h-6" />
            Start Exploring
            <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-3 transition-transform" />
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-sm text-muted-foreground/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          Get ready for an experience like no other
        </motion.p>
      </motion.div>
    </div>
  );
};
