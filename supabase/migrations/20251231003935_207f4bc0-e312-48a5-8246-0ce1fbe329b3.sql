-- Create user_genre_preferences table to store visual taste selections
CREATE TABLE public.user_genre_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, genre_id)
);

-- Enable RLS
ALTER TABLE public.user_genre_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "user_genre_preferences_auth" 
ON public.user_genre_preferences 
FOR ALL 
USING (user_id = get_user_id_from_auth())
WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_genre_preferences_service" 
ON public.user_genre_preferences 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_user_genre_preferences_user_id ON public.user_genre_preferences(user_id);