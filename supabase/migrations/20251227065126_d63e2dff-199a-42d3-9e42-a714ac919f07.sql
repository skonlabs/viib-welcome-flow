-- ============================================================================
-- FIX ALL REMAINING FUNCTION SEARCH PATHS
-- ============================================================================

ALTER FUNCTION public.get_cron_jobs() SET search_path = public, cron;
ALTER FUNCTION public.get_job_classification_metrics() SET search_path = public;
ALTER FUNCTION public.get_top_recommendations(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_top_recommendations_with_intent(uuid, integer) SET search_path = public;
ALTER FUNCTION public.refresh_all_recommendation_caches() SET search_path = public;
ALTER FUNCTION public.refresh_title_transformation_scores_batch(integer) SET search_path = public;
ALTER FUNCTION public.refresh_title_user_emotion_match_cache() SET search_path = public;
ALTER FUNCTION public.refresh_user_title_social_scores_recent_users() SET search_path = public;
ALTER FUNCTION public.toggle_cron_job(bigint, boolean) SET search_path = public, cron;
ALTER FUNCTION public.update_cron_schedule(bigint, text) SET search_path = public, cron;

NOTIFY pgrst, 'reload schema';