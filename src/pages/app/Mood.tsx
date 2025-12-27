import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { FloatingParticles } from '@/components/onboarding/FloatingParticles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from '@/icons';
import { MoodSelector } from '@/components/mood/MoodSelector';

const Mood = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <h2 className="text-xl font-semibold">Please log in</h2>
          <p className="text-muted-foreground">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  const handleMoodSaved = () => {
    navigate('/app/home');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/app/home')}
        className="absolute top-4 left-4 z-20 text-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10 opacity-40" />
        </div>
      </div>

      <FloatingParticles />

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full max-w-lg mx-auto" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-8">
          {/* Header */}
          <motion.div 
            className="text-center space-y-3" 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">How are you feeling?</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Update your mood to get personalized recommendations
            </p>
          </motion.div>

          {/* Mood Selector */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <MoodSelector
              userId={profile.id}
              onMoodSaved={handleMoodSaved}
              buttonText="Tune My Vibe"
              showBackgroundEffects
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Mood;
