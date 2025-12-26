
-- Recreate get_top_recommendations_v2 with optimized query and 30s timeout
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
            t.id AS title_id,
            0.5::real AS base_viib_score,
            0.5::real AS intent_alignment_score,
            0.0::real AS social_priority_score,
            0.5::real AS transformation_score,
            (t.popularity / 100.0)::real AS final_score,
            'popular_title'::text AS recommendation_reason
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
        SELECT uti.title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
          AND uti.interaction_type IN ('completed', 'disliked')
    ),
    social_recs AS (
        SELECT usr.title_id,
            MAX(CASE WHEN fc.trust_score >= 0.8 THEN 1.0
                     WHEN fc.trust_score >= 0.5 THEN 0.85 ELSE 0.5 END)::real AS social_score
        FROM user_social_recommendations usr
        JOIN friend_connections fc ON fc.friend_user_id = usr.sender_user_id AND fc.user_id = p_user_id
        WHERE usr.receiver_user_id = p_user_id
        GROUP BY usr.title_id
    ),
    -- Use pre-computed emotion match cache to get best candidates quickly
    scored_titles AS (
        SELECT 
            tuemc.title_id,
            tuemc.cosine_score AS base_score,
            COALESCE(tias.alignment_score, 0.5) AS intent_score,
            COALESCE(tts.transformation_score, 0.5) AS transform_score,
            COALESCE(sr.social_score, 0.0) AS social_score
        FROM title_user_emotion_match_cache tuemc
        LEFT JOIN title_intent_alignment_scores tias 
            ON tias.title_id = tuemc.title_id AND tias.user_emotion_id = tuemc.user_emotion_id
        LEFT JOIN title_transformation_scores tts 
            ON tts.title_id = tuemc.title_id AND tts.user_emotion_id = tuemc.user_emotion_id
        LEFT JOIN social_recs sr ON sr.title_id = tuemc.title_id
        WHERE tuemc.user_emotion_id = v_user_emotion_id
          AND tuemc.title_id NOT IN (SELECT title_id FROM user_excluded)
        ORDER BY tuemc.cosine_score DESC
        LIMIT 500  -- Pre-filter to top 500 by emotion match
    ),
    filtered_titles AS (
        SELECT st.*
        FROM scored_titles st
        JOIN titles t ON t.id = st.title_id
        WHERE (
            -- Either has matching streaming service OR user has no streaming preferences
            EXISTS (
                SELECT 1 FROM title_streaming_availability tsa
                WHERE tsa.title_id = st.title_id
                  AND tsa.streaming_service_id IN (SELECT streaming_service_id FROM user_streaming)
            )
            OR NOT EXISTS (SELECT 1 FROM user_streaming)
        )
        AND (
            -- Either matches user language OR user has no language preferences
            t.original_language IN (SELECT language_code FROM user_languages)
            OR NOT EXISTS (SELECT 1 FROM user_languages)
        )
    ),
    ranked AS (
        SELECT 
            ft.title_id AS s_title_id, 
            ft.base_score::real, 
            ft.intent_score::real, 
            ft.social_score::real, 
            ft.transform_score::real,
            GREATEST(
                ft.base_score * 0.35 + ft.intent_score * 0.25 + ft.transform_score * 0.40, 
                ft.social_score
            )::real AS calc_final_score,
            CASE
                WHEN ft.social_score > (ft.base_score * 0.35 + ft.intent_score * 0.25 + ft.transform_score * 0.40) THEN 'friend_recommendation'
                WHEN ft.transform_score >= 0.8 THEN 'emotional_transformation'
                WHEN ft.intent_score >= 0.8 THEN 'intent_match'
                WHEN ft.base_score >= 0.7 THEN 'mood_match'
                ELSE 'general_recommendation'
            END AS reason
        FROM filtered_titles ft
    )
    SELECT r.s_title_id, r.base_score, r.intent_score, r.social_score, r.transform_score, r.calc_final_score, r.reason
    FROM ranked r
    ORDER BY r.calc_final_score DESC
    LIMIT p_limit;
END;
$$;
