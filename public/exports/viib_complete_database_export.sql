-- =====================================================
-- ViiB Complete Database Export
-- Generated: 2024-12-28
-- =====================================================

-- =====================================================
-- SECTION 1: CUSTOM ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TYPE public.rating_value AS ENUM ('love_it', 'like_it', 'ok', 'not_for_me');

CREATE TYPE public.interaction_type AS ENUM ('wishlisted', 'completed', 'liked', 'dismissed', 'not_my_taste');

CREATE TYPE public.viib_intent_type AS ENUM (
    'escape',
    'thrill',
    'comfort',
    'inspiration',
    'nostalgia',
    'discovery',
    'bonding',
    'catharsis',
    'mindless_fun',
    'intellectual_stimulation'
);

-- =====================================================
-- SECTION 2: TABLES
-- =====================================================

-- Table: activation_codes
CREATE TABLE public.activation_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL,
    is_used boolean NOT NULL DEFAULT false,
    current_uses integer NOT NULL DEFAULT 0,
    max_uses integer DEFAULT 1,
    used_by uuid REFERENCES public.users(id),
    used_at timestamp with time zone,
    notes text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: app_settings
CREATE TABLE public.app_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text NOT NULL UNIQUE,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: email_config
CREATE TABLE public.email_config (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    smtp_host text NOT NULL,
    smtp_port integer NOT NULL,
    smtp_user text NOT NULL,
    smtp_password text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    use_ssl boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: email_templates
CREATE TABLE public.email_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    template_type text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: email_verifications
CREATE TABLE public.email_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: emotion_master
CREATE TABLE public.emotion_master (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_label text NOT NULL,
    category text NOT NULL,
    description text,
    valence real,
    arousal real,
    dominance real,
    intensity_multiplier real DEFAULT 1.0,
    created_at timestamp without time zone
);

-- Table: emotion_display_phrases
CREATE TABLE public.emotion_display_phrases (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    display_phrase text NOT NULL,
    min_intensity real NOT NULL,
    max_intensity real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: emotion_to_intent_map
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    intent_type text NOT NULL,
    weight real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: emotion_transformation_map
CREATE TABLE public.emotion_transformation_map (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    content_emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    transformation_type text NOT NULL,
    confidence_score real NOT NULL,
    priority_rank smallint
);

-- Table: enabled_countries
CREATE TABLE public.enabled_countries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code text NOT NULL,
    country_name text NOT NULL,
    dial_code text NOT NULL,
    flag_emoji text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: genres
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    genre_name text NOT NULL,
    tmdb_genre_id integer
);

-- Table: keywords
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    tmdb_keyword_id integer
);

-- Table: streaming_services
CREATE TABLE public.streaming_services (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name text NOT NULL,
    logo_url text,
    website_url text,
    is_active boolean NOT NULL DEFAULT true
);

-- Table: spoken_languages
CREATE TABLE public.spoken_languages (
    iso_639_1 varchar NOT NULL PRIMARY KEY,
    language_name text NOT NULL,
    flag_emoji text
);

-- Table: titles
CREATE TABLE public.titles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_id integer,
    imdb_id text,
    name text,
    original_name text,
    title_type text,
    overview text,
    poster_path text,
    backdrop_path text,
    trailer_url text,
    trailer_transcript text,
    release_date date,
    first_air_date date,
    last_air_date date,
    runtime integer,
    episode_run_time integer[],
    original_language text,
    certification text,
    status text,
    popularity double precision,
    vote_average double precision,
    is_adult boolean DEFAULT false,
    is_tmdb_trailer boolean DEFAULT true,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    title_genres json,
    classification_status text DEFAULT 'pending',
    last_classified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: seasons
CREATE TABLE public.seasons (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id uuid NOT NULL REFERENCES public.titles(id),
    season_number integer NOT NULL,
    name text,
    overview text,
    poster_path text,
    air_date date,
    episode_count integer,
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean DEFAULT true,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: episodes
CREATE TABLE public.episodes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id uuid NOT NULL REFERENCES public.seasons(id),
    episode_number integer NOT NULL,
    name text,
    overview text,
    still_path text,
    air_date date,
    runtime integer,
    vote_average double precision,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: title_genres
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL REFERENCES public.titles(id),
    genre_id uuid NOT NULL REFERENCES public.genres(id),
    PRIMARY KEY (title_id, genre_id)
);

