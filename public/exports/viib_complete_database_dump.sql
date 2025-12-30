-- ============================================================================
-- ViiB COMPLETE DATABASE DUMP
-- Generated: 2024-12-30
-- Description: Complete database schema including ENUMs, tables, functions,
--              indexes, constraints, triggers, and RLS policies
-- ============================================================================

-- ============================================================================
-- PART 1: ENUM TYPES
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
CREATE TYPE public.viib_intent_type AS ENUM ('adrenaline_rush', 'background_passive', 'comfort_escape', 'deep_thought', 'discovery', 'emotional_release', 'family_bonding', 'light_entertainment', 'romance', 'social_bonding', 'suspense_thrill');

-- ============================================================================
-- PART 2: TABLES
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
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    attempt_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);

-- emotion_master
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

-- emotion_display_phrases
CREATE TABLE public.emotion_display_phrases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    display_phrase text NOT NULL,
    min_intensity real NOT NULL,
    max_intensity real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_display_phrases_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_display_phrases_emotion_phrase_unique UNIQUE (emotion_id, display_phrase),
    CONSTRAINT uq_emotion_display_range UNIQUE (emotion_id, min_intensity, max_intensity),
    CONSTRAINT emotion_display_phrases_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- emotion_to_intent_map
CREATE TABLE public.emotion_to_intent_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_id uuid NOT NULL,
    intent_type text NOT NULL,
    weight real NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT emotion_to_intent_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_to_intent_map_emotion_intent_unique UNIQUE (emotion_id, intent_type),
    CONSTRAINT emotion_to_intent_unique UNIQUE (emotion_id, intent_type),
    CONSTRAINT emotion_to_intent_map_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- emotion_transformation_map
CREATE TABLE public.emotion_transformation_map (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_emotion_id uuid NOT NULL,
    content_emotion_id uuid NOT NULL,
    transformation_type text NOT NULL,
    confidence_score real NOT NULL,
    priority_rank smallint,
    CONSTRAINT emotion_transformation_map_pkey PRIMARY KEY (id),
    CONSTRAINT emotion_transformation_map_user_content_unique UNIQUE (user_emotion_id, content_emotion_id),
    CONSTRAINT emotion_transformation_map_from_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id),
    CONSTRAINT emotion_transformation_map_to_emotion_id_fkey FOREIGN KEY (content_emotion_id) REFERENCES public.emotion_master(id)
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

-- genres
CREATE TABLE public.genres (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    genre_name text NOT NULL,
    tmdb_genre_id integer,
    CONSTRAINT genres_pkey PRIMARY KEY (id)
);

-- keywords
CREATE TABLE public.keywords (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tmdb_keyword_id integer,
    CONSTRAINT keywords_pkey PRIMARY KEY (id)
);

-- spoken_languages
CREATE TABLE public.spoken_languages (
    iso_639_1 character varying NOT NULL,
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
    CONSTRAINT streaming_services_pkey PRIMARY KEY (id)
);

-- titles
CREATE TABLE public.titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    original_name text,
    title_type text,
    overview text,
    poster_path text,
    backdrop_path text,
    release_date date,
    first_air_date date,
    last_air_date date,
    runtime integer,
    episode_run_time integer[],
    status text,
    original_language text,
    popularity double precision,
    vote_average double precision,
    tmdb_id integer,
    imdb_id text,
    is_adult boolean DEFAULT false,
    trailer_url text,
    trailer_transcript text,
    is_tmdb_trailer boolean DEFAULT true,
    certification text,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    title_genres json,
    classification_status text DEFAULT 'pending'::text,
    last_classified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT titles_pkey PRIMARY KEY (id)
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
    is_tmdb_trailer boolean DEFAULT true,
    rt_cscore integer,
    rt_ccount integer,
    rt_ascore integer,
    rt_acount integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT seasons_pkey PRIMARY KEY (id),
    CONSTRAINT seasons_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- episodes
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
    CONSTRAINT episodes_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id)
);

-- title_genres
CREATE TABLE public.title_genres (
    title_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    CONSTRAINT title_genres_pkey PRIMARY KEY (title_id, genre_id),
    CONSTRAINT title_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id),
    CONSTRAINT title_genres_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- title_streaming_availability
