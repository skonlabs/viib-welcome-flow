-- ============================================================================
-- ViiB Complete Database Schema Dump
-- Generated: 2024-12-30
-- This is a complete, executable SQL script to recreate the entire database
-- Run this script on a fresh PostgreSQL database to create a clone
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS (if needed)
-- ============================================================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

DROP TYPE IF EXISTS public.content_type CASCADE;
CREATE TYPE public.content_type AS ENUM ('movie', 'series', 'documentary', 'short', 'other');

DROP TYPE IF EXISTS public.device_type CASCADE;
CREATE TYPE public.device_type AS ENUM ('mobile', 'tv', 'tablet', 'web', 'other');

DROP TYPE IF EXISTS public.discovery_source CASCADE;
CREATE TYPE public.discovery_source AS ENUM ('recommendation', 'search', 'friend', 'trending', 'external_link', 'notification', 'other');

DROP TYPE IF EXISTS public.emotion_category CASCADE;
CREATE TYPE public.emotion_category AS ENUM ('user_state', 'content_state', 'content_tone');

DROP TYPE IF EXISTS public.engagement_action CASCADE;
CREATE TYPE public.engagement_action AS ENUM ('click', 'preview', 'watch_start', 'watch_complete', 'abandon');

DROP TYPE IF EXISTS public.environment_tag CASCADE;
CREATE TYPE public.environment_tag AS ENUM ('alone', 'family', 'friends', 'commute', 'work', 'public', 'other');

DROP TYPE IF EXISTS public.feedback_type CASCADE;
CREATE TYPE public.feedback_type AS ENUM ('bug', 'suggestion', 'emotional_response', 'feature_request', 'other');

DROP TYPE IF EXISTS public.interaction_type CASCADE;
CREATE TYPE public.interaction_type AS ENUM ('started', 'completed', 'liked', 'disliked', 'browsed', 'wishlisted', 'ignored');

DROP TYPE IF EXISTS public.model_type CASCADE;
CREATE TYPE public.model_type AS ENUM ('collaborative', 'content_based', 'hybrid', 'deep_learning', 'reinforcement', 'other');

DROP TYPE IF EXISTS public.network_type CASCADE;
CREATE TYPE public.network_type AS ENUM ('wifi', 'cellular', 'offline', 'unknown');

DROP TYPE IF EXISTS public.notification_type CASCADE;
CREATE TYPE public.notification_type AS ENUM ('recommendation', 'friend_activity', 'system', 'reminder');

DROP TYPE IF EXISTS public.provider_type_enum CASCADE;
CREATE TYPE public.provider_type_enum AS ENUM ('buy', 'rent', 'stream', 'free');

DROP TYPE IF EXISTS public.rating_value CASCADE;
CREATE TYPE public.rating_value AS ENUM ('love_it', 'like_it', 'ok', 'dislike_it', 'not_rated');

DROP TYPE IF EXISTS public.relationship_type CASCADE;
CREATE TYPE public.relationship_type AS ENUM ('friend', 'family', 'partner', 'colleague', 'acquaintance', 'other');

DROP TYPE IF EXISTS public.signup_method CASCADE;
CREATE TYPE public.signup_method AS ENUM ('email', 'phone', 'google', 'apple', 'github', 'linkedin', 'other');

DROP TYPE IF EXISTS public.time_of_day CASCADE;
CREATE TYPE public.time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night', 'late_night');

DROP TYPE IF EXISTS public.title_type_enum CASCADE;
CREATE TYPE public.title_type_enum AS ENUM ('movie', 'tv');

DROP TYPE IF EXISTS public.transformation_type CASCADE;
CREATE TYPE public.transformation_type AS ENUM ('soothe', 'stabilize', 'validate', 'amplify', 'complementary', 'reinforcing', 'neutral_balancing');

DROP TYPE IF EXISTS public.viib_intent_type CASCADE;
CREATE TYPE public.viib_intent_type AS ENUM ('adrenaline_rush', 'background_passive', 'comfort_escape', 'deep_thought', 'discovery', 'emotional_release', 'family_bonding', 'light_entertainment');

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- Table: activation_codes
CREATE TABLE public.activation_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL,
    is_used boolean NOT NULL DEFAULT false,
    used_by uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone,
    max_uses integer DEFAULT 1,
    current_uses integer NOT NULL DEFAULT 0,
    notes text,
    CONSTRAINT activation_codes_pkey PRIMARY KEY (id),
    CONSTRAINT activation_codes_code_key UNIQUE (code)
);

-- Table: app_settings
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

-- Table: email_config
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

-- Table: email_templates
CREATE TABLE public.email_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    template_type text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_templates_pkey PRIMARY KEY (id),
    CONSTRAINT email_templates_name_key UNIQUE (name)
);

-- Table: email_verifications
CREATE TABLE public.email_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);

-- Table: emotion_master
CREATE TABLE public.emotion_master (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_label text NOT NULL,
    category text NOT NULL,
    valence real,
    arousal real,
    dominance real,
    description text,
    intensity_multiplier real DEFAULT 1.0,
    created_at timestamp without time zone,
    CONSTRAINT emotion_master_pkey PRIMARY KEY (id),
    CONSTRAINT uq_emotion_label_category UNIQUE (emotion_label, category)
);

-- Table: emotion_display_phrases
CREATE TABLE public.emotion_display_phrases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    display_phrase text NOT NULL,
    min_intensity real NOT NULL,
    max_intensity real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_display_phrases_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_display_phrases_emotion_phrase_unique UNIQUE (emotion_id, display_phrase),
    CONSTRAINT uq_emotion_display_range UNIQUE (emotion_id, min_intensity, max_intensity)
);

-- Table: emotion_to_intent_map
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    intent_type text NOT NULL,
    weight real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_to_intent_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_to_intent_unique UNIQUE (emotion_id, intent_type)
);

-- Table: emotion_transformation_map
CREATE TABLE public.emotion_transformation_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_emotion_id uuid NOT NULL,
    content_emotion_id uuid NOT NULL,
    transformation_type text NOT NULL,
    confidence_score real NOT NULL,
    priority_rank smallint,
    CONSTRAINT emotion_transformation_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_transformation_map_user_content_unique UNIQUE (user_emotion_id, content_emotion_id)
);

-- Table: enabled_countries
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

-- Table: genres
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    genre_name text NOT NULL,
    tmdb_genre_id integer,
    CONSTRAINT genres_pkey PRIMARY KEY (id)
);

-- Table: keywords
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tmdb_keyword_id integer,
    CONSTRAINT keywords_pkey PRIMARY KEY (id)
);

-- Table: spoken_languages
CREATE TABLE public.spoken_languages (
    iso_639_1 character varying NOT NULL,
    language_name text NOT NULL,
    flag_emoji text,
    CONSTRAINT spoken_languages_pkey PRIMARY KEY (iso_639_1)
);

-- Table: streaming_services
CREATE TABLE public.streaming_services (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_name text NOT NULL,
    logo_url text,
    website_url text,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT streaming_services_pkey PRIMARY KEY (id)
);

-- Table: titles
CREATE TABLE public.titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    original_name text,
    title_type text,
    tmdb_id integer,
    imdb_id text,
    overview text,
    poster_path text,
    backdrop_path text,
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean DEFAULT true,
    runtime integer,
    release_date date,
    first_air_date date,
    last_air_date date,
    status text,
    original_language text,
    popularity double precision,
    vote_average double precision,
    is_adult boolean DEFAULT false,
    certification text,
    title_genres json,
    episode_run_time integer[],
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    classification_status text DEFAULT 'pending'::text,
    last_classified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT titles_pkey PRIMARY KEY (id),
    CONSTRAINT titles_tmdb_type_unique UNIQUE (tmdb_id, title_type)
);

-- Table: title_genres
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id)
);

-- Table: title_streaming_availability
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    region_code text NOT NULL,
    CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- Table: seasons
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
    CONSTRAINT seasons_pkey PRIMARY KEY (id)
);

-- Table: episodes
CREATE TABLE public.episodes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL,
    episode_number integer NOT NULL,
    name text,
    overview text,
    still_path text,
    air_date date,
    runtime integer,
    vote_average double precision,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT episodes_pkey PRIMARY KEY (id),
    CONSTRAINT idx_episodes_unique UNIQUE (season_id, episode_number)
);

