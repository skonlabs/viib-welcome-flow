-- ============================================================================
-- ViiB Complete Database Dump
-- Generated: 2025-12-29
-- This file contains: ENUMs, Tables, Constraints, Foreign Keys, Indexes,
-- Functions, Triggers, Views, and RLS Policies
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

-- app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- content_type enum
CREATE TYPE public.content_type AS ENUM ('movie', 'tv_show', 'documentary', 'short');

-- device_type enum
CREATE TYPE public.device_type AS ENUM ('mobile', 'tablet', 'desktop', 'tv', 'unknown');

-- discovery_source enum
CREATE TYPE public.discovery_source AS ENUM ('search', 'recommendation', 'social', 'browse', 'trending', 'watchlist');

-- emotion_category enum
CREATE TYPE public.emotion_category AS ENUM ('positive_high', 'positive_low', 'negative_high', 'negative_low', 'neutral');

-- engagement_action enum
CREATE TYPE public.engagement_action AS ENUM ('view', 'click', 'hover', 'scroll', 'share', 'save');

-- environment_tag enum
CREATE TYPE public.environment_tag AS ENUM ('home', 'commute', 'work', 'social', 'travel', 'outdoor');

-- feedback_type enum
CREATE TYPE public.feedback_type AS ENUM ('bug', 'feature', 'improvement', 'other');

-- interaction_type enum
CREATE TYPE public.interaction_type AS ENUM ('started', 'completed', 'rated', 'liked', 'disliked', 'browsed', 'wishlisted', 'ignored');

-- model_type enum
CREATE TYPE public.model_type AS ENUM ('collaborative', 'content_based', 'hybrid', 'emotion_based');

-- network_type enum
CREATE TYPE public.network_type AS ENUM ('wifi', 'cellular', 'ethernet', 'unknown');

-- notification_type enum
CREATE TYPE public.notification_type AS ENUM ('recommendation', 'social', 'system', 'reminder');

-- provider_type_enum enum
CREATE TYPE public.provider_type_enum AS ENUM ('flatrate', 'rent', 'buy', 'free', 'ads');

-- rating_value enum
CREATE TYPE public.rating_value AS ENUM ('love_it', 'like_it', 'ok', 'dislike_it', 'not_rated');

-- relationship_type enum
CREATE TYPE public.relationship_type AS ENUM ('friend', 'family', 'colleague', 'acquaintance');

-- signup_method enum
CREATE TYPE public.signup_method AS ENUM ('phone', 'email', 'google', 'apple');

-- time_of_day enum
CREATE TYPE public.time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night', 'late_night');

-- title_type_enum enum
CREATE TYPE public.title_type_enum AS ENUM ('movie', 'tv');

-- transformation_type enum
CREATE TYPE public.transformation_type AS ENUM ('amplify', 'soothe', 'complement', 'contrast', 'neutral');

-- viib_intent_type enum
CREATE TYPE public.viib_intent_type AS ENUM ('escape', 'learn', 'feel', 'thrill', 'laugh', 'inspire', 'reflect', 'connect', 'relax', 'challenge');

-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: activation_codes
-- ----------------------------------------------------------------------------
CREATE TABLE public.activation_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    is_used boolean NOT NULL DEFAULT false,
    used_by uuid,
    used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    current_uses integer NOT NULL DEFAULT 0,
    max_uses integer DEFAULT 1,
    notes text,
    CONSTRAINT activation_codes_pkey PRIMARY KEY (id),
    CONSTRAINT activation_codes_code_key UNIQUE (code)
);

-- ----------------------------------------------------------------------------
-- Table: app_settings
-- ----------------------------------------------------------------------------
CREATE TABLE public.app_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT app_settings_pkey PRIMARY KEY (id),
    CONSTRAINT app_settings_setting_key_key UNIQUE (setting_key)
);

-- ----------------------------------------------------------------------------
-- Table: email_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.email_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    smtp_host text NOT NULL,
    smtp_port integer NOT NULL,
    smtp_user text NOT NULL,
    smtp_password text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    use_ssl boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_config_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: email_templates
-- ----------------------------------------------------------------------------
CREATE TABLE public.email_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    template_type text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_templates_pkey PRIMARY KEY (id),
    CONSTRAINT email_templates_template_type_key UNIQUE (template_type)
);

