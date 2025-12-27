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
    let mounted = true;

    const initialize = async () => {
      try {
        // Get initial session - this establishes the auth context for RLS
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Session is now established - RLS will work correctly
          await fetchUserProfile(initialSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initialize();

    // Listen for auth changes AFTER initial setup
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        // Update session state synchronously
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          // Defer profile fetch to next tick to ensure session is fully established
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(newSession.user.id);
            }
          }, 0);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed, profile should still be valid - no action needed
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authId: string) => {
    try {
      // Query the users table - RLS policy will allow if auth.uid() matches auth_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone_number, full_name, username, country, timezone, language_preference, created_at, onboarding_completed, is_active')
        .eq('auth_id', authId)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!userData) {
        console.warn('No user profile found for auth_id:', authId);
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

// Backwards compatibility
export const useAuth = useAuthContext;
