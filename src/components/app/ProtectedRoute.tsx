import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      return;
    }

    // No authenticated user - redirect to login
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // User authenticated but no profile found
    // This means they're a new Supabase Auth user without a linked profile
    if (!profile) {
      // User authenticated but no profile found, redirecting to onboarding
      navigate('/app/onboarding', { replace: true });
      return;
    }

    // Check onboarding status
    if (!profile.onboarding_completed) {
      // Store that we're resuming onboarding
      localStorage.setItem('viib_resume_onboarding', 'true');
      
      // Don't redirect if already on onboarding page
      if (!location.pathname.startsWith('/app/onboarding')) {
        navigate('/app/onboarding', { replace: true });
        return;
      }
    }

    // All checks passed - ready to render
    setIsReady(true);
  }, [user, profile, loading, navigate, location.pathname]);

  // Show loading spinner while checking auth
  if (loading || !isReady) {
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
