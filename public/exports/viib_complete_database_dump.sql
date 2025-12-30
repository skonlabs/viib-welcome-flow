-- =====================================================
-- ViiB Complete Database Schema Dump
-- Generated: 2024-12-30
-- =====================================================

-- =====================================================
-- PART 1: ENUM TYPES
-- =====================================================

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

-- =====================================================
-- PART 2: TABLES
-- =====================================================

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
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    otp_hash text,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
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

-- Table: emotion_master
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
    CONSTRAINT uq_emotion_label_category UNIQUE (emotion_label, category)
);

-- Table: emotion_to_intent_map
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    intent_type text NOT NULL,
    weight real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_to_intent_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_to_intent_map_emotion_intent_unique UNIQUE (emotion_id, intent_type),
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

-- Table: episodes
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
    CONSTRAINT episodes_pkey PRIMARY KEY (id)
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

-- Table: friend_connections
CREATE TABLE public.friend_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    friend_user_id uuid NOT NULL,
    trust_score real NOT NULL DEFAULT 0.5,
    relationship_type text,
    is_blocked boolean DEFAULT false,
    is_muted boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT friend_connections_pkey PRIMARY KEY (id),
    CONSTRAINT friend_connections_user_friend_unique UNIQUE (user_id, friend_user_id)
);

-- Table: genres
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    genre_name text NOT NULL,
    tmdb_genre_id integer,
    CONSTRAINT genres_pkey PRIMARY KEY (id),
    CONSTRAINT genres_genre_name_key UNIQUE (genre_name)
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

-- Table: jobs
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_name text NOT NULL,
    job_type text NOT NULL,
    status text NOT NULL DEFAULT 'idle'::text,
    is_active boolean NOT NULL DEFAULT true,
    configuration jsonb DEFAULT '{}'::jsonb,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    last_run_duration_seconds integer,
    total_titles_processed integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT jobs_pkey PRIMARY KEY (id)
);

-- Table: keywords
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tmdb_keyword_id integer,
    CONSTRAINT keywords_pkey PRIMARY KEY (id),
    CONSTRAINT keywords_name_key UNIQUE (name)
);

-- Table: login_attempts
CREATE TABLE public.login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    attempt_type text NOT NULL DEFAULT 'password'::text,
    success boolean DEFAULT false,
    ip_address text,
    requires_captcha boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
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

-- Table: phone_verifications
CREATE TABLE public.phone_verifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    is_locked boolean DEFAULT false,
    otp_hash text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT phone_verifications_pkey PRIMARY KEY (id)
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
    CONSTRAINT rate_limit_config_pkey PRIMARY KEY (id),
    CONSTRAINT rate_limit_config_endpoint_key UNIQUE (endpoint)
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
    CONSTRAINT seasons_pkey PRIMARY KEY (id),
    CONSTRAINT seasons_title_season_unique UNIQUE (title_id, season_number)
);

-- Table: session_tokens
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
    CONSTRAINT streaming_services_pkey PRIMARY KEY (id),
    CONSTRAINT streaming_services_service_name_key UNIQUE (service_name)
);

-- Table: system_logs
CREATE TABLE public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    severity text NOT NULL DEFAULT 'error'::text,
    error_message text NOT NULL,
    error_stack text,
    screen text,
    operation text,
    context jsonb,
    http_status integer,
    resolved boolean NOT NULL DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT system_logs_pkey PRIMARY KEY (id)
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

-- Table: title_emotional_signatures
CREATE TABLE public.title_emotional_signatures (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_emotional_signatures_pkey PRIMARY KEY (title_id, emotion_id)
);

-- Table: title_genres
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id)
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
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_social_summary_pkey PRIMARY KEY (title_id)
);

-- Table: title_streaming_availability
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    region_code text NOT NULL,
    CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- Table: title_transformation_scores
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_transformation_scores_pkey PRIMARY KEY (title_id, user_emotion_id)
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

-- Table: titles
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
    title_genres json,
    classification_status text DEFAULT 'pending'::text,
    last_classified_at timestamp with time zone,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT titles_pkey PRIMARY KEY (id),
    CONSTRAINT titles_tmdb_type_unique UNIQUE (tmdb_id, title_type)
);

-- Table: tmdb_genre_mappings
CREATE TABLE public.tmdb_genre_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_genre_id integer NOT NULL,
    genre_name text NOT NULL,
    media_type text NOT NULL DEFAULT 'both'::text,
    tv_equivalent_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_genre_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT tmdb_genre_mappings_genre_media_unique UNIQUE (tmdb_genre_id, media_type)
);

-- Table: tmdb_provider_mappings
CREATE TABLE public.tmdb_provider_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_provider_id integer NOT NULL,
    service_name text NOT NULL,
    region_code text NOT NULL DEFAULT 'US'::text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_provider_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT tmdb_provider_mappings_provider_region_unique UNIQUE (tmdb_provider_id, region_code)
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

-- Table: user_language_preferences
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL,
    language_code text NOT NULL,
    priority_order integer,
    CONSTRAINT user_language_preferences_pkey PRIMARY KEY (user_id, language_code)
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
    rating_value public.rating_value DEFAULT 'not_rated'::rating_value,
    watch_duration_percentage real,
    season_number integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_interactions_pkey PRIMARY KEY (id)
);

