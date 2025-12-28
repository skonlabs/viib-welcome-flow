-- Add Rotten Tomatoes columns to titles table
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS rt_ascore integer,  -- Audience score (0-100)
ADD COLUMN IF NOT EXISTS rt_acount integer,  -- Audience review count
ADD COLUMN IF NOT EXISTS rt_cscore integer,  -- Critic score (Tomatometer 0-100)
ADD COLUMN IF NOT EXISTS rt_ccount integer;  -- Critic review count

-- Add Rotten Tomatoes columns to seasons table for series
ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS rt_ascore integer,
ADD COLUMN IF NOT EXISTS rt_acount integer,
ADD COLUMN IF NOT EXISTS rt_cscore integer,
ADD COLUMN IF NOT EXISTS rt_ccount integer;

-- Add comments for clarity
COMMENT ON COLUMN public.titles.rt_ascore IS 'Rotten Tomatoes Audience Score (0-100)';
COMMENT ON COLUMN public.titles.rt_acount IS 'Rotten Tomatoes Audience Review Count';
COMMENT ON COLUMN public.titles.rt_cscore IS 'Rotten Tomatoes Critic Score / Tomatometer (0-100)';
COMMENT ON COLUMN public.titles.rt_ccount IS 'Rotten Tomatoes Critic Review Count';

COMMENT ON COLUMN public.seasons.rt_ascore IS 'Rotten Tomatoes Audience Score (0-100)';
COMMENT ON COLUMN public.seasons.rt_acount IS 'Rotten Tomatoes Audience Review Count';
COMMENT ON COLUMN public.seasons.rt_cscore IS 'Rotten Tomatoes Critic Score / Tomatometer (0-100)';
COMMENT ON COLUMN public.seasons.rt_ccount IS 'Rotten Tomatoes Critic Review Count';