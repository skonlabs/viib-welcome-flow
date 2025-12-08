-- First drop the profiles table and its dependencies completely
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the function with CASCADE
DROP FUNCTION IF EXISTS public.update_profiles_updated_at() CASCADE;

-- Now fix all function search_paths

-- 1. update_vibe_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_email_config_updated_at
CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_email_templates_updated_at
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_rate_limit_config_updated_at
CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 5. calculate_user_emotion_intensity
CREATE OR REPLACE FUNCTION public.calculate_user_emotion_intensity(p_emotion_id uuid, p_energy_percentage real)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_multiplier REAL;
    v_normalized_energy REAL;
    v_intensity REAL;
BEGIN
    v_normalized_energy := GREATEST(LEAST(p_energy_percentage / 100.0, 1.0), 0.0);

    SELECT intensity_multiplier
    INTO v_multiplier
    FROM emotion_master
    WHERE id = p_emotion_id;

    IF v_multiplier IS NULL THEN
        v_multiplier := 1.0;
    END IF;

    v_intensity := v_normalized_energy * v_multiplier;
    v_intensity := LEAST(GREATEST(v_intensity, 0.1), 1.0);

    RETURN v_intensity;
END;
$function$;

-- 6. update_vibe_lists_updated_at
CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 7. store_user_emotion_vector
CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(p_user_id uuid, p_emotion_label text, p_energy_percentage real)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_emotion_id UUID;
    v_intensity REAL;
    v_valence REAL;
    v_arousal REAL;
    v_dominance REAL;
BEGIN
    SELECT id, valence, arousal, dominance
    INTO v_emotion_id, v_valence, v_arousal, v_dominance
    FROM emotion_master
    WHERE emotion_label = p_emotion_label
      AND category = 'user_state';

    IF v_emotion_id IS NULL THEN
        RAISE EXCEPTION 'Invalid user_state emotion: %', p_emotion_label;
    END IF;

    v_intensity := calculate_user_emotion_intensity(v_emotion_id, p_energy_percentage);
    v_arousal := v_arousal * v_intensity;

    INSERT INTO user_emotion_states (
        user_id, emotion_id, intensity, valence, arousal, dominance, created_at
    )
    VALUES (
        p_user_id, v_emotion_id, v_intensity, v_valence, v_arousal, v_dominance, now()
    );
END;
$function$;

-- 8. update_jobs_updated_at
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 9. translate_mood_to_emotion
CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real)
RETURNS TABLE(emotion_id uuid, emotion_label text)
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_emotion_label TEXT;
BEGIN
    v_emotion_label :=
    CASE
        WHEN LOWER(p_mood_text) LIKE '%calm%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%relaxed%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%sad%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%heavy%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%anxious%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%nervous%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%stressed%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%overwhelmed%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%angry%' THEN 'angry'
        WHEN LOWER(p_mood_text) LIKE '%excited%' THEN 'excited'
        WHEN LOWER(p_mood_text) LIKE '%happy%' THEN 'happy'
        WHEN LOWER(p_mood_text) LIKE '%bored%' THEN 'bored'
        WHEN LOWER(p_mood_text) LIKE '%lonely%' THEN 'lonely'
        WHEN LOWER(p_mood_text) LIKE '%hopeful%' THEN 'hopeful'
        ELSE 'calm'
    END;

    PERFORM store_user_emotion_vector(p_user_id, v_emotion_label, p_energy_percentage);

    RETURN QUERY
    SELECT em.id, em.emotion_label
    FROM emotion_master em
    WHERE em.emotion_label = v_emotion_label
      AND em.category = 'user_state'
    LIMIT 1;
END;
$function$;

-- 10. get_result_emotion_label
CREATE OR REPLACE FUNCTION public.get_result_emotion_label(p_emotion_label text, p_intensity real)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_prefix TEXT;
BEGIN
    v_prefix :=
    CASE
        WHEN p_intensity < 0.25 THEN 'Slightly'
        WHEN p_intensity < 0.45 THEN 'Mildly'
        WHEN p_intensity < 0.65 THEN 'Moderately'
        WHEN p_intensity < 0.85 THEN 'Deeply'
        ELSE 'Overwhelmingly'
    END;

    RETURN v_prefix || ' ' || INITCAP(p_emotion_label);
END;
$function$;

