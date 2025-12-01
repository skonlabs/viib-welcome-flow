-- Add TMDB ID to titles table for proper deduplication
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;

-- Create unique index on TMDB ID and content type to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS titles_tmdb_id_content_type_idx 
ON public.titles(tmdb_id, content_type) 
WHERE tmdb_id IS NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS titles_title_name_idx ON public.titles(title_name);
CREATE INDEX IF NOT EXISTS titles_release_year_idx ON public.titles(release_year);