CREATE TABLE public.title_streaming_availability (
    title_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    region_code text NOT NULL,
    CONSTRAINT title_streaming_availability_pkey PRIMARY KEY (title_id, streaming_service_id, region_code),
    CONSTRAINT title_streaming_availability_streaming_service_id_fkey FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id),
    CONSTRAINT title_streaming_availability_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- title_emotion_vectors
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

-- title_transformation_scores
CREATE TABLE public.title_transformation_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    transformation_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_transformation_scores_pkey PRIMARY KEY (title_id, user_emotion_id),
    CONSTRAINT title_transformation_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_transformation_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id)
);

-- title_intent_alignment_scores
CREATE TABLE public.title_intent_alignment_scores (
    title_id uuid NOT NULL,
    user_emotion_id uuid NOT NULL,
    alignment_score real NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_intent_alignment_scores_pkey PRIMARY KEY (title_id, user_emotion_id),
    CONSTRAINT title_intent_alignment_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT title_intent_alignment_scores_user_emotion_id_fkey FOREIGN KEY (user_emotion_id) REFERENCES public.emotion_master(id)
);

-- title_social_summary
CREATE TABLE public.title_social_summary (
    title_id uuid NOT NULL,
    social_mean_rating real,
    social_rec_power real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT title_social_summary_pkey PRIMARY KEY (title_id),
    CONSTRAINT title_social_summary_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- title_user_emotion_match_cache
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

-- viib_emotion_classified_titles
CREATE TABLE public.viib_emotion_classified_titles (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level integer NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_pkey PRIMARY KEY (title_id, emotion_id),
    CONSTRAINT viib_emotion_classified_titles_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id),
    CONSTRAINT viib_emotion_classified_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- viib_emotion_classified_titles_staging
CREATE TABLE public.viib_emotion_classified_titles_staging (
    title_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    intensity_level integer NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_emotion_classified_titles_staging_pkey PRIMARY KEY (title_id, emotion_id)
);

-- viib_intent_classified_titles
CREATE TABLE public.viib_intent_classified_titles (
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_pkey PRIMARY KEY (title_id, intent_type),
    CONSTRAINT viib_intent_classified_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- viib_intent_classified_titles_staging
CREATE TABLE public.viib_intent_classified_titles_staging (
    title_id uuid NOT NULL,
    intent_type text NOT NULL,
    confidence_score real NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_intent_classified_titles_staging_pkey PRIMARY KEY (title_id, intent_type)
);

-- viib_title_intent_stats
CREATE TABLE public.viib_title_intent_stats (
    title_id uuid NOT NULL,
    primary_intent text,
    secondary_intent text,
    intent_diversity_score real,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT viib_title_intent_stats_pkey PRIMARY KEY (title_id),
    CONSTRAINT viib_title_intent_stats_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
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

-- vibes
CREATE TABLE public.vibes (
    id uuid NOT NULL,
    label text NOT NULL,
    canonical_key text,
    description text,
    component_ratios jsonb NOT NULL DEFAULT '{}'::jsonb,
    base_weight real NOT NULL DEFAULT 1.0,
    decay_half_life_days real NOT NULL DEFAULT 7,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibes_pkey PRIMARY KEY (id),
    CONSTRAINT vibes_canonical_key_key UNIQUE (canonical_key)
);

-- vibe_emotion_weights
CREATE TABLE public.vibe_emotion_weights (
    vibe_id uuid NOT NULL,
    emotion_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_emotion_weights_pkey PRIMARY KEY (vibe_id, emotion_id),
    CONSTRAINT vibe_emotion_weights_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id)
);

-- vibe_genre_weights
CREATE TABLE public.vibe_genre_weights (
    vibe_id uuid NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_pkey PRIMARY KEY (vibe_id, genre_id),
    CONSTRAINT vibe_genre_weights_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id)
);

-- vibe_genre_weights_key
CREATE TABLE public.vibe_genre_weights_key (
    canonical_key text NOT NULL,
    genre_id uuid NOT NULL,
    weight real NOT NULL,
    CONSTRAINT vibe_genre_weights_key_pkey PRIMARY KEY (canonical_key, genre_id),
    CONSTRAINT vibe_genre_weights_key_canonical_fk FOREIGN KEY (canonical_key) REFERENCES public.vibes(canonical_key)
);

-- users
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_id uuid,
    email text,
    phone_number text,
    full_name text,
    username text,
    password_hash text,
    country text,
    timezone text,
    language_preference text,
    is_active boolean NOT NULL DEFAULT true,
    is_phone_verified boolean NOT NULL DEFAULT false,
    is_email_verified boolean NOT NULL DEFAULT false,
    is_age_over_18 boolean NOT NULL,
    signup_method text,
    onboarding_completed boolean NOT NULL DEFAULT false,
    last_onboarding_step text,
    ip_address text,
    ip_country text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- user_roles
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
    CONSTRAINT user_vibe_preferences_user_id_key UNIQUE (user_id),
    CONSTRAINT user_vibe_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- user_language_preferences
CREATE TABLE public.user_language_preferences (
    user_id uuid NOT NULL,
    language_code text NOT NULL,
    priority_order integer,
    CONSTRAINT user_language_preferences_pkey PRIMARY KEY (user_id, language_code),
    CONSTRAINT user_language_preferences_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.spoken_languages(iso_639_1),
    CONSTRAINT user_language_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- user_streaming_subscriptions
CREATE TABLE public.user_streaming_subscriptions (
    user_id uuid NOT NULL,
    streaming_service_id uuid NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT user_streaming_subscriptions_pkey PRIMARY KEY (user_id, streaming_service_id),
    CONSTRAINT user_streaming_subscriptions_streaming_service_id_fkey FOREIGN KEY (streaming_service_id) REFERENCES public.streaming_services(id),
    CONSTRAINT user_streaming_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- user_emotion_states
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
    CONSTRAINT user_emotion_states_emotion_id_fkey FOREIGN KEY (emotion_id) REFERENCES public.emotion_master(id),
    CONSTRAINT user_emotion_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- user_title_interactions
CREATE TABLE public.user_title_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    interaction_type public.interaction_type NOT NULL,
    rating_value public.rating_value DEFAULT 'not_rated'::public.rating_value,
    watch_duration_percentage real,
    season_number integer,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_interactions_pkey PRIMARY KEY (id),
    CONSTRAINT user_title_interactions_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT user_title_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- user_title_social_scores
CREATE TABLE public.user_title_social_scores (
    user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    social_priority_score real NOT NULL,
    social_component_score real NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_title_social_scores_pkey PRIMARY KEY (user_id, title_id),
    CONSTRAINT user_title_social_scores_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
);

-- user_context_logs
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

-- friend_connections
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
    CONSTRAINT friend_connections_friend_user_id_fkey FOREIGN KEY (friend_user_id) REFERENCES public.users(id),
    CONSTRAINT friend_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- user_social_recommendations
CREATE TABLE public.user_social_recommendations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_user_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    title_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_social_recommendations_pkey PRIMARY KEY (id),
    CONSTRAINT user_social_recommendations_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id),
    CONSTRAINT user_social_recommendations_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id),
    CONSTRAINT user_social_recommendations_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
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
    CONSTRAINT recommendation_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_notifications_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id),
    CONSTRAINT recommendation_notifications_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id),
    CONSTRAINT recommendation_notifications_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id)
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
    CONSTRAINT recommendation_outcomes_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_outcomes_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id),
    CONSTRAINT recommendation_outcomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- personality_profiles
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

