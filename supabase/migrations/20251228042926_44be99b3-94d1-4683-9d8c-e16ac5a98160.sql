-- Fix ambiguous column reference in get_top_recommendations_v3
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
    p_user_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    out_title_id UUID,
    out_final_score REAL,
    out_emotional_component REAL,
    out_vibe_component REAL,
    out_social_component REAL,
    out_historical_component REAL,
    out_novelty_component REAL,
    out_context_component REAL,
    out_base_score REAL,
    out_recommendation_reason TEXT
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
    SELECT ues.emotion_id INTO v_user_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Get user's vibe preference
    SELECT uvp.vibe_type INTO v_user_vibe_type
    FROM user_vibe_preferences uvp
    WHERE uvp.user_id = p_user_id;

    -- Get user's country for streaming availability
    SELECT u.country INTO v_user_country
    FROM users u
    WHERE u.id = p_user_id;

    -- Get user's language preferences
    SELECT ARRAY_AGG(ulp.language_code ORDER BY ulp.priority_order)
    INTO v_user_languages
    FROM user_language_preferences ulp
    WHERE ulp.user_id = p_user_id;

    RETURN QUERY
    WITH user_streaming AS (
        SELECT uss.streaming_service_id
        FROM user_streaming_subscriptions uss
        WHERE uss.user_id = p_user_id AND uss.is_active = true
    ),
    available_titles AS (
        SELECT DISTINCT tsa.title_id AS tid
        FROM title_streaming_availability tsa
        INNER JOIN user_streaming us ON tsa.streaming_service_id = us.streaming_service_id
        WHERE tsa.region_code = COALESCE(v_user_country, 'US')
    ),
    excluded_titles AS (
        SELECT DISTINCT uti.title_id AS tid
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type IN ('completed', 'disliked')
    ),
    emotion_scores AS (
        SELECT 
            tev.title_id AS tid,
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
            tg.title_id AS tid,
            COALESCE(AVG(vgw.weight), 0.5) as vibe_match_score
        FROM title_genres tg
        INNER JOIN vibe_genre_weights vgw ON tg.genre_id = vgw.genre_id
        INNER JOIN vibes v ON vgw.vibe_id = v.id
        WHERE v.id = v_user_vibe_type OR v_user_vibe_type IS NULL
        GROUP BY tg.title_id
    ),
    social_scores AS (
        SELECT 
            utss.title_id AS tid,
            utss.social_component_score as social_score,
            utss.social_priority_score
        FROM user_title_social_scores utss
        WHERE utss.user_id = p_user_id
    ),
    historical_scores AS (
        SELECT 
            tg.title_id AS tid,
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
            t.id as tid,
            (COALESCE(t.vote_average, 5) / 10.0)::REAL as quality_score,
            (LEAST(COALESCE(t.popularity::REAL, 0), 100) / 100.0)::REAL as popularity_score
        FROM titles t
        WHERE t.id IN (SELECT at.tid FROM available_titles at)
        AND t.id NOT IN (SELECT et.tid FROM excluded_titles et)
        AND (
            v_user_languages IS NULL 
            OR array_length(v_user_languages, 1) IS NULL 
            OR t.original_language = ANY(v_user_languages)
        )
    )
    SELECT 
        bs.tid AS out_title_id,
        (
            COALESCE(es.emotion_match_score, 0.5) * 0.25 +
            COALESCE(vs.vibe_match_score, 0.5) * 0.20 +
            COALESCE(ss.social_score, 0) * 0.15 +
            COALESCE(hs.genre_affinity, 0.5) * 0.15 +
            (1.0 - COALESCE(hs.genre_affinity, 0.5)) * 0.10 +
            0.5 * 0.05 +
            (bs.quality_score * 0.6 + bs.popularity_score * 0.4) * 0.10
        )::REAL as out_final_score,
        COALESCE(es.emotion_match_score, 0.5)::REAL as out_emotional_component,
        COALESCE(vs.vibe_match_score, 0.5)::REAL as out_vibe_component,
        COALESCE(ss.social_score, 0)::REAL as out_social_component,
        COALESCE(hs.genre_affinity, 0.5)::REAL as out_historical_component,
        (1.0 - COALESCE(hs.genre_affinity, 0.5))::REAL as out_novelty_component,
        0.5::REAL as out_context_component,
        (bs.quality_score * 0.6 + bs.popularity_score * 0.4)::REAL as out_base_score,
        CASE 
            WHEN COALESCE(ss.social_priority_score, 0) > 0.7 THEN 'Recommended by friends'
            WHEN COALESCE(es.emotion_match_score, 0) > 0.8 THEN 'Matches your mood'
            WHEN COALESCE(vs.vibe_match_score, 0) > 0.8 THEN 'Fits your vibe'
            WHEN COALESCE(hs.genre_affinity, 0) > 0.7 THEN 'Based on your favorites'
            ELSE 'Top pick for you'
        END as out_recommendation_reason
    FROM base_scores bs
    LEFT JOIN emotion_scores es ON bs.tid = es.tid
    LEFT JOIN vibe_scores vs ON bs.tid = vs.tid
    LEFT JOIN social_scores ss ON bs.tid = ss.tid
    LEFT JOIN historical_scores hs ON bs.tid = hs.tid
    ORDER BY out_final_score DESC
    LIMIT p_limit;
END;
$$;