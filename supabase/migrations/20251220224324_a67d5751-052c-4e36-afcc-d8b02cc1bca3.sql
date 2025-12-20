-- Optimized function to fetch ALL titles needing classification
-- Uses LEFT JOINs with DISTINCT instead of NOT EXISTS for better performance
-- No limit by default - fetch everything at once

CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL::uuid, p_limit integer DEFAULT NULL)
 RETURNS TABLE(id uuid, name text, title_type text, overview text, trailer_transcript text, original_language text, title_genres json)
 LANGUAGE sql
 STABLE
 SET statement_timeout TO '120s'
AS $function$
  SELECT DISTINCT ON (t.id)
    t.id,
    t.name,
    t.title_type,
    t.overview,
    t.trailer_transcript,
    t.original_language,
    t.title_genres
  FROM titles t
  LEFT JOIN title_emotional_signatures tes ON tes.title_id = t.id
  LEFT JOIN title_emotional_signatures_staging tess ON tess.title_id = t.id
  LEFT JOIN viib_intent_classified_titles vit ON vit.title_id = t.id
  LEFT JOIN viib_intent_classified_titles_staging vits ON vits.title_id = t.id
  WHERE
    (p_cursor IS NULL OR t.id > p_cursor)
    AND (
      -- Needs EMOTION classification: not in either table OR stale
      (tes.title_id IS NULL AND tess.title_id IS NULL)
      OR (tes.title_id IS NOT NULL AND tes.updated_at < NOW() - INTERVAL '7 days')
      -- OR needs INTENT classification: not in either table OR stale
      OR (vit.title_id IS NULL AND vits.title_id IS NULL)
      OR (vit.title_id IS NOT NULL AND vit.updated_at < NOW() - INTERVAL '7 days')
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$function$;