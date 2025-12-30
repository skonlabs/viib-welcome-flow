-- ============================================================================
-- ViiB Complete Database Schema Dump
-- Generated: 2024-12-30
-- Description: Complete SQL dump including all ENUMs, tables, columns, indexes,
--              functions, triggers, views, and RLS policies
-- ============================================================================

-- ============================================================================
-- SECTION 1: CUSTOM ENUM TYPES
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
-- SECTION 2: TABLES WITH COLUMNS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: activation_codes
-- ----------------------------------------------------------------------------
CREATE TABLE public.activation_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_by UUID,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

-- ----------------------------------------------------------------------------
-- Table: app_settings
-- ----------------------------------------------------------------------------
CREATE TABLE public.app_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: email_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.email_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL,
    smtp_user TEXT NOT NULL,
    smtp_password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    use_ssl BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: email_templates
-- ----------------------------------------------------------------------------
CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    template_type TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: email_verifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.email_verifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    otp_hash TEXT,
    attempt_count INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false
);

-- ----------------------------------------------------------------------------
-- Table: emotion_display_phrases
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_display_phrases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    min_intensity REAL NOT NULL,
    max_intensity REAL NOT NULL,
    display_phrase TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (emotion_id, display_phrase),
    UNIQUE (emotion_id, min_intensity, max_intensity)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_master
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_master (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_label TEXT NOT NULL,
    category TEXT NOT NULL,
    valence REAL,
    arousal REAL,
    dominance REAL,
    description TEXT,
    intensity_multiplier REAL DEFAULT 1.0,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE (emotion_label, category)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_to_intent_map
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_to_intent_map (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intent_type TEXT NOT NULL,
    weight REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (emotion_id, intent_type)
);

-- ----------------------------------------------------------------------------
-- Table: emotion_transformation_map
-- ----------------------------------------------------------------------------
CREATE TABLE public.emotion_transformation_map (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    content_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    transformation_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    priority_rank SMALLINT,
    UNIQUE (user_emotion_id, content_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: enabled_countries
-- ----------------------------------------------------------------------------
CREATE TABLE public.enabled_countries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code TEXT NOT NULL UNIQUE,
    country_name TEXT NOT NULL,
    dial_code TEXT NOT NULL,
    flag_emoji TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: episodes
-- ----------------------------------------------------------------------------
CREATE TABLE public.episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES public.seasons(id),
    episode_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    air_date DATE,
    runtime INTEGER,
    still_path TEXT,
    vote_average DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (season_id, episode_number)
);

-- ----------------------------------------------------------------------------
-- Table: feedback
-- ----------------------------------------------------------------------------
CREATE TABLE public.feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: friend_connections
-- ----------------------------------------------------------------------------
CREATE TABLE public.friend_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    friend_user_id UUID NOT NULL REFERENCES public.users(id),
    relationship_type TEXT,
    trust_score REAL NOT NULL DEFAULT 0.5,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: genres
-- ----------------------------------------------------------------------------
CREATE TABLE public.genres (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    genre_name TEXT NOT NULL UNIQUE,
    tmdb_genre_id INTEGER
);

-- ----------------------------------------------------------------------------
-- Table: ip_rate_limits
-- ----------------------------------------------------------------------------
CREATE TABLE public.ip_rate_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (ip_address, endpoint)
);

-- ----------------------------------------------------------------------------
-- Table: jobs
-- ----------------------------------------------------------------------------
CREATE TABLE public.jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    is_active BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    last_run_at TIMESTAMPTZ,
    last_run_duration_seconds INTEGER,
    next_run_at TIMESTAMPTZ,
    total_titles_processed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: keywords
-- ----------------------------------------------------------------------------
CREATE TABLE public.keywords (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    tmdb_keyword_id INTEGER UNIQUE
);

-- ----------------------------------------------------------------------------
-- Table: login_attempts
-- ----------------------------------------------------------------------------
CREATE TABLE public.login_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL,
    ip_address TEXT,
    attempt_type TEXT NOT NULL DEFAULT 'password',
    success BOOLEAN DEFAULT false,
    requires_captcha BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: official_trailer_channels
-- ----------------------------------------------------------------------------
CREATE TABLE public.official_trailer_channels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_name TEXT NOT NULL,
    channel_id TEXT,
    language_code TEXT NOT NULL,
    region TEXT,
    category TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: personality_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE public.personality_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    type_name TEXT,
    description TEXT,
    introversion_score REAL,
    emotional_sensitivity REAL,
    sensation_seeking REAL,
    analytical_thinking REAL,
    empathy_level REAL,
    risk_tolerance REAL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: phone_verifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.phone_verifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    otp_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    is_locked BOOLEAN DEFAULT false
);

-- ----------------------------------------------------------------------------
-- Table: rate_limit_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.rate_limit_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: rate_limit_entries
-- ----------------------------------------------------------------------------
CREATE TABLE public.rate_limit_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: recommendation_notifications
-- ----------------------------------------------------------------------------
CREATE TABLE public.recommendation_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    receiver_user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    notification_type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: recommendation_outcomes
-- ----------------------------------------------------------------------------
CREATE TABLE public.recommendation_outcomes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    was_selected BOOLEAN NOT NULL,
    watch_duration_percentage REAL,
    rating_value public.rating_value,
    recommended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: seasons
