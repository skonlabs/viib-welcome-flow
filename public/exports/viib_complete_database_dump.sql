-- ============================================================================
-- ViiB Complete Database Schema Dump
-- Generated: 2024-12-29
-- Database: Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TYPE public.content_type AS ENUM ('movie', 'series', 'documentary', 'short', 'other');

CREATE TYPE public.device_type AS ENUM ('mobile', 'tv', 'tablet', 'web', 'other');

CREATE TYPE public.discovery_source AS ENUM ('recommendation', 'search', 'friend', 'trending', 'external_link', 'notification', 'other');

CREATE TYPE public.emotion_category AS ENUM ('user_state', 'content_state', 'content_tone');

CREATE TYPE public.engagement_action AS ENUM ('click', 'preview', 'watch_start', 'watch_complete', 'abandon');

CREATE TYPE public.environment_tag AS ENUM ('alone', 'family', 'friends', 'commute', 'work', 'public', 'other');

CREATE TYPE public.feedback_type AS ENUM ('bug', 'suggestion', 'emotional_response', 'feature_request', 'other');

CREATE TYPE public.interaction_type AS ENUM ('started', 'completed', 'liked', 'disliked', 'browsed', 'wishlisted', 'ignored');

CREATE TYPE public.model_type AS ENUM ('collaborative', 'content_based', 'hybrid', 'deep_learning', 'reinforcement', 'other');

CREATE TYPE public.network_type AS ENUM ('wifi', 'cellular', 'offline', 'unknown');

CREATE TYPE public.notification_type AS ENUM ('recommendation', 'friend_activity', 'system', 'reminder');

CREATE TYPE public.provider_type_enum AS ENUM ('buy', 'rent', 'stream', 'free');

CREATE TYPE public.rating_value AS ENUM ('love_it', 'like_it', 'ok', 'dislike_it', 'not_rated');

CREATE TYPE public.relationship_type AS ENUM ('friend', 'family', 'partner', 'colleague', 'acquaintance', 'other');

CREATE TYPE public.signup_method AS ENUM ('email', 'phone', 'google', 'apple', 'github', 'linkedin', 'other');

CREATE TYPE public.time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night', 'late_night');

CREATE TYPE public.title_type_enum AS ENUM ('movie', 'tv');

CREATE TYPE public.transformation_type AS ENUM ('soothe', 'stabilize', 'validate', 'amplify', 'complementary', 'reinforcing', 'neutral_balancing');

CREATE TYPE public.viib_intent_type AS ENUM ('adrenaline_rush', 'background_passive', 'comfort_escape', 'deep_thought', 'discovery', 'emotional_release', 'family_bonding', 'light_entertainment');


-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- activation_codes
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

-- app_settings
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

-- email_config
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

-- email_templates
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

-- email_verifications
CREATE TABLE public.email_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    expires_at timestamp with time zone NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);

-- emotion_display_phrases
CREATE TABLE public.emotion_display_phrases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    display_phrase text NOT NULL,
    min_intensity numeric NOT NULL,
    max_intensity numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_display_phrases_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_display_phrases_emotion_phrase_unique UNIQUE (emotion_id, display_phrase),
    CONSTRAINT uq_emotion_display_range UNIQUE (emotion_id, min_intensity, max_intensity)
);

-- emotion_master
CREATE TABLE public.emotion_master (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_label text NOT NULL,
    category text NOT NULL,
    valence real,
    arousal real,
    dominance real,
    description text,
    intensity_multiplier real DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT emotion_master_pkey PRIMARY KEY (id),
    CONSTRAINT uq_emotion_label_category UNIQUE (emotion_label, category)
);

-- emotion_to_intent_map
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    intent_type text NOT NULL,
    weight numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_to_intent_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_to_intent_map_emotion_intent_unique UNIQUE (emotion_id, intent_type),
    CONSTRAINT emotion_to_intent_unique UNIQUE (emotion_id, intent_type)
);

-- emotion_transformation_map
CREATE TABLE public.emotion_transformation_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_emotion_id uuid NOT NULL,
    content_emotion_id uuid NOT NULL,
    transformation_type text NOT NULL,
    confidence_score numeric NOT NULL,
    priority_rank integer,
    CONSTRAINT emotion_transformation_map_pkey PRIMARY KEY (id),
    CONSTRAINT uq_emotion_transformation UNIQUE (user_emotion_id, content_emotion_id)
);

-- enabled_countries
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

-- episodes
CREATE TABLE public.episodes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    season_id uuid NOT NULL,
    episode_number integer NOT NULL,
    name text,
    overview text,
    air_date date,
    still_path text,
    runtime integer,
    vote_average real,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT episodes_pkey PRIMARY KEY (id)
);

-- feedback
CREATE TABLE public.feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT feedback_pkey PRIMARY KEY (id)
);

-- friend_connections
CREATE TABLE public.friend_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    friend_user_id uuid NOT NULL,
    relationship_type text,
    trust_score numeric NOT NULL DEFAULT 0.5,
    is_muted boolean NOT NULL DEFAULT false,
    is_blocked boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT friend_connections_pkey PRIMARY KEY (id),
    CONSTRAINT friend_connections_user_friend_unique UNIQUE (user_id, friend_user_id)
);

