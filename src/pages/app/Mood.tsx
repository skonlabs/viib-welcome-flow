import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodCalibrationScreen } from '@/components/onboarding/MoodCalibrationScreen';
import { toast } from 'sonner';

const Mood = () => {
  const navigate = useNavigate();
  const [key, setKey] = useState(0);

  const handleMoodSaved = () => {
    toast.success('Your mood has been updated!');
    // Refresh the component to show the updated mood
    setKey(prev => prev + 1);
    // Navigate to home to see updated recommendations
    navigate('/app/home');
  };

  return (
    <div className="min-h-screen">
      <MoodCalibrationScreen
        key={key}
        onContinue={handleMoodSaved}
        onBack={() => navigate('/app/home')}
      />
    </div>
  );
};

export default Mood;
