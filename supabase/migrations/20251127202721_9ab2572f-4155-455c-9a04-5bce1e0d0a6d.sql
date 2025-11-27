-- Disable RLS on user_vibe_preferences to work with custom authentication
ALTER TABLE public.user_vibe_preferences DISABLE ROW LEVEL SECURITY;

-- Drop the existing policies since RLS is disabled
DROP POLICY IF EXISTS "Users can view their own vibe preferences" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Users can insert their own vibe preferences" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Users can update their own vibe preferences" ON public.user_vibe_preferences;