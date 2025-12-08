-- Fix invalid enum value 'rated' in viib_score_components function
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
 RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_emotion_id   UUID;
    v_user_valence      REAL;
    v_user_arousal      REAL;
    v_user_dominance    REAL;
    v_user_intensity    REAL;

    v_title_valence     REAL;
    v_title_arousal     REAL;
    v_title_dominance   REAL;

    v_user_norm         REAL;
    v_title_norm        REAL;

    v_direct_cosine         REAL := NULL;
    v_transformation_score   REAL := NULL;
    v_emotional_score        REAL := 0.5;
    v_has_emotion_data       BOOLEAN := FALSE;

    v_friend_rating_score        REAL := 0.0;
    v_friend_recommendation_score REAL := 0.0;

    v_has_strong_history BOOLEAN := FALSE;
    v_has_wishlist       BOOLEAN := FALSE;

    v_avg_session_minutes REAL;
    v_runtime_minutes     REAL;
    v_diff_ratio          REAL;

    v_interaction_exists  BOOLEAN := FALSE;
BEGIN
    emotional_component  := 0.5;
    social_component     := 0.0;
    historical_component := 0.0;
    context_component    := 0.5;
    novelty_component    := 1.0;

    SELECT
        ues.emotion_id,
        ues.valence,
        ues.arousal,
        ues.dominance,
        ues.intensity
    INTO
        v_user_emotion_id,
        v_user_valence,
        v_user_arousal,
        v_user_dominance,
        v_user_intensity
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_emotion_id IS NOT NULL THEN
        SELECT
            COALESCE(AVG(em.valence   * (tes.intensity_level / 10.0)), NULL),
            COALESCE(AVG(em.arousal   * (tes.intensity_level / 10.0)), NULL),
            COALESCE(AVG(em.dominance * (tes.intensity_level / 10.0)), NULL)
        INTO
            v_title_valence,
            v_title_arousal,
            v_title_dominance
        FROM title_emotional_signatures tes
        JOIN emotion_master em ON em.id = tes.emotion_id
        WHERE tes.title_id = p_title_id;

        SELECT EXISTS (
            SELECT 1
            FROM title_emotional_signatures tes2
            WHERE tes2.title_id = p_title_id
        )
        INTO v_has_emotion_data;

        IF v_has_emotion_data THEN
            v_user_norm := sqrt(
                  power(v_user_valence,2)
                + power(v_user_arousal,2)
                + power(v_user_dominance,2)
            );

            v_title_norm := sqrt(
                  power(v_title_valence,2)
                + power(v_title_arousal,2)
                + power(v_title_dominance,2)
            );

            IF v_user_norm > 0 AND v_title_norm > 0 THEN
                v_direct_cosine :=
                    ( v_user_valence   * v_title_valence
                    + v_user_arousal   * v_title_arousal
                    + v_user_dominance * v_title_dominance )
                    / (v_user_norm * v_title_norm);

                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            END IF;

            SELECT COALESCE(
                SUM(
                    etm.strength *
                    CASE etm.transformation_type
                        WHEN 'complementary'      THEN 1.0
                        WHEN 'neutral_balancing'  THEN 0.8
                        WHEN 'reinforcing'        THEN 0.7
                        ELSE 0.5
                    END *
                    (tes.intensity_level / 10.0)
                ) / NULLIF(SUM(etm.strength),0),
                NULL
            )
            INTO v_transformation_score
            FROM emotion_transformation_map etm
            JOIN title_emotional_signatures tes
              ON tes.emotion_id = etm.to_emotion_id
            WHERE etm.from_emotion_id = v_user_emotion_id
              AND tes.title_id = p_title_id;

            v_emotional_score :=
                  0.5 * COALESCE(v_direct_cosine, 0)
                + 0.5 * COALESCE(v_transformation_score, 0);

            emotional_component :=
                LEAST(GREATEST(v_emotional_score, 0.0), 1.0);
        END IF;
    END IF;

    SELECT
        COALESCE(AVG(
            CASE uti.rating_value
                WHEN 'love_it' THEN 1.0
                WHEN 'like_it' THEN 0.75
                WHEN 'ok'      THEN 0.5
                ELSE 0.0
            END * fc.trust_score
        ), 0)
    INTO v_friend_rating_score
    FROM friend_connections fc
    JOIN user_title_interactions uti
      ON uti.user_id = fc.friend_user_id
     AND uti.title_id = p_title_id
    WHERE fc.user_id = p_user_id
      AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE);

    SELECT COALESCE(AVG(fc.trust_score * 0.8), 0)
    INTO v_friend_recommendation_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc
      ON fc.user_id = p_user_id
     AND fc.friend_user_id = usr.sender_user_id
    WHERE usr.receiver_user_id = p_user_id
      AND usr.title_id = p_title_id;

    IF v_friend_rating_score > 0 AND v_friend_recommendation_score > 0 THEN
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    ELSE
        social_component := GREATEST(v_friend_rating_score, v_friend_recommendation_score);
    END IF;

    social_component := LEAST(GREATEST(social_component, 0.0), 1.0);

    -- FIXED: Changed 'rated' to 'liked' (valid enum value)
    SELECT
        BOOL_OR(
            interaction_type IN ('completed','liked')
            AND rating_value IN ('love_it','like_it')
        ),
        BOOL_OR(interaction_type = 'wishlisted')
    INTO
        v_has_strong_history,
        v_has_wishlist
    FROM user_title_interactions
    WHERE user_id = p_user_id
      AND title_id = p_title_id;

    IF v_has_strong_history THEN
        historical_component := 1.0;
    ELSIF v_has_wishlist THEN
        historical_component := 0.5;
    ELSE
        historical_component := 0.0;
    END IF;

    SELECT COALESCE(AVG(session_length_seconds) / 60.0, NULL)
    INTO v_avg_session_minutes
    FROM user_context_logs
    WHERE user_id = p_user_id;

    SELECT t.runtime::REAL
    INTO v_runtime_minutes
    FROM titles t
    WHERE t.id = p_title_id;

    IF v_avg_session_minutes IS NOT NULL AND v_runtime_minutes IS NOT NULL THEN
        v_diff_ratio :=
            ABS(v_runtime_minutes - v_avg_session_minutes)
            / GREATEST(v_runtime_minutes, v_avg_session_minutes);

        context_component := LEAST(GREATEST(1.0 - v_diff_ratio, 0.0), 1.0);
    ELSE
        context_component := 0.5;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_title_interactions
        WHERE user_id = p_user_id AND title_id = p_title_id
    )
    INTO v_interaction_exists;

    IF v_interaction_exists THEN
        novelty_component := 0.3;
    ELSE
        novelty_component := 1.0;
    END IF;

    RETURN QUERY
    SELECT
        emotional_component,
        social_component,
        historical_component,
        context_component,
        novelty_component;
END;
$function$;