-- vibe_lists
CREATE TABLE public.vibe_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    visibility text NOT NULL DEFAULT 'private'::text,
    mood_tags text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_lists_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- vibe_list_items
CREATE TABLE public.vibe_list_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    title_id uuid NOT NULL,
    added_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_items_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_items_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id)
);

-- vibe_list_followers
CREATE TABLE public.vibe_list_followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    follower_user_id uuid NOT NULL,
    followed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_followers_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_followers_follower_user_id_fkey FOREIGN KEY (follower_user_id) REFERENCES public.users(id),
    CONSTRAINT vibe_list_followers_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id)
);

-- vibe_list_shared_with
CREATE TABLE public.vibe_list_shared_with (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    shared_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_shared_with_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_shared_with_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id),
    CONSTRAINT vibe_list_shared_with_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id)
);

-- vibe_list_views
CREATE TABLE public.vibe_list_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vibe_list_id uuid NOT NULL,
    viewer_user_id uuid,
    viewed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vibe_list_views_pkey PRIMARY KEY (id),
    CONSTRAINT vibe_list_views_vibe_list_id_fkey FOREIGN KEY (vibe_list_id) REFERENCES public.vibe_lists(id),
    CONSTRAINT vibe_list_views_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES public.users(id)
);

-- phone_verifications
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