-- genres
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    genre_name text NOT NULL,
    tmdb_genre_id integer,
    CONSTRAINT genres_pkey PRIMARY KEY (id),
    CONSTRAINT genres_genre_name_key UNIQUE (genre_name)
);

-- ip_rate_limits
CREATE TABLE public.ip_rate_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 0,
    window_start timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ip_rate_limits_pkey PRIMARY KEY (id),
    CONSTRAINT ip_rate_limits_ip_endpoint_unique UNIQUE (ip_address, endpoint)
);

-- jobs
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_name text NOT NULL,
    job_type text NOT NULL,
    status text NOT NULL DEFAULT 'idle',
    is_active boolean NOT NULL DEFAULT true,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    error_message text,
    configuration jsonb,
    total_titles_processed integer,
    last_run_duration_seconds integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_job_type_key UNIQUE (job_type)
);

-- keywords
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tmdb_keyword_id integer,
    CONSTRAINT keywords_pkey PRIMARY KEY (id),
    CONSTRAINT keywords_name_key UNIQUE (name)
);

-- login_attempts
CREATE TABLE public.login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    ip_address text,
    attempt_type text NOT NULL DEFAULT 'password',
    success boolean DEFAULT false,
    requires_captcha boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- official_trailer_channels
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

-- personality_profiles
CREATE TABLE public.personality_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type_name text,
    description text,
    introversion_score real,
    emotional_sensitivity real,
    analytical_thinking real,
    risk_tolerance real,
    sensation_seeking real,
    empathy_level real,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT personality_profiles_pkey PRIMARY KEY (id)
);

-- phone_verifications
CREATE TABLE public.phone_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    otp_hash text,
    expires_at timestamp with time zone NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    is_locked boolean DEFAULT false,
    CONSTRAINT phone_verifications_pkey PRIMARY KEY (id)
);

-- rate_limit_config
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

-- rate_limit_entries
CREATE TABLE public.rate_limit_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL,
    count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT rate_limit_entries_pkey PRIMARY KEY (id),
    CONSTRAINT rate_limit_entries_key_key UNIQUE (key)
);

-- recommendation_notifications
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

-- recommendation_outcomes
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

-- seasons
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
    is_tmdb_trailer boolean,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT seasons_pkey PRIMARY KEY (id),
    CONSTRAINT seasons_title_season_unique UNIQUE (title_id, season_number)
);

-- session_tokens
CREATE TABLE public.session_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    issued_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address text,
    user_agent text,
    is_remember_me boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT session_tokens_token_hash_key UNIQUE (token_hash)
);

-- spoken_languages
CREATE TABLE public.spoken_languages (
    iso_639_1 text NOT NULL,
    language_name text NOT NULL,
    flag_emoji text,
    CONSTRAINT spoken_languages_pkey PRIMARY KEY (iso_639_1)
);

-- streaming_services
CREATE TABLE public.streaming_services (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    service_name text NOT NULL,
    logo_url text,
    website_url text,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT streaming_services_pkey PRIMARY KEY (id),
    CONSTRAINT streaming_services_service_name_key UNIQUE (service_name)
);

-- system_logs
CREATE TABLE public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    severity text NOT NULL DEFAULT 'error',
    screen text,
    operation text,
    error_message text NOT NULL,
    error_stack text,
    context jsonb,
    http_status integer,
    resolved boolean NOT NULL DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- title_emotion_vectors
CREATE TABLE public.title_emotion_vectors (
    title_id uuid NOT NULL,
    valence real NOT NULL,
    arousal real NOT NULL,
    dominance real NOT NULL,
    emotion_strength real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_emotion_vectors_pkey PRIMARY KEY (title_id)
);

-- title_genres
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id)
);

-- title_intent_alignment_scores
CREATE TABLE public.title_intent_alignment_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    alignment_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_intent_alignment_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- title_social_summary
CREATE TABLE public.title_social_summary (
    title_id uuid NOT NULL,
    social_rec_power real,
    social_mean_rating real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_social_summary_pkey PRIMARY KEY (title_id)
);

-- title_streaming_availability
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    region_code text NOT NULL,
    CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- title_transformation_scores
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_transformation_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- title_user_emotion_match_cache
CREATE TABLE public.title_user_emotion_match_cache (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    cosine_score real NOT NULL,
    transformation_score real,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT title_user_emotion_match_cache_pkey PRIMARY KEY (title_id, user_emotion_id)
);

-- titles
CREATE TABLE public.titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_id integer,
    title_type text,
    name text,
    original_name text,
    original_language text,
    overview text,
    poster_path text,
    backdrop_path text,
    release_date date,
    first_air_date date,
    last_air_date date,
    runtime integer,
    episode_run_time integer[],
    popularity real,
    vote_average real,
    certification text,
    status text,
    is_adult boolean DEFAULT false,
    imdb_id text,
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    classification_status text,
    last_classified_at timestamp with time zone,
    title_genres jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT titles_pkey PRIMARY KEY (id),
    CONSTRAINT titles_tmdb_type_unique UNIQUE (tmdb_id, title_type)
);

-- tmdb_genre_mappings
CREATE TABLE public.tmdb_genre_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_genre_id integer NOT NULL,
    genre_name text NOT NULL,
    media_type text NOT NULL DEFAULT 'movie',
    tv_equivalent_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_genre_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT tmdb_genre_mappings_unique UNIQUE (tmdb_genre_id, media_type)
);

