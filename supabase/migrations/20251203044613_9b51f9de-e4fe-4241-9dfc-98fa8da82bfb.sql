-- Update genres table with TMDB genre IDs (critical for job genre mapping)
UPDATE genres SET tmdb_genre_id = 28 WHERE genre_name = 'Action';
UPDATE genres SET tmdb_genre_id = 12 WHERE genre_name = 'Adventure';
UPDATE genres SET tmdb_genre_id = 16 WHERE genre_name = 'Animation';
UPDATE genres SET tmdb_genre_id = 35 WHERE genre_name = 'Comedy';
UPDATE genres SET tmdb_genre_id = 80 WHERE genre_name = 'Crime';
UPDATE genres SET tmdb_genre_id = 99 WHERE genre_name = 'Documentary';
UPDATE genres SET tmdb_genre_id = 18 WHERE genre_name = 'Drama';
UPDATE genres SET tmdb_genre_id = 10751 WHERE genre_name = 'Family';
UPDATE genres SET tmdb_genre_id = 14 WHERE genre_name = 'Fantasy';
UPDATE genres SET tmdb_genre_id = 36 WHERE genre_name = 'History';
UPDATE genres SET tmdb_genre_id = 27 WHERE genre_name = 'Horror';
UPDATE genres SET tmdb_genre_id = 10402 WHERE genre_name = 'Music';
UPDATE genres SET tmdb_genre_id = 9648 WHERE genre_name = 'Mystery';
UPDATE genres SET tmdb_genre_id = 10749 WHERE genre_name = 'Romance';
UPDATE genres SET tmdb_genre_id = 878 WHERE genre_name = 'Science Fiction';
UPDATE genres SET tmdb_genre_id = 53 WHERE genre_name = 'Thriller';
UPDATE genres SET tmdb_genre_id = 10752 WHERE genre_name = 'War';
UPDATE genres SET tmdb_genre_id = 37 WHERE genre_name = 'Western';

-- Ensure unique constraint exists on titles table for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'titles_tmdb_id_title_type_key' 
    AND conrelid = 'titles'::regclass
  ) THEN
    ALTER TABLE titles ADD CONSTRAINT titles_tmdb_id_title_type_key UNIQUE (tmdb_id, title_type);
  END IF;
END $$;

-- Ensure unique constraint on title_streaming_availability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'title_streaming_availability_unique' 
    AND conrelid = 'title_streaming_availability'::regclass
  ) THEN
    ALTER TABLE title_streaming_availability 
    ADD CONSTRAINT title_streaming_availability_unique 
    UNIQUE (title_id, streaming_service_id, region_code);
  END IF;
END $$;

-- Ensure unique constraint on title_genres
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'title_genres_pkey' 
    AND conrelid = 'title_genres'::regclass
  ) THEN
    ALTER TABLE title_genres ADD PRIMARY KEY (title_id, genre_id);
  END IF;
END $$;

-- Ensure unique constraint on title_spoken_languages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'title_spoken_languages_pkey' 
    AND conrelid = 'title_spoken_languages'::regclass
  ) THEN
    ALTER TABLE title_spoken_languages ADD PRIMARY KEY (title_id, iso_639_1);
  END IF;
END $$;

-- Ensure unique constraint on seasons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'seasons_title_id_season_number_key' 
    AND conrelid = 'seasons'::regclass
  ) THEN
    ALTER TABLE seasons ADD CONSTRAINT seasons_title_id_season_number_key UNIQUE (title_id, season_number);
  END IF;
END $$;

-- Ensure unique constraint on keywords
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'keywords_tmdb_keyword_id_key' 
    AND conrelid = 'keywords'::regclass
  ) THEN
    ALTER TABLE keywords ADD CONSTRAINT keywords_tmdb_keyword_id_key UNIQUE (tmdb_keyword_id);
  END IF;
END $$;

-- Ensure unique constraint on title_keywords
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'title_keywords_pkey' 
    AND conrelid = 'title_keywords'::regclass
  ) THEN
    ALTER TABLE title_keywords ADD PRIMARY KEY (title_id, keyword_id);
  END IF;
END $$;

-- Ensure unique constraint on spoken_languages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'spoken_languages_pkey' 
    AND conrelid = 'spoken_languages'::regclass
  ) THEN
    ALTER TABLE spoken_languages ADD PRIMARY KEY (iso_639_1);
  END IF;
END $$;