-- Optimize get_job_classification_metrics to avoid timeout on large staging tables
-- Use reltuples for approximate counts which is much faster

CREATE OR REPLACE FUNCTION public.get_job_classification_metrics()
RETURNS TABLE(
  total_titles bigint, 
  emotion_primary_distinct bigint, 
  emotion_staging_distinct bigint, 
  intent_primary_distinct bigint, 
  intent_staging_distinct bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET statement_timeout TO '5s'
AS $function$
  SELECT 
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'titles') AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles) AS emotion_primary_distinct,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'viib_emotion_classified_titles_staging') AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles) AS intent_primary_distinct,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'viib_intent_classified_titles_staging') AS intent_staging_distinct;
$function$;