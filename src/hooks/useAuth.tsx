import { useAuthContext } from '@/contexts/AuthContext';

// Re-export useAuthContext as useAuth for backward compatibility
export const useAuth = () => {
  const { user, isAdmin, loading, signOut } = useAuthContext();
  return { user, session: null, isAdmin, loading, signOut };
};
