import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Auth finished - now check state
    if (!user) {
      // No authenticated user - go to login
      navigate('/login');
      return;
    }

    if (!profile) {
      // User exists in Supabase Auth but no linked profile in users table
      // This shouldn't happen normally - redirect to login
      console.warn('Authenticated user has no profile');
      navigate('/login');
      return;
    }

    // Check onboarding status from profile
    if (!profile.onboarding_completed) {
      localStorage.setItem('viib_resume_onboarding', 'true');
      navigate('/app/onboarding');
      return;
    }

    // All checks passed - ready to show content
    setReady(true);
  }, [user, profile, authLoading, navigate]);

  // Show loading while auth is loading OR we haven't verified everything
  if (authLoading || !ready) {
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
