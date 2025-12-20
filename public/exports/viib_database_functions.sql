-- ViiB Database Functions Export
-- Generated: 2024-12-15
-- Project: ViiB Recommendation Engine

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================
-- EMOTION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_user_emotion_intensity(p_emotion_id uuid, p_energy_percentage real)
 RETURNS real
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(p_user_id uuid, p_emotion_label text, p_energy_percentage real)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real)
 RETURNS TABLE(emotion_id uuid, emotion_label text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_result_emotion_label(p_emotion_label text, p_intensity real)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_display_emotion_phrase(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

-- ============================================
-- SOCIAL FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
 RETURNS real
 LANGUAGE sql
 SET search_path TO 'public'
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

-- ============================================
-- MATERIALIZATION REFRESH FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
AS $function$
    INSERT INTO title_emotion_vectors (
        title_id, valence, arousal, dominance, emotion_strength, updated_at
    )
    SELECT
        vec.title_id,
        AVG(em.valence   * (vec.intensity_level / 10.0)) AS valence,
        AVG(em.arousal   * (vec.intensity_level / 10.0)) AS arousal,
        AVG(em.dominance * (vec.intensity_level / 10.0)) AS dominance,
        AVG(vec.intensity_level / 10.0)                  AS emotion_strength,
        NOW()                                            AS updated_at
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    GROUP BY vec.title_id
    ON CONFLICT (title_id) DO UPDATE
    SET
        valence          = EXCLUDED.valence,
        arousal          = EXCLUDED.arousal,
        dominance        = EXCLUDED.dominance,
        emotion_strength = EXCLUDED.emotion_strength,
        updated_at       = EXCLUDED.updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
AS $function$
    INSERT INTO title_transformation_scores (
        user_emotion_id, title_id, transformation_score, updated_at
    )
    SELECT
        etm.user_emotion_id,
        vec.title_id,
        COALESCE(
            SUM(
                etm.confidence_score *
                CASE etm.transformation_type
                    WHEN 'complementary'      THEN 1.0
                    WHEN 'neutral_balancing'  THEN 0.8
                    WHEN 'reinforcing'        THEN 0.7
                    ELSE 0.5
                END *
                (vec.intensity_level / 10.0)
            ) / NULLIF(SUM(etm.confidence_score), 0),
            0.0
        ) AS transformation_score,
        NOW() AS updated_at
    FROM emotion_transformation_map etm
    JOIN emotion_master em_user
      ON em_user.id = etm.user_emotion_id
     AND em_user.category = 'user_state'
    JOIN viib_emotion_classified_titles vec
      ON vec.emotion_id = etm.content_emotion_id
    GROUP BY etm.user_emotion_id, vec.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE
    SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at           = EXCLUDED.updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
AS $function$
    INSERT INTO title_intent_alignment_scores (
        user_emotion_id, title_id, alignment_score, updated_at
    )
    SELECT
        e2i.emotion_id AS user_emotion_id,
        vit.title_id,
        COALESCE(
            SUM(e2i.weight * vit.confidence_score)
            / NULLIF(SUM(e2i.weight), 0),
            0.7
        ) AS alignment_score,
        NOW() AS updated_at
    FROM emotion_to_intent_map e2i
    JOIN viib_intent_classified_titles vit
      ON vit.intent_type = e2i.intent_type
    GROUP BY e2i.emotion_id, vit.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE
    SET
        alignment_score = EXCLUDED.alignment_score,
        updated_at      = EXCLUDED.updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
 RETURNS void
 LANGUAGE sql
AS $function$
    WITH rating_agg AS (
        SELECT
            uti.title_id,
            AVG(
                CASE uti.rating_value
                    WHEN 'love_it' THEN 1.0
                    WHEN 'like_it' THEN 0.75
                    WHEN 'ok'      THEN 0.5
                    ELSE 0.0
                END
            ) AS mean_rating
        FROM user_title_interactions uti
        WHERE uti.rating_value IS NOT NULL
        GROUP BY uti.title_id
    ),
    rec_agg AS (
        SELECT
            usr.title_id,
            COUNT(*) AS rec_count
        FROM user_social_recommendations usr
        GROUP BY usr.title_id
    )
    INSERT INTO title_social_summary (
        title_id, social_mean_rating, social_rec_power, updated_at
    )
    SELECT
        t.id AS title_id,
        COALESCE(r.mean_rating, 0.0) AS social_mean_rating,
        COALESCE(
            CASE
                WHEN ra.rec_count IS NULL OR ra.rec_count = 0 THEN 0.0
                ELSE LEAST(LOG(1 + ra.rec_count::REAL), 5.0)
            END,
            0.0
        ) AS social_rec_power,
        NOW() AS updated_at
    FROM titles t
    LEFT JOIN rating_agg r ON r.title_id = t.id
    LEFT JOIN rec_agg   ra ON ra.title_id = t.id
    ON CONFLICT (title_id) DO UPDATE
    SET
        social_mean_rating = EXCLUDED.social_mean_rating,
        social_rec_power   = EXCLUDED.social_rec_power,
        updated_at         = EXCLUDED.updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_viib_reco_materializations()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM refresh_title_emotion_vectors();
    PERFORM refresh_title_transformation_scores();
    PERFORM refresh_title_intent_alignment_scores();
    PERFORM refresh_title_social_summary();
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

-- ============================================
-- VIIB SCORE FUNCTIONS
-- ============================================

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

    -- Get user emotion state
    SELECT ues.emotion_id, ues.valence, ues.arousal, ues.dominance, ues.intensity
    INTO v_user_emotion_id, v_user_valence, v_user_arousal, v_user_dominance, v_user_intensity
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_emotion_id IS NOT NULL THEN
        -- Get title emotion vectors
        SELECT
            COALESCE(AVG(em.valence   * (vec.intensity_level / 10.0)), NULL),
            COALESCE(AVG(em.arousal   * (vec.intensity_level / 10.0)), NULL),
            COALESCE(AVG(em.dominance * (vec.intensity_level / 10.0)), NULL)
        INTO v_title_valence, v_title_arousal, v_title_dominance
        FROM viib_emotion_classified_titles vec
        JOIN emotion_master em ON em.id = vec.emotion_id
        WHERE vec.title_id = p_title_id;

        SELECT EXISTS (
            SELECT 1 FROM viib_emotion_classified_titles vec2 WHERE vec2.title_id = p_title_id
        )
        INTO v_has_emotion_data;

        IF v_has_emotion_data THEN
            v_user_norm := sqrt(power(v_user_valence,2) + power(v_user_arousal,2) + power(v_user_dominance,2));
            v_title_norm := sqrt(power(v_title_valence,2) + power(v_title_arousal,2) + power(v_title_dominance,2));

            IF v_user_norm > 0 AND v_title_norm > 0 THEN
                v_direct_cosine := (v_user_valence * v_title_valence + v_user_arousal * v_title_arousal + v_user_dominance * v_title_dominance) / (v_user_norm * v_title_norm);
                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            END IF;

            v_emotional_score := 0.5 * COALESCE(v_direct_cosine, 0) + 0.5 * COALESCE(v_transformation_score, 0);
            emotional_component := LEAST(GREATEST(v_emotional_score, 0.0), 1.0);
        END IF;
    END IF;

    -- Social component from friend ratings
    SELECT COALESCE(AVG(
        CASE uti.rating_value
            WHEN 'love_it' THEN 1.0
            WHEN 'like_it' THEN 0.75
            WHEN 'ok'      THEN 0.5
            ELSE 0.0
        END * fc.trust_score
    ), 0)
    INTO v_friend_rating_score
    FROM friend_connections fc
    JOIN user_title_interactions uti ON uti.user_id = fc.friend_user_id AND uti.title_id = p_title_id
    WHERE fc.user_id = p_user_id AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE);

    -- Social component from friend recommendations
    SELECT COALESCE(AVG(fc.trust_score * 0.8), 0)
    INTO v_friend_recommendation_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc ON fc.user_id = p_user_id AND fc.friend_user_id = usr.sender_user_id
    WHERE usr.receiver_user_id = p_user_id AND usr.title_id = p_title_id;

    IF v_friend_rating_score > 0 AND v_friend_recommendation_score > 0 THEN
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    ELSE
        social_component := GREATEST(v_friend_rating_score, v_friend_recommendation_score);
    END IF;
    social_component := LEAST(GREATEST(social_component, 0.0), 1.0);

    -- Historical component
    SELECT
        BOOL_OR(interaction_type IN ('completed','liked') AND rating_value IN ('love_it','like_it')),
        BOOL_OR(interaction_type = 'wishlisted')
    INTO v_has_strong_history, v_has_wishlist
    FROM user_title_interactions
    WHERE user_id = p_user_id AND title_id = p_title_id;

    IF v_has_strong_history THEN
        historical_component := 1.0;
    ELSIF v_has_wishlist THEN
        historical_component := 0.5;
    ELSE
        historical_component := 0.0;
    END IF;

    -- Context component
    SELECT COALESCE(AVG(session_length_seconds) / 60.0, NULL)
    INTO v_avg_session_minutes
    FROM user_context_logs
    WHERE user_id = p_user_id;

    SELECT t.runtime::REAL
    INTO v_runtime_minutes
    FROM titles t
    WHERE t.id = p_title_id;

    IF v_avg_session_minutes IS NOT NULL AND v_runtime_minutes IS NOT NULL THEN
        v_diff_ratio := ABS(v_runtime_minutes - v_avg_session_minutes) / GREATEST(v_runtime_minutes, v_avg_session_minutes);
        context_component := LEAST(GREATEST(1.0 - v_diff_ratio, 0.0), 1.0);
    ELSE
        context_component := 0.5;
    END IF;

    -- Novelty component
    SELECT EXISTS (SELECT 1 FROM user_title_interactions WHERE user_id = p_user_id AND title_id = p_title_id)
    INTO v_interaction_exists;

    IF v_interaction_exists THEN
        novelty_component := 0.3;
    ELSE
        novelty_component := 1.0;
    END IF;

    RETURN QUERY SELECT emotional_component, social_component, historical_component, context_component, novelty_component;
END;
$function$;

CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

    RETURN c_emotional * w_emotional + c_social * w_social + c_historical * w_historical + c_context * w_context + c_novelty * w_novelty;
END;
$function$;

CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_emotion_id UUID;
    v_intensity       REAL := 0.7;
    v_score           REAL;
BEGIN
    SELECT emotion_id, intensity
    INTO   v_user_emotion_id, v_intensity
    FROM user_emotion_states
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_emotion_id IS NULL THEN
        RETURN 0.7;
    END IF;

    v_intensity := LEAST(GREATEST(v_intensity, 0.1), 1.0);

    SELECT COALESCE(
        SUM(e2i.weight * vit.confidence_score * (0.5 + 0.5 * v_intensity)) / NULLIF(SUM(e2i.weight), 0),
        0.7
    )
    INTO v_score
    FROM emotion_to_intent_map e2i
    JOIN viib_intent_classified_titles vit ON vit.intent_type = e2i.intent_type AND vit.title_id = p_title_id
    WHERE e2i.emotion_id = v_user_emotion_id;

    RETURN LEAST(GREATEST(v_score, 0.0), 1.0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_priority REAL := 0.0;
    v_trust    REAL;
    v_sim      REAL;
BEGIN
    FOR v_trust, v_sim IN
        SELECT fc.trust_score, calculate_taste_similarity(p_user_id, fc.friend_user_id)
        FROM user_social_recommendations usr
        JOIN friend_connections fc ON fc.user_id = p_user_id AND fc.friend_user_id = usr.sender_user_id
        WHERE usr.receiver_user_id = p_user_id AND usr.title_id = p_title_id
          AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE)
    LOOP
        IF v_trust >= 0.8 AND v_sim >= 0.7 THEN
            v_priority := GREATEST(v_priority, 1.0);
        ELSIF v_trust >= 0.5 OR v_sim >= 0.6 THEN
            v_priority := GREATEST(v_priority, 0.85);
        ELSE
            v_priority := GREATEST(v_priority, 0.50);
        END IF;
    END LOOP;

    RETURN v_priority;
END;
$function$;

-- ============================================
-- RECOMMENDATION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_top_recommendations(p_user_id uuid, p_limit integer)
 RETURNS TABLE(title_id uuid, base_viib_score real, social_priority_score real, final_score real)
 LANGUAGE sql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.log_recommendation_outcome(p_user_id uuid, p_title_id uuid, p_was_selected boolean, p_watch_duration_percentage real, p_rating_value rating_value)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO recommendation_outcomes (user_id, title_id, was_selected, watch_duration_percentage, rating_value)
    VALUES (p_user_id, p_title_id, p_was_selected, p_watch_duration_percentage, p_rating_value);
END;
$function$;

CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id uuid, p_title_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

    v_base_score := c_emotional * w_emotional + c_social * w_social + c_historical * w_historical + c_context * w_context + c_novelty * w_novelty;
    v_social_priority := viib_social_priority_score(p_user_id, p_title_id);
    v_final_score := GREATEST(v_base_score, v_social_priority);

    IF v_social_priority > v_base_score AND v_social_priority >= 0.8 THEN
        reasons := reasons || 'A trusted friend with similar taste recommended this.';
    ELSIF v_social_priority > v_base_score THEN
        reasons := reasons || 'A friend recommendation increased the priority of this title.';
    END IF;

    IF c_emotional >= 0.7 THEN reasons := reasons || 'This title strongly matches your current mood.'; END IF;
    IF c_historical >= 0.7 THEN reasons := reasons || 'You have previously enjoyed similar titles.'; END IF;
    IF c_context >= 0.7 THEN reasons := reasons || 'This fits well into your typical viewing session length.'; END IF;
    IF c_novelty >= 0.8 THEN reasons := reasons || 'This is a fresh discovery you have not watched before.'; END IF;

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

-- ============================================
-- CRON JOB FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, database text, active boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  SELECT jobid, jobname, schedule, command, database, active
  FROM cron.job
  ORDER BY jobid;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_cron_job(p_jobid bigint, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
BEGIN
  UPDATE cron.job SET active = p_active WHERE jobid = p_jobid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_cron_schedule(p_jobid bigint, p_schedule text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
BEGIN
  UPDATE cron.job SET schedule = p_schedule WHERE jobid = p_jobid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_cron_job_now(p_command text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '300s'
AS $function$
BEGIN
  EXECUTE p_command;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cron_job_progress()
 RETURNS TABLE(vector_count bigint, transform_count bigint, intent_count bigint, social_count bigint, vector_updated_at timestamp with time zone, transform_updated_at timestamp with time zone, intent_updated_at timestamp with time zone, social_updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT 
        (SELECT COUNT(*) FROM title_emotion_vectors) as vector_count,
        (SELECT COUNT(*) FROM title_transformation_scores) as transform_count,
        (SELECT COUNT(*) FROM title_intent_alignment_scores) as intent_count,
        (SELECT COUNT(*) FROM title_social_summary) as social_count,
        (SELECT MAX(updated_at) FROM title_emotion_vectors) as vector_updated_at,
        (SELECT MAX(updated_at) FROM title_transformation_scores) as transform_updated_at,
        (SELECT MAX(updated_at) FROM title_intent_alignment_scores) as intent_updated_at,
        (SELECT MAX(updated_at) FROM title_social_summary) as social_updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE jobs
  SET 
    total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment,
    last_run_at = NOW()
  WHERE job_type = p_job_type;
END;
$function$;
