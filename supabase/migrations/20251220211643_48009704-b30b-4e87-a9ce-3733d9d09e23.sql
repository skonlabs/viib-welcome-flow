-- Create an efficient function to get titles needing classification
-- Uses cursor-based pagination for large datasets
-- Implements the spreadsheet logic: pick if emotion OR intent needs processing

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
  WITH seven_days_ago AS (
    SELECT NOW() - INTERVAL '7 days' AS cutoff
  ),
  -- Emotion status per title (exists in primary, is stale, exists in staging)
  emotion_status AS (
    SELECT DISTINCT ON (t.id)
      t.id AS title_id,
      tes.title_id IS NOT NULL AS in_primary,
      CASE 
        WHEN tes.title_id IS NOT NULL THEN tes.updated_at < (SELECT cutoff FROM seven_days_ago)
        ELSE FALSE 
      END AS is_stale,
      tess.title_id IS NOT NULL AS in_staging
    FROM titles t
    LEFT JOIN LATERAL (
      SELECT title_id, MAX(updated_at) AS updated_at 
      FROM title_emotional_signatures 
      WHERE title_id = t.id 
      GROUP BY title_id
    ) tes ON TRUE
    LEFT JOIN LATERAL (
      SELECT DISTINCT title_id 
      FROM title_emotional_signatures_staging 
      WHERE title_id = t.id 
      LIMIT 1
    ) tess ON TRUE
  ),
  -- Intent status per title
  intent_status AS (
    SELECT DISTINCT ON (t.id)
      t.id AS title_id,
      vit.title_id IS NOT NULL AS in_primary,
      CASE 
        WHEN vit.title_id IS NOT NULL THEN vit.updated_at < (SELECT cutoff FROM seven_days_ago)
        ELSE FALSE 
      END AS is_stale,
      vits.title_id IS NOT NULL AS in_staging
    FROM titles t
    LEFT JOIN LATERAL (
      SELECT title_id, MAX(updated_at) AS updated_at 
      FROM viib_intent_classified_titles 
      WHERE title_id = t.id 
      GROUP BY title_id
    ) vit ON TRUE
    LEFT JOIN LATERAL (
      SELECT DISTINCT title_id 
      FROM viib_intent_classified_titles_staging 
      WHERE title_id = t.id 
      LIMIT 1
    ) vits ON TRUE
  ),
  -- Apply the spreadsheet logic
  titles_to_process AS (
    SELECT t.id
    FROM titles t
    JOIN emotion_status es ON es.title_id = t.id
    JOIN intent_status its ON its.title_id = t.id
    WHERE
      -- Cursor-based pagination
      (p_cursor IS NULL OR t.id > p_cursor)
      AND (
        -- EMOTION: pickEmotion = isStale || (!existsInPrimary && !existsInStaging)
        (es.is_stale = TRUE OR (es.in_primary = FALSE AND es.in_staging = FALSE))
        OR
        -- INTENT: pickIntent = isStale || (!existsInPrimary && !existsInStaging)
        (its.is_stale = TRUE OR (its.in_primary = FALSE AND its.in_staging = FALSE))
      )
    ORDER BY t.id ASC
    LIMIT p_limit
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
  JOIN titles_to_process ttp ON ttp.id = t.id
  ORDER BY t.id ASC;
$$;