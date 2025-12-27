-- ============================================================================
-- FIX REMAINING FUNCTION SEARCH PATHS (Part 2)
-- ============================================================================

-- Fix viib_score_components - major function with search path issue
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_emotion_id uuid;
    v_user_valence real;
    v_user_arousal real;
    v_user_dominance real;
    v_user_intensity real;
    v_title_valence real;
    v_title_arousal real;
    v_title_dominance real;
    v_has_emotion_data boolean := false;
    v_user_norm real;
    v_title_norm real;
    v_direct_cosine real := 0.5;
    v_transformation_score real := 0.5;
    v_emotional_score real := 0.5;
    v_friend_rating_score real := 0.0;
    v_friend_recommendation_score real := 0.0;
    v_has_strong_history boolean := false;
    v_has_wishlist boolean := false;
    v_last_interaction_days real;
    v_avg_session_minutes real;
    v_runtime_minutes real;
    v_diff_ratio real;
    v_interaction_exists boolean := false;
BEGIN
    emotional_component := 0.5;
    social_component := 0.0;
    historical_component := 0.0;
    context_component := 0.5;
    novelty_component := 1.0;

    SELECT ues.emotion_id, ues.valence, ues.arousal, ues.dominance, COALESCE(ues.intensity, 0.5)
    INTO v_user_emotion_id, v_user_valence, v_user_arousal, v_user_dominance, v_user_intensity
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY created_at DESC LIMIT 1;

    IF v_user_emotion_id IS NOT NULL THEN
        SELECT COALESCE(AVG(em.valence * (vec.intensity_level / 10.0)), 0),
               COALESCE(AVG(em.arousal * (vec.intensity_level / 10.0)), 0),
               COALESCE(AVG(em.dominance * (vec.intensity_level / 10.0)), 0)
        INTO v_title_valence, v_title_arousal, v_title_dominance
        FROM viib_emotion_classified_titles vec
        JOIN emotion_master em ON em.id = vec.emotion_id
        WHERE vec.title_id = p_title_id;

        SELECT EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec2 WHERE vec2.title_id = p_title_id) INTO v_has_emotion_data;

        IF v_has_emotion_data THEN
            v_user_norm := sqrt(power(v_user_valence,2) + power(v_user_arousal,2) + power(v_user_dominance,2));
            v_title_norm := sqrt(power(v_title_valence,2) + power(v_title_arousal,2) + power(v_title_dominance,2));

            IF v_user_norm > 0.001 AND v_title_norm > 0.001 THEN
                v_direct_cosine := (v_user_valence * v_title_valence + v_user_arousal * v_title_arousal + v_user_dominance * v_title_dominance) / (v_user_norm * v_title_norm);
                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            END IF;

            SELECT COALESCE(tts.transformation_score, 0.5) INTO v_transformation_score
            FROM title_transformation_scores tts
            WHERE tts.user_emotion_id = v_user_emotion_id AND tts.title_id = p_title_id;

            IF v_transformation_score IS NULL OR v_transformation_score = 0.5 THEN
                SELECT COALESCE(
                    SUM(etm.confidence_score *
                        CASE etm.transformation_type
                            WHEN 'amplify' THEN 1.0 WHEN 'complementary' THEN 0.95 WHEN 'soothe' THEN 0.9
                            WHEN 'validate' THEN 0.85 WHEN 'reinforcing' THEN 0.8 WHEN 'neutral_balancing' THEN 0.7
                            WHEN 'stabilize' THEN 0.65 ELSE 0.5
                        END * (vec.intensity_level / 10.0)
                    ) / NULLIF(SUM(etm.confidence_score), 0), 0.5
                ) INTO v_transformation_score
                FROM emotion_transformation_map etm
                JOIN viib_emotion_classified_titles vec ON vec.emotion_id = etm.content_emotion_id AND vec.title_id = p_title_id
                WHERE etm.user_emotion_id = v_user_emotion_id;
            END IF;

            IF v_user_valence < 0.5 THEN
                v_emotional_score := 0.35 * v_direct_cosine + 0.65 * COALESCE(v_transformation_score, 0.5);
            ELSE
                v_emotional_score := 0.5 * v_direct_cosine + 0.5 * COALESCE(v_transformation_score, 0.5);
            END IF;

            emotional_component := LEAST(GREATEST(v_emotional_score, 0.0), 1.0);
        END IF;
    END IF;

    SELECT COALESCE(AVG(
        CASE uti.rating_value WHEN 'love_it' THEN 1.0 WHEN 'like_it' THEN 0.75 WHEN 'ok' THEN 0.5 ELSE 0.0 END * fc.trust_score
    ), 0) INTO v_friend_rating_score
    FROM friend_connections fc
    JOIN user_title_interactions uti ON uti.user_id = fc.friend_user_id AND uti.title_id = p_title_id AND uti.rating_value IS NOT NULL
    WHERE fc.user_id = p_user_id AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE);

    SELECT COALESCE(AVG(fc.trust_score * 0.85), 0) INTO v_friend_recommendation_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc ON fc.user_id = p_user_id AND fc.friend_user_id = usr.sender_user_id AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE)
    WHERE usr.receiver_user_id = p_user_id AND usr.title_id = p_title_id;

    IF v_friend_rating_score > 0 AND v_friend_recommendation_score > 0 THEN
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    ELSE
        social_component := GREATEST(v_friend_rating_score, v_friend_recommendation_score);
    END IF;
    social_component := LEAST(GREATEST(social_component, 0.0), 1.0);

    SELECT BOOL_OR(interaction_type IN ('completed','liked') AND rating_value IN ('love_it','like_it')),
           BOOL_OR(interaction_type = 'wishlisted'), EXTRACT(DAY FROM (NOW() - MAX(created_at)))
    INTO v_has_strong_history, v_has_wishlist, v_last_interaction_days
    FROM user_title_interactions WHERE user_id = p_user_id AND title_id = p_title_id;

    IF v_has_strong_history THEN
        historical_component := EXP(-COALESCE(v_last_interaction_days, 0) / 180.0);
    ELSIF v_has_wishlist THEN
        historical_component := 0.6;
    ELSE
        historical_component := 0.0;
    END IF;

    SELECT COALESCE(AVG(session_length_seconds) / 60.0, NULL) INTO v_avg_session_minutes
    FROM user_context_logs WHERE user_id = p_user_id;

    SELECT t.runtime::real INTO v_runtime_minutes FROM titles t WHERE t.id = p_title_id;

    IF v_avg_session_minutes IS NOT NULL AND v_runtime_minutes IS NOT NULL AND v_runtime_minutes > 0 THEN
        v_diff_ratio := ABS(v_runtime_minutes - v_avg_session_minutes) / GREATEST(v_runtime_minutes, v_avg_session_minutes);
        context_component := LEAST(GREATEST(1.0 - v_diff_ratio, 0.0), 1.0);
    ELSE
        context_component := 0.5;
    END IF;

    SELECT EXISTS (SELECT 1 FROM user_title_interactions WHERE user_id = p_user_id AND title_id = p_title_id) INTO v_interaction_exists;
    IF v_interaction_exists THEN novelty_component := 0.3; ELSE novelty_component := 1.0; END IF;

    RETURN QUERY SELECT emotional_component, social_component, historical_component, context_component, novelty_component;
