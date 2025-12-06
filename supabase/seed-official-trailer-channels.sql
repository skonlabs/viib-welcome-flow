-- Seed file for official_trailer_channels table
-- Run this in Supabase SQL Editor to add comprehensive YouTube trailer channels for all 20 supported languages

-- Arabic channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('MBC Group', 'ar', 'broadcaster', 'MENA', 1, true),
('Shahid VOD', 'ar', 'streaming', 'MENA', 1, true),
('Netflix MENA', 'ar', 'streaming', 'MENA', 1, true),
('OSN', 'ar', 'streaming', 'MENA', 2, true),
('Rotana Cinema', 'ar', 'studio', 'MENA', 2, true),
('Empire Entertainment', 'ar', 'distributor', 'MENA', 2, true),
('Front Row Filmed Entertainment', 'ar', 'distributor', 'UAE', 2, true),
('Spacetoon', 'ar', 'broadcaster', 'MENA', 3, true),
('Weyyak', 'ar', 'streaming', 'MENA', 3, true)
ON CONFLICT DO NOTHING;

-- Bengali channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('SVF', 'bn', 'studio', 'India', 1, true),
('Eskay Movies', 'bn', 'studio', 'India', 1, true),
('Hoichoi', 'bn', 'streaming', 'India', 1, true),
('Zee Bangla', 'bn', 'broadcaster', 'India', 2, true),
('Angel Digital', 'bn', 'studio', 'India', 2, true),
('Surinder Films', 'bn', 'studio', 'India', 2, true),
('Addatimes', 'bn', 'streaming', 'India', 3, true),
('Bengali Movie Channel', 'bn', 'aggregator', 'India', 3, true)
ON CONFLICT DO NOTHING;

-- Gujarati channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Shemaroo Gujarati', 'gu', 'studio', 'India', 1, true),
('Pen Gujarati', 'gu', 'studio', 'India', 1, true),
('GSTV', 'gu', 'broadcaster', 'India', 2, true),
('Zee Gujarati', 'gu', 'broadcaster', 'India', 2, true),
('Colors Gujarati', 'gu', 'broadcaster', 'India', 2, true),
('Wow Gujarati', 'gu', 'aggregator', 'India', 3, true)
ON CONFLICT DO NOTHING;

-- Malayalam channels (additional)
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Mammootty Kampany', 'ml', 'studio', 'India', 1, true),
('Prithviraj Productions', 'ml', 'studio', 'India', 1, true),
('Aashirvad Cinemas', 'ml', 'studio', 'India', 1, true),
('Magic Frames', 'ml', 'studio', 'India', 2, true),
('Kavya Film Company', 'ml', 'studio', 'India', 2, true),
('Zee Keralam', 'ml', 'broadcaster', 'India', 2, true),
('Manorama Max', 'ml', 'streaming', 'India', 2, true),
('Mathrubhumi Movies', 'ml', 'aggregator', 'India', 3, true)
ON CONFLICT DO NOTHING;

-- Mandarin/Chinese channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Tencent Video', 'zh', 'streaming', 'China', 1, true),
('iQIYI', 'zh', 'streaming', 'China', 1, true),
('Youku', 'zh', 'streaming', 'China', 1, true),
('Bilibili Movie', 'zh', 'streaming', 'China', 1, true),
('Huace Film', 'zh', 'studio', 'China', 2, true),
('China Movie Channel', 'zh', 'broadcaster', 'China', 2, true),
('Wanda Pictures', 'zh', 'studio', 'China', 2, true),
('Bona Film', 'zh', 'studio', 'China', 2, true),
('Emperor Motion Pictures', 'zh', 'studio', 'HongKong', 2, true),
('Media Asia', 'zh', 'studio', 'HongKong', 3, true)
ON CONFLICT DO NOTHING;

