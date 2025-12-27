-- ============================================================================
-- COMPREHENSIVE FIX: Hardcoded values, shared mappings, and function search paths
-- ============================================================================

-- =============================================================================
-- 1. ADD NEW APP SETTINGS FOR JOB CONFIGURATION
-- =============================================================================

-- OTP verification settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('otp_max_attempts', '5', 'Maximum OTP verification attempts before lockout'),
  ('otp_expiry_minutes', '10', 'OTP code expiry time in minutes')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Job-related settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('full_refresh_max_runtime_ms', '90000', 'Maximum runtime for full refresh job in milliseconds'),
  ('full_refresh_min_rating', '6.0', 'Minimum TMDB rating for titles in full refresh'),
  ('sync_delta_lookback_days', '7', 'Number of days to look back for delta sync'),
  ('sync_delta_min_rating', '6.0', 'Minimum TMDB rating for delta sync'),
  ('classify_ai_batch_size', '50', 'Batch size for AI classification job'),
  ('classify_ai_concurrent_calls', '20', 'Number of concurrent AI calls'),
  ('classify_ai_timeout_ms', '30000', 'Timeout for individual AI calls'),
  ('classify_ai_max_retries', '2', 'Max retries for failed AI calls'),
  ('emotion_cache_ttl_ms', '3600000', 'Cache TTL for emotion vocabulary in milliseconds')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- =============================================================================
-- 2. CREATE TMDB PROVIDER MAPPINGS TABLE (eliminates 4x duplication)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tmdb_provider_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_provider_id integer NOT NULL UNIQUE,
  service_name text NOT NULL,
  region_code text NOT NULL DEFAULT 'US',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert the provider mappings that were hardcoded
INSERT INTO public.tmdb_provider_mappings (tmdb_provider_id, service_name, region_code) VALUES
  (8, 'Netflix', 'US'),
  (9, 'Prime Video', 'US'),
  (119, 'Prime Video', 'US'),
  (15, 'Hulu', 'US'),
  (350, 'Apple TV+', 'US'),
  (2, 'Apple TV+', 'US'),
  (337, 'Disney+', 'US'),
  (390, 'Disney+', 'US'),
  (1899, 'HBO Max', 'US'),
  (384, 'HBO Max', 'US')
ON CONFLICT (tmdb_provider_id) DO UPDATE SET 
  service_name = EXCLUDED.service_name,
  is_active = true;

-- Enable RLS
ALTER TABLE public.tmdb_provider_mappings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all (public reference data)
CREATE POLICY "Anyone can read tmdb_provider_mappings" ON public.tmdb_provider_mappings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage tmdb_provider_mappings" ON public.tmdb_provider_mappings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- 3. CREATE TMDB GENRE MAPPINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tmdb_genre_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_genre_id integer NOT NULL UNIQUE,
  genre_name text NOT NULL,
  media_type text NOT NULL DEFAULT 'both', -- 'movie', 'tv', or 'both'
  tv_equivalent_id integer, -- For movie genres that map to different TV genre IDs
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert genre mappings (combined movie and TV)
INSERT INTO public.tmdb_genre_mappings (tmdb_genre_id, genre_name, media_type, tv_equivalent_id) VALUES
  -- Movie genres
  (28, 'Action', 'movie', 10759),
  (12, 'Adventure', 'movie', 10759),
  (16, 'Animation', 'both', NULL),
  (35, 'Comedy', 'both', NULL),
  (80, 'Crime', 'both', NULL),
  (99, 'Documentary', 'both', NULL),
  (18, 'Drama', 'both', NULL),
  (10751, 'Family', 'both', NULL),
  (14, 'Fantasy', 'movie', 10765),
  (36, 'History', 'movie', NULL),
  (27, 'Horror', 'movie', NULL),
  (10402, 'Music', 'movie', NULL),
  (9648, 'Mystery', 'both', NULL),
  (10749, 'Romance', 'movie', NULL),
  (878, 'Science Fiction', 'movie', 10765),
  (10770, 'TV Movie', 'movie', NULL),
  (53, 'Thriller', 'movie', NULL),
  (10752, 'War', 'movie', 10768),
  (37, 'Western', 'both', NULL),
  -- TV-specific genres
  (10759, 'Action & Adventure', 'tv', NULL),
  (10762, 'Kids', 'tv', NULL),
  (10763, 'News', 'tv', NULL),
  (10764, 'Reality', 'tv', NULL),
  (10765, 'Sci-Fi & Fantasy', 'tv', NULL),
  (10766, 'Soap', 'tv', NULL),
  (10767, 'Talk', 'tv', NULL),
  (10768, 'War & Politics', 'tv', NULL)
