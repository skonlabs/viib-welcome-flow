-- =====================================================
-- ViiB Complete Database Schema Dump
-- Generated: 2024-12-28
-- =====================================================
-- This file contains the complete database schema including:
-- - ENUM Types
-- - Tables with columns, constraints, and defaults
-- - Indexes
-- - Foreign Keys (via table relationships)
-- - Views
-- - Functions
-- - Triggers
-- - RLS Policies
-- =====================================================

-- =====================================================
-- SECTION 1: ENUM TYPES
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
-- SECTION 2: TABLES
-- =====================================================

-- -----------------------------------------------------
-- Table: users
-- Core user information
-- -----------------------------------------------------
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID,
    email TEXT,
    phone_number TEXT,
    username TEXT,
    full_name TEXT,
    password_hash TEXT,
    country TEXT,
    timezone TEXT,
    language_preference TEXT,
    ip_address TEXT,
    ip_country TEXT,
    signup_method TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_age_over_18 BOOLEAN NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_phone_verified BOOLEAN NOT NULL DEFAULT false,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    last_onboarding_step TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: user_roles
-- User role assignments
-- -----------------------------------------------------
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: activation_codes
-- Activation/invite codes
-- -----------------------------------------------------
CREATE TABLE public.activation_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_by UUID REFERENCES public.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: phone_verifications
-- Phone OTP verification records
-- -----------------------------------------------------
CREATE TABLE public.phone_verifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    otp_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: email_verifications
-- Email OTP verification records
-- -----------------------------------------------------
CREATE TABLE public.email_verifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    otp_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempt_count INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: session_tokens
-- User session management
-- -----------------------------------------------------
CREATE TABLE public.session_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    user_agent TEXT,
    is_remember_me BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: login_attempts
-- Track login attempts for rate limiting
-- -----------------------------------------------------
CREATE TABLE public.login_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL,
    ip_address TEXT,
    attempt_type TEXT NOT NULL DEFAULT 'password',
    success BOOLEAN DEFAULT false,
    requires_captcha BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: ip_rate_limits
-- IP-based rate limiting
-- -----------------------------------------------------
CREATE TABLE public.ip_rate_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(ip_address, endpoint)
);

-- -----------------------------------------------------
-- Table: rate_limit_entries
-- General rate limit tracking
-- -----------------------------------------------------
CREATE TABLE public.rate_limit_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- -----------------------------------------------------
-- Table: rate_limit_config
-- Rate limit configuration
-- -----------------------------------------------------
CREATE TABLE public.rate_limit_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: titles
-- Movies and TV shows
-- -----------------------------------------------------
CREATE TABLE public.titles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_id INTEGER,
    imdb_id TEXT,
    name TEXT,
    original_name TEXT,
    title_type TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    trailer_url TEXT,
    trailer_transcript TEXT,
    is_tmdb_trailer BOOLEAN DEFAULT true,
    runtime INTEGER,
    release_date DATE,
    first_air_date DATE,
    last_air_date DATE,
    episode_run_time INTEGER[],
    status TEXT,
    original_language TEXT,
    certification TEXT,
    is_adult BOOLEAN DEFAULT false,
    popularity DOUBLE PRECISION,
    vote_average DOUBLE PRECISION,
    rt_cscore INTEGER,
    rt_ccount INTEGER,
    rt_ascore INTEGER,
    rt_acount INTEGER,
    title_genres JSON,
    classification_status TEXT DEFAULT 'pending',
    last_classified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(tmdb_id, title_type)
);

-- -----------------------------------------------------
-- Table: genres
-- Genre master list
-- -----------------------------------------------------
CREATE TABLE public.genres (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    genre_name TEXT NOT NULL,
    tmdb_genre_id INTEGER
);

-- -----------------------------------------------------
-- Table: title_genres
-- Junction table for titles and genres
-- -----------------------------------------------------
CREATE TABLE public.title_genres (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    genre_id UUID NOT NULL REFERENCES public.genres(id),
    PRIMARY KEY (title_id, genre_id)
);

-- -----------------------------------------------------
-- Table: keywords
-- Keyword master list
-- -----------------------------------------------------
CREATE TABLE public.keywords (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    tmdb_keyword_id INTEGER
);

-- -----------------------------------------------------
-- Table: spoken_languages
-- Language master list
-- -----------------------------------------------------
CREATE TABLE public.spoken_languages (
    iso_639_1 VARCHAR NOT NULL PRIMARY KEY,
    language_name TEXT NOT NULL,
    flag_emoji TEXT
);

-- -----------------------------------------------------
-- Table: seasons
-- TV show seasons
-- -----------------------------------------------------
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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: episodes
-- TV show episodes
-- -----------------------------------------------------
CREATE TABLE public.episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES public.seasons(id),
    episode_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    still_path TEXT,
    air_date DATE,
    runtime INTEGER,
    vote_average DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: streaming_services
