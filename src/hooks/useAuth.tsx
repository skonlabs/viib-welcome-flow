import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomUser {
  id: string;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
}

export const useAuth = () => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Check for session in localStorage (remember me) or sessionStorage
      const sessionData = localStorage.getItem('viib_session') || sessionStorage.getItem('viib_session');
      
      if (!sessionData) {
        // Fallback to old method
        const userId = localStorage.getItem('viib_user_id');
        if (!userId) {
          setLoading(false);
          return;
        }
        await fetchUserData(userId);
        return;
      }

      const { userId, rememberMe, timestamp } = JSON.parse(sessionData);
      
      // Check if session expired (30 days for remember me)
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
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone_number, full_name')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        localStorage.removeItem('viib_user_id');
        setLoading(false);
        return;
      }

      // Set user with metadata format for compatibility
      setUser({
        id: userData.id,
        email: userData.email,
        phone_number: userData.phone_number,
        full_name: userData.full_name,
        user_metadata: {
          full_name: userData.full_name || undefined,
        }
      });

      // Check admin status
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
        .single();

      setIsAdmin(!!data && !error);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Clear all authentication-related storage
    localStorage.removeItem('viib_user_id');
    localStorage.removeItem('viib_session');
    localStorage.removeItem('viib_resume_onboarding');
    sessionStorage.removeItem('viib_session');
    
    // Clear user state
    setUser(null);
    setIsAdmin(false);
    
    // Force redirect to landing page
    window.location.replace('/');
  };

  return { user, session: null, isAdmin, loading, signOut };
};