-- ----------------------------------------------------------------------------
-- Table: email_verifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.email_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    expires_at timestamp with time zone NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_display_phrases
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_display_phrases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    display_phrase text NOT NULL,
    min_intensity real NOT NULL,
    max_intensity real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_display_phrases_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_display_phrases_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_master
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_master (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_label text NOT NULL,
    category text NOT NULL,
    description text,
    valence real,
    arousal real,
    dominance real,
    intensity_multiplier real DEFAULT 1.0,
    created_at timestamp without time zone,
    CONSTRAINT emotion_master_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_master_emotion_label_key UNIQUE (emotion_label)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_to_intent_map
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    intent_type text NOT NULL,
    weight real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_to_intent_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_to_intent_map_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_transformation_map
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_transformation_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_emotion_id uuid NOT NULL,
    content_emotion_id uuid NOT NULL,
    transformation_type text NOT NULL,
    confidence_score real NOT NULL,
    priority_rank smallint,
    CONSTRAINT emotion_transformation_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_transformation_map_from_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id),
    CONSTRAINT emotion_transformation_map_to_emotion_id_fkey FOREIGN KEY (content_emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: enabled_countries
-- ----------------------------------------------------------------------------
CREATE TABLE public.enabled_countries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    country_code text NOT NULL,
    country_name text NOT NULL,
    dial_code text NOT NULL,
    flag_emoji text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT enabled_countries_pkey PRIMARY KEY (id),
    CONSTRAINT enabled_countries_country_code_key UNIQUE (country_code)
);

-- ----------------------------------------------------------------------------
-- Table: episodes
-- ----------------------------------------------------------------------------
CREATE TABLE public.episodes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL,
    episode_number integer NOT NULL,
    name text,
    overview text,
    air_date date,
    runtime integer,
    still_path text,
    vote_average double precision,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT episodes_pkey PRIMARY KEY (id),
    CONSTRAINT episodes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);

-- ----------------------------------------------------------------------------
-- Table: feedback
-- ----------------------------------------------------------------------------
CREATE TABLE public.feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT feedback_pkey PRIMARY KEY (id),
    CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: friend_connections
-- ----------------------------------------------------------------------------
CREATE TABLE public.friend_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    friend_user_id uuid NOT NULL,
    relationship_type text,
    trust_score real NOT NULL DEFAULT 0.5,
    is_muted boolean NOT NULL DEFAULT false,
    is_blocked boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT friend_connections_pkey PRIMARY KEY (id),
    CONSTRAINT friend_connections_user_id_friend_user_id_key UNIQUE (user_id, friend_user_id),
    CONSTRAINT friend_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT friend_connections_friend_user_id_fkey FOREIGN KEY (friend_user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: genres
-- ----------------------------------------------------------------------------
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    genre_name text NOT NULL,
    tmdb_genre_id integer,
    CONSTRAINT genres_pkey PRIMARY KEY (id),
    CONSTRAINT genres_genre_name_key UNIQUE (genre_name)
);

-- ----------------------------------------------------------------------------
-- Table: ip_rate_limits
-- ----------------------------------------------------------------------------
CREATE TABLE public.ip_rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ip_rate_limits_pkey PRIMARY KEY (id),
    CONSTRAINT ip_rate_limits_ip_address_endpoint_key UNIQUE (ip_address, endpoint)
);

-- ----------------------------------------------------------------------------
-- Table: jobs
-- ----------------------------------------------------------------------------
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_type text NOT NULL,
    job_name text NOT NULL,
    status text NOT NULL DEFAULT 'idle'::text,
    is_active boolean NOT NULL DEFAULT true,
    configuration jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamp with time zone,
    last_run_duration_seconds integer,
    next_run_at timestamp with time zone,
    total_titles_processed integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_job_type_key UNIQUE (job_type)
);

-- ----------------------------------------------------------------------------
-- Table: keywords
-- ----------------------------------------------------------------------------
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tmdb_keyword_id integer,
    CONSTRAINT keywords_pkey PRIMARY KEY (id),
    CONSTRAINT keywords_name_key UNIQUE (name)
);

-- ----------------------------------------------------------------------------
-- Table: login_attempts
-- ----------------------------------------------------------------------------
CREATE TABLE public.login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    attempt_type text NOT NULL DEFAULT 'password'::text,
    ip_address text,
    success boolean DEFAULT false,
    requires_captcha boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: official_trailer_channels
-- ----------------------------------------------------------------------------
CREATE TABLE public.official_trailer_channels (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    channel_name text NOT NULL,
    channel_id text,
    language_code text NOT NULL,
    region text,
    category text,
    priority integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT official_trailer_channels_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: personality_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE public.personality_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type_name text,
    description text,
    introversion_score real,
    emotional_sensitivity real,
    sensation_seeking real,
    analytical_thinking real,
    empathy_level real,
    risk_tolerance real,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT personality_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT personality_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: phone_verifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.phone_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    expires_at timestamp with time zone NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT phone_verifications_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: rate_limit_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.rate_limit_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    endpoint text NOT NULL,
    max_requests integer NOT NULL,
    window_seconds integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rate_limit_config_pkey PRIMARY KEY (id),
    CONSTRAINT rate_limit_config_endpoint_key UNIQUE (endpoint)
);

-- ----------------------------------------------------------------------------
-- Table: rate_limit_entries
-- ----------------------------------------------------------------------------
CREATE TABLE public.rate_limit_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL,
    count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT rate_limit_entries_pkey PRIMARY KEY (id),
    CONSTRAINT rate_limit_entries_key_key UNIQUE (key)
);

