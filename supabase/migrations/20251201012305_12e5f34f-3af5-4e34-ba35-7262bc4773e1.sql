-- Create languages table
CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL UNIQUE,
  language_name TEXT NOT NULL,
  flag_emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert language data with TMDB-compatible codes
INSERT INTO public.languages (language_code, language_name, flag_emoji) VALUES
('en', 'English', '🇬🇧'),
('hi', 'Hindi', '🇮🇳'),
('ko', 'Korean', '🇰🇷'),
('de', 'German', '🇩🇪'),
('te', 'Telugu', '🇮🇳'),
('ta', 'Tamil', '🇮🇳'),
('ml', 'Malayalam', '🇮🇳'),
('mr', 'Marathi', '🇮🇳'),
('gu', 'Gujarati', '🇮🇳'),
('fr', 'French', '🇫🇷'),
('it', 'Italian', '🇮🇹'),
('es', 'Spanish', '🇪🇸'),
('pt', 'Portuguese', '🇵🇹'),
('ja', 'Japanese', '🇯🇵');

-- Enable RLS (optional - can disable if public access is needed)
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read languages
CREATE POLICY "Anyone can view languages"
ON public.languages
FOR SELECT
USING (true);