import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Still loading auth state
      if (authLoading) return;

      // No user - redirect to login
      if (!user) {
        setCheckingOnboarding(false);
        navigate('/login');
        return;
      }

      // Auth done but no profile found - means user record doesn't exist
      if (!profile) {
        console.warn('User authenticated but no profile found');
        setCheckingOnboarding(false);
        navigate('/login');
        return;
      }

      // Profile loaded - check onboarding status directly from profile
      if (!profile.onboarding_completed) {
        localStorage.setItem('viib_resume_onboarding', 'true');
        navigate('/app/onboarding');
      }
      
      setCheckingOnboarding(false);
    };

    checkOnboardingStatus();
  }, [user, profile, authLoading, navigate]);

  if (authLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-ocean flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
