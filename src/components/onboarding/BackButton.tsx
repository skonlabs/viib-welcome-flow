import { ArrowLeft } from "@/icons";
import { motion } from "framer-motion";

interface BackButtonProps {
  onClick: () => void;
}

export const BackButton = ({ onClick }: BackButtonProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="absolute top-6 left-6 z-50 w-12 h-12 rounded-2xl backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/20 shadow-xl flex items-center justify-center transition-all duration-300 group"
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
    </motion.button>
  );
};
