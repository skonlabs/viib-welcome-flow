-- =====================================================
-- ViiB Database Functions Complete Export
-- Generated: 2024-12-24
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


-- =====================================================
-- EMOTION FUNCTIONS
-- =====================================================

-- Calculate user emotion intensity based on energy percentage
CREATE OR REPLACE FUNCTION public.calculate_user_emotion_intensity(p_emotion_id uuid, p_energy_percentage real)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Store user emotion vector
CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(p_user_id uuid, p_emotion_label text, p_energy_percentage real)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Translate mood text to emotion
CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real)
RETURNS TABLE(emotion_id uuid, emotion_label text)
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Get result emotion label with intensity prefix
CREATE OR REPLACE FUNCTION public.get_result_emotion_label(p_emotion_label text, p_intensity real)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Get display emotion phrase for user
CREATE OR REPLACE FUNCTION public.get_display_emotion_phrase(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;


-- =====================================================
-- SOCIAL FUNCTIONS
-- =====================================================

-- Calculate taste similarity between two users
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
RETURNS real
LANGUAGE sql
SET search_path = public
AS $$
with common_titles as (
    select distinct a.title_id
    from user_title_interactions a
    join user_title_interactions b
      on a.title_id = b.title_id
     and a.user_id = p_user_a
     and b.user_id = p_user_b
),
both_positive as (
    select ct.title_id
    from common_titles ct
    join user_title_interactions a
      on a.title_id = ct.title_id and a.user_id = p_user_a
    join user_title_interactions b
      on b.title_id = ct.title_id and b.user_id = p_user_b
    where a.interaction_type in ('liked','completed')
      and b.interaction_type in ('liked','completed')
)
select coalesce(
    (select count(*)::real from both_positive) /
    nullif((select count(*)::real from common_titles), 0.0),
    0.0
);
$$;


-- =====================================================
-- MATERIALIZATION REFRESH FUNCTIONS
-- =====================================================

-- Refresh title emotion vectors
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
RETURNS void
LANGUAGE sql
SET statement_timeout = '300s'
AS $$
    INSERT INTO title_emotion_vectors (title_id, valence, arousal, dominance, emotion_strength, updated_at)
    SELECT
        vec.title_id,
        AVG(em.valence * (vec.intensity_level / 10.0)) AS valence,
        AVG(em.arousal * (vec.intensity_level / 10.0)) AS arousal,
        AVG(em.dominance * (vec.intensity_level / 10.0)) AS dominance,
        AVG(vec.intensity_level / 10.0) AS emotion_strength,
        NOW() AS updated_at
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    GROUP BY vec.title_id
    ON CONFLICT (title_id) DO UPDATE SET
        valence = EXCLUDED.valence,
        arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance,
        emotion_strength = EXCLUDED.emotion_strength,
        updated_at = EXCLUDED.updated_at;
$$;

-- Refresh title transformation scores
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
RETURNS void
LANGUAGE sql
SET statement_timeout = '300s'
AS $$
    INSERT INTO title_transformation_scores (user_emotion_id, title_id, transformation_score, updated_at)
    SELECT
        etm.user_emotion_id,
        vec.title_id,
        COALESCE(SUM(etm.confidence_score * CASE etm.transformation_type WHEN 'complementary' THEN 1.0 WHEN 'neutral_balancing' THEN 0.8 WHEN 'reinforcing' THEN 0.7 ELSE 0.5 END * (vec.intensity_level / 10.0)) / NULLIF(SUM(etm.confidence_score), 0), 0.0) AS transformation_score,
        NOW() AS updated_at
    FROM emotion_transformation_map etm
    JOIN emotion_master em_user ON em_user.id = etm.user_emotion_id AND em_user.category = 'user_state'
    JOIN viib_emotion_classified_titles vec ON vec.emotion_id = etm.content_emotion_id
    GROUP BY etm.user_emotion_id, vec.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = EXCLUDED.updated_at;
$$;

-- Refresh title intent alignment scores
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $$
INSERT INTO title_intent_alignment_scores (
    user_emotion_id,
    title_id,
    alignment_score
)
SELECT
    e2i.emotion_id           AS user_emotion_id,
    vit.title_id             AS title_id,
    LEAST(
        GREATEST(
            COALESCE(
                SUM(e2i.weight * vit.confidence_score)
                / NULLIF(SUM(e2i.weight), 0),
                0.7
            ),
            0.0
        ),
        1.0
    ) AS alignment_score
FROM emotion_to_intent_map e2i
JOIN viib_intent_classified_titles vit
  ON vit.intent_type = e2i.intent_type
GROUP BY
    e2i.emotion_id,
    vit.title_id
ON CONFLICT (user_emotion_id, title_id)
DO UPDATE SET
    alignment_score = EXCLUDED.alignment_score;
$$;

-- Refresh all recommendation materializations
CREATE OR REPLACE FUNCTION public.refresh_viib_reco_materializations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM refresh_title_emotion_vectors();
    PERFORM refresh_title_transformation_scores();
    PERFORM refresh_title_intent_alignment_scores();
    PERFORM refresh_title_social_summary();
END;
$$;

-- Refresh title intent stats for a specific title
CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO viib_title_intent_stats (
    title_id,
    primary_intent_type,
    primary_confidence_score,
    intent_count,
    last_computed_at
  )
  SELECT
    p_title_id,
    (
      SELECT intent_type 
      FROM viib_intent_classified_titles 
      WHERE title_id = p_title_id 
      ORDER BY confidence_score DESC 
      LIMIT 1
    ),
    (
      SELECT confidence_score 
      FROM viib_intent_classified_titles 
      WHERE title_id = p_title_id 
      ORDER BY confidence_score DESC 
      LIMIT 1
    ),
    (
      SELECT COUNT(*)::integer 
      FROM viib_intent_classified_titles 
      WHERE title_id = p_title_id
    ),
    NOW()
  ON CONFLICT (title_id) DO UPDATE SET
    primary_intent_type = EXCLUDED.primary_intent_type,
    primary_confidence_score = EXCLUDED.primary_confidence_score,
    intent_count = EXCLUDED.intent_count,
    last_computed_at = EXCLUDED.last_computed_at;
$$;

-- Refresh user title social scores for recent users
CREATE OR REPLACE FUNCTION public.refresh_user_title_social_scores_recent_users()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout = '300s'
AS $$
DECLARE
  v_recent_user_count INT;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_recent_user_count
  FROM public.user_context_logs
  WHERE created_at >= now() - interval '7 days';
  
  IF v_recent_user_count = 0 THEN
    RAISE NOTICE 'No recent users found, skipping refresh';
    RETURN;
  END IF;

  WITH recent_users AS (
    SELECT DISTINCT user_id
    FROM public.user_context_logs
    WHERE created_at >= now() - interval '7 days'
  ),
  friend_ratings AS (
    SELECT
      fc.user_id,
      uti.title_id,
      AVG(
        CASE uti.rating_value
          WHEN 'love_it' THEN 1.0
          WHEN 'like_it' THEN 0.75
          WHEN 'ok'      THEN 0.5
          ELSE 0.0
        END * fc.trust_score
      )::real AS friend_rating_score
    FROM public.friend_connections fc
    JOIN recent_users ru ON ru.user_id = fc.user_id
    JOIN public.user_title_interactions uti
      ON uti.user_id = fc.friend_user_id
    WHERE fc.is_blocked = FALSE
      AND uti.title_id IS NOT NULL
    GROUP BY fc.user_id, uti.title_id
  ),
  friend_recs AS (
    SELECT
      fc.user_id,
      usr.title_id,
      AVG(fc.trust_score * 0.8)::real AS friend_recommendation_score
    FROM public.friend_connections fc
    JOIN recent_users ru ON ru.user_id = fc.user_id
    JOIN public.user_social_recommendations usr
      ON usr.receiver_user_id = fc.user_id
     AND usr.sender_user_id   = fc.friend_user_id
    WHERE fc.is_blocked = FALSE
      AND usr.title_id IS NOT NULL
    GROUP BY fc.user_id, usr.title_id
  ),
  social_component AS (
    SELECT
      COALESCE(fr.user_id, frec.user_id) AS user_id,
      COALESCE(fr.title_id, frec.title_id) AS title_id,
      CASE
        WHEN fr.friend_rating_score IS NOT NULL AND frec.friend_recommendation_score IS NOT NULL THEN
          LEAST(GREATEST(((fr.friend_rating_score + frec.friend_recommendation_score) / 2.0), 0.0), 1.0)::real
        ELSE
          LEAST(GREATEST(GREATEST(COALESCE(fr.friend_rating_score, 0.0), COALESCE(frec.friend_recommendation_score, 0.0)), 0.0), 1.0)::real
      END AS social_component_score
    FROM friend_ratings fr
    FULL OUTER JOIN friend_recs frec
      ON fr.user_id = frec.user_id
     AND fr.title_id = frec.title_id
  ),
  priority AS (
    SELECT
      fc.user_id,
      usr.title_id,
      MAX(
        CASE
          WHEN fc.trust_score >= 0.8 THEN 1.0
          WHEN fc.trust_score >= 0.5 THEN 0.85
          ELSE 0.50
        END
      )::real AS social_priority_score
    FROM public.friend_connections fc
    JOIN recent_users ru ON ru.user_id = fc.user_id
    JOIN public.user_social_recommendations usr
      ON usr.receiver_user_id = fc.user_id
     AND usr.sender_user_id   = fc.friend_user_id
    WHERE fc.is_blocked = FALSE
    GROUP BY fc.user_id, usr.title_id
  )
  INSERT INTO public.user_title_social_scores (
    user_id,
    title_id,
    social_component_score,
    social_priority_score,
    updated_at
  )
  SELECT
    sc.user_id,
    sc.title_id,
    sc.social_component_score,
    COALESCE(p.social_priority_score, 0.0)::real AS social_priority_score,
    now()
  FROM social_component sc
  LEFT JOIN priority p
    ON p.user_id = sc.user_id
   AND p.title_id = sc.title_id
  ON CONFLICT (user_id, title_id)
  DO UPDATE SET
    social_component_score = EXCLUDED.social_component_score,
    social_priority_score  = EXCLUDED.social_priority_score,
    updated_at             = now();
END;
$$;


-- =====================================================
-- VIIB SCORE FUNCTIONS
-- =====================================================

-- Get score components for a user-title pair
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
LANGUAGE plpgsql
AS $$
declare
    v_user_emotion_id uuid;
    v_user_valence real;
    v_user_arousal real;
    v_user_dominance real;
    v_user_intensity real;
    v_title_valence real;
    v_title_arousal real;
    v_title_dominance real;
    v_user_norm real;
    v_title_norm real;
    v_direct_cosine real := null;
    v_transformation_score real := null;
    v_emotional_score real := 0.5;
    v_has_emotion_data boolean := false;
    v_friend_rating_score real := 0.0;
    v_friend_recommendation_score real := 0.0;
    v_has_strong_history boolean := false;
    v_has_wishlist boolean := false;
    v_avg_session_minutes real;
    v_runtime_minutes real;
    v_diff_ratio real;
    v_interaction_exists boolean := false;
begin
    emotional_component := 0.5;
    social_component := 0.0;
    historical_component := 0.0;
    context_component := 0.5;
    novelty_component := 1.0;

    select ues.emotion_id, ues.valence, ues.arousal, ues.dominance, ues.intensity
    into v_user_emotion_id, v_user_valence, v_user_arousal, v_user_dominance, v_user_intensity
    from user_emotion_states ues
    where ues.user_id = p_user_id
    order by created_at desc limit 1;

    if v_user_emotion_id is not null then
        select
            coalesce(avg(em.valence * (vec.intensity_level / 10.0)), null),
            coalesce(avg(em.arousal * (vec.intensity_level / 10.0)), null),
            coalesce(avg(em.dominance * (vec.intensity_level / 10.0)), null)
        into v_title_valence, v_title_arousal, v_title_dominance
        from viib_emotion_classified_titles vec
        join emotion_master em on em.id = vec.emotion_id
        where vec.title_id = p_title_id;

        select exists (select 1 from viib_emotion_classified_titles vec2 where vec2.title_id = p_title_id)
        into v_has_emotion_data;

        if v_has_emotion_data then
            v_user_norm := sqrt(power(v_user_valence,2) + power(v_user_arousal,2) + power(v_user_dominance,2));
            v_title_norm := sqrt(power(v_title_valence,2) + power(v_title_arousal,2) + power(v_title_dominance,2));
            if v_user_norm > 0 and v_title_norm > 0 then
                v_direct_cosine := (v_user_valence * v_title_valence + v_user_arousal * v_title_arousal + v_user_dominance * v_title_dominance) / (v_user_norm * v_title_norm);
                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            end if;
            v_emotional_score := 0.5 * coalesce(v_direct_cosine, 0) + 0.5 * coalesce(v_transformation_score, 0);
            emotional_component := least(greatest(v_emotional_score, 0.0), 1.0);
        end if;
    end if;

    select coalesce(avg(case uti.rating_value when 'love_it' then 1.0 when 'like_it' then 0.75 when 'ok' then 0.5 else 0.0 end * fc.trust_score), 0)
    into v_friend_rating_score
    from friend_connections fc
    join user_title_interactions uti on uti.user_id = fc.friend_user_id and uti.title_id = p_title_id
    where fc.user_id = p_user_id and (fc.is_blocked is null or fc.is_blocked = false);

    select coalesce(avg(fc.trust_score * 0.8), 0)
    into v_friend_recommendation_score
    from user_social_recommendations usr
    join friend_connections fc on fc.user_id = p_user_id and fc.friend_user_id = usr.sender_user_id
    where usr.receiver_user_id = p_user_id and usr.title_id = p_title_id;

    if v_friend_rating_score > 0 and v_friend_recommendation_score > 0 then
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    else
        social_component := greatest(v_friend_rating_score, v_friend_recommendation_score);
    end if;
    social_component := least(greatest(social_component, 0.0), 1.0);

    select bool_or(interaction_type in ('completed','liked') and rating_value in ('love_it','like_it')), bool_or(interaction_type = 'wishlisted')
    into v_has_strong_history, v_has_wishlist
    from user_title_interactions where user_id = p_user_id and title_id = p_title_id;

    if v_has_strong_history then historical_component := 1.0;
    elsif v_has_wishlist then historical_component := 0.5;
    else historical_component := 0.0;
    end if;

    select coalesce(avg(session_length_seconds) / 60.0, null) into v_avg_session_minutes from user_context_logs where user_id = p_user_id;
    select t.runtime::real into v_runtime_minutes from titles t where t.id = p_title_id;

    if v_avg_session_minutes is not null and v_runtime_minutes is not null then
        v_diff_ratio := abs(v_runtime_minutes - v_avg_session_minutes) / greatest(v_runtime_minutes, v_avg_session_minutes);
        context_component := least(greatest(1.0 - v_diff_ratio, 0.0), 1.0);
    else
        context_component := 0.5;
    end if;

    select exists (select 1 from user_title_interactions where user_id = p_user_id and title_id = p_title_id) into v_interaction_exists;
    if v_interaction_exists then novelty_component := 0.3; else novelty_component := 1.0; end if;

    return query select emotional_component, social_component, historical_component, context_component, novelty_component;
end;
$$;

-- Calculate base ViiB score
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
    w_emotional   real := 0.35;
    w_social      real := 0.20;
    w_historical  real := 0.25;
    w_context     real := 0.10;
    w_novelty     real := 0.10;

    c_emotional   real;
    c_social      real;
    c_historical  real;
    c_context     real;
    c_novelty     real;
begin
    select emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    into w_emotional, w_social, w_historical, w_context, w_novelty
    from viib_weight_config
    where is_active = true
    order by created_at desc
    limit 1;

    select emotional_component, social_component, historical_component, context_component, novelty_component
    into c_emotional, c_social, c_historical, c_context, c_novelty
    from viib_score_components(p_user_id, p_title_id);

    return
      c_emotional  * w_emotional
    + c_social     * w_social
    + c_historical * w_historical
    + c_context    * w_context
    + c_novelty    * w_novelty;
end;
$$;

-- Calculate intent alignment score
CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
AS $$
declare
    v_user_emotion_id uuid;
    v_intensity       real := 0.7;
    v_score           real;
begin
    select emotion_id, intensity
    into v_user_emotion_id, v_intensity
    from user_emotion_states
    where user_id = p_user_id
    order by created_at desc
    limit 1;

    if v_user_emotion_id is null then
        return 0.7;
    end if;

    v_intensity := least(greatest(v_intensity, 0.1), 1.0);

    select coalesce(
        sum(e2i.weight * vit.confidence_score * (0.5 + 0.5 * v_intensity)) / nullif(sum(e2i.weight), 0),
        0.7
    )
    into v_score
    from emotion_to_intent_map e2i
    join viib_intent_classified_titles vit
      on vit.intent_type = e2i.intent_type
     and vit.title_id = p_title_id
    where e2i.emotion_id = v_user_emotion_id;

    return least(greatest(v_score, 0.0), 1.0);
end;
$$;

-- Calculate ViiB score with intent
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
    v_base   real;
    v_intent real;
begin
    v_base := viib_score(p_user_id, p_title_id);
    v_intent := viib_intent_alignment_score(p_user_id, p_title_id);
    return v_base * v_intent;
end;
$$;

-- Calculate social priority score
CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
AS $$
declare
    v_priority real := 0.0;
    v_trust    real;
    v_sim      real;
begin
    for v_trust, v_sim in
        select fc.trust_score, calculate_taste_similarity(p_user_id, fc.friend_user_id)
        from user_social_recommendations usr
        join friend_connections fc
          on fc.user_id = p_user_id
         and fc.friend_user_id = usr.sender_user_id
        where usr.receiver_user_id = p_user_id
          and usr.title_id = p_title_id
          and (fc.is_blocked is null or fc.is_blocked = false)
    loop
        if v_trust >= 0.8 and v_sim >= 0.7 then
            v_priority := greatest(v_priority, 1.0);
        elsif v_trust >= 0.5 or v_sim >= 0.6 then
            v_priority := greatest(v_priority, 0.85);
        else
            v_priority := greatest(v_priority, 0.50);
        end if;
    end loop;

    return v_priority;
end;
$$;


-- =====================================================
-- RECOMMENDATION FUNCTIONS
-- =====================================================

-- Get top recommendations for a user
CREATE OR REPLACE FUNCTION public.get_top_recommendations(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, final_score real)
LANGUAGE sql
STABLE
AS $$
WITH
wf AS (
  SELECT
    COALESCE(emotional_weight,  0.35) AS w_emotional,
    COALESCE(social_weight,     0.20) AS w_social,
    COALESCE(historical_weight, 0.25) AS w_historical,
    COALESCE(context_weight,    0.10) AS w_context,
    COALESCE(novelty_weight,    0.10) AS w_novelty
  FROM public.viib_weight_config
  WHERE is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1
),
ue AS (
  SELECT
    emotion_id,
    valence,
    arousal,
    dominance,
    COALESCE(intensity, 0.7) AS intensity
  FROM public.user_emotion_states
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1
),
us AS (
  SELECT AVG(session_length_seconds) / 60.0 AS avg_session_minutes
  FROM public.user_context_logs
  WHERE user_id = p_user_id
),
top_titles AS (
  SELECT t.id, t.popularity, t.runtime, t.original_language
  FROM public.titles t
  WHERE t.classification_status = 'complete'
  ORDER BY COALESCE(t.popularity,0) DESC
  LIMIT 2000
),
eligible AS (
  SELECT DISTINCT tt.id AS title_id, tt.popularity, tt.runtime
  FROM top_titles tt
  WHERE
    EXISTS (
      SELECT 1
      FROM public.title_streaming_availability tsa
      JOIN public.user_streaming_subscriptions uss
        ON uss.streaming_service_id = tsa.streaming_service_id
       AND uss.user_id = p_user_id
       AND uss.is_active = TRUE
      WHERE tsa.title_id = tt.id
    )
    AND tt.original_language IN (
      SELECT ulp.language_code
      FROM public.user_language_preferences ulp
      WHERE ulp.user_id = p_user_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_title_interactions uti
      WHERE uti.user_id = p_user_id
        AND uti.title_id = tt.id
        AND uti.interaction_type IN ('completed','disliked')
    )
),
ui AS (
  SELECT
    title_id,
    BOOL_OR(interaction_type IN ('completed','liked')) AS strong_like,
    BOOL_OR(interaction_type = 'wishlisted')           AS wishlisted,
    MAX(created_at)                                    AS last_interaction_at,
    COUNT(*)                                           AS cnt
  FROM public.user_title_interactions
  WHERE user_id = p_user_id
  GROUP BY title_id
),
intent AS (
  SELECT
    tias.title_id,
    COALESCE(tias.alignment_score, 0.7)::real AS intent_alignment_score
  FROM ue
  JOIN public.title_intent_alignment_scores tias
    ON tias.user_emotion_id = ue.emotion_id
),
pf AS (
  SELECT
    e.title_id,
    COALESCE(e.popularity,0)::real AS pop,
    COALESCE(i.intent_alignment_score, 0.7)::real AS intent_alignment_score,
    COALESCE(uts.social_component_score, 0.0)::real AS social_component_score,
    COALESCE(uts.social_priority_score, 0.0)::real AS social_priority_score,
    COALESCE(ui.cnt,0) AS seen,
    e.runtime
  FROM eligible e
  LEFT JOIN intent i ON i.title_id = e.title_id
  LEFT JOIN public.user_title_social_scores uts
    ON uts.user_id = p_user_id AND uts.title_id = e.title_id
  LEFT JOIN ui ON ui.title_id = e.title_id
  ORDER BY
    social_priority_score DESC,
    social_component_score DESC,
    intent_alignment_score DESC,
    pop DESC,
    seen ASC
  LIMIT 400
),
em_cache AS (
  SELECT
    tuc.title_id,
    tuc.cosine_score::real AS cosine_score,
    tuc.transformation_score::real AS transformation_score
  FROM ue
  JOIN public.title_user_emotion_match_cache tuc
    ON tuc.user_emotion_id = ue.emotion_id
),
components AS (
  SELECT
    pf.title_id,
    CASE
      WHEN ue.emotion_id IS NULL THEN 0.5::real
      ELSE
        CASE
          WHEN ec.title_id IS NULL THEN 0.5::real
          WHEN ec.transformation_score IS NULL THEN ec.cosine_score
          ELSE
            (
              ec.cosine_score * (1.0 - CASE WHEN ue.intensity < 0.4 THEN 0.3 ELSE 0.6 END)
              + ec.transformation_score * (CASE WHEN ue.intensity < 0.4 THEN 0.3 ELSE 0.6 END)
            )::real
        END
    END AS emotional,
    pf.social_component_score::real AS social,
    CASE
      WHEN ui.strong_like THEN
        EXP(-EXTRACT(DAY FROM (NOW() - ui.last_interaction_at)) / 180.0)::real
      WHEN ui.wishlisted THEN 0.5::real
      ELSE 0.0::real
    END AS historical,
    CASE
      WHEN us.avg_session_minutes IS NULL OR pf.runtime IS NULL THEN 0.5::real
      ELSE
        GREATEST(
          LEAST(
            (1.0 - ABS(pf.runtime::real - us.avg_session_minutes) / GREATEST(pf.runtime::real, us.avg_session_minutes)),
            1.0
          ),
          0.0
        )::real
    END AS context,
    CASE
      WHEN ui.cnt IS NULL OR ui.cnt = 0 THEN
        CASE
          WHEN ue.valence < 0.4 AND ue.dominance < 0.4 THEN 0.4::real
          ELSE 1.0::real
        END
      ELSE 0.3::real
    END AS novelty,
    pf.intent_alignment_score::real AS intent_alignment_score,
    pf.social_priority_score::real AS social_priority_score
  FROM pf
  LEFT JOIN ue ON TRUE
  LEFT JOIN us ON TRUE
  LEFT JOIN ui ON ui.title_id = pf.title_id
  LEFT JOIN em_cache ec ON ec.title_id = pf.title_id
),
base AS (
  SELECT
    c.title_id,
    (
      c.emotional  * wf.w_emotional
    + c.social     * wf.w_social
    + c.historical * wf.w_historical
    + c.context    * wf.w_context
    + c.novelty    * wf.w_novelty
    )::real AS base_viib_score,
    c.intent_alignment_score,
    c.social_priority_score
  FROM components c
  CROSS JOIN wf
)
SELECT
  b.title_id,
  b.base_viib_score,
  b.intent_alignment_score,
  b.social_priority_score,
  GREATEST(
    (b.base_viib_score * b.intent_alignment_score),
    (b.base_viib_score * 0.7 + b.social_priority_score * 0.3)
  )::real AS final_score
FROM base b
ORDER BY final_score DESC
LIMIT p_limit;
$$;

-- Log recommendation outcome
CREATE OR REPLACE FUNCTION public.log_recommendation_outcome(p_user_id uuid, p_title_id uuid, p_was_selected boolean, p_watch_duration_percentage real, p_rating_value rating_value)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
    insert into recommendation_outcomes (user_id, title_id, was_selected, watch_duration_percentage, rating_value)
    values (p_user_id, p_title_id, p_was_selected, p_watch_duration_percentage, p_rating_value);
end;
$$;

-- Explain recommendation
CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id uuid, p_title_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
    c_emotional real;
    c_social real;
    c_historical real;
    c_context real;
    c_novelty real;

    w_emotional real := 0.35;
    w_social real := 0.20;
    w_historical real := 0.25;
    w_context real := 0.10;
    w_novelty real := 0.10;

    v_base_score real;
    v_social_priority real;
    v_final_score real;

    reasons text[] := array[]::text[];
    payload jsonb;
begin
    select emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    into w_emotional, w_social, w_historical, w_context, w_novelty
    from viib_weight_config
    where is_active = true
    order by created_at desc
    limit 1;

    select emotional_component, social_component, historical_component, context_component, novelty_component
    into c_emotional, c_social, c_historical, c_context, c_novelty
    from viib_score_components(p_user_id, p_title_id);

    v_base_score :=
      c_emotional  * w_emotional
    + c_social     * w_social
    + c_historical * w_historical
    + c_context    * w_context
    + c_novelty    * w_novelty;

    v_social_priority := viib_social_priority_score(p_user_id, p_title_id);
    v_final_score := greatest(v_base_score, v_social_priority);

    if v_social_priority > v_base_score and v_social_priority >= 0.8 then
        reasons := reasons || 'A trusted friend with similar taste recommended this.';
    elsif v_social_priority > v_base_score then
        reasons := reasons || 'A friend recommendation increased the priority of this title.';
    end if;

    if c_emotional >= 0.7 then reasons := reasons || 'This title strongly matches your current mood.'; end if;
    if c_historical >= 0.7 then reasons := reasons || 'You have previously enjoyed similar titles.'; end if;
    if c_context >= 0.7 then reasons := reasons || 'This fits well into your typical viewing session length.'; end if;
    if c_novelty >= 0.8 then reasons := reasons || 'This is a fresh discovery you have not watched before.'; end if;

    if array_length(reasons, 1) is null then
        reasons := array['Recommended based on your mood, history, context, and social signals combined.'];
    end if;

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

    return payload;
end;
$$;


-- =====================================================
-- CRON JOB FUNCTIONS
-- =====================================================

-- Get all cron jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, database text, active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT jobid, jobname, schedule, command, database, active
  FROM cron.job
  ORDER BY jobid;
$$;

-- Toggle cron job
CREATE OR REPLACE FUNCTION public.toggle_cron_job(p_jobid bigint, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  UPDATE cron.job SET active = p_active WHERE jobid = p_jobid;
END;
$$;

-- Update cron schedule
CREATE OR REPLACE FUNCTION public.update_cron_schedule(p_jobid bigint, p_schedule text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  UPDATE cron.job SET schedule = p_schedule WHERE jobid = p_jobid;
END;
$$;

-- Run cron job now
CREATE OR REPLACE FUNCTION public.run_cron_job_now(p_command text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $$
BEGIN
  EXECUTE p_command;
END;
$$;

-- Get cron job progress
CREATE OR REPLACE FUNCTION public.get_cron_job_progress()
RETURNS TABLE(vector_count bigint, transform_count bigint, intent_count bigint, social_count bigint, vector_updated_at timestamp with time zone, transform_updated_at timestamp with time zone, intent_updated_at timestamp with time zone, social_updated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
    SELECT 
        (SELECT COUNT(*) FROM title_emotion_vectors) as vector_count,
        (SELECT COUNT(*) FROM title_transformation_scores) as transform_count,
        (SELECT COUNT(*) FROM title_intent_alignment_scores) as intent_count,
        (SELECT COUNT(*) FROM title_social_summary) as social_count,
        (SELECT MAX(updated_at) FROM title_emotion_vectors) as vector_updated_at,
        (SELECT MAX(updated_at) FROM title_transformation_scores) as transform_updated_at,
        (SELECT MAX(updated_at) FROM title_intent_alignment_scores) as intent_updated_at,
        (SELECT MAX(updated_at) FROM title_social_summary) as social_updated_at;
$$;

-- Increment job titles
CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jobs
  SET 
    total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment,
    last_run_at = NOW()
  WHERE job_type = p_job_type;
END;
$$;


-- =====================================================
-- CLASSIFICATION HELPER FUNCTIONS
-- =====================================================

-- Get titles needing classification
CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, title_type text, overview text, trailer_transcript text, original_language text, title_genres json)
LANGUAGE sql
STABLE
SET statement_timeout = '120s'
AS $$
  SELECT
    t.id,
    t.name,
    t.title_type,
    t.overview,
    t.trailer_transcript,
    t.original_language,
    t.title_genres
  FROM titles t
  WHERE
    t.id > COALESCE(p_cursor, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (
        NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec WHERE vec.title_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles_staging vecs WHERE vecs.title_id = t.id)
      )
      OR EXISTS (
        SELECT 1 FROM viib_emotion_classified_titles vec 
        WHERE vec.title_id = t.id 
        AND vec.updated_at < NOW() - INTERVAL '7 days'
      )
      OR
      (
        NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id)
      )
      OR EXISTS (
        SELECT 1 FROM viib_intent_classified_titles vit 
        WHERE vit.title_id = t.id 
        AND vit.updated_at < NOW() - INTERVAL '7 days'
      )
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$$;

-- Promote title intents from staging
CREATE OR REPLACE FUNCTION public.promote_title_intents(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  c INTEGER := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT title_id
    FROM public.viib_intent_classified_titles_staging
    ORDER BY title_id
    LIMIT p_limit
  LOOP
    DELETE FROM public.viib_intent_classified_titles
    WHERE title_id = r.title_id;

    INSERT INTO public.viib_intent_classified_titles
    SELECT
      title_id,
      intent_type,
      confidence_score,
      source,
      now(),
      now()
    FROM public.viib_intent_classified_titles_staging
    WHERE title_id = r.title_id;

    DELETE FROM public.viib_intent_classified_titles_staging
    WHERE title_id = r.title_id;

    c := c + 1;
  END LOOP;
  RETURN c;
END;
$$;

-- Get job classification metrics
CREATE OR REPLACE FUNCTION public.get_job_classification_metrics()
RETURNS TABLE(total_titles bigint, emotion_primary_distinct bigint, emotion_staging_distinct bigint, intent_primary_distinct bigint, intent_staging_distinct bigint)
LANGUAGE sql
AS $$
  SELECT
    (SELECT COUNT(*) FROM titles) AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles) AS emotion_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles_staging) AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles) AS intent_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles_staging) AS intent_staging_distinct;
