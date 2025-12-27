import { useAuthContext } from '@/contexts/AuthContext';

// Re-export useAuthContext as useAuth for backward compatibility
export const useAuth = () => {
  const { user, profile, session, isAdmin, loading, signOut, refreshProfile } = useAuthContext();
  return { user, profile, session, isAdmin, loading, signOut, refreshProfile };
};