-- ----------------------------------------------------------------------------
CREATE TABLE public.seasons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    season_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    poster_path TEXT,
    air_date DATE,
    episode_count INTEGER,
    trailer_url TEXT,
    trailer_transcript TEXT,
    is_tmdb_trailer BOOLEAN DEFAULT true,
    rt_cscore INTEGER,
    rt_ccount INTEGER,
    rt_ascore INTEGER,
    rt_acount INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (title_id, season_number)
);

-- ----------------------------------------------------------------------------
-- Table: session_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE public.session_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    token_hash TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    is_remember_me BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: spoken_languages
-- ----------------------------------------------------------------------------
CREATE TABLE public.spoken_languages (
    iso_639_1 VARCHAR NOT NULL PRIMARY KEY,
    language_name TEXT NOT NULL,
    flag_emoji TEXT
);

-- ----------------------------------------------------------------------------
-- Table: streaming_services
-- ----------------------------------------------------------------------------
CREATE TABLE public.streaming_services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ----------------------------------------------------------------------------
-- Table: system_logs
-- ----------------------------------------------------------------------------
CREATE TABLE public.system_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    severity TEXT NOT NULL DEFAULT 'error',
    error_message TEXT NOT NULL,
    error_stack TEXT,
    screen TEXT,
    operation TEXT,
    http_status INTEGER,
    context JSONB,
    notes TEXT,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: title_emotion_vectors
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_emotion_vectors (
    title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
    valence REAL NOT NULL,
    arousal REAL NOT NULL,
    dominance REAL NOT NULL,
    emotion_strength REAL NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: title_genres
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_genres (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    genre_id UUID NOT NULL REFERENCES public.genres(id),
    PRIMARY KEY (title_id, genre_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_intent_alignment_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_intent_alignment_scores (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    alignment_score REAL NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_social_summary
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_social_summary (
    title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
    social_mean_rating REAL,
    social_rec_power REAL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: title_streaming_availability
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_streaming_availability (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
    region_code TEXT NOT NULL,
    PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- ----------------------------------------------------------------------------
-- Table: title_transformation_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_transformation_scores (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    transformation_score REAL NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: title_user_emotion_match_cache
-- ----------------------------------------------------------------------------
CREATE TABLE public.title_user_emotion_match_cache (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    cosine_score REAL NOT NULL,
    transformation_score REAL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- ----------------------------------------------------------------------------
-- Table: titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.titles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_id INTEGER,
    title_type TEXT,
    name TEXT,
    original_name TEXT,
    original_language TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date DATE,
    first_air_date DATE,
    last_air_date DATE,
    runtime INTEGER,
    episode_run_time INTEGER[],
    vote_average DOUBLE PRECISION,
    popularity DOUBLE PRECISION,
    status TEXT,
    imdb_id TEXT,
    certification TEXT,
    is_adult BOOLEAN DEFAULT false,
    trailer_url TEXT,
    trailer_transcript TEXT,
    is_tmdb_trailer BOOLEAN DEFAULT true,
    rt_cscore INTEGER,
    rt_ccount INTEGER,
    rt_ascore INTEGER,
    rt_acount INTEGER,
    title_genres JSON,
    classification_status TEXT DEFAULT 'pending',
    last_classified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: tmdb_genre_mappings
-- ----------------------------------------------------------------------------
CREATE TABLE public.tmdb_genre_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_genre_id INTEGER NOT NULL,
    genre_name TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'both',
    tv_equivalent_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: tmdb_provider_mappings
-- ----------------------------------------------------------------------------
CREATE TABLE public.tmdb_provider_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_provider_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    region_code TEXT NOT NULL DEFAULT 'US',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_context_logs
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_context_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    device_type TEXT,
    location_type TEXT,
    time_of_day_bucket TEXT,
    session_length_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_emotion_states
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_emotion_states (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intensity REAL NOT NULL DEFAULT 0.1,
    valence REAL,
    arousal REAL,
    dominance REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_language_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_language_preferences (
    user_id UUID NOT NULL REFERENCES public.users(id),
    language_code TEXT NOT NULL REFERENCES public.spoken_languages(iso_639_1),
    priority_order INTEGER,
    PRIMARY KEY (user_id, language_code)
);

-- ----------------------------------------------------------------------------
-- Table: user_roles
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_social_recommendations
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_social_recommendations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    receiver_user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_streaming_subscriptions
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_streaming_subscriptions (
    user_id UUID NOT NULL REFERENCES public.users(id),
    streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, streaming_service_id)
);

-- ----------------------------------------------------------------------------
-- Table: user_title_interactions
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_title_interactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value DEFAULT 'not_rated',
    watch_duration_percentage REAL,
    season_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: user_title_social_scores
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_title_social_scores (
    user_id UUID NOT NULL,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    social_component_score REAL NOT NULL,
    social_priority_score REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, title_id)
);

-- ----------------------------------------------------------------------------
-- Table: user_vibe_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_vibe_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id),
    vibe_type TEXT NOT NULL,
    vibe_id UUID,
    canonical_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID UNIQUE,
    email TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    country TEXT,
    ip_address TEXT,
    ip_country TEXT,
    signup_method TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_age_over_18 BOOLEAN NOT NULL DEFAULT false,
    onboarding_step TEXT DEFAULT 'welcome',
    onboarding_completed_at TIMESTAMPTZ,
    password_hash TEXT,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_emotion_weights
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_emotion_weights (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_id UUID NOT NULL REFERENCES public.vibes(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    weight REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_genre_weights
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_genre_weights (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_id UUID NOT NULL REFERENCES public.vibes(id),
    genre_id UUID NOT NULL REFERENCES public.genres(id),
    weight REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_genre_weights_key
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_genre_weights_key (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    canonical_key TEXT NOT NULL,
    genre_id UUID NOT NULL REFERENCES public.genres(id),
    weight REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_followers
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_followers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    follower_user_id UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_items
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    position INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    added_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_shared_with
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_shared_with (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES public.users(id),
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_list_views
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_list_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES public.users(id),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibe_lists
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibe_lists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_collaborative BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: vibes
-- ----------------------------------------------------------------------------
CREATE TABLE public.vibes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    canonical_key TEXT,
    icon_url TEXT,
    color_hex TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: viib_emotion_classified_titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intensity_level INTEGER NOT NULL,
    source TEXT DEFAULT 'ai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: viib_emotion_classified_titles_staging
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles_staging (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intensity_level INTEGER NOT NULL,
    source TEXT DEFAULT 'ai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: viib_intent_classified_titles
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    intent_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    source TEXT DEFAULT 'ai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: viib_intent_classified_titles_staging
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles_staging (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    intent_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    source TEXT DEFAULT 'ai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: viib_title_intent_stats
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_title_intent_stats (
    title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
    primary_intent_type TEXT,
    primary_confidence_score REAL,
    intent_count INTEGER,
    last_computed_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- Table: viib_weight_config
-- ----------------------------------------------------------------------------
CREATE TABLE public.viib_weight_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotional_weight REAL NOT NULL DEFAULT 0.35,
    social_weight REAL NOT NULL DEFAULT 0.20,
    historical_weight REAL NOT NULL DEFAULT 0.25,
    context_weight REAL NOT NULL DEFAULT 0.10,
    novelty_weight REAL NOT NULL DEFAULT 0.10,
    is_active BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: visual_taste_options
-- ----------------------------------------------------------------------------
CREATE TABLE public.visual_taste_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 3: INDEXES
-- ============================================================================

-- activation_codes indexes
CREATE INDEX idx_activation_codes_code ON public.activation_codes USING btree (code);
CREATE INDEX idx_activation_codes_created_at ON public.activation_codes USING btree (created_at DESC);
CREATE INDEX idx_activation_codes_used ON public.activation_codes USING btree (is_used);

-- app_settings indexes
CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (setting_key);

-- email_config indexes
CREATE INDEX idx_email_config_active ON public.email_config USING btree (is_active);

-- email_templates indexes
CREATE INDEX idx_email_templates_active ON public.email_templates USING btree (is_active);
CREATE INDEX idx_email_templates_type ON public.email_templates USING btree (template_type);

-- email_verifications indexes
CREATE INDEX idx_email_verifications_email ON public.email_verifications USING btree (email);
CREATE INDEX idx_email_verifications_expires ON public.email_verifications USING btree (expires_at);
CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications USING btree (expires_at);

-- emotion_to_intent_map indexes
CREATE INDEX idx_e2i_intent_type ON public.emotion_to_intent_map USING btree (intent_type);

-- episodes indexes
CREATE INDEX idx_episodes_season ON public.episodes USING btree (season_id);

-- feedback indexes
CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX idx_feedback_type ON public.feedback USING btree (type);

-- friend_connections indexes
CREATE INDEX idx_fc_friend_user_id ON public.friend_connections USING btree (friend_user_id);
CREATE INDEX idx_fc_relationship_type ON public.friend_connections USING btree (relationship_type);
CREATE INDEX idx_fc_user_id ON public.friend_connections USING btree (user_id);
CREATE INDEX idx_friend_connections_active ON public.friend_connections USING btree (user_id, friend_user_id, trust_score DESC) WHERE ((is_blocked IS NULL) OR (is_blocked = false));
CREATE INDEX idx_friend_connections_user_friend ON public.friend_connections USING btree (user_id, friend_user_id);

-- genres indexes
CREATE INDEX idx_genres_tmdb_id ON public.genres USING btree (tmdb_genre_id);

-- ip_rate_limits indexes
CREATE INDEX idx_ip_rate_limits_active ON public.ip_rate_limits USING btree (ip_address, endpoint, window_start DESC);
CREATE INDEX idx_ip_rate_limits_cleanup ON public.ip_rate_limits USING btree (window_start);
CREATE INDEX idx_ip_rate_limits_lookup ON public.ip_rate_limits USING btree (ip_address, endpoint, window_start);

-- jobs indexes
CREATE INDEX idx_jobs_is_active ON public.jobs USING btree (is_active);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);

-- keywords indexes
CREATE INDEX idx_keywords_name ON public.keywords USING btree (name);

-- login_attempts indexes
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts USING btree (identifier, created_at DESC);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_recent ON public.login_attempts USING btree (identifier, success, created_at DESC);

-- official_trailer_channels indexes
CREATE INDEX idx_official_channels_active ON public.official_trailer_channels USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_official_channels_language ON public.official_trailer_channels USING btree (language_code);

-- phone_verifications indexes
CREATE INDEX idx_phone_verifications_active ON public.phone_verifications USING btree (phone_number, created_at DESC) WHERE ((verified = false) AND (is_locked = false));
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications USING btree (expires_at);
CREATE INDEX idx_phone_verifications_otp_hash ON public.phone_verifications USING btree (phone_number, otp_hash) WHERE ((verified = false) AND (is_locked = false));
CREATE INDEX idx_phone_verifications_phone_number ON public.phone_verifications USING btree (phone_number);

-- rate_limit_config indexes
CREATE INDEX idx_rate_limit_active ON public.rate_limit_config USING btree (is_active);
CREATE INDEX idx_rate_limit_endpoint ON public.rate_limit_config USING btree (endpoint);

-- rate_limit_entries indexes
CREATE INDEX idx_rate_limit_entries_expires ON public.rate_limit_entries USING btree (expires_at);
CREATE INDEX idx_rate_limit_entries_key ON public.rate_limit_entries USING btree (key);

-- seasons indexes
CREATE INDEX idx_seasons_title_id ON public.seasons USING btree (title_id);
CREATE INDEX idx_seasons_title_season ON public.seasons USING btree (title_id, season_number);

-- session_tokens indexes
CREATE INDEX idx_session_tokens_expires ON public.session_tokens USING btree (expires_at) WHERE (revoked_at IS NULL);
CREATE INDEX idx_session_tokens_hash ON public.session_tokens USING btree (token_hash) WHERE (revoked_at IS NULL);
CREATE INDEX idx_session_tokens_user_id ON public.session_tokens USING btree (user_id, revoked_at) WHERE (revoked_at IS NULL);

-- system_logs indexes
CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);
CREATE INDEX idx_system_logs_rate_limit ON public.system_logs USING btree (operation, created_at DESC) WHERE (operation ~~ '%_failed');
CREATE INDEX idx_system_logs_resolved ON public.system_logs USING btree (resolved);
CREATE INDEX idx_system_logs_severity ON public.system_logs USING btree (severity);
CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id);

-- title_emotion_vectors indexes
CREATE INDEX idx_title_emotion_vectors_title ON public.title_emotion_vectors USING btree (title_id);
CREATE INDEX idx_title_emotion_vectors_updated_at ON public.title_emotion_vectors USING btree (updated_at);
CREATE INDEX idx_title_emotion_vectors_vad ON public.title_emotion_vectors USING btree (valence, arousal, dominance);

-- title_genres indexes
CREATE INDEX idx_title_genres_genre ON public.title_genres USING btree (genre_id);
CREATE INDEX idx_title_genres_title ON public.title_genres USING btree (title_id);

-- title_intent_alignment_scores indexes
CREATE INDEX idx_tias_emotion ON public.title_intent_alignment_scores USING btree (user_emotion_id);
CREATE INDEX idx_tias_title ON public.title_intent_alignment_scores USING btree (title_id);

-- title_social_summary indexes
CREATE INDEX idx_tss_rec_power ON public.title_social_summary USING btree (social_rec_power DESC);
CREATE INDEX idx_tss_title ON public.title_social_summary USING btree (title_id);

-- title_streaming_availability indexes
CREATE INDEX idx_tsa_region ON public.title_streaming_availability USING btree (region_code);
CREATE INDEX idx_tsa_service ON public.title_streaming_availability USING btree (streaming_service_id);
CREATE INDEX idx_tsa_title ON public.title_streaming_availability USING btree (title_id);

-- title_transformation_scores indexes
CREATE INDEX idx_tts_emotion ON public.title_transformation_scores USING btree (user_emotion_id);
CREATE INDEX idx_tts_title ON public.title_transformation_scores USING btree (title_id);

-- title_user_emotion_match_cache indexes
CREATE INDEX idx_tuem_emotion ON public.title_user_emotion_match_cache USING btree (user_emotion_id);
CREATE INDEX idx_tuem_title ON public.title_user_emotion_match_cache USING btree (title_id);

-- titles indexes
CREATE INDEX idx_titles_classification_status ON public.titles USING btree (classification_status);
CREATE INDEX idx_titles_original_language ON public.titles USING btree (original_language);
CREATE INDEX idx_titles_popularity ON public.titles USING btree (popularity DESC);
CREATE INDEX idx_titles_release_date ON public.titles USING btree (release_date);
CREATE INDEX idx_titles_runtime ON public.titles USING btree (runtime);
CREATE INDEX idx_titles_tmdb_id ON public.titles USING btree (tmdb_id);
CREATE INDEX idx_titles_type ON public.titles USING btree (title_type);
CREATE UNIQUE INDEX idx_titles_tmdb_type_unique ON public.titles USING btree (tmdb_id, title_type);

-- user_context_logs indexes
CREATE INDEX idx_ucl_created_at ON public.user_context_logs USING btree (created_at);
CREATE INDEX idx_ucl_user ON public.user_context_logs USING btree (user_id);

-- user_emotion_states indexes
CREATE INDEX idx_ues_created_at ON public.user_emotion_states USING btree (created_at DESC);
CREATE INDEX idx_ues_emotion ON public.user_emotion_states USING btree (emotion_id);
CREATE INDEX idx_ues_user ON public.user_emotion_states USING btree (user_id);

-- user_language_preferences indexes
CREATE INDEX idx_ulp_language ON public.user_language_preferences USING btree (language_code);
CREATE INDEX idx_ulp_user ON public.user_language_preferences USING btree (user_id);

-- user_social_recommendations indexes
CREATE INDEX idx_usr_receiver ON public.user_social_recommendations USING btree (receiver_user_id);
CREATE INDEX idx_usr_sender ON public.user_social_recommendations USING btree (sender_user_id);
CREATE INDEX idx_usr_title ON public.user_social_recommendations USING btree (title_id);

-- user_streaming_subscriptions indexes
CREATE INDEX idx_uss_service ON public.user_streaming_subscriptions USING btree (streaming_service_id);
CREATE INDEX idx_uss_user ON public.user_streaming_subscriptions USING btree (user_id);

-- user_title_interactions indexes
CREATE INDEX idx_uti_interaction_type ON public.user_title_interactions USING btree (interaction_type);
CREATE INDEX idx_uti_rating ON public.user_title_interactions USING btree (rating_value);
CREATE INDEX idx_uti_title ON public.user_title_interactions USING btree (title_id);
CREATE INDEX idx_uti_user ON public.user_title_interactions USING btree (user_id);
CREATE INDEX idx_uti_user_title ON public.user_title_interactions USING btree (user_id, title_id);

-- user_title_social_scores indexes
CREATE INDEX idx_utss_title ON public.user_title_social_scores USING btree (title_id);
CREATE INDEX idx_utss_user ON public.user_title_social_scores USING btree (user_id);

-- user_vibe_preferences indexes
CREATE INDEX idx_uvp_canonical_key ON public.user_vibe_preferences USING btree (canonical_key);
CREATE INDEX idx_uvp_user ON public.user_vibe_preferences USING btree (user_id);
CREATE INDEX idx_uvp_vibe ON public.user_vibe_preferences USING btree (vibe_id);

-- users indexes
CREATE INDEX idx_users_auth_id ON public.users USING btree (auth_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);

-- viib_emotion_classified_titles indexes
CREATE INDEX idx_vect_emotion ON public.viib_emotion_classified_titles USING btree (emotion_id);
CREATE INDEX idx_vect_title ON public.viib_emotion_classified_titles USING btree (title_id);

-- viib_emotion_classified_titles_staging indexes
CREATE INDEX idx_vects_title ON public.viib_emotion_classified_titles_staging USING btree (title_id);

-- viib_intent_classified_titles indexes
CREATE INDEX idx_vit_intent ON public.viib_intent_classified_titles USING btree (intent_type);
CREATE INDEX idx_vit_title ON public.viib_intent_classified_titles USING btree (title_id);

-- viib_intent_classified_titles_staging indexes
CREATE INDEX idx_vits_title ON public.viib_intent_classified_titles_staging USING btree (title_id);

-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.viib_recommendation_debug AS
SELECT NULL::uuid AS user_id,
       NULL::uuid AS title_id,
       NULL::real AS base_viib_score,
       NULL::real AS social_priority_score,
       NULL::real AS final_score
WHERE false;

-- ============================================================================
-- SECTION 5: TRIGGERS
-- ============================================================================

-- app_settings trigger
CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_app_settings_updated_at();

-- email_config trigger
CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON public.email_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_config_updated_at();

-- email_templates trigger
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_templates_updated_at();

-- feedback trigger
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.update_feedback_updated_at();

-- jobs trigger
CREATE TRIGGER jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_jobs_updated_at();

-- rate_limit_config trigger
CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rate_limit_config_updated_at();

-- titles trigger
CREATE TRIGGER trg_titles_set_updated_at
    BEFORE UPDATE ON public.titles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- user_vibe_preferences trigger
CREATE TRIGGER update_vibe_preferences_updated_at
    BEFORE UPDATE ON public.user_vibe_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vibe_preferences_updated_at();

-- vibe_lists trigger
CREATE TRIGGER update_vibe_lists_updated_at_trigger
    BEFORE UPDATE ON public.vibe_lists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vibe_lists_updated_at();

-- vibes trigger
CREATE TRIGGER set_vibes_updated_at
    BEFORE UPDATE ON public.vibes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- viib_emotion_classified_titles triggers
CREATE TRIGGER trigger_cascade_refresh_emotion_scores
    AFTER INSERT ON public.viib_emotion_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION public.cascade_refresh_emotion_scores();

CREATE TRIGGER trigger_update_title_emotional_signatures_updated_at
    BEFORE UPDATE ON public.viib_emotion_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_title_emotional_signatures_updated_at();

-- viib_intent_classified_titles triggers
CREATE TRIGGER trg_viib_title_intent_stats
    AFTER INSERT ON public.viib_intent_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION public.viib_title_intent_stats_trigger();

CREATE TRIGGER trigger_update_viib_intent_classified_titles_updated_at
    BEFORE UPDATE ON public.viib_intent_classified_titles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_viib_intent_classified_titles_updated_at();

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
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

-- RLS Policies for activation_codes
CREATE POLICY activation_codes_service ON public.activation_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for app_settings
CREATE POLICY app_settings_anon_read ON public.app_settings FOR SELECT TO anon USING ((setting_key !~~ '%secret%') AND (setting_key !~~ '%key%') AND (setting_key !~~ '%password%') AND (setting_key !~~ '%token%'));
CREATE POLICY app_settings_service ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for email_config
CREATE POLICY email_config_service ON public.email_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for email_templates
CREATE POLICY email_templates_service ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for email_verifications
CREATE POLICY email_verifications_service_role_all ON public.email_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for emotion_display_phrases
CREATE POLICY emotion_display_phrases_public_read ON public.emotion_display_phrases FOR SELECT TO public USING (true);
CREATE POLICY emotion_display_phrases_service ON public.emotion_display_phrases FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for emotion_master
CREATE POLICY emotion_master_public_read ON public.emotion_master FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY emotion_master_service_write ON public.emotion_master FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for emotion_to_intent_map
CREATE POLICY emotion_to_intent_map_public_read ON public.emotion_to_intent_map FOR SELECT TO public USING (true);
CREATE POLICY emotion_to_intent_map_service ON public.emotion_to_intent_map FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for emotion_transformation_map
CREATE POLICY emotion_transformation_map_public_read ON public.emotion_transformation_map FOR SELECT TO public USING (true);
CREATE POLICY emotion_transformation_map_service ON public.emotion_transformation_map FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for enabled_countries
CREATE POLICY "Admins can manage enabled countries" ON public.enabled_countries FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read enabled countries" ON public.enabled_countries FOR SELECT TO public USING (true);

-- RLS Policies for episodes
CREATE POLICY episodes_public_read ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY episodes_service_write ON public.episodes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for feedback
CREATE POLICY feedback_insert_auth ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY feedback_service ON public.feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for friend_connections
CREATE POLICY friend_connections_auth ON public.friend_connections FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth())) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY friend_connections_service ON public.friend_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for genres
CREATE POLICY genres_public_read ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY genres_service_write ON public.genres FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for ip_rate_limits
CREATE POLICY ip_rate_limits_service ON public.ip_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for jobs
CREATE POLICY jobs_service ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for keywords
CREATE POLICY keywords_public_read ON public.keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY keywords_service_write ON public.keywords FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for login_attempts
CREATE POLICY login_attempts_service ON public.login_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for official_trailer_channels
CREATE POLICY official_trailer_channels_public_read ON public.official_trailer_channels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY official_trailer_channels_service_write ON public.official_trailer_channels FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for personality_profiles
CREATE POLICY personality_profiles_auth ON public.personality_profiles FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY personality_profiles_service ON public.personality_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for phone_verifications
CREATE POLICY phone_verifications_service_role_all ON public.phone_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for rate_limit_config
CREATE POLICY rate_limit_config_service ON public.rate_limit_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for rate_limit_entries
CREATE POLICY "Service role only - rate limits" ON public.rate_limit_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY rate_limit_entries_service ON public.rate_limit_entries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for recommendation_notifications
CREATE POLICY "Users can create notifications" ON public.recommendation_notifications FOR INSERT TO public WITH CHECK (
    (sender_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid())) OR 
    (receiver_user_id IN (SELECT user_social_recommendations.sender_user_id FROM user_social_recommendations WHERE user_social_recommendations.receiver_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid())))
);
CREATE POLICY "Users can read their own notifications" ON public.recommendation_notifications FOR SELECT TO public USING (receiver_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));
CREATE POLICY "Users can update their notifications" ON public.recommendation_notifications FOR UPDATE TO public USING (receiver_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));

-- RLS Policies for recommendation_outcomes
CREATE POLICY recommendation_outcomes_auth ON public.recommendation_outcomes FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY recommendation_outcomes_service ON public.recommendation_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for seasons
CREATE POLICY seasons_public_read ON public.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY seasons_service_write ON public.seasons FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for session_tokens
CREATE POLICY "Service role only - session tokens" ON public.session_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY session_tokens_service ON public.session_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for spoken_languages
CREATE POLICY spoken_languages_public_read ON public.spoken_languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY spoken_languages_service_write ON public.spoken_languages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for streaming_services
CREATE POLICY streaming_services_public_read ON public.streaming_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY streaming_services_service_write ON public.streaming_services FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for system_logs
CREATE POLICY system_logs_service ON public.system_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for title_emotion_vectors
CREATE POLICY title_emotion_vectors_public_read ON public.title_emotion_vectors FOR SELECT TO public USING (true);
CREATE POLICY title_emotion_vectors_service ON public.title_emotion_vectors FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for title_genres
CREATE POLICY title_genres_public_read ON public.title_genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_genres_service_write ON public.title_genres FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for title_intent_alignment_scores
CREATE POLICY title_intent_alignment_scores_service ON public.title_intent_alignment_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for title_social_summary
CREATE POLICY title_social_summary_public_read ON public.title_social_summary FOR SELECT TO public USING (true);
CREATE POLICY title_social_summary_service ON public.title_social_summary FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for title_streaming_availability
CREATE POLICY title_streaming_availability_public_read ON public.title_streaming_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_streaming_availability_service_write ON public.title_streaming_availability FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for title_transformation_scores
CREATE POLICY title_transformation_scores_public_read ON public.title_transformation_scores FOR SELECT TO public USING (true);
CREATE POLICY title_transformation_scores_service ON public.title_transformation_scores FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for title_user_emotion_match_cache
CREATE POLICY title_user_emotion_match_cache_public_read ON public.title_user_emotion_match_cache FOR SELECT TO public USING (true);
CREATE POLICY title_user_emotion_match_cache_service ON public.title_user_emotion_match_cache FOR ALL TO public USING (true) WITH CHECK (true);

-- RLS Policies for titles
CREATE POLICY titles_public_read ON public.titles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY titles_service_write ON public.titles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for tmdb_genre_mappings
CREATE POLICY "Admins can manage tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR SELECT TO public USING (true);

-- RLS Policies for tmdb_provider_mappings
CREATE POLICY "Admins can manage tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR SELECT TO public USING (true);

-- RLS Policies for user_context_logs
CREATE POLICY user_context_logs_auth ON public.user_context_logs FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_context_logs_service ON public.user_context_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_emotion_states
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_emotion_states_service ON public.user_emotion_states FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_language_preferences
CREATE POLICY user_language_preferences_auth ON public.user_language_preferences FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_language_preferences_service ON public.user_language_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY user_roles_service ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_social_recommendations
CREATE POLICY user_social_recommendations_auth ON public.user_social_recommendations FOR ALL TO authenticated USING ((sender_user_id = get_user_id_from_auth()) OR (receiver_user_id = get_user_id_from_auth())) WITH CHECK (sender_user_id = get_user_id_from_auth());
CREATE POLICY user_social_recommendations_service ON public.user_social_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_streaming_subscriptions
CREATE POLICY user_streaming_subscriptions_auth ON public.user_streaming_subscriptions FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_streaming_subscriptions_service ON public.user_streaming_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_title_interactions
CREATE POLICY user_title_interactions_auth ON public.user_title_interactions FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_title_interactions_service ON public.user_title_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_title_social_scores
CREATE POLICY user_title_social_scores_auth ON public.user_title_social_scores FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_title_social_scores_service ON public.user_title_social_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for user_vibe_preferences
CREATE POLICY user_vibe_preferences_auth ON public.user_vibe_preferences FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_vibe_preferences_service ON public.user_vibe_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for users
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (auth_id = auth.uid());
CREATE POLICY users_service_role_all ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- RLS Policies for vibe_emotion_weights
CREATE POLICY vibe_emotion_weights_read_authenticated ON public.vibe_emotion_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_emotion_weights_service_role ON public.vibe_emotion_weights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibe_genre_weights
CREATE POLICY vibe_genre_weights_read_authenticated ON public.vibe_genre_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_genre_weights_service_role ON public.vibe_genre_weights FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibe_list_followers
CREATE POLICY vibe_list_followers_auth ON public.vibe_list_followers FOR ALL TO authenticated USING (follower_user_id = get_user_id_from_auth()) WITH CHECK (follower_user_id = get_user_id_from_auth());
CREATE POLICY vibe_list_followers_service ON public.vibe_list_followers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibe_list_items
CREATE POLICY vibe_list_items_auth ON public.vibe_list_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_items.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth())) WITH CHECK (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_items.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth()));
CREATE POLICY vibe_list_items_service ON public.vibe_list_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibe_list_shared_with
CREATE POLICY vibe_list_shared_with_auth ON public.vibe_list_shared_with FOR ALL TO authenticated USING ((shared_with_user_id = get_user_id_from_auth()) OR (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_shared_with.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth()))) WITH CHECK (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_shared_with.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth()));
CREATE POLICY vibe_list_shared_with_service ON public.vibe_list_shared_with FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibe_list_views
CREATE POLICY vibe_list_views_auth ON public.vibe_list_views FOR ALL TO authenticated USING (true) WITH CHECK (viewer_user_id = get_user_id_from_auth() OR viewer_user_id IS NULL);
CREATE POLICY vibe_list_views_service ON public.vibe_list_views FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibe_lists
CREATE POLICY vibe_lists_auth ON public.vibe_lists FOR ALL TO authenticated USING (user_id = get_user_id_from_auth() OR is_public = true) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY vibe_lists_service ON public.vibe_lists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for vibes
CREATE POLICY vibes_public_read ON public.vibes FOR SELECT TO public USING (true);
CREATE POLICY vibes_service_write ON public.vibes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for viib_emotion_classified_titles
CREATE POLICY viib_emotion_classified_titles_public_read ON public.viib_emotion_classified_titles FOR SELECT TO public USING (true);
CREATE POLICY viib_emotion_classified_titles_service ON public.viib_emotion_classified_titles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for viib_emotion_classified_titles_staging
CREATE POLICY viib_emotion_classified_titles_staging_service ON public.viib_emotion_classified_titles_staging FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for viib_intent_classified_titles
CREATE POLICY viib_intent_classified_titles_public_read ON public.viib_intent_classified_titles FOR SELECT TO public USING (true);
CREATE POLICY viib_intent_classified_titles_service ON public.viib_intent_classified_titles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for viib_intent_classified_titles_staging
CREATE POLICY viib_intent_classified_titles_staging_service ON public.viib_intent_classified_titles_staging FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for viib_title_intent_stats
CREATE POLICY viib_title_intent_stats_public_read ON public.viib_title_intent_stats FOR SELECT TO public USING (true);
CREATE POLICY viib_title_intent_stats_service ON public.viib_title_intent_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for viib_weight_config
CREATE POLICY viib_weight_config_public_read ON public.viib_weight_config FOR SELECT TO public USING (true);
CREATE POLICY viib_weight_config_service ON public.viib_weight_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for visual_taste_options
CREATE POLICY visual_taste_options_public_read ON public.visual_taste_options FOR SELECT TO public USING (true);
CREATE POLICY visual_taste_options_service ON public.visual_taste_options FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- SECTION 7: DATABASE FUNCTIONS
-- ============================================================================