-- tmdb_provider_mappings
CREATE TABLE public.tmdb_provider_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_provider_id integer NOT NULL,
    service_name text NOT NULL,
    region_code text NOT NULL DEFAULT 'US',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_provider_mappings_pkey PRIMARY KEY (id)
);

-- user_context_logs
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

-- user_emotion_states
CREATE TABLE public.user_emotion_states (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity real NOT NULL DEFAULT 0.5,
    valence real,
    arousal real,
    dominance real,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_emotion_states_pkey PRIMARY KEY (id)
);

-- user_language_preferences
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL,
    language_code text NOT NULL,
    priority_order integer DEFAULT 1,
    CONSTRAINT user_language_preferences_pkey PRIMARY KEY (user_id, language_code)
);

-- user_roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);

-- user_social_recommendations
CREATE TABLE public.user_social_recommendations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_user_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_social_recommendations_pkey PRIMARY KEY (id)
);

-- user_streaming_subscriptions
CREATE TABLE public.user_streaming_subscriptions (
    user_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT user_streaming_subscriptions_pkey PRIMARY KEY (user_id, streaming_service_id)
);

-- user_title_interactions
CREATE TABLE public.user_title_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value,
    season_number integer,
    watch_duration_percentage real,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_interactions_pkey PRIMARY KEY (id)
);

-- user_title_social_scores
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    social_component_score real NOT NULL,
    social_priority_score real NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_social_scores_pkey PRIMARY KEY (user_id, title_id)
);

-- user_vibe_preferences
CREATE TABLE public.user_vibe_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    vibe_id uuid,
    vibe_type text NOT NULL,
    canonical_key text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_vibe_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_vibe_preferences_user_id_key UNIQUE (user_id)
);

-- users
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
    onboarding_completed boolean NOT NULL DEFAULT false,
    last_onboarding_step text,
    country text,
    timezone text,
    language_preference text DEFAULT 'en',
    signup_method text,
    ip_address text,
    ip_country text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_auth_id_key UNIQUE (auth_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_phone_number_key UNIQUE (phone_number),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- vibe_emotion_weights
CREATE TABLE public.vibe_emotion_weights (
    vibe_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    weight numeric NOT NULL,
    CONSTRAINT vibe_emotion_weights_pkey PRIMARY KEY (vibe_id, emotion_id)
);

-- vibe_genre_weights
CREATE TABLE public.vibe_genre_weights (
    vibe_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    weight numeric NOT NULL,
    CONSTRAINT vibe_genre_weights_pkey PRIMARY KEY (vibe_id, genre_id)
);

-- vibe_genre_weights_key
CREATE TABLE public.vibe_genre_weights_key (
    canonical_key text NOT NULL,
    genre_id uuid NOT NULL,
    weight numeric NOT NULL,
    CONSTRAINT vibe_genre_weights_key_pkey PRIMARY KEY (canonical_key, genre_id)
);

-- vibe_list_followers
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    followed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_followers_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_followers_unique UNIQUE (vibe_list_id, follower_user_id)
);

-- vibe_list_items
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    title_id uuid NOT NULL,
    added_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_items_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_items_unique UNIQUE (vibe_list_id, title_id)
);

-- vibe_list_shared_with
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    shared_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_shared_with_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_shared_with_unique UNIQUE (vibe_list_id, shared_with_user_id)
);

-- vibe_list_views
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    viewer_user_id uuid,
    viewed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_views_pkey PRIMARY KEY (id)
);

-- vibe_lists
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    visibility text NOT NULL DEFAULT 'private',
    mood_tags text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_lists_pkey PRIMARY KEY (id)
);

-- vibes
CREATE TABLE public.vibes (
    id uuid NOT NULL,
    label text NOT NULL,
    description text,
    base_weight numeric NOT NULL DEFAULT 1.0,
    decay_half_life_days integer NOT NULL DEFAULT 7,
    component_ratios jsonb NOT NULL DEFAULT '{}',
    canonical_key text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibes_pkey PRIMARY KEY (id),
    CONSTRAINT vibes_label_key UNIQUE (label),
    CONSTRAINT vibes_canonical_key_key UNIQUE (canonical_key)
);

-- viib_emotion_classified_titles
CREATE TABLE public.viib_emotion_classified_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level integer NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_pkey PRIMARY KEY (id),
    CONSTRAINT viib_emotion_classified_titles_unique UNIQUE (title_id, emotion_id)
);

-- viib_emotion_classified_titles_staging
CREATE TABLE public.viib_emotion_classified_titles_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level integer NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_staging_pkey PRIMARY KEY (id)
);

-- viib_intent_classified_titles
CREATE TABLE public.viib_intent_classified_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score numeric NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_pkey PRIMARY KEY (id),
    CONSTRAINT viib_intent_classified_titles_unique UNIQUE (title_id, intent_type)
);

-- viib_intent_classified_titles_staging
CREATE TABLE public.viib_intent_classified_titles_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title_id uuid NOT NULL,
    intent_type public.viib_intent_type NOT NULL,
    confidence_score numeric NOT NULL,
    source text NOT NULL DEFAULT 'ai',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_staging_pkey PRIMARY KEY (id)
);

