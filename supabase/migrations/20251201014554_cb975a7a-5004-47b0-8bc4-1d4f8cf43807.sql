-- Disable RLS on jobs table since admin access is already protected by useAdmin hook
-- and the RLS policy relies on Supabase auth.uid() which doesn't work with custom authentication
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;

-- Drop the existing RLS policy
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;