END;
$$;

-- Fix get_titles_needing_classification
CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, name text, title_type text, overview text, trailer_transcript text, original_language text, title_genres json)
LANGUAGE sql
STABLE
SET statement_timeout TO '120s'
SET search_path = public
AS $$
  SELECT t.id, t.name, t.title_type, t.overview, t.trailer_transcript, t.original_language, t.title_genres
  FROM titles t
  WHERE t.id > COALESCE(p_cursor, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec WHERE vec.title_id = t.id)
       AND NOT EXISTS (SELECT 1 FROM viib_emotion_classified_titles_staging vecs WHERE vecs.title_id = t.id))
      OR EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec WHERE vec.title_id = t.id AND vec.updated_at < NOW() - INTERVAL '7 days')
      OR (NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id)
          AND NOT EXISTS (SELECT 1 FROM viib_intent_classified_titles_staging vits WHERE vits.title_id = t.id))
      OR EXISTS (SELECT 1 FROM viib_intent_classified_titles vit WHERE vit.title_id = t.id AND vit.updated_at < NOW() - INTERVAL '7 days')
    )
  ORDER BY t.id ASC LIMIT p_limit;
$$;

-- Fix get_titles_with_all_streaming_services
CREATE OR REPLACE FUNCTION public.get_titles_with_all_streaming_services(p_limit integer DEFAULT 100, p_cursor uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, tmdb_id integer, title_type text, name text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH service_counts AS (
    SELECT tsa.title_id, COUNT(DISTINCT tsa.streaming_service_id) as service_count
    FROM title_streaming_availability tsa WHERE tsa.region_code = 'US' GROUP BY tsa.title_id
  ),
  active_services AS (SELECT COUNT(*) as total FROM streaming_services WHERE is_active = true),
  corrupted_title_ids AS (
    SELECT sc.title_id FROM service_counts sc, active_services act WHERE sc.service_count >= act.total - 1
  )
  SELECT t.id, t.tmdb_id::integer, t.title_type, t.name
  FROM titles t JOIN corrupted_title_ids cti ON cti.title_id = t.id
  WHERE t.tmdb_id IS NOT NULL AND (p_cursor IS NULL OR t.id > p_cursor)
  ORDER BY t.id LIMIT p_limit;
$$;

-- Fix get_corrupted_streaming_count
CREATE OR REPLACE FUNCTION public.get_corrupted_streaming_count()
RETURNS integer
LANGUAGE sql
STABLE
SET statement_timeout TO '60s'
SET search_path = public
AS $$
  WITH service_counts AS (
    SELECT tsa.title_id, COUNT(DISTINCT tsa.streaming_service_id) as service_count
    FROM title_streaming_availability tsa WHERE tsa.region_code = 'US' GROUP BY tsa.title_id
  ),
  active_services AS (SELECT COUNT(*) as total FROM streaming_services WHERE is_active = true)
  SELECT COUNT(*)::integer FROM service_counts sc, active_services act WHERE sc.service_count >= act.total - 1;
$$;

-- Fix viib_intent_alignment_score if it exists without search path
CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_emotion_id uuid;
    v_alignment_score real := 0.5;
BEGIN
    SELECT ues.emotion_id INTO v_user_emotion_id
    FROM user_emotion_states ues WHERE ues.user_id = p_user_id ORDER BY created_at DESC LIMIT 1;

    IF v_user_emotion_id IS NOT NULL THEN
        SELECT COALESCE(tias.alignment_score, 0.5) INTO v_alignment_score
        FROM title_intent_alignment_scores tias
        WHERE tias.title_id = p_title_id AND tias.user_emotion_id = v_user_emotion_id;
    END IF;
    RETURN COALESCE(v_alignment_score, 0.5);
END;
$$;

-- Fix refresh_title_intent_alignment_scores
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
SET search_path = public
AS $$
BEGIN
    INSERT INTO title_intent_alignment_scores (title_id, user_emotion_id, alignment_score, updated_at)
    SELECT vit.title_id, etim.emotion_id,
           SUM(etim.weight * vit.confidence_score) / NULLIF(SUM(etim.weight), 0) AS alignment_score,
           NOW() AS updated_at
    FROM viib_intent_classified_titles vit
    JOIN emotion_to_intent_map etim ON etim.intent_type = vit.intent_type
    GROUP BY vit.title_id, etim.emotion_id
    ON CONFLICT (title_id, user_emotion_id) DO UPDATE SET
        alignment_score = EXCLUDED.alignment_score, updated_at = NOW();
END;
$$;

-- Fix refresh_title_social_summary
CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
SET search_path = public
AS $$
BEGIN
    INSERT INTO title_social_summary (title_id, social_mean_rating, social_rec_power, updated_at)
    SELECT uti.title_id,
           AVG(CASE uti.rating_value WHEN 'love_it' THEN 1.0 WHEN 'like_it' THEN 0.75 WHEN 'ok' THEN 0.5 ELSE 0.25 END),
           COUNT(*)::real / 100.0, NOW()
    FROM user_title_interactions uti
    WHERE uti.rating_value IS NOT NULL GROUP BY uti.title_id
    ON CONFLICT (title_id) DO UPDATE SET
        social_mean_rating = EXCLUDED.social_mean_rating, social_rec_power = EXCLUDED.social_rec_power, updated_at = NOW();
END;
$$;

-- Fix link_auth_user_to_profile
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN UPDATE users SET auth_id = p_auth_id WHERE id = p_user_id; END;
$$;

-- Fix log_recommendation_outcome
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

-- Fix all trigger functions
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

NOTIFY pgrst, 'reload schema';