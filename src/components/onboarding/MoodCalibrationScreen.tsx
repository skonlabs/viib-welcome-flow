import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial, Html } from "@react-three/drei";
import * as THREE from "three";

interface MoodCalibrationScreenProps {
  onContinue: (mood: { energy: number; positivity: number }) => void;
  onBack: () => void;
  initialEnergy?: number;
  initialPositivity?: number;
}

export const MoodCalibrationScreen = ({ 
  onContinue, 
  onBack, 
  initialEnergy = 0.5, 
  initialPositivity = 50 
}: MoodCalibrationScreenProps) => {
  const [energy, setEnergy] = useState([initialEnergy]);
  const [positivity, setPositivity] = useState([initialPositivity]);
  const [convertedEmotion, setConvertedEmotion] = useState<{
    label: string;
    emoji: string;
    color: string;
  } | null>(null);
  const [emotionStates, setEmotionStates] = useState<Array<{
    id: string;
    label: string;
    value: number;
    valence: number;
    arousal: number;
    intensityMultiplier: number;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch emotion states from emotion_master table with energy profiles
  useEffect(() => {
    const fetchEmotionStates = async () => {
      const { data, error } = await supabase
        .from('emotion_master')
        .select(`
          id, 
          emotion_label, 
          valence, 
          arousal,
          emotion_energy_profile (
            intensity_multiplier
          )
        `)
        .eq('category', 'user_state')
        .order('valence', { ascending: true });

      if (error) {
        console.error('Error fetching emotion states:', error);
        return;
      }

      if (data && data.length > 0) {
        // Map emotions to slider positions (0-100) based on valence
        const mapped = data.map((emotion, index) => ({
          id: emotion.id,
          label: emotion.emotion_label,
          value: Math.round((index / (data.length - 1)) * 100),
          valence: emotion.valence || 0,
          arousal: emotion.arousal || 0,
          intensityMultiplier: (emotion.emotion_energy_profile as any)?.[0]?.intensity_multiplier || 1.0
        }));
        setEmotionStates(mapped);
      }
    };

    fetchEmotionStates();
  }, []);

  // Get the closest emotion state based ONLY on positivity (mood tone slider)
  // Energy should NOT affect which base emotion is selected
  const selectedEmotion = useMemo(() => {
    if (emotionStates.length === 0) return null;
    
    // Normalize positivity to match valence scale (-1 to 1)
    const targetValence = (positivity[0] / 100) * 2 - 1; // Convert 0-100 to -1 to 1
    
    // Find emotion with closest valence
    return emotionStates.reduce((prev, curr) => {
      const prevDistance = Math.abs(prev.valence - targetValence);
      const currDistance = Math.abs(curr.valence - targetValence);
      return currDistance < prevDistance ? curr : prev;
    });
  }, [positivity, emotionStates]);

  // Update local state when initial values change (e.g., when navigating back)
  useEffect(() => {
    setEnergy([initialEnergy]);
  }, [initialEnergy]);

  useEffect(() => {
    setPositivity([initialPositivity]);
  }, [initialPositivity]);

  // Update top display using DB functions when mood tone or energy changes
  useEffect(() => {
    const updateDisplayEmotion = async () => {
      if (!selectedEmotion) return;
      
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) return;

      try {
        // Convert energy from 0-1 to 0-100 for the RPC function
        const energyPercentage = energy[0] * 100;
        
        // Call translate_mood_to_emotion to store the emotion state
        await supabase.rpc('translate_mood_to_emotion', {
          p_user_id: userId,
          p_mood_text: selectedEmotion.label,
          p_energy_percentage: energyPercentage
        });

        // Get the display phrase from the database
        const { data: displayPhrase, error } = await supabase.rpc('get_display_emotion_phrase', {
          p_user_id: userId
        });

        if (error) {
          console.error('Error getting display phrase:', error);
          return;
        }

        setConvertedEmotion({
          label: displayPhrase || 'Emotionally Balanced',
          emoji: getEmotionEmoji(selectedEmotion.label),
          color: getEmotionColor(selectedEmotion.valence)
        });
      } catch (error) {
        console.error('Error updating display emotion:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      updateDisplayEmotion();
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [selectedEmotion, energy]);

  // Helper function to get emoji based on emotion label
  const getEmotionEmoji = (label: string): string => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('excited') || lowerLabel.includes('joy')) return '🎉';
    if (lowerLabel.includes('happy')) return '😊';
    if (lowerLabel.includes('calm') || lowerLabel.includes('peaceful')) return '😌';
    if (lowerLabel.includes('sad')) return '😢';
    if (lowerLabel.includes('anxious') || lowerLabel.includes('stress')) return '😰';
    if (lowerLabel.includes('angry')) return '😠';
    if (lowerLabel.includes('bored')) return '😑';
    if (lowerLabel.includes('lonely')) return '😔';
    if (lowerLabel.includes('hopeful')) return '✨';
    return '😌'; // default
  };

  // Helper function to get color based on valence
  const getEmotionColor = (valence: number): string => {
    if (valence > 0.5) return '#10b981'; // positive - green
    if (valence < -0.5) return '#3b82f6'; // negative - blue
    return '#06b6d4'; // neutral - cyan
  };

  // 3D Emotion Sphere Component
  const EmotionSphere = ({ emotion, energy }: { emotion: any; energy: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
      if (meshRef.current && groupRef.current) {
        meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
        groupRef.current.position.y = Math.sin(state.clock.getElapsedTime()) * 0.1;
      }
    });

    const color = emotion ? getEmotionColor(emotion.valence) : '#a855f7';
    const scale = 1 + energy * 0.5;

    return (
      <group ref={groupRef}>
        <Sphere ref={meshRef} args={[1.5, 64, 64]} scale={scale}>
          <MeshDistortMaterial
            color={color}
            attach="material"
            distort={0.3 + energy * 0.3}
            speed={2 + energy * 2}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
        {emotion && (
          <Html center>
            <div className="pointer-events-none">
              <div className="text-6xl animate-pulse">{getEmotionEmoji(emotion.label)}</div>
            </div>
          </Html>
        )}
      </group>
    );
  };

  // Floating Emotion Orbs Component
  const FloatingEmotionOrb = ({ 
    emotion, 
    position, 
    isSelected, 
    onClick 
  }: { 
    emotion: any; 
    position: [number, number, number]; 
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
      if (meshRef.current) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() + position[0]) * 0.2;
      }
    });

    return (
      <mesh
        ref={meshRef}
        position={position}
        onClick={onClick}
        scale={isSelected ? 1.2 : 0.8}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={getEmotionColor(emotion.valence)}
          emissive={getEmotionColor(emotion.valence)}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          metalness={0.8}
          roughness={0.2}
        />
        <Html center distanceFactor={8}>
          <div 
            className="pointer-events-none text-white text-xs font-semibold whitespace-nowrap bg-black/50 px-2 py-1 rounded"
            style={{ transform: 'translateY(-30px)' }}
          >
            {emotion.label}
          </div>
        </Html>
      </mesh>
    );
  };

  const mood = useMemo(() => {
    if (!selectedEmotion) {
      return { label: "Loading...", emoji: "⏳", color: "#a855f7" };
    }
    
    const emotionLabel = selectedEmotion.label;
    const emotionId = selectedEmotion.id;
    
    // Display the converted emotion based on both valence and arousal
    return { 
      label: emotionLabel,
      emoji: getEmotionEmoji(emotionLabel),
      color: getEmotionColor(selectedEmotion.valence),
      emotionId: emotionId
    };
  }, [selectedEmotion]);

  const handleTuneMood = async () => {
    if (!selectedEmotion) {
      toast({
        title: "Error",
        description: "Please select a mood",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const userId = localStorage.getItem('viib_user_id');
      if (!userId) {
        toast({
          title: "Error",
          description: "User not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Convert energy from 0-1 to 0-100 for the RPC function
      const energyPercentage = energy[0] * 100;
      
      // Call translate_mood_to_emotion which converts mood text + energy to correct emotion and stores it
      const { error } = await supabase.rpc('translate_mood_to_emotion', {
        p_user_id: userId,
        p_mood_text: selectedEmotion.label,
        p_energy_percentage: energyPercentage
      });

      if (error) {
        console.error('Error translating mood:', error);
        toast({
          title: "Error",
          description: "Failed to save your mood. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Proceed to next step
      onContinue({ energy: energy[0], positivity: positivity[0] });
    } catch (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-black">
      <BackButton onClick={onBack} />
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{
              background: `radial-gradient(circle, ${convertedEmotion?.color || mood.color}80 0%, transparent 70%)`
            }}
            animate={{
              x: [0, 120, 0],
              y: [0, -60, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>

      <FloatingParticles />

      {/* Content Container */}
      <motion.div
        className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header */}
        <motion.div
          className="text-center space-y-2 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-gradient">Navigate Your Emotions</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Rotate the sphere • Click emotion orbs • Drag to adjust energy
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* 3D Interactive Canvas */}
          <motion.div
            className="relative h-[400px] lg:h-[500px] rounded-3xl overflow-hidden glass-card border border-white/10"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
              
              {/* Central Emotion Sphere */}
              <EmotionSphere emotion={selectedEmotion} energy={energy[0]} />
              
              {/* Floating Emotion Orbs in Circle */}
              {emotionStates.map((state, index) => {
                const angle = (index / emotionStates.length) * Math.PI * 2;
                const radius = 4;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const y = (state.valence) * 2; // Vertical position based on valence
                
                return (
                  <FloatingEmotionOrb
                    key={state.id}
                    emotion={state}
                    position={[x, y, z]}
                    isSelected={selectedEmotion?.id === state.id}
                    onClick={() => {
                      const targetPositivity = Math.round(((state.valence + 1) / 2) * 100);
                      setPositivity([targetPositivity]);
                    }}
                  />
                );
              })}
              
              <OrbitControls 
                enableZoom={false} 
                enablePan={false}
                autoRotate
                autoRotateSpeed={0.5}
              />
            </Canvas>

            {/* Instructions Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
              <div className="glass-card px-3 py-2 rounded-xl text-xs text-white/80">
                <p className="font-semibold mb-1">🎮 Controls</p>
                <p>• Drag to rotate</p>
                <p>• Click orbs to select mood</p>
              </div>
              {selectedEmotion && (
                <motion.div 
                  className="glass-card px-4 py-2 rounded-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={selectedEmotion.id}
                >
                  <p className="text-xs text-white/60 uppercase tracking-wider">Selected</p>
                  <p className="text-lg font-bold" style={{ color: getEmotionColor(selectedEmotion.valence) }}>
                    {selectedEmotion.label}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Right Panel - Emotion Info & Energy Control */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            {/* Current Emotion Display */}
            <div className="glass-card rounded-3xl p-8 border border-white/10 text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3">
                Current Emotional State
              </p>
              <motion.div
                key={convertedEmotion?.label || mood.label}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="space-y-3"
              >
                <div className="text-7xl">
                  {convertedEmotion?.emoji || mood.emoji}
                </div>
                <h3 
                  className="text-3xl font-bold"
                  style={{ color: convertedEmotion?.color || mood.color }}
                >
                  {convertedEmotion?.label || mood.label}
                </h3>
              </motion.div>
            </div>

            {/* Energy Intensity Control */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">💤 Low</span>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Energy Intensity</p>
                  <motion.p 
                    className="text-2xl font-bold"
                    style={{ color: convertedEmotion?.color || mood.color }}
                    key={energy[0]}
                    animate={{ scale: [1.2, 1] }}
                  >
                    {Math.round(energy[0] * 100)}%
                  </motion.p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">High ⚡</span>
              </div>

              {/* Visual Energy Bars */}
              <div className="flex gap-1 h-20 items-end">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-lg cursor-pointer"
                    style={{
                      background: i < energy[0] * 10 
                        ? `linear-gradient(to top, ${convertedEmotion?.color || mood.color}40, ${convertedEmotion?.color || mood.color})` 
                        : 'rgba(255,255,255,0.05)',
                      height: `${((i + 1) / 10) * 100}%`,
                    }}
                    onClick={() => setEnergy([(i + 1) / 10])}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      boxShadow: i < energy[0] * 10 
                        ? `0 0 10px ${convertedEmotion?.color || mood.color}80` 
                        : 'none'
                    }}
                  />
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Tap bars or use slider below to adjust intensity
              </p>

              {/* Energy Slider (hidden but functional) */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={energy[0]}
                onChange={(e) => setEnergy([parseFloat(e.target.value)])}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${convertedEmotion?.color || mood.color} 0%, ${convertedEmotion?.color || mood.color} ${energy[0] * 100}%, rgba(255,255,255,0.1) ${energy[0] * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleTuneMood}
              disabled={isSaving || !selectedEmotion}
              size="2xl"
              variant="gradient"
              className="w-full group shadow-[0_20px_50px_-15px_rgba(168,85,247,0.6)] hover:shadow-[0_25px_60px_-15px_rgba(168,85,247,0.8)] transition-all"
            >
              {isSaving ? "Saving Your Vibe..." : "Lock In My Vibe"}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