-- Note: Functions are extensive - see separate function definitions in 
-- public/exports/viib_database_functions.sql for complete source code.
-- Below is a summary of all 60+ functions with their signatures:

-- Helper Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean;
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth() RETURNS uuid;
CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text, p_default text DEFAULT NULL) RETURNS text;

-- Emotion & Mood Functions
CREATE OR REPLACE FUNCTION public.calculate_emotion_distance_score(p_user_valence real, p_user_arousal real, p_user_dominance real, p_title_valence real, p_title_arousal real, p_title_dominance real) RETURNS real;
CREATE OR REPLACE FUNCTION public.calculate_user_emotion_intensity(p_emotion_id uuid, p_energy_percentage real) RETURNS real;
CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(p_user_id uuid, p_emotion_label text, p_energy_percentage real, p_raw_valence real DEFAULT NULL, p_raw_arousal real DEFAULT NULL) RETURNS void;
CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real, p_raw_valence real DEFAULT NULL, p_raw_arousal real DEFAULT NULL) RETURNS TABLE(emotion_id uuid, emotion_label text);
CREATE OR REPLACE FUNCTION public.get_display_emotion_phrase(p_user_id uuid) RETURNS text;
CREATE OR REPLACE FUNCTION public.get_result_emotion_label(p_emotion_label text, p_intensity real) RETURNS text;

