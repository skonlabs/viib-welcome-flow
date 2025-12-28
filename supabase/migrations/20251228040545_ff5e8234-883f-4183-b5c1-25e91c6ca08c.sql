-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(UUID, INTEGER);

-- Recreate with optimized performance
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
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
BEGIN
    -- Get user's current emotion state
    SELECT emotion_id INTO v_user_emotion_id
    FROM user_emotion_states
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Use a simplified, faster query
    RETURN QUERY
    WITH excluded_titles AS (
        SELECT DISTINCT uti.title_id AS tid
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
        AND uti.interaction_type IN ('completed', 'disliked')
    ),
    -- Pre-filter to a reasonable candidate set based on quality
    candidate_titles AS (
        SELECT t.id, t.rt_cscore, t.rt_ascore, t.rt_acount, t.vote_average, t.popularity
        FROM titles t
        WHERE t.id NOT IN (SELECT tid FROM excluded_titles)
        AND (t.rt_ascore >= 60 OR t.vote_average >= 6.0 OR t.popularity > 50)
        LIMIT 500
    )
    SELECT 
        ct.id AS title_id,
        -- Simplified scoring: quality (50%) + emotion match (30%) + popularity (20%)
        (
            COALESCE(
                CASE 
                    WHEN ct.rt_cscore IS NOT NULL AND ct.rt_ascore IS NOT NULL THEN
                        (ct.rt_cscore * 0.4 + ct.rt_ascore * 0.6) / 100.0
                    WHEN ct.rt_ascore IS NOT NULL THEN ct.rt_ascore / 100.0
                    WHEN ct.rt_cscore IS NOT NULL THEN ct.rt_cscore / 100.0
                    ELSE COALESCE(ct.vote_average, 6.0) / 10.0
                END, 0.6
            ) * 0.5 +
            COALESCE(tumec.cosine_score * 0.3 + tumec.transformation_score * 0.7, 0.5) * 0.3 +
            LEAST(LN(COALESCE(ct.rt_acount, ct.popularity, 100) + 1) / 15.0, 1.0) * 0.2
        )::REAL AS final_score,
        COALESCE(tumec.cosine_score * 0.3 + tumec.transformation_score * 0.7, 0.5)::REAL AS emotion_score,
        0.5::REAL AS vibe_score,
        0.0::REAL AS social_score,
        COALESCE(
            CASE 
                WHEN ct.rt_cscore IS NOT NULL AND ct.rt_ascore IS NOT NULL THEN
                    (ct.rt_cscore * 0.4 + ct.rt_ascore * 0.6) / 100.0
                WHEN ct.rt_ascore IS NOT NULL THEN ct.rt_ascore / 100.0
                WHEN ct.rt_cscore IS NOT NULL THEN ct.rt_cscore / 100.0
                ELSE COALESCE(ct.vote_average, 6.0) / 10.0
            END, 0.6
        )::REAL AS quality_score,
        LEAST(LN(COALESCE(ct.rt_acount, ct.popularity, 100) + 1) / 15.0, 1.0)::REAL AS popularity_score
    FROM candidate_titles ct
    LEFT JOIN title_user_emotion_match_cache tumec 
        ON ct.id = tumec.title_id 
        AND tumec.user_emotion_id = v_user_emotion_id
    ORDER BY final_score DESC
    LIMIT p_limit;
END;
$$;