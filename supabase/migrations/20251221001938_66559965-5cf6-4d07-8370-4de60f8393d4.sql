CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, title_type text, overview text, trailer_transcript text, original_language text, title_genres json)
 LANGUAGE sql
 STABLE
 SET statement_timeout TO '120s'
AS $function$
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
    t.id > COALESCE(p_cursor, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- EMOTION LOGIC: Pick if (not in primary AND not in staging) OR (primary > 7 days old)
      (
        (
          NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec WHERE vec.title_id = t.id)
          AND NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles_staging vecs WHERE vecs.title_id = t.id)
        )
        OR EXISTS (
          SELECT 1 FROM viib_emotion_classified_titles vec 
          WHERE vec.title_id = t.id 
          AND vec.updated_at < NOW() - INTERVAL '7 days'
        )
      )
      OR
      -- INTENT LOGIC: Pick if (not in primary AND not in staging) OR (primary > 7 days old)
      (
        (
          NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id)
          AND NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id)
        )
        OR EXISTS (
          SELECT 1 FROM viib_intent_classified_titles vit 
          WHERE vit.title_id = t.id 
          AND vit.updated_at < NOW() - INTERVAL '7 days'
        )
      )
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$function$;