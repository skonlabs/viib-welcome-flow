-- Increase timeout for get_job_classification_metrics from 30s to 120s
CREATE OR REPLACE FUNCTION public.get_job_classification_metrics()
 RETURNS TABLE(total_titles bigint, emotion_primary_distinct bigint, emotion_staging_distinct bigint, intent_primary_distinct bigint, intent_staging_distinct bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET statement_timeout TO '120s'
AS $function$
  SELECT 
    (SELECT COUNT(*) FROM titles)::bigint AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles)::bigint AS emotion_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles_staging)::bigint AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles)::bigint AS intent_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles_staging)::bigint AS intent_staging_distinct;
$function$;

-- Add timeout to get_cron_job_progress
CREATE OR REPLACE FUNCTION public.get_cron_job_progress()
 RETURNS TABLE(vector_count bigint, transform_count bigint, intent_count bigint, social_count bigint, vector_updated_at timestamp with time zone, transform_updated_at timestamp with time zone, intent_updated_at timestamp with time zone, social_updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
    SELECT 
        (SELECT COUNT(*) FROM title_emotion_vectors) as vector_count,
        (SELECT COUNT(*) FROM title_transformation_scores) as transform_count,
        (SELECT COUNT(*) FROM title_intent_alignment_scores) as intent_count,
        (SELECT COUNT(*) FROM title_social_summary) as social_count,
        (SELECT MAX(updated_at) FROM title_emotion_vectors) as vector_updated_at,
        (SELECT MAX(updated_at) FROM title_transformation_scores) as transform_updated_at,
        (SELECT MAX(updated_at) FROM title_intent_alignment_scores) as intent_updated_at,
        (SELECT MAX(updated_at) FROM title_social_summary) as social_updated_at;
$function$;