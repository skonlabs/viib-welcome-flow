import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { errorLogger } from '@/lib/services/LoggerService';

export const AppRedirect = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // Get user ID from storage
        const sessionData = localStorage.getItem('viib_session') || sessionStorage.getItem('viib_session');
        const userId = sessionData ? JSON.parse(sessionData).userId : localStorage.getItem('viib_user_id');

        if (!userId) {
          navigate('/login');
          return;
        }

        // Check user's onboarding and active status
        const { data: user, error } = await supabase
          .from('users')
          .select('id, onboarding_completed, is_active')
          .eq('id', userId)
          .single();

        if (error || !user) {
          await errorLogger.log(error, {
            operation: 'app_redirect_fetch_user',
            userId
          });
          navigate('/login');
          return;
        }

        // If onboarding not completed, redirect to onboarding
        if (!user.onboarding_completed) {
          localStorage.setItem('viib_resume_onboarding', 'true');
          navigate('/app/onboarding/biometric');
          return;
        }

        // If onboarding completed and active, go to home
        if (user.is_active) {
          navigate('/app/home');
          return;
        }

        // Account exists but not active
        navigate('/login');
      } catch (error) {
        await errorLogger.log(error, {
          operation: 'app_redirect_check_status'
        });
        navigate('/login');
      } finally {
        setChecking(false);
      }
    };

    checkUserStatus();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-ocean flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
};