-- viib_title_intent_stats
CREATE TABLE public.viib_title_intent_stats (
    title_id uuid NOT NULL,
    primary_intent_type text,
    primary_confidence_score real,
    intent_count integer,
    last_computed_at timestamp with time zone,
    CONSTRAINT viib_title_intent_stats_pkey PRIMARY KEY (title_id)
);

-- viib_weight_config
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
-- SECTION 3: FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE public.activation_codes ADD CONSTRAINT activation_codes_used_by_fkey 
    FOREIGN KEY (used_by) REFERENCES public.users(id);

ALTER TABLE public.emotion_display_phrases ADD CONSTRAINT emotion_display_phrases_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.emotion_to_intent_map ADD CONSTRAINT emotion_to_intent_map_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.emotion_transformation_map ADD CONSTRAINT emotion_transformation_map_from_emotion_id_fkey 
    FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.emotion_transformation_map ADD CONSTRAINT emotion_transformation_map_to_emotion_id_fkey 
    FOREIGN KEY (content_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.episodes ADD CONSTRAINT episodes_season_id_fkey 
    FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;

ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.friend_connections ADD CONSTRAINT friend_connections_friend_user_id_fkey 
    FOREIGN KEY (friend_user_id) REFERENCES public.users(id);

ALTER TABLE public.friend_connections ADD CONSTRAINT friend_connections_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.personality_profiles ADD CONSTRAINT personality_profiles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.recommendation_notifications ADD CONSTRAINT recommendation_notifications_receiver_user_id_fkey 
    FOREIGN KEY (receiver_user_id) REFERENCES public.users(id);

ALTER TABLE public.recommendation_notifications ADD CONSTRAINT recommendation_notifications_sender_user_id_fkey 
    FOREIGN KEY (sender_user_id) REFERENCES public.users(id);

ALTER TABLE public.recommendation_notifications ADD CONSTRAINT recommendation_notifications_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.recommendation_outcomes ADD CONSTRAINT recommendation_outcomes_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.recommendation_outcomes ADD CONSTRAINT recommendation_outcomes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.seasons ADD CONSTRAINT seasons_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.session_tokens ADD CONSTRAINT session_tokens_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_resolved_by_fkey 
    FOREIGN KEY (resolved_by) REFERENCES public.users(id);

ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.title_emotion_vectors ADD CONSTRAINT title_emotion_vectors_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_genres ADD CONSTRAINT title_genres_genre_id_fkey 
    FOREIGN KEY (genre_id) REFERENCES public.genres(id);

ALTER TABLE public.title_genres ADD CONSTRAINT title_genres_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_intent_alignment_scores ADD CONSTRAINT title_intent_alignment_scores_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_intent_alignment_scores ADD CONSTRAINT title_intent_alignment_scores_user_emotion_id_fkey 
    FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.title_social_summary ADD CONSTRAINT title_social_summary_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_streaming_availability ADD CONSTRAINT title_streaming_availability_streaming_service_id_fkey 
    FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id);

ALTER TABLE public.title_streaming_availability ADD CONSTRAINT title_streaming_availability_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_transformation_scores ADD CONSTRAINT title_transformation_scores_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_transformation_scores ADD CONSTRAINT title_transformation_scores_user_emotion_id_fkey 
    FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.title_user_emotion_match_cache ADD CONSTRAINT title_user_emotion_match_cache_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.title_user_emotion_match_cache ADD CONSTRAINT title_user_emotion_match_cache_user_emotion_id_fkey 
    FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.user_context_logs ADD CONSTRAINT user_context_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_emotion_states ADD CONSTRAINT user_emotion_states_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.user_emotion_states ADD CONSTRAINT user_emotion_states_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_language_preferences ADD CONSTRAINT user_language_preferences_language_code_fkey 
    FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1);

ALTER TABLE public.user_language_preferences ADD CONSTRAINT user_language_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_social_recommendations ADD CONSTRAINT user_social_recommendations_receiver_user_id_fkey 
    FOREIGN KEY (receiver_user_id) REFERENCES public.users(id);

ALTER TABLE public.user_social_recommendations ADD CONSTRAINT user_social_recommendations_sender_user_id_fkey 
    FOREIGN KEY (sender_user_id) REFERENCES public.users(id);

ALTER TABLE public.user_social_recommendations ADD CONSTRAINT user_social_recommendations_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.user_streaming_subscriptions ADD CONSTRAINT user_streaming_subscriptions_streaming_service_id_fkey 
    FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id);

ALTER TABLE public.user_streaming_subscriptions ADD CONSTRAINT user_streaming_subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_title_interactions ADD CONSTRAINT user_title_interactions_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id);

ALTER TABLE public.user_title_interactions ADD CONSTRAINT user_title_interactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_title_social_scores ADD CONSTRAINT user_title_social_scores_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.user_vibe_preferences ADD CONSTRAINT user_vibe_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_emotion_weights ADD CONSTRAINT vibe_emotion_weights_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.vibe_emotion_weights ADD CONSTRAINT vibe_emotion_weights_vibe_id_fkey 
    FOREIGN KEY (vibe_id) REFERENCES public.vibes(id);

ALTER TABLE public.vibe_genre_weights ADD CONSTRAINT vibe_genre_weights_genre_id_fkey 
    FOREIGN KEY (genre_id) REFERENCES public.genres(id);

