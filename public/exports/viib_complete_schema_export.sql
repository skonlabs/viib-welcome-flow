-- =====================================================
-- ViiB Complete Database Schema Export
-- Generated: 2024-12-24
-- Project: ibrjwldvyuhwcfzdmimv
-- =====================================================

-- =====================================================
-- PART 1: ENUM TYPES
-- =====================================================

-- Application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Content types
CREATE TYPE public.content_type AS ENUM ('movie', 'series', 'documentary', 'short', 'other');

-- Device types for context logging
CREATE TYPE public.device_type AS ENUM ('mobile', 'tv', 'tablet', 'web', 'other');

-- How content was discovered
CREATE TYPE public.discovery_source AS ENUM ('recommendation', 'search', 'friend', 'trending', 'external_link', 'notification', 'other');

-- Emotion categories
CREATE TYPE public.emotion_category AS ENUM ('user_state', 'content_state', 'content_tone');

-- User engagement actions
CREATE TYPE public.engagement_action AS ENUM ('click', 'preview', 'watch_start', 'watch_complete', 'abandon');

-- Environment tags for viewing context
CREATE TYPE public.environment_tag AS ENUM ('alone', 'family', 'friends', 'commute', 'work', 'public', 'other');

-- Feedback types
CREATE TYPE public.feedback_type AS ENUM ('bug', 'suggestion', 'emotional_response', 'feature_request', 'other');

-- User interaction types with titles
CREATE TYPE public.interaction_type AS ENUM ('started', 'completed', 'liked', 'disliked', 'browsed', 'wishlisted');

-- Model types for AI classification
CREATE TYPE public.model_type AS ENUM ('gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude');

-- Network types
CREATE TYPE public.network_type AS ENUM ('wifi', 'cellular', 'ethernet', 'offline');

-- Notification types
CREATE TYPE public.notification_type AS ENUM ('recommendation', 'social', 'system', 'marketing');

-- Provider types
CREATE TYPE public.provider_type_enum AS ENUM ('streaming', 'rental', 'purchase');

-- Rating values
CREATE TYPE public.rating_value AS ENUM ('love_it', 'like_it', 'ok', 'dislike_it', 'not_rated');

-- Relationship types for friend connections
CREATE TYPE public.relationship_type AS ENUM ('friend', 'family', 'colleague', 'acquaintance');

-- Signup methods
CREATE TYPE public.signup_method AS ENUM ('phone', 'email', 'google', 'apple');

-- Time of day buckets
CREATE TYPE public.time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night', 'late_night');

-- Title types
CREATE TYPE public.title_type_enum AS ENUM ('movie', 'tv');

-- Transformation types for emotion mapping
CREATE TYPE public.transformation_type AS ENUM ('complementary', 'reinforcing', 'neutral_balancing', 'contrasting');

-- ViiB intent types for content classification
CREATE TYPE public.viib_intent_type AS ENUM (
  'escape_reality',
  'feel_inspired',
  'learn_something',
  'laugh_out_loud',
  'feel_the_thrill',
  'have_a_good_cry',
  'background_comfort',
  'share_with_others',
  'nostalgic_revisit',
  'challenge_my_mind'
);


-- =====================================================
-- PART 2: CORE TABLES
-- =====================================================

-- -----------------------------------------------------
-- Users & Authentication
-- -----------------------------------------------------

CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone_number TEXT,
  password_hash TEXT,
  full_name TEXT,
  username TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_age_over_18 BOOLEAN NOT NULL,
  is_phone_verified BOOLEAN NOT NULL DEFAULT false,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  signup_method TEXT,
  country TEXT,
  language_preference TEXT,
  timezone TEXT,
  ip_address TEXT,
  ip_country TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  last_onboarding_step TEXT DEFAULT '/app/onboarding/welcome',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.activation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- -----------------------------------------------------
-- Content: Titles, Genres, Keywords
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
  release_date DATE,
  first_air_date DATE,
  last_air_date DATE,
  runtime INTEGER,
  episode_run_time INTEGER[],
  popularity DOUBLE PRECISION,
  vote_average DOUBLE PRECISION,
  is_adult BOOLEAN DEFAULT false,
  original_language TEXT,
  status TEXT,
  certification TEXT,
  title_genres JSON,
  classification_status TEXT DEFAULT 'pending',
  last_classified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  genre_name TEXT NOT NULL,
  tmdb_genre_id INTEGER
);

CREATE TABLE public.title_genres (
  title_id UUID NOT NULL REFERENCES public.titles(id),
  genre_id UUID NOT NULL REFERENCES public.genres(id),
  PRIMARY KEY (title_id, genre_id)
);

CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tmdb_keyword_id INTEGER
);

CREATE TABLE public.spoken_languages (
  iso_639_1 VARCHAR NOT NULL PRIMARY KEY,
  language_name TEXT NOT NULL,
  flag_emoji TEXT
);

CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  season_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  air_date DATE,
  episode_count INTEGER,
  poster_path TEXT,
  trailer_url TEXT,
  trailer_transcript TEXT,
  is_tmdb_trailer BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Streaming Services
-- -----------------------------------------------------

CREATE TABLE public.streaming_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.title_streaming_availability (
  title_id UUID NOT NULL REFERENCES public.titles(id),
  streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
  region_code TEXT NOT NULL,
  PRIMARY KEY (title_id, streaming_service_id, region_code)
);

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
-- Emotion System
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
  created_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE public.emotion_display_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  display_phrase TEXT NOT NULL,
  min_intensity REAL NOT NULL,
  max_intensity REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE public.emotion_transformation_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  content_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  transformation_type TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  priority_rank SMALLINT
);

