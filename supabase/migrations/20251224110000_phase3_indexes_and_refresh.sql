-- ============================================================================
-- PHASE 3: PERFORMANCE INDEXES AND REFRESH UTILITIES
-- This migration adds:
-- 1. Performance indexes for recommendation queries
-- 2. Master refresh function to update all recommendation caches
-- 3. Utility function to check cache freshness
-- ============================================================================

-- ============================================================================
-- PART 1: PERFORMANCE INDEXES
-- These indexes dramatically improve recommendation query performance
-- ============================================================================

-- Index for title_transformation_scores lookups by user emotion
CREATE INDEX IF NOT EXISTS idx_tts_user_emotion_id
ON public.title_transformation_scores(user_emotion_id);

-- Index for emotion_to_intent_map joins on intent_type
CREATE INDEX IF NOT EXISTS idx_e2i_intent_type
ON public.emotion_to_intent_map(intent_type);

-- Index for user_emotion_states to quickly get latest emotion
CREATE INDEX IF NOT EXISTS idx_ues_user_created
ON public.user_emotion_states(user_id, created_at DESC);

-- Index for viib_emotion_classified_titles emotion lookups
CREATE INDEX IF NOT EXISTS idx_vect_emotion_id
ON public.viib_emotion_classified_titles(emotion_id);

-- Index for viib_emotion_classified_titles title lookups
CREATE INDEX IF NOT EXISTS idx_vect_title_id
ON public.viib_emotion_classified_titles(title_id);

-- Index for viib_intent_classified_titles intent lookups
CREATE INDEX IF NOT EXISTS idx_vict_intent_type
ON public.viib_intent_classified_titles(intent_type);

-- Index for viib_intent_classified_titles title lookups
CREATE INDEX IF NOT EXISTS idx_vict_title_id
ON public.viib_intent_classified_titles(title_id);

-- Index for friend_connections user lookups
CREATE INDEX IF NOT EXISTS idx_fc_user_id
ON public.friend_connections(user_id);

-- Index for user_title_interactions for history lookups
CREATE INDEX IF NOT EXISTS idx_uti_user_title
ON public.user_title_interactions(user_id, title_id);

-- Index for title_user_emotion_match_cache
CREATE INDEX IF NOT EXISTS idx_tuemc_user_emotion
ON public.title_user_emotion_match_cache(user_emotion_id);


-- ============================================================================
-- PART 2: MASTER REFRESH FUNCTION
-- Call this after emotion classification jobs complete
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_all_recommendation_caches()
RETURNS TABLE(
    step TEXT,
    status TEXT,
    rows_affected BIGINT,
    duration_ms NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '600s'
AS $function$
DECLARE
    v_start_time TIMESTAMP;
    v_step_start TIMESTAMP;
    v_rows BIGINT;
BEGIN
    v_start_time := clock_timestamp();

    -- Step 1: Refresh title emotion vectors
    v_step_start := clock_timestamp();
    INSERT INTO public.title_emotion_vectors (title_id, valence, arousal, dominance, emotion_strength, updated_at)
    SELECT
        vec.title_id,
        AVG(em.valence * (vec.intensity_level / 10.0))::real AS valence,
        AVG(em.arousal * (vec.intensity_level / 10.0))::real AS arousal,
        AVG(em.dominance * (vec.intensity_level / 10.0))::real AS dominance,
        AVG(vec.intensity_level / 10.0)::real AS emotion_strength,
        now() AS updated_at
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    GROUP BY vec.title_id
    ON CONFLICT (title_id) DO UPDATE SET
        valence = EXCLUDED.valence,
        arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance,
        emotion_strength = EXCLUDED.emotion_strength,
        updated_at = now();
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    step := 'title_emotion_vectors';
    status := 'completed';
    rows_affected := v_rows;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_step_start);
    RETURN NEXT;

    -- Step 2: Refresh title transformation scores with Phase 1/2 weights
    v_step_start := clock_timestamp();
    INSERT INTO public.title_transformation_scores (title_id, user_emotion_id, transformation_score, updated_at)
    SELECT
        vect.title_id,
        etm.user_emotion_id,
        (
            etm.confidence_score *
            CASE etm.transformation_type
                WHEN 'amplify' THEN 1.0
                WHEN 'complementary' THEN 0.95
                WHEN 'soothe' THEN 0.9
                WHEN 'validate' THEN 0.85
                WHEN 'reinforcing' THEN 0.8
                WHEN 'neutral_balancing' THEN 0.7
                WHEN 'stabilize' THEN 0.65
                ELSE 0.5
            END *
            (vect.intensity_level / 10.0)
        )::real AS transformation_score,
        now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em_content
        ON em_content.id = vect.emotion_id
       AND em_content.category = 'content_state'
    JOIN emotion_transformation_map etm
        ON etm.content_emotion_id = vect.emotion_id
    ON CONFLICT (title_id, user_emotion_id)
    DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = now();
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    step := 'title_transformation_scores';
    status := 'completed';
    rows_affected := v_rows;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_step_start);
    RETURN NEXT;

    -- Step 3: Refresh intent alignment scores
    v_step_start := clock_timestamp();
    INSERT INTO public.title_intent_alignment_scores (title_id, user_emotion_id, alignment_score, updated_at)
    SELECT
        vit.title_id,
        e2i.emotion_id AS user_emotion_id,
        (
            SUM(e2i.weight * vit.confidence_score * COALESCE(tts.transformation_score, 0.5))
            / NULLIF(SUM(e2i.weight), 0)
        )::real AS alignment_score,
        now() AS updated_at
    FROM viib_intent_classified_titles vit
    JOIN emotion_to_intent_map e2i
        ON e2i.intent_type = vit.intent_type
    LEFT JOIN title_transformation_scores tts
        ON tts.title_id = vit.title_id
       AND tts.user_emotion_id = e2i.emotion_id
    GROUP BY vit.title_id, e2i.emotion_id
    ON CONFLICT (title_id, user_emotion_id)
    DO UPDATE SET
        alignment_score = EXCLUDED.alignment_score,
        updated_at = now();
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    step := 'title_intent_alignment_scores';
    status := 'completed';
    rows_affected := v_rows;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_step_start);
    RETURN NEXT;

    -- Step 4: Refresh social summary
    v_step_start := clock_timestamp();
    INSERT INTO public.title_social_summary (title_id, avg_rating, rating_count, recommendation_count, updated_at)
    SELECT
        t.id AS title_id,
        COALESCE(AVG(
            CASE uti.rating_value
                WHEN 'love_it' THEN 5
                WHEN 'like_it' THEN 4
                WHEN 'ok' THEN 3
                WHEN 'dislike' THEN 2
                WHEN 'hate' THEN 1
                ELSE NULL
            END
        ), 0)::real AS avg_rating,
        COUNT(uti.rating_value)::int AS rating_count,
        COUNT(DISTINCT usr.id)::int AS recommendation_count,
        now() AS updated_at
    FROM titles t
    LEFT JOIN user_title_interactions uti ON uti.title_id = t.id AND uti.rating_value IS NOT NULL
    LEFT JOIN user_social_recommendations usr ON usr.title_id = t.id
    GROUP BY t.id
    ON CONFLICT (title_id) DO UPDATE SET
        avg_rating = EXCLUDED.avg_rating,
        rating_count = EXCLUDED.rating_count,
        recommendation_count = EXCLUDED.recommendation_count,
        updated_at = now();
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    step := 'title_social_summary';
    status := 'completed';
    rows_affected := v_rows;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_step_start);
    RETURN NEXT;

    -- Final: Report total duration
    step := 'TOTAL';
    status := 'completed';
    rows_affected := 0;
    duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time);
    RETURN NEXT;
