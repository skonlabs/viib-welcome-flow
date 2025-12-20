-- Optimized version: Direct EXISTS checks without CTEs (much faster)
-- CTEs were causing full table scans - this uses index-friendly correlated subqueries

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
SET statement_timeout = '30s'
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
    -- Cursor-based pagination (uses primary key index)
    (p_cursor IS NULL OR t.id > p_cursor)
    AND (
      -- EMOTION needs classification:
      -- Fresh (not in primary AND not in staging) OR stale (in primary but > 7 days old)
      (
        (
          NOT EXISTS (SELECT 1 FROM title_emotional_signatures tes WHERE tes.title_id = t.id)
          AND NOT EXISTS (SELECT 1 FROM title_emotional_signatures_staging tess WHERE tess.title_id = t.id)
        )
        OR EXISTS (
          SELECT 1 FROM title_emotional_signatures tes 
          WHERE tes.title_id = t.id AND tes.updated_at < NOW() - INTERVAL '7 days'
        )
      )
      OR
      -- INTENT needs classification:
      -- Fresh (not in primary AND not in staging) OR stale (in primary but > 7 days old)
      (
        (
          NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id)
          AND NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id)
        )
        OR EXISTS (
          SELECT 1 FROM viib_intent_classified_titles vit 
          WHERE vit.title_id = t.id AND vit.updated_at < NOW() - INTERVAL '7 days'
        )
      )
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$$;

-- Ensure we have indexes on updated_at for stale checks
CREATE INDEX IF NOT EXISTS idx_title_emotional_signatures_updated_at ON title_emotional_signatures(title_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_viib_intent_classified_titles_updated_at ON viib_intent_classified_titles(title_id, updated_at);