
-- Fix get_top_recommendations_v3 with proper scoring logic
-- Addresses: vibe scoring, RT scores with TMDB fallback, language preference ordering, 
-- proper emotion matching, and vibe-specific component weights

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
    p_user_id uuid, 
    p_limit integer DEFAULT 10
)
RETURNS TABLE(
    out_title_id uuid, 
    out_final_score real, 
    out_emotional_component real, 
    out_vibe_component real, 
    out_social_component real, 
    out_historical_component real, 
    out_novelty_component real, 
    out_context_component real, 
    out_base_score real, 
    out_recommendation_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $function$
DECLARE
    v_user_emotion_id UUID;
    v_user_vibe_type TEXT;
    v_user_country TEXT;
    v_user_languages TEXT[];
    -- Vibe component ratios
    v_base_weight REAL := 0.10;
    v_intent_weight REAL := 0.30;
    v_transform_weight REAL := 0.30;
    v_social_weight REAL := 0.15;
    v_historical_weight REAL := 0.10;
    v_novelty_weight REAL := 0.05;
BEGIN
    -- Get user's current emotion state
    SELECT ues.emotion_id INTO v_user_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Get user's vibe preference and its component ratios
    SELECT uvp.vibe_type INTO v_user_vibe_type
    FROM user_vibe_preferences uvp
    WHERE uvp.user_id = p_user_id;
    
    -- Apply vibe-specific weights if user has a vibe
    IF v_user_vibe_type IS NOT NULL THEN
        SELECT 
            COALESCE((v.component_ratios->>'base')::REAL, 0.10),
            COALESCE((v.component_ratios->>'intent')::REAL, 0.30),
            COALESCE((v.component_ratios->>'transform')::REAL, 0.30),
            COALESCE((v.component_ratios->>'social')::REAL, 0.15)
        INTO v_base_weight, v_intent_weight, v_transform_weight, v_social_weight
        FROM vibes v
        WHERE v.id = v_user_vibe_type;
        
        -- Adjust historical and novelty to make total = 1.0
        v_historical_weight := (1.0 - v_base_weight - v_intent_weight - v_transform_weight - v_social_weight) * 0.67;
        v_novelty_weight := (1.0 - v_base_weight - v_intent_weight - v_transform_weight - v_social_weight) * 0.33;
    END IF;

    -- Get user's country for streaming availability
    SELECT u.country INTO v_user_country
    FROM users u
    WHERE u.id = p_user_id;

    -- Get user's language preferences ordered by priority
    SELECT ARRAY_AGG(ulp.language_code ORDER BY ulp.priority_order ASC NULLS LAST)
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
    -- Emotion matching: cosine similarity + transformation potential
    emotion_scores AS (
        SELECT 
            tev.title_id AS tid,
            CASE 
                WHEN v_user_emotion_id IS NOT NULL THEN
                    -- Intent alignment: how well does title match user's current emotional need
                    COALESCE(tias.alignment_score, 0.5) * 0.5 +
                    -- Transformation: how likely title will move user to desired state  
                    COALESCE(tts.transformation_score, 0.5) * 0.3 +
                    -- Direct cosine similarity as baseline
                    COALESCE(tumec.cosine_score, 0.5) * 0.2
                ELSE 0.5
            END as emotion_match_score,
            -- Separate intent alignment for reason generation
            COALESCE(tias.alignment_score, 0.5) as intent_score
        FROM title_emotion_vectors tev
        LEFT JOIN title_user_emotion_match_cache tumec 
            ON tev.title_id = tumec.title_id 
            AND tumec.user_emotion_id = v_user_emotion_id
        LEFT JOIN title_intent_alignment_scores tias
            ON tev.title_id = tias.title_id
            AND tias.user_emotion_id = v_user_emotion_id
        LEFT JOIN title_transformation_scores tts
            ON tev.title_id = tts.title_id
            AND tts.user_emotion_id = v_user_emotion_id
    ),
    -- Vibe matching: use vibe_genre_weights for user's vibe only
    vibe_scores AS (
        SELECT 
            tg.title_id AS tid,
            CASE 
                WHEN v_user_vibe_type IS NOT NULL THEN
                    COALESCE(AVG(vgw.weight), 0.3)
                ELSE 0.5
            END as vibe_match_score
        FROM title_genres tg
        LEFT JOIN vibe_genre_weights vgw 
            ON tg.genre_id = vgw.genre_id 
            AND vgw.vibe_id = v_user_vibe_type
        GROUP BY tg.title_id
    ),
    -- Social signals from friends
    social_scores AS (
        SELECT 
            utss.title_id AS tid,
            utss.social_component_score as social_score,
            utss.social_priority_score
        FROM user_title_social_scores utss
        WHERE utss.user_id = p_user_id
    ),
    -- Genre affinity from watch history
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
    -- Quality scoring: RT scores with TMDB fallback
    base_scores AS (
        SELECT 
            t.id as tid,
            -- Quality: prefer RT critic score, fallback to RT audience, then TMDB
            (CASE 
                WHEN t.rt_cscore IS NOT NULL THEN t.rt_cscore::REAL / 100.0
                WHEN t.rt_ascore IS NOT NULL THEN t.rt_ascore::REAL / 100.0
                ELSE COALESCE(t.vote_average, 5.0) / 10.0
            END)::REAL as quality_score,
            -- Popularity capped at 100
            (LEAST(COALESCE(t.popularity::REAL, 0), 100) / 100.0)::REAL as popularity_score,
            -- Language preference bonus: prioritize by order
            CASE 
                WHEN v_user_languages IS NULL OR array_length(v_user_languages, 1) IS NULL THEN 1.0
                WHEN t.original_language = v_user_languages[1] THEN 1.0  -- Primary language
                WHEN t.original_language = v_user_languages[2] THEN 0.95 -- Secondary language
                WHEN t.original_language = v_user_languages[3] THEN 0.90 -- Tertiary language
                WHEN t.original_language = ANY(v_user_languages) THEN 0.85 -- Other preferred
                ELSE 0.5 -- Not in preferences
            END as language_bonus
        FROM titles t
        WHERE t.id IN (SELECT at.tid FROM available_titles at)
        AND t.id NOT IN (SELECT et.tid FROM excluded_titles et)
    )
    SELECT 
        bs.tid AS out_title_id,
        (
            -- Apply vibe-specific weights
            COALESCE(es.emotion_match_score, 0.5) * (v_intent_weight + v_transform_weight) +
            COALESCE(vs.vibe_match_score, 0.5) * 0.10 +
            COALESCE(ss.social_score, 0) * v_social_weight +
            COALESCE(hs.genre_affinity, 0.5) * v_historical_weight +
            (1.0 - COALESCE(hs.genre_affinity, 0.5)) * v_novelty_weight +
            (bs.quality_score * 0.7 + bs.popularity_score * 0.3) * v_base_weight
        )::REAL * bs.language_bonus as out_final_score,
        COALESCE(es.emotion_match_score, 0.5)::REAL as out_emotional_component,
        COALESCE(vs.vibe_match_score, 0.5)::REAL as out_vibe_component,
        COALESCE(ss.social_score, 0)::REAL as out_social_component,
        COALESCE(hs.genre_affinity, 0.5)::REAL as out_historical_component,
        (1.0 - COALESCE(hs.genre_affinity, 0.5))::REAL as out_novelty_component,
        0.5::REAL as out_context_component,
        (bs.quality_score * 0.7 + bs.popularity_score * 0.3)::REAL as out_base_score,
        CASE 
            WHEN COALESCE(ss.social_priority_score, 0) > 0.7 THEN 'Recommended by friends'
            WHEN COALESCE(es.intent_score, 0) > 0.75 THEN 'Perfect for your mood'
            WHEN COALESCE(es.emotion_match_score, 0) > 0.7 THEN 'Matches your mood'
            WHEN COALESCE(vs.vibe_match_score, 0) > 0.7 THEN 'Fits your vibe'
            WHEN COALESCE(hs.genre_affinity, 0) > 0.7 THEN 'Based on your favorites'
            WHEN bs.quality_score > 0.8 THEN 'Critically acclaimed'
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
$function$;
