-- Add trailer columns to seasons table
ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS trailer_url text,
ADD COLUMN IF NOT EXISTS is_tmdb_trailer boolean DEFAULT true;