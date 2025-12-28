
-- ============================================================
-- VIIB RECOMMENDATION ENGINE FIX - COMPREHENSIVE OVERHAUL
-- ============================================================

-- 1. FIX: Expand vibe_genre_weights to cover ALL 18 genres × 5 vibes = 90 combinations
-- Currently only 49 entries exist. Adding missing combinations with sensible defaults.

-- First, let's add all missing combinations
INSERT INTO vibe_genre_weights (vibe_id, genre_id, weight)
SELECT v.id as vibe_id, g.id as genre_id,
  CASE 
    -- bold_energetic vibe
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'Western' THEN 0.7
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'History' THEN 0.3
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'Animation' THEN 0.4
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'Comedy' THEN 0.3
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'Family' THEN 0.1
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'Horror' THEN 0.6
    WHEN v.id = 'bold_energetic' AND g.genre_name = 'Mystery' THEN 0.4
    
    -- calm_reflective vibe
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Western' THEN 0.1
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'History' THEN 0.6
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Fantasy' THEN 0.3
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Science Fiction' THEN 0.2
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Adventure' THEN 0.1
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Crime' THEN -0.2
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Mystery' THEN 0.4
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'War' THEN -0.3
    WHEN v.id = 'calm_reflective' AND g.genre_name = 'Family' THEN 0.5
    
    -- curious_thoughtprovoking vibe
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'Western' THEN 0.2
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'History' THEN 0.7
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'Animation' THEN 0.3
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'War' THEN 0.4
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'Action' THEN 0.2
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'Adventure' THEN 0.4
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'Music' THEN 0.3
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name = 'Romance' THEN 0.1
    
    -- dark_intense vibe  
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Western' THEN 0.5
    WHEN v.id = 'dark_intense' AND g.genre_name = 'History' THEN 0.5
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Animation' THEN 0.1
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Adventure' THEN 0.3
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Fantasy' THEN 0.3
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Science Fiction' THEN 0.5
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Family' THEN -0.5
    WHEN v.id = 'dark_intense' AND g.genre_name = 'Music' THEN -0.2
    
    -- light_feelgood vibe
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'Western' THEN 0.1
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'History' THEN 0.2
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'Science Fiction' THEN 0.3
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'Mystery' THEN 0.2
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'Crime' THEN -0.2
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'War' THEN -0.4
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'Thriller' THEN -0.1
    WHEN v.id = 'light_feelgood' AND g.genre_name = 'Documentary' THEN 0.3
    
    ELSE 0.0
  END as weight
FROM vibes v
CROSS JOIN genres g
WHERE NOT EXISTS (
  SELECT 1 FROM vibe_genre_weights vgw 
  WHERE vgw.vibe_id = v.id AND vgw.genre_id = g.id
)
AND CASE 
    WHEN v.id = 'bold_energetic' AND g.genre_name IN ('Western', 'History', 'Animation', 'Comedy', 'Family', 'Horror', 'Mystery') THEN true
    WHEN v.id = 'calm_reflective' AND g.genre_name IN ('Western', 'History', 'Fantasy', 'Science Fiction', 'Adventure', 'Crime', 'Mystery', 'War', 'Family') THEN true
    WHEN v.id = 'curious_thoughtprovoking' AND g.genre_name IN ('Western', 'History', 'Animation', 'War', 'Action', 'Adventure', 'Music', 'Romance') THEN true
    WHEN v.id = 'dark_intense' AND g.genre_name IN ('Western', 'History', 'Animation', 'Adventure', 'Fantasy', 'Science Fiction', 'Family', 'Music') THEN true
    WHEN v.id = 'light_feelgood' AND g.genre_name IN ('Western', 'History', 'Science Fiction', 'Mystery', 'Crime', 'War', 'Thriller', 'Documentary') THEN true
    ELSE false
END;