ON CONFLICT (tmdb_genre_id) DO UPDATE SET 
  genre_name = EXCLUDED.genre_name,
  media_type = EXCLUDED.media_type,
  tv_equivalent_id = EXCLUDED.tv_equivalent_id;

-- Enable RLS
ALTER TABLE public.tmdb_genre_mappings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Anyone can read tmdb_genre_mappings" ON public.tmdb_genre_mappings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage tmdb_genre_mappings" ON public.tmdb_genre_mappings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- 4. CREATE HELPER FUNCTION TO GET APP SETTINGS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value text;
BEGIN
  SELECT setting_value::text INTO v_value
  FROM app_settings
  WHERE setting_key = p_key
  LIMIT 1;
  
  RETURN COALESCE(v_value, p_default);
END;
$$;

-- =============================================================================
-- 5. FIX ALL DATABASE FUNCTIONS WITH MUTABLE SEARCH PATH (40 warnings)
-- =============================================================================

-- Fix calculate_taste_similarity
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
RETURNS real
LANGUAGE sql
STABLE
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

-- Fix cleanup_rate_limit_data
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_data()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    DELETE FROM ip_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Fix is_account_locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_identifier text, p_window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_failed_count INTEGER;
    v_lockout_threshold INTEGER := 5;
BEGIN
    SELECT COUNT(*) INTO v_failed_count
    FROM login_attempts
    WHERE identifier = p_identifier
      AND success = FALSE
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    RETURN v_failed_count >= v_lockout_threshold;
END;
$$;

