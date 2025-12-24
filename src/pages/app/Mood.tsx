import { useNavigate } from 'react-router-dom';
import { MoodMap } from '@/components/mood/MoodMap';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const Mood = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleMoodSaved = () => {
    toast.success('Your mood has been updated!');
    navigate('/app/home');
  };

  // User should always exist since this is a protected route
  if (!user) {
    return null;
  }

  return (
    <MoodMap
      userId={user.id}
      onMoodSaved={handleMoodSaved}
      onBack={() => navigate('/app/home')}
    />
  );
};

export default Mood;