-- Streaming platform master list
-- -----------------------------------------------------
CREATE TABLE public.streaming_services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- -----------------------------------------------------
-- Table: title_streaming_availability
-- Where titles are available to stream
-- -----------------------------------------------------
CREATE TABLE public.title_streaming_availability (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
    region_code TEXT NOT NULL,
    PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- -----------------------------------------------------
-- Table: official_trailer_channels
-- Official YouTube trailer channels
-- -----------------------------------------------------
CREATE TABLE public.official_trailer_channels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_name TEXT NOT NULL,
    channel_id TEXT,
    language_code TEXT NOT NULL,
    region TEXT,
    category TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: emotion_master
-- Emotion definitions with VAD values
-- -----------------------------------------------------
CREATE TABLE public.emotion_master (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_label TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    valence REAL,
    arousal REAL,
    dominance REAL,
    intensity_multiplier REAL DEFAULT 1.0,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    UNIQUE(emotion_label, category)
);

-- -----------------------------------------------------
-- Table: emotion_display_phrases
-- Human-readable phrases for emotion + intensity
-- -----------------------------------------------------
CREATE TABLE public.emotion_display_phrases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    display_phrase TEXT NOT NULL,
    min_intensity REAL NOT NULL,
    max_intensity REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(emotion_id, display_phrase),
    UNIQUE(emotion_id, min_intensity, max_intensity)
);

-- -----------------------------------------------------
-- Table: emotion_transformation_map
-- How content emotions transform user emotions
-- -----------------------------------------------------
CREATE TABLE public.emotion_transformation_map (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    content_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    transformation_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    priority_rank SMALLINT
);

-- -----------------------------------------------------
-- Table: emotion_to_intent_map
-- Maps emotions to viewing intents
-- -----------------------------------------------------
CREATE TABLE public.emotion_to_intent_map (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intent_type TEXT NOT NULL,
    weight REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(emotion_id, intent_type)
);

