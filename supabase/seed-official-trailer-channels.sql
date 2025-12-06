-- Seed file for official_trailer_channels table
-- Adds YouTube trailer channels for all 20 supported languages in spoken_languages table
-- Run this in Supabase SQL Editor

-- Arabic (ar) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('MBC Group', 'ar', 'broadcaster', 'MENA', 1, true),
('Shahid VOD', 'ar', 'streaming', 'MENA', 1, true),
('Netflix MENA', 'ar', 'streaming', 'MENA', 1, true),
('OSN', 'ar', 'streaming', 'MENA', 2, true),
('Rotana Cinema', 'ar', 'studio', 'MENA', 2, true),
('Empire Entertainment', 'ar', 'distributor', 'MENA', 2, true)
ON CONFLICT DO NOTHING;

-- Bengali (bn) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('SVF', 'bn', 'studio', 'India', 1, true),
('Eskay Movies', 'bn', 'studio', 'India', 1, true),
('Hoichoi', 'bn', 'streaming', 'India', 1, true),
('Zee Bangla', 'bn', 'broadcaster', 'India', 2, true),
('Angel Digital', 'bn', 'studio', 'India', 2, true),
('Addatimes', 'bn', 'streaming', 'India', 3, true)
ON CONFLICT DO NOTHING;

-- Gujarati (gu) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Shemaroo Gujarati', 'gu', 'studio', 'India', 1, true),
('Pen Gujarati', 'gu', 'studio', 'India', 1, true),
('Zee Gujarati', 'gu', 'broadcaster', 'India', 2, true),
('Colors Gujarati', 'gu', 'broadcaster', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Marathi (mr) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Zee Marathi', 'mr', 'broadcaster', 'India', 1, true),
('Planet Marathi OTT', 'mr', 'streaming', 'India', 1, true),
('Shemaroo MarathiBana', 'mr', 'studio', 'India', 1, true),
('Colors Marathi', 'mr', 'broadcaster', 'India', 2, true),
('Sony Marathi', 'mr', 'broadcaster', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Portuguese (pt) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Netflix Brasil', 'pt', 'streaming', 'Brazil', 1, true),
('Prime Video Brasil', 'pt', 'streaming', 'Brazil', 1, true),
('Globoplay', 'pt', 'streaming', 'Brazil', 1, true),
('Telecine', 'pt', 'broadcaster', 'Brazil', 1, true),
('Paris Filmes', 'pt', 'distributor', 'Brazil', 2, true),
('Warner Bros Brasil', 'pt', 'studio', 'Brazil', 2, true)
ON CONFLICT DO NOTHING;

-- Punjabi (pa) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Speed Records', 'pa', 'studio', 'India', 1, true),
('White Hill Music', 'pa', 'studio', 'India', 1, true),
('Rhythm Boyz', 'pa', 'studio', 'India', 1, true),
('Humble Motion Pictures', 'pa', 'studio', 'India', 1, true),
('Zee Punjabi', 'pa', 'broadcaster', 'India', 2, true),
('PTC Punjabi', 'pa', 'broadcaster', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Russian (ru) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Kinopoisk', 'ru', 'streaming', 'Russia', 1, true),
('Kion', 'ru', 'streaming', 'Russia', 1, true),
('Central Partnership', 'ru', 'distributor', 'Russia', 1, true),
('Mosfilm', 'ru', 'studio', 'Russia', 2, true),
('Bazelevs', 'ru', 'studio', 'Russia', 2, true),
('Megogo', 'ru', 'streaming', 'Russia', 2, true)
ON CONFLICT DO NOTHING;

-- Turkish (tr) - Missing channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('BluTV', 'tr', 'streaming', 'Turkey', 1, true),
('Exxen', 'tr', 'streaming', 'Turkey', 1, true),
('Netflix Türkiye', 'tr', 'streaming', 'Turkey', 1, true),
('BKM Film', 'tr', 'studio', 'Turkey', 1, true),
('TIMS Productions', 'tr', 'studio', 'Turkey', 2, true),
('Ay Yapim', 'tr', 'studio', 'Turkey', 2, true)
ON CONFLICT DO NOTHING;

-- Malayalam (ml) - Enhance existing (only 1 channel)
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Prithviraj Productions', 'ml', 'studio', 'India', 1, true),
('Aashirvad Cinemas', 'ml', 'studio', 'India', 1, true),
('Magic Frames', 'ml', 'studio', 'India', 2, true),
('Zee Keralam', 'ml', 'broadcaster', 'India', 2, true),
('Manorama Max', 'ml', 'streaming', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Tamil (ta) - Enhance existing (only 3 channels)
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Lyca Productions', 'ta', 'studio', 'India', 1, true),
('Red Giant Movies', 'ta', 'studio', 'India', 1, true),
('AGS Entertainment', 'ta', 'studio', 'India', 2, true),
('Aha Tamil', 'ta', 'streaming', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Telugu (te) - Enhance existing (only 2 channels)
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Mythri Movie Makers', 'te', 'studio', 'India', 1, true),
('Sri Venkateswara Creations', 'te', 'studio', 'India', 1, true),
('UV Creations', 'te', 'studio', 'India', 2, true),
('Aha', 'te', 'streaming', 'India', 2, true),
('Zee Telugu', 'te', 'broadcaster', 'India', 2, true)
ON CONFLICT DO NOTHING;

SELECT 'Added trailer channels for missing/sparse languages' as result;
