-- Add season_number column to user_title_interactions for tracking season-specific watchlist entries
ALTER TABLE public.user_title_interactions 
ADD COLUMN season_number integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.user_title_interactions.season_number IS 'Season number when adding a specific season to watchlist. NULL means full title/series.';