-- -----------------------------------------------------
-- Table: user_emotion_states
-- User's current emotional state
-- -----------------------------------------------------
CREATE TABLE public.user_emotion_states (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intensity REAL NOT NULL DEFAULT 0.1,
    valence REAL,
    arousal REAL,
    dominance REAL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: viib_emotion_classified_titles
-- AI-classified emotions for titles (production)
-- -----------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    intensity_level INTEGER NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: viib_emotion_classified_titles_staging
-- AI-classified emotions for titles (staging)
-- -----------------------------------------------------
CREATE TABLE public.viib_emotion_classified_titles_staging (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title_id UUID NOT NULL,
    emotion_id UUID NOT NULL,
    intensity_level INTEGER NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: viib_intent_classified_titles
-- AI-classified intents for titles (production)
-- -----------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    intent_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (title_id, intent_type)
);

-- -----------------------------------------------------
-- Table: viib_intent_classified_titles_staging
-- AI-classified intents for titles (staging)
-- -----------------------------------------------------
CREATE TABLE public.viib_intent_classified_titles_staging (
    title_id UUID NOT NULL,
    intent_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (title_id, intent_type)
);

-- -----------------------------------------------------
-- Table: viib_title_intent_stats
-- Aggregated intent statistics per title
-- -----------------------------------------------------
CREATE TABLE public.viib_title_intent_stats (
    title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
    primary_intent_type TEXT,
    primary_confidence_score REAL,
    intent_count INTEGER,
    last_computed_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------
-- Table: title_emotion_vectors
-- Pre-computed emotion vectors for titles
-- -----------------------------------------------------
CREATE TABLE public.title_emotion_vectors (
    title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
    valence REAL NOT NULL,
    arousal REAL NOT NULL,
    dominance REAL NOT NULL,
    emotion_strength REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: title_transformation_scores
-- Pre-computed transformation scores
-- -----------------------------------------------------
CREATE TABLE public.title_transformation_scores (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    transformation_score REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- -----------------------------------------------------
-- Table: title_intent_alignment_scores
-- Pre-computed intent alignment scores
-- -----------------------------------------------------
CREATE TABLE public.title_intent_alignment_scores (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    alignment_score REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- -----------------------------------------------------
-- Table: title_user_emotion_match_cache
-- Cached emotion matching scores
-- -----------------------------------------------------
CREATE TABLE public.title_user_emotion_match_cache (
    title_id UUID NOT NULL REFERENCES public.titles(id),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    cosine_score REAL NOT NULL,
    transformation_score REAL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (title_id, user_emotion_id)
);

-- -----------------------------------------------------
-- Table: title_social_summary
-- Pre-computed social signals per title
-- -----------------------------------------------------
CREATE TABLE public.title_social_summary (
    title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
    social_mean_rating REAL,
    social_rec_power REAL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: user_title_social_scores
-- Per-user social scores for titles
-- -----------------------------------------------------
CREATE TABLE public.user_title_social_scores (
    user_id UUID NOT NULL,
    title_id UUID NOT NULL REFERENCES public.titles(id),
    social_component_score REAL NOT NULL,
    social_priority_score REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, title_id)
);

-- -----------------------------------------------------
-- Table: viib_weight_config
-- Recommendation weight configuration
-- -----------------------------------------------------
CREATE TABLE public.viib_weight_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    emotional_weight REAL NOT NULL,
    social_weight REAL NOT NULL,
    historical_weight REAL NOT NULL,
    context_weight REAL NOT NULL,
    novelty_weight REAL NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibes
-- Vibe definitions
-- -----------------------------------------------------
CREATE TABLE public.vibes (
    id UUID NOT NULL PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    base_weight REAL NOT NULL DEFAULT 1.0,
    decay_half_life_days REAL NOT NULL DEFAULT 14.0,
    component_ratios JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibe_emotion_weights
-- Vibe to emotion mappings
-- -----------------------------------------------------
CREATE TABLE public.vibe_emotion_weights (
    vibe_id UUID NOT NULL REFERENCES public.vibes(id),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
    weight REAL NOT NULL,
    PRIMARY KEY (vibe_id, emotion_id)
);

-- -----------------------------------------------------
-- Table: vibe_genre_weights
-- Vibe to genre mappings
-- -----------------------------------------------------
CREATE TABLE public.vibe_genre_weights (
    vibe_id UUID NOT NULL REFERENCES public.vibes(id),
    genre_id UUID NOT NULL REFERENCES public.genres(id),
    weight REAL NOT NULL,
    PRIMARY KEY (vibe_id, genre_id)
);

-- -----------------------------------------------------
-- Table: user_vibe_preferences
-- User vibe preferences
-- -----------------------------------------------------
CREATE TABLE public.user_vibe_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id),
    vibe_type TEXT NOT NULL,
    vibe_id UUID REFERENCES public.vibes(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: user_language_preferences
-- User language preferences
-- -----------------------------------------------------
CREATE TABLE public.user_language_preferences (
    user_id UUID NOT NULL REFERENCES public.users(id),
    language_code TEXT NOT NULL REFERENCES public.spoken_languages(iso_639_1),
    priority_order INTEGER,
    PRIMARY KEY (user_id, language_code)
);

-- -----------------------------------------------------
-- Table: user_streaming_subscriptions
-- User's streaming service subscriptions
-- -----------------------------------------------------
CREATE TABLE public.user_streaming_subscriptions (
    user_id UUID NOT NULL REFERENCES public.users(id),
    streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, streaming_service_id)
);

-- -----------------------------------------------------
-- Table: user_title_interactions
-- User interactions with titles
-- -----------------------------------------------------
CREATE TABLE public.user_title_interactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value DEFAULT 'not_rated',
    watch_duration_percentage REAL,
    season_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: user_context_logs
-- User session context logs
-- -----------------------------------------------------
CREATE TABLE public.user_context_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    device_type TEXT,
    time_of_day_bucket TEXT,
    location_type TEXT,
    session_length_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: personality_profiles
-- User personality profiles
-- -----------------------------------------------------
CREATE TABLE public.personality_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    type_name TEXT,
    description TEXT,
    introversion_score REAL,
    emotional_sensitivity REAL,
    risk_tolerance REAL,
    sensation_seeking REAL,
    analytical_thinking REAL,
    empathy_level REAL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: friend_connections
-- Friend relationships
-- -----------------------------------------------------
CREATE TABLE public.friend_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    friend_user_id UUID NOT NULL REFERENCES public.users(id),
    relationship_type TEXT,
    trust_score REAL NOT NULL DEFAULT 0.5,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: user_social_recommendations
-- Friend-to-friend recommendations
-- -----------------------------------------------------
CREATE TABLE public.user_social_recommendations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    receiver_user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: recommendation_notifications
-- Recommendation notifications
-- -----------------------------------------------------
CREATE TABLE public.recommendation_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    receiver_user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    notification_type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: recommendation_outcomes
-- Track recommendation outcomes
-- -----------------------------------------------------
CREATE TABLE public.recommendation_outcomes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title_id UUID NOT NULL REFERENCES public.titles(id),
    was_selected BOOLEAN NOT NULL,
    watch_duration_percentage REAL,
    rating_value public.rating_value,
    recommended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibe_lists
-- User-created vibe lists
-- -----------------------------------------------------
CREATE TABLE public.vibe_lists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    description TEXT,
    mood_tags TEXT[],
    visibility TEXT NOT NULL DEFAULT 'private',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibe_list_items
-- Items in vibe lists
-- -----------------------------------------------------
CREATE TABLE public.vibe_list_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
    title_id UUID NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibe_list_followers
-- Vibe list followers
-- -----------------------------------------------------
CREATE TABLE public.vibe_list_followers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
    follower_user_id UUID NOT NULL REFERENCES public.users(id),
    followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibe_list_shared_with
-- Vibe list sharing
-- -----------------------------------------------------
CREATE TABLE public.vibe_list_shared_with (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
    shared_with_user_id UUID NOT NULL REFERENCES public.users(id),
    shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: vibe_list_views
-- Vibe list view tracking
-- -----------------------------------------------------
CREATE TABLE public.vibe_list_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
    viewer_user_id UUID REFERENCES public.users(id),
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: visual_taste_options
-- Visual taste assessment options
-- -----------------------------------------------------
CREATE TABLE public.visual_taste_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    option_key TEXT NOT NULL,
    display_label TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: enabled_countries
-- Countries enabled for phone verification
-- -----------------------------------------------------
CREATE TABLE public.enabled_countries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code TEXT NOT NULL,
    country_name TEXT NOT NULL,
    dial_code TEXT NOT NULL,
    flag_emoji TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: tmdb_genre_mappings
-- TMDB genre ID mappings
-- -----------------------------------------------------
CREATE TABLE public.tmdb_genre_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_genre_id INTEGER NOT NULL,
    genre_name TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'both',
    tv_equivalent_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: tmdb_provider_mappings
-- TMDB provider ID mappings
-- -----------------------------------------------------
CREATE TABLE public.tmdb_provider_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_provider_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    region_code TEXT NOT NULL DEFAULT 'US',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: jobs
-- Background job management
-- -----------------------------------------------------
CREATE TABLE public.jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    is_active BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB DEFAULT '{}',
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_duration_seconds INTEGER,
    total_titles_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: system_logs
-- System error/event logs
-- -----------------------------------------------------
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
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: feedback
-- User feedback
-- -----------------------------------------------------
CREATE TABLE public.feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Table: email_config
-- SMTP configuration
-- -----------------------------------------------------
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: email_templates
-- Email templates
-- -----------------------------------------------------
CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Table: app_settings
-- Application settings key-value store
-- -----------------------------------------------------
CREATE TABLE public.app_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SECTION 3: INDEXES
-- =====================================================

-- Activation codes
CREATE INDEX idx_activation_codes_code ON public.activation_codes(code);
CREATE INDEX idx_activation_codes_created_at ON public.activation_codes(created_at DESC);
CREATE INDEX idx_activation_codes_used ON public.activation_codes(is_used);

-- App settings
CREATE INDEX idx_app_settings_key ON public.app_settings(setting_key);

-- Email
CREATE INDEX idx_email_config_active ON public.email_config(is_active);
CREATE INDEX idx_email_templates_active ON public.email_templates(is_active);
CREATE INDEX idx_email_templates_type ON public.email_templates(template_type);
CREATE INDEX idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX idx_email_verifications_expires ON public.email_verifications(expires_at);

-- Emotions
CREATE INDEX idx_emotion_classified_titles_title ON public.viib_emotion_classified_titles(title_id);
CREATE INDEX idx_emotion_classified_titles_emotion ON public.viib_emotion_classified_titles(emotion_id);
CREATE INDEX idx_emotion_classified_staging_title ON public.viib_emotion_classified_titles_staging(title_id);

-- Feedback
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_user ON public.feedback(user_id);

-- Friend connections
CREATE INDEX idx_friend_connections_user ON public.friend_connections(user_id);
CREATE INDEX idx_friend_connections_friend ON public.friend_connections(friend_user_id);

-- Intents
CREATE INDEX idx_intent_classified_titles_title ON public.viib_intent_classified_titles(title_id);
CREATE INDEX idx_intent_classified_staging_title ON public.viib_intent_classified_titles_staging(title_id);

-- Jobs
CREATE INDEX idx_jobs_type ON public.jobs(job_type);
CREATE INDEX idx_jobs_status ON public.jobs(status);

-- Login attempts
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts(identifier);
CREATE INDEX idx_login_attempts_created ON public.login_attempts(created_at);

-- Phone verifications
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_expires ON public.phone_verifications(expires_at);

-- Rate limits
CREATE INDEX idx_rate_limit_entries_key ON public.rate_limit_entries(key);
CREATE INDEX idx_rate_limit_entries_expires ON public.rate_limit_entries(expires_at);

-- Recommendations
CREATE INDEX idx_recommendation_outcomes_user ON public.recommendation_outcomes(user_id);
CREATE INDEX idx_recommendation_outcomes_title ON public.recommendation_outcomes(title_id);
CREATE INDEX idx_recommendation_notifications_receiver ON public.recommendation_notifications(receiver_user_id);

-- Session tokens
CREATE INDEX idx_session_tokens_user ON public.session_tokens(user_id);
CREATE INDEX idx_session_tokens_hash ON public.session_tokens(token_hash);
CREATE INDEX idx_session_tokens_expires ON public.session_tokens(expires_at);

-- Social recommendations
CREATE INDEX idx_social_recommendations_receiver ON public.user_social_recommendations(receiver_user_id);
CREATE INDEX idx_social_recommendations_sender ON public.user_social_recommendations(sender_user_id);
CREATE INDEX idx_social_recommendations_title ON public.user_social_recommendations(title_id);

-- Streaming
CREATE INDEX idx_streaming_availability_title ON public.title_streaming_availability(title_id);
CREATE INDEX idx_streaming_availability_service ON public.title_streaming_availability(streaming_service_id);
CREATE INDEX idx_streaming_availability_region ON public.title_streaming_availability(region_code);

-- System logs
CREATE INDEX idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX idx_system_logs_resolved ON public.system_logs(resolved);

-- Titles
CREATE INDEX idx_titles_tmdb ON public.titles(tmdb_id);
CREATE INDEX idx_titles_type ON public.titles(title_type);
CREATE INDEX idx_titles_classification ON public.titles(classification_status);
CREATE INDEX idx_titles_popularity ON public.titles(popularity DESC);

-- Title scores
CREATE INDEX idx_title_emotion_vectors_title ON public.title_emotion_vectors(title_id);
CREATE INDEX idx_title_transformation_scores_title ON public.title_transformation_scores(title_id);
CREATE INDEX idx_title_intent_alignment_title ON public.title_intent_alignment_scores(title_id);
CREATE INDEX idx_title_social_summary_title ON public.title_social_summary(title_id);

-- User data
CREATE INDEX idx_user_context_logs_user ON public.user_context_logs(user_id);
CREATE INDEX idx_user_context_logs_created ON public.user_context_logs(created_at);
CREATE INDEX idx_user_emotion_states_user ON public.user_emotion_states(user_id);
CREATE INDEX idx_user_emotion_states_created ON public.user_emotion_states(created_at DESC);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_streaming_subs_user ON public.user_streaming_subscriptions(user_id);
CREATE INDEX idx_user_title_interactions_user ON public.user_title_interactions(user_id);
CREATE INDEX idx_user_title_interactions_title ON public.user_title_interactions(title_id);
CREATE INDEX idx_user_title_interactions_type ON public.user_title_interactions(interaction_type);

-- Users
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone_number);

-- Vibe lists
CREATE INDEX idx_vibe_lists_user ON public.vibe_lists(user_id);
CREATE INDEX idx_vibe_list_items_list ON public.vibe_list_items(vibe_list_id);
CREATE INDEX idx_vibe_list_followers_list ON public.vibe_list_followers(vibe_list_id);

-- =====================================================
-- SECTION 4: VIEWS
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
-- SECTION 5: FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Function: has_role
-- Check if user has a specific role
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: get_user_id_from_auth
-- Get public.users.id from auth.uid()
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: get_app_setting
-- Get application setting by key
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: calculate_emotion_distance_score
-- Calculate similarity between user and title emotions
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_emotion_distance_score(
    p_user_valence real, 
    p_user_arousal real, 
    p_user_dominance real, 
    p_title_valence real, 
    p_title_arousal real, 
    p_title_dominance real
)
RETURNS real
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
    v_euclidean_dist REAL;
    v_max_dist REAL := 1.732; -- sqrt(3) for normalized 0-1 space
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

-- -----------------------------------------------------
-- Function: calculate_taste_similarity
-- Calculate taste similarity between two users
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: calculate_user_emotion_intensity
-- Calculate intensity from energy percentage
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: viib_score_components
-- Calculate all ViiB score components
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: viib_score
-- Calculate final ViiB score
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.viib_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
    w_emotional real := 0.35; 
    w_social real := 0.20; 
    w_historical real := 0.25;
    w_context real := 0.10; 
    w_novelty real := 0.10;
    c_emotional real; 
    c_social real; 
    c_historical real; 
    c_context real; 
    c_novelty real;
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

-- -----------------------------------------------------
-- Function: get_top_recommendations_v4
-- Get top recommendations with full scoring
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_recommendations_v4(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
    title_id uuid, 
    title text, 
    poster_path text, 
    emotion_score real, 
    historical_score real, 
    social_score real, 
    context_score real, 
    novelty_score real, 
    vibe_boost real, 
    quality_score real, 
    final_score real, 
    recommendation_reason text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
WITH
user_vibe AS (
  SELECT vibe_type FROM public.user_vibe_preferences WHERE user_id = p_user_id LIMIT 1
),
user_langs AS (
  SELECT language_code FROM public.user_language_preferences WHERE user_id = p_user_id
),
has_langs AS (
  SELECT EXISTS (SELECT 1 FROM user_langs) AS ok
),
user_streaming AS (
  SELECT streaming_service_id FROM public.user_streaming_subscriptions WHERE user_id = p_user_id AND is_active = true
),
excluded_titles AS (
  SELECT DISTINCT title_id FROM public.user_title_interactions
  WHERE user_id = p_user_id AND interaction_type::text IN ('completed', 'not_my_taste', 'dismissed', 'disliked')
),
candidates AS (
  SELECT t.id AS title_id, COALESCE(tss.social_rec_power, 0.0) AS social_power, COALESCE(t.popularity, 0.0) AS popularity
  FROM public.titles t
  LEFT JOIN public.title_social_summary tss ON tss.title_id = t.id
  WHERE COALESCE(t.classification_status,'') = 'complete'
    AND EXISTS (SELECT 1 FROM public.title_streaming_availability tsa JOIN user_streaming us ON us.streaming_service_id = tsa.streaming_service_id WHERE tsa.title_id = t.id)
    AND ((SELECT ok FROM has_langs) = false OR t.original_language IN (SELECT language_code FROM user_langs))
    AND NOT EXISTS (SELECT 1 FROM excluded_titles e WHERE e.title_id = t.id)
    AND COALESCE(t.runtime, 0) >= 20
  ORDER BY COALESCE(tss.social_rec_power, 0.0) DESC, COALESCE(t.popularity, 0.0) DESC
  LIMIT 300
),
scored AS (
  SELECT c.title_id, t.name AS title, t.poster_path,
    vsc.emotional_component AS emotion_score,
    vsc.historical_component AS historical_score,
    vsc.social_component AS social_score,
    vsc.context_component AS context_score,
    vsc.novelty_component AS novelty_score,
    CASE
      WHEN uv.vibe_type IS NULL THEN 1.00
      WHEN uv.vibe_type ILIKE '%calm%' THEN 1.10
      WHEN uv.vibe_type ILIKE '%bold%' THEN 1.15
      WHEN uv.vibe_type ILIKE '%curious%' THEN 1.12
      WHEN uv.vibe_type ILIKE '%adventure%' THEN 1.15
      WHEN uv.vibe_type ILIKE '%feel%' THEN 1.10
      WHEN uv.vibe_type ILIKE '%dark%' THEN 1.12
      ELSE 1.00
    END AS vibe_boost,
    CASE
      WHEN COALESCE(t.rt_cscore,0)=0 AND COALESCE(t.rt_ascore,0)=0 THEN 0.55
      ELSE LEAST(1.0, 0.6 * (((t.rt_cscore/100.0) * COALESCE(t.rt_ccount,0) + 0.70*50) / (COALESCE(t.rt_ccount,0) + 50))
        + 0.4 * (((t.rt_ascore/100.0) * COALESCE(t.rt_acount,0) + 0.70*200) / (COALESCE(t.rt_acount,0) + 200)))
    END AS quality_score
  FROM candidates c
  JOIN public.titles t ON t.id = c.title_id
  JOIN public.viib_score_components(p_user_id, c.title_id) vsc ON TRUE
  LEFT JOIN user_vibe uv ON TRUE
),
final_ranked AS (
  SELECT *,
    ((0.35 * emotion_score + 0.25 * historical_score + 0.20 * social_score + 0.10 * context_score + 0.10 * novelty_score)
      * vibe_boost * (0.85 + 0.30 * quality_score)) AS final_score
  FROM scored
)
SELECT title_id, title, poster_path, emotion_score, historical_score, social_score, context_score, novelty_score,
  vibe_boost, quality_score, final_score,
  CASE
    WHEN social_score >= 0.70 THEN 'Strong recommendation from your circle'
    WHEN emotion_score >= 0.70 THEN 'Matches your current emotional state'
    WHEN historical_score >= 0.65 THEN 'Aligned with your past favorites'
    WHEN quality_score >= 0.80 THEN 'Critically and audience acclaimed'
    WHEN novelty_score >= 0.75 THEN 'Fresh but still your taste'
    ELSE 'Balanced match across signals'
  END AS recommendation_reason
FROM final_ranked
ORDER BY final_score DESC
LIMIT p_limit;
$$;

-- -----------------------------------------------------
-- Function: check_list_ownership
-- Check if user owns a vibe list
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: get_vibe_list_stats
-- Get stats for vibe lists
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: hash_otp
-- Hash OTP codes
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_otp(p_otp text, p_salt text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
    v_salt TEXT;
    v_combined TEXT;
BEGIN
    v_salt := COALESCE(p_salt, 'viib_otp_salt_');
    v_combined := v_salt || p_otp;
    RETURN encode(sha256(v_combined::bytea), 'hex');
END;
$$;

-- -----------------------------------------------------
-- Function: verify_otp_secure
-- Securely verify phone OTP
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_otp_secure(p_phone_number text, p_otp_input text, p_max_attempts integer DEFAULT 5)
RETURNS TABLE(success boolean, error_message text, verification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_record RECORD;
    v_otp_hash TEXT;
    v_attempts INTEGER;
BEGIN
    v_otp_hash := hash_otp(p_otp_input, p_phone_number);

    SELECT pv.id, pv.otp_hash, pv.otp_code, pv.attempt_count, pv.expires_at
    INTO v_record
    FROM phone_verifications pv
    WHERE pv.phone_number = p_phone_number
      AND pv.verified = FALSE
      AND pv.is_locked = FALSE
      AND pv.expires_at > NOW()
    ORDER BY pv.created_at DESC
    LIMIT 1;

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
$$;

-- -----------------------------------------------------
-- Function: is_account_locked
-- Check if account is locked
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_account_locked(p_identifier text, p_window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
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

-- -----------------------------------------------------
-- Function: check_rate_limit_fast
-- Fast rate limit checking
-- -----------------------------------------------------
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
    ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit_entries.window_start < v_window_start THEN 1 ELSE rate_limit_entries.count + 1 END,
        window_start = CASE WHEN rate_limit_entries.window_start < v_window_start THEN v_now ELSE rate_limit_entries.window_start END,
        expires_at = CASE WHEN rate_limit_entries.window_start < v_window_start THEN v_expires_at ELSE rate_limit_entries.expires_at END
    RETURNING rate_limit_entries.count INTO v_current;

    RETURN QUERY SELECT v_current <= p_max_count, v_current, v_current >= v_captcha_threshold AND v_current <= p_max_count;
END;
$$;

-- -----------------------------------------------------
-- Function: refresh_title_emotion_vectors
-- Refresh pre-computed emotion vectors
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: refresh_title_transformation_scores
-- Refresh transformation scores
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Function: refresh_title_social_summary
-- Refresh social summary
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
SET search_path TO 'public'
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

-- -----------------------------------------------------
-- Trigger Functions for updated_at
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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

-- =====================================================
-- SECTION 6: TRIGGERS
-- =====================================================

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.update_feedback_updated_at();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_jobs_updated_at();

CREATE TRIGGER update_vibe_lists_updated_at
    BEFORE UPDATE ON public.vibe_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_vibe_lists_updated_at();

CREATE TRIGGER update_vibe_preferences_updated_at
    BEFORE UPDATE ON public.user_vibe_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_vibe_preferences_updated_at();

CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON public.email_config
    FOR EACH ROW EXECUTE FUNCTION public.update_email_config_updated_at();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_email_templates_updated_at();

CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW EXECUTE FUNCTION public.update_rate_limit_config_updated_at();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();

CREATE TRIGGER update_titles_updated_at
    BEFORE UPDATE ON public.titles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_vibes_updated_at
    BEFORE UPDATE ON public.vibes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS)
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

-- Service role policies (full access for backend operations)
CREATE POLICY activation_codes_service ON public.activation_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY app_settings_service ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_config_service ON public.email_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_templates_service ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_verifications_service_role_all ON public.email_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emotion_display_phrases_service ON public.emotion_display_phrases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY emotion_master_service_write ON public.emotion_master FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emotion_to_intent_map_service ON public.emotion_to_intent_map FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY emotion_transformation_map_service ON public.emotion_transformation_map FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY episodes_service_write ON public.episodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY feedback_service ON public.feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY friend_connections_service ON public.friend_connections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY genres_service_write ON public.genres FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY ip_rate_limits_service ON public.ip_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY jobs_service ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY keywords_service_write ON public.keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY login_attempts_service ON public.login_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY official_trailer_channels_service_write ON public.official_trailer_channels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY personality_profiles_service ON public.personality_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY phone_verifications_service_role_all ON public.phone_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY rate_limit_config_service ON public.rate_limit_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY rate_limit_entries_service ON public.rate_limit_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY recommendation_outcomes_service ON public.recommendation_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY seasons_service_write ON public.seasons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY session_tokens_service ON public.session_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY spoken_languages_service_write ON public.spoken_languages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY streaming_services_service_write ON public.streaming_services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY system_logs_service ON public.system_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_emotion_vectors_service ON public.title_emotion_vectors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_genres_service_write ON public.title_genres FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_intent_alignment_scores_service ON public.title_intent_alignment_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_social_summary_service ON public.title_social_summary FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_streaming_availability_service_write ON public.title_streaming_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_transformation_scores_service ON public.title_transformation_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_user_emotion_match_cache_service ON public.title_user_emotion_match_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY titles_service_write ON public.titles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_context_logs_service ON public.user_context_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_emotion_states_service ON public.user_emotion_states FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_language_preferences_service ON public.user_language_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_roles_service ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_social_recommendations_service ON public.user_social_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_streaming_subscriptions_service ON public.user_streaming_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read policies
CREATE POLICY app_settings_anon_read ON public.app_settings FOR SELECT TO anon
    USING ((setting_key !~~ '%secret%') AND (setting_key !~~ '%key%') AND (setting_key !~~ '%password%') AND (setting_key !~~ '%token%'));
CREATE POLICY emotion_display_phrases_public_read ON public.emotion_display_phrases FOR SELECT USING (true);
CREATE POLICY emotion_master_public_read ON public.emotion_master FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY emotion_to_intent_map_public_read ON public.emotion_to_intent_map FOR SELECT USING (true);
CREATE POLICY emotion_transformation_map_public_read ON public.emotion_transformation_map FOR SELECT USING (true);
CREATE POLICY episodes_public_read ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY genres_public_read ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY keywords_public_read ON public.keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY official_trailer_channels_public_read ON public.official_trailer_channels FOR SELECT USING (true);
CREATE POLICY seasons_public_read ON public.seasons FOR SELECT USING (true);
CREATE POLICY spoken_languages_public_read ON public.spoken_languages FOR SELECT USING (true);
CREATE POLICY streaming_services_public_read ON public.streaming_services FOR SELECT USING (true);
CREATE POLICY title_emotion_vectors_public_read ON public.title_emotion_vectors FOR SELECT USING (true);
CREATE POLICY title_genres_public_read ON public.title_genres FOR SELECT USING (true);
CREATE POLICY title_social_summary_public_read ON public.title_social_summary FOR SELECT USING (true);
CREATE POLICY title_streaming_availability_public_read ON public.title_streaming_availability FOR SELECT USING (true);
CREATE POLICY title_transformation_scores_public_read ON public.title_transformation_scores FOR SELECT USING (true);
CREATE POLICY title_user_emotion_match_cache_public_read ON public.title_user_emotion_match_cache FOR SELECT USING (true);
CREATE POLICY titles_public_read ON public.titles FOR SELECT USING (true);
CREATE POLICY "Anyone can read enabled countries" ON public.enabled_countries FOR SELECT USING (true);
CREATE POLICY "Anyone can read tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR SELECT USING (true);
CREATE POLICY "Anyone can read tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR SELECT USING (true);

-- Authenticated user policies (user owns their data)
CREATE POLICY feedback_insert_auth ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY friend_connections_auth ON public.friend_connections FOR ALL TO authenticated
    USING ((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth()))
    WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY personality_profiles_auth ON public.personality_profiles FOR ALL TO authenticated
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY recommendation_outcomes_auth ON public.recommendation_outcomes FOR ALL TO authenticated
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_context_logs_auth ON public.user_context_logs FOR ALL TO authenticated
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states FOR ALL TO authenticated
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_language_preferences_auth ON public.user_language_preferences FOR ALL TO authenticated
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY user_social_recommendations_auth ON public.user_social_recommendations FOR ALL TO authenticated
    USING ((sender_user_id = get_user_id_from_auth()) OR (receiver_user_id = get_user_id_from_auth()))
    WITH CHECK (sender_user_id = get_user_id_from_auth());
CREATE POLICY user_streaming_subscriptions_auth ON public.user_streaming_subscriptions FOR ALL TO authenticated
    USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());

-- Admin policies
CREATE POLICY "Admins can manage enabled countries" ON public.enabled_countries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification policies
CREATE POLICY "Users can read their own notifications" ON public.recommendation_notifications FOR SELECT
    USING (receiver_user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update their notifications" ON public.recommendation_notifications FOR UPDATE
    USING (receiver_user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can create notifications" ON public.recommendation_notifications FOR INSERT
    WITH CHECK ((sender_user_id = (SELECT id FROM users WHERE auth_id = auth.uid())) 
        OR (receiver_user_id IN (SELECT sender_user_id FROM user_social_recommendations 
            WHERE receiver_user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))));

-- =====================================================
-- END OF DUMP
-- =====================================================