-- Table: title_streaming_availability
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL REFERENCES public.titles(id),
    streaming_service_id uuid NOT NULL REFERENCES public.streaming_services(id),
    region_code text NOT NULL,
    PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- Table: title_emotion_vectors
CREATE TABLE public.title_emotion_vectors (
    title_id uuid NOT NULL REFERENCES public.titles(id) PRIMARY KEY,
    valence real NOT NULL,
    arousal real NOT NULL,
    dominance real NOT NULL,
    emotion_strength real NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: title_transformation_scores
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL REFERENCES public.titles(id),
    user_emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- Table: title_intent_alignment_scores
CREATE TABLE public.title_intent_alignment_scores (
    title_id uuid NOT NULL REFERENCES public.titles(id),
    user_emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    alignment_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- Table: title_social_summary
CREATE TABLE public.title_social_summary (
    title_id uuid NOT NULL REFERENCES public.titles(id) PRIMARY KEY,
    social_mean_rating real,
    social_rec_power real,
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: title_user_emotion_match_cache
CREATE TABLE public.title_user_emotion_match_cache (
    title_id uuid NOT NULL REFERENCES public.titles(id),
    user_emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    cosine_score real NOT NULL,
    transformation_score real,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- Table: users
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id uuid,
    email text,
    phone_number text,
    full_name text,
    username text,
    country text,
    timezone text,
    language_preference text,
    ip_address text,
    ip_country text,
    password_hash text,
    signup_method text,
    is_phone_verified boolean DEFAULT false,
    is_email_verified boolean DEFAULT false,
    is_age_over_18 boolean NOT NULL,
    is_active boolean DEFAULT true,
    onboarding_completed boolean DEFAULT false,
    last_onboarding_step text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: user_roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: user_emotion_states
CREATE TABLE public.user_emotion_states (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    intensity real NOT NULL DEFAULT 0.1,
    valence real,
    arousal real,
    dominance real,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: user_language_preferences
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL REFERENCES public.users(id),
    language_code text NOT NULL REFERENCES public.spoken_languages(iso_639_1),
    priority_order integer,
    PRIMARY KEY (user_id, language_code)
);

-- Table: user_streaming_subscriptions
CREATE TABLE public.user_streaming_subscriptions (
    user_id uuid NOT NULL REFERENCES public.users(id),
    streaming_service_id uuid NOT NULL REFERENCES public.streaming_services(id),
    is_active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, streaming_service_id)
);

-- Table: user_title_interactions
CREATE TABLE public.user_title_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    title_id uuid NOT NULL REFERENCES public.titles(id),
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value,
    season_number integer,
    watch_duration_percentage real,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: user_context_logs
CREATE TABLE public.user_context_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    device_type text,
    time_of_day_bucket text,
    location_type text,
    session_length_seconds integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: user_title_social_scores
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL REFERENCES public.titles(id),
    social_component_score real NOT NULL,
    social_priority_score real NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, title_id)
);

-- Table: user_vibe_preferences
CREATE TABLE public.user_vibe_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) UNIQUE,
    vibe_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: personality_profiles
CREATE TABLE public.personality_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    type_name text,
    description text,
    introversion_score real,
    emotional_sensitivity real,
    risk_tolerance real,
    sensation_seeking real,
    empathy_level real,
    analytical_thinking real,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: friend_connections
CREATE TABLE public.friend_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    friend_user_id uuid NOT NULL REFERENCES public.users(id),
    relationship_type text,
    trust_score real NOT NULL DEFAULT 0.5,
    is_blocked boolean DEFAULT false,
    is_muted boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: user_social_recommendations
CREATE TABLE public.user_social_recommendations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_user_id uuid NOT NULL REFERENCES public.users(id),
    receiver_user_id uuid NOT NULL REFERENCES public.users(id),
    title_id uuid NOT NULL REFERENCES public.titles(id),
    message text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: recommendation_notifications
CREATE TABLE public.recommendation_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_user_id uuid NOT NULL REFERENCES public.users(id),
    receiver_user_id uuid NOT NULL REFERENCES public.users(id),
    title_id uuid NOT NULL REFERENCES public.titles(id),
    notification_type text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: recommendation_outcomes
CREATE TABLE public.recommendation_outcomes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    title_id uuid NOT NULL REFERENCES public.titles(id),
    was_selected boolean NOT NULL,
    watch_duration_percentage real,
    rating_value public.rating_value,
    recommended_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: vibes
