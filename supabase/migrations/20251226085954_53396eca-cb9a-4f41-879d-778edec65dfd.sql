
-- Fix get_top_recommendations_v2 to use ORIGINAL logic:
-- 1. Start with titles that have streaming availability (user can watch)
-- 2. Then score and rank those titles
-- This is the correct approach - we filter by availability FIRST, then rank

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, transformation_score real, final_score real, recommendation_reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
    v_user_emotion_id UUID;
BEGIN
    -- Get user's current emotion
    SELECT ues.emotion_id INTO v_user_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC LIMIT 1;

    -- If user has no emotion state, return popular titles with fallback scores
    IF v_user_emotion_id IS NULL THEN
        RETURN QUERY
        SELECT 
            t.id,
            0.5::real,
            0.5::real,
            0.0::real,
            0.5::real,
            (t.popularity / 100.0)::real,
            'popular_title'::text
        FROM titles t
        WHERE t.popularity IS NOT NULL
          AND t.poster_path IS NOT NULL
        ORDER BY t.popularity DESC
        LIMIT p_limit;
        RETURN;
    END IF;

    RETURN QUERY
    WITH user_streaming AS (
        SELECT uss.streaming_service_id
        FROM user_streaming_subscriptions uss
        WHERE uss.user_id = p_user_id AND uss.is_active = TRUE
    ),
    user_languages AS (
        SELECT ulp.language_code
        FROM user_language_preferences ulp
        WHERE ulp.user_id = p_user_id
    ),
    user_excluded AS (
        SELECT uti.title_id AS excluded_title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
          AND uti.interaction_type IN ('completed', 'disliked')
    ),
    social_recs AS (
        SELECT usr.title_id AS social_title_id,
            MAX(CASE WHEN fc.trust_score >= 0.8 THEN 1.0
                     WHEN fc.trust_score >= 0.5 THEN 0.85 ELSE 0.5 END)::real AS social_score
        FROM user_social_recommendations usr
        JOIN friend_connections fc ON fc.friend_user_id = usr.sender_user_id AND fc.user_id = p_user_id
        WHERE usr.receiver_user_id = p_user_id
        GROUP BY usr.title_id
    ),
    -- ORIGINAL APPROACH: Start with titles that user can actually watch
    -- Get candidates that have streaming availability AND match language preferences
    candidate_titles AS (
        SELECT DISTINCT t.id AS candidate_id, t.popularity
        FROM titles t
        JOIN title_streaming_availability tsa ON tsa.title_id = t.id
        WHERE (
            -- Either has matching streaming service OR user has no streaming preferences
            tsa.streaming_service_id IN (SELECT streaming_service_id FROM user_streaming)
            OR NOT EXISTS (SELECT 1 FROM user_streaming)
        )
        AND (
            -- Either matches user language OR user has no language preferences
            t.original_language IN (SELECT language_code FROM user_languages)
            OR NOT EXISTS (SELECT 1 FROM user_languages)
        )
        AND NOT EXISTS (SELECT 1 FROM user_excluded ue WHERE ue.excluded_title_id = t.id)
        AND t.poster_path IS NOT NULL
        ORDER BY t.popularity DESC
        LIMIT 500  -- Get top 500 watchable titles by popularity
    ),
    -- Now score these candidate titles using pre-computed caches
    scored_titles AS (
        SELECT 
            ct.candidate_id AS scored_title_id,
            COALESCE(tuemc.cosine_score, 0.5) AS base_score,
            COALESCE(tias.alignment_score, 0.5) AS intent_score,
            COALESCE(tts.transformation_score, 0.5) AS transform_score,
            COALESCE(sr.social_score, 0.0) AS social_score
        FROM candidate_titles ct
        LEFT JOIN title_user_emotion_match_cache tuemc 
            ON tuemc.title_id = ct.candidate_id AND tuemc.user_emotion_id = v_user_emotion_id
        LEFT JOIN title_intent_alignment_scores tias 
            ON tias.title_id = ct.candidate_id AND tias.user_emotion_id = v_user_emotion_id
        LEFT JOIN title_transformation_scores tts 
            ON tts.title_id = ct.candidate_id AND tts.user_emotion_id = v_user_emotion_id
        LEFT JOIN social_recs sr ON sr.social_title_id = ct.candidate_id
    ),
    ranked AS (
        SELECT 
            st.scored_title_id, 
            st.base_score::real, 
            st.intent_score::real, 
            st.social_score::real, 
            st.transform_score::real,
            GREATEST(
                st.base_score * 0.35 + st.intent_score * 0.25 + st.transform_score * 0.40, 
                st.social_score
            )::real AS calc_final_score,
            CASE
                WHEN st.social_score > (st.base_score * 0.35 + st.intent_score * 0.25 + st.transform_score * 0.40) THEN 'friend_recommendation'
                WHEN st.transform_score >= 0.8 THEN 'emotional_transformation'
                WHEN st.intent_score >= 0.8 THEN 'intent_match'
                WHEN st.base_score >= 0.7 THEN 'mood_match'
                ELSE 'general_recommendation'
            END AS reason
        FROM scored_titles st
    )
    SELECT r.scored_title_id, r.base_score, r.intent_score, r.social_score, r.transform_score, r.calc_final_score, r.reason
    FROM ranked r
    ORDER BY r.calc_final_score DESC
    LIMIT p_limit;
END;
$$;