-- ----------------------------------------------------------------------------
-- Table: recommendation_notifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.recommendation_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_user_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    notification_type text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recommendation_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_notifications_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id),
    CONSTRAINT recommendation_notifications_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id),
    CONSTRAINT recommendation_notifications_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: recommendation_outcomes
-- ----------------------------------------------------------------------------
CREATE TABLE public.recommendation_outcomes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    was_selected boolean NOT NULL,
    watch_duration_percentage real,
    rating_value public.rating_value,
    recommended_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT recommendation_outcomes_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_outcomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT recommendation_outcomes_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: seasons
-- ----------------------------------------------------------------------------
CREATE TABLE public.seasons (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
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
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT seasons_pkey PRIMARY KEY (id),
    CONSTRAINT seasons_title_id_season_number_key UNIQUE (title_id, season_number),
    CONSTRAINT seasons_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: session_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE public.session_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    issued_at timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at timestamp with time zone,
    ip_address text,
    user_agent text,
    is_remember_me boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT session_tokens_token_hash_key UNIQUE (token_hash),
    CONSTRAINT session_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: spoken_languages
-- ----------------------------------------------------------------------------
CREATE TABLE public.spoken_languages (
    iso_639_1 character varying NOT NULL,
    language_name text NOT NULL,
    flag_emoji text,
    CONSTRAINT spoken_languages_pkey PRIMARY KEY (iso_639_1)
);

-- ----------------------------------------------------------------------------
-- Table: streaming_services
-- ----------------------------------------------------------------------------
CREATE TABLE public.streaming_services (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_name text NOT NULL,
    logo_url text,
    website_url text,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT streaming_services_pkey PRIMARY KEY (id),
    CONSTRAINT streaming_services_service_name_key UNIQUE (service_name)
);

-- ----------------------------------------------------------------------------
-- Table: system_logs
-- ----------------------------------------------------------------------------
CREATE TABLE public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    error_message text NOT NULL,
    error_stack text,
    screen text,
    operation text,
    severity text NOT NULL DEFAULT 'error'::text,
    context jsonb,
    http_status integer,
    resolved boolean NOT NULL DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT system_logs_pkey PRIMARY KEY (id),
    CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT system_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_emotion_vectors
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_emotion_vectors (
    title_id uuid NOT NULL,
    valence real NOT NULL,
    arousal real NOT NULL,
    dominance real NOT NULL,
    emotion_strength real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_emotion_vectors_pkey PRIMARY KEY (title_id),
    CONSTRAINT title_emotion_vectors_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_genres
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id),
    CONSTRAINT title_genres_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_intent_alignment_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_intent_alignment_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    alignment_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_intent_alignment_scores_pkey PRIMARY KEY (title_id, user_emotion_id),
    CONSTRAINT title_intent_alignment_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_intent_alignment_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_keywords
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_keywords (
    title_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    CONSTRAINT title_keywords_pkey PRIMARY KEY (title_id, keyword_id),
    CONSTRAINT title_keywords_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_keywords_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.keywords(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_social_summary
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_social_summary (
    title_id uuid NOT NULL,
    social_mean_rating real,
    social_rec_power real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_social_summary_pkey PRIMARY KEY (title_id),
    CONSTRAINT title_social_summary_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_spoken_languages
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_spoken_languages (
    title_id uuid NOT NULL,
    language_code character varying NOT NULL,
    CONSTRAINT title_spoken_languages_pkey PRIMARY KEY (title_id, language_code),
    CONSTRAINT title_spoken_languages_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_spoken_languages_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1)
);

-- ----------------------------------------------------------------------------
-- Table: title_streaming_availability
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    region_code text NOT NULL,
    CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code),
    CONSTRAINT title_streaming_availability_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_streaming_availability_streaming_service_id_fkey FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_transformation_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_transformation_scores_pkey PRIMARY KEY (title_id, user_emotion_id),
    CONSTRAINT title_transformation_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_transformation_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: title_user_emotion_match_cache
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_user_emotion_match_cache (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    cosine_score real NOT NULL,
    transformation_score real,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT title_user_emotion_match_cache_pkey PRIMARY KEY (title_id, user_emotion_id),
    CONSTRAINT title_user_emotion_match_cache_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_user_emotion_match_cache_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_id integer,
    title_type text,
    name text,
    original_name text,
    overview text,
    poster_path text,
    backdrop_path text,
    release_date date,
    first_air_date date,
    last_air_date date,
    runtime integer,
    episode_run_time integer[],
    original_language text,
    popularity double precision,
    vote_average double precision,
    status text,
    imdb_id text,
    certification text,
    is_adult boolean DEFAULT false,
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean DEFAULT true,
    classification_status text DEFAULT 'pending'::text,
    last_classified_at timestamp with time zone,
    title_genres json,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT titles_pkey PRIMARY KEY (id),
    CONSTRAINT titles_tmdb_id_title_type_key UNIQUE (tmdb_id, title_type)
);

-- ----------------------------------------------------------------------------
-- Table: tmdb_genre_mappings
-- ----------------------------------------------------------------------------
CREATE TABLE public.tmdb_genre_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_genre_id integer NOT NULL,
    genre_name text NOT NULL,
    media_type text NOT NULL DEFAULT 'both'::text,
    tv_equivalent_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_genre_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT tmdb_genre_mappings_tmdb_genre_id_media_type_key UNIQUE (tmdb_genre_id, media_type)
);

-- ----------------------------------------------------------------------------
-- Table: tmdb_provider_mappings
-- ----------------------------------------------------------------------------
CREATE TABLE public.tmdb_provider_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_provider_id integer NOT NULL,
    service_name text NOT NULL,
    region_code text NOT NULL DEFAULT 'US'::text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_provider_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT tmdb_provider_mappings_tmdb_provider_id_region_code_key UNIQUE (tmdb_provider_id, region_code)
);