-- Fix invalidate_old_otps
CREATE OR REPLACE FUNCTION public.invalidate_old_otps(p_email text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    UPDATE email_verifications
    SET verified = true
    WHERE email = p_email AND verified = false AND expires_at > NOW();
END;
$$;

-- Fix invalidate_old_phone_otps
CREATE OR REPLACE FUNCTION public.invalidate_old_phone_otps(p_phone text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    UPDATE phone_verifications
    SET verified = true
    WHERE phone_number = p_phone AND verified = false AND expires_at > NOW();
END;
$$;

-- Fix check_list_ownership
CREATE OR REPLACE FUNCTION public.check_list_ownership(p_list_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM vibe_lists WHERE id = p_list_id AND user_id = p_user_id);
END;
$$;

-- Fix get_active_viib_weights
CREATE OR REPLACE FUNCTION public.get_active_viib_weights()
RETURNS TABLE(id uuid, emotional_weight real, social_weight real, historical_weight real, context_weight real, novelty_weight real)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT vwc.id, vwc.emotional_weight, vwc.social_weight, vwc.historical_weight, vwc.context_weight, vwc.novelty_weight
    FROM viib_weight_config vwc WHERE vwc.is_active = true LIMIT 1;
END;
$$;

-- Fix get_titles_by_ids
CREATE OR REPLACE FUNCTION public.get_titles_by_ids(p_title_ids uuid[])
RETURNS TABLE(id uuid, name text, title_type text, poster_path text, backdrop_path text, trailer_url text, runtime integer, release_date date, first_air_date date, tmdb_id integer, overview text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.title_type, t.poster_path, t.backdrop_path, t.trailer_url, t.runtime, t.release_date, t.first_air_date, t.tmdb_id, t.overview
    FROM titles t WHERE t.id = ANY(p_title_ids);
END;
$$;

-- Fix get_vibe_list_stats
CREATE OR REPLACE FUNCTION public.get_vibe_list_stats(p_list_ids uuid[])
RETURNS TABLE(list_id uuid, item_count bigint, view_count bigint, follower_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT vl.id AS list_id,
        COALESCE(items.cnt, 0) AS item_count,
        COALESCE(views.cnt, 0) AS view_count,
        COALESCE(followers.cnt, 0) AS follower_count
    FROM unnest(p_list_ids) AS vl(id)
    LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM vibe_list_items WHERE vibe_list_id = vl.id) items ON true
    LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM vibe_list_views WHERE vibe_list_id = vl.id) views ON true
    LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM vibe_list_followers WHERE vibe_list_id = vl.id) followers ON true;
END;
$$;

-- Fix refresh_title_emotion_vectors
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
RETURNS void
LANGUAGE sql
SET statement_timeout TO '300s'
SET search_path = public
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
        valence = EXCLUDED.valence, arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance, emotion_strength = EXCLUDED.emotion_strength,
        updated_at = EXCLUDED.updated_at;
$$;

-- Fix refresh_title_transformation_scores
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.title_transformation_scores (title_id, user_emotion_id, transformation_score, updated_at)
    SELECT
        vect.title_id, etm.user_emotion_id,
        MAX(etm.confidence_score *
            CASE etm.transformation_type
                WHEN 'amplify' THEN 1.0 WHEN 'complementary' THEN 0.95 WHEN 'soothe' THEN 0.9
                WHEN 'validate' THEN 0.85 WHEN 'reinforcing' THEN 0.8 WHEN 'neutral_balancing' THEN 0.7
                WHEN 'stabilize' THEN 0.65 ELSE 0.5 END * (vect.intensity_level / 10.0)
        )::real AS transformation_score, now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em_content ON em_content.id = vect.emotion_id AND em_content.category = 'content_state'
    JOIN emotion_transformation_map etm ON etm.content_emotion_id = vect.emotion_id
    GROUP BY vect.title_id, etm.user_emotion_id
    ON CONFLICT (title_id, user_emotion_id) DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score, updated_at = now();
END;
$$;

-- Fix refresh_viib_reco_materializations
CREATE OR REPLACE FUNCTION public.refresh_viib_reco_materializations()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    PERFORM refresh_title_emotion_vectors();
    PERFORM refresh_title_transformation_scores();
    PERFORM refresh_title_intent_alignment_scores();
    PERFORM refresh_title_social_summary();
END;
$$;

-- Fix viib_score
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
declare
    w_emotional real := 0.35; w_social real := 0.20; w_historical real := 0.25;
    w_context real := 0.10; w_novelty real := 0.10;
    c_emotional real; c_social real; c_historical real; c_context real; c_novelty real;
begin
    select emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    into w_emotional, w_social, w_historical, w_context, w_novelty
    from viib_weight_config where is_active = true order by created_at desc limit 1;

    select emotional_component, social_component, historical_component, context_component, novelty_component
    into c_emotional, c_social, c_historical, c_context, c_novelty
    from viib_score_components(p_user_id, p_title_id);

    return c_emotional * w_emotional + c_social * w_social + c_historical * w_historical 
         + c_context * w_context + c_novelty * w_novelty;
end;
$$;

-- Fix viib_score_with_intent
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
declare v_base real; v_intent real;
begin
    v_base := viib_score(p_user_id, p_title_id);
    v_intent := viib_intent_alignment_score(p_user_id, p_title_id);
    return v_base * v_intent;
end;
$$;

-- Fix viib_autotune_weights (first overload)
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30, p_min_samples integer DEFAULT 100)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_from_ts TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
    s_emotional REAL; s_social REAL; s_historical REAL; s_context REAL; s_novelty REAL;
    f_emotional REAL; f_social REAL; f_historical REAL; f_context REAL; f_novelty REAL;
    d_emotional REAL; d_social REAL; d_historical REAL; d_context REAL; d_novelty REAL;
    total_delta REAL;
    w_emotional REAL; w_social REAL; w_historical REAL; w_context REAL; w_novelty REAL;
    v_success_count INTEGER; v_failure_count INTEGER;
