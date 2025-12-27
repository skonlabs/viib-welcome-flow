-- ============================================================================
-- Fix Recommendation Default Scores
-- Date: December 27, 2025
--
-- Requirement: "Default scores for missing data must NOT inflate rankings.
-- Missing data should be neutral-low, not average."
--
-- Changes defaults from 0.5 (average) to 0.3 (neutral-low) to prevent
-- titles with missing data from being ranked higher than they should be.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    title_id UUID,
    base_viib_score REAL,
    intent_alignment_score REAL,
    social_priority_score REAL,
    transformation_score REAL,
    final_score REAL,
    recommendation_reason TEXT
)
LANGUAGE plpgsql
STABLE
SET statement_timeout = '60s'
AS $$
DECLARE
    w_emotional      REAL := 0.35;
    w_social         REAL := 0.20;
    w_historical     REAL := 0.25;
    w_context        REAL := 0.10;
    w_novelty        REAL := 0.10;
    v_user_has_emotion BOOLEAN := FALSE;
    v_user_has_subscriptions BOOLEAN := FALSE;
    v_user_has_language_prefs BOOLEAN := FALSE;
    -- Neutral-low default for missing data (NOT average)
    -- This prevents titles with missing data from being inflated
    DEFAULT_SCORE_LOW CONSTANT REAL := 0.3;
    DEFAULT_SCORE_ZERO CONSTANT REAL := 0.0;
