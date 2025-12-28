
-- Fix get_top_recommendations_v2 to filter out kids-only content for adult users
-- and ensure scores are properly calculated

DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(
    p_user_id uuid,
    p_limit integer DEFAULT 10
)
RETURNS TABLE(
    title_id uuid,
    base_viib_score real,
    intent_alignment_score real,
    social_priority_score real,
    transformation_score real,
    final_score real,
    recommendation_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
    w_emotional      REAL := 0.35;
    w_historical     REAL := 0.30;
    w_context        REAL := 0.15;
    w_vibe           REAL := 0.10;
    w_novelty        REAL := 0.10;
    
    v_user_has_emotion BOOLEAN := FALSE;
    v_user_has_subscriptions BOOLEAN := FALSE;
    v_user_has_language_prefs BOOLEAN := FALSE;
    v_user_vibe_type TEXT := NULL;
    v_user_is_adult BOOLEAN := TRUE;
    
    DEFAULT_SCORE_LOW CONSTANT REAL := 0.3;
    DEFAULT_SCORE_ZERO CONSTANT REAL := 0.0;
BEGIN
    -- Check user state
    SELECT EXISTS(SELECT 1 FROM user_emotion_states WHERE user_id = p_user_id) INTO v_user_has_emotion;
    SELECT EXISTS(SELECT 1 FROM user_streaming_subscriptions WHERE user_id = p_user_id AND is_active = TRUE) INTO v_user_has_subscriptions;
    SELECT EXISTS(SELECT 1 FROM user_language_preferences WHERE user_id = p_user_id) INTO v_user_has_language_prefs;
    SELECT vibe_type INTO v_user_vibe_type FROM user_vibe_preferences WHERE user_id = p_user_id LIMIT 1;
    SELECT COALESCE(is_age_over_18, TRUE) INTO v_user_is_adult FROM users WHERE id = p_user_id;

    -- Load active weights
    SELECT
        COALESCE(emotional_weight, 0.35),
        COALESCE(historical_weight, 0.30),
        COALESCE(context_weight, 0.15),
        COALESCE(vibe_weight, 0.10),
        COALESCE(novelty_weight, 0.10)
    INTO w_emotional, w_historical, w_context, w_vibe, w_novelty
    FROM viib_weight_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1;

    RETURN QUERY
    WITH
    user_interactions AS (
        SELECT DISTINCT uti.title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id AND uti.interaction_type IN ('completed', 'disliked')
    ),
    user_languages AS (
        SELECT language_code FROM user_language_preferences WHERE user_id = p_user_id
    ),
    -- Cold start: popular titles when no emotion data
    cold_start_candidates AS (
        SELECT DISTINCT t.id AS cid, t.popularity
        FROM titles t
        WHERE t.classification_status = 'complete'
          AND NOT v_user_has_emotion
          AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id)
          -- For adult users, exclude obvious kids content
          AND (NOT v_user_is_adult OR t.certification IS NULL OR t.certification NOT IN ('TV-Y', 'TV-Y7', 'G', 'TV-G'))
        ORDER BY t.popularity DESC LIMIT 50
    ),
    -- Regular candidates for users with emotion data
    candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE t.classification_status = 'complete'
            AND v_user_has_emotion
            -- Streaming availability filter
            AND (NOT v_user_has_subscriptions OR EXISTS (
                SELECT 1 FROM title_streaming_availability tsa
                JOIN user_streaming_subscriptions uss ON uss.streaming_service_id = tsa.streaming_service_id
                    AND uss.user_id = p_user_id AND uss.is_active = TRUE
                WHERE tsa.title_id = t.id
            ))
            -- Language preference filter
            AND (NOT v_user_has_language_prefs OR EXISTS (
                SELECT 1 FROM user_languages ul WHERE ul.language_code = t.original_language
            ))
            -- Exclude already watched/disliked
            AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id)
            -- For adult users, exclude obvious kids content  
            AND (NOT v_user_is_adult OR t.certification IS NULL OR t.certification NOT IN ('TV-Y', 'TV-Y7', 'G', 'TV-G'))
    ),
    all_candidates AS (
        SELECT cid FROM candidate_titles UNION SELECT cid FROM cold_start_candidates
    ),
    -- Prefilter to top 300 by social signals and popularity
    prefiltered AS (
        SELECT ac.cid, COALESCE(rec.rec_count, 0) AS social_rec_count, COALESCE(t.popularity, 0) AS popularity_score
        FROM all_candidates ac
        JOIN titles t ON t.id = ac.cid
        LEFT JOIN (
            SELECT usr.title_id, COUNT(*) AS rec_count
            FROM user_social_recommendations usr WHERE usr.receiver_user_id = p_user_id GROUP BY usr.title_id
        ) rec ON rec.title_id = ac.cid
        ORDER BY social_rec_count DESC, popularity_score DESC LIMIT 300
    ),
    -- Calculate vibe scores
    vibe_scores AS (
        SELECT pf.cid,
            (CASE WHEN v_user_vibe_type IS NULL THEN DEFAULT_SCORE_LOW
            ELSE COALESCE((
                SELECT (SUM(vew.weight * (vec.intensity_level / 10.0)) / NULLIF(COUNT(*), 0))::real
                FROM viib_emotion_classified_titles vec
                JOIN vibes v ON v.label = v_user_vibe_type
                JOIN vibe_emotion_weights vew ON vew.vibe_id = v.id AND vew.emotion_id = vec.emotion_id
                WHERE vec.title_id = pf.cid
            ), DEFAULT_SCORE_LOW) END)::real AS vibe_component
        FROM prefiltered pf
    ),
    -- Calculate all score components
    scored AS (
        SELECT pf.cid,
            COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW)::real AS emotional_component,
            COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO)::real AS social_component,
            COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW)::real AS historical_component,
            COALESCE(vsc.context_component, DEFAULT_SCORE_LOW)::real AS context_component,
            COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW)::real AS novelty_component,
            COALESCE(vs.vibe_component, DEFAULT_SCORE_LOW)::real AS vibe_component,
            (
                COALESCE(vsc.emotional_component, DEFAULT_SCORE_LOW) * w_emotional +
                COALESCE(vsc.historical_component, DEFAULT_SCORE_LOW) * w_historical +
                COALESCE(vsc.context_component, DEFAULT_SCORE_LOW) * w_context +
                COALESCE(vs.vibe_component, DEFAULT_SCORE_LOW) * w_vibe +
                COALESCE(vsc.novelty_component, DEFAULT_SCORE_LOW) * w_novelty
            )::real AS base_score,
            COALESCE(vsc.social_component, DEFAULT_SCORE_ZERO)::real AS raw_social
        FROM prefiltered pf
        LEFT JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc ON TRUE
        LEFT JOIN vibe_scores vs ON vs.cid = pf.cid
    ),
    -- Get top 100 by base score
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component, s.raw_social
        FROM scored s ORDER BY s.base_score DESC LIMIT 100
    ),
    -- Add intent and social priority scores
    with_intent AS (
        SELECT tb.cid, tb.base_score::real, tb.emotional_component::real, tb.raw_social::real,
            COALESCE(viib_intent_alignment_score(p_user_id, tb.cid), 1.0)::real AS intent_score,
            COALESCE(viib_social_priority_score(p_user_id, tb.cid), DEFAULT_SCORE_ZERO)::real AS social_score
        FROM top_base tb
    ),
    -- Calculate combined score
    combined AS (
        SELECT wi.cid, wi.base_score::real, wi.intent_score::real, wi.social_score::real, 
            wi.emotional_component::real AS trans_score,
            (wi.base_score * (1.0 + LEAST(0.35, 0.25 * wi.social_score)) * wi.intent_score)::real AS combined_score
        FROM with_intent wi
    ),
    -- Add explanations
    with_explanations AS (
        SELECT c.cid, c.base_score::real, c.intent_score::real, c.social_score::real, 
            c.trans_score::real, c.combined_score::real,
            er.primary_reason
        FROM combined c
        LEFT JOIN LATERAL (SELECT primary_reason FROM explain_recommendation(p_user_id, c.cid)) er ON TRUE
    )
    SELECT 
        we.cid AS title_id, 
        we.base_score::real AS base_viib_score, 
        we.intent_score::real AS intent_alignment_score,
        we.social_score::real AS social_priority_score, 
        we.trans_score::real AS transformation_score,
        we.combined_score::real AS final_score, 
        COALESCE(we.primary_reason, 'Recommended for you') AS recommendation_reason
    FROM with_explanations we
    ORDER BY we.combined_score DESC LIMIT p_limit;
END;
$$;
