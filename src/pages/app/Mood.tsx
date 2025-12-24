import { useNavigate } from 'react-router-dom';
import { MoodMap } from '@/components/mood/MoodMap';
import { toast } from 'sonner';

const Mood = () => {
  const navigate = useNavigate();

  const handleMoodSaved = () => {
    toast.success('Your mood has been updated!');
    navigate('/app/home');
  };

  return (
    <MoodMap
      onMoodSaved={handleMoodSaved}
      onBack={() => navigate('/app/home')}
    />
  );
};

export default Mood;
