-- Drop and recreate with optimized version using EXISTS (much faster than LATERAL JOINs)
-- Also create indexes if they don't exist

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_title_emotional_signatures_title_id ON title_emotional_signatures(title_id);
CREATE INDEX IF NOT EXISTS idx_title_emotional_signatures_staging_title_id ON title_emotional_signatures_staging(title_id);
CREATE INDEX IF NOT EXISTS idx_viib_intent_classified_titles_title_id ON viib_intent_classified_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_viib_intent_classified_titles_staging_title_id ON viib_intent_classified_titles_staging(title_id);

-- Optimized function using EXISTS instead of LATERAL JOINs
CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(
  p_cursor uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  title_type text,
  overview text,
  trailer_transcript text,
  original_language text,
  title_genres json
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    t.id,
    t.name,
    t.title_type,
    t.overview,
    t.trailer_transcript,
    t.original_language,
    t.title_genres
  FROM titles t
  WHERE
    -- Cursor-based pagination
    (p_cursor IS NULL OR t.id > p_cursor)
    AND (
      -- Needs emotion classification: not in primary AND not in staging
      (
        NOT EXISTS (SELECT 1 FROM title_emotional_signatures tes WHERE tes.title_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM title_emotional_signatures_staging tess WHERE tess.title_id = t.id)
      )
      OR
      -- Needs intent classification: not in primary AND not in staging  
      (
        NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id)
      )
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$$;