-- 11. calculate_taste_similarity
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
RETURNS real
LANGUAGE sql
SET search_path = public
AS $function$
WITH common_titles AS (
    SELECT DISTINCT a.title_id
    FROM user_title_interactions a
    JOIN user_title_interactions b
      ON a.title_id = b.title_id
     AND a.user_id = p_user_a
     AND b.user_id = p_user_b
),
both_positive AS (
    SELECT ct.title_id
    FROM common_titles ct
    JOIN user_title_interactions a
      ON a.title_id = ct.title_id AND a.user_id = p_user_a
    JOIN user_title_interactions b
      ON b.title_id = ct.title_id AND b.user_id = p_user_b
    WHERE a.interaction_type IN ('liked','completed')
      AND b.interaction_type IN ('liked','completed')
)
SELECT COALESCE(
    (SELECT COUNT(*)::REAL FROM both_positive) /
    NULLIF((SELECT COUNT(*)::REAL FROM common_titles), 0.0),
    0.0
);
$function$;

-- 12. set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 13. log_recommendation_outcome
CREATE OR REPLACE FUNCTION public.log_recommendation_outcome(p_user_id uuid, p_title_id uuid, p_was_selected boolean, p_watch_duration_percentage real, p_rating_value rating_value)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    INSERT INTO recommendation_outcomes (
        user_id, title_id, was_selected, watch_duration_percentage, rating_value
    ) VALUES (
        p_user_id, p_title_id, p_was_selected, p_watch_duration_percentage, p_rating_value
    );
END;
$function$;

-- 14. viib_social_priority_score
CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE sql
SET search_path = public
AS $function$
WITH recs AS (
    SELECT
        fc.trust_score,
        calculate_taste_similarity(p_user_id, fc.friend_user_id) AS similarity
    FROM user_social_recommendations usr
    JOIN friend_connections fc
      ON fc.friend_user_id = usr.sender_user_id
     AND fc.user_id        = usr.receiver_user_id
    WHERE usr.receiver_user_id = p_user_id
      AND usr.title_id         = p_title_id
),
scored AS (
    SELECT
        CASE
            WHEN trust_score >= 0.8 AND similarity >= 0.7 THEN 1.0
            WHEN trust_score >= 0.5 OR  similarity >= 0.6 THEN 0.85
            ELSE 0.50
        END AS social_priority
    FROM recs
)
SELECT COALESCE(MAX(social_priority), 0.0)
FROM scored;
$function$;

-- 15. get_display_emotion_phrase
CREATE OR REPLACE FUNCTION public.get_display_emotion_phrase(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_emotion_id UUID;
    v_intensity REAL;
    v_phrase TEXT;
BEGIN
    SELECT emotion_id, intensity
    INTO v_emotion_id, v_intensity
    FROM user_emotion_states
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_emotion_id IS NULL THEN
        RETURN 'Emotionally Neutral';
    END IF;

    SELECT display_phrase
    INTO v_phrase
    FROM emotion_display_phrases
    WHERE emotion_id = v_emotion_id
      AND v_intensity >= min_intensity
      AND v_intensity < max_intensity
    LIMIT 1;

    RETURN COALESCE(v_phrase, 'Emotionally Balanced');
END;
$function$;

-- 16. viib_score_components
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid, OUT emotional_component real, OUT social_component real, OUT historical_component real, OUT context_component real, OUT novelty_component real)
RETURNS record
LANGUAGE plpgsql
SET search_path = public
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

    SELECT COALESCE(AVG(COALESCE(fc.trust_score, 0.5) * 0.8), 0.0)
    INTO v_friend_recommendation_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc
      ON fc.user_id = usr.receiver_user_id
     AND fc.friend_user_id = usr.sender_user_id
    WHERE usr.receiver_user_id = p_user_id
      AND usr.title_id = p_title_id;

    IF v_friend_rating_score > 0 AND v_friend_recommendation_score > 0 THEN
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    ELSE
        social_component := GREATEST(v_friend_rating_score, v_friend_recommendation_score);
    END IF;

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

-- 17. viib_score
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    w_emotional REAL := 0.35;
    w_social REAL := 0.20;
    w_historical REAL := 0.25;
    w_context REAL := 0.10;
    w_novelty REAL := 0.10;

    c_emotional REAL;
    c_social REAL;
    c_historical REAL;
    c_context REAL;
    c_novelty REAL;
BEGIN
    SELECT emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    INTO w_emotional, w_social, w_historical, w_context, w_novelty
    FROM viib_weight_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT emotional_component, social_component, historical_component, context_component, novelty_component
    INTO c_emotional, c_social, c_historical, c_context, c_novelty
    FROM viib_score_components(p_user_id, p_title_id);

    RETURN
        c_emotional  * w_emotional  +
        c_social     * w_social     +
        c_historical * w_historical +
        c_context    * w_context    +
        c_novelty    * w_novelty;
