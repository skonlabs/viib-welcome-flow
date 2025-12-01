-- Add trailer columns to titles table
ALTER TABLE titles 
ADD COLUMN IF NOT EXISTS trailer_url TEXT,
ADD COLUMN IF NOT EXISTS is_tmdb_trailer BOOLEAN DEFAULT true;

COMMENT ON COLUMN titles.trailer_url IS 'YouTube trailer URL for the title';
COMMENT ON COLUMN titles.is_tmdb_trailer IS 'True if trailer from TMDB, false if from YouTube search';