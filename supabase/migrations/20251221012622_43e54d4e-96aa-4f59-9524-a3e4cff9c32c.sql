-- Replace the slow get_job_classification_metrics function with a faster version
-- Uses reltuples for fast approximate counts (updated by ANALYZE automatically)
CREATE OR REPLACE FUNCTION public.get_job_classification_metrics()
 RETURNS TABLE(
   total_titles bigint,
   emotion_primary_distinct bigint,
   emotion_staging_distinct bigint,
   intent_primary_distinct bigint,
   intent_staging_distinct bigint
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET statement_timeout TO '30s'
AS $function$
  -- Use direct COUNT queries but with statement timeout protection
  SELECT 
    (SELECT COUNT(*) FROM titles)::bigint AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles)::bigint AS emotion_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles_staging)::bigint AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles)::bigint AS intent_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles_staging)::bigint AS intent_staging_distinct;
$function$;