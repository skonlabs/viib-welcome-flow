// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for configuration
// In development, these should be set in .env.local file
// In production, these should be set in the hosting platform's environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ibrjwldvyuhwcfzdmimv.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlicmp3bGR2eXVod2NmemRtaW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NDUzMjIsImV4cCI6MjA3OTUyMTMyMn0.bCR6cHo5o_eiVeozyjPZv9tc-7v3Dj98a3lfUEUYyCI";

// Validate environment variables in production
if (import.meta.env.PROD && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn('Supabase environment variables not configured. Using fallback values.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});