-- Table: user_title_social_scores
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    social_component_score real NOT NULL,
    social_priority_score real NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_social_scores_pkey PRIMARY KEY (user_id, title_id)
);

-- Table: user_vibe_preferences
CREATE TABLE public.user_vibe_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    vibe_type text NOT NULL,
    vibe_id uuid,
    canonical_key text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_vibe_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_vibe_preferences_user_id_key UNIQUE (user_id)
);

-- Table: users
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_id uuid,
    email text,
    phone_number text,
    username text,
    full_name text,
    password_hash text,
    country text,
    timezone text,
    language_preference text,
    is_active boolean NOT NULL DEFAULT true,
    is_email_verified boolean NOT NULL DEFAULT false,
    is_phone_verified boolean NOT NULL DEFAULT false,
    is_age_over_18 boolean NOT NULL,
    onboarding_completed boolean NOT NULL DEFAULT false,
    last_onboarding_step text,
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

-- Table: vibe_emotion_weights
CREATE TABLE public.vibe_emotion_weights (
    vibe_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_emotion_weights_pkey PRIMARY KEY (vibe_id, emotion_id)
);

-- Table: vibe_genre_weights
CREATE TABLE public.vibe_genre_weights (
    vibe_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_pkey PRIMARY KEY (vibe_id, genre_id)
);

-- Table: vibe_genre_weights_key
CREATE TABLE public.vibe_genre_weights_key (
    canonical_key text NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_key_pkey PRIMARY KEY (canonical_key, genre_id)
);

-- Table: vibe_list_followers
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    followed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_followers_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_followers_list_user_unique UNIQUE (vibe_list_id, follower_user_id)
);

-- Table: vibe_list_items
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    title_id uuid NOT NULL,
    added_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_items_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_items_list_title_unique UNIQUE (vibe_list_id, title_id)
);

-- Table: vibe_list_shared_with
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    shared_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_shared_with_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_shared_with_list_user_unique UNIQUE (vibe_list_id, shared_with_user_id)
);

-- Table: vibe_list_views
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    viewer_user_id uuid,
    viewed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_views_pkey PRIMARY KEY (id)
);

-- Table: vibe_lists
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean NOT NULL DEFAULT false,
    cover_image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_lists_pkey PRIMARY KEY (id)
);

-- Table: vibes
CREATE TABLE public.vibes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    canonical_key text NOT NULL,
    display_name text NOT NULL,
    description text,
    icon_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibes_pkey PRIMARY KEY (id),
    CONSTRAINT vibes_canonical_key_key UNIQUE (canonical_key)
);

-- Table: viib_emotion_classified_titles
CREATE TABLE public.viib_emotion_classified_titles (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_pkey PRIMARY KEY (title_id, emotion_id)
);

-- Table: viib_emotion_classified_titles_staging
CREATE TABLE public.viib_emotion_classified_titles_staging (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_staging_pkey PRIMARY KEY (title_id, emotion_id)
);

-- Table: viib_intent_classified_titles
CREATE TABLE public.viib_intent_classified_titles (
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_pkey PRIMARY KEY (title_id, intent_type)
);

-- Table: viib_intent_classified_titles_staging
CREATE TABLE public.viib_intent_classified_titles_staging (
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
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

-- Table: viib_weight_config
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

-- =====================================================
-- PART 3: FOREIGN KEY CONSTRAINTS
-- =====================================================

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
ALTER TABLE public.title_emotional_signatures ADD CONSTRAINT title_emotional_signatures_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id);
ALTER TABLE public.title_emotional_signatures ADD CONSTRAINT title_emotional_signatures_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);
ALTER TABLE public.title_genres ADD CONSTRAINT title_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id);
ALTER TABLE public.title_genres ADD CONSTRAINT title_genres_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);
ALTER TABLE public.title_intent_alignment_scores ADD CONSTRAINT title_intent_alignment_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);
ALTER TABLE public.title_intent_alignment_scores ADD CONSTRAINT title_intent_alignment_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id);
ALTER TABLE public.title_social_summary ADD CONSTRAINT title_social_summary_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id);
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