END;
$function$;


-- ============================================================================
-- PART 3: CACHE FRESHNESS CHECK
-- Use this to monitor if caches need refreshing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_recommendation_cache_freshness()
RETURNS TABLE(
    cache_name TEXT,
    row_count BIGINT,
    oldest_update TIMESTAMP WITH TIME ZONE,
    newest_update TIMESTAMP WITH TIME ZONE,
    age_hours NUMERIC,
    needs_refresh BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT
        'title_emotion_vectors' AS cache_name,
        COUNT(*)::bigint AS row_count,
        MIN(updated_at) AS oldest_update,
        MAX(updated_at) AS newest_update,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 AS age_hours,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24 AS needs_refresh
    FROM title_emotion_vectors

    UNION ALL

    SELECT
        'title_transformation_scores',
        COUNT(*)::bigint,
        MIN(updated_at),
        MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_transformation_scores

    UNION ALL

    SELECT
        'title_intent_alignment_scores',
        COUNT(*)::bigint,
        MIN(updated_at),
        MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_intent_alignment_scores

    UNION ALL

    SELECT
        'title_social_summary',
        COUNT(*)::bigint,
        MIN(updated_at),
        MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_social_summary;
$function$;


-- ============================================================================
-- PART 4: IMMEDIATE CACHE REFRESH
-- Run this once after migration to populate caches with new weights
-- ============================================================================

-- Wrap in DO block to execute immediately
DO $$
DECLARE
    v_result RECORD;
BEGIN
    RAISE NOTICE 'Starting recommendation cache refresh...';

    FOR v_result IN SELECT * FROM refresh_all_recommendation_caches() LOOP
        RAISE NOTICE 'Step: %, Status: %, Rows: %, Duration: %ms',
            v_result.step,
            v_result.status,
            v_result.rows_affected,
            v_result.duration_ms;
    END LOOP;

    RAISE NOTICE 'Cache refresh complete!';
END $$;


-- ============================================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.refresh_all_recommendation_caches() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recommendation_cache_freshness() TO authenticated;


-- ============================================================================
-- PHASE 3 COMPLETE
-- Summary:
-- 1. Added 11 performance indexes for recommendation queries
-- 2. Created refresh_all_recommendation_caches() master refresh function
-- 3. Created check_recommendation_cache_freshness() monitoring function
-- 4. Executed immediate cache refresh with Phase 1/2 weights
-- ============================================================================