BEGIN
    SELECT COUNT(*) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
           COUNT(*) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it')))
    INTO v_success_count, v_failure_count FROM recommendation_outcomes WHERE created_at >= v_from_ts;

    IF v_success_count + v_failure_count < p_min_samples THEN RETURN; END IF;

    WITH comps AS (
        SELECT ro.user_id, ro.title_id, ro.was_selected, ro.rating_value,
            vsc.emotional_component, vsc.social_component, vsc.historical_component,
            vsc.context_component, vsc.novelty_component
        FROM recommendation_outcomes ro
        CROSS JOIN LATERAL viib_score_components(ro.user_id, ro.title_id) AS vsc
        WHERE ro.created_at >= v_from_ts
    )
    SELECT
        AVG(emotional_component) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(social_component) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(historical_component) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(context_component) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(novelty_component) FILTER (WHERE was_selected = true OR rating_value IN ('love_it','like_it')),
        AVG(emotional_component) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(social_component) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(historical_component) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(context_component) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it'))),
        AVG(novelty_component) FILTER (WHERE was_selected = false AND (rating_value IS NULL OR rating_value NOT IN ('love_it','like_it')))
    INTO s_emotional, s_social, s_historical, s_context, s_novelty,
         f_emotional, f_social, f_historical, f_context, f_novelty
    FROM comps;

    d_emotional := GREATEST(COALESCE(s_emotional - f_emotional, 0), 0);
    d_social := GREATEST(COALESCE(s_social - f_social, 0), 0);
    d_historical := GREATEST(COALESCE(s_historical - f_historical, 0), 0);
    d_context := GREATEST(COALESCE(s_context - f_context, 0), 0);
    d_novelty := GREATEST(COALESCE(s_novelty - f_novelty, 0), 0);
    total_delta := d_emotional + d_social + d_historical + d_context + d_novelty;

    IF total_delta <= 0 THEN RETURN; END IF;

    w_emotional := d_emotional / total_delta;
    w_social := d_social / total_delta;
    w_historical := d_historical / total_delta;
    w_context := d_context / total_delta;
    w_novelty := d_novelty / total_delta;

    UPDATE viib_weight_config SET is_active = FALSE WHERE is_active = TRUE;
    INSERT INTO viib_weight_config (emotional_weight, social_weight, historical_weight, context_weight, novelty_weight, is_active)
    VALUES (w_emotional, w_social, w_historical, w_context, w_novelty, TRUE);
END;
$$;

-- Fix promote_title_intents
CREATE OR REPLACE FUNCTION public.promote_title_intents(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD; c INTEGER := 0;
BEGIN
  FOR r IN SELECT DISTINCT title_id FROM viib_intent_classified_titles_staging ORDER BY title_id LIMIT p_limit
  LOOP
    DELETE FROM viib_intent_classified_titles WHERE title_id = r.title_id;
    INSERT INTO viib_intent_classified_titles
    SELECT title_id, intent_type, confidence_score, source, now(), now()
    FROM viib_intent_classified_titles_staging WHERE title_id = r.title_id;
    DELETE FROM viib_intent_classified_titles_staging WHERE title_id = r.title_id;
    c := c + 1;
  END LOOP;
  RETURN c;
END;
$$;

-- Fix get_user_id_from_auth
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    RETURN v_user_id;
END;
$$;

-- =============================================================================
-- 6. CREATE INDEX FOR FASTER APP_SETTINGS LOOKUP
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- =============================================================================
-- 7. NOTIFY SCHEMA RELOAD
-- =============================================================================

NOTIFY pgrst, 'reload schema';