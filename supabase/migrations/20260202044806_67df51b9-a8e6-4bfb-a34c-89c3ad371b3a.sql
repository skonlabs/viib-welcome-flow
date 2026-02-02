
-- ============================================================================
-- Remove deprecated v12 recommendation system tables
-- v13 is now the active version - these legacy tables are no longer used
-- ============================================================================

-- Drop v12 tables (cascade to remove any dependent objects)
DROP TABLE IF EXISTS public.reco_refresh_log_v12 CASCADE;
DROP TABLE IF EXISTS public.reco_refresh_queue_v12 CASCADE;
DROP TABLE IF EXISTS public.system_jobs_v12 CASCADE;
DROP TABLE IF EXISTS public.user_recommendation_candidates_v12 CASCADE;

-- Also clean up any remaining old version functions that might still exist
DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v4(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v5(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v6(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v7(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v8(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v9(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v10(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v11(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v12(uuid, integer) CASCADE;

DROP FUNCTION IF EXISTS public.refresh_user_recommendation_candidates_v12(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_recommendation_candidates_v12_replace(uuid, integer) CASCADE;

-- Drop any old enqueue/dequeue functions for v12
DROP FUNCTION IF EXISTS public.enqueue_reco_refresh_v12(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.dequeue_reco_refresh_v12(integer) CASCADE;
DROP FUNCTION IF EXISTS public.complete_reco_refresh_v12(integer, text, text) CASCADE;

-- Verify only v13 exists
COMMENT ON FUNCTION public.get_top_recommendations_v13(uuid, integer) IS 'Active recommendation engine - v13 is the current and only supported version';
