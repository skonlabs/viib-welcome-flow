-- Create user_vibe_preferences table
CREATE TABLE public.user_vibe_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vibe_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_vibe_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_vibe_preferences
CREATE POLICY "Users can view their own vibe preferences"
ON public.user_vibe_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vibe preferences"
ON public.user_vibe_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vibe preferences"
ON public.user_vibe_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vibe_preferences_updated_at
BEFORE UPDATE ON public.user_vibe_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_vibe_preferences_updated_at();