-- =====================================================
-- PART 4: INDEXES
-- =====================================================

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
CREATE INDEX idx_emotion_display_phrases_emotion_id ON public.emotion_display_phrases USING btree (emotion_id);
CREATE INDEX idx_emotion_master_category ON public.emotion_master USING btree (category);
CREATE INDEX idx_emotion_master_label ON public.emotion_master USING btree (emotion_label);
CREATE INDEX idx_emotion_to_intent_map_emotion ON public.emotion_to_intent_map USING btree (emotion_id);
CREATE INDEX idx_emotion_transformation_map_content ON public.emotion_transformation_map USING btree (content_emotion_id);
CREATE INDEX idx_emotion_transformation_map_user ON public.emotion_transformation_map USING btree (user_emotion_id);
CREATE INDEX idx_episodes_season ON public.episodes USING btree (season_id);
CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX idx_feedback_type ON public.feedback USING btree (type);
CREATE INDEX idx_feedback_user_id ON public.feedback USING btree (user_id);
CREATE INDEX idx_friend_connections_friend ON public.friend_connections USING btree (friend_user_id);
CREATE INDEX idx_friend_connections_user ON public.friend_connections USING btree (user_id);
CREATE INDEX idx_genres_name ON public.genres USING btree (genre_name);
CREATE INDEX idx_genres_tmdb_id ON public.genres USING btree (tmdb_genre_id);
CREATE INDEX idx_jobs_active ON public.jobs USING btree (is_active);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_jobs_type ON public.jobs USING btree (job_type);
CREATE INDEX idx_keywords_name ON public.keywords USING btree (name);
CREATE INDEX idx_keywords_tmdb_id ON public.keywords USING btree (tmdb_keyword_id);
CREATE INDEX idx_login_attempts_created ON public.login_attempts USING btree (created_at);
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts USING btree (identifier);
CREATE INDEX idx_official_trailer_channels_active ON public.official_trailer_channels USING btree (is_active);
CREATE INDEX idx_official_trailer_channels_language ON public.official_trailer_channels USING btree (language_code);
CREATE INDEX idx_personality_profiles_user ON public.personality_profiles USING btree (user_id);
CREATE INDEX idx_phone_verifications_expires ON public.phone_verifications USING btree (expires_at);
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications USING btree (phone_number);
CREATE INDEX idx_rate_limit_entries_expires ON public.rate_limit_entries USING btree (expires_at);
CREATE INDEX idx_rate_limit_entries_key ON public.rate_limit_entries USING btree (key);
CREATE INDEX idx_recommendation_notifications_receiver ON public.recommendation_notifications USING btree (receiver_user_id);
CREATE INDEX idx_recommendation_notifications_sender ON public.recommendation_notifications USING btree (sender_user_id);
CREATE INDEX idx_recommendation_outcomes_created ON public.recommendation_outcomes USING btree (created_at);
CREATE INDEX idx_recommendation_outcomes_title ON public.recommendation_outcomes USING btree (title_id);
CREATE INDEX idx_recommendation_outcomes_user ON public.recommendation_outcomes USING btree (user_id);
CREATE INDEX idx_seasons_title ON public.seasons USING btree (title_id);
CREATE INDEX idx_session_tokens_expires ON public.session_tokens USING btree (expires_at);
CREATE INDEX idx_session_tokens_user ON public.session_tokens USING btree (user_id);
CREATE INDEX idx_streaming_services_active ON public.streaming_services USING btree (is_active);
CREATE INDEX idx_system_logs_created ON public.system_logs USING btree (created_at);
CREATE INDEX idx_system_logs_resolved ON public.system_logs USING btree (resolved);
CREATE INDEX idx_system_logs_severity ON public.system_logs USING btree (severity);
CREATE INDEX idx_system_logs_user ON public.system_logs USING btree (user_id);
CREATE INDEX idx_title_emotion_vectors_updated ON public.title_emotion_vectors USING btree (updated_at);
CREATE INDEX idx_title_emotional_signatures_emotion ON public.title_emotional_signatures USING btree (emotion_id);
CREATE INDEX idx_title_emotional_signatures_title ON public.title_emotional_signatures USING btree (title_id);
CREATE INDEX idx_title_genres_genre ON public.title_genres USING btree (genre_id);
CREATE INDEX idx_title_genres_title ON public.title_genres USING btree (title_id);
CREATE INDEX idx_title_intent_alignment_emotion ON public.title_intent_alignment_scores USING btree (user_emotion_id);
CREATE INDEX idx_title_intent_alignment_title ON public.title_intent_alignment_scores USING btree (title_id);
CREATE INDEX idx_title_social_summary_title ON public.title_social_summary USING btree (title_id);
CREATE INDEX idx_title_streaming_availability_region ON public.title_streaming_availability USING btree (region_code);
CREATE INDEX idx_title_streaming_availability_service ON public.title_streaming_availability USING btree (streaming_service_id);
CREATE INDEX idx_title_streaming_availability_title ON public.title_streaming_availability USING btree (title_id);
CREATE INDEX idx_title_transformation_emotion ON public.title_transformation_scores USING btree (user_emotion_id);
CREATE INDEX idx_title_transformation_title ON public.title_transformation_scores USING btree (title_id);
CREATE INDEX idx_title_user_emotion_cache_title ON public.title_user_emotion_match_cache USING btree (title_id);
CREATE INDEX idx_title_user_emotion_cache_user_emotion ON public.title_user_emotion_match_cache USING btree (user_emotion_id);
CREATE INDEX idx_titles_classification_status ON public.titles USING btree (classification_status);
CREATE INDEX idx_titles_created_at ON public.titles USING btree (created_at);
CREATE INDEX idx_titles_name ON public.titles USING btree (name);
CREATE INDEX idx_titles_original_language ON public.titles USING btree (original_language);
CREATE INDEX idx_titles_popularity ON public.titles USING btree (popularity DESC);
CREATE INDEX idx_titles_release_date ON public.titles USING btree (release_date);
CREATE INDEX idx_titles_tmdb_id ON public.titles USING btree (tmdb_id);
CREATE INDEX idx_titles_type ON public.titles USING btree (title_type);
CREATE INDEX idx_tmdb_genre_mappings_active ON public.tmdb_genre_mappings USING btree (is_active);
CREATE INDEX idx_tmdb_genre_mappings_tmdb_id ON public.tmdb_genre_mappings USING btree (tmdb_genre_id);
CREATE INDEX idx_tmdb_provider_mappings_active ON public.tmdb_provider_mappings USING btree (is_active);
CREATE INDEX idx_tmdb_provider_mappings_region ON public.tmdb_provider_mappings USING btree (region_code);
CREATE INDEX idx_tmdb_provider_mappings_tmdb_id ON public.tmdb_provider_mappings USING btree (tmdb_provider_id);
CREATE INDEX idx_user_context_logs_created ON public.user_context_logs USING btree (created_at);
CREATE INDEX idx_user_context_logs_user ON public.user_context_logs USING btree (user_id);
CREATE INDEX idx_user_emotion_states_created ON public.user_emotion_states USING btree (created_at);
CREATE INDEX idx_user_emotion_states_emotion ON public.user_emotion_states USING btree (emotion_id);
CREATE INDEX idx_user_emotion_states_user ON public.user_emotion_states USING btree (user_id);
CREATE INDEX idx_user_language_preferences_language ON public.user_language_preferences USING btree (language_code);
CREATE INDEX idx_user_language_preferences_user ON public.user_language_preferences USING btree (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);
CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_social_recommendations_receiver ON public.user_social_recommendations USING btree (receiver_user_id);
CREATE INDEX idx_user_social_recommendations_sender ON public.user_social_recommendations USING btree (sender_user_id);
CREATE INDEX idx_user_social_recommendations_title ON public.user_social_recommendations USING btree (title_id);
CREATE INDEX idx_user_streaming_subscriptions_active ON public.user_streaming_subscriptions USING btree (is_active);
CREATE INDEX idx_user_streaming_subscriptions_service ON public.user_streaming_subscriptions USING btree (streaming_service_id);
CREATE INDEX idx_user_streaming_subscriptions_user ON public.user_streaming_subscriptions USING btree (user_id);
CREATE INDEX idx_user_title_interactions_created ON public.user_title_interactions USING btree (created_at);
CREATE INDEX idx_user_title_interactions_rating ON public.user_title_interactions USING btree (rating_value);
CREATE INDEX idx_user_title_interactions_title ON public.user_title_interactions USING btree (title_id);
CREATE INDEX idx_user_title_interactions_type ON public.user_title_interactions USING btree (interaction_type);
CREATE INDEX idx_user_title_interactions_user ON public.user_title_interactions USING btree (user_id);
CREATE INDEX idx_user_title_social_scores_title ON public.user_title_social_scores USING btree (title_id);
CREATE INDEX idx_user_title_social_scores_user ON public.user_title_social_scores USING btree (user_id);
CREATE INDEX idx_user_vibe_preferences_canonical ON public.user_vibe_preferences USING btree (canonical_key);
CREATE INDEX idx_user_vibe_preferences_user ON public.user_vibe_preferences USING btree (user_id);
CREATE INDEX idx_users_auth_id ON public.users USING btree (auth_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);
CREATE INDEX idx_users_username ON public.users USING btree (username);
CREATE INDEX idx_vibe_emotion_weights_emotion ON public.vibe_emotion_weights USING btree (emotion_id);
CREATE INDEX idx_vibe_emotion_weights_vibe ON public.vibe_emotion_weights USING btree (vibe_id);
CREATE INDEX idx_vibe_genre_weights_genre ON public.vibe_genre_weights USING btree (genre_id);
CREATE INDEX idx_vibe_genre_weights_key_canonical ON public.vibe_genre_weights_key USING btree (canonical_key);
CREATE INDEX idx_vibe_genre_weights_key_genre ON public.vibe_genre_weights_key USING btree (genre_id);
CREATE INDEX idx_vibe_genre_weights_vibe ON public.vibe_genre_weights USING btree (vibe_id);
CREATE INDEX idx_vibe_list_followers_follower ON public.vibe_list_followers USING btree (follower_user_id);
CREATE INDEX idx_vibe_list_followers_list ON public.vibe_list_followers USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_items_list ON public.vibe_list_items USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_items_title ON public.vibe_list_items USING btree (title_id);
CREATE INDEX idx_vibe_list_shared_with_list ON public.vibe_list_shared_with USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_shared_with_user ON public.vibe_list_shared_with USING btree (shared_with_user_id);
CREATE INDEX idx_vibe_list_views_list ON public.vibe_list_views USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_views_viewer ON public.vibe_list_views USING btree (viewer_user_id);
CREATE INDEX idx_vibe_lists_public ON public.vibe_lists USING btree (is_public);
CREATE INDEX idx_vibe_lists_user ON public.vibe_lists USING btree (user_id);
CREATE INDEX idx_vibes_active ON public.vibes USING btree (is_active);
CREATE INDEX idx_vibes_canonical_key ON public.vibes USING btree (canonical_key);
CREATE INDEX idx_viib_emotion_classified_emotion ON public.viib_emotion_classified_titles USING btree (emotion_id);
CREATE INDEX idx_viib_emotion_classified_title ON public.viib_emotion_classified_titles USING btree (title_id);
CREATE INDEX idx_viib_emotion_classified_updated ON public.viib_emotion_classified_titles USING btree (updated_at);
CREATE INDEX idx_viib_emotion_staging_title ON public.viib_emotion_classified_titles_staging USING btree (title_id);
CREATE INDEX idx_viib_intent_classified_intent ON public.viib_intent_classified_titles USING btree (intent_type);
CREATE INDEX idx_viib_intent_classified_title ON public.viib_intent_classified_titles USING btree (title_id);
CREATE INDEX idx_viib_intent_classified_updated ON public.viib_intent_classified_titles USING btree (updated_at);
CREATE INDEX idx_viib_intent_staging_title ON public.viib_intent_classified_titles_staging USING btree (title_id);
CREATE INDEX idx_viib_title_intent_stats_intent ON public.viib_title_intent_stats USING btree (primary_intent_type);
CREATE INDEX idx_viib_weight_config_active ON public.viib_weight_config USING btree (is_active);

