DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(UUID, INT);

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
    -- Emotion scores: prioritize transformation score over raw cosine similarity
    -- Transformation score measures if content emotions are appropriate for user's current mood
    emotion_scores AS (
        SELECT 
            tumec.title_id AS tid,
            CASE 
                WHEN v_user_emotion_id IS NOT NULL THEN
                    -- Weight transformation more heavily (60%) than cosine (40%)
                    -- Transformation captures "calm user should watch peaceful content" logic
                    COALESCE(tumec.cosine_score, 0.5) * 0.4 + 
                    COALESCE(tumec.transformation_score, 0.5) * 0.6
                ELSE 0.5
            END as emotion_match_score
        FROM title_user_emotion_match_cache tumec
        WHERE tumec.user_emotion_id = v_user_emotion_id
    ),
    -- Vibe scores based on genre weights for user's selected vibe
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
    -- Social scores from friend recommendations
    social_scores AS (
        SELECT 
            utss.title_id AS tid,
            utss.social_component_score as social_score,
            utss.social_priority_score
        FROM user_title_social_scores utss
        WHERE utss.user_id = p_user_id
    ),
    -- Historical scores based on user's genre preferences from past interactions
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
    -- Base quality scores (popularity + rating)
    base_scores AS (
        SELECT 
            t.id AS tid,
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
        -- Rebalanced scoring weights:
        -- - Emotional match is most important for mood-based recs (30%)
        -- - Vibe/genre match for preference alignment (25%)  
        -- - Historical for personalization when available (15%)
        -- - Base quality to filter out bad content (20%)
        -- - Novelty to encourage discovery (10%)
        (
            COALESCE(es.emotion_match_score, 0.5) * 0.30 +
            COALESCE(vs.vibe_match_score, 0.5) * 0.25 +
            COALESCE(ss.social_score, 0) * 0.10 +
            COALESCE(hs.genre_affinity, 0.5) * 0.15 +
            (bs.quality_score * 0.7 + bs.popularity_score * 0.3) * 0.20
        )::REAL AS out_final_score,
        COALESCE(es.emotion_match_score, 0.5)::REAL AS out_emotional_component,
        COALESCE(vs.vibe_match_score, 0.5)::REAL AS out_vibe_component,
        COALESCE(ss.social_score, 0)::REAL AS out_social_component,
        COALESCE(hs.genre_affinity, 0.5)::REAL AS out_historical_component,
        (1.0 - COALESCE(hs.genre_affinity, 0.5))::REAL AS out_novelty_component,
        0.5::REAL AS out_context_component,
        (bs.quality_score * 0.7 + bs.popularity_score * 0.3)::REAL AS out_base_score,
        CASE 
            WHEN COALESCE(ss.social_priority_score, 0) > 0.7 THEN 'Recommended by friends'
            WHEN COALESCE(es.emotion_match_score, 0) > 0.7 THEN 'Matches your mood'
            WHEN COALESCE(vs.vibe_match_score, 0) > 0.7 THEN 'Fits your vibe'
            WHEN COALESCE(hs.genre_affinity, 0) > 0.7 THEN 'Based on your favorites'
            ELSE 'Top pick for you'
        END AS out_recommendation_reason
    FROM base_scores bs
    LEFT JOIN emotion_scores es ON bs.tid = es.tid
    LEFT JOIN vibe_scores vs ON bs.tid = vs.tid
    LEFT JOIN social_scores ss ON bs.tid = ss.tid
    LEFT JOIN historical_scores hs ON bs.tid = hs.tid
    ORDER BY out_final_score DESC
    LIMIT p_limit;
END;
$$;