-- session_tokens
CREATE TABLE public.session_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    issued_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    is_remember_me boolean DEFAULT false,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT session_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- login_attempts
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
    CONSTRAINT rate_limit_config_pkey PRIMARY KEY (id)
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

-- ip_rate_limits
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

-- feedback
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

-- system_logs
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
    CONSTRAINT system_logs_pkey PRIMARY KEY (id),
    CONSTRAINT system_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id),
    CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- jobs
CREATE TABLE public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_name text NOT NULL,
    job_type text NOT NULL,
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
    CONSTRAINT jobs_pkey PRIMARY KEY (id)
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

-- tmdb_genre_mappings
CREATE TABLE public.tmdb_genre_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_genre_id integer NOT NULL,
    genre_name text NOT NULL,
    media_type text NOT NULL DEFAULT 'both'::text,
    tv_equivalent_id integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_genre_mappings_pkey PRIMARY KEY (id)
);

-- tmdb_provider_mappings
CREATE TABLE public.tmdb_provider_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tmdb_provider_id integer NOT NULL,
    service_name text NOT NULL,
    region_code text NOT NULL DEFAULT 'US'::text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tmdb_provider_mappings_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

-- activation_codes indexes
CREATE INDEX idx_activation_codes_code ON public.activation_codes USING btree (code);
CREATE INDEX idx_activation_codes_created_at ON public.activation_codes USING btree (created_at DESC);
CREATE INDEX idx_activation_codes_used ON public.activation_codes USING btree (is_used);

-- app_settings indexes
CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (setting_key);

-- email indexes
CREATE INDEX idx_email_config_active ON public.email_config USING btree (is_active);
CREATE INDEX idx_email_templates_active ON public.email_templates USING btree (is_active);
CREATE INDEX idx_email_templates_type ON public.email_templates USING btree (template_type);
CREATE INDEX idx_email_verifications_email ON public.email_verifications USING btree (email);
CREATE INDEX idx_email_verifications_expires ON public.email_verifications USING btree (expires_at);
CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications USING btree (expires_at);

-- emotion indexes
CREATE INDEX idx_e2i_intent_type ON public.emotion_to_intent_map USING btree (intent_type);

-- episodes indexes
CREATE INDEX idx_episodes_season ON public.episodes USING btree (season_id);

-- feedback indexes
CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX idx_feedback_type ON public.feedback USING btree (type);
CREATE INDEX idx_feedback_user ON public.feedback USING btree (user_id);

-- friend_connections indexes
CREATE INDEX idx_friend_connections_friend ON public.friend_connections USING btree (friend_user_id);
CREATE INDEX idx_friend_connections_user ON public.friend_connections USING btree (user_id);

-- genres indexes
CREATE INDEX idx_genres_tmdb ON public.genres USING btree (tmdb_genre_id);

-- ip_rate_limits indexes
CREATE INDEX idx_ip_rate_limits_lookup ON public.ip_rate_limits USING btree (ip_address, endpoint);

-- jobs indexes
CREATE INDEX idx_jobs_active ON public.jobs USING btree (is_active);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX idx_jobs_type ON public.jobs USING btree (job_type);

-- keywords indexes
CREATE INDEX idx_keywords_name ON public.keywords USING btree (name);
CREATE INDEX idx_keywords_tmdb ON public.keywords USING btree (tmdb_keyword_id);

-- login_attempts indexes
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts USING btree (created_at);
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts USING btree (identifier);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address);

