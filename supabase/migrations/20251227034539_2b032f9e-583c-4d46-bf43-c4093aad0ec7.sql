
-- Fix the get_top_recommendations_v2 function to properly calculate scores for cold-start path
-- The issue: cold-start titles get final_score = 0 because they bypass the scoring pipeline

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, transformation_score real, final_score real, recommendation_reason text)
 LANGUAGE plpgsql
 STABLE
 SET statement_timeout TO '60s'
AS $function$
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

    -- Calculate full score components for pre-filtered titles
    -- CRITICAL FIX: For cold-start users, use title emotion vectors directly
    scored AS (
        SELECT
            pf.cid,
            CASE 
                WHEN v_user_has_emotion THEN COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW)
                ELSE COALESCE(tev.emotion_strength, DEFAULT_SCORE_LOW)
            END AS emotional_component,
            COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO) AS social_component,
            COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) AS historical_component,
            COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) AS context_component,
            COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) AS novelty_component,
            -- Calculate base score with cold-start fallback
            CASE 
                WHEN v_user_has_emotion THEN
                    (
                        COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW) * w_emotional +
                        COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO) * w_social +
                        COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) * w_historical +
                        COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) * w_context +
                        COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) * w_novelty
                    )
                ELSE
                    -- Cold-start: Use popularity-based score (normalize popularity to 0-1 range)
                    LEAST(1.0, COALESCE(pf.popularity_score, 0) / 1000.0) * 0.5 + 
                    COALESCE(tev.emotion_strength, 0.5) * 0.5
            END AS base_score
        FROM prefiltered pf
        LEFT JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc ON TRUE
        LEFT JOIN title_emotion_vectors tev ON tev.title_id = pf.cid
    ),

    -- Get top 100 by base score for intent scoring
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component
        FROM scored s
        ORDER BY s.base_score DESC
        LIMIT 100
    ),

    -- Add intent alignment and social priority
    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            tb.emotional_component,
            CASE 
                WHEN v_user_has_emotion THEN COALESCE(viib_intent_alignment_score(p_user_id, tb.cid), 1.0)
                ELSE 1.0  -- No intent filtering for cold-start
            END AS intent_score,
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

    -- Get explanations
    with_explanations AS (
        SELECT
            c.cid,
            c.base_score,
            c.intent_score,
            c.social_score,
            c.trans_score,
            c.combined_score,
            CASE 
                WHEN v_user_has_emotion THEN er.primary_reason
                ELSE 'Popular right now'
            END AS primary_reason
        FROM combined c
        LEFT JOIN LATERAL (
            SELECT primary_reason
            FROM explain_recommendation(p_user_id, c.cid)
        ) er ON v_user_has_emotion
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
$function$;