-- Table: users
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_id uuid,
    email text,
    phone_number text,
    full_name text,
    username text,
    avatar_url text,
    is_active boolean DEFAULT true,
    is_onboarding_complete boolean DEFAULT false,
    last_login_at timestamp with time zone,
    signup_method text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_auth_id_key UNIQUE (auth_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_phone_number_key UNIQUE (phone_number),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- Table: user_roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);

-- Table: phone_verifications
CREATE TABLE public.phone_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    is_locked boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT phone_verifications_pkey PRIMARY KEY (id)
);

-- Table: session_tokens
CREATE TABLE public.session_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    is_remember_me boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    issued_at timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at timestamp with time zone,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_tokens_pkey PRIMARY KEY (id)
);

-- Table: login_attempts
CREATE TABLE public.login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    ip_address text,
    attempt_type text NOT NULL DEFAULT 'password'::text,
    success boolean DEFAULT false,
    requires_captcha boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- Table: user_emotion_states
CREATE TABLE public.user_emotion_states (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity real NOT NULL DEFAULT 0.1,
    valence real,
    arousal real,
    dominance real,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_emotion_states_pkey PRIMARY KEY (id)
);

-- Table: user_vibe_preferences
CREATE TABLE public.user_vibe_preferences (
    user_id uuid NOT NULL,
    vibe_type text,
    canonical_key text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_vibe_preferences_pkey PRIMARY KEY (user_id)
);

-- Table: user_language_preferences
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL,
    language_code text NOT NULL,
    priority_order integer,
    CONSTRAINT user_language_preferences_pkey PRIMARY KEY (user_id, language_code)
);

-- Table: user_streaming_subscriptions
CREATE TABLE public.user_streaming_subscriptions (
    user_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT user_streaming_subscriptions_pkey PRIMARY KEY (user_id, streaming_service_id)
);

-- Table: user_title_interactions
CREATE TABLE public.user_title_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value DEFAULT 'not_rated'::public.rating_value,
    watch_duration_percentage real,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_interactions_pkey PRIMARY KEY (id)
);

-- Table: user_context_logs
CREATE TABLE public.user_context_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    device_type text,
    time_of_day_bucket text,
    location_type text,
    session_length_seconds integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_context_logs_pkey PRIMARY KEY (id)
);

-- Table: personality_profiles
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
    CONSTRAINT personality_profiles_pkey PRIMARY KEY (id)
);

-- Table: friend_connections
CREATE TABLE public.friend_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    friend_user_id uuid NOT NULL,
    relationship_type text,
    trust_score real NOT NULL DEFAULT 0.5,
    is_blocked boolean DEFAULT false,
    is_muted boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT friend_connections_pkey PRIMARY KEY (id),
    CONSTRAINT friend_connections_user_friend_unique UNIQUE (user_id, friend_user_id)
);

-- Table: user_social_recommendations
CREATE TABLE public.user_social_recommendations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_user_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_social_recommendations_pkey PRIMARY KEY (id)
);

-- Table: recommendation_notifications
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

-- Table: recommendation_outcomes
CREATE TABLE public.recommendation_outcomes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    was_selected boolean NOT NULL,
    watch_duration_percentage real,
    rating_value public.rating_value,
    recommended_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT recommendation_outcomes_pkey PRIMARY KEY (id)
);

-- Table: viib_emotion_classified_titles
CREATE TABLE public.viib_emotion_classified_titles (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_pkey PRIMARY KEY (title_id, emotion_id)
);

-- Table: viib_emotion_classified_titles_staging
CREATE TABLE public.viib_emotion_classified_titles_staging (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_staging_pkey PRIMARY KEY (title_id, emotion_id)
);

-- Table: viib_intent_classified_titles
CREATE TABLE public.viib_intent_classified_titles (
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_pkey PRIMARY KEY (title_id, intent_type)
);

-- Table: viib_intent_classified_titles_staging
CREATE TABLE public.viib_intent_classified_titles_staging (
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_staging_pkey PRIMARY KEY (title_id, intent_type)
);

-- Table: viib_title_intent_stats
CREATE TABLE public.viib_title_intent_stats (
    title_id uuid NOT NULL,
    primary_intent_type text,
    primary_confidence_score real,
    intent_count integer,
    last_computed_at timestamp with time zone,
    CONSTRAINT viib_title_intent_stats_pkey PRIMARY KEY (title_id)
);

-- Table: title_emotion_vectors
CREATE TABLE public.title_emotion_vectors (
    title_id uuid NOT NULL,
    valence real NOT NULL,
    arousal real NOT NULL,
    dominance real NOT NULL,
    emotion_strength real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_emotion_vectors_pkey PRIMARY KEY (title_id)
);

-- Table: title_transformation_scores
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_transformation_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- Table: title_intent_alignment_scores
CREATE TABLE public.title_intent_alignment_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    alignment_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_intent_alignment_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- Table: title_social_summary
CREATE TABLE public.title_social_summary (
    title_id uuid NOT NULL,
    social_mean_rating real,
    social_rec_power real,
    avg_rating real,
    rating_count integer,
    recommendation_count integer,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_social_summary_pkey PRIMARY KEY (title_id)
);

-- Table: title_user_emotion_match_cache
CREATE TABLE public.title_user_emotion_match_cache (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    cosine_score real NOT NULL,
    transformation_score real,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT title_user_emotion_match_cache_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- Table: user_title_social_scores
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    social_component_score real,
    social_priority_score real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_title_social_scores_pkey PRIMARY KEY (user_id, title_id)
);

-- Table: viib_weight_config
CREATE TABLE public.viib_weight_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotional_weight real NOT NULL,
    social_weight real NOT NULL,
    historical_weight real NOT NULL,
    context_weight real NOT NULL,
    novelty_weight real NOT NULL,
    is_active boolean NOT NULL DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_weight_config_pkey PRIMARY KEY (id)
);

-- Table: vibe_lists
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    cover_image_url text,
    visibility text NOT NULL DEFAULT 'private'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_lists_pkey PRIMARY KEY (id)
);

-- Table: vibe_list_items
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    title_id uuid NOT NULL,
    position integer,
    added_at timestamp with time zone DEFAULT now(),
    notes text,
    CONSTRAINT vibe_list_items_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_items_unique UNIQUE (vibe_list_id, title_id)
);

-- Table: vibe_list_followers
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_list_followers_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_followers_unique UNIQUE (vibe_list_id, follower_user_id)
);

-- Table: vibe_list_shared_with
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    can_edit boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_list_shared_with_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_shared_with_unique UNIQUE (vibe_list_id, shared_with_user_id)
);

-- Table: vibe_list_views
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    viewer_user_id uuid,
    viewed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_list_views_pkey PRIMARY KEY (id)
);

-- Table: vibes
CREATE TABLE public.vibes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    canonical_key text,
    icon_url text,
    color_hex text,
    is_active boolean DEFAULT true,
    display_order integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibes_pkey PRIMARY KEY (id)
);

-- Table: vibe_emotion_weights
CREATE TABLE public.vibe_emotion_weights (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    weight real NOT NULL DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_emotion_weights_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_emotion_weights_unique UNIQUE (vibe_id, emotion_id)
);

-- Table: vibe_genre_weights
CREATE TABLE public.vibe_genre_weights (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_genre_weights_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_genre_weights_unique UNIQUE (vibe_id, genre_id)
);

-- Table: vibe_genre_weights_key
CREATE TABLE public.vibe_genre_weights_key (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    canonical_key text NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vibe_genre_weights_key_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_genre_weights_key_unique UNIQUE (canonical_key, genre_id)
);

-- Table: visual_taste_options
CREATE TABLE public.visual_taste_options (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    category text NOT NULL,
    label text NOT NULL,
    image_url text NOT NULL,
    associated_genres text[],
    associated_emotions text[],
    is_active boolean DEFAULT true,
    display_order integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT visual_taste_options_pkey PRIMARY KEY (id)
);

-- Table: feedback
CREATE TABLE public.feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT feedback_pkey PRIMARY KEY (id)
);

