-- Fix user_roles table to reference public.users instead of auth.users
-- and disable RLS since we use custom authentication (viib_user_id in localStorage)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Drop existing table to recreate with correct foreign key
DROP TABLE IF EXISTS public.user_roles;

-- Recreate user_roles table with reference to public.users
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Disable RLS on user_roles (custom auth doesn't use auth.uid())
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Fix user_vibe_preferences table - disable RLS since auth.uid() won't work
DROP POLICY IF EXISTS "Users can view their own vibe preferences" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Users can insert their own vibe preferences" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Users can update their own vibe preferences" ON public.user_vibe_preferences;

ALTER TABLE public.user_vibe_preferences DISABLE ROW LEVEL SECURITY;

-- Note: Authorization is now handled at the application level
-- using viib_user_id from localStorage