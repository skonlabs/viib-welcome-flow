-- Recreate with the CORRECT logic from the decision matrix:
-- Pick if: (NOT in primary AND NOT in staging) OR (in primary but older than 7 days)
-- A title is picked if EITHER emotion OR intent needs classification

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
  WITH emotion_status AS (
    -- Check emotion classification status for each title
    SELECT 
      t.id AS title_id,
      EXISTS (SELECT 1 FROM title_emotional_signatures tes WHERE tes.title_id = t.id) AS in_primary,
      EXISTS (SELECT 1 FROM title_emotional_signatures_staging tess WHERE tess.title_id = t.id) AS in_staging,
      EXISTS (
        SELECT 1 FROM title_emotional_signatures tes 
        WHERE tes.title_id = t.id 
        AND tes.updated_at < NOW() - INTERVAL '7 days'
      ) AS is_stale
    FROM titles t
    WHERE (p_cursor IS NULL OR t.id > p_cursor)
  ),
  intent_status AS (
    -- Check intent classification status for each title
    SELECT 
      t.id AS title_id,
      EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id) AS in_primary,
      EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id) AS in_staging,
      EXISTS (
        SELECT 1 FROM viib_intent_classified_titles vit 
        WHERE vit.title_id = t.id 
        AND vit.updated_at < NOW() - INTERVAL '7 days'
      ) AS is_stale
    FROM titles t
    WHERE (p_cursor IS NULL OR t.id > p_cursor)
  ),
  needs_classification AS (
    SELECT es.title_id
    FROM emotion_status es
    JOIN intent_status ist ON ist.title_id = es.title_id
    WHERE
      -- Emotion needs classification: (not in primary AND not in staging) OR (stale in primary)
      (
        (NOT es.in_primary AND NOT es.in_staging)
        OR es.is_stale
      )
      OR
      -- Intent needs classification: (not in primary AND not in staging) OR (stale in primary)
      (
        (NOT ist.in_primary AND NOT ist.in_staging)
        OR ist.is_stale
      )
  )
  SELECT 
    t.id,
    t.name,
    t.title_type,
    t.overview,
    t.trailer_transcript,
    t.original_language,
    t.title_genres
  FROM titles t
  INNER JOIN needs_classification nc ON nc.title_id = t.id
  ORDER BY t.id ASC
  LIMIT p_limit;
$$;