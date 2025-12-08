CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid, OUT emotional_component real, OUT social_component real, OUT historical_component real, OUT context_component real, OUT novelty_component real)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_avg_session_minutes REAL;
    v_runtime_minutes INTEGER;
    v_friend_rating_score REAL;
    v_friend_recommendation_score REAL;
BEGIN
    emotional_component := 0.0;
    social_component := 0.0;
    historical_component := 0.0;
    context_component := 0.5;
    novelty_component := 0.5;

    -- Emotional component: align latest user emotion with title emotional signature
    WITH last_state AS (
        SELECT emotion_id
        FROM user_emotion_states
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 1
    )
    SELECT COALESCE(AVG(tes.intensity_level) / 10.0, 0.0)
    INTO emotional_component
    FROM last_state ls
    JOIN title_emotional_signatures tes
      ON tes.emotion_id = ls.emotion_id
    WHERE tes.title_id = p_title_id;

    -- Social component part 1: friend ratings on this title
    SELECT COALESCE(AVG(
        CASE
            WHEN uti.rating_value = 'love_it' THEN 1.0
            WHEN uti.rating_value = 'like_it' THEN 0.75
            WHEN uti.rating_value = 'ok'      THEN 0.5
            ELSE 0.0
        END * COALESCE(fc.trust_score, 0.5)
    ), 0.0)
    INTO v_friend_rating_score
    FROM friend_connections fc
    JOIN user_title_interactions uti
      ON uti.user_id = fc.friend_user_id
    WHERE fc.user_id  = p_user_id
      AND uti.title_id = p_title_id;

    -- Social component part 2: direct friend recommendations
    SELECT COALESCE(AVG(COALESCE(fc.trust_score, 0.5) * 0.8), 0.0)
    INTO v_friend_recommendation_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc
      ON fc.user_id = usr.receiver_user_id
     AND fc.friend_user_id = usr.sender_user_id
    WHERE usr.receiver_user_id = p_user_id
      AND usr.title_id = p_title_id;

    -- Combine both social signals (max of the two, or average if both exist)
    IF v_friend_rating_score > 0 AND v_friend_recommendation_score > 0 THEN
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    ELSE
        social_component := GREATEST(v_friend_rating_score, v_friend_recommendation_score);
    END IF;

    -- Historical component: user's own engagement with this title
    SELECT COALESCE(AVG(
        CASE
            WHEN interaction_type IN ('completed','liked') THEN 1.0
            WHEN interaction_type = 'wishlisted' THEN 0.5
            ELSE 0.0
        END
    ), 0.0)
    INTO historical_component
    FROM user_title_interactions
    WHERE user_id  = p_user_id
      AND title_id = p_title_id;

    -- Context component: match session length vs runtime
    SELECT COALESCE(AVG(session_length_seconds) / 60.0, NULL)
    INTO v_avg_session_minutes
    FROM user_context_logs
    WHERE user_id = p_user_id;

    SELECT runtime
    INTO v_runtime_minutes
    FROM titles
    WHERE id = p_title_id;

    IF v_avg_session_minutes IS NOT NULL AND v_runtime_minutes IS NOT NULL THEN
        context_component :=
            LEAST(
                1.0,
                1.0 - (
                    ABS(v_runtime_minutes - v_avg_session_minutes)::REAL /
                    GREATEST(v_runtime_minutes::REAL, v_avg_session_minutes, 1.0)
                )
            );
    END IF;

    -- Novelty: high if user never interacted with this title
    IF NOT EXISTS (
        SELECT 1 FROM user_title_interactions
        WHERE user_id = p_user_id AND title_id = p_title_id
    ) THEN
        novelty_component := 1.0;
    ELSE
        novelty_component := 0.3;
    END IF;

    RETURN;
END;
$function$;