ALTER TABLE public.vibe_genre_weights ADD CONSTRAINT vibe_genre_weights_vibe_id_fkey 
    FOREIGN KEY (vibe_id) REFERENCES public.vibes(id);

ALTER TABLE public.vibe_genre_weights_key ADD CONSTRAINT vibe_genre_weights_key_canonical_fk 
    FOREIGN KEY (canonical_key) REFERENCES public.vibes(canonical_key);

ALTER TABLE public.vibe_list_followers ADD CONSTRAINT vibe_list_followers_follower_user_id_fkey 
    FOREIGN KEY (follower_user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_list_followers ADD CONSTRAINT vibe_list_followers_vibe_list_id_fkey 
    FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id) ON DELETE CASCADE;

ALTER TABLE public.vibe_list_items ADD CONSTRAINT vibe_list_items_vibe_list_id_fkey 
    FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id) ON DELETE CASCADE;

ALTER TABLE public.vibe_list_shared_with ADD CONSTRAINT vibe_list_shared_with_shared_with_user_id_fkey 
    FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_list_shared_with ADD CONSTRAINT vibe_list_shared_with_vibe_list_id_fkey 
    FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id) ON DELETE CASCADE;

ALTER TABLE public.vibe_list_views ADD CONSTRAINT vibe_list_views_vibe_list_id_fkey 
    FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id) ON DELETE CASCADE;

ALTER TABLE public.vibe_list_views ADD CONSTRAINT vibe_list_views_viewer_user_id_fkey 
    FOREIGN KEY (viewer_user_id) REFERENCES public.users(id);

ALTER TABLE public.vibe_lists ADD CONSTRAINT vibe_lists_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.viib_emotion_classified_titles ADD CONSTRAINT viib_emotion_classified_titles_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.viib_emotion_classified_titles ADD CONSTRAINT viib_emotion_classified_titles_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.viib_emotion_classified_titles_staging ADD CONSTRAINT viib_emotion_classified_titles_staging_emotion_id_fkey 
    FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);

ALTER TABLE public.viib_emotion_classified_titles_staging ADD CONSTRAINT viib_emotion_classified_titles_staging_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.viib_intent_classified_titles ADD CONSTRAINT viib_intent_classified_titles_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.viib_intent_classified_titles_staging ADD CONSTRAINT viib_intent_classified_titles_staging_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;

ALTER TABLE public.viib_title_intent_stats ADD CONSTRAINT viib_title_intent_stats_title_id_fkey 
    FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;


-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

