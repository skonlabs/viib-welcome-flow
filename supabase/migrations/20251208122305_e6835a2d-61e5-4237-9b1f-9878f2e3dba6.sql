-- Fix get_top_recommendations_with_intent: fully qualify all title_id references to avoid ambiguity
CREATE OR REPLACE FUNCTION public.get_top_recommendations_with_intent(p_user_id uuid, p_limit integer)
 RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, final_score real)
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Default weights if no active config exists
    w_emotional      REAL := 0.35;
    w_social         REAL := 0.20;
    w_historical     REAL := 0.25;
    w_context        REAL := 0.10;
    w_novelty        REAL := 0.10;
BEGIN
    /* ========================================================
       1. Load active weights (if present)
    ========================================================= */
    SELECT
        emotional_weight,
        social_weight,
        historical_weight,
        context_weight,
        novelty_weight
    INTO
        w_emotional,
        w_social,
        w_historical,
        w_context,
        w_novelty
    FROM viib_weight_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    /* ========================================================
       2. Pipeline
    ========================================================= */
    RETURN QUERY
    WITH candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE
            t.id IN (
                SELECT tsa.title_id
                FROM title_streaming_availability tsa
                JOIN user_streaming_subscriptions uss
                  ON uss.streaming_service_id = tsa.streaming_service_id
                 AND uss.user_id             = p_user_id
                 AND uss.is_active           = TRUE
            )
            AND t.original_language IN (
                SELECT ulp.language_code
                FROM user_language_preferences ulp
                WHERE ulp.user_id = p_user_id
            )
            AND NOT EXISTS (
                SELECT 1
                FROM user_title_interactions uti
                WHERE uti.user_id = p_user_id
                  AND uti.title_id = t.id
                  AND uti.interaction_type IN ('completed','disliked')
            )
    ),

    prefiltered AS (
        SELECT
            ct.cid,
            COALESCE(usr.rec_count, 0)   AS social_rec_count,
            COALESCE(t.popularity, 0)    AS popularity_score,
            COALESCE(uti_agg.interactions,0) AS user_interaction_count
        FROM candidate_titles ct
        JOIN titles t ON t.id = ct.cid
        LEFT JOIN (
            SELECT
                usr_inner.title_id AS usr_title_id,
                COUNT(*) AS rec_count
            FROM user_social_recommendations usr_inner
            WHERE usr_inner.receiver_user_id = p_user_id
            GROUP BY usr_inner.title_id
        ) usr ON usr.usr_title_id = ct.cid
        LEFT JOIN (
            SELECT
                uti_inner.title_id AS uti_title_id,
                COUNT(*) AS interactions
            FROM user_title_interactions uti_inner
            WHERE uti_inner.user_id = p_user_id
            GROUP BY uti_inner.title_id
        ) uti_agg ON uti_agg.uti_title_id = ct.cid
        ORDER BY
            social_rec_count DESC,
            popularity_score DESC,
            user_interaction_count ASC
        LIMIT 300
    ),

    scored_components AS (
        SELECT
            pf.cid,
            vsc.emotional_component,
            vsc.social_component,
            vsc.historical_component,
            vsc.context_component,
            vsc.novelty_component
        FROM prefiltered pf
        CROSS JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc(
            emotional_component,
            social_component,
            historical_component,
            context_component,
            novelty_component
        )
    ),

    base_scored AS (
        SELECT
            sc.cid,
            sc.emotional_component,
            sc.social_component,
            sc.historical_component,
            sc.context_component,
            sc.novelty_component,
            (
              sc.emotional_component  * w_emotional
            + sc.social_component     * w_social
            + sc.historical_component * w_historical
            + sc.context_component    * w_context
            + sc.novelty_component    * w_novelty
            ) AS base_score
        FROM scored_components sc
    ),

    top_base AS (
        SELECT
            b.cid,
            b.base_score
        FROM base_scored b
        ORDER BY b.base_score DESC
        LIMIT 100
    ),

    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            viib_intent_alignment_score(p_user_id, tb.cid) AS intent_score,
            viib_social_priority_score(p_user_id, tb.cid)  AS social_score
        FROM top_base tb
    ),

    combined AS (
        SELECT
            wi.cid,
            wi.base_score,
            wi.intent_score,
            wi.social_score,
            GREATEST(
                wi.base_score * wi.intent_score,
                wi.social_score
            ) AS combined_score
        FROM with_intent wi
    )

    SELECT
        c.cid,
        c.base_score,
        c.intent_score,
        c.social_score,
        c.combined_score
    FROM combined c
    ORDER BY c.combined_score DESC
    LIMIT p_limit;

END;
$function$;