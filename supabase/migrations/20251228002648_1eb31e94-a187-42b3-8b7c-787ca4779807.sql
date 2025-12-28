
-- Fix the explain_recommendation function: array concatenation syntax error
-- The issue is appending TEXT to TEXT[] array without proper casting

DROP FUNCTION IF EXISTS public.explain_recommendation(uuid, uuid);

CREATE OR REPLACE FUNCTION public.explain_recommendation(
    p_user_id uuid,
    p_title_id uuid
)
RETURNS TABLE(
    title_id uuid,
    emotional_match real,
    transformation_type text,
    transformation_score real,
    social_score real,
    friend_name text,
    friend_rating text,
    taste_similarity real,
    intent_match text,
    intent_confidence real,
    primary_reason text,
    secondary_reasons text[],
    full_explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SELECT name INTO v_title_name FROM titles WHERE id = p_title_id;

    SELECT ues.emotion_id, em.emotion_label, ues.intensity
    INTO v_user_emotion_id, v_user_emotion_label, v_user_intensity
    FROM user_emotion_states ues
    JOIN emotion_master em ON em.id = ues.emotion_id
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC LIMIT 1;

    SELECT ARRAY_AGG(em.emotion_label ORDER BY vec.intensity_level DESC)
    INTO v_title_emotions
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    WHERE vec.title_id = p_title_id LIMIT 3;

    IF v_user_emotion_id IS NOT NULL THEN
        SELECT etm.transformation_type, etm.confidence_score::real, COALESCE(tts.transformation_score, 0.5)::real
        INTO v_transformation_type, v_transformation_score, v_emotional_match
        FROM emotion_transformation_map etm
        LEFT JOIN title_transformation_scores tts ON tts.user_emotion_id = v_user_emotion_id AND tts.title_id = p_title_id
        WHERE etm.user_emotion_id = v_user_emotion_id
          AND EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec WHERE vec.title_id = p_title_id AND vec.emotion_id = etm.content_emotion_id)
        ORDER BY etm.priority_rank LIMIT 1;
    END IF;

    SELECT
        COALESCE(u.full_name, u.username, 'A friend'),
        CASE uti.rating_value WHEN 'love_it' THEN 'loved' WHEN 'like_it' THEN 'liked' WHEN 'ok' THEN 'thought was okay' ELSE 'watched' END,
        fc.trust_score::real,
        calculate_taste_similarity(p_user_id, fc.friend_user_id)::real
    INTO v_friend_name, v_friend_rating, v_social_score, v_taste_similarity
    FROM friend_connections fc
    JOIN users u ON u.id = fc.friend_user_id
    LEFT JOIN user_title_interactions uti ON uti.user_id = fc.friend_user_id AND uti.title_id = p_title_id
    WHERE fc.user_id = p_user_id AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE)
      AND (uti.rating_value IN ('love_it', 'like_it') OR EXISTS (
          SELECT 1 FROM user_social_recommendations usr WHERE usr.sender_user_id = fc.friend_user_id AND usr.receiver_user_id = p_user_id AND usr.title_id = p_title_id
      ))
    ORDER BY fc.trust_score DESC, uti.rating_value DESC NULLS LAST LIMIT 1;

    SELECT vit.intent_type, vit.confidence_score::real
    INTO v_intent_match, v_intent_confidence
    FROM viib_intent_classified_titles vit WHERE vit.title_id = p_title_id ORDER BY vit.confidence_score DESC LIMIT 1;

    IF v_social_score >= 0.7 AND v_friend_name IS NOT NULL THEN
        IF v_taste_similarity >= 0.7 THEN
            v_primary_reason := format('%s (%s%% taste match) %s this', v_friend_name, ROUND(v_taste_similarity * 100)::TEXT, COALESCE(v_friend_rating, 'recommended'));
        ELSE
            v_primary_reason := format('%s %s this', v_friend_name, COALESCE(v_friend_rating, 'recommended'));
        END IF;
    ELSIF v_transformation_score >= 0.8 THEN
        v_primary_reason := CASE v_transformation_type
            WHEN 'soothe' THEN format('Perfect for when you''re feeling %s - this will help you relax', v_user_emotion_label)
            WHEN 'validate' THEN format('Matches your %s mood - sometimes you just need content that gets you', v_user_emotion_label)
            WHEN 'amplify' THEN format('Will amplify your %s energy with its %s vibes', v_user_emotion_label, COALESCE(v_title_emotions[1], 'exciting'))
            WHEN 'complementary' THEN format('A great contrast to your %s mood - offers a fresh perspective', v_user_emotion_label)
            WHEN 'reinforcing' THEN format('Reinforces your %s state with similar emotional energy', v_user_emotion_label)
            ELSE 'Emotionally aligned with how you''re feeling'
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

    -- FIX: Use ARRAY[] syntax for proper array concatenation
    IF v_title_emotions IS NOT NULL AND array_length(v_title_emotions, 1) > 0 THEN
        v_secondary_reasons := v_secondary_reasons || ARRAY[format('Evokes %s emotions', array_to_string(v_title_emotions[1:2], ', '))];
    END IF;
    IF v_transformation_score >= 0.6 AND v_primary_reason NOT LIKE '%feeling%' THEN
        v_secondary_reasons := v_secondary_reasons || ARRAY['Good emotional match for your current mood'];
    END IF;
    IF v_friend_name IS NOT NULL AND v_primary_reason NOT LIKE '%friend%' AND v_primary_reason NOT LIKE v_friend_name || '%' THEN
        v_secondary_reasons := v_secondary_reasons || ARRAY[format('%s also enjoyed this', v_friend_name)];
    END IF;

    v_full_explanation := COALESCE(v_primary_reason, 'Recommended for you');
    IF array_length(v_secondary_reasons, 1) > 0 THEN
        v_full_explanation := v_full_explanation || '. Also: ' || array_to_string(v_secondary_reasons, '; ');
    END IF;

    RETURN QUERY SELECT
        p_title_id,
        COALESCE(v_emotional_match, 0.5)::real,
        COALESCE(v_transformation_type, 'neutral'),
        COALESCE(v_transformation_score, 0.5)::real,
        COALESCE(v_social_score, 0.0)::real,
        v_friend_name,
        v_friend_rating,
        COALESCE(v_taste_similarity, 0.0)::real,
        v_intent_match,
        COALESCE(v_intent_confidence, 0.0)::real,
        COALESCE(v_primary_reason, 'Recommended for you'),
        v_secondary_reasons,
        v_full_explanation;
END;
$$;
