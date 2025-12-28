-- ============================================================================
-- Fix Function Result Structure
-- Ensures explain_recommendation matches what get_top_recommendations_v2 expects
-- ============================================================================

-- Recreate explain_recommendation to ensure it returns the correct structure
DROP FUNCTION IF EXISTS public.explain_recommendation(uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id UUID, p_title_id UUID)
RETURNS TABLE(
    title_id UUID,
    emotional_match REAL,
    transformation_type TEXT,
    transformation_score REAL,
    social_score REAL,
    friend_name TEXT,
    friend_rating TEXT,
    taste_similarity REAL,
    intent_match TEXT,
    intent_confidence REAL,
    primary_reason TEXT,
    secondary_reasons TEXT[],
    full_explanation TEXT
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_user_emotion_id UUID;
    v_user_emotion_label TEXT;
    v_user_intensity REAL;
    v_emotional_match REAL := 0.5;
    v_transformation_type TEXT := 'neutral';
    v_transformation_score REAL := 0.5;
    v_social_score REAL := 0;
    v_friend_name TEXT := NULL;
    v_friend_rating TEXT := NULL;
    v_taste_similarity REAL := 0;
    v_intent_match TEXT := NULL;
    v_intent_confidence REAL := 0;
    v_title_name TEXT;
    v_title_emotions TEXT[];
    v_primary_reason TEXT;
    v_secondary_reasons TEXT[] := '{}';
    v_full_explanation TEXT;
BEGIN
    -- Get title name
    SELECT name INTO v_title_name FROM titles WHERE id = p_title_id;

    -- Get user's current emotion state
    SELECT ues.emotion_id, em.emotion_label, ues.intensity
    INTO v_user_emotion_id, v_user_emotion_label, v_user_intensity
    FROM user_emotion_states ues
    JOIN emotion_master em ON em.id = ues.emotion_id
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Get title's primary emotions
    SELECT ARRAY_AGG(em.emotion_label ORDER BY vec.intensity_level DESC)
    INTO v_title_emotions
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    WHERE vec.title_id = p_title_id
    LIMIT 3;

    -- Calculate emotional match and transformation
    IF v_user_emotion_id IS NOT NULL THEN
        SELECT
            etm.transformation_type,
            etm.confidence_score,
            COALESCE(tts.transformation_score, 0.5)
        INTO v_transformation_type, v_transformation_score, v_emotional_match
        FROM emotion_transformation_map etm
        LEFT JOIN title_transformation_scores tts
            ON tts.user_emotion_id = v_user_emotion_id
            AND tts.title_id = p_title_id
        WHERE etm.user_emotion_id = v_user_emotion_id
          AND EXISTS (
              SELECT 1 FROM viib_emotion_classified_titles vec
              WHERE vec.title_id = p_title_id
                AND vec.emotion_id = etm.content_emotion_id
          )
        ORDER BY etm.priority_rank
        LIMIT 1;
    END IF;

    -- Get social recommendation details
    SELECT
        COALESCE(u.full_name, u.username, 'A friend'),
        CASE uti.rating_value
            WHEN 'love_it' THEN 'loved'
            WHEN 'like_it' THEN 'liked'
            WHEN 'ok' THEN 'thought was okay'
            ELSE 'watched'
        END,
        fc.trust_score,
        calculate_taste_similarity(p_user_id, fc.friend_user_id)
    INTO v_friend_name, v_friend_rating, v_social_score, v_taste_similarity
    FROM friend_connections fc
    JOIN users u ON u.id = fc.friend_user_id
    LEFT JOIN user_title_interactions uti
        ON uti.user_id = fc.friend_user_id
        AND uti.title_id = p_title_id
    WHERE fc.user_id = p_user_id
      AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE)
      AND (
          uti.rating_value IN ('love_it', 'like_it')
          OR EXISTS (
              SELECT 1 FROM user_social_recommendations usr
              WHERE usr.sender_user_id = fc.friend_user_id
                AND usr.receiver_user_id = p_user_id
                AND usr.title_id = p_title_id
          )
      )
    ORDER BY fc.trust_score DESC, uti.rating_value DESC NULLS LAST
    LIMIT 1;

    -- Get intent alignment
    SELECT
        vit.intent_type,
        vit.confidence_score
    INTO v_intent_match, v_intent_confidence
    FROM viib_intent_classified_titles vit
    WHERE vit.title_id = p_title_id
    ORDER BY vit.confidence_score DESC
    LIMIT 1;

    -- Build primary reason based on strongest signal
    IF v_social_score >= 0.7 AND v_friend_name IS NOT NULL THEN
        IF v_taste_similarity >= 0.7 THEN
            v_primary_reason := format('%s (%s%% taste match) %s this',
                v_friend_name,
                ROUND(v_taste_similarity * 100)::TEXT,
                COALESCE(v_friend_rating, 'recommended'));
        ELSE
            v_primary_reason := format('%s %s this',
                v_friend_name,
                COALESCE(v_friend_rating, 'recommended'));
        END IF;
    ELSIF v_transformation_score >= 0.8 THEN
        v_primary_reason := CASE v_transformation_type
            WHEN 'soothe' THEN format('Perfect for when you''re feeling %s - this will help you relax', v_user_emotion_label)
            WHEN 'validate' THEN format('Matches your %s mood - sometimes you just need content that gets you', v_user_emotion_label)
            WHEN 'amplify' THEN format('Will amplify your %s energy with its %s vibes', v_user_emotion_label, COALESCE(v_title_emotions[1], 'exciting'))
            WHEN 'complementary' THEN format('A great contrast to your %s mood - offers a fresh perspective', v_user_emotion_label)
            WHEN 'reinforcing' THEN format('Reinforces your %s state with similar emotional energy', v_user_emotion_label)
            ELSE format('Emotionally aligned with how you''re feeling')
        END;
    ELSIF v_intent_confidence >= 0.8 THEN
        v_primary_reason := CASE v_intent_match
            WHEN 'light_entertainment' THEN 'Easy, fun content for casual viewing'
            WHEN 'comfort_escape' THEN 'Cozy escapism when you need to unwind'
            WHEN 'adrenaline_rush' THEN 'Heart-pounding excitement awaits'
            WHEN 'deep_thought' THEN 'Thought-provoking content for the curious mind'
            WHEN 'discovery' THEN 'Expand your horizons with something new'
            WHEN 'emotional_release' THEN 'A cathartic experience for emotional processing'
            WHEN 'family_bonding' THEN 'Perfect for watching together'
            WHEN 'background_passive' THEN 'Great for background viewing'
            ELSE 'Matches what you''re looking for right now'
        END;
    ELSE
        v_primary_reason := 'Trending and popular among viewers like you';
    END IF;

    -- Build secondary reasons
    IF v_title_emotions IS NOT NULL AND array_length(v_title_emotions, 1) > 0 THEN
        v_secondary_reasons := v_secondary_reasons || format('Evokes %s emotions', array_to_string(v_title_emotions[1:2], ', '));
    END IF;

    IF v_transformation_score >= 0.6 AND v_primary_reason NOT LIKE '%feeling%' THEN
        v_secondary_reasons := v_secondary_reasons || 'Good emotional match for your current mood';
    END IF;

    IF v_friend_name IS NOT NULL AND v_primary_reason NOT LIKE '%friend%' AND v_primary_reason NOT LIKE v_friend_name || '%' THEN
        v_secondary_reasons := v_secondary_reasons || format('%s also enjoyed this', v_friend_name);
    END IF;

    -- Build full explanation
    v_full_explanation := COALESCE(v_primary_reason, 'Recommended for you');
    IF array_length(v_secondary_reasons, 1) > 0 THEN
        v_full_explanation := v_full_explanation || '. Also: ' || array_to_string(v_secondary_reasons, '; ');
    END IF;

    RETURN QUERY SELECT
        p_title_id,
        COALESCE(v_emotional_match, 0.5),
        COALESCE(v_transformation_type, 'neutral'),
        COALESCE(v_transformation_score, 0.5),
        COALESCE(v_social_score, 0.0),
        v_friend_name,
        v_friend_rating,
        COALESCE(v_taste_similarity, 0.0),
        v_intent_match,
        COALESCE(v_intent_confidence, 0.0),
        COALESCE(v_primary_reason, 'Recommended for you'),
        v_secondary_reasons,
        v_full_explanation;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.explain_recommendation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.explain_recommendation(uuid, uuid) TO service_role;

