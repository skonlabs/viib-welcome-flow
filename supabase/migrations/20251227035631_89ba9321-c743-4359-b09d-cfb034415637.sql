
-- Force PostgREST to reload its schema cache
-- We recreate the function to ensure PostgREST picks up the correct signature

-- First drop and recreate get_top_recommendations_v2 with explicit REAL types
DROP FUNCTION IF EXISTS get_top_recommendations_v2(uuid, integer);

CREATE OR REPLACE FUNCTION get_top_recommendations_v2(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    title_id UUID,
    base_viib_score REAL,
    intent_alignment_score REAL,
    social_priority_score REAL,
    transformation_score REAL,
    final_score REAL,
    recommendation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_emotion_id UUID;
    v_user_languages TEXT[];
BEGIN
    -- Get user's current emotion state
    SELECT emotion_id INTO v_user_emotion_id
    FROM user_emotion_states
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Get user's language preferences
    SELECT ARRAY_AGG(language_code ORDER BY priority_order)
    INTO v_user_languages
    FROM user_language_preferences
    WHERE user_id = p_user_id;
    
    -- Default to English if no preferences
    IF v_user_languages IS NULL OR array_length(v_user_languages, 1) IS NULL THEN
        v_user_languages := ARRAY['en'];
    END IF;

    RETURN QUERY
    WITH user_streaming AS (
        SELECT streaming_service_id 
        FROM user_streaming_subscriptions 
        WHERE user_id = p_user_id AND is_active = true
    ),
    available_titles AS (
        SELECT DISTINCT t.id, t.original_language
        FROM titles t
        JOIN title_streaming_availability tsa ON t.id = tsa.title_id
        WHERE tsa.streaming_service_id IN (SELECT streaming_service_id FROM user_streaming)
          AND t.poster_path IS NOT NULL
          AND t.name IS NOT NULL
    ),
    user_interacted AS (
        SELECT DISTINCT title_id
        FROM user_title_interactions
        WHERE user_id = p_user_id
    ),
    scored_titles AS (
        SELECT 
            at.id AS title_id,
            COALESCE(viib_score(p_user_id, at.id), 0.5)::REAL AS base_score,
            COALESCE(
                (SELECT alignment_score FROM title_intent_alignment_scores 
                 WHERE title_id = at.id AND user_emotion_id = v_user_emotion_id),
                0.3
            )::REAL AS intent_score,
            COALESCE(viib_social_priority_score(p_user_id, at.id), 0)::REAL AS social_score,
            COALESCE(
                (SELECT transformation_score FROM title_transformation_scores 
                 WHERE title_id = at.id AND user_emotion_id = v_user_emotion_id),
                0.5
            )::REAL AS transform_score,
            CASE 
                WHEN at.original_language = ANY(v_user_languages) THEN 1.0
                WHEN 'en' = ANY(v_user_languages) AND at.original_language = 'en' THEN 0.9
                ELSE 0.7
            END AS language_boost,
            -- Get recommendation reason based on intent
            CASE 
                WHEN v_user_emotion_id IS NOT NULL THEN
                    COALESCE(
                        (SELECT 
                            CASE intent_type
                                WHEN 'ESCAPE' THEN 'Perfect for escaping into another world'
                                WHEN 'THRILL' THEN 'Heart-pounding excitement awaits'
                                WHEN 'COMFORT' THEN 'Cozy, familiar content for relaxation'
                                WHEN 'STIMULATION' THEN 'Thought-provoking content for the curious mind'
                                WHEN 'CATHARSIS' THEN 'A cathartic experience for emotional processing'
                                WHEN 'BONDING' THEN 'Great for watching together'
                                WHEN 'DISTRACTION' THEN 'Easy, fun content for casual viewing'
                                WHEN 'DISCOVERY' THEN 'Expand your horizons with something new'
                                ELSE 'Matches your current vibe'
                            END
                         FROM viib_intent_classified_titles
                         WHERE title_id = at.id
                         ORDER BY confidence_score DESC
                         LIMIT 1),
                        'Matches your current vibe'
                    )
                ELSE 'Recommended for you'
            END AS reason
        FROM available_titles at
        WHERE at.id NOT IN (SELECT title_id FROM user_interacted)
    )
    SELECT 
        st.title_id,
        st.base_score AS base_viib_score,
        st.intent_score AS intent_alignment_score,
        st.social_score AS social_priority_score,
        st.transform_score AS transformation_score,
        (
            (st.base_score * 0.3) +
            (st.intent_score * 0.25) +
            (st.transform_score * 0.25) +
            (st.social_score * 0.2)
        )::REAL * st.language_boost::REAL AS final_score,
        st.reason AS recommendation_reason
    FROM scored_titles st
    ORDER BY final_score DESC, st.transform_score DESC
    LIMIT p_limit;
END;
$$;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