-- 2. FIX: Create new function for emotion matching that uses EUCLIDEAN DISTANCE instead of broken cosine
-- This gives better spread of scores (0-1 with meaningful distribution)
CREATE OR REPLACE FUNCTION public.calculate_emotion_distance_score(
    p_user_valence REAL,
    p_user_arousal REAL,
    p_user_dominance REAL,
    p_title_valence REAL,
    p_title_arousal REAL,
    p_title_dominance REAL
)
RETURNS REAL
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
    v_euclidean_dist REAL;
    v_max_dist REAL := 1.732; -- sqrt(3) for normalized 0-1 space
    v_similarity REAL;
BEGIN
    -- Calculate Euclidean distance in VAD space
    v_euclidean_dist := sqrt(
        power(p_user_valence - p_title_valence, 2) +
        power(p_user_arousal - p_title_arousal, 2) +
        power(p_user_dominance - p_title_dominance, 2)
    );
    
    -- Convert distance to similarity score (0-1, where 1 = identical)
    v_similarity := 1.0 - (v_euclidean_dist / v_max_dist);
    
    -- Clamp to 0-1 range
    RETURN LEAST(GREATEST(v_similarity, 0.0), 1.0);
END;
$$;

-- 3. FIX: Rewrite refresh_title_user_emotion_match_cache with proper scoring
CREATE OR REPLACE FUNCTION public.refresh_title_user_emotion_match_cache()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
SET statement_timeout TO '600s'
AS $$
DECLARE
    v_emotion RECORD;
    v_batch_size INT := 5000;
    v_offset INT;
    v_rows_inserted INT;
BEGIN
    -- Process each user_state emotion one at a time
    FOR v_emotion IN
        SELECT id, valence, arousal, dominance
        FROM public.emotion_master
        WHERE category = 'user_state'
    LOOP
        v_offset := 0;

        LOOP
            WITH batch_insert AS (
                INSERT INTO public.title_user_emotion_match_cache (
                    title_id,
                    user_emotion_id,
                    cosine_score,
                    transformation_score,
                    updated_at
                )
                SELECT
                    tev.title_id,
                    v_emotion.id AS user_emotion_id,
                    -- Use Euclidean distance-based similarity instead of broken cosine
                    calculate_emotion_distance_score(
                        v_emotion.valence,
                        v_emotion.arousal,
                        v_emotion.dominance,
                        tev.valence,
                        tev.arousal,
                        tev.dominance
                    ) AS cosine_score,
                    COALESCE(tts.transformation_score, 0.5)::real AS transformation_score,
                    now() AS updated_at
                FROM (
                    SELECT title_id, valence, arousal, dominance
                    FROM public.title_emotion_vectors
                    ORDER BY title_id
                    LIMIT v_batch_size OFFSET v_offset
                ) tev
                LEFT JOIN public.title_transformation_scores tts
                    ON tts.title_id = tev.title_id
                   AND tts.user_emotion_id = v_emotion.id
                ON CONFLICT (title_id, user_emotion_id)
                DO UPDATE SET
                    cosine_score = EXCLUDED.cosine_score,
                    transformation_score = EXCLUDED.transformation_score,
                    updated_at = now()
                RETURNING 1
            )
            SELECT COUNT(*) INTO v_rows_inserted FROM batch_insert;

            IF v_rows_inserted = 0 THEN
                EXIT;
            END IF;

            v_offset := v_offset + v_batch_size;
        END LOOP;
    END LOOP;
END;
$$;

-- 4. FIX: Create improved get_top_recommendations_v3 with better scoring logic
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
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
STABLE
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $$
DECLARE
    v_user_emotion_id UUID;
    v_user_valence REAL;
    v_user_arousal REAL;
    v_user_dominance REAL;
    v_user_vibe_type TEXT;
    v_user_country TEXT;
    v_user_languages TEXT[];
    -- Weights - mood gets MORE weight than vibe when they conflict
    v_emotion_weight REAL := 0.45;  -- Increased from 0.30
    v_vibe_weight REAL := 0.15;     -- Decreased from 0.30  
    v_base_weight REAL := 0.15;
    v_social_weight REAL := 0.10;
    v_historical_weight REAL := 0.10;
    v_novelty_weight REAL := 0.05;
