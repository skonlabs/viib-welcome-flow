-- Fix get_titles_needing_classification to properly handle gaps
-- The issue: titles early in the UUID range may need classification but cursor skips them

CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(
  p_cursor uuid DEFAULT NULL::uuid, 
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
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
SET statement_timeout TO '120s'
AS $function$
  -- Get titles that are missing EITHER emotions OR intents (in both primary and staging)
  -- Ignores cursor for checking - ensures no gaps are missed
  SELECT DISTINCT ON (t.id)
    t.id,
    t.name,
    t.title_type,
    t.overview,
    t.trailer_transcript,
    t.original_language,
    t.title_genres
  FROM titles t
  WHERE
    -- Missing emotions (not in primary AND not in staging)
    (
      NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec WHERE vec.title_id = t.id)
      AND NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles_staging vecs WHERE vecs.title_id = t.id)
    )
    OR
    -- Missing intents (not in primary AND not in staging)  
    (
      NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id)
      AND NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id)
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$function$;