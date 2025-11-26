import { useMemo } from "react";
import { motion } from "framer-motion";

interface FloatingParticlesProps {
  count?: number;
}

export const FloatingParticles = ({ count = 50 }: FloatingParticlesProps) => {
  // Generate stable particle data that won't change on re-render
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 3 + 3, // 3-6 seconds
      delay: Math.random() * 3,
      yOffset: Math.random() * 40 + 20, // 20-60px
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-white/60 rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: [-particle.yOffset, 0, -particle.yOffset],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
