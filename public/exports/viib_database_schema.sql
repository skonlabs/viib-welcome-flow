-- ViiB Database Schema Export
-- Generated: 2024-12-15
-- Project: ViiB Recommendation Engine

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE content_type AS ENUM ('movie', 'series', 'documentary', 'short', 'other');
CREATE TYPE device_type AS ENUM ('mobile', 'tv', 'tablet', 'web', 'other');
CREATE TYPE discovery_source AS ENUM ('recommendation', 'search', 'friend', 'trending', 'external_link', 'notification', 'other');
CREATE TYPE emotion_category AS ENUM ('user_state', 'content_state', 'content_tone');
CREATE TYPE engagement_action AS ENUM ('click', 'preview', 'watch_start', 'watch_complete', 'abandon');
CREATE TYPE environment_tag AS ENUM ('alone', 'family', 'friends', 'commute', 'work', 'public', 'other');
CREATE TYPE feedback_type AS ENUM ('bug', 'suggestion', 'emotional_response', 'feature_request', 'other');
CREATE TYPE interaction_type AS ENUM ('started', 'completed', 'liked', 'disliked', 'browsed', 'wishlisted', 'ignored');
CREATE TYPE model_type AS ENUM ('collaborative', 'content_based', 'hybrid', 'deep_learning', 'reinforcement', 'other');
CREATE TYPE network_type AS ENUM ('wifi', 'cellular', 'offline', 'unknown');
CREATE TYPE notification_type AS ENUM ('recommendation', 'friend_activity', 'system', 'reminder');
CREATE TYPE provider_type_enum AS ENUM ('buy', 'rent', 'stream', 'free');
CREATE TYPE rating_value AS ENUM ('love_it', 'like_it', 'ok', 'dislike_it', 'not_rated');
CREATE TYPE relationship_type AS ENUM ('friend', 'family', 'partner', 'colleague', 'acquaintance', 'other');
CREATE TYPE signup_method AS ENUM ('email', 'phone', 'google', 'apple', 'github', 'linkedin', 'other');
CREATE TYPE time_of_day AS ENUM ('morning', 'afternoon', 'evening', 'night', 'late_night');
CREATE TYPE title_type_enum AS ENUM ('movie', 'tv');
CREATE TYPE transformation_type AS ENUM ('soothe', 'stabilize', 'validate', 'amplify', 'complementary', 'reinforcing', 'neutral_balancing');

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone_number TEXT,
  password_hash TEXT,
  full_name TEXT,
  username TEXT,
  is_age_over_18 BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_phone_verified BOOLEAN NOT NULL DEFAULT false,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  last_onboarding_step TEXT DEFAULT '/app/onboarding/welcome',
  signup_method TEXT,
  language_preference TEXT,
  country TEXT,
  timezone TEXT,
  ip_address TEXT,
  ip_country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activation codes table
CREATE TABLE public.activation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES public.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Phone verifications table
CREATE TABLE public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Email verifications table
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Email config table
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

-- Email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Titles table (movies & TV shows)
CREATE TABLE public.titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id INTEGER,
  imdb_id TEXT,
  name TEXT,
  original_name TEXT,
  title_type TEXT,
  overview TEXT,
  tagline TEXT,
  status TEXT,
  release_date DATE,
  first_air_date DATE,
  last_air_date DATE,
  runtime INTEGER,
  episode_run_time INTEGER[],
  original_language TEXT,
  popularity DOUBLE PRECISION,
  vote_average DOUBLE PRECISION,
  poster_path TEXT,
  backdrop_path TEXT,
  trailer_url TEXT,
  trailer_transcript TEXT,
  is_tmdb_trailer BOOLEAN DEFAULT true,
  is_adult BOOLEAN DEFAULT false,
  title_genres JSON,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Genres table
CREATE TABLE public.genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  genre_name TEXT NOT NULL,
  tmdb_genre_id INTEGER
);

-- Title genres junction table
CREATE TABLE public.title_genres (
  title_id UUID NOT NULL REFERENCES public.titles(id),
  genre_id UUID NOT NULL REFERENCES public.genres(id),
  PRIMARY KEY (title_id, genre_id)
);

-- Keywords table
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tmdb_keyword_id INTEGER
);

-- Title keywords junction table
CREATE TABLE public.title_keywords (
  title_id UUID NOT NULL REFERENCES public.titles(id),
  keyword_id UUID NOT NULL REFERENCES public.keywords(id),
  PRIMARY KEY (title_id, keyword_id)
);

-- Spoken languages table
CREATE TABLE public.spoken_languages (
  iso_639_1 VARCHAR NOT NULL PRIMARY KEY,
  language_name TEXT NOT NULL,
  flag_emoji TEXT
);

-- Title spoken languages junction table
CREATE TABLE public.title_spoken_languages (
  title_id UUID NOT NULL REFERENCES public.titles(id),
  iso_639_1 VARCHAR NOT NULL REFERENCES public.spoken_languages(iso_639_1),
  PRIMARY KEY (title_id, iso_639_1)
);

-- Seasons table
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

-- Episodes table
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

-- Streaming services table
CREATE TABLE public.streaming_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Title streaming availability junction table
CREATE TABLE public.title_streaming_availability (
  title_id UUID NOT NULL REFERENCES public.titles(id),
  streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
  region_code TEXT NOT NULL,
  PRIMARY KEY (title_id, streaming_service_id, region_code)
);

-- Official trailer channels table
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

-- Emotion master table
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