CREATE TABLE public.vibes (
    id uuid NOT NULL PRIMARY KEY,
    label text NOT NULL,
    description text,
    base_weight real NOT NULL DEFAULT 1.0,
    decay_half_life_days real NOT NULL DEFAULT 7.0,
    component_ratios jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: vibe_genre_weights
CREATE TABLE public.vibe_genre_weights (
    vibe_id uuid NOT NULL REFERENCES public.vibes(id),
    genre_id uuid NOT NULL REFERENCES public.genres(id),
    weight real NOT NULL,
    PRIMARY KEY (vibe_id, genre_id)
);

-- Table: vibe_emotion_weights
CREATE TABLE public.vibe_emotion_weights (
    vibe_id uuid NOT NULL REFERENCES public.vibes(id),
    emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    weight real NOT NULL,
    PRIMARY KEY (vibe_id, emotion_id)
);

-- Table: vibe_lists
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    name text NOT NULL,
    description text,
    visibility text NOT NULL DEFAULT 'private',
    mood_tags text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: vibe_list_items
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id uuid NOT NULL REFERENCES public.vibe_lists(id),
    title_id uuid NOT NULL,
    added_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: vibe_list_followers
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id uuid NOT NULL REFERENCES public.vibe_lists(id),
    follower_user_id uuid NOT NULL REFERENCES public.users(id),
    followed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: vibe_list_shared_with
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id uuid NOT NULL REFERENCES public.vibe_lists(id),
    shared_with_user_id uuid NOT NULL REFERENCES public.users(id),
    shared_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: vibe_list_views
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id uuid NOT NULL REFERENCES public.vibe_lists(id),
    viewer_user_id uuid REFERENCES public.users(id),
    viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: viib_emotion_classified_titles
CREATE TABLE public.viib_emotion_classified_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id uuid NOT NULL REFERENCES public.titles(id),
    emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    intensity_level real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: viib_emotion_classified_titles_staging
CREATE TABLE public.viib_emotion_classified_titles_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id uuid NOT NULL REFERENCES public.titles(id),
    emotion_id uuid NOT NULL REFERENCES public.emotion_master(id),
    intensity_level real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: viib_intent_classified_titles
CREATE TABLE public.viib_intent_classified_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id uuid NOT NULL REFERENCES public.titles(id),
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: viib_intent_classified_titles_staging
CREATE TABLE public.viib_intent_classified_titles_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id uuid NOT NULL REFERENCES public.titles(id),
    intent_type public.viib_intent_type NOT NULL,
    confidence_score real NOT NULL,
    source text NOT NULL DEFAULT 'ai',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: viib_title_intent_stats
CREATE TABLE public.viib_title_intent_stats (
    title_id uuid NOT NULL PRIMARY KEY,
    primary_intent_type text,
    primary_confidence_score real,
    intent_count integer NOT NULL,
    last_computed_at timestamp with time zone NOT NULL
);

-- Table: viib_weight_config
CREATE TABLE public.viib_weight_config (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotional_weight real NOT NULL DEFAULT 0.35,
    social_weight real NOT NULL DEFAULT 0.20,
    historical_weight real NOT NULL DEFAULT 0.25,
    context_weight real NOT NULL DEFAULT 0.10,
    novelty_weight real NOT NULL DEFAULT 0.10,
    is_active boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: phone_verifications
CREATE TABLE public.phone_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    is_locked boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: session_tokens
CREATE TABLE public.session_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    token_hash text NOT NULL,
    issued_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address text,
    user_agent text,
    is_remember_me boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: login_attempts
CREATE TABLE public.login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier text NOT NULL,
    ip_address text,
    attempt_type text NOT NULL DEFAULT 'password',
    success boolean DEFAULT false,
    requires_captcha boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: ip_rate_limits
CREATE TABLE public.ip_rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (ip_address, endpoint)
);

-- Table: rate_limit_config
CREATE TABLE public.rate_limit_config (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint text NOT NULL UNIQUE,
    max_requests integer NOT NULL,
    window_seconds integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: rate_limit_entries
CREATE TABLE public.rate_limit_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL
);

-- Table: feedback
CREATE TABLE public.feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: system_logs
CREATE TABLE public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    severity text NOT NULL DEFAULT 'error',
    error_message text NOT NULL,
    error_stack text,
    screen text,
    operation text,
    context jsonb,
    http_status integer,
    resolved boolean NOT NULL DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES public.users(id),
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: jobs
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type text NOT NULL,
    job_name text NOT NULL,
    status text NOT NULL DEFAULT 'idle',
    is_active boolean NOT NULL DEFAULT true,
    configuration jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamp with time zone,
    last_run_duration_seconds integer,
    next_run_at timestamp with time zone,
    total_titles_processed integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: official_trailer_channels
CREATE TABLE public.official_trailer_channels (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_name text NOT NULL,
    channel_id text,
    language_code text NOT NULL,
    region text,
    category text,
    priority integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: tmdb_genre_mappings
CREATE TABLE public.tmdb_genre_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_genre_id integer NOT NULL,
    genre_name text NOT NULL,
    media_type text NOT NULL DEFAULT 'both',
    tv_equivalent_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Table: tmdb_provider_mappings
CREATE TABLE public.tmdb_provider_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_provider_id integer NOT NULL,
    service_name text NOT NULL,
    region_code text NOT NULL DEFAULT 'US',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- SECTION 3: FUNCTIONS
-- =====================================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function: get_user_id_from_auth
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    RETURN v_user_id;
END;
$$;

-- Function: get_app_setting
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Function: calculate_user_emotion_intensity
CREATE OR REPLACE FUNCTION public.calculate_user_emotion_intensity(p_emotion_id uuid, p_energy_percentage real)
RETURNS real
LANGUAGE plpgsql
SET search_path TO 'public'
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

-- Function: calculate_taste_similarity
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
RETURNS real
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
    (SELECT count(*)::real FROM both_positive) /
    NULLIF((SELECT count(*)::real FROM common_titles), 0.0),
    0.0
);
$$;

-- Function: calculate_emotion_distance_score
CREATE OR REPLACE FUNCTION public.calculate_emotion_distance_score(
    p_user_valence real, p_user_arousal real, p_user_dominance real,
    p_title_valence real, p_title_arousal real, p_title_dominance real
)
RETURNS real
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
    v_euclidean_dist REAL;
    v_max_dist REAL := 1.732;
    v_similarity REAL;
BEGIN
    v_euclidean_dist := sqrt(
        power(p_user_valence - p_title_valence, 2) +
        power(p_user_arousal - p_title_arousal, 2) +
        power(p_user_dominance - p_title_dominance, 2)
    );
    
    v_similarity := 1.0 - (v_euclidean_dist / v_max_dist);
    
    RETURN LEAST(GREATEST(v_similarity, 0.0), 1.0);
END;
$$;

-- Function: viib_score_components
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
RETURNS TABLE(
    emotional_component real,
    social_component real,
    historical_component real,
    context_component real,
    novelty_component real
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
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

-- Function: viib_score
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
    w_emotional real := 0.35; w_social real := 0.20; w_historical real := 0.25;
    w_context real := 0.10; w_novelty real := 0.10;
    c_emotional real; c_social real; c_historical real; c_context real; c_novelty real;
BEGIN
    SELECT emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    INTO w_emotional, w_social, w_historical, w_context, w_novelty
    FROM viib_weight_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1;

    SELECT emotional_component, social_component, historical_component, context_component, novelty_component
    INTO c_emotional, c_social, c_historical, c_context, c_novelty
    FROM viib_score_components(p_user_id, p_title_id);

    RETURN c_emotional * w_emotional + c_social * w_social + c_historical * w_historical 
         + c_context * w_context + c_novelty * w_novelty;
END;
$$;

-- Function: get_top_recommendations_v3
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
    title_id uuid,
    tmdb_id integer,
    title text,
    title_type text,
    poster_path text,
    backdrop_path text,
    trailer_url text,
    runtime integer,
    overview text,
    genres json,
    release_date date,
    first_air_date date,
    emotion_score real,
    vibe_score real,
    social_score real,
    language_score real,
    final_score real,
    recommendation_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_emotion_id UUID;
  v_user_emotion_label TEXT;
  v_user_intensity REAL;
  v_user_valence REAL;
  v_user_arousal REAL;
  v_user_dominance REAL;
  v_user_vibe_type TEXT;
  v_user_country TEXT;
  v_emotion_weight REAL := 0.45;
  v_vibe_weight REAL := 0.15;
  v_social_weight REAL := 0.20;
  v_language_weight REAL := 0.20;
  v_family_genre_id UUID;
BEGIN
  SELECT g.id INTO v_family_genre_id
  FROM genres g
  WHERE g.genre_name = 'Family';
  
  SELECT ues.emotion_id, em.emotion_label, ues.intensity, 
         ues.valence, ues.arousal, ues.dominance
  INTO v_user_emotion_id, v_user_emotion_label, v_user_intensity,
       v_user_valence, v_user_arousal, v_user_dominance
  FROM user_emotion_states ues
  JOIN emotion_master em ON em.id = ues.emotion_id
  WHERE ues.user_id = p_user_id
  ORDER BY ues.created_at DESC
  LIMIT 1;
  
  SELECT vibe_type INTO v_user_vibe_type
  FROM user_vibe_preferences
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  SELECT COALESCE(country, 'US') INTO v_user_country
  FROM users
  WHERE id = p_user_id;
  
  v_user_country := COALESCE(v_user_country, 'US');
  
  RETURN QUERY
  WITH user_langs AS (
    SELECT ulp.language_code, ulp.priority_order
    FROM user_language_preferences ulp
    WHERE ulp.user_id = p_user_id
  ),
  user_stream AS (
    SELECT uss.streaming_service_id
    FROM user_streaming_subscriptions uss
    WHERE uss.user_id = p_user_id AND uss.is_active = true
  ),
  user_inter AS (
    SELECT DISTINCT uti.title_id AS tid FROM user_title_interactions uti WHERE uti.user_id = p_user_id
  ),
  kids_only AS (
    SELECT tg1.title_id AS tid
    FROM title_genres tg1
    WHERE v_family_genre_id IS NOT NULL
    GROUP BY tg1.title_id
    HAVING bool_and(tg1.genre_id = v_family_genre_id)
  ),
  scored AS (
    SELECT 
      t.id AS tid,
      t.tmdb_id AS t_tmdb_id,
      t.name AS t_title,
      t.title_type AS t_type,
      t.poster_path AS t_poster,
      t.backdrop_path AS t_backdrop,
      t.trailer_url AS t_trailer,
      t.runtime AS t_runtime,
      t.overview AS t_overview,
      t.title_genres AS t_genres,
      t.release_date AS t_release_date,
      t.first_air_date AS t_first_air_date,
      t.original_language AS t_lang,
      t.popularity AS t_popularity,
      CASE 
        WHEN v_user_emotion_id IS NOT NULL AND tev.title_id IS NOT NULL THEN
          GREATEST(0, 1 - (
            SQRT(
              POWER(COALESCE(v_user_valence, 0) - COALESCE(tev.valence, 0), 2) +
              POWER(COALESCE(v_user_arousal, 0) - COALESCE(tev.arousal, 0), 2) +
              POWER(COALESCE(v_user_dominance, 0) - COALESCE(tev.dominance, 0), 2)
            ) / 1.732
          )) * COALESCE(v_user_intensity, 0.5) +
          COALESCE(tts.transformation_score, 0) * 0.2
        ELSE 0.3
      END AS emo_score,
      COALESCE(
        (SELECT AVG(vgw.weight) 
         FROM title_genres tg2
         JOIN vibe_genre_weights vgw ON vgw.genre_id = tg2.genre_id
         WHERE tg2.title_id = t.id 
         AND vgw.vibe_id = v_user_vibe_type),
        0.4
      ) AS vib_score,
      COALESCE(tss.social_rec_power, 0) * 0.5 + 
      COALESCE(utss.social_priority_score, 0) * 0.5 AS soc_score,
      CASE 
        WHEN t.original_language = (SELECT ul.language_code FROM user_langs ul WHERE ul.priority_order = 1) THEN 1.0
        WHEN t.original_language = (SELECT ul.language_code FROM user_langs ul WHERE ul.priority_order = 2) THEN 0.85
        WHEN t.original_language = (SELECT ul.language_code FROM user_langs ul WHERE ul.priority_order = 3) THEN 0.70
        WHEN t.original_language IN (SELECT ul.language_code FROM user_langs ul) THEN 0.60
        ELSE 0.40
      END AS lang_score
    FROM titles t
    LEFT JOIN title_emotion_vectors tev ON tev.title_id = t.id
    LEFT JOIN title_transformation_scores tts ON tts.title_id = t.id 
      AND tts.user_emotion_id = v_user_emotion_id
    LEFT JOIN title_social_summary tss ON tss.title_id = t.id
    LEFT JOIN user_title_social_scores utss ON utss.title_id = t.id 
      AND utss.user_id = p_user_id
    WHERE t.id NOT IN (SELECT ui.tid FROM user_inter ui)
      AND t.poster_path IS NOT NULL
      AND t.runtime > 20
      AND t.popularity >= 15
      AND (
        COALESCE(t.rt_cscore, 0) >= 60 
        OR COALESCE(t.rt_ascore, 0) >= 60
        OR (COALESCE(t.rt_cscore, 0) = 0 AND COALESCE(t.rt_ascore, 0) = 0)
      )
      AND t.id NOT IN (SELECT ko.tid FROM kids_only ko)
      AND EXISTS (
        SELECT 1 FROM title_streaming_availability tsa
        JOIN user_stream us ON us.streaming_service_id = tsa.streaming_service_id
        WHERE tsa.title_id = t.id AND tsa.region_code = v_user_country
      )
  )
  SELECT 
    s.tid,
    s.t_tmdb_id,
    s.t_title,
    s.t_type,
    s.t_poster,
    s.t_backdrop,
    s.t_trailer,
    s.t_runtime,
    s.t_overview,
    s.t_genres,
    s.t_release_date,
    s.t_first_air_date,
    s.emo_score::REAL,
    s.vib_score::REAL,
    s.soc_score::REAL,
    s.lang_score::REAL,
    (s.emo_score * v_emotion_weight + 
     s.vib_score * v_vibe_weight + 
     s.soc_score * v_social_weight + 
     s.lang_score * v_language_weight)::REAL AS fin_score,
    CASE 
      WHEN s.emo_score > 0.7 THEN 'Matches your ' || COALESCE(v_user_emotion_label, 'mood')
      WHEN s.lang_score = 1.0 THEN 'Great pick in your language'
      WHEN s.soc_score > 0.5 THEN 'Loved by your circle'
      WHEN s.vib_score > 0.6 THEN 'Fits your ' || COALESCE(v_user_vibe_type, 'vibe')
      ELSE 'Recommended for you'
    END AS rec_reason
  FROM scored s
  ORDER BY (s.emo_score * v_emotion_weight + 
            s.vib_score * v_vibe_weight + 
            s.soc_score * v_social_weight + 
            s.lang_score * v_language_weight) DESC,
           s.t_popularity DESC,
           s.lang_score DESC
  LIMIT p_limit;
END;
$$;

-- Function: refresh_title_emotion_vectors
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
RETURNS void
LANGUAGE sql
SET statement_timeout TO '300s'
SET search_path TO 'public'
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

-- Function: refresh_title_transformation_scores
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
SET search_path TO 'public'
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

-- Function: get_cron_jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, database text, active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
  SELECT jobid, jobname, schedule, command, database, active
  FROM cron.job
  ORDER BY jobid;
$$;

-- Function: toggle_cron_job
CREATE OR REPLACE FUNCTION public.toggle_cron_job(p_jobid bigint, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
BEGIN
  UPDATE cron.job SET active = p_active WHERE jobid = p_jobid;
END;
$$;

-- Function: run_cron_job_now
CREATE OR REPLACE FUNCTION public.run_cron_job_now(p_command text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $$
BEGIN
  EXECUTE p_command;
END;
$$;

-- Function: check_rate_limit_fast
CREATE OR REPLACE FUNCTION public.check_rate_limit_fast(p_key text, p_max_count integer, p_window_seconds integer)
RETURNS TABLE(allowed boolean, current_count integer, requires_captcha boolean)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    v_expires_at TIMESTAMPTZ := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    v_current INTEGER;
    v_captcha_threshold INTEGER := 3;
BEGIN
    INSERT INTO rate_limit_entries (key, count, window_start, expires_at)
    VALUES (p_key, 1, v_now, v_expires_at)
    ON CONFLICT (key) DO UPDATE
    SET count = CASE
        WHEN rate_limit_entries.window_start < v_window_start THEN 1
        ELSE rate_limit_entries.count + 1
    END,
    window_start = CASE
        WHEN rate_limit_entries.window_start < v_window_start THEN v_now
        ELSE rate_limit_entries.window_start
    END,
    expires_at = v_expires_at
    RETURNING rate_limit_entries.count INTO v_current;

    RETURN QUERY SELECT
        v_current <= p_max_count,
        v_current,
        v_current >= v_captcha_threshold AND v_current <= p_max_count;
END;
$$;

-- =====================================================
-- END OF EXPORT
-- =====================================================