-- ----------------------------------------------------------------------------
-- Table: user_context_logs
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_context_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    device_type text,
    location_type text,
    time_of_day_bucket text,
    session_length_seconds integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_context_logs_pkey PRIMARY KEY (id),
    CONSTRAINT user_context_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_emotion_states
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_emotion_states (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity real NOT NULL DEFAULT 0.1,
    valence real,
    arousal real,
    dominance real,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_emotion_states_pkey PRIMARY KEY (id),
    CONSTRAINT user_emotion_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_emotion_states_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_language_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL,
    language_code text NOT NULL,
    priority_order integer,
    CONSTRAINT user_language_preferences_pkey PRIMARY KEY (user_id, language_code),
    CONSTRAINT user_language_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_language_preferences_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1)
);

-- ----------------------------------------------------------------------------
-- Table: user_roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_social_recommendations
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_social_recommendations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_user_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_social_recommendations_pkey PRIMARY KEY (id),
    CONSTRAINT user_social_recommendations_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id),
    CONSTRAINT user_social_recommendations_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id),
    CONSTRAINT user_social_recommendations_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_streaming_subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_streaming_subscriptions (
    user_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT user_streaming_subscriptions_pkey PRIMARY KEY (user_id, streaming_service_id),
    CONSTRAINT user_streaming_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_streaming_subscriptions_streaming_service_id_fkey FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_title_interactions
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_title_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value DEFAULT 'not_rated'::rating_value,
    watch_duration_percentage real,
    season_number integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_interactions_pkey PRIMARY KEY (id),
    CONSTRAINT user_title_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT user_title_interactions_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_title_social_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    social_priority_score real NOT NULL,
    social_component_score real NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_social_scores_pkey PRIMARY KEY (user_id, title_id),
    CONSTRAINT user_title_social_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: user_vibe_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_vibe_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    vibe_type text NOT NULL,
    vibe_id uuid,
    canonical_key text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_vibe_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_vibe_preferences_user_id_key UNIQUE (user_id),
    CONSTRAINT user_vibe_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_id uuid,
    phone_number text,
    email text,
    username text,
    full_name text,
    password_hash text,
    is_phone_verified boolean NOT NULL DEFAULT false,
    is_email_verified boolean NOT NULL DEFAULT false,
    is_age_over_18 boolean NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    signup_method text,
    country text,
    timezone text,
    language_preference text,
    ip_address text,
    ip_country text,
    onboarding_completed boolean NOT NULL DEFAULT false,
    last_onboarding_step text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_auth_id_key UNIQUE (auth_id),
    CONSTRAINT users_phone_number_key UNIQUE (phone_number),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_emotion_weights
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_emotion_weights (
    vibe_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_emotion_weights_pkey PRIMARY KEY (vibe_id, emotion_id),
    CONSTRAINT vibe_emotion_weights_vibe_id_fkey FOREIGN KEY (vibe_id) REFERENCES public.vibes(id),
    CONSTRAINT vibe_emotion_weights_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_genre_weights
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_genre_weights (
    vibe_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_pkey PRIMARY KEY (vibe_id, genre_id),
    CONSTRAINT vibe_genre_weights_vibe_id_fkey FOREIGN KEY (vibe_id) REFERENCES public.vibes(id),
    CONSTRAINT vibe_genre_weights_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_genre_weights_key
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_genre_weights_key (
    canonical_key text NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_key_pkey PRIMARY KEY (canonical_key, genre_id),
    CONSTRAINT vibe_genre_weights_key_canonical_fk FOREIGN KEY (canonical_key) REFERENCES public.vibes(canonical_key)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_followers
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    followed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_followers_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_followers_vibe_list_id_follower_user_id_key UNIQUE (vibe_list_id, follower_user_id),
    CONSTRAINT vibe_list_followers_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id),
    CONSTRAINT vibe_list_followers_follower_user_id_fkey FOREIGN KEY (follower_user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_items
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    title_id uuid NOT NULL,
    added_by_user_id uuid NOT NULL,
    notes text,
    position integer NOT NULL DEFAULT 0,
    added_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_items_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_items_vibe_list_id_title_id_key UNIQUE (vibe_list_id, title_id),
    CONSTRAINT vibe_list_items_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id),
    CONSTRAINT vibe_list_items_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT vibe_list_items_added_by_user_id_fkey FOREIGN KEY (added_by_user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_shared_with
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    can_edit boolean NOT NULL DEFAULT false,
    shared_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_shared_with_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_shared_with_vibe_list_id_shared_with_user_id_key UNIQUE (vibe_list_id, shared_with_user_id),
    CONSTRAINT vibe_list_shared_with_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id),
    CONSTRAINT vibe_list_shared_with_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_views
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    viewer_user_id uuid,
    viewed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_views_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_views_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id),
    CONSTRAINT vibe_list_views_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_lists
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean NOT NULL DEFAULT false,
    cover_image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_lists_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ----------------------------------------------------------------------------
-- Table: vibes
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    canonical_key text NOT NULL,
    icon_url text,
    color_hex text,
    is_active boolean NOT NULL DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibes_pkey PRIMARY KEY (id),
    CONSTRAINT vibes_canonical_key_key UNIQUE (canonical_key)
);

-- ----------------------------------------------------------------------------
-- Table: viib_emotion_classified_titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    confidence_score real,
    source text DEFAULT 'ai'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_pkey PRIMARY KEY (id),
    CONSTRAINT viib_emotion_classified_titles_title_id_emotion_id_key UNIQUE (title_id, emotion_id),
    CONSTRAINT viib_emotion_classified_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT viib_emotion_classified_titles_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: viib_emotion_classified_titles_staging
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    confidence_score real,
    source text DEFAULT 'ai'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_staging_pkey PRIMARY KEY (id),
    CONSTRAINT viib_emotion_classified_titles_staging_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT viib_emotion_classified_titles_staging_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- ----------------------------------------------------------------------------
-- Table: viib_intent_classified_titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real,
    source text DEFAULT 'ai'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_pkey PRIMARY KEY (id),
    CONSTRAINT viib_intent_classified_titles_title_id_intent_type_key UNIQUE (title_id, intent_type),
    CONSTRAINT viib_intent_classified_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: viib_intent_classified_titles_staging
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real,
    source text DEFAULT 'ai'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_staging_pkey PRIMARY KEY (id),
    CONSTRAINT viib_intent_classified_titles_staging_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: viib_title_intent_stats
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_title_intent_stats (
    title_id uuid NOT NULL,
    primary_intent text,
    secondary_intent text,
    intent_diversity_score real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_title_intent_stats_pkey PRIMARY KEY (title_id),
    CONSTRAINT viib_title_intent_stats_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- ----------------------------------------------------------------------------
-- Table: viib_weight_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_weight_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotional_weight real NOT NULL DEFAULT 0.35,
    social_weight real NOT NULL DEFAULT 0.20,
    historical_weight real NOT NULL DEFAULT 0.25,
    context_weight real NOT NULL DEFAULT 0.10,
    novelty_weight real NOT NULL DEFAULT 0.10,
    is_active boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_weight_config_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- SECTION 3: INDEXES
-- ============================================================================

-- Titles indexes
CREATE INDEX idx_titles_tmdb_id ON public.titles(tmdb_id);
CREATE INDEX idx_titles_title_type ON public.titles(title_type);
CREATE INDEX idx_titles_classification_status ON public.titles(classification_status);
CREATE INDEX idx_titles_popularity ON public.titles(popularity DESC);

-- User interactions indexes
CREATE INDEX idx_user_title_interactions_user_id ON public.user_title_interactions(user_id);
CREATE INDEX idx_user_title_interactions_title_id ON public.user_title_interactions(title_id);
CREATE INDEX idx_user_title_interactions_user_title ON public.user_title_interactions(user_id, title_id);

-- Emotion states indexes
CREATE INDEX idx_user_emotion_states_user_id ON public.user_emotion_states(user_id);
CREATE INDEX idx_user_emotion_states_created_at ON public.user_emotion_states(created_at DESC);

-- Friend connections indexes
CREATE INDEX idx_friend_connections_user_id ON public.friend_connections(user_id);
CREATE INDEX idx_friend_connections_friend_user_id ON public.friend_connections(friend_user_id);

-- Streaming availability indexes
CREATE INDEX idx_title_streaming_availability_title_id ON public.title_streaming_availability(title_id);
CREATE INDEX idx_title_streaming_availability_service_id ON public.title_streaming_availability(streaming_service_id);

-- Classification indexes
CREATE INDEX idx_viib_emotion_classified_titles_title_id ON public.viib_emotion_classified_titles(title_id);
CREATE INDEX idx_viib_intent_classified_titles_title_id ON public.viib_intent_classified_titles(title_id);

-- Session tokens indexes
CREATE INDEX idx_session_tokens_user_id ON public.session_tokens(user_id);
CREATE INDEX idx_session_tokens_expires_at ON public.session_tokens(expires_at);

-- System logs indexes
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_severity ON public.system_logs(severity);

-- Vibe lists indexes
CREATE INDEX idx_vibe_lists_user_id ON public.vibe_lists(user_id);
CREATE INDEX idx_vibe_list_items_vibe_list_id ON public.vibe_list_items(vibe_list_id);

-- ============================================================================
-- SECTION 4: FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: has_role
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: get_user_id_from_auth
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: get_app_setting
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL::text)
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

-- ----------------------------------------------------------------------------
-- Function: calculate_user_emotion_intensity
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: calculate_taste_similarity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
RETURNS real
LANGUAGE sql
STABLE
SET search_path TO 'public'
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

-- ----------------------------------------------------------------------------
-- Function: calculate_emotion_distance_score
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: check_list_ownership
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_list_ownership(p_list_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM vibe_lists WHERE id = p_list_id AND user_id = p_user_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: invalidate_old_otps (email)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_old_otps(p_email text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE email_verifications
    SET verified = true
    WHERE email = p_email AND verified = false AND expires_at > NOW();
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: invalidate_old_phone_otps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_old_phone_otps(p_phone text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE phone_verifications
    SET verified = true
    WHERE phone_number = p_phone AND verified = false AND expires_at > NOW();
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: link_auth_user_to_profile
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN 
    UPDATE users SET auth_id = p_auth_id WHERE id = p_user_id; 
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: get_active_viib_weights
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_viib_weights()
RETURNS TABLE(id uuid, emotional_weight real, social_weight real, historical_weight real, context_weight real, novelty_weight real)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT vwc.id, vwc.emotional_weight, vwc.social_weight, vwc.historical_weight, vwc.context_weight, vwc.novelty_weight
    FROM viib_weight_config vwc WHERE vwc.is_active = true LIMIT 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: get_titles_by_ids
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_titles_by_ids(p_title_ids uuid[])
RETURNS TABLE(id uuid, name text, title_type text, poster_path text, backdrop_path text, trailer_url text, runtime integer, release_date date, first_air_date date, tmdb_id integer, overview text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.title_type, t.poster_path, t.backdrop_path, t.trailer_url, t.runtime, t.release_date, t.first_air_date, t.tmdb_id, t.overview
    FROM titles t WHERE t.id = ANY(p_title_ids);
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: get_vibe_list_stats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vibe_list_stats(p_list_ids uuid[])
RETURNS TABLE(list_id uuid, item_count bigint, view_count bigint, follower_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
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

-- ----------------------------------------------------------------------------
-- Function: viib_score_components
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
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

-- ----------------------------------------------------------------------------
-- Function: viib_score
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
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

-- ----------------------------------------------------------------------------
-- Function: viib_score_with_intent
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
declare v_base real; v_intent real;
begin
    v_base := viib_score(p_user_id, p_title_id);
    v_intent := viib_intent_alignment_score(p_user_id, p_title_id);
    return v_base * v_intent;
end;
$$;

-- ----------------------------------------------------------------------------
-- Function: log_recommendation_outcome
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_recommendation_outcome(p_user_id uuid, p_title_id uuid, p_was_selected boolean, p_watch_duration_percentage real, p_rating_value rating_value)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
begin
    insert into recommendation_outcomes (user_id, title_id, was_selected, watch_duration_percentage, rating_value)
    values (p_user_id, p_title_id, p_was_selected, p_watch_duration_percentage, p_rating_value);
end;
$$;

-- ----------------------------------------------------------------------------
-- Function: promote_title_intents
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_title_intents(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- ----------------------------------------------------------------------------
-- Function: refresh_title_transformation_scores
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: refresh_viib_reco_materializations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_viib_reco_materializations()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM refresh_title_emotion_vectors();
    PERFORM refresh_title_transformation_scores();
    PERFORM refresh_title_intent_alignment_scores();
    PERFORM refresh_title_social_summary();
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: get_cron_job_progress
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cron_job_progress()
RETURNS TABLE(vector_count bigint, transform_count bigint, intent_count bigint, social_count bigint, vector_updated_at timestamp with time zone, transform_updated_at timestamp with time zone, intent_updated_at timestamp with time zone, social_updated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
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

-- ----------------------------------------------------------------------------
-- Function: run_cron_job_now
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: increment_job_titles
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE jobs
  SET 
    total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment,
    last_run_at = NOW()
  WHERE job_type = p_job_type;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function: get_titles_with_all_streaming_services
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_titles_with_all_streaming_services(p_limit integer DEFAULT 100, p_cursor uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, tmdb_id integer, title_type text, name text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
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

-- ----------------------------------------------------------------------------
-- Function: get_corrupted_streaming_count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_corrupted_streaming_count()
RETURNS integer
LANGUAGE sql
STABLE
SET statement_timeout TO '60s'
SET search_path TO 'public'
AS $$
  WITH service_counts AS (
    SELECT tsa.title_id, COUNT(DISTINCT tsa.streaming_service_id) as service_count
    FROM title_streaming_availability tsa WHERE tsa.region_code = 'US' GROUP BY tsa.title_id
  ),
  active_services AS (SELECT COUNT(*) as total FROM streaming_services WHERE is_active = true)
  SELECT COUNT(*)::integer FROM service_counts sc, active_services act WHERE sc.service_count >= act.total - 1;
$$;

-- ----------------------------------------------------------------------------
-- Function: viib_autotune_weights
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    r_outcome recommendation_outcomes%ROWTYPE;
    s_count INTEGER := 0;
    f_count INTEGER := 0;
    s_emotional REAL := 0; s_social REAL := 0; s_historical REAL := 0; s_context REAL := 0; s_novelty REAL := 0;
    f_emotional REAL := 0; f_social REAL := 0; f_historical REAL := 0; f_context REAL := 0; f_novelty REAL := 0;
    c_emotional REAL; c_social REAL; c_historical REAL; c_context REAL; c_novelty REAL;
    avg_s_emotional REAL; avg_s_social REAL; avg_s_hist REAL; avg_s_context REAL; avg_s_novelty REAL;
    avg_f_emotional REAL; avg_f_social REAL; avg_f_hist REAL; avg_f_context REAL; avg_f_novelty REAL;
    d_emotional REAL; d_social REAL; d_hist REAL; d_context REAL; d_novelty REAL;
    sum_delta REAL;
    new_w_emotional REAL; new_w_social REAL; new_w_hist REAL; new_w_context REAL; new_w_novelty REAL;
    v_new_id UUID;
BEGIN
    FOR r_outcome IN
        SELECT * FROM recommendation_outcomes WHERE created_at >= (now() - (p_days || ' days')::INTERVAL)
    LOOP
        SELECT emotional_component, social_component, historical_component, context_component, novelty_component
        INTO c_emotional, c_social, c_historical, c_context, c_novelty
        FROM viib_score_components(r_outcome.user_id, r_outcome.title_id);

        IF r_outcome.was_selected = TRUE OR r_outcome.rating_value IN ('love_it','like_it') THEN
            s_count := s_count + 1;
            s_emotional := s_emotional + c_emotional; s_social := s_social + c_social;
            s_historical := s_historical + c_historical; s_context := s_context + c_context; s_novelty := s_novelty + c_novelty;
        ELSE
            f_count := f_count + 1;
            f_emotional := f_emotional + c_emotional; f_social := f_social + c_social;
            f_historical := f_historical + c_historical; f_context := f_context + c_context; f_novelty := f_novelty + c_novelty;
        END IF;
    END LOOP;

    IF s_count = 0 AND f_count = 0 THEN RETURN NULL; END IF;

    IF s_count > 0 THEN
        avg_s_emotional := s_emotional / s_count; avg_s_social := s_social / s_count;
        avg_s_hist := s_historical / s_count; avg_s_context := s_context / s_count; avg_s_novelty := s_novelty / s_count;
    ELSE
        avg_s_emotional := 0; avg_s_social := 0; avg_s_hist := 0; avg_s_context := 0; avg_s_novelty := 0;
    END IF;

    IF f_count > 0 THEN
        avg_f_emotional := f_emotional / f_count; avg_f_social := f_social / f_count;
        avg_f_hist := f_historical / f_count; avg_f_context := f_context / f_count; avg_f_novelty := f_novelty / f_count;
    ELSE
        avg_f_emotional := 0; avg_f_social := 0; avg_f_hist := 0; avg_f_context := 0; avg_f_novelty := 0;
    END IF;

    d_emotional := GREATEST(avg_s_emotional - avg_f_emotional, 0);
    d_social := GREATEST(avg_s_social - avg_f_social, 0);
    d_hist := GREATEST(avg_s_hist - avg_f_hist, 0);
    d_context := GREATEST(avg_s_context - avg_f_context, 0);
    d_novelty := GREATEST(avg_s_novelty - avg_f_novelty, 0);

    sum_delta := d_emotional + d_social + d_hist + d_context + d_novelty;
    IF sum_delta <= 0 THEN RETURN NULL; END IF;

    new_w_emotional := d_emotional / sum_delta; new_w_social := d_social / sum_delta;
    new_w_hist := d_hist / sum_delta; new_w_context := d_context / sum_delta; new_w_novelty := d_novelty / sum_delta;

    UPDATE viib_weight_config SET is_active = FALSE WHERE is_active = TRUE;

    INSERT INTO viib_weight_config (emotional_weight, social_weight, historical_weight, context_weight, novelty_weight, is_active, notes)
    VALUES (new_w_emotional, new_w_social, new_w_hist, new_w_context, new_w_novelty, TRUE,
        'Auto-tuned from recommendation_outcomes over last ' || p_days || ' days')
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- ============================================================================
-- SECTION 5: TRIGGER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger Function: update_feedback_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_jobs_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_vibe_preferences_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_email_config_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_email_templates_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_rate_limit_config_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_vibe_lists_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_app_settings_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger Function: update_viib_intent_classified_titles_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.update_feedback_updated_at();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_jobs_updated_at();

CREATE TRIGGER update_vibe_preferences_updated_at
    BEFORE UPDATE ON public.user_vibe_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vibe_preferences_updated_at();

CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON public.email_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_config_updated_at();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_templates_updated_at();

CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rate_limit_config_updated_at();

CREATE TRIGGER update_vibe_lists_updated_at
    BEFORE UPDATE ON public.vibe_lists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vibe_lists_updated_at();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_app_settings_updated_at();

CREATE TRIGGER update_viib_intent_classified_titles_updated_at
    BEFORE UPDATE ON public.viib_intent_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_viib_intent_classified_titles_updated_at();

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_display_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_to_intent_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_transformation_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enabled_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_trailer_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spoken_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_emotion_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_intent_alignment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_social_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_streaming_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_transformation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_user_emotion_match_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmdb_genre_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tmdb_provider_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emotion_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaming_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_title_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_title_social_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vibe_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_shared_with ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_emotion_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_emotion_classified_titles_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_title_intent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_weight_config ENABLE ROW LEVEL SECURITY;

-- Sample RLS Policies (service role policies for administrative access)
-- Note: These are restrictive policies using service_role for admin operations

-- activation_codes
CREATE POLICY activation_codes_service ON public.activation_codes FOR ALL USING (true) WITH CHECK (true);

-- app_settings
CREATE POLICY app_settings_service ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY app_settings_anon_read ON public.app_settings FOR SELECT 
    USING ((setting_key !~~ '%secret%'::text) AND (setting_key !~~ '%key%'::text) AND (setting_key !~~ '%password%'::text) AND (setting_key !~~ '%token%'::text));

-- users
CREATE POLICY users_select_own ON public.users FOR SELECT USING (id = get_user_id_from_auth());
CREATE POLICY users_update_own ON public.users FOR UPDATE USING (id = get_user_id_from_auth());
CREATE POLICY users_service ON public.users FOR ALL USING (true) WITH CHECK (true);

-- titles (public read)
CREATE POLICY titles_public_read ON public.titles FOR SELECT USING (true);
CREATE POLICY titles_service_write ON public.titles FOR ALL USING (true) WITH CHECK (true);

-- genres (public read)
CREATE POLICY genres_public_read ON public.genres FOR SELECT USING (true);
CREATE POLICY genres_service_write ON public.genres FOR ALL USING (true) WITH CHECK (true);

-- streaming_services (public read)
CREATE POLICY streaming_services_public_read ON public.streaming_services FOR SELECT USING (true);
CREATE POLICY streaming_services_service_write ON public.streaming_services FOR ALL USING (true) WITH CHECK (true);

-- user_title_interactions (user owns their own)
CREATE POLICY user_title_interactions_auth ON public.user_title_interactions FOR ALL 
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_title_interactions_service ON public.user_title_interactions FOR ALL USING (true) WITH CHECK (true);

-- user_emotion_states (user owns their own)
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states FOR ALL 
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_emotion_states_service ON public.user_emotion_states FOR ALL USING (true) WITH CHECK (true);

-- user_vibe_preferences (user owns their own)
CREATE POLICY user_vibe_preferences_auth ON public.user_vibe_preferences FOR ALL 
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_vibe_preferences_service ON public.user_vibe_preferences FOR ALL USING (true) WITH CHECK (true);

-- user_streaming_subscriptions (user owns their own)
CREATE POLICY user_streaming_subscriptions_auth ON public.user_streaming_subscriptions FOR ALL 
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_streaming_subscriptions_service ON public.user_streaming_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- user_language_preferences (user owns their own)
CREATE POLICY user_language_preferences_auth ON public.user_language_preferences FOR ALL 
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_language_preferences_service ON public.user_language_preferences FOR ALL USING (true) WITH CHECK (true);

-- friend_connections (user can see their connections)
CREATE POLICY friend_connections_auth ON public.friend_connections FOR ALL 
    USING ((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth())) 
    WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY friend_connections_service ON public.friend_connections FOR ALL USING (true) WITH CHECK (true);

-- feedback (users can insert and see their own)
CREATE POLICY feedback_insert_auth ON public.feedback FOR INSERT WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT USING (user_id = get_user_id_from_auth());
CREATE POLICY feedback_service ON public.feedback FOR ALL USING (true) WITH CHECK (true);

-- vibe_lists (owner access)
CREATE POLICY vibe_lists_owner ON public.vibe_lists FOR ALL 
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY vibe_lists_public_read ON public.vibe_lists FOR SELECT USING (is_public = true);
CREATE POLICY vibe_lists_service ON public.vibe_lists FOR ALL USING (true) WITH CHECK (true);

-- emotion_master (public read)
CREATE POLICY emotion_master_public_read ON public.emotion_master FOR SELECT USING (true);
CREATE POLICY emotion_master_service_write ON public.emotion_master FOR ALL USING (true) WITH CHECK (true);

-- vibes (public read)
CREATE POLICY vibes_public_read ON public.vibes FOR SELECT USING (true);
CREATE POLICY vibes_service_write ON public.vibes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- END OF DUMP
-- ============================================================================