BEGIN
    -- Check if user has emotion state
    SELECT EXISTS(
        SELECT 1 FROM user_emotion_states WHERE user_id = p_user_id
    ) INTO v_user_has_emotion;

    -- Check if user has streaming subscriptions
    SELECT EXISTS(
        SELECT 1 FROM user_streaming_subscriptions
        WHERE user_id = p_user_id AND is_active = TRUE
    ) INTO v_user_has_subscriptions;

    -- Check if user has language preferences
    SELECT EXISTS(
        SELECT 1 FROM user_language_preferences
        WHERE user_id = p_user_id
    ) INTO v_user_has_language_prefs;

    -- Load active weights if available
    SELECT
        COALESCE(emotional_weight, 0.35),
        COALESCE(social_weight, 0.20),
        COALESCE(historical_weight, 0.25),
        COALESCE(context_weight, 0.10),
        COALESCE(novelty_weight, 0.10)
    INTO w_emotional, w_social, w_historical, w_context, w_novelty
    FROM viib_weight_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN QUERY
    WITH
    -- User's interacted titles (for exclusion using NOT EXISTS pattern)
    user_interactions AS (
        SELECT DISTINCT uti.title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
          AND uti.interaction_type IN ('completed', 'disliked')
    ),

    -- User's language preferences
    user_languages AS (
        SELECT language_code
        FROM user_language_preferences
        WHERE user_id = p_user_id
    ),

    -- Cold start fallback: Get popular titles if user has no emotion state
    cold_start_candidates AS (
        SELECT DISTINCT t.id AS cid, t.popularity
        FROM titles t
        WHERE t.classification_status = 'complete'
          AND NOT v_user_has_emotion
          -- Use NOT EXISTS instead of NOT IN (handles NULLs correctly)
          AND NOT EXISTS (
              SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id
          )
        ORDER BY t.popularity DESC
        LIMIT 50
    ),

    -- Regular candidate selection for users with preferences
    candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE
            t.classification_status = 'complete'
            AND v_user_has_emotion
            -- Available on user's streaming services (if they have any)
            AND (
                NOT v_user_has_subscriptions
                OR EXISTS (
                    SELECT 1
                    FROM title_streaming_availability tsa
                    JOIN user_streaming_subscriptions uss
                        ON uss.streaming_service_id = tsa.streaming_service_id
                        AND uss.user_id = p_user_id
                        AND uss.is_active = TRUE
                    WHERE tsa.title_id = t.id
                )
            )
            -- Handle empty language preferences gracefully
            AND (
                NOT v_user_has_language_prefs
                OR EXISTS (
                    SELECT 1 FROM user_languages ul
                    WHERE ul.language_code = t.original_language
                )
            )
            -- Use NOT EXISTS instead of NOT IN
            AND NOT EXISTS (
                SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id
            )
    ),

    -- Combine cold start and regular candidates (DISTINCT already applied above)
    all_candidates AS (
        SELECT cid FROM candidate_titles
        UNION  -- UNION removes duplicates automatically
        SELECT cid FROM cold_start_candidates
    ),

    -- Pre-filter to top 300 by social recommendations and popularity
    -- Social recommendations get priority over pure popularity
    prefiltered AS (
        SELECT
            ac.cid,
            COALESCE(rec.rec_count, 0) AS social_rec_count,
            COALESCE(t.popularity, 0) AS popularity_score
        FROM all_candidates ac
        JOIN titles t ON t.id = ac.cid
        LEFT JOIN (
            SELECT usr.title_id, COUNT(*) AS rec_count
            FROM user_social_recommendations usr
            WHERE usr.receiver_user_id = p_user_id
            GROUP BY usr.title_id
        ) rec ON rec.title_id = ac.cid
        ORDER BY social_rec_count DESC, popularity_score DESC
        LIMIT 300
    ),

    -- Calculate full score components for pre-filtered titles
    -- IMPORTANT: Use neutral-LOW defaults (0.3) for missing data, NOT average (0.5)
    -- This prevents titles with missing data from being inflated in rankings
    scored AS (
        SELECT
            pf.cid,
            COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW) AS emotional_component,
            COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO) AS social_component,
            COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) AS historical_component,
            COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) AS context_component,
            COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) AS novelty_component,
            (
                COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW) * w_emotional +
                COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO) * w_social +
                COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) * w_historical +
                COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) * w_context +
                COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) * w_novelty
            ) AS base_score
        FROM prefiltered pf
        LEFT JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc ON TRUE
    ),

    -- Get top 100 by base score for intent scoring
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component
        FROM scored s
        ORDER BY s.base_score DESC
        LIMIT 100
    ),

    -- Add intent alignment and social priority (with COALESCE for safety)
    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            tb.emotional_component,
            COALESCE(viib_intent_alignment_score(p_user_id, tb.cid), 1.0) AS intent_score,
            COALESCE(viib_social_priority_score(p_user_id, tb.cid), DEFAULT_SCORE_ZERO) AS social_score
        FROM top_base tb
    ),

    -- Combine scores
    combined AS (
        SELECT
            wi.cid,
            wi.base_score,
            wi.intent_score,
            wi.social_score,
            wi.emotional_component AS trans_score,
            GREATEST(
                wi.base_score * wi.intent_score,
                wi.social_score
            ) AS combined_score
        FROM with_intent wi
    ),

    -- Get explanations (with safe fallback)
    with_explanations AS (
        SELECT
            c.cid,
            c.base_score,
            c.intent_score,
            c.social_score,
            c.trans_score,
            c.combined_score,
            er.primary_reason
        FROM combined c
        LEFT JOIN LATERAL (
            SELECT primary_reason
            FROM explain_recommendation(p_user_id, c.cid)
        ) er ON TRUE
    )

    SELECT
        we.cid AS title_id,
        we.base_score AS base_viib_score,
        we.intent_score AS intent_alignment_score,
        we.social_score AS social_priority_score,
        we.trans_score AS transformation_score,
        we.combined_score AS final_score,
        COALESCE(we.primary_reason, 'Recommended for you') AS recommendation_reason
    FROM with_explanations we
    ORDER BY we.combined_score DESC
    LIMIT p_limit;
END;
$$;


-- ============================================================================
-- Ensure all required indexes exist for recommendation function
-- ============================================================================

-- Index for user_title_interactions exclusion lookup
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_exclusion
    ON user_title_interactions(user_id, interaction_type, title_id)
    WHERE interaction_type IN ('completed', 'disliked');

-- Index for title classification status filtering
CREATE INDEX IF NOT EXISTS idx_titles_classification_status
    ON titles(classification_status)
    WHERE classification_status = 'complete';

-- Index for streaming availability joins
CREATE INDEX IF NOT EXISTS idx_title_streaming_availability_title
    ON title_streaming_availability(title_id, streaming_service_id);

-- Index for user streaming subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_user_streaming_subs_active
    ON user_streaming_subscriptions(user_id, streaming_service_id)
    WHERE is_active = TRUE;

-- Index for language preferences
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_user
    ON user_language_preferences(user_id, language_code);

-- Index for social recommendations
CREATE INDEX IF NOT EXISTS idx_social_recommendations_receiver
    ON user_social_recommendations(receiver_user_id, title_id);

-- Index for emotion states
CREATE INDEX IF NOT EXISTS idx_user_emotion_states_user
    ON user_emotion_states(user_id);