BEGIN
    -- Get user's current emotion state with VAD values
    SELECT ues.emotion_id, ues.valence, ues.arousal, ues.dominance
    INTO v_user_emotion_id, v_user_valence, v_user_arousal, v_user_dominance
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Get user's vibe preference
    SELECT uvp.vibe_type INTO v_user_vibe_type
    FROM user_vibe_preferences uvp
    WHERE uvp.user_id = p_user_id;

    -- Get user's country (default to US if not set)
    SELECT COALESCE(u.country, 'US') INTO v_user_country
    FROM users u
    WHERE u.id = p_user_id;

    -- Get user's language preferences
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
        WHERE tsa.region_code = v_user_country
    ),
    excluded_titles AS (
        SELECT DISTINCT uti.title_id AS tid
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type IN ('completed', 'disliked')
    ),
    -- FIXED: Emotion matching using direct VAD distance calculation
    emotion_scores AS (
        SELECT 
            tev.title_id AS tid,
            (CASE 
                WHEN v_user_emotion_id IS NOT NULL THEN
                    -- Use Euclidean distance-based similarity
                    calculate_emotion_distance_score(
                        COALESCE(v_user_valence, 0.5),
                        COALESCE(v_user_arousal, 0.5),
                        COALESCE(v_user_dominance, 0.5),
                        tev.valence,
                        tev.arousal,
                        tev.dominance
                    ) * 0.6 +
                    -- Add transformation score bonus
                    COALESCE(tts.transformation_score, 0.5) * 0.4
                ELSE 0.5
            END)::REAL as emotion_match_score,
            -- Keep raw distance for reason generation
            calculate_emotion_distance_score(
                COALESCE(v_user_valence, 0.5),
                COALESCE(v_user_arousal, 0.5),
                COALESCE(v_user_dominance, 0.5),
                tev.valence,
                tev.arousal,
                tev.dominance
            )::REAL as raw_emotion_distance
        FROM title_emotion_vectors tev
        LEFT JOIN title_transformation_scores tts
            ON tev.title_id = tts.title_id
            AND tts.user_emotion_id = v_user_emotion_id
    ),
    -- Vibe matching using genre weights
    vibe_scores AS (
        SELECT 
            tg.title_id AS tid,
            (CASE 
                WHEN v_user_vibe_type IS NOT NULL THEN
                    -- Use average of matching genre weights, with higher default
                    COALESCE(AVG(vgw.weight), 0.4)
                ELSE 0.5
            END)::REAL as vibe_match_score
        FROM title_genres tg
        LEFT JOIN vibe_genre_weights vgw 
            ON tg.genre_id = vgw.genre_id 
            AND vgw.vibe_id = v_user_vibe_type
        GROUP BY tg.title_id
    ),
    -- Social signals
    social_scores AS (
        SELECT 
            utss.title_id AS tid,
            utss.social_component_score as social_score,
            utss.social_priority_score
        FROM user_title_social_scores utss
        WHERE utss.user_id = p_user_id
    ),
    -- Historical genre affinity
    historical_scores AS (
        SELECT 
            tg.title_id AS tid,
            (COUNT(CASE WHEN uti.rating_value IN ('love_it', 'like_it') THEN 1 END)::REAL / 
            NULLIF(COUNT(*)::REAL, 0))::REAL as genre_affinity
        FROM title_genres tg
        INNER JOIN title_genres liked_tg ON tg.genre_id = liked_tg.genre_id
        INNER JOIN user_title_interactions uti ON liked_tg.title_id = uti.title_id
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type = 'completed'
        AND uti.rating_value IN ('love_it', 'like_it')
        GROUP BY tg.title_id
    ),
    -- Base quality scores with STRONGER language preferences
    base_scores AS (
        SELECT 
            t.id as tid,
            -- Quality score
            (CASE 
                WHEN t.rt_cscore IS NOT NULL THEN t.rt_cscore::REAL / 100.0
                WHEN t.rt_ascore IS NOT NULL THEN t.rt_ascore::REAL / 100.0
                ELSE COALESCE(t.vote_average::REAL, 5.0) / 10.0
            END)::REAL as quality_score,
            -- Popularity (capped)
            (LEAST(COALESCE(t.popularity::REAL, 0), 100.0) / 100.0)::REAL as popularity_score,
            -- FIXED: Stronger language preference weighting
            (CASE 
                WHEN v_user_languages IS NULL OR array_length(v_user_languages, 1) IS NULL THEN 1.0
                WHEN t.original_language = v_user_languages[1] THEN 1.0   -- Primary language: full weight
                WHEN t.original_language = v_user_languages[2] THEN 0.85  -- Secondary: 15% penalty
                WHEN t.original_language = v_user_languages[3] THEN 0.70  -- Tertiary: 30% penalty
                WHEN t.original_language = ANY(v_user_languages) THEN 0.60 -- Other preferred: 40% penalty
                ELSE 0.40 -- Not in preferences: 60% penalty (was 50%)
            END)::REAL as language_bonus,
            t.original_language
        FROM titles t
        WHERE t.id IN (SELECT at.tid FROM available_titles at)
        AND t.id NOT IN (SELECT et.tid FROM excluded_titles et)
        -- Filter out likely BTS/featurette content
        AND t.runtime IS NOT NULL 
        AND t.runtime > 20  -- Exclude very short content
    )
    SELECT 
        bs.tid AS out_title_id,
        ((
            COALESCE(es.emotion_match_score, 0.5) * v_emotion_weight +
            COALESCE(vs.vibe_match_score, 0.5) * v_vibe_weight +
            COALESCE(ss.social_score, 0.0) * v_social_weight +
            COALESCE(hs.genre_affinity, 0.5) * v_historical_weight +
            (1.0 - COALESCE(hs.genre_affinity, 0.5)) * v_novelty_weight +
            (bs.quality_score * 0.7 + bs.popularity_score * 0.3) * v_base_weight
        ) * bs.language_bonus)::REAL as out_final_score,
        COALESCE(es.emotion_match_score, 0.5)::REAL as out_emotional_component,
        COALESCE(vs.vibe_match_score, 0.5)::REAL as out_vibe_component,
        COALESCE(ss.social_score, 0.0)::REAL as out_social_component,
        COALESCE(hs.genre_affinity, 0.5)::REAL as out_historical_component,
        (1.0 - COALESCE(hs.genre_affinity, 0.5))::REAL as out_novelty_component,
        0.5::REAL as out_context_component,
        ((bs.quality_score * 0.7 + bs.popularity_score * 0.3))::REAL as out_base_score,
        CASE 
            WHEN COALESCE(ss.social_priority_score, 0) > 0.7 THEN 'Recommended by friends'
            WHEN COALESCE(es.raw_emotion_distance, 0) > 0.85 THEN 'Perfect for your mood'
            WHEN COALESCE(es.emotion_match_score, 0) > 0.7 THEN 'Matches your mood'
            WHEN bs.original_language = v_user_languages[1] AND COALESCE(es.emotion_match_score, 0) > 0.5 THEN 'Great pick in your language'
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
$$;

-- 5. Add country column default handling (set IP-detected country if available)
-- Update existing users without country to use their ip_country
UPDATE users 
SET country = ip_country 
WHERE country IS NULL 
AND ip_country IS NOT NULL 
AND ip_country != 'Unknown';

-- 6. Add index for faster recommendation queries
CREATE INDEX IF NOT EXISTS idx_title_emotion_vectors_vad 
ON title_emotion_vectors (valence, arousal, dominance);

CREATE INDEX IF NOT EXISTS idx_titles_runtime_filter 
ON titles (runtime) 
WHERE runtime > 20;
