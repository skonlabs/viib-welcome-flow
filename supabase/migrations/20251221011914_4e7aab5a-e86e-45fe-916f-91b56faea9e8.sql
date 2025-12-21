-- Drop and recreate the function with accurate distinct title counts for staging
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
SET statement_timeout TO '10s'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM titles) AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles) AS emotion_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles_staging) AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles) AS intent_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles_staging) AS intent_staging_distinct;
$$;