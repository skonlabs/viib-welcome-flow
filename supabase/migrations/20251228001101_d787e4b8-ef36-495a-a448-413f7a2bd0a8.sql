-- ============================================================================
-- Update Recommendation Formula
-- Date: December 28, 2025
--
-- New Formula: FinalScore = (0.35E + 0.30H + 0.15C + 0.10V + 0.10N) × (1 + min(0.35, 0.25 × S))
-- Where:
--   E = Emotional (35%)
--   H = Historical (30%)
--   C = Context (15%)
--   V = Vibe (10%)
--   N = Novelty (10%)
--   S = Social (multiplier, not additive weight)
--
-- Social is now a boost multiplier that can add up to 35% to the score
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
    -- Weights from config (Social is used as multiplier, not weight)
    w_emotional      REAL := 0.35;
    w_historical     REAL := 0.30;
    w_context        REAL := 0.15;
    w_vibe           REAL := 0.10;
    w_novelty        REAL := 0.10;
    
    v_user_has_emotion BOOLEAN := FALSE;
    v_user_has_subscriptions BOOLEAN := FALSE;
    v_user_has_language_prefs BOOLEAN := FALSE;
    v_user_vibe_type TEXT := NULL;
    
    -- Neutral-low default for missing data (NOT average)
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

    -- Get user's vibe preference
    SELECT vibe_type INTO v_user_vibe_type
    FROM user_vibe_preferences
    WHERE user_id = p_user_id
    LIMIT 1;

    -- Load active weights if available (Social not included - it's a multiplier)
    SELECT
        COALESCE(emotional_weight, 0.35),
        COALESCE(historical_weight, 0.30),
        COALESCE(context_weight, 0.15),
        COALESCE(vibe_weight, 0.10),
        COALESCE(novelty_weight, 0.10)
    INTO w_emotional, w_historical, w_context, w_vibe, w_novelty
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
            AND (
                NOT v_user_has_language_prefs
                OR EXISTS (
                    SELECT 1 FROM user_languages ul
                    WHERE ul.language_code = t.original_language
                )
            )
            AND NOT EXISTS (
                SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id
            )
    ),

    -- Combine cold start and regular candidates
    all_candidates AS (
        SELECT cid FROM candidate_titles
        UNION
        SELECT cid FROM cold_start_candidates
    ),

    -- Pre-filter to top 300 by social recommendations and popularity
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

    -- Calculate vibe alignment score based on user's vibe preference
    vibe_scores AS (
        SELECT
            pf.cid,
            CASE
                WHEN v_user_vibe_type IS NULL THEN DEFAULT_SCORE_LOW
                ELSE COALESCE(
                    (
                        SELECT SUM(vew.weight * (vec.intensity_level / 10.0)) / NULLIF(COUNT(*), 0)
                        FROM viib_emotion_classified_titles vec
                        JOIN vibes v ON v.label = v_user_vibe_type
                        JOIN vibe_emotion_weights vew ON vew.vibe_id = v.id AND vew.emotion_id = vec.emotion_id
                        WHERE vec.title_id = pf.cid
                    ),
                    DEFAULT_SCORE_LOW
                )
            END AS vibe_component
        FROM prefiltered pf
    ),

    -- Calculate full score components for pre-filtered titles
    -- NEW FORMULA: base = 0.35E + 0.30H + 0.15C + 0.10V + 0.10N
    scored AS (
        SELECT
            pf.cid,
            COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW) AS emotional_component,
            COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO) AS social_component,
            COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) AS historical_component,
            COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) AS context_component,
            COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) AS novelty_component,
            COALESCE(vs.vibe_component, DEFAULT_SCORE_LOW) AS vibe_component,
            (
                COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW) * w_emotional +
                COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) * w_historical +
                COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) * w_context +
                COALESCE(vs.vibe_component, DEFAULT_SCORE_LOW) * w_vibe +
                COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) * w_novelty
            ) AS base_score,
            COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO) AS raw_social
        FROM prefiltered pf
        LEFT JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc ON TRUE
        LEFT JOIN vibe_scores vs ON vs.cid = pf.cid
    ),

    -- Get top 100 by base score for intent scoring
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component, s.raw_social
        FROM scored s
        ORDER BY s.base_score DESC
        LIMIT 100
    ),

    -- Add intent alignment and calculate social boost
    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            tb.emotional_component,
            tb.raw_social,
            COALESCE(viib_intent_alignment_score(p_user_id, tb.cid), 1.0) AS intent_score,
            COALESCE(viib_social_priority_score(p_user_id, tb.cid), DEFAULT_SCORE_ZERO) AS social_score
        FROM top_base tb
    ),

    -- Apply NEW FORMULA: final = base × (1 + min(0.35, 0.25 × S)) × intent
    combined AS (
        SELECT
            wi.cid,
            wi.base_score,
            wi.intent_score,
            wi.social_score,
            wi.emotional_component AS trans_score,
            -- NEW FORMULA: FinalScore = base × (1 + min(0.35, 0.25 × S)) × intent
            (
                wi.base_score 
                * (1.0 + LEAST(0.35, 0.25 * wi.social_score))
                * wi.intent_score
            ) AS combined_score
        FROM with_intent wi
    ),

    -- Get explanations
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_top_recommendations_v2(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_recommendations_v2(uuid, integer) TO service_role;

-- ============================================================================
-- Update the active weights in viib_weight_config to match new formula
-- Social is now 0 as weight (it's used as multiplier in the formula)
-- ============================================================================
UPDATE public.viib_weight_config 
SET 
  emotional_weight = 0.35,
  historical_weight = 0.30,
  context_weight = 0.15,
  vibe_weight = 0.10,
  novelty_weight = 0.10,
  social_weight = 0.00,
  notes = 'Updated formula: base = 0.35E + 0.30H + 0.15C + 0.10V + 0.10N, Social is now a multiplier (1 + min(0.35, 0.25×S))'
WHERE is_active = true;