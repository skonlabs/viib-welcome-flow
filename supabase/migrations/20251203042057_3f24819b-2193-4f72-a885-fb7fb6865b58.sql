-- Add flag_emoji column to spoken_languages table
ALTER TABLE public.spoken_languages ADD COLUMN IF NOT EXISTS flag_emoji text;

-- Migrate data from languages to spoken_languages (insert if not exists)
INSERT INTO public.spoken_languages (iso_639_1, language_name, flag_emoji)
SELECT language_code, language_name, flag_emoji
FROM public.languages
ON CONFLICT (iso_639_1) DO UPDATE SET
  language_name = EXCLUDED.language_name,
  flag_emoji = EXCLUDED.flag_emoji;

-- Migrate data from title_languages to title_spoken_languages (insert if not exists)
INSERT INTO public.title_spoken_languages (title_id, iso_639_1)
SELECT title_id, language_code
FROM public.title_languages
ON CONFLICT (title_id, iso_639_1) DO NOTHING;

-- Update user_language_preferences foreign key to reference spoken_languages
-- First, drop the existing foreign key constraint if it exists
ALTER TABLE public.user_language_preferences DROP CONSTRAINT IF EXISTS user_language_preferences_language_code_fkey;

-- Add new foreign key constraint to spoken_languages
ALTER TABLE public.user_language_preferences 
ADD CONSTRAINT user_language_preferences_language_code_fkey 
FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1);

-- Update titles table foreign key for original_language
ALTER TABLE public.titles DROP CONSTRAINT IF EXISTS titles_original_language_fkey;

-- Drop the old tables
DROP TABLE IF EXISTS public.title_languages;
DROP TABLE IF EXISTS public.languages;