-- Table: system_logs
CREATE TABLE public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    screen text,
    operation text,
    error_message text NOT NULL,
    error_stack text,
    context jsonb,
    severity text NOT NULL DEFAULT 'error'::text,
    http_status integer,
    notes text,
    resolved boolean NOT NULL DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- Table: jobs
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_name text NOT NULL,
    job_type text NOT NULL,
    status text NOT NULL DEFAULT 'idle'::text,
    is_active boolean NOT NULL DEFAULT true,
    configuration jsonb DEFAULT '{}'::jsonb,
    total_titles_processed integer DEFAULT 0,
    last_run_at timestamp with time zone,
    last_run_duration_seconds integer,
    next_run_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT jobs_pkey PRIMARY KEY (id)
);

-- Table: rate_limit_config
CREATE TABLE public.rate_limit_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    endpoint text NOT NULL,
    max_requests integer NOT NULL,
    window_seconds integer NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rate_limit_config_pkey PRIMARY KEY (id)
);

-- Table: rate_limit_entries
CREATE TABLE public.rate_limit_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL,
    count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT rate_limit_entries_pkey PRIMARY KEY (id),
    CONSTRAINT rate_limit_entries_key_key UNIQUE (key)
);

-- Table: ip_rate_limits
CREATE TABLE public.ip_rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ip_rate_limits_pkey PRIMARY KEY (id),
    CONSTRAINT ip_rate_limits_ip_endpoint_unique UNIQUE (ip_address, endpoint)
);

-- Table: tmdb_genre_mappings
CREATE TABLE public.tmdb_genre_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_genre_id integer NOT NULL,
    genre_name text NOT NULL,
    media_type text NOT NULL DEFAULT 'both'::text,
    is_active boolean NOT NULL DEFAULT true,
    tv_equivalent_id integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_genre_mappings_pkey PRIMARY KEY (id)
);

-- Table: tmdb_provider_mappings
CREATE TABLE public.tmdb_provider_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_provider_id integer NOT NULL,
    service_name text NOT NULL,
    region_code text NOT NULL DEFAULT 'US'::text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_provider_mappings_pkey PRIMARY KEY (id)
);

-- Table: official_trailer_channels
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

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- Activation codes indexes
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_created_at ON public.activation_codes USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON public.activation_codes USING btree (is_used);

-- App settings indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings USING btree (setting_key);

-- Email config indexes
CREATE INDEX IF NOT EXISTS idx_email_config_active ON public.email_config USING btree (is_active);

-- Email templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates USING btree (template_type);

