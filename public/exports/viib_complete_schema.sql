-- ============================================================
-- ViiB Complete Database Schema Export
-- Generated: 2025-12-15
-- ============================================================

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

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


-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- Users table (custom auth - NOT using Supabase Auth)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone_number TEXT,
    full_name TEXT,
    username TEXT,
    password_hash TEXT,
    country TEXT,
    timezone TEXT,
    language_preference TEXT,
    signup_method TEXT,
    is_age_over_18 BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_phone_verified BOOLEAN NOT NULL DEFAULT false,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    last_onboarding_step TEXT DEFAULT '/app/onboarding/welcome',
    ip_address TEXT,
    ip_country TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles (for admin access control)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Phone verifications (OTP)
CREATE TABLE public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email verifications (OTP)
CREATE TABLE public.email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activation codes
CREATE TABLE public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    used_by UUID REFERENCES public.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 3: CONTENT CATALOG TABLES
-- ============================================================

-- Titles (movies and TV shows)
CREATE TABLE public.titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id INTEGER,
    title_type TEXT, -- 'movie' or 'tv'
    name TEXT,
    original_name TEXT,
    original_language TEXT,
    overview TEXT,
    tagline TEXT,
    status TEXT,
    release_date DATE,
    first_air_date DATE,
    last_air_date DATE,
    runtime INTEGER,
    episode_run_time INTEGER[],
    popularity DOUBLE PRECISION,
    vote_average DOUBLE PRECISION,
    poster_path TEXT,
    backdrop_path TEXT,
    imdb_id TEXT,
    is_adult BOOLEAN DEFAULT false,
    title_genres JSON,
    trailer_url TEXT,
    trailer_transcript TEXT,
    is_tmdb_trailer BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Genres
CREATE TABLE public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    genre_name TEXT NOT NULL,
    tmdb_genre_id INTEGER
);

-- Title genres junction table
CREATE TABLE public.title_genres (
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, genre_id)
);

-- Spoken languages
CREATE TABLE public.spoken_languages (
    iso_639_1 VARCHAR(10) PRIMARY KEY,
    language_name TEXT NOT NULL,
    flag_emoji TEXT
);

-- Title spoken languages junction
CREATE TABLE public.title_spoken_languages (
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    iso_639_1 VARCHAR(10) NOT NULL REFERENCES public.spoken_languages(iso_639_1) ON DELETE CASCADE,
    PRIMARY KEY (title_id, iso_639_1)
);

-- Seasons (for TV shows)
CREATE TABLE public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    poster_path TEXT,
    air_date DATE,
    episode_count INTEGER,
    trailer_url TEXT,
    trailer_transcript TEXT,
    is_tmdb_trailer BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Episodes
CREATE TABLE public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    air_date DATE,
    runtime INTEGER,
    still_path TEXT,
    vote_average DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Keywords
CREATE TABLE public.keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tmdb_keyword_id INTEGER
);

-- Title keywords junction
CREATE TABLE public.title_keywords (
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, keyword_id)
);

-- Streaming services
CREATE TABLE public.streaming_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Title streaming availability
CREATE TABLE public.title_streaming_availability (
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id) ON DELETE CASCADE,
    region_code TEXT NOT NULL,
    PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- Official trailer channels (YouTube)
CREATE TABLE public.official_trailer_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name TEXT NOT NULL,
    channel_id TEXT,
    language_code TEXT NOT NULL,
    region TEXT,
    category TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 4: EMOTION & RECOMMENDATION TABLES
-- ============================================================

-- Emotion master (all emotions)
CREATE TABLE public.emotion_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotion_label TEXT NOT NULL,
    category TEXT NOT NULL, -- 'user_state', 'content_state', 'content_tone'
    description TEXT,
    valence REAL,
    arousal REAL,
    dominance REAL,
    intensity_multiplier REAL DEFAULT 1.0,
    created_at TIMESTAMP WITHOUT TIME ZONE
);

-- Emotion display phrases (for UI)
CREATE TABLE public.emotion_display_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    display_phrase TEXT NOT NULL,
    min_intensity REAL NOT NULL,
    max_intensity REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User emotion states (user's current mood)
CREATE TABLE public.user_emotion_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    intensity REAL NOT NULL DEFAULT 0.1,
    valence REAL,
    arousal REAL,
    dominance REAL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ViiB emotion classified titles (content emotions)
CREATE TABLE public.viib_emotion_classified_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    intensity_level INTEGER NOT NULL,
    source TEXT -- 'ai', 'manual', etc.
);

-- ViiB emotion classified titles staging (for AI classification)
CREATE TABLE public.viib_emotion_classified_titles_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    intensity_level INTEGER NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Title emotion vectors (materialized VAD vectors)
CREATE TABLE public.title_emotion_vectors (
    title_id UUID PRIMARY KEY REFERENCES public.titles(id) ON DELETE CASCADE,
    valence REAL NOT NULL,
    arousal REAL NOT NULL,
    dominance REAL NOT NULL,
    emotion_strength REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Emotion transformation map (user mood -> content mood mappings)
CREATE TABLE public.emotion_transformation_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    content_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    transformation_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    priority_rank SMALLINT
);