-- =====================================================
-- PART 5: VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.viib_recommendation_debug AS
SELECT
    NULL::uuid AS user_id,
    NULL::uuid AS title_id,
    NULL::real AS base_viib_score,
    NULL::real AS social_priority_score,
    NULL::real AS final_score
WHERE false;

-- =====================================================
-- PART 6: FUNCTIONS
-- =====================================================

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

CREATE OR REPLACE FUNCTION public.cascade_refresh_emotion_scores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    ON CONFLICT (title_id)
    DO UPDATE SET
        valence = EXCLUDED.valence,
        arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance,
        updated_at = now();

    INSERT INTO public.title_transformation_scores (title_id, user_emotion_id, transformation_score, updated_at)
    SELECT
        vect.title_id,
        etm.user_emotion_id,
        MAX(
            etm.confidence_score *
            CASE etm.transformation_type
                WHEN 'amplify' THEN 1.0
                WHEN 'complementary' THEN 0.95
                WHEN 'soothe' THEN 0.9
                WHEN 'validate' THEN 0.85
                WHEN 'reinforcing' THEN 0.8
                WHEN 'neutral_balancing' THEN 0.7
                WHEN 'stabilize' THEN 0.65
                ELSE 0.5
            END *
            (vect.intensity_level / 10.0)
        )::real AS transformation_score,
        now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em_content
        ON em_content.id = vect.emotion_id
       AND em_content.category = 'content_state'
    JOIN emotion_transformation_map etm
        ON etm.content_emotion_id = vect.emotion_id
    WHERE vect.title_id = COALESCE(NEW.title_id, OLD.title_id)
    GROUP BY vect.title_id, etm.user_emotion_id
    ON CONFLICT (title_id, user_emotion_id)
    DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = now();

    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_ip_address text, p_endpoint text, p_max_requests integer DEFAULT 10, p_window_seconds integer DEFAULT 60)
 RETURNS TABLE(allowed boolean, current_count integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
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
    SET
        request_count = CASE
            WHEN ip_rate_limits.window_start < v_window_start THEN 1
            ELSE ip_rate_limits.request_count + 1
        END,
        window_start = CASE
            WHEN ip_rate_limits.window_start < v_window_start THEN NOW()
            ELSE ip_rate_limits.window_start
        END
    RETURNING ip_rate_limits.request_count, ip_rate_limits.window_start
    INTO v_current_count, v_window_start;
    v_reset_at := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN QUERY SELECT v_current_count <= p_max_requests, v_current_count, v_reset_at;
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

CREATE OR REPLACE FUNCTION public.check_rate_limit_fast(p_key text, p_max_count integer, p_window_seconds integer)
 RETURNS TABLE(allowed boolean, current_count integer, requires_captcha boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
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
        count = CASE
            WHEN rate_limit_entries.window_start < v_window_start THEN 1
            ELSE rate_limit_entries.count + 1
        END,
        window_start = CASE
            WHEN rate_limit_entries.window_start < v_window_start THEN v_now
            ELSE rate_limit_entries.window_start
        END,
        expires_at = CASE
            WHEN rate_limit_entries.window_start < v_window_start THEN v_expires_at
            ELSE rate_limit_entries.expires_at
        END
    RETURNING rate_limit_entries.count INTO v_current;
    RETURN QUERY SELECT v_current <= p_max_count, v_current, v_current >= v_captcha_threshold AND v_current <= p_max_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_recommendation_cache_freshness()
 RETURNS TABLE(cache_name text, row_count bigint, oldest_update timestamp with time zone, newest_update timestamp with time zone, age_hours numeric, needs_refresh boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT 'title_emotion_vectors', COUNT(*)::bigint, MIN(updated_at), MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_emotion_vectors
    UNION ALL
    SELECT 'title_transformation_scores', COUNT(*)::bigint, MIN(updated_at), MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_transformation_scores
    UNION ALL
    SELECT 'title_intent_alignment_scores', COUNT(*)::bigint, MIN(updated_at), MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_intent_alignment_scores
    UNION ALL
    SELECT 'title_social_summary', COUNT(*)::bigint, MIN(updated_at), MAX(updated_at),
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600,
        EXTRACT(EPOCH FROM (now() - MAX(updated_at))) / 3600 > 24
    FROM title_social_summary;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_data()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM ip_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_count INTEGER;
BEGIN
    DELETE FROM rate_limit_entries WHERE expires_at < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_value text;
BEGIN
  SELECT setting_value::text INTO v_value FROM app_settings WHERE setting_key = p_key LIMIT 1;
  RETURN COALESCE(v_value, p_default);
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, database text, active boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  SELECT jobid, jobname, schedule, command, database, active FROM cron.job ORDER BY jobid;
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
    SELECT emotion_id, intensity INTO v_emotion_id, v_intensity
    FROM user_emotion_states WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1;
    IF v_emotion_id IS NULL THEN RETURN 'Emotionally Neutral'; END IF;
    SELECT display_phrase INTO v_phrase FROM emotion_display_phrases
    WHERE emotion_id = v_emotion_id AND v_intensity >= min_intensity AND v_intensity < max_intensity LIMIT 1;
    RETURN COALESCE(v_phrase, 'Emotionally Balanced');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_job_classification_metrics()
 RETURNS TABLE(total_titles bigint, emotion_primary_distinct bigint, emotion_staging_distinct bigint, intent_primary_distinct bigint, intent_staging_distinct bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET statement_timeout TO '120s'
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT COUNT(*) FROM titles)::bigint AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles)::bigint AS emotion_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles_staging)::bigint AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles)::bigint AS intent_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles_staging)::bigint AS intent_staging_distinct;
$function$;

