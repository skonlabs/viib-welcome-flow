import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Lock } from "lucide-react";
import { useEffect } from "react";
interface WelcomeScreenProps {
  onContinue: () => void;
}
export const WelcomeScreen = ({
  onContinue
}: WelcomeScreenProps) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const {
        clientX,
        clientY
      } = e;
      const {
        innerWidth,
        innerHeight
      } = window;
      mouseX.set(clientX - innerWidth / 2);
      mouseY.set(clientY - innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);
  return <div className="min-h-screen flex items-center justify-center p-4 relative bg-black">
      {/* Background container with overflow hidden */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-80" />
          <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px]" style={{
          background: "radial-gradient(circle, #a855f7 0%, transparent 70%)"
        }} animate={{
          x: [0, 100, 0],
          y: [0, -50, 0]
        }} transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }} />
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => <motion.div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`
      }} animate={{
        y: [0, -30, 0],
        opacity: [0, 1, 0]
      }} transition={{
        duration: Math.random() * 3 + 2,
        repeat: Infinity,
        delay: Math.random() * 2
      }} />)}
      </div>

      {/* Main Content */}
      <motion.div className="relative z-10 text-center max-w-4xl mx-auto overflow-visible" style={{
      rotateX,
      rotateY,
      transformStyle: "preserve-3d"
    }}>
        <motion.div className="space-y-8 overflow-visible" initial={{
        opacity: 0,
        y: 40
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 1,
        ease: "easeOut"
      }}>
          {/* Logo with Glow Effect */}
          <motion.div className="relative inline-block px-20 w-auto overflow-visible" initial={{
          scale: 0.8,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          delay: 0.3,
          duration: 1,
          type: "spring"
        }}>
            <motion.div className="absolute -inset-12 rounded-full blur-3xl opacity-50" style={{
            background: "radial-gradient(circle, #a855f7 0%, #ec4899 50%, transparent 70%)"
          }} animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5]
          }} transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }} />
            <h1 className="relative text-8xl md:text-9xl font-bold tracking-tighter leading-none py-4 whitespace-nowrap">
              <span className="text-gradient inline-block">ViiB</span>
            </h1>
          </motion.div>

          {/* Tagline */}
          <motion.div className="space-y-6 max-w-2xl mx-auto" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.6,
          duration: 0.8
        }}>
            <h2 className="text-3xl md:text-4xl font-light text-foreground/90">
              Where emotion meets entertainment
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Experience the future of content discovery. ViiB understands your vibe, your mood, and delivers the perfect watch— every single time.
            </p>
          </motion.div>

          {/* Badges */}
          <motion.div className="flex items-center justify-center gap-8 text-sm text-muted-foreground" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.9,
          duration: 0.8
        }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              AI-Powered
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Personalized
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Intuitive
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 1.1,
          duration: 0.8
        }} className="pt-6">
            <Button onClick={onContinue} size="lg" className="group relative px-12 h-16 text-lg font-medium overflow-hidden bg-gradient-to-r from-primary via-accent to-secondary hover:shadow-2xl hover:shadow-primary/50 transition-all duration-500 hover:scale-105">
              <span className="relative z-10 flex items-center gap-3">
                <Sparkles className="w-5 h-5" />
                Begin the Experience
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
              <motion.div className="absolute inset-0 bg-gradient-to-r from-secondary via-accent to-primary" initial={{
              x: "100%"
            }} whileHover={{
              x: 0
            }} transition={{
              duration: 0.5
            }} />
            </Button>
          </motion.div>

          {/* Privacy Note */}
          <motion.div className="flex items-center justify-center gap-2 pt-1" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 1.3,
          duration: 0.8
        }}>
            <Lock className="w-3 h-3 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground/60">
              Private by design · No noise · Only what matters
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>;
};