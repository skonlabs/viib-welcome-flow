import { useAuthContext } from '@/contexts/AuthContext';

// Re-export from auth context for backward compatibility
export const useAdmin = () => {
  const { isAdmin, loading } = useAuthContext();
  return { isAdmin, loading };
};
