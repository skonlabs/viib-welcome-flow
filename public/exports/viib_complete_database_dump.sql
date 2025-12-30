-- ============================================================================
-- ViiB Complete Database Schema Dump
-- Generated: 2025-12-30
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TYPE public.content_type AS ENUM ('movie', 'tv_show', 'documentary', 'short_film');

CREATE TYPE public.device_type AS ENUM ('mobile', 'tablet', 'desktop', 'tv', 'unknown');

CREATE TYPE public.discovery_source AS ENUM ('viib_recommendation', 'friend_recommendation', 'search', 'browse', 'external', 'social_feed');

CREATE TYPE public.emotion_category AS ENUM ('user_state', 'content_state', 'transformation_goal');

CREATE TYPE public.engagement_action AS ENUM ('view', 'click', 'scroll', 'hover', 'share', 'save');

CREATE TYPE public.environment_tag AS ENUM ('solo', 'date_night', 'family', 'friends', 'party', 'background');

CREATE TYPE public.feedback_type AS ENUM ('bug', 'feature_request', 'general', 'support');

CREATE TYPE public.interaction_type AS ENUM ('started', 'completed', 'rated', 'liked', 'disliked', 'browsed', 'wishlisted', 'ignored');

CREATE TYPE public.model_type AS ENUM ('collaborative', 'content_based', 'hybrid', 'emotion_based');

CREATE TYPE public.network_type AS ENUM ('wifi', 'cellular', 'offline', 'unknown');

CREATE TYPE public.notification_type AS ENUM ('recommendation', 'friend_activity', 'system', 'reminder');

CREATE TYPE public.provider_type_enum AS ENUM ('flatrate', 'rent', 'buy', 'ads', 'free');

CREATE TYPE public.rating_value AS ENUM ('love_it', 'like_it', 'ok', 'dislike_it');

CREATE TYPE public.relationship_type AS ENUM ('friend', 'family', 'colleague', 'acquaintance');

CREATE TYPE public.signup_method AS ENUM ('phone', 'email', 'google', 'apple');

CREATE TYPE public.time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night', 'late_night');

CREATE TYPE public.title_type_enum AS ENUM ('movie', 'tv');

CREATE TYPE public.transformation_type AS ENUM ('amplify', 'soothe', 'energize', 'calm', 'inspire', 'comfort', 'challenge', 'escape', 'validate', 'transform');

CREATE TYPE public.viib_intent_type AS ENUM ('escape', 'thrill', 'comfort', 'inspire', 'learn', 'laugh', 'cry', 'reflect', 'bond', 'background');

-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: activation_codes
-- ----------------------------------------------------------------------------
CREATE TABLE public.activation_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code character varying(50) NOT NULL,
    is_used boolean DEFAULT false,
    used_by uuid,
    used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    max_uses integer,
    current_uses integer DEFAULT 0 NOT NULL,
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
    smtp_host character varying(255) NOT NULL,
    smtp_port integer NOT NULL,
    smtp_user character varying(255) NOT NULL,
    smtp_password character varying(255) NOT NULL,
    from_email character varying(255) NOT NULL,
    from_name character varying(255),
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
    template_type character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
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
    email character varying(255) NOT NULL,
    otp_code character varying(10) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    otp_hash text,
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_display_phrases
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_display_phrases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    min_intensity numeric(3,2) NOT NULL,
    max_intensity numeric(3,2) NOT NULL,
    display_phrase text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT emotion_display_phrases_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_master
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_master (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_label character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    valence real,
    arousal real,
    dominance real,
    intensity_multiplier real DEFAULT 1.0,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT emotion_master_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_master_emotion_label_key UNIQUE (emotion_label)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_to_intent_map
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    intent_type character varying(50) NOT NULL,
    weight real NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT emotion_to_intent_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_to_intent_map_emotion_id_intent_type_key UNIQUE (emotion_id, intent_type)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_transformation_map
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_transformation_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_emotion_id uuid NOT NULL,
    content_emotion_id uuid NOT NULL,
    transformation_type character varying(50) NOT NULL,
    confidence_score real NOT NULL,
    priority_rank integer,
    CONSTRAINT emotion_transformation_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_transformation_map_user_emotion_id_content_emotion__key UNIQUE (user_emotion_id, content_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: enabled_countries
-- ----------------------------------------------------------------------------
CREATE TABLE public.enabled_countries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    country_code character varying(2) NOT NULL,
    country_name character varying(100) NOT NULL,
    dial_code character varying(10) NOT NULL,
    flag_emoji character varying(10),
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
    vote_average numeric(3,1),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT episodes_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: feedback
-- ----------------------------------------------------------------------------
CREATE TABLE public.feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: friend_connections
-- ----------------------------------------------------------------------------
CREATE TABLE public.friend_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    friend_user_id uuid NOT NULL,
    relationship_type character varying(50),
    trust_score real DEFAULT 0.5 NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_blocked boolean DEFAULT false,
    CONSTRAINT friend_connections_pkey PRIMARY KEY (id),
    CONSTRAINT friend_connections_user_id_friend_user_id_key UNIQUE (user_id, friend_user_id)
);

-- ----------------------------------------------------------------------------
-- Table: genres
-- ----------------------------------------------------------------------------
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    genre_name character varying(100) NOT NULL,
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
    job_name character varying(255) NOT NULL,
    job_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'idle'::character varying NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    error_message text,
    configuration jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_titles_processed integer DEFAULT 0,
    last_run_duration_seconds integer,
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_job_type_key UNIQUE (job_type)
);

