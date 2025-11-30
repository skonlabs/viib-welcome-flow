-- Create activation_codes table
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  max_uses integer DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  notes text
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON public.activation_codes(is_used);

-- Disable RLS (using custom auth)
ALTER TABLE public.activation_codes DISABLE ROW LEVEL SECURITY;