-- phone_verifications indexes
CREATE INDEX idx_phone_verifications_expires ON public.phone_verifications USING btree (expires_at);
CREATE INDEX idx_phone_verifications_expires_at ON public.phone_verifications USING btree (expires_at);
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications USING btree (phone_number);

-- rate_limit indexes
CREATE INDEX idx_rate_limit_config_endpoint ON public.rate_limit_config USING btree (endpoint);
CREATE INDEX idx_rate_limit_entries_expires ON public.rate_limit_entries USING btree (expires_at);
CREATE INDEX idx_rate_limit_entries_key ON public.rate_limit_entries USING btree (key);

-- recommendation indexes
CREATE INDEX idx_rec_notifications_receiver ON public.recommendation_notifications USING btree (receiver_user_id);
CREATE INDEX idx_rec_notifications_title ON public.recommendation_notifications USING btree (title_id);
CREATE INDEX idx_rec_outcomes_title ON public.recommendation_outcomes USING btree (title_id);
CREATE INDEX idx_rec_outcomes_user ON public.recommendation_outcomes USING btree (user_id);

-- seasons indexes
CREATE INDEX idx_seasons_title ON public.seasons USING btree (title_id);

-- session_tokens indexes
CREATE INDEX idx_session_tokens_expires ON public.session_tokens USING btree (expires_at);
CREATE INDEX idx_session_tokens_token ON public.session_tokens USING btree (token_hash);
CREATE INDEX idx_session_tokens_user ON public.session_tokens USING btree (user_id);

-- system_logs indexes
CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at DESC);
CREATE INDEX idx_system_logs_resolved ON public.system_logs USING btree (resolved);
CREATE INDEX idx_system_logs_severity ON public.system_logs USING btree (severity);
CREATE INDEX idx_system_logs_user ON public.system_logs USING btree (user_id);

-- title indexes
CREATE INDEX idx_title_emotion_vectors_title ON public.title_emotion_vectors USING btree (title_id);
CREATE INDEX idx_title_genres_genre ON public.title_genres USING btree (genre_id);
CREATE INDEX idx_title_genres_title ON public.title_genres USING btree (title_id);
CREATE INDEX idx_title_intent_alignment_emotion ON public.title_intent_alignment_scores USING btree (user_emotion_id);
CREATE INDEX idx_title_intent_alignment_title ON public.title_intent_alignment_scores USING btree (title_id);
CREATE INDEX idx_title_social_summary_title ON public.title_social_summary USING btree (title_id);
CREATE INDEX idx_title_streaming_region ON public.title_streaming_availability USING btree (region_code);
CREATE INDEX idx_title_streaming_service ON public.title_streaming_availability USING btree (streaming_service_id);
CREATE INDEX idx_title_streaming_title ON public.title_streaming_availability USING btree (title_id);
CREATE INDEX idx_title_transformation_emotion ON public.title_transformation_scores USING btree (user_emotion_id);
CREATE INDEX idx_title_transformation_title ON public.title_transformation_scores USING btree (title_id);
CREATE INDEX idx_titles_classification ON public.titles USING btree (classification_status);
CREATE INDEX idx_titles_name ON public.titles USING btree (name);
CREATE INDEX idx_titles_popularity ON public.titles USING btree (popularity DESC);
CREATE INDEX idx_titles_tmdb ON public.titles USING btree (tmdb_id);
CREATE INDEX idx_titles_type ON public.titles USING btree (title_type);