-- ----------------------------------------------------------------------------
-- Table: keywords
-- ----------------------------------------------------------------------------
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
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
    ip_address text,
    attempt_type text DEFAULT 'password'::text NOT NULL,
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
    channel_name character varying(255) NOT NULL,
    channel_id character varying(100),
    language_code character varying(10) NOT NULL,
    region character varying(50),
    category character varying(50),
    priority integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT official_trailer_channels_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: personality_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE public.personality_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type_name character varying(50),
    introversion_score real,
    emotional_sensitivity real,
    analytical_thinking real,
    risk_tolerance real,
    sensation_seeking real,
    empathy_level real,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personality_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT personality_profiles_user_id_key UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- Table: phone_verifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.phone_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number character varying(20) NOT NULL,
    otp_code character varying(10) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    otp_hash text,
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    max_attempts integer DEFAULT 5,
    CONSTRAINT phone_verifications_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: rate_limit_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.rate_limit_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    endpoint character varying(255) NOT NULL,
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
    CONSTRAINT recommendation_notifications_pkey PRIMARY KEY (id)
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
    recommended_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recommendation_outcomes_pkey PRIMARY KEY (id)
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    CONSTRAINT seasons_pkey PRIMARY KEY (id),
    CONSTRAINT seasons_title_id_season_number_key UNIQUE (title_id, season_number)
);

-- ----------------------------------------------------------------------------
-- Table: session_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE public.session_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address text,
    user_agent text,
    is_remember_me boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT session_tokens_token_hash_key UNIQUE (token_hash)
);

-- ----------------------------------------------------------------------------
-- Table: spoken_languages
-- ----------------------------------------------------------------------------
CREATE TABLE public.spoken_languages (
    iso_639_1 character varying(10) NOT NULL,
    language_name character varying(100) NOT NULL,
    flag_emoji character varying(10),
    CONSTRAINT spoken_languages_pkey PRIMARY KEY (iso_639_1)
);

-- ----------------------------------------------------------------------------
-- Table: streaming_services
-- ----------------------------------------------------------------------------
CREATE TABLE public.streaming_services (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_name character varying(100) NOT NULL,
    logo_url text,
    website_url text,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT streaming_services_pkey PRIMARY KEY (id),
    CONSTRAINT streaming_services_service_name_key UNIQUE (service_name)
);

