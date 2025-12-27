import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  username: string | null;
  country: string | null;
  timezone: string | null;
  language_preference: string | null;
  created_at: string;
  onboarding_completed: boolean;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed, profile should still be valid
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authId: string) => {
    try {
      // Fetch user profile linked to auth user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone_number, full_name, username, country, timezone, language_preference, created_at, onboarding_completed, is_active')
        .eq('auth_id', authId)
        .single();

      if (userError || !userData) {
        console.error('Error fetching user profile:', userError);
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(userData);
      await checkAdminStatus(userData.id);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
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
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsAdmin(false);
    window.location.replace('/');
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isAdmin,
      loading,
      signOut,
      refreshProfile
    }}>
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

// Backwards compatibility - some components use user.id
// They should use profile.id for the internal user ID
export const useAuth = useAuthContext;