CREATE TABLE public.emotion_to_intent_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  intent_type TEXT NOT NULL,
  weight REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Title Classification (Emotions & Intents)
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

CREATE TABLE public.viib_emotion_classified_titles_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  intensity_level INTEGER NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.viib_intent_classified_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  intent_type TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.viib_intent_classified_titles_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  intent_type public.viib_intent_type NOT NULL,
  confidence_score REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.viib_title_intent_stats (
  title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
  primary_intent_type TEXT,
  primary_confidence_score REAL,
  intent_count INTEGER NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Materialized Score Tables
-- -----------------------------------------------------

CREATE TABLE public.title_emotion_vectors (
  title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
  valence REAL NOT NULL,
  arousal REAL NOT NULL,
  dominance REAL NOT NULL,
  emotion_strength REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.title_transformation_scores (
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  transformation_score REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_emotion_id, title_id)
);

CREATE TABLE public.title_intent_alignment_scores (
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  alignment_score REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_emotion_id, title_id)
);

CREATE TABLE public.title_social_summary (
  title_id UUID NOT NULL PRIMARY KEY REFERENCES public.titles(id),
  social_mean_rating REAL,
  social_rec_power REAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.title_user_emotion_match_cache (
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  cosine_score REAL NOT NULL,
  transformation_score REAL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_emotion_id, title_id)
);

CREATE TABLE public.user_title_social_scores (
  user_id UUID NOT NULL,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  social_component_score REAL NOT NULL,
  social_priority_score REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);

-- -----------------------------------------------------
-- User Preferences & Interactions
-- -----------------------------------------------------

CREATE TABLE public.user_vibe_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) UNIQUE,
  vibe_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_language_preferences (
  user_id UUID NOT NULL REFERENCES public.users(id),
  language_code TEXT NOT NULL REFERENCES public.spoken_languages(iso_639_1),
  priority_order INTEGER,
  PRIMARY KEY (user_id, language_code)
);

CREATE TABLE public.user_streaming_subscriptions (
  user_id UUID NOT NULL REFERENCES public.users(id),
  streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, streaming_service_id)
);

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

CREATE TABLE public.user_context_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  device_type TEXT,
  time_of_day_bucket TEXT,
  location_type TEXT,
  session_length_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Social Features
-- -----------------------------------------------------

CREATE TABLE public.friend_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  friend_user_id UUID NOT NULL REFERENCES public.users(id),
  relationship_type TEXT,
  trust_score REAL NOT NULL DEFAULT 0.5,
  is_blocked BOOLEAN DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_social_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_user_id UUID NOT NULL REFERENCES public.users(id),
  receiver_user_id UUID NOT NULL REFERENCES public.users(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Vibe Lists
-- -----------------------------------------------------

CREATE TABLE public.vibe_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  mood_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.vibe_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  title_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.vibe_list_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  follower_user_id UUID NOT NULL REFERENCES public.users(id),
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.vibe_list_shared_with (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  shared_with_user_id UUID NOT NULL REFERENCES public.users(id),
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.vibe_list_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  viewer_user_id UUID REFERENCES public.users(id),
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- Recommendation Outcomes
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

CREATE TABLE public.viib_weight_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotional_weight REAL NOT NULL,
  social_weight REAL NOT NULL,
  historical_weight REAL NOT NULL,
  context_weight REAL NOT NULL,
  novelty_weight REAL NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- System & Admin Tables
-- -----------------------------------------------------

CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
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

CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  severity TEXT NOT NULL DEFAULT 'error',
  error_message TEXT NOT NULL,
  error_stack TEXT,
  screen TEXT,
  operation TEXT,
  context JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.rate_limit_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  max_requests INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------
-- Debug View
-- -----------------------------------------------------

CREATE OR REPLACE VIEW public.viib_recommendation_debug AS
SELECT
  ues.user_id,
  t.id AS title_id,
  viib_score(ues.user_id, t.id) AS base_viib_score,
  viib_social_priority_score(ues.user_id, t.id) AS social_priority_score,
  GREATEST(
    viib_score(ues.user_id, t.id),
    viib_social_priority_score(ues.user_id, t.id)
  ) AS final_score
FROM user_emotion_states ues
CROSS JOIN titles t
WHERE t.classification_status = 'complete';


-- =====================================================
-- PART 3: TRIGGERS
-- =====================================================

-- Updated at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_vibe_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_vibe_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_email_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_rate_limit_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_viib_intent_classified_titles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();
CREATE TRIGGER update_vibe_lists_updated_at BEFORE UPDATE ON public.vibe_lists FOR EACH ROW EXECUTE FUNCTION update_vibe_lists_updated_at();
CREATE TRIGGER update_vibe_preferences_updated_at BEFORE UPDATE ON public.user_vibe_preferences FOR EACH ROW EXECUTE FUNCTION update_vibe_preferences_updated_at();
CREATE TRIGGER update_email_config_updated_at BEFORE UPDATE ON public.email_config FOR EACH ROW EXECUTE FUNCTION update_email_config_updated_at();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION update_email_templates_updated_at();
CREATE TRIGGER update_rate_limit_config_updated_at BEFORE UPDATE ON public.rate_limit_config FOR EACH ROW EXECUTE FUNCTION update_rate_limit_config_updated_at();
