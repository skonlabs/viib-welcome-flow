-- Fix viib_autotune_weights function to use correct columns (was_selected, rating_value instead of outcome_type)
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30, p_min_samples integer DEFAULT 100)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_from_ts TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;

    -- Averages for success/failure
    s_emotional  REAL;
    s_social     REAL;
    s_historical REAL;
    s_context    REAL;
    s_novelty    REAL;

    f_emotional  REAL;
    f_social     REAL;
    f_historical REAL;
    f_context    REAL;
    f_novelty    REAL;

    d_emotional  REAL;
    d_social     REAL;
    d_historical REAL;
    d_context    REAL;
    d_novelty    REAL;

    total_delta  REAL;

    w_emotional  REAL;
    w_social     REAL;
    w_historical REAL;
    w_context    REAL;
    w_novelty    REAL;

    v_success_count INTEGER;
    v_failure_count INTEGER;
BEGIN
    /* --------------------------------------------------------
       1. Count samples - FIXED: use was_selected and rating_value instead of outcome_type
    --------------------------------------------------------- */
    SELECT
        COUNT(*) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        COUNT(*) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it')))
    INTO v_success_count, v_failure_count
    FROM recommendation_outcomes
    WHERE created_at >= v_from_ts;

    IF v_success_count + v_failure_count < p_min_samples THEN
        -- not enough data; skip autotune
        RETURN;
    END IF;

    /* --------------------------------------------------------
       2. Aggregate component averages for success vs failure - FIXED
    --------------------------------------------------------- */

    WITH comps AS (
        SELECT
            ro.user_id,
            ro.title_id,
            ro.was_selected,
            ro.rating_value,
            vsc.emotional_component,
            vsc.social_component,
            vsc.historical_component,
            vsc.context_component,
            vsc.novelty_component
        FROM recommendation_outcomes ro
        CROSS JOIN LATERAL viib_score_components(ro.user_id, ro.title_id) AS vsc(
            emotional_component,
            social_component,
            historical_component,
            context_component,
            novelty_component
        )
        WHERE ro.created_at >= v_from_ts
    )
    SELECT
        AVG(emotional_component)  FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(social_component)     FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(historical_component) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(context_component)    FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(novelty_component)    FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),

        AVG(emotional_component)  FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(social_component)     FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(historical_component) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(context_component)    FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(novelty_component)    FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it')))
    INTO
        s_emotional,  s_social,  s_historical,  s_context,  s_novelty,
        f_emotional,  f_social,  f_historical,  f_context,  f_novelty
    FROM comps;

    d_emotional  := GREATEST(COALESCE(s_emotional  - f_emotional , 0), 0);
    d_social     := GREATEST(COALESCE(s_social     - f_social    , 0), 0);
    d_historical := GREATEST(COALESCE(s_historical - f_historical, 0), 0);
    d_context    := GREATEST(COALESCE(s_context    - f_context   , 0), 0);
    d_novelty    := GREATEST(COALESCE(s_novelty    - f_novelty   , 0), 0);

    total_delta := d_emotional + d_social + d_historical + d_context + d_novelty;

    IF total_delta <= 0 THEN
        -- nothing clearly differentiating; keep previous weights
        RETURN;
    END IF;

    w_emotional  := d_emotional  / total_delta;
    w_social     := d_social     / total_delta;
    w_historical := d_historical / total_delta;
    w_context    := d_context    / total_delta;
    w_novelty    := d_novelty    / total_delta;

    /* --------------------------------------------------------
       3. Deactivate previous config and insert new one
    --------------------------------------------------------- */

    UPDATE viib_weight_config
    SET is_active = FALSE
    WHERE is_active = TRUE;

    INSERT INTO viib_weight_config (
        id,
        emotional_weight,
        social_weight,
        historical_weight,
        context_weight,
        novelty_weight,
        is_active,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        w_emotional,
        w_social,
        w_historical,
        w_context,
        w_novelty,
        TRUE,
        now()
    );
END;
$function$;