-- Emotion display phrases table
CREATE TABLE public.emotion_display_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  display_phrase TEXT NOT NULL,
  min_intensity REAL NOT NULL,
  max_intensity REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Emotion to intent map table
CREATE TABLE public.emotion_to_intent_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  intent_type TEXT NOT NULL,
  weight REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Emotion transformation map table
CREATE TABLE public.emotion_transformation_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  content_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  transformation_type TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  priority_rank SMALLINT
);

-- Title emotional signatures table
CREATE TABLE public.title_emotional_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  intensity_level INTEGER NOT NULL,
  source TEXT
);

-- Title emotional signatures staging table
CREATE TABLE public.title_emotional_signatures_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  intensity_level INTEGER NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Title emotion vectors table (materialized)
CREATE TABLE public.title_emotion_vectors (
  title_id UUID NOT NULL REFERENCES public.titles(id) PRIMARY KEY,
  valence REAL NOT NULL,
  arousal REAL NOT NULL,
  dominance REAL NOT NULL,
  emotion_strength REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Title transformation scores table (materialized)
CREATE TABLE public.title_transformation_scores (
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  transformation_score REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_emotion_id, title_id)
);

-- Title intent alignment scores table (materialized)
CREATE TABLE public.title_intent_alignment_scores (
  user_emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  alignment_score REAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_emotion_id, title_id)
);

-- Title social summary table (materialized)
CREATE TABLE public.title_social_summary (
  title_id UUID NOT NULL REFERENCES public.titles(id) PRIMARY KEY,
  social_mean_rating REAL,
  social_rec_power REAL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ViiB intent classified titles table
CREATE TABLE public.viib_intent_classified_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id),
  intent_type TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ViiB title intent stats table
CREATE TABLE public.viib_title_intent_stats (
  title_id UUID NOT NULL REFERENCES public.titles(id) PRIMARY KEY,
  primary_intent_type TEXT,
  primary_confidence_score REAL,
  intent_count INTEGER NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ViiB weight config table
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

-- User emotion states table
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

-- User vibe preferences table
CREATE TABLE public.user_vibe_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) UNIQUE,
  vibe_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User language preferences table
CREATE TABLE public.user_language_preferences (
  user_id UUID NOT NULL REFERENCES public.users(id),
  language_code TEXT NOT NULL REFERENCES public.spoken_languages(iso_639_1),
  priority_order INTEGER,
  PRIMARY KEY (user_id, language_code)
);

-- User streaming subscriptions table
CREATE TABLE public.user_streaming_subscriptions (
  user_id UUID NOT NULL REFERENCES public.users(id),
  streaming_service_id UUID NOT NULL REFERENCES public.streaming_services(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, streaming_service_id)
);

-- User title interactions table
CREATE TABLE public.user_title_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  interaction_type interaction_type NOT NULL,
  rating_value rating_value DEFAULT 'not_rated',
  watch_duration_percentage REAL,
  season_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User context logs table
CREATE TABLE public.user_context_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  device_type TEXT,
  location_type TEXT,
  time_of_day_bucket TEXT,
  session_length_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Friend connections table
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

-- User social recommendations table
CREATE TABLE public.user_social_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_user_id UUID NOT NULL REFERENCES public.users(id),
  receiver_user_id UUID NOT NULL REFERENCES public.users(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recommendation outcomes table
CREATE TABLE public.recommendation_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  title_id UUID NOT NULL REFERENCES public.titles(id),
  was_selected BOOLEAN NOT NULL,
  watch_duration_percentage REAL,
  rating_value rating_value,
  recommended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Personality profiles table
CREATE TABLE public.personality_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  type_name TEXT,
  description TEXT,
  introversion_score REAL,
  emotional_sensitivity REAL,
  empathy_level REAL,
  sensation_seeking REAL,
  analytical_thinking REAL,
  risk_tolerance REAL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe lists table
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

-- Vibe list items table
CREATE TABLE public.vibe_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  title_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list followers table
CREATE TABLE public.vibe_list_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  follower_user_id UUID NOT NULL REFERENCES public.users(id),
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list shared with table
CREATE TABLE public.vibe_list_shared_with (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  shared_with_user_id UUID NOT NULL REFERENCES public.users(id),
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vibe list views table
CREATE TABLE public.vibe_list_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vibe_list_id UUID NOT NULL REFERENCES public.vibe_lists(id),
  viewer_user_id UUID REFERENCES public.users(id),
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feedback table
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

-- System logs table
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  screen TEXT,
  operation TEXT,
  context JSONB,
  severity TEXT NOT NULL DEFAULT 'error',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_duration_seconds INTEGER,
  total_titles_processed INTEGER DEFAULT 0,
  error_message TEXT,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rate limit config table
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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_titles_tmdb_id ON public.titles(tmdb_id);
CREATE INDEX idx_titles_original_language ON public.titles(original_language);
CREATE INDEX idx_user_emotion_states_user_id ON public.user_emotion_states(user_id);
CREATE INDEX idx_user_title_interactions_user_id ON public.user_title_interactions(user_id);
CREATE INDEX idx_user_title_interactions_title_id ON public.user_title_interactions(title_id);
CREATE INDEX idx_friend_connections_user_id ON public.friend_connections(user_id);
CREATE INDEX idx_title_emotional_signatures_title_id ON public.title_emotional_signatures(title_id);
CREATE INDEX idx_title_emotion_vectors_title_id ON public.title_emotion_vectors(title_id);

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX idx_titles_tmdb_id_type ON public.titles(tmdb_id, title_type);
