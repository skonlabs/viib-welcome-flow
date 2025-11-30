-- Disable RLS for admin configuration tables
-- These tables are managed through custom authentication and admin access controls
ALTER TABLE public.email_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config DISABLE ROW LEVEL SECURITY;