CREATE INDEX idx_activation_codes_code ON public.activation_codes USING btree (code);
CREATE INDEX idx_activation_codes_created_at ON public.activation_codes USING btree (created_at DESC);
CREATE INDEX idx_activation_codes_used ON public.activation_codes USING btree (is_used);
CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (setting_key);
CREATE INDEX idx_email_config_active ON public.email_config USING btree (is_active);
CREATE INDEX idx_email_templates_active ON public.email_templates USING btree (is_active);
CREATE INDEX idx_email_templates_type ON public.email_templates USING btree (template_type);
CREATE INDEX idx_email_verifications_email ON public.email_verifications USING btree (email);
CREATE INDEX idx_email_verifications_expires ON public.email_verifications USING btree (expires_at);
CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications USING btree (expires_at);
CREATE INDEX idx_e2i_intent_type ON public.emotion_to_intent_map USING btree (intent_type);
CREATE INDEX idx_episodes_season_id ON public.episodes USING btree (season_id);
CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX idx_feedback_type ON public.feedback USING btree (type);
CREATE INDEX idx_feedback_user_id ON public.feedback USING btree (user_id);
CREATE INDEX idx_friend_connections_friend ON public.friend_connections USING btree (friend_user_id);
CREATE INDEX idx_friend_connections_user ON public.friend_connections USING btree (user_id);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_jobs_type ON public.jobs USING btree (job_type);
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts USING btree (identifier);
CREATE INDEX idx_login_attempts_created ON public.login_attempts USING btree (created_at DESC);
CREATE INDEX idx_personality_user ON public.personality_profiles USING btree (user_id);
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications USING btree (expires_at);
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications USING btree (phone_number);
CREATE INDEX idx_rate_limit_config_endpoint ON public.rate_limit_config USING btree (endpoint);
CREATE INDEX idx_rate_limit_entries_expires ON public.rate_limit_entries USING btree (expires_at);
CREATE INDEX idx_rate_limit_entries_key ON public.rate_limit_entries USING btree (key);
CREATE INDEX idx_recommendation_notifications_receiver ON public.recommendation_notifications USING btree (receiver_user_id);
CREATE INDEX idx_recommendation_outcomes_created ON public.recommendation_outcomes USING btree (created_at DESC);
CREATE INDEX idx_recommendation_outcomes_user ON public.recommendation_outcomes USING btree (user_id);
CREATE INDEX idx_seasons_title_id ON public.seasons USING btree (title_id);
CREATE INDEX idx_session_tokens_expires ON public.session_tokens USING btree (expires_at);
CREATE INDEX idx_session_tokens_user ON public.session_tokens USING btree (user_id);
CREATE INDEX idx_streaming_services_active ON public.streaming_services USING btree (is_active);
CREATE INDEX idx_system_logs_created ON public.system_logs USING btree (created_at DESC);
CREATE INDEX idx_system_logs_resolved ON public.system_logs USING btree (resolved);
CREATE INDEX idx_system_logs_severity ON public.system_logs USING btree (severity);
CREATE INDEX idx_system_logs_user ON public.system_logs USING btree (user_id);
CREATE INDEX idx_title_emotion_vectors_updated ON public.title_emotion_vectors USING btree (updated_at);
CREATE INDEX idx_title_genres_genre ON public.title_genres USING btree (genre_id);
CREATE INDEX idx_title_genres_title ON public.title_genres USING btree (title_id);
CREATE INDEX idx_title_intent_alignment_emotion ON public.title_intent_alignment_scores USING btree (user_emotion_id);
CREATE INDEX idx_title_intent_alignment_title ON public.title_intent_alignment_scores USING btree (title_id);
CREATE INDEX idx_title_social_summary_power ON public.title_social_summary USING btree (social_rec_power DESC);
CREATE INDEX idx_title_streaming_region ON public.title_streaming_availability USING btree (region_code);
CREATE INDEX idx_title_streaming_service ON public.title_streaming_availability USING btree (streaming_service_id);
CREATE INDEX idx_title_streaming_title ON public.title_streaming_availability USING btree (title_id);
CREATE INDEX idx_title_transformation_emotion ON public.title_transformation_scores USING btree (user_emotion_id);
CREATE INDEX idx_title_transformation_title ON public.title_transformation_scores USING btree (title_id);
CREATE INDEX idx_title_user_emotion_match_title ON public.title_user_emotion_match_cache USING btree (title_id);
CREATE INDEX idx_title_user_emotion_match_emotion ON public.title_user_emotion_match_cache USING btree (user_emotion_id);
CREATE INDEX idx_titles_classification_status ON public.titles USING btree (classification_status);
CREATE INDEX idx_titles_created_at ON public.titles USING btree (created_at);
CREATE INDEX idx_titles_language ON public.titles USING btree (original_language);
CREATE INDEX idx_titles_popularity ON public.titles USING btree (popularity DESC);
CREATE INDEX idx_titles_release_date ON public.titles USING btree (release_date DESC);
CREATE INDEX idx_titles_tmdb_id ON public.titles USING btree (tmdb_id);
CREATE INDEX idx_titles_type ON public.titles USING btree (title_type);
CREATE INDEX idx_titles_vote_average ON public.titles USING btree (vote_average DESC);
CREATE INDEX idx_user_context_created ON public.user_context_logs USING btree (created_at DESC);
CREATE INDEX idx_user_context_user ON public.user_context_logs USING btree (user_id);
CREATE INDEX idx_user_emotion_states_created ON public.user_emotion_states USING btree (created_at DESC);
CREATE INDEX idx_user_emotion_states_emotion ON public.user_emotion_states USING btree (emotion_id);
CREATE INDEX idx_user_emotion_states_user ON public.user_emotion_states USING btree (user_id);
CREATE INDEX idx_user_interactions_created ON public.user_title_interactions USING btree (created_at DESC);
CREATE INDEX idx_user_interactions_title ON public.user_title_interactions USING btree (title_id);
CREATE INDEX idx_user_interactions_type ON public.user_title_interactions USING btree (interaction_type);
CREATE INDEX idx_user_interactions_user ON public.user_title_interactions USING btree (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);
CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_social_recs_receiver ON public.user_social_recommendations USING btree (receiver_user_id);
CREATE INDEX idx_user_social_recs_sender ON public.user_social_recommendations USING btree (sender_user_id);
CREATE INDEX idx_user_social_recs_title ON public.user_social_recommendations USING btree (title_id);
CREATE INDEX idx_user_streaming_service ON public.user_streaming_subscriptions USING btree (streaming_service_id);
CREATE INDEX idx_user_streaming_user ON public.user_streaming_subscriptions USING btree (user_id);
CREATE INDEX idx_user_title_social_title ON public.user_title_social_scores USING btree (title_id);
CREATE INDEX idx_user_title_social_user ON public.user_title_social_scores USING btree (user_id);
CREATE INDEX idx_user_vibe_prefs_user ON public.user_vibe_preferences USING btree (user_id);
CREATE INDEX idx_users_auth_id ON public.users USING btree (auth_id);
CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);
CREATE INDEX idx_vibe_lists_user ON public.vibe_lists USING btree (user_id);
CREATE INDEX idx_vibe_lists_visibility ON public.vibe_lists USING btree (visibility);
CREATE INDEX idx_viib_emotion_classified_emotion ON public.viib_emotion_classified_titles USING btree (emotion_id);
CREATE INDEX idx_viib_emotion_classified_title ON public.viib_emotion_classified_titles USING btree (title_id);
CREATE INDEX idx_viib_emotion_staging_title ON public.viib_emotion_classified_titles_staging USING btree (title_id);
CREATE INDEX idx_viib_intent_classified_intent ON public.viib_intent_classified_titles USING btree (intent_type);
CREATE INDEX idx_viib_intent_classified_title ON public.viib_intent_classified_titles USING btree (title_id);
CREATE INDEX idx_viib_intent_staging_title ON public.viib_intent_classified_titles_staging USING btree (title_id);
CREATE INDEX idx_viib_title_intent_stats_intent ON public.viib_title_intent_stats USING btree (primary_intent_type);