-- ----------------------------------------------------------------------------
-- Table: system_logs
-- ----------------------------------------------------------------------------
CREATE TABLE public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    severity character varying(20) DEFAULT 'error'::character varying NOT NULL,
    screen character varying(100),
    operation character varying(100),
    error_message text NOT NULL,
    error_stack text,
    context jsonb,
    http_status integer,
    resolved boolean DEFAULT false NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_logs_pkey PRIMARY KEY (id)
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
    CONSTRAINT title_emotion_vectors_pkey PRIMARY KEY (title_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_genres
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_intent_alignment_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_intent_alignment_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    alignment_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_intent_alignment_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_keywords
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_keywords (
    title_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    CONSTRAINT title_keywords_pkey PRIMARY KEY (title_id, keyword_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_social_summary
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_social_summary (
    title_id uuid NOT NULL,
    social_mean_rating real,
    social_rec_power real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_social_summary_pkey PRIMARY KEY (title_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_spoken_languages
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_spoken_languages (
    title_id uuid NOT NULL,
    language_code character varying(10) NOT NULL,
    CONSTRAINT title_spoken_languages_pkey PRIMARY KEY (title_id, language_code)
);

-- ----------------------------------------------------------------------------
-- Table: title_streaming_availability
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    region_code character varying(10) NOT NULL,
    CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- ----------------------------------------------------------------------------
-- Table: title_transformation_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_transformation_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_user_emotion_match_cache
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_user_emotion_match_cache (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    cosine_score real NOT NULL,
    transformation_score real,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT title_user_emotion_match_cache_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_id integer,
    title_type character varying(10),
    name text,
    original_name text,
    original_language character varying(10),
    overview text,
    poster_path text,
    backdrop_path text,
    release_date date,
    first_air_date date,
    last_air_date date,
    runtime integer,
    episode_run_time integer[],
    status character varying(50),
    popularity numeric(10,3),
    vote_average numeric(3,1),
    is_adult boolean DEFAULT false,
    imdb_id character varying(20),
    certification character varying(20),
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean,
    classification_status character varying(50),
    last_classified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    title_genres jsonb,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
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
    media_type text DEFAULT 'movie'::text NOT NULL,
    tv_equivalent_id integer,
    is_active boolean DEFAULT true NOT NULL,
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
    region_code text DEFAULT 'US'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
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
    device_type character varying(50),
    time_of_day_bucket character varying(20),
    location_type character varying(50),
    session_length_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_context_logs_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: user_emotion_states
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_emotion_states (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity real DEFAULT 0.5 NOT NULL,
    valence real,
    arousal real,
    dominance real,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_emotion_states_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: user_language_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL,
    language_code character varying(10) NOT NULL,
    priority_order integer,
    CONSTRAINT user_language_preferences_pkey PRIMARY KEY (user_id, language_code)
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
    CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_social_recommendations_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: user_streaming_subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_streaming_subscriptions (
    user_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT user_streaming_subscriptions_pkey PRIMARY KEY (user_id, streaming_service_id)
);

-- ----------------------------------------------------------------------------
-- Table: user_title_interactions
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_title_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value,
    watch_duration_percentage real,
    season_number integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_title_interactions_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: user_title_social_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    social_priority_score real NOT NULL,
    social_component_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_title_social_scores_pkey PRIMARY KEY (user_id, title_id)
);

-- ----------------------------------------------------------------------------
-- Table: user_vibe_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_vibe_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    vibe_id uuid,
    vibe_type character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    canonical_key text,
    CONSTRAINT user_vibe_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_vibe_preferences_user_id_key UNIQUE (user_id)
);

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number character varying(20),
    email character varying(255),
    full_name character varying(255),
    username character varying(100),
    is_phone_verified boolean DEFAULT false NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    is_age_over_18 boolean NOT NULL,
    onboarding_completed boolean DEFAULT false NOT NULL,
    last_onboarding_step character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    country character varying(100),
    language_preference character varying(10),
    timezone character varying(50),
    auth_id uuid,
    signup_method character varying(20),
    ip_address text,
    ip_country text,
    password_hash text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_auth_id_key UNIQUE (auth_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_phone_number_key UNIQUE (phone_number),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_emotion_weights
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_emotion_weights (
    vibe_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_emotion_weights_pkey PRIMARY KEY (vibe_id, emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_genre_weights
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_genre_weights (
    vibe_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_pkey PRIMARY KEY (vibe_id, genre_id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_genre_weights_key
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_genre_weights_key (
    canonical_key text NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_key_pkey PRIMARY KEY (canonical_key, genre_id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_followers
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    followed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vibe_list_followers_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_followers_vibe_list_id_follower_user_id_key UNIQUE (vibe_list_id, follower_user_id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_items
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    title_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vibe_list_items_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_items_vibe_list_id_title_id_key UNIQUE (vibe_list_id, title_id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_shared_with
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    shared_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vibe_list_shared_with_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_shared_with_vibe_list_id_shared_with_user_id_key UNIQUE (vibe_list_id, shared_with_user_id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_views
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    viewer_user_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vibe_list_views_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: vibe_lists
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_public boolean DEFAULT false NOT NULL,
    is_collaborative boolean DEFAULT false NOT NULL,
    cover_image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vibe_lists_pkey PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------------
-- Table: vibes
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    icon_name text,
    color_hex text,
    is_active boolean DEFAULT true NOT NULL,
    canonical_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vibes_pkey PRIMARY KEY (id),
    CONSTRAINT vibes_canonical_key_key UNIQUE (canonical_key),
    CONSTRAINT vibes_name_key UNIQUE (name)
);

-- ----------------------------------------------------------------------------
-- Table: viib_emotion_classified_titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level integer NOT NULL,
    source character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_pkey PRIMARY KEY (title_id, emotion_id),
    CONSTRAINT viib_emotion_classified_titles_intensity_level_check CHECK (((intensity_level >= 1) AND (intensity_level <= 10)))
);

-- ----------------------------------------------------------------------------
-- Table: viib_emotion_classified_titles_staging
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles_staging (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level integer NOT NULL,
    source character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT viib_emotion_classified_titles_staging_pkey PRIMARY KEY (title_id, emotion_id),
    CONSTRAINT viib_emotion_classified_titles_staging_intensity_level_check CHECK (((intensity_level >= 1) AND (intensity_level <= 10)))
);

-- ----------------------------------------------------------------------------
-- Table: viib_intent_classified_titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles (
    title_id uuid NOT NULL,
    intent_type character varying(50) NOT NULL,
    confidence_score real NOT NULL,
    source character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_pkey PRIMARY KEY (title_id, intent_type)
);

-- ----------------------------------------------------------------------------
-- Table: viib_intent_classified_titles_staging
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles_staging (
    title_id uuid NOT NULL,
    intent_type character varying(50) NOT NULL,
    confidence_score real NOT NULL,
    source character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT viib_intent_classified_titles_staging_pkey PRIMARY KEY (title_id, intent_type)
);

-- ----------------------------------------------------------------------------
-- Table: viib_title_intent_stats
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_title_intent_stats (
    title_id uuid NOT NULL,
    dominant_intent character varying(50),
    intent_diversity_score real,
    top_intent_confidence real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_title_intent_stats_pkey PRIMARY KEY (title_id)
);

-- ----------------------------------------------------------------------------
-- Table: viib_weight_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_weight_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotional_weight real DEFAULT 0.35 NOT NULL,
    social_weight real DEFAULT 0.2 NOT NULL,
    historical_weight real DEFAULT 0.25 NOT NULL,
    context_weight real DEFAULT 0.1 NOT NULL,
    novelty_weight real DEFAULT 0.1 NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT viib_weight_config_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- SECTION 3: FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE public.activation_codes ADD CONSTRAINT activation_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);

ALTER TABLE public.emotion_display_phrases ADD CONSTRAINT emotion_display_phrases_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.emotion_to_intent_map ADD CONSTRAINT emotion_to_intent_map_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.emotion_transformation_map ADD CONSTRAINT emotion_transformation_map_from_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.emotion_transformation_map ADD CONSTRAINT emotion_transformation_map_to_emotion_id_fkey FOREIGN KEY (content_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.episodes ADD CONSTRAINT episodes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);

ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.friend_connections ADD CONSTRAINT friend_connections_friend_user_id_fkey FOREIGN KEY (friend_user_id) REFERENCES public.users(id);

ALTER TABLE public.friend_connections ADD CONSTRAINT friend_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.personality_profiles ADD CONSTRAINT personality_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.recommendation_notifications ADD CONSTRAINT recommendation_notifications_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id);

ALTER TABLE public.recommendation_notifications ADD CONSTRAINT recommendation_notifications_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id);

ALTER TABLE public.recommendation_notifications ADD CONSTRAINT recommendation_notifications_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.recommendation_outcomes ADD CONSTRAINT recommendation_outcomes_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.recommendation_outcomes ADD CONSTRAINT recommendation_outcomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.seasons ADD CONSTRAINT seasons_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.session_tokens ADD CONSTRAINT session_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);

ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.title_emotion_vectors ADD CONSTRAINT title_emotion_vectors_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_genres ADD CONSTRAINT title_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id);

ALTER TABLE public.title_genres ADD CONSTRAINT title_genres_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_intent_alignment_scores ADD CONSTRAINT title_intent_alignment_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_intent_alignment_scores ADD CONSTRAINT title_intent_alignment_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.title_keywords ADD CONSTRAINT title_keywords_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.keywords(id);

ALTER TABLE public.title_keywords ADD CONSTRAINT title_keywords_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_social_summary ADD CONSTRAINT title_social_summary_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_spoken_languages ADD CONSTRAINT title_spoken_languages_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1);

ALTER TABLE public.title_spoken_languages ADD CONSTRAINT title_spoken_languages_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_streaming_availability ADD CONSTRAINT title_streaming_availability_streaming_service_id_fkey FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id);

ALTER TABLE public.title_streaming_availability ADD CONSTRAINT title_streaming_availability_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_transformation_scores ADD CONSTRAINT title_transformation_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_transformation_scores ADD CONSTRAINT title_transformation_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.title_user_emotion_match_cache ADD CONSTRAINT title_user_emotion_match_cache_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.title_user_emotion_match_cache ADD CONSTRAINT title_user_emotion_match_cache_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.user_context_logs ADD CONSTRAINT user_context_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_emotion_states ADD CONSTRAINT user_emotion_states_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.user_emotion_states ADD CONSTRAINT user_emotion_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_language_preferences ADD CONSTRAINT user_language_preferences_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1);

ALTER TABLE public.user_language_preferences ADD CONSTRAINT user_language_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_social_recommendations ADD CONSTRAINT user_social_recommendations_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id);

ALTER TABLE public.user_social_recommendations ADD CONSTRAINT user_social_recommendations_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id);

ALTER TABLE public.user_social_recommendations ADD CONSTRAINT user_social_recommendations_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.user_streaming_subscriptions ADD CONSTRAINT user_streaming_subscriptions_streaming_service_id_fkey FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id);

ALTER TABLE public.user_streaming_subscriptions ADD CONSTRAINT user_streaming_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_title_interactions ADD CONSTRAINT user_title_interactions_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.user_title_interactions ADD CONSTRAINT user_title_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_title_social_scores ADD CONSTRAINT user_title_social_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.user_vibe_preferences ADD CONSTRAINT user_vibe_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_emotion_weights ADD CONSTRAINT vibe_emotion_weights_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.vibe_genre_weights ADD CONSTRAINT vibe_genre_weights_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id);

ALTER TABLE public.vibe_genre_weights_key ADD CONSTRAINT vibe_genre_weights_key_canonical_fk FOREIGN KEY (canonical_key) REFERENCES public.vibes(canonical_key);

ALTER TABLE public.vibe_list_followers ADD CONSTRAINT vibe_list_followers_follower_user_id_fkey FOREIGN KEY (follower_user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_list_followers ADD CONSTRAINT vibe_list_followers_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id);

ALTER TABLE public.vibe_list_items ADD CONSTRAINT vibe_list_items_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id);

