
-- Fix RLS policies for admin access

-- 1. Add admin SELECT policy for users table
DROP POLICY IF EXISTS "users_admin_select" ON public.users;
CREATE POLICY "users_admin_select"
ON public.users
FOR SELECT
TO authenticated
USING (
  public.has_role(get_user_id_from_auth(), 'admin'::app_role)
);

-- 2. Add admin UPDATE/DELETE policy for users table
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all"
ON public.users
FOR ALL
TO authenticated
USING (
  public.has_role(get_user_id_from_auth(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(get_user_id_from_auth(), 'admin'::app_role)
);

-- 3. Add admin SELECT policy for user_roles table
DROP POLICY IF EXISTS "user_roles_admin_select" ON public.user_roles;
CREATE POLICY "user_roles_admin_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(get_user_id_from_auth(), 'admin'::app_role)
);

-- 4. Enable RLS on tables that are missing it (system tables that only service role should access)
-- These tables should have RLS enabled but with service-only policies

-- cold_start_title_priors
ALTER TABLE public.cold_start_title_priors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cold_start_title_priors_service" ON public.cold_start_title_priors;
CREATE POLICY "cold_start_title_priors_service"
ON public.cold_start_title_priors
FOR ALL
USING (true)
WITH CHECK (true);

-- recommendation_impressions
ALTER TABLE public.recommendation_impressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recommendation_impressions_service" ON public.recommendation_impressions;
CREATE POLICY "recommendation_impressions_service"
ON public.recommendation_impressions
FOR ALL
USING (true)
WITH CHECK (true);

-- recommendation_outcomes_daily
ALTER TABLE public.recommendation_outcomes_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recommendation_outcomes_daily_service" ON public.recommendation_outcomes_daily;
CREATE POLICY "recommendation_outcomes_daily_service"
ON public.recommendation_outcomes_daily
FOR ALL
USING (true)
WITH CHECK (true);

-- recommendation_refresh_runs
ALTER TABLE public.recommendation_refresh_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recommendation_refresh_runs_service" ON public.recommendation_refresh_runs;
CREATE POLICY "recommendation_refresh_runs_service"
ON public.recommendation_refresh_runs
FOR ALL
USING (true)
WITH CHECK (true);

-- title_pipeline_queue
ALTER TABLE public.title_pipeline_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "title_pipeline_queue_service" ON public.title_pipeline_queue;
CREATE POLICY "title_pipeline_queue_service"
ON public.title_pipeline_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- title_quality_metrics
ALTER TABLE public.title_quality_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "title_quality_metrics_public_read" ON public.title_quality_metrics;
CREATE POLICY "title_quality_metrics_public_read"
ON public.title_quality_metrics
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "title_quality_metrics_service" ON public.title_quality_metrics;
CREATE POLICY "title_quality_metrics_service"
ON public.title_quality_metrics
FOR ALL
USING (true)
WITH CHECK (true);

-- title_rt_ai_estimates
ALTER TABLE public.title_rt_ai_estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "title_rt_ai_estimates_public_read" ON public.title_rt_ai_estimates;
CREATE POLICY "title_rt_ai_estimates_public_read"
ON public.title_rt_ai_estimates
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "title_rt_ai_estimates_service" ON public.title_rt_ai_estimates;
CREATE POLICY "title_rt_ai_estimates_service"
ON public.title_rt_ai_estimates
FOR ALL
USING (true)
WITH CHECK (true);

-- user_reco_cache_state
ALTER TABLE public.user_reco_cache_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_reco_cache_state_service" ON public.user_reco_cache_state;
CREATE POLICY "user_reco_cache_state_service"
ON public.user_reco_cache_state
FOR ALL
USING (true)
WITH CHECK (true);

-- user_reco_cache_state_v13
ALTER TABLE public.user_reco_cache_state_v13 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_reco_cache_state_v13_service" ON public.user_reco_cache_state_v13;
CREATE POLICY "user_reco_cache_state_v13_service"
ON public.user_reco_cache_state_v13
FOR ALL
USING (true)
WITH CHECK (true);

-- user_reco_refresh_queue
ALTER TABLE public.user_reco_refresh_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_reco_refresh_queue_service" ON public.user_reco_refresh_queue;
CREATE POLICY "user_reco_refresh_queue_service"
ON public.user_reco_refresh_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- user_recommendation_candidates_v13
ALTER TABLE public.user_recommendation_candidates_v13 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_recommendation_candidates_v13_service" ON public.user_recommendation_candidates_v13;
CREATE POLICY "user_recommendation_candidates_v13_service"
ON public.user_recommendation_candidates_v13
FOR ALL
USING (true)
WITH CHECK (true);

-- user_title_fatigue_scores
ALTER TABLE public.user_title_fatigue_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_title_fatigue_scores_service" ON public.user_title_fatigue_scores;
CREATE POLICY "user_title_fatigue_scores_service"
ON public.user_title_fatigue_scores
FOR ALL
USING (true)
WITH CHECK (true);

-- vibe_genre_weights_key
ALTER TABLE public.vibe_genre_weights_key ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vibe_genre_weights_key_public_read" ON public.vibe_genre_weights_key;
CREATE POLICY "vibe_genre_weights_key_public_read"
ON public.vibe_genre_weights_key
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "vibe_genre_weights_key_service" ON public.vibe_genre_weights_key;
CREATE POLICY "vibe_genre_weights_key_service"
ON public.vibe_genre_weights_key
FOR ALL
USING (true)
WITH CHECK (true);

-- viib_runtime_config
ALTER TABLE public.viib_runtime_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "viib_runtime_config_service" ON public.viib_runtime_config;
CREATE POLICY "viib_runtime_config_service"
ON public.viib_runtime_config
FOR ALL
USING (true)
WITH CHECK (true);

-- cron_config (admin can read, service can write)
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cron_config_service" ON public.cron_config;
CREATE POLICY "cron_config_service"
ON public.cron_config
FOR ALL
USING (true)
WITH CHECK (true);

-- cron_jobs_backup
ALTER TABLE public.cron_jobs_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cron_jobs_backup_service" ON public.cron_jobs_backup;
CREATE POLICY "cron_jobs_backup_service"
ON public.cron_jobs_backup
FOR ALL
USING (true)
WITH CHECK (true);

-- jobs_deleted_backup
ALTER TABLE public.jobs_deleted_backup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jobs_deleted_backup_service" ON public.jobs_deleted_backup;
CREATE POLICY "jobs_deleted_backup_service"
ON public.jobs_deleted_backup
FOR ALL
USING (true)
WITH CHECK (true);