$$;


-- =====================================================
-- AUTO-TUNE FUNCTIONS
-- =====================================================

-- Auto-tune weights based on recommendation outcomes
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30, p_min_samples integer DEFAULT 100)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_from_ts TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
    s_emotional  REAL; s_social REAL; s_historical REAL; s_context REAL; s_novelty REAL;
    f_emotional  REAL; f_social REAL; f_historical REAL; f_context REAL; f_novelty REAL;
    d_emotional  REAL; d_social REAL; d_historical REAL; d_context REAL; d_novelty REAL;
    total_delta  REAL;
    w_emotional  REAL; w_social REAL; w_historical REAL; w_context REAL; w_novelty REAL;
    v_success_count INTEGER; v_failure_count INTEGER;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        COUNT(*) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it')))
    INTO v_success_count, v_failure_count
    FROM recommendation_outcomes
    WHERE created_at >= v_from_ts;

    IF v_success_count + v_failure_count < p_min_samples THEN
        RETURN;
    END IF;

    WITH comps AS (
        SELECT
            ro.user_id, ro.title_id, ro.was_selected, ro.rating_value,
            vsc.emotional_component, vsc.social_component, vsc.historical_component,
            vsc.context_component, vsc.novelty_component
        FROM recommendation_outcomes ro
        CROSS JOIN LATERAL viib_score_components(ro.user_id, ro.title_id) AS vsc
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
        AVG(novelty_component)    FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))]
    INTO
        s_emotional, s_social, s_historical, s_context, s_novelty,
        f_emotional, f_social, f_historical, f_context, f_novelty
    FROM comps;

    d_emotional  := GREATEST(COALESCE(s_emotional  - f_emotional , 0), 0);
    d_social     := GREATEST(COALESCE(s_social     - f_social    , 0), 0);
    d_historical := GREATEST(COALESCE(s_historical - f_historical, 0), 0);
    d_context    := GREATEST(COALESCE(s_context    - f_context   , 0), 0);
    d_novelty    := GREATEST(COALESCE(s_novelty    - f_novelty   , 0), 0);

    total_delta := d_emotional + d_social + d_historical + d_context + d_novelty;

    IF total_delta <= 0 THEN RETURN; END IF;

    w_emotional  := d_emotional  / total_delta;
    w_social     := d_social     / total_delta;
    w_historical := d_historical / total_delta;
    w_context    := d_context    / total_delta;
    w_novelty    := d_novelty    / total_delta;

    UPDATE viib_weight_config SET is_active = FALSE WHERE is_active = TRUE;

    INSERT INTO viib_weight_config (
        id, emotional_weight, social_weight, historical_weight, context_weight, novelty_weight, is_active, created_at
    ) VALUES (
        gen_random_uuid(), w_emotional, w_social, w_historical, w_context, w_novelty, TRUE, now()
    );
END;
$$;
