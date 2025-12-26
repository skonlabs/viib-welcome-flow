import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomUser {
  id: string;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  username: string | null;
  country: string | null;
  timezone: string | null;
  language_preference: string | null;
  created_at: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
}

interface AuthContextType {
  user: CustomUser | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionData = localStorage.getItem('viib_session') || sessionStorage.getItem('viib_session');

      if (!sessionData) {
        const userId = localStorage.getItem('viib_user_id');
        if (!userId) {
          setLoading(false);
          return;
        }
        await fetchUserData(userId);
        return;
      }

      // Safely parse and validate session data
      let parsedSession: { userId?: unknown; rememberMe?: unknown; timestamp?: unknown };
      try {
        parsedSession = JSON.parse(sessionData);
      } catch {
        // Invalid JSON - clear corrupted session data
        localStorage.removeItem('viib_session');
        sessionStorage.removeItem('viib_session');
        setLoading(false);
        return;
      }

      // Validate required fields exist and have correct types
      const { userId, rememberMe, timestamp } = parsedSession;
      if (
        typeof userId !== 'string' ||
        !userId ||
        typeof timestamp !== 'number'
      ) {
        // Invalid session structure - clear corrupted data
        localStorage.removeItem('viib_session');
        sessionStorage.removeItem('viib_session');
        setLoading(false);
        return;
      }

      if (rememberMe) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp > thirtyDays) {
          localStorage.removeItem('viib_session');
          localStorage.removeItem('viib_user_id');
          setLoading(false);
          return;
        }
      }

      await fetchUserData(userId);
    } catch (error) {
      console.error('Error checking session:', error);
      localStorage.removeItem('viib_session');
      sessionStorage.removeItem('viib_session');
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone_number, full_name, username, country, timezone, language_preference, created_at')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        localStorage.removeItem('viib_user_id');
        setLoading(false);
        return;
      }

      setUser({
        id: userData.id,
        email: userData.email,
        phone_number: userData.phone_number,
        full_name: userData.full_name,
        username: userData.username,
        country: userData.country,
        timezone: userData.timezone,
        language_preference: userData.language_preference,
        created_at: userData.created_at,
        user_metadata: {
          full_name: userData.full_name || undefined,
        }
      });

      await checkAdminStatus(userData.id);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!data && !error);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('viib_user_id');
    localStorage.removeItem('viib_session');
    localStorage.removeItem('viib_resume_onboarding');
    sessionStorage.removeItem('viib_session');
    
    setUser(null);
    setIsAdmin(false);
    
    window.location.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