-- user indexes
CREATE INDEX idx_user_context_logs_user ON public.user_context_logs USING btree (user_id);
CREATE INDEX idx_user_emotion_states_created ON public.user_emotion_states USING btree (created_at DESC);
CREATE INDEX idx_user_emotion_states_emotion ON public.user_emotion_states USING btree (emotion_id);
CREATE INDEX idx_user_emotion_states_user ON public.user_emotion_states USING btree (user_id);
CREATE INDEX idx_user_language_prefs_lang ON public.user_language_preferences USING btree (language_code);
CREATE INDEX idx_user_language_prefs_user ON public.user_language_preferences USING btree (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);
CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_social_recs_receiver ON public.user_social_recommendations USING btree (receiver_user_id);
CREATE INDEX idx_user_social_recs_sender ON public.user_social_recommendations USING btree (sender_user_id);
CREATE INDEX idx_user_social_recs_title ON public.user_social_recommendations USING btree (title_id);
CREATE INDEX idx_user_streaming_service ON public.user_streaming_subscriptions USING btree (streaming_service_id);
CREATE INDEX idx_user_streaming_user ON public.user_streaming_subscriptions USING btree (user_id);
CREATE INDEX idx_user_title_interactions_created ON public.user_title_interactions USING btree (created_at DESC);
CREATE INDEX idx_user_title_interactions_title ON public.user_title_interactions USING btree (title_id);
CREATE INDEX idx_user_title_interactions_type ON public.user_title_interactions USING btree (interaction_type);
CREATE INDEX idx_user_title_interactions_user ON public.user_title_interactions USING btree (user_id);
CREATE INDEX idx_user_title_social_scores_title ON public.user_title_social_scores USING btree (title_id);
CREATE INDEX idx_user_title_social_scores_user ON public.user_title_social_scores USING btree (user_id);
CREATE INDEX idx_user_vibe_prefs_canonical ON public.user_vibe_preferences USING btree (canonical_key);
CREATE INDEX idx_user_vibe_prefs_user ON public.user_vibe_preferences USING btree (user_id);
CREATE INDEX idx_users_auth ON public.users USING btree (auth_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);

-- vibe indexes
CREATE INDEX idx_vibe_list_followers_list ON public.vibe_list_followers USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_followers_user ON public.vibe_list_followers USING btree (follower_user_id);
CREATE INDEX idx_vibe_list_items_list ON public.vibe_list_items USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_items_title ON public.vibe_list_items USING btree (title_id);
CREATE INDEX idx_vibe_list_shared_list ON public.vibe_list_shared_with USING btree (vibe_list_id);
CREATE INDEX idx_vibe_list_shared_user ON public.vibe_list_shared_with USING btree (shared_with_user_id);
CREATE INDEX idx_vibe_list_views_list ON public.vibe_list_views USING btree (vibe_list_id);
CREATE INDEX idx_vibe_lists_user ON public.vibe_lists USING btree (user_id);
CREATE INDEX idx_vibe_lists_visibility ON public.vibe_lists USING btree (visibility);

-- viib classification indexes
CREATE INDEX idx_viib_ect_emotion ON public.viib_emotion_classified_titles USING btree (emotion_id);
CREATE INDEX idx_viib_ect_title ON public.viib_emotion_classified_titles USING btree (title_id);
CREATE INDEX idx_viib_ict_intent ON public.viib_intent_classified_titles USING btree (intent_type);
CREATE INDEX idx_viib_ict_title ON public.viib_intent_classified_titles USING btree (title_id);

-- ============================================================================
-- PART 4: DATABASE FUNCTIONS
-- ============================================================================

-- Helper function: has_role
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

-- Helper function: get_user_id_from_auth
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

-- Helper function: get_app_setting
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

-- Emotion function: calculate_user_emotion_intensity
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

-- Emotion function: calculate_emotion_distance_score
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

-- Social function: calculate_taste_similarity
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

-- Ownership check function
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

-- OTP invalidation functions
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

