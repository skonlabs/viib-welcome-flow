import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  const [initialized, setInitialized] = useState(false);

  // Fetch user profile from users table using auth_id
  const fetchUserProfile = useCallback(async (authId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, phone_number, full_name, username, country, timezone, language_preference, created_at, onboarding_completed, is_active')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching user profile:', error);
      return null;
    }
  }, []);

  // Check if user has admin role
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      return !!data && !error;
    } catch {
      return false;
    }
  }, []);

  // Main initialization effect
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Step 1: Get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (!mounted) return;

        if (currentSession?.user) {
          // Set session and user first - this ensures auth.uid() works in subsequent queries
          setSession(currentSession);
          setUser(currentSession.user);

          // Step 2: Fetch user profile (this query needs auth.uid() to be set)
          const userProfile = await fetchUserProfile(currentSession.user.id);
          
          if (!mounted) return;

          if (userProfile) {
            setProfile(userProfile);
            
            // Step 3: Check admin status
            const adminStatus = await checkAdminStatus(userProfile.id);
            if (mounted) {
              setIsAdmin(adminStatus);
            }
          } else {
            // User authenticated but no profile found - this can happen for new users
            console.warn('Authenticated user has no linked profile');
            setProfile(null);
            setIsAdmin(false);
          }
        } else {
          // No session - clear everything
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession?.user) {
            setSession(newSession);
            setUser(newSession.user);

            // Only fetch profile on SIGNED_IN (not token refresh)
            if (event === 'SIGNED_IN') {
              // Use setTimeout to avoid Supabase client deadlock
              setTimeout(async () => {
                if (!mounted) return;
                
                const userProfile = await fetchUserProfile(newSession.user.id);
                if (!mounted) return;
                
                if (userProfile) {
                  setProfile(userProfile);
                  const adminStatus = await checkAdminStatus(userProfile.id);
                  if (mounted) {
                    setIsAdmin(adminStatus);
                    setLoading(false);
                  }
                } else {
                  setProfile(null);
                  setIsAdmin(false);
                  setLoading(false);
                }
              }, 0);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, checkAdminStatus]);

  // Refresh profile function for manual updates
  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const userProfile = await fetchUserProfile(user.id);
    if (userProfile) {
      setProfile(userProfile);
      const adminStatus = await checkAdminStatus(userProfile.id);
      setIsAdmin(adminStatus);
    }
  }, [user, fetchUserProfile, checkAdminStatus]);

  // Sign out function
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsAdmin(false);
    window.location.replace('/');
  }, []);

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
