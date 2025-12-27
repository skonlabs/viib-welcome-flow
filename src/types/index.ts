/**
 * Centralized type definitions for the ViiB application
 * These types supplement the auto-generated Supabase types
 */

import { Database } from '@/integrations/supabase/types';

// =============================================================================
// Database Table Types (convenience aliases)
// =============================================================================

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Table Row Types
export type User = Tables['users']['Row'];
export type UserRole = Tables['user_roles']['Row'];
export type Title = Tables['titles']['Row'];
export type Job = Tables['jobs']['Row'];
export type Feedback = Tables['feedback']['Row'];
export type EmailTemplate = Tables['email_templates']['Row'];
export type RateLimitConfig = Tables['rate_limit_config']['Row'];
export type StreamingService = Tables['streaming_services']['Row'];
export type EmotionMaster = Tables['emotion_master']['Row'];
export type VibeList = Tables['vibe_lists']['Row'];
export type SystemLog = Tables['system_logs']['Row'];
export type ActivationCode = Tables['activation_codes']['Row'];

// =============================================================================
// RPC Function Response Types
// =============================================================================

export interface JobClassificationMetrics {
  total_titles: number;
  emotion_primary_distinct: number;
  emotion_staging_distinct: number;
  intent_primary_distinct: number;
  intent_staging_distinct: number;
}

export interface CronJobProgress {
  vector_count: number;
  transform_count: number;
  intent_count: number;
  social_count: number;
}

export interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  database: string;
  active: boolean;
}

export interface RecommendationResult {
  title_id: string;
  base_viib_score: number;
  intent_alignment_score: number;
  social_priority_score: number;
  transformation_score: number;
  final_score: number;
  recommendation_reason: string;
}

export interface RecommendationExplanation {
  title_id: string;
  emotional_match: number;
  transformation_type: string;
  transformation_score: number;
  social_score: number;
  friend_name: string | null;
  friend_rating: string | null;
  intent_match: string;
  reasons: string[];
}

// =============================================================================
// Component Prop Types
// =============================================================================

export interface TitleCardData {
  id: string;
  external_id?: string;
  tmdb_id?: number;
  title: string;
  type: 'movie' | 'series';
  year?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  trailer_url?: string | null;
  runtime_minutes?: number | null;
  genres: string[];
  overview?: string | null;
}

export interface EnrichedTitle extends TitleCardData {
  streaming_services?: StreamingServiceInfo[];
  certification?: string;
  number_of_seasons?: number;
  rating_value?: 'love_it' | 'like_it' | 'ok' | 'dislike_it' | null;
  seasons?: SeasonInfo[];
}

export interface StreamingServiceInfo {
  service_code: string;
  service_name: string;
  logo_url?: string | null;
  watch_url?: string;
}

export interface SeasonInfo {
  id: string;
  season_number: number;
  name: string | null;
  overview: string | null;
  air_date: string | null;
  poster_path: string | null;
  episode_count?: number;
}

// =============================================================================
// Job Configuration Types
// =============================================================================

export interface JobConfiguration {
  last_processed_id?: string | null;
  batch_size?: number;
  total_threads?: number;
  total_work_units?: number;
  completed_work_units?: WorkUnit[];
  failed_work_units?: WorkUnit[];
  thread_tracking?: {
    succeeded: number;
    failed: number;
  };
}

export interface WorkUnit {
  languageCode: string;
  year: number;
  genreId: number;
}

// =============================================================================
// Admin Dashboard Types
// =============================================================================

export interface AdminUser {
  id: string;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  username: string | null;
  country: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface FeedbackItem extends Feedback {
  user?: Pick<User, 'id' | 'email' | 'full_name' | 'username'>;
}

export interface SystemLogEntry {
  id: string;
  severity: string;
  error_message: string;
  error_stack: string | null;
  context: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  operation: string | null;
  screen: string | null;
  http_status: number | null;
  user_id: string | null;
  created_at: string;
}

// =============================================================================
// Social Features Types
// =============================================================================

export interface FriendConnection {
  id: string;
  user_id: string;
  friend_user_id: string;
  relationship_type: string | null;
  trust_score: number;
  is_blocked: boolean | null;
  is_muted: boolean;
  created_at: string;
  friend?: Pick<User, 'id' | 'full_name' | 'username'>;
}

export interface SocialRecommendation {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  title_id: string;
  recommendation_message: string | null;
  created_at: string;
  sender?: Pick<User, 'id' | 'full_name' | 'username'>;
  title?: Pick<Title, 'id' | 'name' | 'poster_path'>;
}

// =============================================================================
// Vibe List Types
// =============================================================================

export interface VibeListWithDetails extends VibeList {
  item_count?: number;
  follower_count?: number;
  view_count?: number;
  owner?: Pick<User, 'id' | 'full_name' | 'username'>;
}

export interface VibeListItem {
  id: string;
  vibe_list_id: string;
  title_id: string;
  added_at: string;
  title?: EnrichedTitle;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// Form Types
// =============================================================================

export interface LoginFormData {
  email?: string;
  phone?: string;
  password: string;
  rememberMe: boolean;
}

export interface SignupFormData {
  email: string;
  password: string;
  name?: string;
}

export interface FeedbackFormData {
  type: 'bug' | 'feature' | 'support' | 'general';
  title: string;
  message: string;
}

// =============================================================================
// Utility Types
// =============================================================================

export type RatingValue = 'love_it' | 'like_it' | 'ok' | 'dislike_it';
export type InteractionType = 'wishlisted' | 'completed' | 'liked' | 'disliked';
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';
export type JobStatus = 'idle' | 'running' | 'failed' | 'completed';
export type JobType = 'full_refresh' | 'sync_delta' | 'enrich_trailers' | 'transcribe_trailers' | 'classify_ai' | 'fix_streaming';

// Badge variant type helper
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

// =============================================================================
// Error Types
// =============================================================================

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class ViiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ViiError';
    this.code = code;
    this.details = details;
  }
}