-- Score & Recommendation Functions
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid) RETURNS real;
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid) RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real);
CREATE OR REPLACE FUNCTION public.viib_score_with_intent(p_user_id uuid, p_title_id uuid) RETURNS real;
CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid) RETURNS real;
CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid) RETURNS real;
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3_3(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v4(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.get_top_recommendations_with_intent(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id uuid, p_title_id uuid) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.log_recommendation_outcome(p_user_id uuid, p_title_id uuid, p_was_selected boolean, p_watch_duration_percentage real, p_rating_value rating_value) RETURNS void;

-- Social Functions
CREATE OR REPLACE FUNCTION public.calculate_taste_similarity(p_user_a uuid, p_user_b uuid) RETURNS real;

-- Materialization Refresh Functions
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores_batch(p_batch_size integer DEFAULT 1000) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_title_social_summary() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_title_user_emotion_match_cache() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_user_title_social_scores_recent_users() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_viib_reco_materializations() RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid) RETURNS void;
CREATE OR REPLACE FUNCTION public.refresh_all_recommendation_caches() RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.check_recommendation_cache_freshness() RETURNS TABLE(...);

-- Classification Functions
CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL, p_limit integer DEFAULT 50) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.promote_title_intents(p_limit integer DEFAULT 500) RETURNS integer;
CREATE OR REPLACE FUNCTION public.get_job_classification_metrics() RETURNS TABLE(...);

