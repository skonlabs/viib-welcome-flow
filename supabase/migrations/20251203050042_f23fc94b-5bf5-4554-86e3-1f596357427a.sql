-- Add is_tmdb_trailer column to titles table
ALTER TABLE public.titles 
ADD COLUMN IF NOT EXISTS is_tmdb_trailer boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.titles.is_tmdb_trailer IS 'True if trailer is from TMDB, false if fetched from YouTube';