ALTER TABLE public.vibe_list_shared_with ADD CONSTRAINT vibe_list_shared_with_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_list_shared_with ADD CONSTRAINT vibe_list_shared_with_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id);

ALTER TABLE public.vibe_list_views ADD CONSTRAINT vibe_list_views_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id);

ALTER TABLE public.vibe_list_views ADD CONSTRAINT vibe_list_views_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_lists ADD CONSTRAINT vibe_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.viib_emotion_classified_titles ADD CONSTRAINT viib_emotion_classified_titles_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.viib_emotion_classified_titles ADD CONSTRAINT viib_emotion_classified_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.viib_emotion_classified_titles_staging ADD CONSTRAINT viib_emotion_classified_titles_staging_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.viib_emotion_classified_titles_staging ADD CONSTRAINT viib_emotion_classified_titles_staging_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.viib_intent_classified_titles ADD CONSTRAINT viib_intent_classified_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.viib_intent_classified_titles_staging ADD CONSTRAINT viib_intent_classified_titles_staging_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.viib_title_intent_stats ADD CONSTRAINT viib_title_intent_stats_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications USING btree (email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_lookup ON public.email_verifications USING btree (email, verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON public.episodes USING btree (season_id);
CREATE INDEX IF NOT EXISTS idx_friend_connections_friend_user_id ON public.friend_connections USING btree (friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_connections_user_id ON public.friend_connections USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_created ON public.login_attempts USING btree (identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications USING btree (phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_lookup ON public.phone_verifications USING btree (phone_number, verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_user_title ON public.recommendation_outcomes USING btree (user_id, title_id);
CREATE INDEX IF NOT EXISTS idx_seasons_title_id ON public.seasons USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires ON public.session_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id ON public.session_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved ON public.system_logs USING btree (resolved);
CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON public.system_logs USING btree (severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_title_genres_genre_id ON public.title_genres USING btree (genre_id);
CREATE INDEX IF NOT EXISTS idx_title_genres_title_id ON public.title_genres USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_title_keywords_keyword_id ON public.title_keywords USING btree (keyword_id);
CREATE INDEX IF NOT EXISTS idx_title_keywords_title_id ON public.title_keywords USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_title_streaming_availability_region ON public.title_streaming_availability USING btree (region_code);
CREATE INDEX IF NOT EXISTS idx_title_streaming_availability_service ON public.title_streaming_availability USING btree (streaming_service_id);
CREATE INDEX IF NOT EXISTS idx_title_streaming_availability_title ON public.title_streaming_availability USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_titles_classification_status ON public.titles USING btree (classification_status);
CREATE INDEX IF NOT EXISTS idx_titles_original_language ON public.titles USING btree (original_language);
CREATE INDEX IF NOT EXISTS idx_titles_popularity ON public.titles USING btree (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_titles_tmdb_id ON public.titles USING btree (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_titles_type ON public.titles USING btree (title_type);
CREATE INDEX IF NOT EXISTS idx_user_context_logs_user_id ON public.user_context_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_emotion_states_created_at ON public.user_emotion_states USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_emotion_states_user_emotion ON public.user_emotion_states USING btree (user_id, emotion_id);
CREATE INDEX IF NOT EXISTS idx_user_emotion_states_user_id ON public.user_emotion_states USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaming_subscriptions_user_id ON public.user_streaming_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_created_at ON public.user_title_interactions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_title_id ON public.user_title_interactions USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_type ON public.user_title_interactions USING btree (interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_user_id ON public.user_title_interactions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_user_title ON public.user_title_interactions USING btree (user_id, title_id);
CREATE INDEX IF NOT EXISTS idx_user_vibe_preferences_user_id ON public.user_vibe_preferences USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users USING btree (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users USING btree (phone_number);
CREATE INDEX IF NOT EXISTS idx_vibe_list_items_title_id ON public.vibe_list_items USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_items_vibe_list_id ON public.vibe_list_items USING btree (vibe_list_id);
CREATE INDEX IF NOT EXISTS idx_vibe_lists_user_id ON public.vibe_lists USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_viib_emotion_classified_titles_emotion ON public.viib_emotion_classified_titles USING btree (emotion_id);
CREATE INDEX IF NOT EXISTS idx_viib_emotion_classified_titles_title ON public.viib_emotion_classified_titles USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_viib_intent_classified_titles_intent ON public.viib_intent_classified_titles USING btree (intent_type);
CREATE INDEX IF NOT EXISTS idx_viib_intent_classified_titles_title ON public.viib_intent_classified_titles USING btree (title_id);

-- ============================================================================
-- SECTION 5: DATABASE FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: has_role
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: calculate_emotion_distance_score
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_emotion_distance_score(p_user_valence real, p_user_arousal real, p_user_dominance real, p_title_valence real, p_title_arousal real, p_title_dominance real)
 RETURNS real
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_app_setting
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_value text;
BEGIN
  SELECT setting_value::text INTO v_value
  FROM app_settings
  WHERE setting_key = p_key
  LIMIT 1;
  RETURN COALESCE(v_value, p_default);
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: calculate_taste_similarity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
 RETURNS real
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: invalidate_old_otps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_old_otps(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE email_verifications
    SET verified = true
    WHERE email = p_email AND verified = false AND expires_at > NOW();
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: invalidate_old_phone_otps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_old_phone_otps(p_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE phone_verifications
    SET verified = true
    WHERE phone_number = p_phone AND verified = false AND expires_at > NOW();
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: check_list_ownership
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_list_ownership(p_list_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (SELECT 1 FROM vibe_lists WHERE id = p_list_id AND user_id = p_user_id);
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_user_id_from_auth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    RETURN v_user_id;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: link_auth_user_to_profile
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN UPDATE users SET auth_id = p_auth_id WHERE id = p_user_id; END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: calculate_user_emotion_intensity
-- ----------------------------------------------------------------------------
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
    SELECT intensity_multiplier INTO v_multiplier FROM emotion_master WHERE id = p_emotion_id;
    IF v_multiplier IS NULL THEN v_multiplier := 1.0; END IF;
    v_intensity := v_normalized_energy * v_multiplier;
    v_intensity := LEAST(GREATEST(v_intensity, 0.1), 1.0);
    RETURN v_intensity;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_active_viib_weights
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_viib_weights()
 RETURNS TABLE(id uuid, emotional_weight real, social_weight real, historical_weight real, context_weight real, novelty_weight real)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT vwc.id, vwc.emotional_weight, vwc.social_weight, vwc.historical_weight, vwc.context_weight, vwc.novelty_weight
    FROM viib_weight_config vwc WHERE vwc.is_active = true LIMIT 1;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_titles_by_ids
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_titles_by_ids(p_title_ids uuid[])
 RETURNS TABLE(id uuid, name text, title_type text, poster_path text, backdrop_path text, trailer_url text, runtime integer, release_date date, first_air_date date, tmdb_id integer, overview text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.title_type, t.poster_path, t.backdrop_path, t.trailer_url, t.runtime, t.release_date, t.first_air_date, t.tmdb_id, t.overview
    FROM titles t WHERE t.id = ANY(p_title_ids);
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_vibe_list_stats
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_vibe_list_stats(p_list_ids uuid[])
 RETURNS TABLE(list_id uuid, item_count bigint, view_count bigint, follower_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_titles_with_all_streaming_services
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_titles_with_all_streaming_services(p_limit integer DEFAULT 100, p_cursor uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, tmdb_id integer, title_type text, name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: get_corrupted_streaming_count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_corrupted_streaming_count()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET statement_timeout TO '60s'
 SET search_path TO 'public'
AS $function$
  WITH service_counts AS (
    SELECT tsa.title_id, COUNT(DISTINCT tsa.streaming_service_id) as service_count
    FROM title_streaming_availability tsa WHERE tsa.region_code = 'US' GROUP BY tsa.title_id
  ),
  active_services AS (SELECT COUNT(*) as total FROM streaming_services WHERE is_active = true)
  SELECT COUNT(*)::integer FROM service_counts sc, active_services act WHERE sc.service_count >= act.total - 1;
$function$;

-- ----------------------------------------------------------------------------
-- Function: viib_score_components
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
 RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: viib_score
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: viib_score_with_intent
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_base real; v_intent real;
begin
    v_base := viib_score(p_user_id, p_title_id);
    v_intent := viib_intent_alignment_score(p_user_id, p_title_id);
    return v_base * v_intent;
end;
$function$;

-- ----------------------------------------------------------------------------
-- Function: log_recommendation_outcome
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_recommendation_outcome(p_user_id uuid, p_title_id uuid, p_was_selected boolean, p_watch_duration_percentage real, p_rating_value rating_value)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
    insert into recommendation_outcomes (user_id, title_id, was_selected, watch_duration_percentage, rating_value)
    values (p_user_id, p_title_id, p_was_selected, p_watch_duration_percentage, p_rating_value);
end;
$function$;

-- ----------------------------------------------------------------------------
-- Function: promote_title_intents
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_title_intents(p_limit integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: run_cron_job_now
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: get_cron_job_progress
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cron_job_progress()
 RETURNS TABLE(vector_count bigint, transform_count bigint, intent_count bigint, social_count bigint, vector_updated_at timestamp with time zone, transform_updated_at timestamp with time zone, intent_updated_at timestamp with time zone, social_updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
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

-- ----------------------------------------------------------------------------
-- Function: increment_job_titles
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Function: refresh_title_transformation_scores
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ----------------------------------------------------------------------------
-- Function: refresh_viib_reco_materializations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_viib_reco_materializations()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM refresh_title_emotion_vectors();
    PERFORM refresh_title_transformation_scores();
    PERFORM refresh_title_intent_alignment_scores();
    PERFORM refresh_title_social_summary();
END;
$function$;

-- ----------------------------------------------------------------------------
-- Function: viib_autotune_weights
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    r_outcome recommendation_outcomes%ROWTYPE;
    s_count INTEGER := 0; f_count INTEGER := 0;
    s_emotional REAL := 0; s_social REAL := 0; s_historical REAL := 0; s_context REAL := 0; s_novelty REAL := 0;
    f_emotional REAL := 0; f_social REAL := 0; f_historical REAL := 0; f_context REAL := 0; f_novelty REAL := 0;
    c_emotional REAL; c_social REAL; c_historical REAL; c_context REAL; c_novelty REAL;
    avg_s_emotional REAL; avg_s_social REAL; avg_s_hist REAL; avg_s_context REAL; avg_s_novelty REAL;
    avg_f_emotional REAL; avg_f_social REAL; avg_f_hist REAL; avg_f_context REAL; avg_f_novelty REAL;
    d_emotional REAL; d_social REAL; d_hist REAL; d_context REAL; d_novelty REAL; sum_delta REAL;
    new_w_emotional REAL; new_w_social REAL; new_w_hist REAL; new_w_context REAL; new_w_novelty REAL;
    v_new_id UUID;
BEGIN
    FOR r_outcome IN SELECT * FROM recommendation_outcomes WHERE created_at >= (now() - (p_days || ' days')::INTERVAL)
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
$function$;

-- ----------------------------------------------------------------------------
-- Trigger Functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();
CREATE TRIGGER update_vibe_preferences_updated_at BEFORE UPDATE ON public.user_vibe_preferences FOR EACH ROW EXECUTE FUNCTION update_vibe_preferences_updated_at();
CREATE TRIGGER update_email_config_updated_at BEFORE UPDATE ON public.email_config FOR EACH ROW EXECUTE FUNCTION update_email_config_updated_at();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION update_email_templates_updated_at();
CREATE TRIGGER update_rate_limit_config_updated_at BEFORE UPDATE ON public.rate_limit_config FOR EACH ROW EXECUTE FUNCTION update_rate_limit_config_updated_at();
CREATE TRIGGER update_vibe_lists_updated_at BEFORE UPDATE ON public.vibe_lists FOR EACH ROW EXECUTE FUNCTION update_vibe_lists_updated_at();
CREATE TRIGGER update_viib_intent_classified_titles_updated_at BEFORE UPDATE ON public.viib_intent_classified_titles FOR EACH ROW EXECUTE FUNCTION update_viib_intent_classified_titles_updated_at();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vibe_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaming_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_title_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emotion_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_context_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_shared_with ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "Allow insert during registration" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public phone lookup" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public email lookup" ON public.users FOR SELECT USING (true);
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (has_role(get_user_id_from_auth(), 'admin'::app_role));
CREATE POLICY "Admins can update any user" ON public.users FOR UPDATE USING (has_role(get_user_id_from_auth(), 'admin'::app_role));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = get_user_id_from_auth());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(get_user_id_from_auth(), 'admin'::app_role));

-- User preferences policies
CREATE POLICY "Users can manage own vibe preferences" ON public.user_vibe_preferences FOR ALL USING (user_id = get_user_id_from_auth());
CREATE POLICY "Users can manage own streaming subscriptions" ON public.user_streaming_subscriptions FOR ALL USING (user_id = get_user_id_from_auth());
CREATE POLICY "Users can manage own language preferences" ON public.user_language_preferences FOR ALL USING (user_id = get_user_id_from_auth());

-- User interactions policies
CREATE POLICY "Users can manage own interactions" ON public.user_title_interactions FOR ALL USING (user_id = get_user_id_from_auth());
CREATE POLICY "Users can manage own emotion states" ON public.user_emotion_states FOR ALL USING (user_id = get_user_id_from_auth());
CREATE POLICY "Users can manage own context logs" ON public.user_context_logs FOR ALL USING (user_id = get_user_id_from_auth());

-- Social recommendations policies
CREATE POLICY "Users can send recommendations" ON public.user_social_recommendations FOR INSERT WITH CHECK (sender_user_id = get_user_id_from_auth());
CREATE POLICY "Users can view received recommendations" ON public.user_social_recommendations FOR SELECT USING (receiver_user_id = get_user_id_from_auth() OR sender_user_id = get_user_id_from_auth());

-- Friend connections policies
CREATE POLICY "Users can manage own friend connections" ON public.friend_connections FOR ALL USING (user_id = get_user_id_from_auth());
CREATE POLICY "Users can view connections where they are the friend" ON public.friend_connections FOR SELECT USING (friend_user_id = get_user_id_from_auth());

-- Vibe lists policies
CREATE POLICY "Users can manage own lists" ON public.vibe_lists FOR ALL USING (user_id = get_user_id_from_auth());
CREATE POLICY "Users can view public lists" ON public.vibe_lists FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view shared lists" ON public.vibe_lists FOR SELECT USING (
    EXISTS (SELECT 1 FROM vibe_list_shared_with WHERE vibe_list_id = id AND shared_with_user_id = get_user_id_from_auth())
);

-- Vibe list items policies
CREATE POLICY "List owners can manage items" ON public.vibe_list_items FOR ALL USING (check_list_ownership(vibe_list_id, get_user_id_from_auth()));
CREATE POLICY "Users can view items of accessible lists" ON public.vibe_list_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM vibe_lists WHERE id = vibe_list_id AND (is_public = true OR user_id = get_user_id_from_auth()))
);

-- Vibe list followers policies
CREATE POLICY "Users can follow/unfollow lists" ON public.vibe_list_followers FOR ALL USING (follower_user_id = get_user_id_from_auth());
CREATE POLICY "List owners can view followers" ON public.vibe_list_followers FOR SELECT USING (check_list_ownership(vibe_list_id, get_user_id_from_auth()));

-- Vibe list shared_with policies
CREATE POLICY "List owners can manage sharing" ON public.vibe_list_shared_with FOR ALL USING (check_list_ownership(vibe_list_id, get_user_id_from_auth()));
CREATE POLICY "Users can view lists shared with them" ON public.vibe_list_shared_with FOR SELECT USING (shared_with_user_id = get_user_id_from_auth());

-- Vibe list views policies
CREATE POLICY "Users can log views" ON public.vibe_list_views FOR INSERT WITH CHECK (viewer_user_id = get_user_id_from_auth());
CREATE POLICY "List owners can view stats" ON public.vibe_list_views FOR SELECT USING (check_list_ownership(vibe_list_id, get_user_id_from_auth()));

-- Recommendation outcomes policies
CREATE POLICY "Users can manage own recommendation outcomes" ON public.recommendation_outcomes FOR ALL USING (user_id = get_user_id_from_auth());

-- Recommendation notifications policies
CREATE POLICY "Users can view own notifications" ON public.recommendation_notifications FOR SELECT USING (receiver_user_id = get_user_id_from_auth());
CREATE POLICY "Users can create notifications" ON public.recommendation_notifications FOR INSERT WITH CHECK (sender_user_id = get_user_id_from_auth());
CREATE POLICY "Users can update own notifications" ON public.recommendation_notifications FOR UPDATE USING (receiver_user_id = get_user_id_from_auth());

-- Feedback policies
CREATE POLICY "Users can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (user_id = get_user_id_from_auth());
CREATE POLICY "Admins can manage all feedback" ON public.feedback FOR ALL USING (has_role(get_user_id_from_auth(), 'admin'::app_role));

-- Session tokens policies
CREATE POLICY "Users can manage own sessions" ON public.session_tokens FOR ALL USING (user_id = get_user_id_from_auth());

-- System logs policies
CREATE POLICY "Admins can view system logs" ON public.system_logs FOR SELECT USING (has_role(get_user_id_from_auth(), 'admin'::app_role));
CREATE POLICY "Admins can manage system logs" ON public.system_logs FOR ALL USING (has_role(get_user_id_from_auth(), 'admin'::app_role));
CREATE POLICY "Allow system log inserts" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Personality profiles policies
CREATE POLICY "Users can manage own personality profile" ON public.personality_profiles FOR ALL USING (user_id = get_user_id_from_auth());

-- Public read access for reference tables
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spoken_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.titles FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.streaming_services FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.spoken_languages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.emotion_master FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.vibes FOR SELECT USING (true);

-- ============================================================================
-- END OF SCHEMA DUMP
-- ============================================================================
