-- Add unique constraints to prevent duplicate genre and language mappings
-- These ensure each title can only have each genre once and each language once per type

-- title_genres: prevent duplicate title-genre pairs
ALTER TABLE public.title_genres 
  DROP CONSTRAINT IF EXISTS title_genres_pkey CASCADE;

ALTER TABLE public.title_genres 
  ADD CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id);

-- title_languages: prevent duplicate title-language-type combinations
ALTER TABLE public.title_languages 
  DROP CONSTRAINT IF EXISTS title_languages_pkey CASCADE;

ALTER TABLE public.title_languages 
  ADD CONSTRAINT title_languages_pkey PRIMARY KEY (title_id, language_code, language_type);

-- title_streaming_availability: prevent duplicate title-service-region combinations
ALTER TABLE public.title_streaming_availability 
  DROP CONSTRAINT IF EXISTS title_streaming_availability_pkey CASCADE;

ALTER TABLE public.title_streaming_availability 
  ADD CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code);