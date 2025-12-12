-- Create function to get cron job progress metrics
CREATE OR REPLACE FUNCTION public.get_cron_job_progress()
RETURNS TABLE (
    vector_count bigint,
    transform_count bigint,
    intent_count bigint,
    social_count bigint,
    vector_updated_at timestamptz,
    transform_updated_at timestamptz,
    intent_updated_at timestamptz,
    social_updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        (SELECT COUNT(*) FROM title_emotion_vectors) as vector_count,
        (SELECT COUNT(*) FROM title_transformation_scores) as transform_count,
        (SELECT COUNT(*) FROM title_intent_alignment_scores) as intent_count,
        (SELECT COUNT(*) FROM title_social_summary) as social_count,
        (SELECT MAX(updated_at) FROM title_emotion_vectors) as vector_updated_at,
        (SELECT MAX(updated_at) FROM title_transformation_scores) as transform_updated_at,
        (SELECT MAX(updated_at) FROM title_intent_alignment_scores) as intent_updated_at,
        (SELECT MAX(updated_at) FROM title_social_summary) as social_updated_at;
$$;