-- Now recreate get_top_recommendations_v2 to use the fixed function
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
SET search_path TO 'public'
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
    
    DEFAULT_SCORE_LOW CONSTANT REAL := 0.3;
    DEFAULT_SCORE_ZERO CONSTANT REAL := 0.0;
BEGIN
    SELECT EXISTS(SELECT 1 FROM user_emotion_states WHERE user_id = p_user_id) INTO v_user_has_emotion;
    SELECT EXISTS(SELECT 1 FROM user_streaming_subscriptions WHERE user_id = p_user_id AND is_active = TRUE) INTO v_user_has_subscriptions;
    SELECT EXISTS(SELECT 1 FROM user_language_preferences WHERE user_id = p_user_id) INTO v_user_has_language_prefs;
    SELECT vibe_type INTO v_user_vibe_type FROM user_vibe_preferences WHERE user_id = p_user_id LIMIT 1;

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
    cold_start_candidates AS (
        SELECT DISTINCT t.id AS cid, t.popularity
        FROM titles t
        WHERE t.classification_status = 'complete'
          AND NOT v_user_has_emotion
          AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id)
        ORDER BY t.popularity DESC LIMIT 50
    ),
    candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE t.classification_status = 'complete'
            AND v_user_has_emotion
            AND (NOT v_user_has_subscriptions OR EXISTS (
                SELECT 1 FROM title_streaming_availability tsa
                JOIN user_streaming_subscriptions uss ON uss.streaming_service_id = tsa.streaming_service_id
                    AND uss.user_id = p_user_id AND uss.is_active = TRUE
                WHERE tsa.title_id = t.id
            ))
            AND (NOT v_user_has_language_prefs OR EXISTS (
                SELECT 1 FROM user_languages ul WHERE ul.language_code = t.original_language
            ))
            AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id)
    ),
    all_candidates AS (
        SELECT cid FROM candidate_titles UNION SELECT cid FROM cold_start_candidates
    ),
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
    vibe_scores AS (
        SELECT pf.cid,
            CASE WHEN v_user_vibe_type IS NULL THEN DEFAULT_SCORE_LOW
            ELSE COALESCE((
                SELECT SUM(vew.weight * (vec.intensity_level / 10.0)) / NULLIF(COUNT(*), 0)
                FROM viib_emotion_classified_titles vec
                JOIN vibes v ON v.label = v_user_vibe_type
                JOIN vibe_emotion_weights vew ON vew.vibe_id = v.id AND vew.emotion_id = vec.emotion_id
                WHERE vec.title_id = pf.cid
            ), DEFAULT_SCORE_LOW) END AS vibe_component
        FROM prefiltered pf
    ),
    scored AS (
        SELECT pf.cid,
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
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component, s.raw_social
        FROM scored s ORDER BY s.base_score DESC LIMIT 100
    ),
    with_intent AS (
        SELECT tb.cid, tb.base_score, tb.emotional_component, tb.raw_social,
            COALESCE(viib_intent_alignment_score(p_user_id, tb.cid), 1.0) AS intent_score,
            COALESCE(viib_social_priority_score(p_user_id, tb.cid), DEFAULT_SCORE_ZERO) AS social_score
        FROM top_base tb
    ),
    combined AS (
        SELECT wi.cid, wi.base_score, wi.intent_score, wi.social_score, wi.emotional_component AS trans_score,
            (wi.base_score * (1.0 + LEAST(0.35, 0.25 * wi.social_score)) * wi.intent_score) AS combined_score
        FROM with_intent wi
    ),
    with_explanations AS (
        SELECT c.cid, c.base_score, c.intent_score, c.social_score, c.trans_score, c.combined_score,
            er.primary_reason
        FROM combined c
        LEFT JOIN LATERAL (SELECT primary_reason FROM explain_recommendation(p_user_id, c.cid)) er ON TRUE
    )
    SELECT we.cid AS title_id, we.base_score AS base_viib_score, we.intent_score AS intent_alignment_score,
        we.social_score AS social_priority_score, we.trans_score AS transformation_score,
        we.combined_score AS final_score, COALESCE(we.primary_reason, 'Recommended for you') AS recommendation_reason
    FROM with_explanations we
    ORDER BY we.combined_score DESC LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_recommendations_v2(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_recommendations_v2(uuid, integer) TO service_role;