-- Cron Job Functions
CREATE OR REPLACE FUNCTION public.get_cron_jobs() RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.get_cron_job_progress() RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.toggle_cron_job(p_jobid bigint, p_active boolean) RETURNS void;
CREATE OR REPLACE FUNCTION public.update_cron_schedule(p_jobid bigint, p_schedule text) RETURNS void;
CREATE OR REPLACE FUNCTION public.run_cron_job_now(p_command text) RETURNS void;
CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer) RETURNS void;

-- Weight Tuning Functions
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30) RETURNS uuid;
CREATE OR REPLACE FUNCTION public.viib_autotune_weights(p_days integer DEFAULT 30, p_min_samples integer DEFAULT 100) RETURNS void;
CREATE OR REPLACE FUNCTION public.get_active_viib_weights() RETURNS TABLE(...);

-- Rate Limiting Functions
CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_ip_address text, p_endpoint text, p_max_requests integer DEFAULT 10, p_window_seconds integer DEFAULT 60) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.check_rate_limit_fast(p_key text, p_max_count integer, p_window_seconds integer) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_data() RETURNS void;
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries() RETURNS integer;

-- Authentication Functions
CREATE OR REPLACE FUNCTION public.hash_otp(p_otp text, p_salt text DEFAULT NULL) RETURNS text;
CREATE OR REPLACE FUNCTION public.verify_otp_secure(p_phone_number text, p_otp_code text, p_max_attempts integer DEFAULT 5) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.invalidate_old_otps(p_email text) RETURNS void;
CREATE OR REPLACE FUNCTION public.invalidate_old_phone_otps(p_phone text) RETURNS void;
CREATE OR REPLACE FUNCTION public.is_account_locked(p_identifier text, p_window_minutes integer DEFAULT 15) RETURNS boolean;
CREATE OR REPLACE FUNCTION public.get_lockout_remaining(p_identifier text, p_window_minutes integer DEFAULT 15) RETURNS integer;
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier text, p_ip_address text, p_attempt_type text DEFAULT 'password', p_success boolean DEFAULT false) RETURNS void;
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid) RETURNS void;

-- Session Functions
CREATE OR REPLACE FUNCTION public.is_session_valid(p_token_hash text) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(p_user_id uuid) RETURNS integer;

-- Utility Functions
CREATE OR REPLACE FUNCTION public.get_titles_by_ids(p_title_ids uuid[]) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.get_titles_with_all_streaming_services(p_limit integer DEFAULT 100, p_cursor uuid DEFAULT NULL) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.get_corrupted_streaming_count() RETURNS integer;
CREATE OR REPLACE FUNCTION public.get_vibe_list_stats(p_list_ids uuid[]) RETURNS TABLE(...);
CREATE OR REPLACE FUNCTION public.check_list_ownership(p_list_id uuid, p_user_id uuid) RETURNS boolean;

-- Trigger Functions
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_email_config_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.cascade_refresh_emotion_scores() RETURNS trigger;
CREATE OR REPLACE FUNCTION public.viib_title_intent_stats_trigger() RETURNS trigger;

-- ============================================================================
-- END OF SCHEMA DUMP
-- ============================================================================
