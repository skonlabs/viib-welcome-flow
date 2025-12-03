-- ============================================================
-- MIGRATE TITLES TABLE TO NEW SCHEMA (PRESERVE DATA)
-- ============================================================

-- 1. Create new enum types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'title_type_enum') THEN
    CREATE TYPE title_type_enum AS ENUM ('movie', 'tv');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type_enum') THEN
    CREATE TYPE provider_type_enum AS ENUM ('buy', 'rent', 'stream', 'free');
  END IF;
END $$;

-- 2. Add new columns to titles table
ALTER TABLE public.titles 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS original_name TEXT,
  ADD COLUMN IF NOT EXISTS overview TEXT,
  ADD COLUMN IF NOT EXISTS release_date DATE,
  ADD COLUMN IF NOT EXISTS first_air_date DATE,
  ADD COLUMN IF NOT EXISTS last_air_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS runtime INTEGER,
  ADD COLUMN IF NOT EXISTS episode_run_time INTEGER[],
  ADD COLUMN IF NOT EXISTS popularity DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS vote_average DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS poster_path TEXT,
  ADD COLUMN IF NOT EXISTS backdrop_path TEXT,
  ADD COLUMN IF NOT EXISTS is_adult BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS imdb_id TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Migrate data from old columns to new columns
UPDATE public.titles SET
  name = title_name,
  original_name = original_title_name,
  overview = synopsis,
  release_date = CASE 
    WHEN release_year IS NOT NULL AND content_type = 'movie' 
    THEN make_date(release_year, 1, 1)
    ELSE NULL
  END,
  first_air_date = CASE 
    WHEN release_year IS NOT NULL AND content_type = 'series' 
    THEN make_date(release_year, 1, 1)
    ELSE NULL
  END,
  runtime = runtime_minutes,
  popularity = popularity_score::DOUBLE PRECISION
WHERE name IS NULL;

-- 4. Make name NOT NULL after migration (with fallback)
UPDATE public.titles SET name = 'Unknown' WHERE name IS NULL;

-- 5. Drop old columns
ALTER TABLE public.titles 
  DROP COLUMN IF EXISTS title_name,
  DROP COLUMN IF EXISTS original_title_name,
  DROP COLUMN IF EXISTS synopsis,
  DROP COLUMN IF EXISTS release_year,
  DROP COLUMN IF EXISTS runtime_minutes,
  DROP COLUMN IF EXISTS popularity_score,
  DROP COLUMN IF EXISTS is_tmdb_trailer;

-- 6. Add title_type column (will map from content_type)
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS title_type TEXT;
UPDATE public.titles SET title_type = CASE 
  WHEN content_type = 'series' THEN 'tv'
  ELSE content_type
END WHERE title_type IS NULL;

-- 7. Drop content_type after migration
ALTER TABLE public.titles DROP COLUMN IF EXISTS content_type;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_titles_type ON public.titles (title_type);
CREATE INDEX IF NOT EXISTS idx_titles_popularity ON public.titles (popularity DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_titles_vote_average ON public.titles (vote_average DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_titles_dates ON public.titles (release_date, first_air_date);

-- 9. Drop unique constraint on old columns and create new one
DROP INDEX IF EXISTS idx_titles_unique_tmdb;
CREATE UNIQUE INDEX IF NOT EXISTS idx_titles_unique_tmdb ON public.titles (title_type, tmdb_id);

-- 10. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_titles_set_updated_at ON public.titles;
CREATE TRIGGER trg_titles_set_updated_at
BEFORE UPDATE ON public.titles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. Create spoken_languages table (new)
CREATE TABLE IF NOT EXISTS public.spoken_languages (
  iso_639_1 VARCHAR(2) PRIMARY KEY,
  language_name TEXT NOT NULL
);

-- 12. Create title_spoken_languages junction table (new)
CREATE TABLE IF NOT EXISTS public.title_spoken_languages (
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  iso_639_1 VARCHAR(2) NOT NULL REFERENCES public.spoken_languages(iso_639_1),
  PRIMARY KEY (title_id, iso_639_1)
);

CREATE INDEX IF NOT EXISTS idx_title_spoken_languages_lang ON public.title_spoken_languages (iso_639_1);

-- 13. Create seasons table for TV shows
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_count INTEGER,
  air_date DATE,
  name TEXT,
  overview TEXT,
  poster_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_unique ON public.seasons (title_id, season_number);
CREATE INDEX IF NOT EXISTS idx_seasons_title_id ON public.seasons (title_id);

-- 14. Create episodes table
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  air_date DATE,
  runtime INTEGER,
  still_path TEXT,
  vote_average DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_unique ON public.episodes (season_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON public.episodes (season_id);

-- 15. Create providers table (replaces streaming_services)
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_provider_id INTEGER UNIQUE,
  provider_name TEXT NOT NULL,
  logo_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON public.providers (provider_name);

-- 16. Create title_providers junction table (replaces title_streaming_availability)
CREATE TABLE IF NOT EXISTS public.title_providers (
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  provider_type TEXT NOT NULL,
  region VARCHAR(2) NOT NULL,
  PRIMARY KEY (title_id, provider_id, provider_type, region)
);

CREATE INDEX IF NOT EXISTS idx_title_providers_provider ON public.title_providers (provider_id);
CREATE INDEX IF NOT EXISTS idx_title_providers_region ON public.title_providers (region);

-- 17. Create keywords table
CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_keyword_id INTEGER UNIQUE,
  name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_keywords_name ON public.keywords (name);

-- 18. Create title_keywords junction table
CREATE TABLE IF NOT EXISTS public.title_keywords (
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES public.keywords(id),
  PRIMARY KEY (title_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_title_keywords_keyword ON public.title_keywords (keyword_id);

-- 19. Update genres table to use INTEGER id like TMDB
ALTER TABLE public.genres ADD COLUMN IF NOT EXISTS tmdb_genre_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_genres_tmdb_id ON public.genres (tmdb_genre_id);

-- 20. Add comments
COMMENT ON TABLE public.titles IS 'Unified table for TMDB movies and TV series.';
COMMENT ON COLUMN public.titles.trailer_url IS 'Trailer/full video URL extracted from TMDB videos API.';