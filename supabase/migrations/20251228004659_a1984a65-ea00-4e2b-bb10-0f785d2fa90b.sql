
DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
    title_id uuid,
    base_viib_score real,
    emotional_component real,
    historical_component real,
    context_component real,
    vibe_component real,
    novelty_component real,
    final_score real
)
LANGUAGE plpgsql
STABLE
SET statement_timeout TO '120s'
SET search_path TO 'public'
AS $function$
DECLARE
    w_emotional      REAL := 0.35;
    w_historical     REAL := 0.30;
    w_context        REAL := 0.15;
    w_vibe           REAL := 0.10;
    w_novelty        REAL := 0.10;
    
    v_user_has_emotion BOOLEAN := FALSE;
    v_user_has_subscriptions BOOLEAN := FALSE;
    v_user_has_language_prefs BOOLEAN := FALSE;
    v_user_vibe_type TEXT := NULL;
    
    DEFAULT_SCORE_LOW CONSTANT REAL := 0.3;
    DEFAULT_SCORE_ZERO CONSTANT REAL := 0.0;
BEGIN
    -- Check user state
    SELECT EXISTS(SELECT 1 FROM user_emotion_states WHERE user_id = p_user_id) INTO v_user_has_emotion;
    SELECT EXISTS(SELECT 1 FROM user_streaming_subscriptions WHERE user_id = p_user_id AND is_active = TRUE) INTO v_user_has_subscriptions;
    SELECT EXISTS(SELECT 1 FROM user_language_preferences WHERE user_id = p_user_id) INTO v_user_has_language_prefs;
    SELECT vibe_type INTO v_user_vibe_type FROM user_vibe_preferences WHERE user_id = p_user_id LIMIT 1;

    -- Load active weights
    SELECT
        COALESCE(emotional_weight, 0.35),
        COALESCE(historical_weight, 0.30),
        COALESCE(context_weight, 0.15),
        COALESCE(vibe_weight, 0.10),
        COALESCE(novelty_weight, 0.10)
    INTO w_emotional, w_historical, w_context, w_vibe, w_novelty
    FROM viib_weight_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1;

    RETURN QUERY
    WITH
    user_interactions AS (
        SELECT DISTINCT uti.title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id AND uti.interaction_type IN ('completed', 'disliked')
    ),
    user_languages AS (
        SELECT language_code FROM user_language_preferences WHERE user_id = p_user_id
    ),
    -- Cold start: popular titles when no emotion data
    cold_start_candidates AS (
        SELECT DISTINCT t.id AS cid, t.popularity
        FROM titles t
        WHERE t.classification_status = 'complete'
          AND NOT v_user_has_emotion
          AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id)
        ORDER BY t.popularity DESC LIMIT 50
    ),
    -- Regular candidates for users with emotion data
    candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE t.classification_status = 'complete'
            AND v_user_has_emotion
            -- Streaming availability filter
            AND (NOT v_user_has_subscriptions OR EXISTS (
                SELECT 1 FROM title_streaming_availability tsa
                JOIN user_streaming_subscriptions uss ON uss.streaming_service_id = tsa.streaming_service_id
                    AND uss.user_id = p_user_id AND uss.is_active = TRUE
                WHERE tsa.title_id = t.id
            ))
            -- Language preference filter
            AND (NOT v_user_has_language_prefs OR EXISTS (
                SELECT 1 FROM user_languages ul WHERE ul.language_code = t.original_language
            ))
            -- Exclude already watched/disliked
            AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id)
    ),
    all_candidates AS (
        SELECT cid FROM candidate_titles UNION SELECT cid FROM cold_start_candidates
    ),
    -- Prefilter to top 300 by social signals and popularity
    prefiltered AS (
        SELECT ac.cid, COALESCE(rec.rec_count, 0) AS social_rec_count, COALESCE(t.popularity, 0) AS popularity_score
        FROM all_candidates ac
        JOIN titles t ON t.id = ac.cid
        LEFT JOIN (
            SELECT usr.title_id, COUNT(*) AS rec_count
            FROM user_social_recommendations usr WHERE usr.receiver_user_id = p_user_id GROUP BY usr.title_id
        ) rec ON rec.title_id = ac.cid
        ORDER BY social_rec_count DESC, popularity_score DESC LIMIT 300
    ),
    -- Calculate vibe scores
    vibe_scores AS (
        SELECT pf.cid,
            (CASE WHEN v_user_vibe_type IS NULL THEN DEFAULT_SCORE_LOW
            ELSE COALESCE((
                SELECT SUM(vgw.weight * 0.5) 
                FROM vibe_genre_weights vgw
                JOIN title_genres tg ON tg.genre_id = vgw.genre_id
                WHERE vgw.vibe_id = v_user_vibe_type AND tg.title_id = pf.cid
            ), DEFAULT_SCORE_LOW) END) AS vibe_score
        FROM prefiltered pf
    ),
    -- Calculate emotional scores using cached data
    emotional_scores AS (
        SELECT pf.cid,
            (CASE WHEN NOT v_user_has_emotion THEN DEFAULT_SCORE_LOW
            ELSE COALESCE((
                SELECT AVG(tuem.cosine_score * 0.5 + COALESCE(tuem.transformation_score, 0.5) * 0.5)
                FROM title_user_emotion_match_cache tuem
                JOIN user_emotion_states ues ON ues.emotion_id = tuem.user_emotion_id AND ues.user_id = p_user_id
                WHERE tuem.title_id = pf.cid
            ), DEFAULT_SCORE_LOW) END) AS emotional_score
        FROM prefiltered pf
    ),
    -- Calculate historical scores
    historical_scores AS (
        SELECT pf.cid,
            COALESCE((
                SELECT CASE
                    WHEN bool_or(uti.interaction_type IN ('completed','liked') AND uti.rating_value IN ('love_it','like_it')) 
                    THEN EXP(-EXTRACT(DAY FROM (NOW() - MAX(uti.created_at))) / 180.0)
                    WHEN bool_or(uti.interaction_type = 'wishlisted') THEN 0.6
                    ELSE DEFAULT_SCORE_ZERO
                END
                FROM user_title_interactions uti
                WHERE uti.user_id = p_user_id AND uti.title_id = pf.cid
            ), DEFAULT_SCORE_ZERO) AS historical_score
        FROM prefiltered pf
    ),
    -- Calculate context scores
    context_scores AS (
        SELECT pf.cid,
            COALESCE((
                SELECT CASE
                    WHEN AVG(ucl.session_length_seconds) IS NOT NULL AND t.runtime IS NOT NULL AND t.runtime > 0
                    THEN LEAST(GREATEST(1.0 - ABS(t.runtime - AVG(ucl.session_length_seconds) / 60.0) / GREATEST(t.runtime, AVG(ucl.session_length_seconds) / 60.0), 0.0), 1.0)
                    ELSE 0.5
                END
                FROM user_context_logs ucl, titles t
                WHERE ucl.user_id = p_user_id AND t.id = pf.cid
            ), 0.5) AS context_score
        FROM prefiltered pf
    ),
    -- Calculate novelty scores
    novelty_scores AS (
        SELECT pf.cid,
            (CASE WHEN EXISTS (SELECT 1 FROM user_title_interactions uti WHERE uti.user_id = p_user_id AND uti.title_id = pf.cid)
            THEN 0.3 ELSE 1.0 END) AS novelty_score
        FROM prefiltered pf
    ),
    -- Combine all scores
    scored AS (
        SELECT
            pf.cid,
            es.emotional_score,
            hs.historical_score,
            cs.context_score,
            vs.vibe_score,
            ns.novelty_score,
            (
                es.emotional_score * w_emotional +
                hs.historical_score * w_historical +
                cs.context_score * w_context +
                vs.vibe_score * w_vibe +
                ns.novelty_score * w_novelty
            ) AS base_score
        FROM prefiltered pf
        JOIN emotional_scores es ON es.cid = pf.cid
        JOIN historical_scores hs ON hs.cid = pf.cid
        JOIN context_scores cs ON cs.cid = pf.cid
        JOIN vibe_scores vs ON vs.cid = pf.cid
        JOIN novelty_scores ns ON ns.cid = pf.cid
    )
    SELECT
        s.cid AS title_id,
        s.base_score AS base_viib_score,
        s.emotional_score AS emotional_component,
        s.historical_score AS historical_component,
        s.context_score AS context_component,
        s.vibe_score AS vibe_component,
        s.novelty_score AS novelty_component,
        s.base_score AS final_score
    FROM scored s
    ORDER BY s.base_score DESC
    LIMIT p_limit;
END;
$function$;