-- ============================================================================
-- SECTION 5: VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.viib_recommendation_debug AS
SELECT 
    t.id AS title_id,
    t.name AS title,
    tev.valence,
    tev.arousal,
    tev.dominance,
    tev.emotion_strength,
    tss.social_rec_power,
    tss.social_mean_rating
FROM public.titles t
LEFT JOIN public.title_emotion_vectors tev ON tev.title_id = t.id
LEFT JOIN public.title_social_summary tss ON tss.title_id = t.id;


-- ============================================================================
-- SECTION 6: FUNCTIONS
-- ============================================================================

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

CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_value text;
BEGIN
  SELECT setting_value::text INTO v_value FROM app_settings WHERE setting_key = p_key LIMIT 1;
  RETURN COALESCE(v_value, p_default);
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_old_otps(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE email_verifications SET verified = true WHERE email = p_email AND verified = false AND expires_at > NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.invalidate_old_phone_otps(p_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE phone_verifications SET verified = true WHERE phone_number = p_phone AND verified = false AND expires_at > NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN UPDATE users SET auth_id = p_auth_id WHERE id = p_user_id; END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v4(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(title_id uuid, title text, poster_path text, emotion_score real, historical_score real, social_score real, context_score real, novelty_score real, vibe_boost real, quality_score real, final_score real, recommendation_reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
WITH
user_vibe AS (
  SELECT vibe_type, canonical_key
  FROM public.user_vibe_preferences
  WHERE user_id = p_user_id
  LIMIT 1
),
user_history_counts AS (
  SELECT COUNT(*) FILTER (WHERE interaction_type::text IN ('liked','completed','wishlisted'))::int AS pos_cnt
  FROM public.user_title_interactions WHERE user_id = p_user_id
),
cold_start AS (
  SELECT (pos_cnt < 3) AS is_cold_start FROM user_history_counts
),
user_emotion AS (
  SELECT
    COALESCE(ues.valence, em.valence, 0.5) AS u_valence,
    COALESCE(ues.arousal, em.arousal, 0.5) AS u_arousal,
    COALESCE(ues.dominance, em.dominance, 0.5) AS u_dominance
  FROM public.user_emotion_states ues
  JOIN public.emotion_master em ON em.id = ues.emotion_id
  WHERE ues.user_id = p_user_id
  ORDER BY ues.created_at DESC LIMIT 1
),
has_user_emotion AS (SELECT EXISTS (SELECT 1 FROM user_emotion) AS ok),
candidates AS (
  SELECT t.id AS title_id, COALESCE(t.popularity,0) AS popularity, t.runtime
  FROM public.titles t
  WHERE COALESCE(t.classification_status,'') = 'complete'
  ORDER BY COALESCE(t.popularity,0) DESC LIMIT 300
),
emotion_scored AS (
  SELECT c.title_id,
    CASE WHEN (SELECT ok FROM has_user_emotion) = false OR tev.title_id IS NULL THEN 0.55
    ELSE GREATEST(0.0, LEAST(1.0, 1.0 - (SQRT(
        POWER((SELECT u_valence FROM user_emotion) - tev.valence, 2) +
        POWER((SELECT u_arousal FROM user_emotion) - tev.arousal, 2) +
        POWER((SELECT u_dominance FROM user_emotion) - tev.dominance, 2)
      ) / 1.732))) END::real AS emotion_score
  FROM candidates c LEFT JOIN public.title_emotion_vectors tev ON tev.title_id = c.title_id
),
novelty_scored AS (
  SELECT c.title_id, (1.0 / (1.0 + (c.popularity/50.0)))::real AS novelty_score FROM candidates c
),
cold_historical AS (
  SELECT c.title_id,
    COALESCE((
      SELECT LEAST(1.0, SUM(vgw.weight)::real / NULLIF(
        (SELECT SUM(weight) FROM public.vibe_genre_weights_key WHERE canonical_key = uv.canonical_key), 0))
      FROM public.title_genres tg
      JOIN public.vibe_genre_weights_key vgw ON vgw.genre_id = tg.genre_id AND vgw.canonical_key = uv.canonical_key
      WHERE tg.title_id = c.title_id
    ), 0.10)::real AS historical_score
  FROM candidates c CROSS JOIN user_vibe uv
),
quality_scored AS (
  SELECT t.id AS title_id,
    CASE WHEN COALESCE(t.rt_cscore,0)=0 AND COALESCE(t.rt_ascore,0)=0 THEN 0.55
    ELSE LEAST(1.0, 0.6*((t.rt_cscore/100.0)*t.rt_ccount + 35)/(t.rt_ccount+50) + 0.4*((t.rt_ascore/100.0)*t.rt_acount + 140)/(t.rt_acount+200))
    END::real AS quality_score
  FROM public.titles t
),
combined AS (
  SELECT t.id AS title_id, t.name AS title, t.poster_path,
    es.emotion_score, ch.historical_score, 0.0::real AS social_score, 0.5::real AS context_score,
    ns.novelty_score, 1.0::real AS vibe_boost, qs.quality_score,
    (0.40*ch.historical_score + 0.30*es.emotion_score + 0.07*ns.novelty_score + 0.05*qs.quality_score)::real AS final_score
  FROM public.titles t
  JOIN candidates c ON c.title_id = t.id
  JOIN emotion_scored es ON es.title_id = t.id
  JOIN novelty_scored ns ON ns.title_id = t.id
  JOIN cold_historical ch ON ch.title_id = t.id
  JOIN quality_scored qs ON qs.title_id = t.id
),
explained AS (
  SELECT *,
    CASE
      WHEN (SELECT is_cold_start FROM cold_start) AND historical_score > 0.60 THEN
        CASE (SELECT canonical_key FROM user_vibe)
          WHEN 'calm_reflective' THEN 'Because you chose Calm & Reflective'
          WHEN 'bold_exciting' THEN 'Because you chose Bold & Exciting'
          WHEN 'curious_wonder' THEN 'Because you chose Curious & Wonder'
          WHEN 'adventure_discovery' THEN 'Because you chose Adventure & Discovery'
          ELSE 'Recommended for your vibe'
        END
      WHEN emotion_score > 0.72 THEN 'Fits how you''re feeling right now'
      WHEN quality_score > 0.80 THEN 'Highly rated by critics and audiences'
      ELSE 'A thoughtful recommendation'
    END AS primary_reason,
    CASE
      WHEN emotion_score > 0.65 AND historical_score > 0.50 THEN 'Fits your current mood'
      WHEN quality_score > 0.75 THEN 'Well-reviewed and popular'
      WHEN novelty_score > 0.70 THEN 'Something a bit different'
      ELSE NULL
    END AS secondary_reason
  FROM combined
)
SELECT title_id, title, poster_path, emotion_score, historical_score, social_score, context_score, novelty_score, vibe_boost, quality_score, final_score,
  CASE WHEN secondary_reason IS NOT NULL THEN primary_reason || ' · ' || secondary_reason ELSE primary_reason END AS recommendation_reason
FROM explained ORDER BY final_score DESC LIMIT p_limit;
$function$;

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

CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
 SET search_path TO 'public'
AS $function$
    INSERT INTO title_emotion_vectors (title_id, valence, arousal, dominance, emotion_strength, updated_at)
    SELECT vec.title_id,
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

CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.title_transformation_scores (title_id, user_emotion_id, transformation_score, updated_at)
    SELECT vect.title_id, etm.user_emotion_id,
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

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
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

CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
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


-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

CREATE TRIGGER app_settings_updated_at 
    BEFORE UPDATE ON public.app_settings 
    FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();

CREATE TRIGGER update_email_config_updated_at 
    BEFORE UPDATE ON public.email_config 
    FOR EACH ROW EXECUTE FUNCTION update_email_config_updated_at();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON public.email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_email_templates_updated_at();

CREATE TRIGGER update_feedback_updated_at 
    BEFORE UPDATE ON public.feedback 
    FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER jobs_updated_at 
    BEFORE UPDATE ON public.jobs 
    FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();

CREATE TRIGGER update_rate_limit_config_updated_at 
    BEFORE UPDATE ON public.rate_limit_config 
    FOR EACH ROW EXECUTE FUNCTION update_rate_limit_config_updated_at();

CREATE TRIGGER trg_titles_set_updated_at 
    BEFORE UPDATE ON public.titles 
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_vibe_preferences_updated_at 
    BEFORE UPDATE ON public.user_vibe_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_vibe_preferences_updated_at();

CREATE TRIGGER update_vibe_lists_updated_at_trigger 
    BEFORE UPDATE ON public.vibe_lists 
    FOR EACH ROW EXECUTE FUNCTION update_vibe_lists_updated_at();

CREATE TRIGGER set_vibes_updated_at 
    BEFORE UPDATE ON public.vibes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_title_emotional_signatures_updated_at 
    BEFORE UPDATE ON public.viib_emotion_classified_titles 
    FOR EACH ROW EXECUTE FUNCTION update_title_emotional_signatures_updated_at();

CREATE TRIGGER trigger_update_viib_intent_classified_titles_updated_at 
    BEFORE UPDATE ON public.viib_intent_classified_titles 
    FOR EACH ROW EXECUTE FUNCTION update_viib_intent_classified_titles_updated_at();


-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY POLICIES
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

-- Sample RLS Policies (service_role full access)
CREATE POLICY activation_codes_service ON public.activation_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY app_settings_service ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_config_service ON public.email_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_templates_service ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_verifications_service_role_all ON public.email_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY jobs_service ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read policies
CREATE POLICY emotion_master_public_read ON public.emotion_master FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY genres_public_read ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY keywords_public_read ON public.keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY episodes_public_read ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY seasons_public_read ON public.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY titles_public_read ON public.titles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY streaming_services_public_read ON public.streaming_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY spoken_languages_public_read ON public.spoken_languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY enabled_countries_read ON public.enabled_countries FOR SELECT TO public USING (true);

-- Authenticated user policies
CREATE POLICY feedback_insert_auth ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY friend_connections_auth ON public.friend_connections FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth())) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_interactions_auth ON public.user_title_interactions FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_vibe_preferences_auth ON public.user_vibe_preferences FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (id = get_user_id_from_auth());
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (id = get_user_id_from_auth());


-- ============================================================================
-- END OF SCHEMA DUMP
-- ============================================================================
