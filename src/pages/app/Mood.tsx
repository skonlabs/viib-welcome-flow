import { useNavigate } from 'react-router-dom';
import { MoodMap } from '@/components/mood/MoodMap';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from '@/icons';

const Mood = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  const handleMoodSaved = () => {
    toast.success('Your mood has been updated!');
    navigate('/app/home');
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-accent/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no profile (should be handled by protected route but just in case)
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-accent/10">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <h2 className="text-xl font-semibold">Please log in</h2>
          <p className="text-muted-foreground">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <MoodMap
      userId={profile.id}
      onMoodSaved={handleMoodSaved}
      onBack={() => navigate('/app/home')}
    />
  );
};

export default Mood;
