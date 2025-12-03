-- Create table for official YouTube trailer channels by language/region
CREATE TABLE public.official_trailer_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name TEXT NOT NULL,
  channel_id TEXT, -- YouTube channel ID if known
  language_code TEXT NOT NULL, -- ISO 639-1 language code (e.g., 'en', 'hi', 'ko')
  region TEXT, -- Region/market (e.g., 'US', 'IN', 'KR', 'global')
  category TEXT, -- e.g., 'studio', 'distributor', 'streaming', 'production'
  priority INTEGER NOT NULL DEFAULT 1, -- Higher = more preferred
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookup
CREATE INDEX idx_official_channels_language ON public.official_trailer_channels(language_code);
CREATE INDEX idx_official_channels_active ON public.official_trailer_channels(is_active) WHERE is_active = true;

-- Insert English (Hollywood) channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Universal Pictures', 'en', 'US', 'studio', 10),
('Warner Bros. Pictures', 'en', 'US', 'studio', 10),
('Sony Pictures Entertainment', 'en', 'US', 'studio', 10),
('Paramount Pictures', 'en', 'US', 'studio', 10),
('20th Century Studios', 'en', 'US', 'studio', 10),
('Lionsgate Movies', 'en', 'US', 'studio', 9),
('A24', 'en', 'US', 'studio', 9),
('Netflix', 'en', 'global', 'streaming', 8),
('Prime Video', 'en', 'global', 'streaming', 8),
('Disney Studios', 'en', 'global', 'studio', 10),
('Marvel Entertainment', 'en', 'global', 'studio', 10),
('Lucasfilm', 'en', 'global', 'studio', 9);

-- Insert Hindi/Indian cinema channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('T-Series', 'hi', 'IN', 'production', 10),
('Sony Pictures India', 'hi', 'IN', 'studio', 9),
('Zee Studios', 'hi', 'IN', 'studio', 9),
('Pen Movies', 'hi', 'IN', 'production', 8),
('YRF', 'hi', 'IN', 'production', 10),
('Dharma Productions', 'hi', 'IN', 'production', 9),
('Red Chillies Entertainment', 'hi', 'IN', 'production', 8);

-- South Indian channels (Tamil, Telugu, Kannada, Malayalam)
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Sun Pictures', 'ta', 'IN', 'production', 10),
('Lyca Productions', 'ta', 'IN', 'production', 9),
('Red Giant Movies', 'ta', 'IN', 'production', 8),
('Geetha Arts', 'te', 'IN', 'production', 10),
('Mythri Movie Makers', 'te', 'IN', 'production', 10),
('Hombale Films', 'kn', 'IN', 'production', 10),
('Mammootty Kampany', 'ml', 'IN', 'production', 9);

-- Korean channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('CJ ENM Movie', 'ko', 'KR', 'studio', 10),
('Lotte Entertainment', 'ko', 'KR', 'studio', 9),
('Showbox', 'ko', 'KR', 'studio', 8),
('NEW Movie', 'ko', 'KR', 'studio', 8),
('Netflix K-Content', 'ko', 'KR', 'streaming', 9),
('tvN', 'ko', 'KR', 'broadcaster', 8),
('JTBC Entertainment', 'ko', 'KR', 'broadcaster', 8);

-- Japanese channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Toho Movie Channel', 'ja', 'JP', 'studio', 10),
('Warner Bros. Japan', 'ja', 'JP', 'studio', 9),
('Sony Pictures Japan', 'ja', 'JP', 'studio', 9),
('KADOKAWA', 'ja', 'JP', 'studio', 8),
('Shochiku', 'ja', 'JP', 'studio', 8),
('Aniplex', 'ja', 'JP', 'anime', 9),
('Toei Animation', 'ja', 'JP', 'anime', 9),
('Crunchyroll', 'ja', 'global', 'streaming', 8),
('MAPPA', 'ja', 'JP', 'anime', 8);

-- Chinese channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Tencent Video', 'zh', 'CN', 'streaming', 10),
('iQIYI', 'zh', 'CN', 'streaming', 9),
('Youku', 'zh', 'CN', 'streaming', 8),
('Huace Film', 'zh', 'CN', 'production', 8),
('China Movie Channel', 'zh', 'CN', 'broadcaster', 9);

-- Spanish channels (Latin America + Spain)
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Cinepolis Trailers', 'es', 'LATAM', 'distributor', 10),
('Sony Pictures Latinoamerica', 'es', 'LATAM', 'studio', 9),
('Warner Bros. Latinoamerica', 'es', 'LATAM', 'studio', 9),
('Universal Pictures Latinoamerica', 'es', 'LATAM', 'studio', 9),
('Netflix Latinoamerica', 'es', 'LATAM', 'streaming', 8),
('Prime Video Latinoamerica', 'es', 'LATAM', 'streaming', 8),
('Sensacine TRAILERS', 'es', 'ES', 'aggregator', 7),
('eOne Spain', 'es', 'ES', 'distributor', 7);

-- French channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Allocine Trailers', 'fr', 'FR', 'aggregator', 10),
('Universal Pictures France', 'fr', 'FR', 'studio', 9),
('Sony Pictures France', 'fr', 'FR', 'studio', 9),
('Warner Bros France', 'fr', 'FR', 'studio', 9),
('Pathe Films', 'fr', 'FR', 'studio', 9),
('Gaumont', 'fr', 'FR', 'studio', 9);

-- German channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('KinoCheck', 'de', 'DE', 'aggregator', 10),
('Constantin Film', 'de', 'DE', 'studio', 9),
('Sony Pictures DE', 'de', 'DE', 'studio', 8),
('Warner Bros. DE', 'de', 'DE', 'studio', 8),
('Universal Pictures DE', 'de', 'DE', 'studio', 8);

-- Italian channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('FilmIsNow Trailer', 'it', 'IT', 'aggregator', 10),
('01 Distribution', 'it', 'IT', 'distributor', 9),
('Vision Distribution', 'it', 'IT', 'distributor', 8),
('Netflix Italia', 'it', 'IT', 'streaming', 8);

-- Global multi-language channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, region, category, priority) VALUES
('Netflix', 'global', 'global', 'streaming', 8),
('Prime Video', 'global', 'global', 'streaming', 8),
('Disney+ Hotstar', 'global', 'IN', 'streaming', 8),
('MovieclipsTrailers', 'en', 'global', 'aggregator', 7),
('Rotten Tomatoes Trailers', 'en', 'global', 'aggregator', 6),
('IGN', 'en', 'global', 'media', 5);