-- Emotion to intent map
CREATE TABLE public.emotion_to_intent_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    intent_type TEXT NOT NULL,
    weight REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Title transformation scores (materialized)
CREATE TABLE public.title_transformation_scores (
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    transformation_score REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_emotion_id, title_id)
);

-- ViiB intent classified titles
CREATE TABLE public.viib_intent_classified_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    intent_type TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ViiB intent classified titles staging
CREATE TABLE public.viib_intent_classified_titles_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    intent_type public.viib_intent_type NOT NULL,
    confidence_score REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'ai',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Title intent alignment scores (materialized)
CREATE TABLE public.title_intent_alignment_scores (
    user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    alignment_score REAL NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_emotion_id, title_id)
);

-- ViiB title intent stats
CREATE TABLE public.viib_title_intent_stats (
    title_id UUID PRIMARY KEY REFERENCES public.titles(id) ON DELETE CASCADE,
    intent_count INTEGER NOT NULL DEFAULT 0,
    primary_intent_type TEXT,
    primary_confidence_score REAL,
    last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Title social summary (materialized)
CREATE TABLE public.title_social_summary (
    title_id UUID PRIMARY KEY REFERENCES public.titles(id) ON DELETE CASCADE,
    social_mean_rating REAL,
    social_rec_power REAL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ViiB weight config (recommendation weights)
CREATE TABLE public.viib_weight_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emotional_weight REAL NOT NULL,
    social_weight REAL NOT NULL,
    historical_weight REAL NOT NULL,
    context_weight REAL NOT NULL,
    novelty_weight REAL NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recommendation outcomes (for autotuning)
CREATE TABLE public.recommendation_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    was_selected BOOLEAN NOT NULL,
    watch_duration_percentage REAL,
    rating_value public.rating_value,
    recommended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 5: USER PREFERENCES & INTERACTIONS
-- ============================================================

-- User vibe preferences
CREATE TABLE public.user_vibe_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    vibe_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User language preferences
CREATE TABLE public.user_language_preferences (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL REFERENCES public.spoken_languages(iso_639_1) ON DELETE CASCADE,
    priority_order INTEGER,
    PRIMARY KEY (user_id, language_code)
);

-- User streaming subscriptions
CREATE TABLE public.user_streaming_subscriptions (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, streaming_service_id)
);

-- User title interactions (watchlist, ratings, etc.)
CREATE TABLE public.user_title_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    interaction_type public.interaction_type NOT NULL,
    season_number INTEGER,
    rating_value public.rating_value DEFAULT 'not_rated',
    watch_duration_percentage REAL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User context logs (session info)
CREATE TABLE public.user_context_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_type TEXT,
    location_type TEXT,
    time_of_day_bucket TEXT,
    session_length_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Personality profiles
CREATE TABLE public.personality_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type_name TEXT,
    description TEXT,
    introversion_score REAL,
    emotional_sensitivity REAL,
    risk_tolerance REAL,
    sensation_seeking REAL,
    empathy_level REAL,
    analytical_thinking REAL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 6: SOCIAL FEATURES
-- ============================================================

-- Friend connections
CREATE TABLE public.friend_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    friend_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship_type TEXT,
    trust_score REAL NOT NULL DEFAULT 0.5,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User social recommendations
CREATE TABLE public.user_social_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 7: VIBE LISTS
-- ============================================================

-- Vibe lists
CREATE TABLE public.vibe_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'private',
    mood_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list items
CREATE TABLE public.vibe_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    title_id TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list followers
CREATE TABLE public.vibe_list_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    follower_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list shared with
CREATE TABLE public.vibe_list_shared_with (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list views
CREATE TABLE public.vibe_list_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 8: ADMIN & SYSTEM TABLES
-- ============================================================

-- Jobs
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    is_active BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB DEFAULT '{}',
    total_titles_processed INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_duration_seconds INTEGER,
    next_run_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System logs
CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    screen TEXT,
    operation TEXT,
    severity TEXT NOT NULL DEFAULT 'error',
    context JSONB,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feedback
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email config
CREATE TABLE public.email_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Email templates
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rate limit config
CREATE TABLE public.rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- ============================================================
-- SECTION 9: VIEWS
-- ============================================================

-- ViiB recommendation debug view
CREATE OR REPLACE VIEW public.viib_recommendation_debug AS
SELECT
    user_id,
    title_id,
    base_viib_score,
    social_priority_score,
    final_score
FROM (
    SELECT
        ues.user_id,
        t.id AS title_id,
        public.viib_score(ues.user_id, t.id) AS base_viib_score,
        public.viib_social_priority_score(ues.user_id, t.id) AS social_priority_score,
        GREATEST(public.viib_score(ues.user_id, t.id), public.viib_social_priority_score(ues.user_id, t.id)) AS final_score
    FROM public.user_emotion_states ues
    CROSS JOIN public.titles t
    WHERE ues.created_at = (
        SELECT MAX(created_at) FROM public.user_emotion_states WHERE user_id = ues.user_id
    )
) subquery;


-- ============================================================
-- SECTION 10: TRIGGERS
-- ============================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.update_feedback_updated_at();

CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_jobs_updated_at();

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vibe_lists_updated_at
    BEFORE UPDATE ON public.vibe_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_vibe_lists_updated_at();

CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vibe_preferences_updated_at
    BEFORE UPDATE ON public.user_vibe_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_vibe_preferences_updated_at();

CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON public.email_config
    FOR EACH ROW EXECUTE FUNCTION public.update_email_config_updated_at();

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_email_templates_updated_at();

CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rate_limit_config_updated_at
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW EXECUTE FUNCTION public.update_rate_limit_config_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;


-- ============================================================
-- SECTION 11: SEED DATA - STREAMING SERVICES
-- ============================================================

INSERT INTO public.streaming_services (id, service_name, is_active) VALUES
    ('8e6cb53f-4609-4aa2-a441-40f0768dd2ea', 'Netflix', true),
    ('7f689512-cc1a-4a38-9921-8a6eec4acf73', 'Prime Video', true),
    ('c732ac52-2ad9-40d0-8d43-ab1447f9b644', 'Hulu', true),
    ('f0887ed0-3413-4a12-92e5-3acfb4ec8547', 'Apple TV+', true),
    ('2c65ad3f-30a3-42d6-ab28-d6f9c990bef9', 'Disney+', true),
    ('d38ce87f-9535-4f1d-8bf9-20bf0e33c9d5', 'HBO Max', true)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 12: SEED DATA - GENRES
-- ============================================================

INSERT INTO public.genres (id, genre_name, tmdb_genre_id) VALUES
    ('8924b70f-0e60-4856-86a9-d16d5014cdb8', 'Action', 28),
    ('82c1bd52-32d5-4ad9-82f3-e7fb7c885cef', 'Adventure', 12),
    ('7a861137-b022-4dcf-adbc-9e18bd2e9eac', 'Animation', 16),
    ('9f0f8994-c1f5-4c01-9b33-43093157a07f', 'Comedy', 35),
    ('e4ab05d8-3c6c-4bb8-aefb-6e8130eda86d', 'Crime', 80),
    ('988d081a-abd3-4b06-8de7-d7554f069bc7', 'Documentary', 99),
    ('bb428b6a-4d62-4d72-a097-23b85a86e9e1', 'Drama', 18),
    ('82607244-91ca-468c-bae6-49b0bc88b266', 'Family', 10751),
    ('89e45e74-5535-47c0-9f9e-bc5ab5f0f0b0', 'Fantasy', 14),
    ('9d70a034-a9be-4a93-a981-80281d012e2b', 'History', 36),
    ('4e6a5fa3-aa60-4ebb-9b99-73a4c77ba515', 'Horror', 27),
    ('2af8e9d2-0e00-42ab-9b55-6fc9964dd32a', 'Music', 10402),
    ('c8f954ed-a9df-45dd-a8e6-8928b1d2aa56', 'Mystery', 9648),
    ('338c6b91-42cb-4536-b26f-adcae626aeb2', 'Romance', 10749),
    ('0f62a2a2-ea40-43c4-9a41-7e1af997485a', 'Science Fiction', 878),
    ('853024d2-bca4-4291-b330-84eee60644a6', 'Thriller', 53),
    ('045e19a2-cb6b-442d-a197-e629c075a0a1', 'War', 10752),
    ('2ceacb1a-2dbf-4224-8b65-0cd473203861', 'Western', 37)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 13: SEED DATA - JOBS
-- ============================================================

INSERT INTO public.jobs (job_type, job_name, status, is_active, configuration) VALUES
    ('full_refresh', 'Full Refresh Titles', 'idle', true, '{"start_year": 2020, "end_year": 2025, "min_rating": 6}'),
    ('sync_delta', 'Nightly Sync Delta', 'idle', true, '{"lookback_days": 7}'),
    ('enrich_trailers', 'Enrich Title Trailers', 'idle', true, '{"batch_size": 50}'),
    ('transcribe_trailers', 'Transcribe Trailers', 'idle', true, '{"batch_size": 10}'),
    ('classify_ai', 'Classify Title AI', 'idle', true, '{"batch_size": 10}'),
    ('promote_ai', 'Promote AI Classifications', 'idle', true, '{"batch_size": 50}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- END OF SCHEMA EXPORT
-- ============================================================