-- Marathi channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Zee Marathi', 'mr', 'broadcaster', 'India', 1, true),
('Planet Marathi OTT', 'mr', 'streaming', 'India', 1, true),
('Shemaroo MarathiBana', 'mr', 'studio', 'India', 1, true),
('Colors Marathi', 'mr', 'broadcaster', 'India', 2, true),
('Sony Marathi', 'mr', 'broadcaster', 'India', 2, true),
('Everest Entertainment', 'mr', 'studio', 'India', 2, true),
('Zee Studios Marathi', 'mr', 'studio', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Portuguese channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Netflix Brasil', 'pt', 'streaming', 'Brazil', 1, true),
('Prime Video Brasil', 'pt', 'streaming', 'Brazil', 1, true),
('Globoplay', 'pt', 'streaming', 'Brazil', 1, true),
('Telecine', 'pt', 'broadcaster', 'Brazil', 1, true),
('Paris Filmes', 'pt', 'distributor', 'Brazil', 2, true),
('Diamond Films Brasil', 'pt', 'distributor', 'Brazil', 2, true),
('Warner Bros Brasil', 'pt', 'studio', 'Brazil', 2, true),
('Universal Pictures Brasil', 'pt', 'studio', 'Brazil', 2, true),
('Sony Pictures Brasil', 'pt', 'studio', 'Brazil', 2, true),
('NOS Audiovisuais', 'pt', 'distributor', 'Portugal', 3, true)
ON CONFLICT DO NOTHING;

-- Punjabi channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Speed Records', 'pa', 'studio', 'India', 1, true),
('White Hill Music', 'pa', 'studio', 'India', 1, true),
('Rhythm Boyz', 'pa', 'studio', 'India', 1, true),
('Humble Motion Pictures', 'pa', 'studio', 'India', 1, true),
('Zee Punjabi', 'pa', 'broadcaster', 'India', 2, true),
('Pitaara TV', 'pa', 'broadcaster', 'India', 2, true),
('PTC Punjabi', 'pa', 'broadcaster', 'India', 2, true),
('Saga Music', 'pa', 'studio', 'India', 2, true),
('Chaupal', 'pa', 'streaming', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Russian channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Kinopoisk', 'ru', 'streaming', 'Russia', 1, true),
('Kion', 'ru', 'streaming', 'Russia', 1, true),
('Wink', 'ru', 'streaming', 'Russia', 1, true),
('Central Partnership', 'ru', 'distributor', 'Russia', 1, true),
('Mosfilm', 'ru', 'studio', 'Russia', 2, true),
('Bazelevs', 'ru', 'studio', 'Russia', 2, true),
('Enjoy Movies', 'ru', 'distributor', 'Russia', 2, true),
('Megogo', 'ru', 'streaming', 'Russia', 2, true),
('Russia 1 Channel', 'ru', 'broadcaster', 'Russia', 3, true),
('TV-3 Russia', 'ru', 'broadcaster', 'Russia', 3, true)
ON CONFLICT DO NOTHING;

-- Turkish channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('BluTV', 'tr', 'streaming', 'Turkey', 1, true),
('Exxen', 'tr', 'streaming', 'Turkey', 1, true),
('Gain', 'tr', 'streaming', 'Turkey', 1, true),
('Netflix Türkiye', 'tr', 'streaming', 'Turkey', 1, true),
('BKM Film', 'tr', 'studio', 'Turkey', 1, true),
('TIMS Productions', 'tr', 'studio', 'Turkey', 1, true),
('Ay Yapim', 'tr', 'studio', 'Turkey', 2, true),
('O3 Medya', 'tr', 'studio', 'Turkey', 2, true),
('Mars Entertainment', 'tr', 'distributor', 'Turkey', 2, true),
('Warner Bros Türkiye', 'tr', 'studio', 'Turkey', 2, true),
('CGV Mars', 'tr', 'distributor', 'Turkey', 3, true)
ON CONFLICT DO NOTHING;

-- Additional Tamil channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Sun TV Network', 'ta', 'broadcaster', 'India', 1, true),
('Lyca Productions', 'ta', 'studio', 'India', 1, true),
('Red Giant Movies', 'ta', 'studio', 'India', 1, true),
('AGS Entertainment', 'ta', 'studio', 'India', 2, true),
('Aha Tamil', 'ta', 'streaming', 'India', 2, true),
('Tentkotta', 'ta', 'streaming', 'India', 3, true)
ON CONFLICT DO NOTHING;

-- Additional Telugu channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Geetha Arts', 'te', 'studio', 'India', 1, true),
('Mythri Movie Makers', 'te', 'studio', 'India', 1, true),
('Hombale Films', 'te', 'studio', 'India', 1, true),
('Sri Venkateswara Creations', 'te', 'studio', 'India', 2, true),
('UV Creations', 'te', 'studio', 'India', 2, true),
('Aha', 'te', 'streaming', 'India', 2, true),
('Zee Telugu', 'te', 'broadcaster', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- Additional Korean channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('CJ ENM Movies', 'ko', 'studio', 'Korea', 1, true),
('Lotte Entertainment', 'ko', 'studio', 'Korea', 1, true),
('Showbox Korea', 'ko', 'studio', 'Korea', 1, true),
('NEW', 'ko', 'studio', 'Korea', 2, true),
('TVING', 'ko', 'streaming', 'Korea', 2, true),
('Wavve', 'ko', 'streaming', 'Korea', 2, true),
('Coupang Play', 'ko', 'streaming', 'Korea', 2, true)
ON CONFLICT DO NOTHING;

-- Additional Japanese channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Toho Movie Channel', 'ja', 'studio', 'Japan', 1, true),
('Warner Bros Japan', 'ja', 'studio', 'Japan', 1, true),
('Sony Pictures Japan', 'ja', 'studio', 'Japan', 1, true),
('KADOKAWA', 'ja', 'studio', 'Japan', 1, true),
('Shochiku', 'ja', 'studio', 'Japan', 2, true),
('Aniplex', 'ja', 'studio', 'Japan', 2, true),
('Toei Animation', 'ja', 'studio', 'Japan', 2, true),
('MAPPA', 'ja', 'studio', 'Japan', 2, true),
('U-NEXT', 'ja', 'streaming', 'Japan', 2, true),
('AbemaTV', 'ja', 'streaming', 'Japan', 3, true)
ON CONFLICT DO NOTHING;

-- Additional Hindi channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Yash Raj Films', 'hi', 'studio', 'India', 1, true),
('Dharma Productions', 'hi', 'studio', 'India', 1, true),
('T-Series Films', 'hi', 'studio', 'India', 1, true),
('Eros Now', 'hi', 'streaming', 'India', 1, true),
('Excel Entertainment', 'hi', 'studio', 'India', 2, true),
('Nadiadwala Grandson', 'hi', 'studio', 'India', 2, true),
('Reliance Entertainment', 'hi', 'studio', 'India', 2, true),
('Viacom18 Studios', 'hi', 'studio', 'India', 2, true),
('JioCinema', 'hi', 'streaming', 'India', 2, true)
ON CONFLICT DO NOTHING;

-- English (Global) channels - additional coverage
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Universal Pictures', 'en', 'studio', 'Global', 1, true),
('Warner Bros Pictures', 'en', 'studio', 'Global', 1, true),
('Sony Pictures Entertainment', 'en', 'studio', 'Global', 1, true),
('Paramount Pictures', 'en', 'studio', 'Global', 1, true),
('20th Century Studios', 'en', 'studio', 'Global', 1, true),
('Lionsgate Movies', 'en', 'studio', 'Global', 1, true),
('A24', 'en', 'studio', 'Global', 1, true),
('Netflix', 'en', 'streaming', 'Global', 1, true),
('Prime Video', 'en', 'streaming', 'Global', 1, true),
('Apple TV', 'en', 'streaming', 'Global', 1, true),
('Disney Plus', 'en', 'streaming', 'Global', 1, true),
('HBO Max', 'en', 'streaming', 'Global', 1, true),
('Hulu', 'en', 'streaming', 'Global', 2, true),
('Peacock', 'en', 'streaming', 'Global', 2, true),
('Focus Features', 'en', 'studio', 'Global', 2, true),
('MGM', 'en', 'studio', 'Global', 2, true),
('STX Entertainment', 'en', 'studio', 'Global', 3, true),
('Neon', 'en', 'studio', 'Global', 3, true)
ON CONFLICT DO NOTHING;

-- Spanish channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Netflix Latinoamérica', 'es', 'streaming', 'LATAM', 1, true),
('Prime Video Latinoamérica', 'es', 'streaming', 'LATAM', 1, true),
('Cinépolis', 'es', 'distributor', 'Mexico', 1, true),
('Warner Bros Latinoamérica', 'es', 'studio', 'LATAM', 2, true),
('Universal Pictures Latinoamérica', 'es', 'studio', 'LATAM', 2, true),
('Sony Pictures Latinoamérica', 'es', 'studio', 'LATAM', 2, true),
('Sensacine', 'es', 'aggregator', 'Spain', 2, true),
('eOne Spain', 'es', 'distributor', 'Spain', 2, true),
('Movistar Plus', 'es', 'streaming', 'Spain', 2, true),
('ViX', 'es', 'streaming', 'LATAM', 2, true)
ON CONFLICT DO NOTHING;

-- French channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Allociné', 'fr', 'aggregator', 'France', 1, true),
('Universal Pictures France', 'fr', 'studio', 'France', 1, true),
('Warner Bros France', 'fr', 'studio', 'France', 1, true),
('Sony Pictures France', 'fr', 'studio', 'France', 1, true),
('Pathé Films', 'fr', 'studio', 'France', 1, true),
('Gaumont', 'fr', 'studio', 'France', 1, true),
('StudioCanal', 'fr', 'studio', 'France', 2, true),
('Canal Plus Cinema', 'fr', 'streaming', 'France', 2, true),
('SND Films', 'fr', 'distributor', 'France', 2, true),
('UGC Distribution', 'fr', 'distributor', 'France', 3, true)
ON CONFLICT DO NOTHING;

-- German channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('KinoCheck', 'de', 'aggregator', 'Germany', 1, true),
('Constantin Film', 'de', 'studio', 'Germany', 1, true),
('Warner Bros DE', 'de', 'studio', 'Germany', 1, true),
('Universal Pictures DE', 'de', 'studio', 'Germany', 1, true),
('Sony Pictures DE', 'de', 'studio', 'Germany', 1, true),
('Paramount DE', 'de', 'studio', 'Germany', 2, true),
('Leonine Studios', 'de', 'studio', 'Germany', 2, true),
('Tobis Film', 'de', 'distributor', 'Germany', 2, true),
('Wild Bunch Germany', 'de', 'distributor', 'Germany', 3, true)
ON CONFLICT DO NOTHING;

-- Italian channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('FilmIsNow Trailer', 'it', 'aggregator', 'Italy', 1, true),
('01 Distribution', 'it', 'distributor', 'Italy', 1, true),
('Vision Distribution', 'it', 'distributor', 'Italy', 1, true),
('Warner Bros Italia', 'it', 'studio', 'Italy', 1, true),
('Universal Pictures Italia', 'it', 'studio', 'Italy', 1, true),
('Sony Pictures Italia', 'it', 'studio', 'Italy', 2, true),
('Netflix Italia', 'it', 'streaming', 'Italy', 2, true),
('Eagle Pictures', 'it', 'distributor', 'Italy', 2, true),
('Medusa Film', 'it', 'studio', 'Italy', 2, true),
('Lucky Red', 'it', 'distributor', 'Italy', 3, true)
ON CONFLICT DO NOTHING;

-- Kannada channels
INSERT INTO public.official_trailer_channels (channel_name, language_code, category, region, priority, is_active) VALUES
('Hombale Films', 'kn', 'studio', 'India', 1, true),
('KRG Studios', 'kn', 'studio', 'India', 1, true),
('Zee Kannada', 'kn', 'broadcaster', 'India', 2, true),
('Udaya TV', 'kn', 'broadcaster', 'India', 2, true),
('Anand Audio', 'kn', 'studio', 'India', 2, true),
('Jayanna Films', 'kn', 'studio', 'India', 2, true),
('PRK Productions', 'kn', 'studio', 'India', 3, true)
ON CONFLICT DO NOTHING;

SELECT 'Successfully added official trailer channels for all 20 supported languages' as result;
