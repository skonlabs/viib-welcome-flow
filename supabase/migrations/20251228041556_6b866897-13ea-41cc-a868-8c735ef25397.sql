
-- Drop and recreate get_top_recommendations_v3 with language filtering and better quality checks
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    title_id UUID,
    final_score REAL,
    emotion_score REAL,
    vibe_score REAL,
    social_score REAL,
    quality_score REAL,
    popularity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '15s'
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
    
    -- Get user's language preferences (or default to English)
    SELECT COALESCE(
        ARRAY_AGG(language_code ORDER BY priority_order),
        ARRAY['en']::TEXT[]
    ) INTO v_user_languages
    FROM user_language_preferences
    WHERE user_id = p_user_id;
    
    -- If no languages found, default to English
    IF v_user_languages IS NULL OR array_length(v_user_languages, 1) IS NULL THEN
        v_user_languages := ARRAY['en']::TEXT[];
    END IF;

    RETURN QUERY
    WITH excluded_titles AS (
        SELECT DISTINCT uti.title_id AS tid
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type IN ('completed', 'disliked')
    ),
    -- Pre-filter candidates with language + quality + poster requirements
    candidate_titles AS (
        SELECT 
            t.id, 
            t.rt_cscore, 
            t.rt_ascore, 
            t.rt_acount,
            t.rt_ccount,
            t.vote_average, 
            t.popularity
        FROM titles t
        WHERE t.id NOT IN (SELECT tid FROM excluded_titles)
        AND t.poster_path IS NOT NULL
        -- Language filter: must match user's preferences
        AND t.original_language = ANY(v_user_languages)
        -- Quality filter: require decent ratings OR high popularity
        AND (
            (t.rt_ascore >= 60 AND COALESCE(t.rt_acount, 0) >= 10)  -- Good RT score with sufficient reviews
            OR (t.vote_average >= 6.5 AND t.popularity >= 20)       -- Good TMDB score with some popularity
            OR t.popularity >= 100                                   -- Very popular titles
        )
        -- Exclude obscure titles with suspiciously perfect scores
        AND NOT (t.vote_average >= 9.5 AND t.popularity < 10)
        LIMIT 500
    )
    SELECT 
        ct.id AS title_id,
        -- Scoring: quality (50%) + emotion match (30%) + popularity (20%)
        (
            COALESCE(
                CASE 
                    -- Prefer RT when we have sufficient review counts
                    WHEN ct.rt_cscore IS NOT NULL AND ct.rt_ascore IS NOT NULL 
                         AND COALESCE(ct.rt_acount, 0) >= 10 THEN
                        (ct.rt_cscore * 0.4 + ct.rt_ascore * 0.6) / 100.0
                    WHEN ct.rt_ascore IS NOT NULL AND COALESCE(ct.rt_acount, 0) >= 10 THEN 
                        ct.rt_ascore / 100.0
                    WHEN ct.rt_cscore IS NOT NULL AND COALESCE(ct.rt_ccount, 0) >= 10 THEN 
                        ct.rt_cscore / 100.0
                    -- Fall back to TMDB but cap at 0.85 to not over-rate
                    ELSE LEAST(COALESCE(ct.vote_average, 6.0) / 10.0, 0.85)
                END, 0.6
            ) * 0.5 +
            COALESCE(tumec.cosine_score * 0.3 + tumec.transformation_score * 0.7, 0.5) * 0.3 +
            LEAST(LN(COALESCE(ct.popularity, 10) + 1) / 10.0, 1.0) * 0.2
        )::REAL AS final_score,
        COALESCE(tumec.cosine_score * 0.3 + tumec.transformation_score * 0.7, 0.5)::REAL AS emotion_score,
        0.5::REAL AS vibe_score,
        0.0::REAL AS social_score,
        COALESCE(
            CASE 
                WHEN ct.rt_cscore IS NOT NULL AND ct.rt_ascore IS NOT NULL 
                     AND COALESCE(ct.rt_acount, 0) >= 10 THEN
                    (ct.rt_cscore * 0.4 + ct.rt_ascore * 0.6) / 100.0
                WHEN ct.rt_ascore IS NOT NULL AND COALESCE(ct.rt_acount, 0) >= 10 THEN 
                    ct.rt_ascore / 100.0
                WHEN ct.rt_cscore IS NOT NULL AND COALESCE(ct.rt_ccount, 0) >= 10 THEN 
                    ct.rt_cscore / 100.0
                ELSE LEAST(COALESCE(ct.vote_average, 6.0) / 10.0, 0.85)
            END, 0.6
        )::REAL AS quality_score,
        LEAST(LN(COALESCE(ct.popularity, 10) + 1) / 10.0, 1.0)::REAL AS popularity_score
    FROM candidate_titles ct
    LEFT JOIN title_user_emotion_match_cache tumec 
        ON ct.id = tumec.title_id 
        AND tumec.user_emotion_id = v_user_emotion_id
    ORDER BY final_score DESC
    LIMIT p_limit;
END;
$$;
