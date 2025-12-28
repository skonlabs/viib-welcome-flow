-- Restore the original working get_top_recommendations_v3 function
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
    p_user_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    title_id UUID,
    final_score REAL,
    emotional_component REAL,
    vibe_component REAL,
    social_component REAL,
    historical_component REAL,
    novelty_component REAL,
    context_component REAL,
    base_score REAL,
    recommendation_reason TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s'
AS $$
DECLARE
    v_user_emotion_id UUID;
    v_user_vibe_type TEXT;
    v_user_country TEXT;
    v_user_languages TEXT[];
BEGIN
    -- Get user's current emotion state
    SELECT emotion_id INTO v_user_emotion_id
    FROM user_emotion_states
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get user's vibe preference
    SELECT vibe_type INTO v_user_vibe_type
    FROM user_vibe_preferences
    WHERE user_id = p_user_id;

    -- Get user's country for streaming availability
    SELECT country INTO v_user_country
    FROM users
    WHERE id = p_user_id;

    -- Get user's language preferences
    SELECT ARRAY_AGG(language_code ORDER BY priority_order)
    INTO v_user_languages
    FROM user_language_preferences
    WHERE user_id = p_user_id;

    RETURN QUERY
    WITH user_streaming AS (
        SELECT streaming_service_id
        FROM user_streaming_subscriptions
        WHERE user_id = p_user_id AND is_active = true
    ),
    available_titles AS (
        SELECT DISTINCT tsa.title_id
        FROM title_streaming_availability tsa
        INNER JOIN user_streaming us ON tsa.streaming_service_id = us.streaming_service_id
        WHERE tsa.region_code = COALESCE(v_user_country, 'US')
    ),
    excluded_titles AS (
        SELECT DISTINCT uti.title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type IN ('completed', 'disliked')
    ),
    emotion_scores AS (
        SELECT 
            tev.title_id,
            CASE 
                WHEN v_user_emotion_id IS NOT NULL THEN
                    COALESCE(tumec.cosine_score, 0) * 0.7 + 
                    COALESCE(tumec.transformation_score, 0) * 0.3
                ELSE 0.5
            END as emotion_match_score
        FROM title_emotion_vectors tev
        LEFT JOIN title_user_emotion_match_cache tumec 
            ON tev.title_id = tumec.title_id 
            AND tumec.user_emotion_id = v_user_emotion_id
    ),
    vibe_scores AS (
        SELECT 
            tg.title_id,
            COALESCE(AVG(vgw.weight), 0.5) as vibe_match_score
        FROM title_genres tg
        INNER JOIN vibe_genre_weights vgw ON tg.genre_id = vgw.genre_id
        INNER JOIN vibes v ON vgw.vibe_id = v.id
        WHERE v.id = v_user_vibe_type OR v_user_vibe_type IS NULL
        GROUP BY tg.title_id
    ),
    social_scores AS (
        SELECT 
            title_id,
            social_component_score as social_score,
            social_priority_score
        FROM user_title_social_scores
        WHERE user_id = p_user_id
    ),
    historical_scores AS (
        SELECT 
            tg.title_id,
            COUNT(CASE WHEN uti.rating_value IN ('love_it', 'like_it') THEN 1 END)::REAL / 
            NULLIF(COUNT(*)::REAL, 0) as genre_affinity
        FROM title_genres tg
        INNER JOIN title_genres liked_tg ON tg.genre_id = liked_tg.genre_id
        INNER JOIN user_title_interactions uti ON liked_tg.title_id = uti.title_id
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type = 'completed'
        AND uti.rating_value IN ('love_it', 'like_it')
        GROUP BY tg.title_id
    ),
    base_scores AS (
        SELECT 
            t.id as title_id,
            (COALESCE(t.vote_average, 5) / 10.0)::REAL as quality_score,
            (LEAST(COALESCE(t.popularity::REAL, 0), 100) / 100.0)::REAL as popularity_score
        FROM titles t
        WHERE t.id IN (SELECT title_id FROM available_titles)
        AND t.id NOT IN (SELECT title_id FROM excluded_titles)
        AND (
            v_user_languages IS NULL 
            OR array_length(v_user_languages, 1) IS NULL 
            OR t.original_language = ANY(v_user_languages)
        )
    )
    SELECT 
        bs.title_id,
        (
            COALESCE(es.emotion_match_score, 0.5) * 0.25 +
            COALESCE(vs.vibe_match_score, 0.5) * 0.20 +
            COALESCE(ss.social_score, 0) * 0.15 +
            COALESCE(hs.genre_affinity, 0.5) * 0.15 +
            (1.0 - COALESCE(hs.genre_affinity, 0.5)) * 0.10 +
            0.5 * 0.05 +
            (bs.quality_score * 0.6 + bs.popularity_score * 0.4) * 0.10
        )::REAL as final_score,
        COALESCE(es.emotion_match_score, 0.5)::REAL as emotional_component,
        COALESCE(vs.vibe_match_score, 0.5)::REAL as vibe_component,
        COALESCE(ss.social_score, 0)::REAL as social_component,
        COALESCE(hs.genre_affinity, 0.5)::REAL as historical_component,
        (1.0 - COALESCE(hs.genre_affinity, 0.5))::REAL as novelty_component,
        0.5::REAL as context_component,
        (bs.quality_score * 0.6 + bs.popularity_score * 0.4)::REAL as base_score,
        CASE 
            WHEN COALESCE(ss.social_priority_score, 0) > 0.7 THEN 'Recommended by friends'
            WHEN COALESCE(es.emotion_match_score, 0) > 0.8 THEN 'Matches your mood'
            WHEN COALESCE(vs.vibe_match_score, 0) > 0.8 THEN 'Fits your vibe'
            WHEN COALESCE(hs.genre_affinity, 0) > 0.7 THEN 'Based on your favorites'
            ELSE 'Top pick for you'
        END as recommendation_reason
    FROM base_scores bs
    LEFT JOIN emotion_scores es ON bs.title_id = es.title_id
    LEFT JOIN vibe_scores vs ON bs.title_id = vs.title_id
    LEFT JOIN social_scores ss ON bs.title_id = ss.title_id
    LEFT JOIN historical_scores hs ON bs.title_id = hs.title_id
    ORDER BY final_score DESC
    LIMIT p_limit;
END;
$$;