-- Auth linking function
CREATE OR REPLACE FUNCTION public.link_auth_user_to_profile(p_auth_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN UPDATE users SET auth_id = p_auth_id WHERE id = p_user_id; END;
$$;

-- ViiB Weight Config function
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

-- Title lookup function
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

-- Vibe list stats function
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

-- Cron job progress function
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

-- Run cron job function
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

-- Increment job titles function
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

-- Promote title intents function
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

-- Refresh transformation scores function
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

-- Refresh all materializations function
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

-- Rate limit functions
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_data()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM ip_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM rate_limit_entries
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Streaming corruption detection functions
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

CREATE OR REPLACE FUNCTION public.get_titles_with_all_streaming_services(p_limit integer DEFAULT 100, p_cursor uuid DEFAULT NULL)
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

-- ViiB Score functions
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

-- Trigger functions for updated_at timestamps
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

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_title_emotional_signatures_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

CREATE TRIGGER update_feedback_updated_at_trigger
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION public.update_feedback_updated_at();

CREATE TRIGGER update_jobs_updated_at_trigger
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_jobs_updated_at();

CREATE TRIGGER update_email_config_updated_at_trigger
    BEFORE UPDATE ON public.email_config
    FOR EACH ROW EXECUTE FUNCTION public.update_email_config_updated_at();

CREATE TRIGGER update_email_templates_updated_at_trigger
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_email_templates_updated_at();

CREATE TRIGGER update_rate_limit_config_updated_at_trigger
    BEFORE UPDATE ON public.rate_limit_config
    FOR EACH ROW EXECUTE FUNCTION public.update_rate_limit_config_updated_at();

CREATE TRIGGER update_user_vibe_preferences_updated_at_trigger
    BEFORE UPDATE ON public.user_vibe_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_vibe_preferences_updated_at();

CREATE TRIGGER update_vibe_lists_updated_at_trigger
    BEFORE UPDATE ON public.vibe_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_vibe_lists_updated_at();

CREATE TRIGGER update_app_settings_updated_at_trigger
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();

CREATE TRIGGER update_viib_intent_classified_updated_at_trigger
    BEFORE UPDATE ON public.viib_intent_classified_titles
    FOR EACH ROW EXECUTE FUNCTION public.update_viib_intent_classified_titles_updated_at();

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY (RLS) POLICIES
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
ALTER TABLE public.viib_intent_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_weight_config ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY activation_codes_service ON public.activation_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY app_settings_service ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_config_service ON public.email_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_templates_service ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY email_verifications_service_role_all ON public.email_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emotion_display_phrases_service ON public.emotion_display_phrases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY emotion_master_service_write ON public.emotion_master FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY emotion_to_intent_map_service ON public.emotion_to_intent_map FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY emotion_transformation_map_service ON public.emotion_transformation_map FOR ALL TO public USING (true) WITH CHECK (true);
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
CREATE POLICY title_emotion_vectors_service ON public.title_emotion_vectors FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY title_genres_service_write ON public.title_genres FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_intent_alignment_scores_service ON public.title_intent_alignment_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_social_summary_service ON public.title_social_summary FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY title_streaming_availability_service_write ON public.title_streaming_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY title_transformation_scores_service ON public.title_transformation_scores FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY title_user_emotion_match_cache_service ON public.title_user_emotion_match_cache FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY titles_service_write ON public.titles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_context_logs_service ON public.user_context_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_emotion_states_service ON public.user_emotion_states FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_language_preferences_service ON public.user_language_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_roles_service ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_social_recommendations_service ON public.user_social_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_streaming_subscriptions_service ON public.user_streaming_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_title_interactions_service ON public.user_title_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_title_social_scores_service ON public.user_title_social_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_vibe_preferences_service ON public.user_vibe_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY users_service_role_all ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_emotion_weights_service_role ON public.vibe_emotion_weights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_genre_weights_service_role ON public.vibe_genre_weights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_list_followers_service ON public.vibe_list_followers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_list_items_service ON public.vibe_list_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_list_shared_with_service ON public.vibe_list_shared_with FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_list_views_service ON public.vibe_list_views FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vibe_lists_service ON public.vibe_lists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read policies
CREATE POLICY app_settings_anon_read ON public.app_settings FOR SELECT TO anon USING ((setting_key !~~ '%secret%') AND (setting_key !~~ '%key%') AND (setting_key !~~ '%password%') AND (setting_key !~~ '%token%'));
CREATE POLICY emotion_display_phrases_public_read ON public.emotion_display_phrases FOR SELECT TO public USING (true);
CREATE POLICY emotion_master_public_read ON public.emotion_master FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY emotion_to_intent_map_public_read ON public.emotion_to_intent_map FOR SELECT TO public USING (true);
CREATE POLICY emotion_transformation_map_public_read ON public.emotion_transformation_map FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can read enabled countries" ON public.enabled_countries FOR SELECT TO public USING (true);
CREATE POLICY episodes_public_read ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY genres_public_read ON public.genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY keywords_public_read ON public.keywords FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY official_trailer_channels_public_read ON public.official_trailer_channels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY seasons_public_read ON public.seasons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY spoken_languages_public_read ON public.spoken_languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY streaming_services_public_read ON public.streaming_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_emotion_vectors_public_read ON public.title_emotion_vectors FOR SELECT TO public USING (true);
CREATE POLICY title_genres_public_read ON public.title_genres FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_social_summary_public_read ON public.title_social_summary FOR SELECT TO public USING (true);
CREATE POLICY title_streaming_availability_public_read ON public.title_streaming_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY title_transformation_scores_public_read ON public.title_transformation_scores FOR SELECT TO public USING (true);
CREATE POLICY title_user_emotion_match_cache_public_read ON public.title_user_emotion_match_cache FOR SELECT TO public USING (true);
CREATE POLICY titles_public_read ON public.titles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can read tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR SELECT TO public USING (true);
CREATE POLICY vibe_emotion_weights_read_authenticated ON public.vibe_emotion_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY vibe_genre_weights_read_authenticated ON public.vibe_genre_weights FOR SELECT TO authenticated USING (true);

-- Admin policies
CREATE POLICY "Admins can manage enabled countries" ON public.enabled_countries FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tmdb_genre_mappings" ON public.tmdb_genre_mappings FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tmdb_provider_mappings" ON public.tmdb_provider_mappings FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated user policies (own data access)
CREATE POLICY feedback_insert_auth ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY friend_connections_auth ON public.friend_connections FOR ALL TO authenticated USING ((user_id = get_user_id_from_auth()) OR (friend_user_id = get_user_id_from_auth())) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY personality_profiles_auth ON public.personality_profiles FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY recommendation_outcomes_auth ON public.recommendation_outcomes FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_context_logs_auth ON public.user_context_logs FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_emotion_states_auth ON public.user_emotion_states FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_language_preferences_auth ON public.user_language_preferences FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = get_user_id_from_auth());
CREATE POLICY user_social_recommendations_auth ON public.user_social_recommendations FOR ALL TO authenticated USING ((sender_user_id = get_user_id_from_auth()) OR (receiver_user_id = get_user_id_from_auth())) WITH CHECK (sender_user_id = get_user_id_from_auth());
CREATE POLICY user_streaming_subscriptions_auth ON public.user_streaming_subscriptions FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_title_interactions_auth ON public.user_title_interactions FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_title_social_scores_auth ON public.user_title_social_scores FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY user_vibe_preferences_auth ON public.user_vibe_preferences FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (auth_id = auth.uid());
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());
CREATE POLICY vibe_list_followers_auth ON public.vibe_list_followers FOR ALL TO authenticated USING (follower_user_id = get_user_id_from_auth()) WITH CHECK (follower_user_id = get_user_id_from_auth());
CREATE POLICY vibe_list_items_auth ON public.vibe_list_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_items.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth())) WITH CHECK (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_items.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth()));
CREATE POLICY vibe_list_shared_with_auth ON public.vibe_list_shared_with FOR ALL TO authenticated USING ((shared_with_user_id = get_user_id_from_auth()) OR EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_shared_with.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth())) WITH CHECK (EXISTS (SELECT 1 FROM vibe_lists WHERE vibe_lists.id = vibe_list_shared_with.vibe_list_id AND vibe_lists.user_id = get_user_id_from_auth()));
CREATE POLICY vibe_lists_auth ON public.vibe_lists FOR ALL TO authenticated USING (user_id = get_user_id_from_auth()) WITH CHECK (user_id = get_user_id_from_auth());

-- Notification policies
CREATE POLICY "Users can read their own notifications" ON public.recommendation_notifications FOR SELECT TO public USING (receiver_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));
CREATE POLICY "Users can update their notifications" ON public.recommendation_notifications FOR UPDATE TO public USING (receiver_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid()));
CREATE POLICY "Users can create notifications" ON public.recommendation_notifications FOR INSERT TO public WITH CHECK ((sender_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid())) OR (receiver_user_id IN (SELECT user_social_recommendations.sender_user_id FROM user_social_recommendations WHERE user_social_recommendations.receiver_user_id = (SELECT users.id FROM users WHERE users.auth_id = auth.uid()))));

-- ============================================================================
-- END OF COMPLETE DATABASE DUMP
-- ============================================================================