CREATE OR REPLACE FUNCTION public.get_lockout_remaining(p_identifier text, p_window_minutes integer DEFAULT 15)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_last_attempt TIMESTAMPTZ;
    v_remaining_seconds INTEGER;
BEGIN
    SELECT MAX(created_at) INTO v_last_attempt FROM login_attempts WHERE identifier = p_identifier AND success = FALSE;
    IF v_last_attempt IS NULL THEN RETURN 0; END IF;
    v_remaining_seconds := EXTRACT(EPOCH FROM (v_last_attempt + (p_window_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER;
    RETURN GREATEST(0, v_remaining_seconds);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_result_emotion_label(p_emotion_label text, p_intensity real)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_prefix TEXT;
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

CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, title_type text, overview text, trailer_transcript text, original_language text, title_genres json)
 LANGUAGE sql
 STABLE
 SET statement_timeout TO '120s'
 SET search_path TO 'public'
AS $function$
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
$function$;

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

CREATE OR REPLACE FUNCTION public.hash_otp(p_otp text, p_salt text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE jobs SET total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment, last_run_at = NOW()
  WHERE job_type = p_job_type;
END;
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

CREATE OR REPLACE FUNCTION public.is_account_locked(p_identifier text, p_window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_failed_count INTEGER;
    v_lockout_threshold INTEGER := 5;
BEGIN
    SELECT COUNT(*) INTO v_failed_count FROM login_attempts
    WHERE identifier = p_identifier AND success = FALSE AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    RETURN v_failed_count >= v_lockout_threshold;
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

CREATE OR REPLACE FUNCTION public.promote_title_emotions(p_limit integer DEFAULT 500)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD; c INTEGER := 0;
BEGIN
  FOR r IN SELECT DISTINCT title_id FROM viib_emotion_classified_titles_staging ORDER BY title_id LIMIT p_limit
  LOOP
    DELETE FROM viib_emotion_classified_titles WHERE title_id = r.title_id;
    INSERT INTO viib_emotion_classified_titles
    SELECT title_id, emotion_id, intensity_level, source, now(), now()
    FROM viib_emotion_classified_titles_staging WHERE title_id = r.title_id;
    DELETE FROM viib_emotion_classified_titles_staging WHERE title_id = r.title_id;
    c := c + 1;
  END LOOP;
  RETURN c;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier text, p_success boolean, p_ip_address text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO login_attempts (identifier, success, ip_address) VALUES (p_identifier, p_success, p_ip_address);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.title_emotion_vectors (title_id, valence, arousal, dominance, emotion_strength, updated_at)
    SELECT
        vect.title_id,
        COALESCE(AVG(em.valence * (vect.intensity_level / 10.0)), 0.5)::real AS valence,
        COALESCE(AVG(em.arousal * (vect.intensity_level / 10.0)), 0.5)::real AS arousal,
        COALESCE(AVG(em.dominance * (vect.intensity_level / 10.0)), 0.5)::real AS dominance,
        COALESCE(AVG(vect.intensity_level / 10.0), 0.5)::real AS emotion_strength,
        now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em ON em.id = vect.emotion_id
    GROUP BY vect.title_id
    ON CONFLICT (title_id) DO UPDATE SET
        valence = EXCLUDED.valence,
        arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance,
        emotion_strength = EXCLUDED.emotion_strength,
        updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.title_intent_alignment_scores (title_id, user_emotion_id, alignment_score, updated_at)
    SELECT
        vit.title_id, etim.emotion_id AS user_emotion_id,
        SUM(vit.confidence_score * etim.weight)::real AS alignment_score, now() AS updated_at
    FROM viib_intent_classified_titles vit
    JOIN emotion_to_intent_map etim ON etim.intent_type = vit.intent_type
    GROUP BY vit.title_id, etim.emotion_id
    ON CONFLICT (title_id, user_emotion_id) DO UPDATE SET
        alignment_score = EXCLUDED.alignment_score, updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
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

CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO viib_title_intent_stats (title_id, primary_intent_type, primary_confidence_score, intent_count, last_computed_at)
  SELECT p_title_id,
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

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count INTEGER;
BEGIN
    UPDATE session_tokens SET revoked_at = NOW() WHERE user_id = p_user_id AND revoked_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
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

CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_emotion_label TEXT;
BEGIN
    v_emotion_label := CASE LOWER(p_mood_text)
        WHEN 'happy' THEN 'joyful' WHEN 'sad' THEN 'melancholic' WHEN 'excited' THEN 'excited'
        WHEN 'anxious' THEN 'anxious' WHEN 'calm' THEN 'serene' WHEN 'angry' THEN 'frustrated'
        WHEN 'bored' THEN 'bored' WHEN 'curious' THEN 'curious' WHEN 'nostalgic' THEN 'nostalgic'
        WHEN 'romantic' THEN 'romantic' ELSE 'neutral'
    END;
    PERFORM store_user_emotion_vector(p_user_id, v_emotion_label, p_energy_percentage);
    RETURN v_emotion_label;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
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

CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at()
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

CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

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
    d_emotional REAL; d_social REAL; d_hist REAL; d_context REAL; d_novelty REAL;
    sum_delta REAL;
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
    ELSE avg_s_emotional := 0; avg_s_social := 0; avg_s_hist := 0; avg_s_context := 0; avg_s_novelty := 0;
    END IF;
    IF f_count > 0 THEN
        avg_f_emotional := f_emotional / f_count; avg_f_social := f_social / f_count;
        avg_f_hist := f_historical / f_count; avg_f_context := f_context / f_count; avg_f_novelty := f_novelty / f_count;
    ELSE avg_f_emotional := 0; avg_f_social := 0; avg_f_hist := 0; avg_f_context := 0; avg_f_novelty := 0;
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
    SELECT ues.emotion_id INTO v_user_emotion_id FROM user_emotion_states ues WHERE ues.user_id = p_user_id ORDER BY created_at DESC LIMIT 1;
    IF v_user_emotion_id IS NOT NULL THEN
        SELECT COALESCE(tias.alignment_score, 0.5) INTO v_alignment_score
        FROM title_intent_alignment_scores tias WHERE tias.title_id = p_title_id AND tias.user_emotion_id = v_user_emotion_id;
    END IF;
    RETURN COALESCE(v_alignment_score, 0.5);
END;
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

CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid)
 RETURNS real
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_score real := 0.0;
BEGIN
    SELECT COALESCE(MAX(fc.trust_score * calculate_taste_similarity(p_user_id, fc.friend_user_id)), 0.0)
    INTO v_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc ON fc.user_id = p_user_id AND fc.friend_user_id = usr.sender_user_id AND fc.is_blocked = FALSE
    WHERE usr.receiver_user_id = p_user_id AND usr.title_id = p_title_id;
    RETURN LEAST(GREATEST(v_score, 0.0), 1.0);
END;
$function$;

-- NOTE: viib_score_components and get_top_recommendations_v4 are large functions
-- They are included in the database but omitted here for brevity
-- See the full function definitions in the database

-- =====================================================
-- PART 7: TRIGGERS
-- =====================================================

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_app_settings_updated_at();
CREATE TRIGGER update_email_config_updated_at BEFORE UPDATE ON public.email_config FOR EACH ROW EXECUTE FUNCTION update_email_config_updated_at();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION update_email_templates_updated_at();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();
CREATE TRIGGER update_rate_limit_config_updated_at BEFORE UPDATE ON public.rate_limit_config FOR EACH ROW EXECUTE FUNCTION update_rate_limit_config_updated_at();
CREATE TRIGGER update_title_emotional_signatures_updated_at BEFORE UPDATE ON public.title_emotional_signatures FOR EACH ROW EXECUTE FUNCTION update_title_emotional_signatures_updated_at();
CREATE TRIGGER update_user_vibe_preferences_updated_at BEFORE UPDATE ON public.user_vibe_preferences FOR EACH ROW EXECUTE FUNCTION update_vibe_preferences_updated_at();
CREATE TRIGGER update_vibe_lists_updated_at BEFORE UPDATE ON public.vibe_lists FOR EACH ROW EXECUTE FUNCTION update_vibe_lists_updated_at();
CREATE TRIGGER update_viib_intent_classified_titles_updated_at BEFORE UPDATE ON public.viib_intent_classified_titles FOR EACH ROW EXECUTE FUNCTION update_viib_intent_classified_titles_updated_at();
CREATE TRIGGER cascade_refresh_emotion_scores_trigger AFTER INSERT OR UPDATE OR DELETE ON public.viib_emotion_classified_titles FOR EACH ROW EXECUTE FUNCTION cascade_refresh_emotion_scores();

-- =====================================================
-- PART 8: ROW LEVEL SECURITY POLICIES
-- =====================================================

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
ALTER TABLE public.title_emotional_signatures ENABLE ROW LEVEL SECURITY;
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

-- RLS Policies (selected key policies)
CREATE POLICY activation_codes_service ON public.activation_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY app_settings_anon_read ON public.app_settings FOR SELECT TO anon USING ((setting_key !~~ '%secret%'::text) AND (setting_key !~~ '%key%'::text) AND (setting_key !~~ '%password%'::text) AND (setting_key !~~ '%token%'::text));
CREATE POLICY app_settings_service ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_config_service ON public.email_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_templates_service ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_verifications_service_role_all ON public.email_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emotion_display_phrases_public_read ON public.emotion_display_phrases FOR SELECT TO public USING (true);
CREATE POLICY emotion_display_phrases_service ON public.emotion_display_phrases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY emotion_master_public_read ON public.emotion_master FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY emotion_master_service_write ON public.emotion_master FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emotion_to_intent_map_public_read ON public.emotion_to_intent_map FOR SELECT TO public USING (true);
CREATE POLICY emotion_to_intent_map_service ON public.emotion_to_intent_map FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY emotion_transformation_map_public_read ON public.emotion_transformation_map FOR SELECT TO public USING (true);
CREATE POLICY emotion_transformation_map_service ON public.emotion_transformation_map FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage enabled countries" ON public.enabled_countries FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read enabled countries" ON public.enabled_countries FOR SELECT TO public USING (true);
CREATE POLICY episodes_public_read ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY episodes_service_write ON public.episodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY feedback_insert_auth ON public.feedback FOR INSERT TO authenticated WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated USING ((user_id = get_user_id_from_auth()));
CREATE POLICY feedback_service ON public.feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY friend_connections_auth ON public.friend_connections FOR ALL TO authenticated USING (((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth()))) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY friend_connections_service ON public.friend_connections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY genres_public_read ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY genres_service_write ON public.genres FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY ip_rate_limits_service ON public.ip_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY jobs_service ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY keywords_public_read ON public.keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY keywords_service_write ON public.keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY login_attempts_service ON public.login_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY official_trailer_channels_public_read ON public.official_trailer_channels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY official_trailer_channels_service_write ON public.official_trailer_channels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY personality_profiles_auth ON public.personality_profiles FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY personality_profiles_service ON public.personality_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY phone_verifications_service_role_all ON public.phone_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY rate_limit_config_service ON public.rate_limit_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY rate_limit_entries_service ON public.rate_limit_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY recommendation_outcomes_auth ON public.recommendation_outcomes FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY recommendation_outcomes_service ON public.recommendation_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY seasons_public_read ON public.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY seasons_service_write ON public.seasons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY session_tokens_service ON public.session_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY spoken_languages_public_read ON public.spoken_languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY spoken_languages_service_write ON public.spoken_languages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY streaming_services_public_read ON public.streaming_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY streaming_services_service_write ON public.streaming_services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY system_logs_service ON public.system_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_emotion_vectors_public_read ON public.title_emotion_vectors FOR SELECT TO public USING (true);
CREATE POLICY title_emotion_vectors_service ON public.title_emotion_vectors FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY title_genres_public_read ON public.title_genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_genres_service_write ON public.title_genres FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_intent_alignment_scores_service ON public.title_intent_alignment_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_social_summary_public_read ON public.title_social_summary FOR SELECT TO public USING (true);
CREATE POLICY title_social_summary_service ON public.title_social_summary FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY title_streaming_availability_public_read ON public.title_streaming_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_streaming_availability_service_write ON public.title_streaming_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_transformation_scores_public_read ON public.title_transformation_scores FOR SELECT TO public USING (true);
CREATE POLICY title_transformation_scores_service ON public.title_transformation_scores FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY title_user_emotion_match_cache_public_read ON public.title_user_emotion_match_cache FOR SELECT TO public USING (true);
CREATE POLICY title_user_emotion_match_cache_service ON public.title_user_emotion_match_cache FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY titles_public_read ON public.titles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY titles_service_write ON public.titles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR SELECT TO public USING (true);
CREATE POLICY user_context_logs_auth ON public.user_context_logs FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_context_logs_service ON public.user_context_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_emotion_states_service ON public.user_emotion_states FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_language_preferences_auth ON public.user_language_preferences FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_language_preferences_service ON public.user_language_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING ((user_id = get_user_id_from_auth()));
CREATE POLICY user_roles_service ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_social_recommendations_auth ON public.user_social_recommendations FOR ALL TO authenticated USING (((sender_user_id = get_user_id_from_auth()) OR (receiver_user_id = get_user_id_from_auth()))) WITH CHECK ((sender_user_id = get_user_id_from_auth()));
CREATE POLICY user_social_recommendations_service ON public.user_social_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_streaming_subscriptions_auth ON public.user_streaming_subscriptions FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_streaming_subscriptions_service ON public.user_streaming_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_title_interactions_auth ON public.user_title_interactions FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_title_interactions_service ON public.user_title_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_title_social_scores_auth ON public.user_title_social_scores FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_title_social_scores_service ON public.user_title_social_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_vibe_preferences_auth ON public.user_vibe_preferences FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY user_vibe_preferences_service ON public.user_vibe_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING ((auth_id = auth.uid()));
CREATE POLICY users_service_role_all ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING ((auth_id = auth.uid())) WITH CHECK ((auth_id = auth.uid()));
CREATE POLICY vibe_emotion_weights_read_authenticated ON public.vibe_emotion_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_emotion_weights_service_role ON public.vibe_emotion_weights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_genre_weights_read_authenticated ON public.vibe_genre_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_genre_weights_service_role ON public.vibe_genre_weights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_list_followers_auth ON public.vibe_list_followers FOR ALL TO authenticated USING ((follower_user_id = get_user_id_from_auth())) WITH CHECK ((follower_user_id = get_user_id_from_auth()));
CREATE POLICY vibe_list_followers_service ON public.vibe_list_followers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_list_items_auth ON public.vibe_list_items FOR ALL TO authenticated USING ((EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_items.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth()))) WITH CHECK ((EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_items.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth())));
CREATE POLICY vibe_list_items_service ON public.vibe_list_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_lists_auth ON public.vibe_lists FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth())) WITH CHECK ((user_id = get_user_id_from_auth()));
CREATE POLICY vibe_lists_public_read ON public.vibe_lists FOR SELECT TO public USING (is_public = true);
CREATE POLICY vibe_lists_service ON public.vibe_lists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- END OF DUMP
-- =====================================================