-- Email verifications indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications USING btree (email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON public.email_verifications USING btree (expires_at);

-- Emotion to intent map indexes
CREATE INDEX IF NOT EXISTS idx_e2i_intent_type ON public.emotion_to_intent_map USING btree (intent_type);

-- Episodes indexes
CREATE INDEX IF NOT EXISTS idx_episodes_season ON public.episodes USING btree (season_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback USING btree (type);

-- Friend connections indexes
CREATE INDEX IF NOT EXISTS idx_fc_friend_user_id ON public.friend_connections USING btree (friend_user_id);
CREATE INDEX IF NOT EXISTS idx_fc_relationship_type ON public.friend_connections USING btree (relationship_type);
CREATE INDEX IF NOT EXISTS idx_fc_user_id ON public.friend_connections USING btree (user_id);

-- Genres indexes
CREATE INDEX IF NOT EXISTS idx_genres_name ON public.genres USING btree (genre_name);
CREATE INDEX IF NOT EXISTS idx_genres_tmdb_id ON public.genres USING btree (tmdb_genre_id);

-- IP rate limits indexes
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_ip_endpoint ON public.ip_rate_limits USING btree (ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_window ON public.ip_rate_limits USING btree (window_start);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs USING btree (job_type);

-- Keywords indexes
CREATE INDEX IF NOT EXISTS idx_keywords_name ON public.keywords USING btree (name);
CREATE INDEX IF NOT EXISTS idx_keywords_tmdb_id ON public.keywords USING btree (tmdb_keyword_id);

-- Login attempts indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON public.login_attempts USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON public.login_attempts USING btree (identifier);

-- Official trailer channels indexes
CREATE INDEX IF NOT EXISTS idx_otc_active ON public.official_trailer_channels USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_otc_language ON public.official_trailer_channels USING btree (language_code);

-- Phone verifications indexes
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON public.phone_verifications USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications USING btree (phone_number);

-- Recommendation notifications indexes
CREATE INDEX IF NOT EXISTS idx_rec_notifications_receiver ON public.recommendation_notifications USING btree (receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_rec_notifications_unread ON public.recommendation_notifications USING btree (receiver_user_id, is_read) WHERE (is_read = false);

-- Recommendation outcomes indexes
CREATE INDEX IF NOT EXISTS idx_rec_outcomes_created ON public.recommendation_outcomes USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_rec_outcomes_user ON public.recommendation_outcomes USING btree (user_id);

-- Seasons indexes
CREATE INDEX IF NOT EXISTS idx_seasons_title ON public.seasons USING btree (title_id);

-- Session tokens indexes
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires ON public.session_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_hash ON public.session_tokens USING btree (token_hash);
CREATE INDEX IF NOT EXISTS idx_session_tokens_user ON public.session_tokens USING btree (user_id);

-- Streaming services indexes
CREATE INDEX IF NOT EXISTS idx_streaming_services_active ON public.streaming_services USING btree (is_active);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved ON public.system_logs USING btree (resolved);
CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON public.system_logs USING btree (severity);

-- Title emotion vectors indexes
CREATE INDEX IF NOT EXISTS idx_title_emotion_vectors_updated ON public.title_emotion_vectors USING btree (updated_at);

-- Title genres indexes
CREATE INDEX IF NOT EXISTS idx_title_genres_genre ON public.title_genres USING btree (genre_id);
CREATE INDEX IF NOT EXISTS idx_title_genres_title ON public.title_genres USING btree (title_id);

-- Title intent alignment scores indexes
CREATE INDEX IF NOT EXISTS idx_tias_emotion ON public.title_intent_alignment_scores USING btree (user_emotion_id);
CREATE INDEX IF NOT EXISTS idx_tias_title ON public.title_intent_alignment_scores USING btree (title_id);

-- Title social summary indexes
CREATE INDEX IF NOT EXISTS idx_tss_rec_power ON public.title_social_summary USING btree (social_rec_power DESC);

-- Title streaming availability indexes
CREATE INDEX IF NOT EXISTS idx_tsa_region ON public.title_streaming_availability USING btree (region_code);
CREATE INDEX IF NOT EXISTS idx_tsa_service ON public.title_streaming_availability USING btree (streaming_service_id);
CREATE INDEX IF NOT EXISTS idx_tsa_title ON public.title_streaming_availability USING btree (title_id);

-- Title transformation scores indexes
CREATE INDEX IF NOT EXISTS idx_tts_emotion ON public.title_transformation_scores USING btree (user_emotion_id);
CREATE INDEX IF NOT EXISTS idx_tts_title ON public.title_transformation_scores USING btree (title_id);

-- Title user emotion match cache indexes
CREATE INDEX IF NOT EXISTS idx_tuemc_emotion ON public.title_user_emotion_match_cache USING btree (user_emotion_id);

-- Titles indexes
CREATE INDEX IF NOT EXISTS idx_titles_classification ON public.titles USING btree (classification_status);
CREATE INDEX IF NOT EXISTS idx_titles_language ON public.titles USING btree (original_language);
CREATE INDEX IF NOT EXISTS idx_titles_popularity ON public.titles USING btree (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_titles_tmdb ON public.titles USING btree (tmdb_id);
CREATE INDEX IF NOT EXISTS idx_titles_type ON public.titles USING btree (title_type);

-- TMDB genre mappings indexes
CREATE INDEX IF NOT EXISTS idx_tmdb_genre_mappings_active ON public.tmdb_genre_mappings USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_tmdb_genre_mappings_id ON public.tmdb_genre_mappings USING btree (tmdb_genre_id);

-- TMDB provider mappings indexes
CREATE INDEX IF NOT EXISTS idx_tmdb_provider_mappings_active ON public.tmdb_provider_mappings USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_tmdb_provider_mappings_id ON public.tmdb_provider_mappings USING btree (tmdb_provider_id);

-- User context logs indexes
CREATE INDEX IF NOT EXISTS idx_ucl_created ON public.user_context_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_ucl_user ON public.user_context_logs USING btree (user_id);

-- User emotion states indexes
CREATE INDEX IF NOT EXISTS idx_ues_created ON public.user_emotion_states USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ues_emotion ON public.user_emotion_states USING btree (emotion_id);
CREATE INDEX IF NOT EXISTS idx_ues_user ON public.user_emotion_states USING btree (user_id);

-- User language preferences indexes
CREATE INDEX IF NOT EXISTS idx_ulp_user ON public.user_language_preferences USING btree (user_id);

-- User social recommendations indexes
CREATE INDEX IF NOT EXISTS idx_usr_receiver ON public.user_social_recommendations USING btree (receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_usr_sender ON public.user_social_recommendations USING btree (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_usr_title ON public.user_social_recommendations USING btree (title_id);

-- User streaming subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_uss_service ON public.user_streaming_subscriptions USING btree (streaming_service_id);
CREATE INDEX IF NOT EXISTS idx_uss_user ON public.user_streaming_subscriptions USING btree (user_id);

-- User title interactions indexes
CREATE INDEX IF NOT EXISTS idx_uti_created ON public.user_title_interactions USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_uti_rating ON public.user_title_interactions USING btree (rating_value);
CREATE INDEX IF NOT EXISTS idx_uti_title ON public.user_title_interactions USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_uti_type ON public.user_title_interactions USING btree (interaction_type);
CREATE INDEX IF NOT EXISTS idx_uti_user ON public.user_title_interactions USING btree (user_id);

-- User title social scores indexes
CREATE INDEX IF NOT EXISTS idx_utss_title ON public.user_title_social_scores USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_utss_user ON public.user_title_social_scores USING btree (user_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_auth ON public.users USING btree (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users USING btree (phone_number);

-- Vibe list items indexes
CREATE INDEX IF NOT EXISTS idx_vli_list ON public.vibe_list_items USING btree (vibe_list_id);
CREATE INDEX IF NOT EXISTS idx_vli_title ON public.vibe_list_items USING btree (title_id);

-- Vibe lists indexes
CREATE INDEX IF NOT EXISTS idx_vl_user ON public.vibe_lists USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_vl_visibility ON public.vibe_lists USING btree (visibility);

-- Vibes indexes
CREATE INDEX IF NOT EXISTS idx_vibes_active ON public.vibes USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_vibes_key ON public.vibes USING btree (canonical_key);

-- VIIB classified titles indexes
CREATE INDEX IF NOT EXISTS idx_vect_emotion ON public.viib_emotion_classified_titles USING btree (emotion_id);
CREATE INDEX IF NOT EXISTS idx_vect_title ON public.viib_emotion_classified_titles USING btree (title_id);
CREATE INDEX IF NOT EXISTS idx_vict_intent ON public.viib_intent_classified_titles USING btree (intent_type);
CREATE INDEX IF NOT EXISTS idx_vict_title ON public.viib_intent_classified_titles USING btree (title_id);

-- VIIB weight config indexes
CREATE INDEX IF NOT EXISTS idx_vwc_active ON public.viib_weight_config USING btree (is_active);

-- ============================================================================
-- 5. VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.viib_recommendation_debug AS
 SELECT NULL::uuid AS user_id,
    NULL::uuid AS title_id,
    NULL::real AS base_viib_score,
    NULL::real AS social_priority_score,
    NULL::real AS final_score
  WHERE false;

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Function: get_user_id_from_auth
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
    RETURN v_user_id;
END;
$function$;

-- Function: calculate_emotion_distance_score
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

-- Function: calculate_taste_similarity
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid)
RETURNS real
LANGUAGE sql
STABLE
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
    (SELECT COUNT(*)::real FROM both_positive) /
    NULLIF((SELECT COUNT(*)::real FROM common_titles), 0.0),
    0.0
);
$function$;

-- Function: calculate_user_emotion_intensity
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

-- Function: get_app_setting
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_value text;
BEGIN
  SELECT setting_value::text INTO v_value FROM app_settings WHERE setting_key = p_key LIMIT 1;
  RETURN COALESCE(v_value, p_default);
END;
$function$;

-- Function: check_list_ownership
CREATE OR REPLACE FUNCTION public.check_list_ownership(p_list_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (SELECT 1 FROM vibe_lists WHERE id = p_list_id AND user_id = p_user_id);
END;
$function$;

-- Function: invalidate_old_otps
CREATE OR REPLACE FUNCTION public.invalidate_old_otps(p_email text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE email_verifications SET verified = true
    WHERE email = p_email AND verified = false AND expires_at > NOW();
END;
$function$;

-- Function: invalidate_old_phone_otps
CREATE OR REPLACE FUNCTION public.invalidate_old_phone_otps(p_phone text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE phone_verifications SET verified = true
    WHERE phone_number = p_phone AND verified = false AND expires_at > NOW();
END;
$function$;

-- Function: hash_otp
CREATE OR REPLACE FUNCTION public.hash_otp(p_otp text, p_salt text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    v_salt TEXT;
    v_combined TEXT;
BEGIN
    v_salt := COALESCE(p_salt, 'viib_otp_salt_');
    v_combined := v_salt || p_otp;
    RETURN encode(sha256(v_combined::bytea), 'hex');
END;
$function$;

-- Function: link_auth_user_to_profile
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN UPDATE users SET auth_id = p_auth_id WHERE id = p_user_id; END;
$function$;

-- Function: get_titles_by_ids
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

-- Function: get_vibe_list_stats
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

-- Function: get_active_viib_weights
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

-- Function: get_display_emotion_phrase
CREATE OR REPLACE FUNCTION public.get_display_emotion_phrase(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_emotion_id UUID;
    v_intensity REAL;
    v_phrase TEXT;
BEGIN
    SELECT emotion_id, intensity INTO v_emotion_id, v_intensity
    FROM user_emotion_states WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1;
    IF v_emotion_id IS NULL THEN RETURN 'Emotionally Neutral'; END IF;
    SELECT display_phrase INTO v_phrase FROM emotion_display_phrases
    WHERE emotion_id = v_emotion_id AND v_intensity >= min_intensity AND v_intensity < max_intensity LIMIT 1;
    RETURN COALESCE(v_phrase, 'Emotionally Balanced');
END;
$function$;

-- Function: get_result_emotion_label
CREATE OR REPLACE FUNCTION public.get_result_emotion_label(p_emotion_label text, p_intensity real)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_prefix TEXT;
BEGIN
    v_prefix := CASE
        WHEN p_intensity < 0.25 THEN 'Slightly'
        WHEN p_intensity < 0.45 THEN 'Mildly'
        WHEN p_intensity < 0.65 THEN 'Moderately'
        WHEN p_intensity < 0.85 THEN 'Deeply'
        ELSE 'Overwhelmingly'
    END;
    RETURN v_prefix || ' ' || INITCAP(p_emotion_label);
END;
$function$;

-- Function: store_user_emotion_vector
CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(p_user_id uuid, p_emotion_label text, p_energy_percentage real, p_raw_valence real DEFAULT NULL::real, p_raw_arousal real DEFAULT NULL::real)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_emotion_id UUID;
    v_intensity REAL;
    v_valence REAL;
    v_arousal REAL;
    v_dominance REAL;
BEGIN
    SELECT id, valence, arousal, dominance INTO v_emotion_id, v_valence, v_arousal, v_dominance
    FROM emotion_master WHERE emotion_label = p_emotion_label AND category = 'user_state';
    IF v_emotion_id IS NULL THEN RAISE EXCEPTION 'Invalid user_state emotion: %', p_emotion_label; END IF;
    v_intensity := calculate_user_emotion_intensity(v_emotion_id, p_energy_percentage);
    IF p_raw_valence IS NOT NULL THEN v_valence := (p_raw_valence + 1.0) / 2.0; END IF;
    IF p_raw_arousal IS NOT NULL THEN v_arousal := (p_raw_arousal + 1.0) / 2.0;
    ELSE v_arousal := v_arousal * v_intensity; END IF;
    INSERT INTO user_emotion_states (user_id, emotion_id, intensity, valence, arousal, dominance, created_at)
    VALUES (p_user_id, v_emotion_id, v_intensity, v_valence, v_arousal, v_dominance, now());
END;
$function$;

-- Function: translate_mood_to_emotion
CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real, p_raw_valence real DEFAULT NULL::real, p_raw_arousal real DEFAULT NULL::real)
RETURNS TABLE(emotion_id uuid, emotion_label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_emotion_label TEXT;
    v_found_emotion RECORD;
BEGIN
    SELECT em.id, em.emotion_label INTO v_found_emotion FROM emotion_master em
    WHERE LOWER(em.emotion_label) = LOWER(p_mood_text) AND em.category = 'user_state' LIMIT 1;
    IF v_found_emotion.emotion_label IS NOT NULL THEN
        v_emotion_label := v_found_emotion.emotion_label;
    ELSE
        v_emotion_label := CASE
            WHEN LOWER(p_mood_text) LIKE '%calm%' OR LOWER(p_mood_text) LIKE '%relaxed%' OR LOWER(p_mood_text) LIKE '%peaceful%' THEN 'calm'
            WHEN LOWER(p_mood_text) LIKE '%content%' THEN 'content'
            WHEN LOWER(p_mood_text) LIKE '%sad%' OR LOWER(p_mood_text) LIKE '%heavy%' THEN 'sad'
            WHEN LOWER(p_mood_text) LIKE '%tired%' THEN 'tired'
            WHEN LOWER(p_mood_text) LIKE '%melancholic%' THEN 'melancholic'
            WHEN LOWER(p_mood_text) LIKE '%anxious%' OR LOWER(p_mood_text) LIKE '%nervous%' OR LOWER(p_mood_text) LIKE '%tense%' THEN 'anxious'
            WHEN LOWER(p_mood_text) LIKE '%stressed%' OR LOWER(p_mood_text) LIKE '%overwhelmed%' THEN 'stressed'
            WHEN LOWER(p_mood_text) LIKE '%frustrated%' THEN 'frustrated'
            WHEN LOWER(p_mood_text) LIKE '%angry%' OR LOWER(p_mood_text) LIKE '%annoyed%' THEN 'angry'
            WHEN LOWER(p_mood_text) LIKE '%excited%' OR LOWER(p_mood_text) LIKE '%delighted%' THEN 'excited'
            WHEN LOWER(p_mood_text) LIKE '%happy%' OR LOWER(p_mood_text) LIKE '%cheerful%' THEN 'happy'
            WHEN LOWER(p_mood_text) LIKE '%bored%' THEN 'bored'
            WHEN LOWER(p_mood_text) LIKE '%lonely%' THEN 'lonely'
            WHEN LOWER(p_mood_text) LIKE '%hopeful%' THEN 'hopeful'
            WHEN LOWER(p_mood_text) LIKE '%curious%' THEN 'curious'
            WHEN LOWER(p_mood_text) LIKE '%adventurous%' THEN 'adventurous'
            WHEN LOWER(p_mood_text) LIKE '%inspired%' THEN 'inspired'
            WHEN LOWER(p_mood_text) LIKE '%romantic%' THEN 'romantic'
            WHEN LOWER(p_mood_text) LIKE '%nostalgic%' THEN 'nostalgic'
            ELSE 'calm'
        END;
    END IF;
    PERFORM store_user_emotion_vector(p_user_id, v_emotion_label, p_energy_percentage, p_raw_valence, p_raw_arousal);
    RETURN QUERY SELECT em.id, em.emotion_label FROM emotion_master em
    WHERE em.emotion_label = v_emotion_label AND em.category = 'user_state' LIMIT 1;
END;
$function$;

-- Function: viib_score_components
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
    FROM user_emotion_states ues WHERE ues.user_id = p_user_id ORDER BY created_at DESC LIMIT 1;

    IF v_user_emotion_id IS NOT NULL THEN
        SELECT COALESCE(AVG(em.valence * (vec.intensity_level / 10.0)), 0),
               COALESCE(AVG(em.arousal * (vec.intensity_level / 10.0)), 0),
               COALESCE(AVG(em.dominance * (vec.intensity_level / 10.0)), 0)
        INTO v_title_valence, v_title_arousal, v_title_dominance
        FROM viib_emotion_classified_titles vec JOIN emotion_master em ON em.id = vec.emotion_id WHERE vec.title_id = p_title_id;

        SELECT EXISTS (SELECT 1 FROM viib_emotion_classified_titles vec2 WHERE vec2.title_id = p_title_id) INTO v_has_emotion_data;

        IF v_has_emotion_data THEN
            v_user_norm := sqrt(power(v_user_valence,2) + power(v_user_arousal,2) + power(v_user_dominance,2));
            v_title_norm := sqrt(power(v_title_valence,2) + power(v_title_arousal,2) + power(v_title_dominance,2));

            IF v_user_norm > 0.001 AND v_title_norm > 0.001 THEN
                v_direct_cosine := (v_user_valence * v_title_valence + v_user_arousal * v_title_arousal + v_user_dominance * v_title_dominance) / (v_user_norm * v_title_norm);
                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            END IF;

            SELECT COALESCE(tts.transformation_score, 0.5) INTO v_transformation_score
            FROM title_transformation_scores tts WHERE tts.user_emotion_id = v_user_emotion_id AND tts.title_id = p_title_id;

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

-- Function: viib_score
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: viib_intent_alignment_score
CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: viib_score_with_intent
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE v_base real; v_intent real;
BEGIN
    v_base := viib_score(p_user_id, p_title_id);
    v_intent := viib_intent_alignment_score(p_user_id, p_title_id);
    RETURN v_base * v_intent;
END;
$function$;

-- Function: viib_social_priority_score
CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_emotion_id UUID;
    v_score REAL;
BEGIN
    SELECT ues.emotion_id INTO v_user_emotion_id FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id ORDER BY ues.created_at DESC LIMIT 1;

    SELECT COALESCE(MAX(social_priority), 0.0) INTO v_score
    FROM (
        SELECT
            CASE
                WHEN fc.trust_score >= 0.8 AND calculate_taste_similarity(p_user_id, fc.friend_user_id) >= 0.7
                     AND COALESCE(tts.transformation_score, 0.5) >= 0.7 THEN 1.0
                WHEN fc.trust_score >= 0.8 AND (calculate_taste_similarity(p_user_id, fc.friend_user_id) >= 0.6
                     OR COALESCE(tts.transformation_score, 0.5) >= 0.7) THEN 0.95
                WHEN fc.trust_score >= 0.5 AND COALESCE(tts.transformation_score, 0.5) >= 0.7 THEN 0.9
                WHEN fc.trust_score >= 0.5 OR calculate_taste_similarity(p_user_id, fc.friend_user_id) >= 0.6 THEN 0.85
                WHEN COALESCE(tts.transformation_score, 0.5) >= 0.6 THEN 0.7
                ELSE 0.5
            END AS social_priority
        FROM user_social_recommendations usr
        JOIN friend_connections fc ON fc.friend_user_id = usr.sender_user_id AND fc.user_id = usr.receiver_user_id
        LEFT JOIN title_transformation_scores tts ON tts.title_id = p_title_id AND tts.user_emotion_id = v_user_emotion_id
        WHERE usr.receiver_user_id = p_user_id AND usr.title_id = p_title_id
    ) scored;

    RETURN COALESCE(v_score, 0.0);
END;
$function$;

-- Function: log_recommendation_outcome
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

-- Function: refresh_title_emotion_vectors
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: refresh_title_transformation_scores
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

-- Function: refresh_title_intent_alignment_scores
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: refresh_title_social_summary
CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: refresh_viib_reco_materializations
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

-- Function: refresh_viib_title_intent_stats
CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO viib_title_intent_stats (title_id, primary_intent_type, primary_confidence_score, intent_count, last_computed_at)
  SELECT
    p_title_id,
    (SELECT intent_type FROM viib_intent_classified_titles WHERE title_id = p_title_id ORDER BY confidence_score DESC LIMIT 1),
    (SELECT confidence_score FROM viib_intent_classified_titles WHERE title_id = p_title_id ORDER BY confidence_score DESC LIMIT 1),
    (SELECT COUNT(*)::integer FROM viib_intent_classified_titles WHERE title_id = p_title_id),
    NOW()
  ON CONFLICT (title_id) DO UPDATE SET
    primary_intent_type = EXCLUDED.primary_intent_type,
    primary_confidence_score = EXCLUDED.primary_confidence_score,
    intent_count = EXCLUDED.intent_count,
    last_computed_at = EXCLUDED.last_computed_at;
$function$;

-- Function: promote_title_intents
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

-- Function: increment_job_titles
CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE jobs
  SET total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment, last_run_at = NOW()
  WHERE job_type = p_job_type;
END;
$function$;

-- Function: run_cron_job_now
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

-- Function: get_cron_job_progress
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

-- Function: get_cron_jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, database text, active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jobid, jobname, schedule, command, database, active
  FROM cron.job
  ORDER BY jobid;
$function$;

-- Function: toggle_cron_job
CREATE OR REPLACE FUNCTION public.toggle_cron_job(p_jobid bigint, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE cron.job SET active = p_active WHERE jobid = p_jobid;
END;
$function$;

-- Function: update_cron_schedule
CREATE OR REPLACE FUNCTION public.update_cron_schedule(p_jobid bigint, p_schedule text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE cron.job SET schedule = p_schedule WHERE jobid = p_jobid;
END;
$function$;

-- Trigger functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.viib_title_intent_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.cascade_refresh_emotion_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.title_emotion_vectors (title_id, valence, arousal, dominance, updated_at)
    SELECT
        COALESCE(NEW.title_id, OLD.title_id) AS title_id,
        COALESCE(AVG(em.valence * (vect.intensity_level / 10.0)), 0.5)::real AS valence,
        COALESCE(AVG(em.arousal * (vect.intensity_level / 10.0)), 0.5)::real AS arousal,
        COALESCE(AVG(em.dominance * (vect.intensity_level / 10.0)), 0.5)::real AS dominance,
        now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em ON em.id = vect.emotion_id
    WHERE vect.title_id = COALESCE(NEW.title_id, OLD.title_id)
    GROUP BY vect.title_id
    ON CONFLICT (title_id) DO UPDATE SET
        valence = EXCLUDED.valence, arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance, updated_at = now();

    INSERT INTO public.title_transformation_scores (title_id, user_emotion_id, transformation_score, updated_at)
    SELECT
        vect.title_id, etm.user_emotion_id,
        MAX(etm.confidence_score *
            CASE etm.transformation_type
                WHEN 'amplify' THEN 1.0 WHEN 'complementary' THEN 0.95 WHEN 'soothe' THEN 0.9
                WHEN 'validate' THEN 0.85 WHEN 'reinforcing' THEN 0.8 WHEN 'neutral_balancing' THEN 0.7
                WHEN 'stabilize' THEN 0.65 ELSE 0.5
            END * (vect.intensity_level / 10.0)
        )::real AS transformation_score, now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em_content ON em_content.id = vect.emotion_id AND em_content.category = 'content_state'
    JOIN emotion_transformation_map etm ON etm.content_emotion_id = vect.emotion_id
    WHERE vect.title_id = COALESCE(NEW.title_id, OLD.title_id)
    GROUP BY vect.title_id, etm.user_emotion_id
    ON CONFLICT (title_id, user_emotion_id) DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score, updated_at = now();

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Rate limiting functions
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_ip_address text, p_endpoint text, p_max_requests integer DEFAULT 10, p_window_seconds integer DEFAULT 60)
RETURNS TABLE(allowed boolean, current_count integer, reset_at timestamp with time zone)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
    v_reset_at TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    INSERT INTO ip_rate_limits (ip_address, endpoint, request_count, window_start)
    VALUES (p_ip_address, p_endpoint, 1, NOW())
    ON CONFLICT (ip_address, endpoint) DO UPDATE
    SET request_count = CASE WHEN ip_rate_limits.window_start < v_window_start THEN 1 ELSE ip_rate_limits.request_count + 1 END,
        window_start = CASE WHEN ip_rate_limits.window_start < v_window_start THEN NOW() ELSE ip_rate_limits.window_start END
    RETURNING ip_rate_limits.request_count, ip_rate_limits.window_start INTO v_current_count, v_window_start;
    v_reset_at := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN QUERY SELECT v_current_count <= p_max_requests, v_current_count, v_reset_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit_fast(p_key text, p_max_count integer, p_window_seconds integer)
RETURNS TABLE(allowed boolean, current_count integer, requires_captcha boolean)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    v_expires_at TIMESTAMPTZ := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    v_current INTEGER;
    v_captcha_threshold INTEGER := 3;
BEGIN
    INSERT INTO rate_limit_entries (key, count, window_start, expires_at)
    VALUES (p_key, 1, v_now, v_expires_at)
    ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit_entries.window_start < v_window_start THEN 1 ELSE rate_limit_entries.count + 1 END,
        window_start = CASE WHEN rate_limit_entries.window_start < v_window_start THEN v_now ELSE rate_limit_entries.window_start END,
        expires_at = CASE WHEN rate_limit_entries.window_start < v_window_start THEN v_expires_at ELSE rate_limit_entries.expires_at END
    RETURNING rate_limit_entries.count INTO v_current;
    RETURN QUERY SELECT v_current <= p_max_count, v_current, v_current >= v_captcha_threshold AND v_current <= p_max_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_data()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM ip_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE v_count INTEGER;
BEGIN
    DELETE FROM rate_limit_entries WHERE expires_at < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$;

-- Login attempt functions
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier text, p_ip_address text, p_attempt_type text DEFAULT 'password'::text, p_success boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO login_attempts (identifier, ip_address, attempt_type, success)
    VALUES (p_identifier, p_ip_address, p_attempt_type, p_success);
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_account_locked(p_identifier text, p_window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE v_failed_count INTEGER; v_lockout_threshold INTEGER := 5;
BEGIN
    SELECT COUNT(*) INTO v_failed_count FROM login_attempts
    WHERE identifier = p_identifier AND success = FALSE
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    RETURN v_failed_count >= v_lockout_threshold;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_lockout_remaining(p_identifier text, p_window_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE v_last_attempt TIMESTAMPTZ; v_remaining_seconds INTEGER;
BEGIN
    SELECT MAX(created_at) INTO v_last_attempt FROM login_attempts
    WHERE identifier = p_identifier AND success = FALSE;
    IF v_last_attempt IS NULL THEN RETURN 0; END IF;
    v_remaining_seconds := EXTRACT(EPOCH FROM (v_last_attempt + (p_window_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER;
    RETURN GREATEST(0, v_remaining_seconds);
END;
$function$;

-- Session functions
CREATE OR REPLACE FUNCTION public.is_session_valid(p_token_hash text)
RETURNS TABLE(valid boolean, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT
        (st.id IS NOT NULL AND st.revoked_at IS NULL AND st.expires_at > NOW()) AS valid,
        st.user_id
    FROM session_tokens st WHERE st.token_hash = p_token_hash LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v_count INTEGER;
BEGIN
    UPDATE session_tokens SET revoked_at = NOW()
    WHERE user_id = p_user_id AND revoked_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$;

-- OTP verification function
CREATE OR REPLACE FUNCTION public.verify_otp_secure(p_phone_number text, p_otp_input text, p_max_attempts integer DEFAULT 5)
RETURNS TABLE(success boolean, error_message text, verification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_record RECORD;
    v_otp_hash TEXT;
    v_attempts INTEGER;
BEGIN
    v_otp_hash := hash_otp(p_otp_input, p_phone_number);
    SELECT pv.id, pv.otp_hash, pv.otp_code, pv.attempt_count, pv.expires_at INTO v_record
    FROM phone_verifications pv WHERE pv.phone_number = p_phone_number
      AND pv.verified = FALSE AND pv.is_locked = FALSE AND pv.expires_at > NOW()
    ORDER BY pv.created_at DESC LIMIT 1;

    IF v_record IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No active verification found. Please request a new code.', NULL::UUID;
        RETURN;
    END IF;

    IF v_record.attempt_count >= p_max_attempts THEN
        UPDATE phone_verifications SET is_locked = TRUE WHERE id = v_record.id;
        RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please request a new code.', NULL::UUID;
        RETURN;
    END IF;

    IF (v_record.otp_hash IS NOT NULL AND v_record.otp_hash = v_otp_hash) OR (v_record.otp_code = p_otp_input) THEN
        UPDATE phone_verifications SET verified = TRUE WHERE id = v_record.id;
        DELETE FROM phone_verifications WHERE phone_number = p_phone_number AND verified = FALSE AND id != v_record.id;
        RETURN QUERY SELECT TRUE, NULL::TEXT, v_record.id;
        RETURN;
    ELSE
        UPDATE phone_verifications SET attempt_count = attempt_count + 1 WHERE id = v_record.id;
        v_attempts := v_record.attempt_count + 1;
        IF v_attempts >= p_max_attempts THEN
            UPDATE phone_verifications SET is_locked = TRUE WHERE id = v_record.id;
            RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please request a new code.', NULL::UUID;
        ELSE
            RETURN QUERY SELECT FALSE, format('Incorrect code. %s attempts remaining.', p_max_attempts - v_attempts), NULL::UUID;
        END IF;
        RETURN;
    END IF;
END;
$function$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON public.email_config
    FOR EACH ROW
    EXECUTE FUNCTION update_email_config_updated_at();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at();

CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limit_config_updated_at();

CREATE TRIGGER trg_titles_set_updated_at
    BEFORE UPDATE ON public.titles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_vibe_preferences_updated_at
    BEFORE UPDATE ON public.user_vibe_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_vibe_preferences_updated_at();

CREATE TRIGGER update_vibe_lists_updated_at_trigger
    BEFORE UPDATE ON public.vibe_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_vibe_lists_updated_at();

CREATE TRIGGER set_vibes_updated_at
    BEFORE UPDATE ON public.vibes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cascade_refresh_emotion_scores
    AFTER INSERT OR UPDATE OR DELETE ON public.viib_emotion_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION cascade_refresh_emotion_scores();

CREATE TRIGGER trigger_update_title_emotional_signatures_updated_at
    BEFORE UPDATE ON public.viib_emotion_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION update_title_emotional_signatures_updated_at();

CREATE TRIGGER trg_viib_title_intent_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.viib_intent_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION viib_title_intent_stats_trigger();

CREATE TRIGGER trigger_update_viib_intent_classified_titles_updated_at
    BEFORE UPDATE ON public.viib_intent_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION update_viib_intent_classified_titles_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
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
ALTER TABLE public.vibe_emotion_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_genre_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_genre_weights_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_shared_with ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_list_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_emotion_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_emotion_classified_titles_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_title_intent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_weight_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_taste_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- activation_codes
CREATE POLICY activation_codes_service ON public.activation_codes AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- app_settings
CREATE POLICY app_settings_anon_read ON public.app_settings AS RESTRICTIVE FOR SELECT TO anon USING ((setting_key !~~ '%secret%'::text) AND (setting_key !~~ '%key%'::text) AND (setting_key !~~ '%password%'::text) AND (setting_key !~~ '%token%'::text));
CREATE POLICY app_settings_service ON public.app_settings AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- email_config
CREATE POLICY email_config_service ON public.email_config AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- email_templates
CREATE POLICY email_templates_service ON public.email_templates AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- email_verifications
CREATE POLICY email_verifications_service_role_all ON public.email_verifications AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- emotion_display_phrases
CREATE POLICY emotion_display_phrases_public_read ON public.emotion_display_phrases AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY emotion_display_phrases_service ON public.emotion_display_phrases AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- emotion_master
CREATE POLICY emotion_master_public_read ON public.emotion_master AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY emotion_master_service_write ON public.emotion_master AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- emotion_to_intent_map
CREATE POLICY emotion_to_intent_map_public_read ON public.emotion_to_intent_map AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY emotion_to_intent_map_service ON public.emotion_to_intent_map AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- emotion_transformation_map
CREATE POLICY emotion_transformation_map_public_read ON public.emotion_transformation_map AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY emotion_transformation_map_service ON public.emotion_transformation_map AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- enabled_countries
CREATE POLICY "Admins can manage enabled countries" ON public.enabled_countries AS RESTRICTIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read enabled countries" ON public.enabled_countries AS RESTRICTIVE FOR SELECT TO public USING (true);

-- episodes
CREATE POLICY episodes_public_read ON public.episodes AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY episodes_service_write ON public.episodes AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- feedback
CREATE POLICY feedback_insert_auth ON public.feedback AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY feedback_select_own ON public.feedback AS RESTRICTIVE FOR SELECT TO authenticated USING ((user_id = get_user_id_from_auth()));
CREATE POLICY feedback_service ON public.feedback AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- friend_connections
CREATE POLICY friend_connections_auth ON public.friend_connections AS RESTRICTIVE FOR ALL TO authenticated USING (((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth()))) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY friend_connections_service ON public.friend_connections AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- genres
CREATE POLICY genres_public_read ON public.genres AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY genres_service_write ON public.genres AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ip_rate_limits
CREATE POLICY ip_rate_limits_service ON public.ip_rate_limits AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- jobs
CREATE POLICY jobs_service ON public.jobs AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- keywords
CREATE POLICY keywords_public_read ON public.keywords AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY keywords_service_write ON public.keywords AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- login_attempts
CREATE POLICY login_attempts_service ON public.login_attempts AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- official_trailer_channels
CREATE POLICY official_trailer_channels_public_read ON public.official_trailer_channels AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY official_trailer_channels_service_write ON public.official_trailer_channels AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- personality_profiles
CREATE POLICY personality_profiles_auth ON public.personality_profiles AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY personality_profiles_service ON public.personality_profiles AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- phone_verifications
CREATE POLICY phone_verifications_service_role_all ON public.phone_verifications AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- rate_limit_config
CREATE POLICY rate_limit_config_service ON public.rate_limit_config AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- rate_limit_entries
CREATE POLICY "Service role only - rate limits" ON public.rate_limit_entries AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY rate_limit_entries_service ON public.rate_limit_entries AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- recommendation_notifications
CREATE POLICY "Users can create notifications" ON public.recommendation_notifications AS RESTRICTIVE FOR INSERT TO public WITH CHECK (((sender_user_id = (SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))) OR (receiver_user_id IN (SELECT user_social_recommendations.sender_user_id FROM user_social_recommendations WHERE (user_social_recommendations.receiver_user_id = (SELECT users.id FROM users WHERE (users.auth_id = auth.uid())))))));
CREATE POLICY "Users can read their own notifications" ON public.recommendation_notifications AS RESTRICTIVE FOR SELECT TO public USING ((receiver_user_id = (SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));
CREATE POLICY "Users can update their notifications" ON public.recommendation_notifications AS RESTRICTIVE FOR UPDATE TO public USING ((receiver_user_id = (SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));

-- recommendation_outcomes
CREATE POLICY recommendation_outcomes_auth ON public.recommendation_outcomes AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY recommendation_outcomes_service ON public.recommendation_outcomes AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- seasons
CREATE POLICY seasons_public_read ON public.seasons AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY seasons_service_write ON public.seasons AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- session_tokens
CREATE POLICY "Service role only - session tokens" ON public.session_tokens AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY session_tokens_service ON public.session_tokens AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- spoken_languages
CREATE POLICY spoken_languages_public_read ON public.spoken_languages AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY spoken_languages_service_write ON public.spoken_languages AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- streaming_services
CREATE POLICY streaming_services_public_read ON public.streaming_services AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY streaming_services_service_write ON public.streaming_services AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- system_logs
CREATE POLICY system_logs_service ON public.system_logs AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- title_emotion_vectors
CREATE POLICY title_emotion_vectors_public_read ON public.title_emotion_vectors AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY title_emotion_vectors_service ON public.title_emotion_vectors AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- title_genres
CREATE POLICY title_genres_public_read ON public.title_genres AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY title_genres_service_write ON public.title_genres AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- title_intent_alignment_scores
CREATE POLICY title_intent_alignment_scores_service ON public.title_intent_alignment_scores AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- title_social_summary
CREATE POLICY title_social_summary_public_read ON public.title_social_summary AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY title_social_summary_service ON public.title_social_summary AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- title_streaming_availability
CREATE POLICY title_streaming_availability_public_read ON public.title_streaming_availability AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY title_streaming_availability_service_write ON public.title_streaming_availability AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- title_transformation_scores
CREATE POLICY title_transformation_scores_public_read ON public.title_transformation_scores AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY title_transformation_scores_service ON public.title_transformation_scores AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- title_user_emotion_match_cache
CREATE POLICY title_user_emotion_match_cache_public_read ON public.title_user_emotion_match_cache AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY title_user_emotion_match_cache_service ON public.title_user_emotion_match_cache AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- titles
CREATE POLICY titles_public_read ON public.titles AS RESTRICTIVE FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY titles_service_write ON public.titles AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- tmdb_genre_mappings
CREATE POLICY "Admins can manage tmdb_genre_mappings" ON public.tmdb_genre_mappings AS RESTRICTIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read tmdb_genre_mappings" ON public.tmdb_genre_mappings AS RESTRICTIVE FOR SELECT TO public USING (true);

-- tmdb_provider_mappings
CREATE POLICY "Admins can manage tmdb_provider_mappings" ON public.tmdb_provider_mappings AS RESTRICTIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read tmdb_provider_mappings" ON public.tmdb_provider_mappings AS RESTRICTIVE FOR SELECT TO public USING (true);

-- user_context_logs
CREATE POLICY user_context_logs_auth ON public.user_context_logs AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_context_logs_service ON public.user_context_logs AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_emotion_states
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_emotion_states_service ON public.user_emotion_states AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_language_preferences
CREATE POLICY user_language_preferences_auth ON public.user_language_preferences AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_language_preferences_service ON public.user_language_preferences AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_roles
CREATE POLICY user_roles_select_own ON public.user_roles AS RESTRICTIVE FOR SELECT TO authenticated USING ((user_id = get_user_id_from_auth()));
CREATE POLICY user_roles_service ON public.user_roles AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_social_recommendations
CREATE POLICY user_social_recommendations_auth ON public.user_social_recommendations AS RESTRICTIVE FOR ALL TO authenticated USING (((sender_user_id = get_user_id_from_auth()) OR (receiver_user_id = get_user_id_from_auth()))) WITH CHECK ((sender_user_id = get_user_id_from_auth()));
CREATE POLICY user_social_recommendations_service ON public.user_social_recommendations AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_streaming_subscriptions
CREATE POLICY user_streaming_subscriptions_auth ON public.user_streaming_subscriptions AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_streaming_subscriptions_service ON public.user_streaming_subscriptions AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_title_interactions
CREATE POLICY user_title_interactions_auth ON public.user_title_interactions AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_title_interactions_service ON public.user_title_interactions AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_title_social_scores
CREATE POLICY user_title_social_scores_auth ON public.user_title_social_scores AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_title_social_scores_service ON public.user_title_social_scores AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_vibe_preferences
CREATE POLICY user_vibe_preferences_auth ON public.user_vibe_preferences AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_vibe_preferences_service ON public.user_vibe_preferences AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- users
CREATE POLICY users_select_own ON public.users AS RESTRICTIVE FOR SELECT TO authenticated USING ((auth_id = auth.uid()));
CREATE POLICY users_service_role_all ON public.users AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY users_update_own ON public.users AS RESTRICTIVE FOR UPDATE TO authenticated USING ((auth_id = auth.uid())) WITH CHECK ((auth_id = auth.uid()));

-- vibe_emotion_weights
CREATE POLICY vibe_emotion_weights_read_authenticated ON public.vibe_emotion_weights AS RESTRICTIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_emotion_weights_service_role ON public.vibe_emotion_weights AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibe_genre_weights
CREATE POLICY vibe_genre_weights_read_authenticated ON public.vibe_genre_weights AS RESTRICTIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_genre_weights_service_role ON public.vibe_genre_weights AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibe_list_followers
CREATE POLICY vibe_list_followers_auth ON public.vibe_list_followers AS RESTRICTIVE FOR ALL TO authenticated USING ((follower_user_id = get_user_id_from_auth())) WITH CHECK ((follower_user_id = get_user_id_from_auth()));
CREATE POLICY vibe_list_followers_service ON public.vibe_list_followers AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibe_list_items
CREATE POLICY vibe_list_items_auth ON public.vibe_list_items AS RESTRICTIVE FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM vibe_lists WHERE ((vibe_lists.id = vibe_list_items.vibe_list_id) AND (vibe_lists.user_id = get_user_id_from_auth()))))) WITH CHECK ((EXISTS (SELECT 1 FROM vibe_lists WHERE ((vibe_lists.id = vibe_list_items.vibe_list_id) AND (vibe_lists.user_id = get_user_id_from_auth())))));
CREATE POLICY vibe_list_items_service ON public.vibe_list_items AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibe_list_shared_with
CREATE POLICY vibe_list_shared_with_auth ON public.vibe_list_shared_with AS RESTRICTIVE FOR ALL TO authenticated USING (((shared_with_user_id = get_user_id_from_auth()) OR (EXISTS (SELECT 1 FROM vibe_lists WHERE ((vibe_lists.id = vibe_list_shared_with.vibe_list_id) AND (vibe_lists.user_id = get_user_id_from_auth())))))) WITH CHECK ((EXISTS (SELECT 1 FROM vibe_lists WHERE ((vibe_lists.id = vibe_list_shared_with.vibe_list_id) AND (vibe_lists.user_id = get_user_id_from_auth())))));
CREATE POLICY vibe_list_shared_with_service ON public.vibe_list_shared_with AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibe_list_views
CREATE POLICY vibe_list_views_auth ON public.vibe_list_views AS RESTRICTIVE FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM vibe_lists WHERE ((vibe_lists.id = vibe_list_views.vibe_list_id) AND (vibe_lists.user_id = get_user_id_from_auth()))))) WITH CHECK ((viewer_user_id = get_user_id_from_auth()));
CREATE POLICY vibe_list_views_service ON public.vibe_list_views AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibe_lists
CREATE POLICY vibe_lists_modify_auth ON public.vibe_lists AS RESTRICTIVE FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY vibe_lists_select_auth ON public.vibe_lists AS RESTRICTIVE FOR SELECT TO authenticated USING (((user_id = get_user_id_from_auth()) OR (visibility = 'public'::text) OR (EXISTS (SELECT 1 FROM vibe_list_shared_with WHERE ((vibe_list_shared_with.vibe_list_id = vibe_lists.id) AND (vibe_list_shared_with.shared_with_user_id = get_user_id_from_auth()))))));
CREATE POLICY vibe_lists_service ON public.vibe_lists AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vibes
CREATE POLICY vibes_read_authenticated ON public.vibes AS RESTRICTIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY vibes_service_role ON public.vibes AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- viib_emotion_classified_titles
CREATE POLICY viib_emotion_classified_titles_public_read ON public.viib_emotion_classified_titles AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY viib_emotion_classified_titles_service ON public.viib_emotion_classified_titles AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- viib_emotion_classified_titles_staging
CREATE POLICY viib_emotion_classified_titles_staging_service ON public.viib_emotion_classified_titles_staging AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- viib_intent_classified_titles
CREATE POLICY viib_intent_classified_titles_public_read ON public.viib_intent_classified_titles AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY viib_intent_classified_titles_service ON public.viib_intent_classified_titles AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- viib_intent_classified_titles_staging
CREATE POLICY viib_intent_classified_titles_staging_service ON public.viib_intent_classified_titles_staging AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- viib_title_intent_stats
CREATE POLICY viib_title_intent_stats_public_read ON public.viib_title_intent_stats AS RESTRICTIVE FOR SELECT TO public USING (true);
CREATE POLICY viib_title_intent_stats_service ON public.viib_title_intent_stats AS RESTRICTIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- viib_weight_config
CREATE POLICY viib_weight_config_service ON public.viib_weight_config AS RESTRICTIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- visual_taste_options
CREATE POLICY "Admins can manage visual taste options" ON public.visual_taste_options AS RESTRICTIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read visual taste options" ON public.visual_taste_options AS RESTRICTIVE FOR SELECT TO public USING (true);

-- ============================================================================
-- END OF SCHEMA DUMP
-- ============================================================================