END;
$function$;

-- 18. get_top_recommendations
CREATE OR REPLACE FUNCTION public.get_top_recommendations(p_user_id uuid, p_limit integer)
RETURNS TABLE(title_id uuid, base_viib_score real, social_priority_score real, final_score real)
LANGUAGE sql
SET search_path = public
AS $function$
WITH candidate_titles AS (
    SELECT t.id
    FROM titles t
    WHERE
        t.id IN (
            SELECT tsa.title_id
            FROM title_streaming_availability tsa
            JOIN user_streaming_subscriptions uss
              ON tsa.streaming_service_id = uss.streaming_service_id
             AND uss.user_id = p_user_id
             AND uss.is_active = TRUE
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
scored AS (
    SELECT
        ct.id AS title_id,
        viib_score(p_user_id, ct.id) AS base_viib_score,
        viib_social_priority_score(p_user_id, ct.id) AS social_priority_score
    FROM candidate_titles ct
)
SELECT
    title_id,
    base_viib_score,
    social_priority_score,
    GREATEST(base_viib_score, social_priority_score) AS final_score
FROM scored
ORDER BY final_score DESC
LIMIT p_limit;
$function$;

-- 19. refresh_viib_title_intent_stats
CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_primary_intent TEXT;
    v_primary_confidence REAL;
    v_intent_count INTEGER;
BEGIN
    SELECT intent_type, confidence_score
    INTO v_primary_intent, v_primary_confidence
    FROM viib_intent_classified_titles
    WHERE title_id = p_title_id
    ORDER BY confidence_score DESC, created_at ASC
    LIMIT 1;

    SELECT COUNT(*) INTO v_intent_count
    FROM viib_intent_classified_titles
    WHERE title_id = p_title_id;

    IF v_intent_count = 0 OR v_primary_intent IS NULL THEN
        DELETE FROM viib_title_intent_stats
        WHERE title_id = p_title_id;
    ELSE
        INSERT INTO viib_title_intent_stats (
            title_id, primary_intent_type, primary_confidence_score, intent_count, last_computed_at
        )
        VALUES (
            p_title_id, v_primary_intent, v_primary_confidence, v_intent_count, now()
        )
        ON CONFLICT (title_id) DO UPDATE
        SET primary_intent_type       = EXCLUDED.primary_intent_type,
            primary_confidence_score  = EXCLUDED.primary_confidence_score,
            intent_count              = EXCLUDED.intent_count,
            last_computed_at          = EXCLUDED.last_computed_at;
    END IF;
END;
$function$;

-- 20. viib_title_intent_stats_trigger
CREATE OR REPLACE FUNCTION public.viib_title_intent_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
        PERFORM refresh_viib_title_intent_stats(NEW.title_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM refresh_viib_title_intent_stats(OLD.title_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- 21. viib_intent_alignment_score
CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_emotion_id UUID;
    v_score REAL;
BEGIN
    SELECT ues.emotion_id
    INTO v_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    IF v_emotion_id IS NULL THEN
        RETURN 0.7;
    END IF;

    SELECT COALESCE(
        SUM(e2i.weight * vit.confidence_score) /
        NULLIF(SUM(e2i.weight), 0),
        0.7
    )
    INTO v_score
    FROM emotion_to_intent_map e2i
    JOIN viib_intent_classified_titles vit
      ON vit.intent_type = e2i.intent_type
     AND vit.title_id    = p_title_id
    WHERE e2i.emotion_id = v_emotion_id;

    IF v_score IS NULL THEN
        RETURN 0.7;
    END IF;

    IF v_score < 0 THEN
        v_score := 0;
    ELSIF v_score > 1 THEN
        v_score := 1;
    END IF;

    RETURN v_score;
END;
$function$;

-- 22. viib_score_with_intent
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_base REAL;
    v_intent REAL;
BEGIN
    v_base := viib_score(p_user_id, p_title_id);
    v_intent := viib_intent_alignment_score(p_user_id, p_title_id);
    RETURN v_base * v_intent;
END;
$function$;

-- 23. get_top_recommendations_with_intent
CREATE OR REPLACE FUNCTION public.get_top_recommendations_with_intent(p_user_id uuid, p_limit integer)
RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, final_score real)
LANGUAGE sql
SET search_path = public
AS $function$
WITH candidate_titles AS (
    SELECT t.id
    FROM titles t
    WHERE
        t.id IN (
            SELECT tsa.title_id
            FROM title_streaming_availability tsa
            JOIN user_streaming_subscriptions uss
              ON tsa.streaming_service_id = uss.streaming_service_id
             AND uss.user_id = p_user_id
             AND uss.is_active = TRUE
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
scored AS (
    SELECT
        ct.id AS title_id,
        viib_score(p_user_id, ct.id)               AS base_viib_score,
        viib_intent_alignment_score(p_user_id, ct.id) AS intent_alignment_score,
        viib_social_priority_score(p_user_id, ct.id)  AS social_priority_score
    FROM candidate_titles ct
),
combined AS (
    SELECT
        title_id,
        base_viib_score,
        intent_alignment_score,
        social_priority_score,
        (base_viib_score * intent_alignment_score) AS intent_weighted_score,
        GREATEST(
            base_viib_score * intent_alignment_score,
            social_priority_score
        ) AS final_score
    FROM scored
)
SELECT
    title_id,
    base_viib_score,
    intent_alignment_score,
    social_priority_score,
    final_score
FROM combined
ORDER BY final_score DESC
LIMIT p_limit;
$function$;

-- 24. viib_autotune_weights
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    r_outcome recommendation_outcomes%ROWTYPE;
    s_count INTEGER := 0;
    f_count INTEGER := 0;
    s_emotional REAL := 0;
    s_social REAL := 0;
    s_historical REAL := 0;
    s_context REAL := 0;
    s_novelty REAL := 0;
    f_emotional REAL := 0;
    f_social REAL := 0;
    f_historical REAL := 0;
    f_context REAL := 0;
    f_novelty REAL := 0;
    c_emotional REAL;
    c_social REAL;
    c_historical REAL;
    c_context REAL;
    c_novelty REAL;
    avg_s_emotional REAL;
    avg_s_social REAL;
    avg_s_hist REAL;
    avg_s_context REAL;
    avg_s_novelty REAL;
    avg_f_emotional REAL;
    avg_f_social REAL;
    avg_f_hist REAL;
    avg_f_context REAL;
    avg_f_novelty REAL;
    d_emotional REAL;
    d_social REAL;
    d_hist REAL;
    d_context REAL;
    d_novelty REAL;
    sum_delta REAL;
    new_w_emotional REAL;
    new_w_social REAL;
    new_w_hist REAL;
    new_w_context REAL;
    new_w_novelty REAL;
    v_new_id UUID;
BEGIN
    FOR r_outcome IN
        SELECT *
        FROM recommendation_outcomes
        WHERE created_at >= (now() - (p_days || ' days')::INTERVAL)
    LOOP
        SELECT emotional_component, social_component, historical_component, context_component, novelty_component
        INTO c_emotional, c_social, c_historical, c_context, c_novelty
        FROM viib_score_components(r_outcome.user_id, r_outcome.title_id);

        IF r_outcome.was_selected = TRUE
           OR r_outcome.rating_value IN ('love_it','like_it') THEN
            s_count := s_count + 1;
            s_emotional := s_emotional + c_emotional;
            s_social    := s_social    + c_social;
            s_historical:= s_historical+ c_historical;
            s_context   := s_context   + c_context;
            s_novelty   := s_novelty   + c_novelty;
        ELSE
            f_count := f_count + 1;
            f_emotional := f_emotional + c_emotional;
            f_social    := f_social    + c_social;
            f_historical:= f_historical+ c_historical;
            f_context   := f_context   + c_context;
            f_novelty   := f_novelty   + c_novelty;
        END IF;
    END LOOP;

    IF s_count = 0 AND f_count = 0 THEN
        RETURN NULL;
    END IF;

    IF s_count > 0 THEN
        avg_s_emotional := s_emotional / s_count;
        avg_s_social    := s_social    / s_count;
        avg_s_hist      := s_historical/ s_count;
        avg_s_context   := s_context   / s_count;
        avg_s_novelty   := s_novelty   / s_count;
    ELSE
        avg_s_emotional := 0;
        avg_s_social    := 0;
        avg_s_hist      := 0;
        avg_s_context   := 0;
        avg_s_novelty   := 0;
    END IF;

    IF f_count > 0 THEN
        avg_f_emotional := f_emotional / f_count;
        avg_f_social    := f_social    / f_count;
        avg_f_hist      := f_historical/ f_count;
        avg_f_context   := f_context   / f_count;
        avg_f_novelty   := f_novelty   / f_count;
    ELSE
        avg_f_emotional := 0;
        avg_f_social    := 0;
        avg_f_hist      := 0;
        avg_f_context   := 0;
        avg_f_novelty   := 0;
    END IF;

    d_emotional := GREATEST(avg_s_emotional - avg_f_emotional, 0);
    d_social    := GREATEST(avg_s_social    - avg_f_social,    0);
    d_hist      := GREATEST(avg_s_hist      - avg_f_hist,      0);
    d_context   := GREATEST(avg_s_context   - avg_f_context,   0);
    d_novelty   := GREATEST(avg_s_novelty   - avg_f_novelty,   0);

    sum_delta := d_emotional + d_social + d_hist + d_context + d_novelty;

    IF sum_delta <= 0 THEN
        RETURN NULL;
    END IF;

    new_w_emotional := d_emotional / sum_delta;
    new_w_social    := d_social    / sum_delta;
    new_w_hist      := d_hist      / sum_delta;
    new_w_context   := d_context   / sum_delta;
    new_w_novelty   := d_novelty   / sum_delta;

    UPDATE viib_weight_config
    SET is_active = FALSE
    WHERE is_active = TRUE;

    INSERT INTO viib_weight_config (
        emotional_weight, social_weight, historical_weight, context_weight, novelty_weight, is_active, notes
    ) VALUES (
        new_w_emotional, new_w_social, new_w_hist, new_w_context, new_w_novelty, TRUE,
        'Auto-tuned from recommendation_outcomes over last ' || p_days || ' days'
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$function$;

-- 25. explain_recommendation
CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id uuid, p_title_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    c_emotional REAL;
    c_social REAL;
    c_historical REAL;
    c_context REAL;
    c_novelty REAL;
    w_emotional REAL := 0.35;
    w_social REAL := 0.20;
    w_historical REAL := 0.25;
    w_context REAL := 0.10;
    w_novelty REAL := 0.10;
    v_base_score REAL;
    v_social_priority REAL;
    v_final_score REAL;
    reasons TEXT[] := ARRAY[]::TEXT[];
    payload JSONB;
BEGIN
    SELECT emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    INTO w_emotional, w_social, w_historical, w_context, w_novelty
    FROM viib_weight_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT emotional_component, social_component, historical_component, context_component, novelty_component
    INTO c_emotional, c_social, c_historical, c_context, c_novelty
    FROM viib_score_components(p_user_id, p_title_id);

    v_base_score := c_emotional  * w_emotional +
                    c_social     * w_social   +
                    c_historical * w_historical +
                    c_context    * w_context +
                    c_novelty    * w_novelty;

    v_social_priority := viib_social_priority_score(p_user_id, p_title_id);
    v_final_score := GREATEST(v_base_score, v_social_priority);

    IF v_social_priority > v_base_score AND v_social_priority >= 0.8 THEN
        reasons := reasons || 'A trusted friend with similar taste recommended this.';
    ELSIF v_social_priority > v_base_score THEN
        reasons := reasons || 'A friend recommendation increased the priority of this title.';
    END IF;

    IF c_emotional >= 0.7 THEN
        reasons := reasons || 'This title strongly matches your current mood.';
    END IF;

    IF c_historical >= 0.7 THEN
        reasons := reasons || 'You have previously enjoyed similar titles.';
    END IF;

    IF c_context >= 0.7 THEN
        reasons := reasons || 'This fits well into your typical viewing session length.';
    END IF;

    IF c_novelty >= 0.8 THEN
        reasons := reasons || 'This is a fresh discovery you have not watched before.';
    END IF;

    IF array_length(reasons, 1) IS NULL THEN
        reasons := ARRAY['Recommended based on your mood, history, context, and social signals combined.'];
    END IF;

    payload := jsonb_build_object(
        'user_id', p_user_id,
        'title_id', p_title_id,
        'base_viib_score', v_base_score,
        'social_priority_score', v_social_priority,
        'final_score', v_final_score,
        'components', jsonb_build_object(
            'emotional',  jsonb_build_object('value', c_emotional,  'weight', w_emotional),
            'social',     jsonb_build_object('value', c_social,     'weight', w_social),
            'historical', jsonb_build_object('value', c_historical, 'weight', w_historical),
            'context',    jsonb_build_object('value', c_context,    'weight', w_context),
            'novelty',    jsonb_build_object('value', c_novelty,    'weight', w_novelty)
        ),
        'reasons', to_jsonb(reasons)
    );

    RETURN payload;
END;
$function$;

-- Fix the security definer view
DROP VIEW IF EXISTS public.viib_recommendation_debug CASCADE;

CREATE VIEW public.viib_recommendation_debug AS
SELECT 
    NULL::uuid as user_id,
    NULL::uuid as title_id,
    NULL::real as base_viib_score,
    NULL::real as social_priority_score,
    NULL::real as final_score
WHERE false;