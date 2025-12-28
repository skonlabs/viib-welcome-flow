export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          expires_at: string | null
          id: string
          is_used: boolean
          max_uses: number | null
          notes: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          max_uses?: number | null
          notes?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          max_uses?: number | null
          notes?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      email_config: {
        Row: {
          created_at: string | null
          from_email: string
          from_name: string | null
          id: string
          is_active: boolean | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          updated_at: string | null
          use_ssl: boolean | null
        }
        Insert: {
          created_at?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          updated_at?: string | null
          use_ssl?: boolean | null
        }
        Update: {
          created_at?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_user?: string
          updated_at?: string | null
          use_ssl?: boolean | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          attempt_count: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          is_locked: boolean | null
          otp_code: string
          otp_hash: string | null
          verified: boolean
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_locked?: boolean | null
          otp_code: string
          otp_hash?: string | null
          verified?: boolean
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_locked?: boolean | null
          otp_code?: string
          otp_hash?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      emotion_display_phrases: {
        Row: {
          created_at: string
          display_phrase: string
          emotion_id: string
          id: string
          max_intensity: number
          min_intensity: number
        }
        Insert: {
          created_at?: string
          display_phrase: string
          emotion_id: string
          id?: string
          max_intensity: number
          min_intensity: number
        }
        Update: {
          created_at?: string
          display_phrase?: string
          emotion_id?: string
          id?: string
          max_intensity?: number
          min_intensity?: number
        }
        Relationships: [
          {
            foreignKeyName: "emotion_display_phrases_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_master: {
        Row: {
          arousal: number | null
          category: string
          created_at: string | null
          description: string | null
          dominance: number | null
          emotion_label: string
          id: string
          intensity_multiplier: number | null
          valence: number | null
        }
        Insert: {
          arousal?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          dominance?: number | null
          emotion_label: string
          id?: string
          intensity_multiplier?: number | null
          valence?: number | null
        }
        Update: {
          arousal?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          dominance?: number | null
          emotion_label?: string
          id?: string
          intensity_multiplier?: number | null
          valence?: number | null
        }
        Relationships: []
      }
      emotion_to_intent_map: {
        Row: {
          created_at: string
          emotion_id: string
          id: string
          intent_type: string
          weight: number
        }
        Insert: {
          created_at?: string
          emotion_id: string
          id?: string
          intent_type: string
          weight: number
        }
        Update: {
          created_at?: string
          emotion_id?: string
          id?: string
          intent_type?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "emotion_to_intent_map_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_transformation_map: {
        Row: {
          confidence_score: number
          content_emotion_id: string
          id: string
          priority_rank: number | null
          transformation_type: string
          user_emotion_id: string
        }
        Insert: {
          confidence_score: number
          content_emotion_id: string
          id?: string
          priority_rank?: number | null
          transformation_type: string
          user_emotion_id: string
        }
        Update: {
          confidence_score?: number
          content_emotion_id?: string
          id?: string
          priority_rank?: number | null
          transformation_type?: string
          user_emotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_transformation_map_from_emotion_id_fkey"
            columns: ["user_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotion_transformation_map_to_emotion_id_fkey"
            columns: ["content_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      enabled_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string | null
          dial_code: string
          flag_emoji: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string | null
          dial_code: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string | null
          dial_code?: string
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          air_date: string | null
          created_at: string
          episode_number: number
          id: string
          name: string | null
          overview: string | null
          runtime: number | null
          season_id: string
          still_path: string | null
          vote_average: number | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_number: number
          id?: string
          name?: string | null
          overview?: string | null
          runtime?: number | null
          season_id: string
          still_path?: string | null
          vote_average?: number | null
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_number?: number
          id?: string
          name?: string | null
          overview?: string | null
          runtime?: number | null
          season_id?: string
          still_path?: string | null
          vote_average?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_connections: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          is_blocked: boolean | null
          is_muted: boolean
          relationship_type: string | null
          trust_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          is_blocked?: boolean | null
          is_muted?: boolean
          relationship_type?: string | null
          trust_score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
          is_blocked?: boolean | null
          is_muted?: boolean
          relationship_type?: string | null
          trust_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_connections_friend_user_id_fkey"
            columns: ["friend_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          genre_name: string
          id: string
          tmdb_genre_id: number | null
        }
        Insert: {
          genre_name: string
          id?: string
          tmdb_genre_id?: number | null
        }
        Update: {
          genre_name?: string
          id?: string
          tmdb_genre_id?: number | null
        }
        Relationships: []
      }
      ip_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          configuration: Json | null
          created_at: string
          error_message: string | null
          id: string
          is_active: boolean
          job_name: string
          job_type: string
          last_run_at: string | null
          last_run_duration_seconds: number | null
          next_run_at: string | null
          status: string
          total_titles_processed: number | null
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_active?: boolean
          job_name: string
          job_type: string
          last_run_at?: string | null
          last_run_duration_seconds?: number | null
          next_run_at?: string | null
          status?: string
          total_titles_processed?: number | null
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_active?: boolean
          job_name?: string
          job_type?: string
          last_run_at?: string | null
          last_run_duration_seconds?: number | null
          next_run_at?: string | null
          status?: string
          total_titles_processed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      keywords: {
        Row: {
          id: string
          name: string
          tmdb_keyword_id: number | null
        }
        Insert: {
          id?: string
          name: string
          tmdb_keyword_id?: number | null
        }
        Update: {
          id?: string
          name?: string
          tmdb_keyword_id?: number | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string | null
          id: string
          identifier: string
          ip_address: string | null
          requires_captcha: boolean | null
          success: boolean | null
        }
        Insert: {
          attempt_type?: string
          created_at?: string | null
          id?: string
          identifier: string
          ip_address?: string | null
          requires_captcha?: boolean | null
          success?: boolean | null
        }
        Update: {
          attempt_type?: string
          created_at?: string | null
          id?: string
          identifier?: string
          ip_address?: string | null
          requires_captcha?: boolean | null
          success?: boolean | null
        }
        Relationships: []
      }
      official_trailer_channels: {
        Row: {
          category: string | null
          channel_id: string | null
          channel_name: string
          created_at: string
          id: string
          is_active: boolean
          language_code: string
          priority: number
          region: string | null
        }
        Insert: {
          category?: string | null
          channel_id?: string | null
          channel_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          language_code: string
          priority?: number
          region?: string | null
        }
        Update: {
          category?: string | null
          channel_id?: string | null
          channel_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language_code?: string
          priority?: number
          region?: string | null
        }
        Relationships: []
      }
      personality_profiles: {
        Row: {
          analytical_thinking: number | null
          description: string | null
          emotional_sensitivity: number | null
          empathy_level: number | null
          id: string
          introversion_score: number | null
          risk_tolerance: number | null
          sensation_seeking: number | null
          type_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analytical_thinking?: number | null
          description?: string | null
          emotional_sensitivity?: number | null
          empathy_level?: number | null
          id?: string
          introversion_score?: number | null
          risk_tolerance?: number | null
          sensation_seeking?: number | null
          type_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analytical_thinking?: number | null
          description?: string | null
          emotional_sensitivity?: number | null
          empathy_level?: number | null
          id?: string
          introversion_score?: number | null
          risk_tolerance?: number | null
          sensation_seeking?: number | null
          type_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempt_count: number | null
          created_at: string
          expires_at: string
          id: string
          is_locked: boolean | null
          max_attempts: number | null
          otp_code: string
          otp_hash: string | null
          phone_number: string
          verified: boolean
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          expires_at: string
          id?: string
          is_locked?: boolean | null
          max_attempts?: number | null
          otp_code: string
          otp_hash?: string | null
          phone_number: string
          verified?: boolean
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          is_locked?: boolean | null
          max_attempts?: number | null
          otp_code?: string
          otp_hash?: string | null
          phone_number?: string
          verified?: boolean
        }
        Relationships: []
      }
      rate_limit_config: {
        Row: {
          created_at: string | null
          description: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          max_requests: number
          updated_at: string | null
          window_seconds: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          max_requests: number
          updated_at?: string | null
          window_seconds: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          max_requests?: number
          updated_at?: string | null
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limit_entries: {
        Row: {
          count: number | null
          expires_at: string
          id: string
          key: string
          window_start: string | null
        }
        Insert: {
          count?: number | null
          expires_at: string
          id?: string
          key: string
          window_start?: string | null
        }
        Update: {
          count?: number | null
          expires_at?: string
          id?: string
          key?: string
          window_start?: string | null
        }
        Relationships: []
      }
      recommendation_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          notification_type: string
          receiver_user_id: string
          sender_user_id: string
          title_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type: string
          receiver_user_id: string
          sender_user_id: string
          title_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string
          receiver_user_id?: string
          sender_user_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_notifications_receiver_user_id_fkey"
            columns: ["receiver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_notifications_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_notifications_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_outcomes: {
        Row: {
          created_at: string
          id: string
          rating_value: Database["public"]["Enums"]["rating_value"] | null
          recommended_at: string
          title_id: string
          user_id: string
          was_selected: boolean
          watch_duration_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          rating_value?: Database["public"]["Enums"]["rating_value"] | null
          recommended_at?: string
          title_id: string
          user_id: string
          was_selected: boolean
          watch_duration_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          rating_value?: Database["public"]["Enums"]["rating_value"] | null
          recommended_at?: string
          title_id?: string
          user_id?: string
          was_selected?: boolean
          watch_duration_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcomes_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          air_date: string | null
          created_at: string
          episode_count: number | null
          id: string
          is_tmdb_trailer: boolean | null
          name: string | null
          overview: string | null
          poster_path: string | null
          rt_acount: number | null
          rt_ascore: number | null
          rt_ccount: number | null
          rt_cscore: number | null
          season_number: number
          title_id: string
          trailer_transcript: string | null
          trailer_url: string | null
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_count?: number | null
          id?: string
          is_tmdb_trailer?: boolean | null
          name?: string | null
          overview?: string | null
          poster_path?: string | null
          rt_acount?: number | null
          rt_ascore?: number | null
          rt_ccount?: number | null
          rt_cscore?: number | null
          season_number: number
          title_id: string
          trailer_transcript?: string | null
          trailer_url?: string | null
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_count?: number | null
          id?: string
          is_tmdb_trailer?: boolean | null
          name?: string | null
          overview?: string | null
          poster_path?: string | null
          rt_acount?: number | null
          rt_ascore?: number | null
          rt_ccount?: number | null
          rt_cscore?: number | null
          season_number?: number
          title_id?: string
          trailer_transcript?: string | null
          trailer_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_remember_me: boolean | null
          issued_at: string
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_remember_me?: boolean | null
          issued_at?: string
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_remember_me?: boolean | null
          issued_at?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spoken_languages: {
        Row: {
          flag_emoji: string | null
          iso_639_1: string
          language_name: string
        }
        Insert: {
          flag_emoji?: string | null
          iso_639_1: string
          language_name: string
        }
        Update: {
          flag_emoji?: string | null
          iso_639_1?: string
          language_name?: string
        }
        Relationships: []
      }
      streaming_services: {
        Row: {
          id: string
          is_active: boolean
          logo_url: string | null
          service_name: string
          website_url: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          logo_url?: string | null
          service_name: string
          website_url?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          logo_url?: string | null
          service_name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          error_stack: string | null
          http_status: number | null
          id: string
          notes: string | null
          operation: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          screen: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          http_status?: number | null
          id?: string
          notes?: string | null
          operation?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          screen?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          http_status?: number | null
          id?: string
          notes?: string | null
          operation?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          screen?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      title_emotion_vectors: {
        Row: {
          arousal: number
          dominance: number
          emotion_strength: number
          title_id: string
          updated_at: string | null
          valence: number
        }
        Insert: {
          arousal: number
          dominance: number
          emotion_strength: number
          title_id: string
          updated_at?: string | null
          valence: number
        }
        Update: {
          arousal?: number
          dominance?: number
          emotion_strength?: number
          title_id?: string
          updated_at?: string | null
          valence?: number
        }
        Relationships: [
          {
            foreignKeyName: "title_emotion_vectors_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: true
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_genres: {
        Row: {
          genre_id: string
          title_id: string
        }
        Insert: {
          genre_id: string
          title_id: string
        }
        Update: {
          genre_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_genres_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_intent_alignment_scores: {
        Row: {
          alignment_score: number
          title_id: string
          updated_at: string | null
          user_emotion_id: string
        }
        Insert: {
          alignment_score: number
          title_id: string
          updated_at?: string | null
          user_emotion_id: string
        }
        Update: {
          alignment_score?: number
          title_id?: string
          updated_at?: string | null
          user_emotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_intent_alignment_scores_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_intent_alignment_scores_user_emotion_id_fkey"
            columns: ["user_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      title_social_summary: {
        Row: {
          social_mean_rating: number | null
          social_rec_power: number | null
          title_id: string
          updated_at: string | null
        }
        Insert: {
          social_mean_rating?: number | null
          social_rec_power?: number | null
          title_id: string
          updated_at?: string | null
        }
        Update: {
          social_mean_rating?: number | null
          social_rec_power?: number | null
          title_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "title_social_summary_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: true
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_streaming_availability: {
        Row: {
          region_code: string
          streaming_service_id: string
          title_id: string
        }
        Insert: {
          region_code: string
          streaming_service_id: string
          title_id: string
        }
        Update: {
          region_code?: string
          streaming_service_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_streaming_availability_streaming_service_id_fkey"
            columns: ["streaming_service_id"]
            isOneToOne: false
            referencedRelation: "streaming_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_streaming_availability_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      title_transformation_scores: {
        Row: {
          title_id: string
          transformation_score: number
          updated_at: string | null
          user_emotion_id: string
        }
        Insert: {
          title_id: string
          transformation_score: number
          updated_at?: string | null
          user_emotion_id: string
        }
        Update: {
          title_id?: string
          transformation_score?: number
          updated_at?: string | null
          user_emotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_transformation_scores_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_transformation_scores_user_emotion_id_fkey"
            columns: ["user_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      title_user_emotion_match_cache: {
        Row: {
          cosine_score: number
          title_id: string
          transformation_score: number | null
          updated_at: string
          user_emotion_id: string
        }
        Insert: {
          cosine_score: number
          title_id: string
          transformation_score?: number | null
          updated_at?: string
          user_emotion_id: string
        }
        Update: {
          cosine_score?: number
          title_id?: string
          transformation_score?: number | null
          updated_at?: string
          user_emotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_user_emotion_match_cache_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_user_emotion_match_cache_user_emotion_id_fkey"
            columns: ["user_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          backdrop_path: string | null
          certification: string | null
          classification_status: string | null
          created_at: string
          episode_run_time: number[] | null
          first_air_date: string | null
          id: string
          imdb_id: string | null
          is_adult: boolean | null
          is_tmdb_trailer: boolean | null
          last_air_date: string | null
          last_classified_at: string | null
          name: string | null
          original_language: string | null
          original_name: string | null
          overview: string | null
          popularity: number | null
          poster_path: string | null
          release_date: string | null
          rt_acount: number | null
          rt_ascore: number | null
          rt_ccount: number | null
          rt_cscore: number | null
          runtime: number | null
          status: string | null
          title_genres: Json | null
          title_type: string | null
          tmdb_id: number | null
          trailer_transcript: string | null
          trailer_url: string | null
          updated_at: string | null
          vote_average: number | null
        }
        Insert: {
          backdrop_path?: string | null
          certification?: string | null
          classification_status?: string | null
          created_at?: string
          episode_run_time?: number[] | null
          first_air_date?: string | null
          id?: string
          imdb_id?: string | null
          is_adult?: boolean | null
          is_tmdb_trailer?: boolean | null
          last_air_date?: string | null
          last_classified_at?: string | null
          name?: string | null
          original_language?: string | null
          original_name?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          rt_acount?: number | null
          rt_ascore?: number | null
          rt_ccount?: number | null
          rt_cscore?: number | null
          runtime?: number | null
          status?: string | null
          title_genres?: Json | null
          title_type?: string | null
          tmdb_id?: number | null
          trailer_transcript?: string | null
          trailer_url?: string | null
          updated_at?: string | null
          vote_average?: number | null
        }
        Update: {
          backdrop_path?: string | null
          certification?: string | null
          classification_status?: string | null
          created_at?: string
          episode_run_time?: number[] | null
          first_air_date?: string | null
          id?: string
          imdb_id?: string | null
          is_adult?: boolean | null
          is_tmdb_trailer?: boolean | null
          last_air_date?: string | null
          last_classified_at?: string | null
          name?: string | null
          original_language?: string | null
          original_name?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          rt_acount?: number | null
          rt_ascore?: number | null
          rt_ccount?: number | null
          rt_cscore?: number | null
          runtime?: number | null
          status?: string | null
          title_genres?: Json | null
          title_type?: string | null
          tmdb_id?: number | null
          trailer_transcript?: string | null
          trailer_url?: string | null
          updated_at?: string | null
          vote_average?: number | null
        }
        Relationships: []
      }
      tmdb_genre_mappings: {
        Row: {
          created_at: string | null
          genre_name: string
          id: string
          is_active: boolean
          media_type: string
          tmdb_genre_id: number
          tv_equivalent_id: number | null
        }
        Insert: {
          created_at?: string | null
          genre_name: string
          id?: string
          is_active?: boolean
          media_type?: string
          tmdb_genre_id: number
          tv_equivalent_id?: number | null
        }
        Update: {
          created_at?: string | null
          genre_name?: string
          id?: string
          is_active?: boolean
          media_type?: string
          tmdb_genre_id?: number
          tv_equivalent_id?: number | null
        }
        Relationships: []
      }
      tmdb_provider_mappings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          region_code: string
          service_name: string
          tmdb_provider_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          region_code?: string
          service_name: string
          tmdb_provider_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          region_code?: string
          service_name?: string
          tmdb_provider_id?: number
        }
        Relationships: []
      }
      user_context_logs: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          location_type: string | null
          session_length_seconds: number | null
          time_of_day_bucket: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          location_type?: string | null
          session_length_seconds?: number | null
          time_of_day_bucket?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          location_type?: string | null
          session_length_seconds?: number | null
          time_of_day_bucket?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_context_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emotion_states: {
        Row: {
          arousal: number | null
          created_at: string
          dominance: number | null
          emotion_id: string
          id: string
          intensity: number
          user_id: string
          valence: number | null
        }
        Insert: {
          arousal?: number | null
          created_at?: string
          dominance?: number | null
          emotion_id: string
          id?: string
          intensity?: number
          user_id: string
          valence?: number | null
        }
        Update: {
          arousal?: number | null
          created_at?: string
          dominance?: number | null
          emotion_id?: string
          id?: string
          intensity?: number
          user_id?: string
          valence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_emotion_states_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_emotion_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_language_preferences: {
        Row: {
          language_code: string
          priority_order: number | null
          user_id: string
        }
        Insert: {
          language_code: string
          priority_order?: number | null
          user_id: string
        }
        Update: {
          language_code?: string
          priority_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_language_preferences_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "spoken_languages"
            referencedColumns: ["iso_639_1"]
          },
          {
            foreignKeyName: "user_language_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_social_recommendations: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_user_id: string
          sender_user_id: string
          title_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_user_id: string
          sender_user_id: string
          title_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_user_id?: string
          sender_user_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_social_recommendations_receiver_user_id_fkey"
            columns: ["receiver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_social_recommendations_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_social_recommendations_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaming_subscriptions: {
        Row: {
          is_active: boolean
          streaming_service_id: string
          user_id: string
        }
        Insert: {
          is_active?: boolean
          streaming_service_id: string
          user_id: string
        }
        Update: {
          is_active?: boolean
          streaming_service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaming_subscriptions_streaming_service_id_fkey"
            columns: ["streaming_service_id"]
            isOneToOne: false
            referencedRelation: "streaming_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_streaming_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_title_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          rating_value: Database["public"]["Enums"]["rating_value"] | null
          season_number: number | null
          title_id: string
          user_id: string
          watch_duration_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          rating_value?: Database["public"]["Enums"]["rating_value"] | null
          season_number?: number | null
          title_id: string
          user_id: string
          watch_duration_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          rating_value?: Database["public"]["Enums"]["rating_value"] | null
          season_number?: number | null
          title_id?: string
          user_id?: string
          watch_duration_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_title_interactions_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_title_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_title_social_scores: {
        Row: {
          social_component_score: number
          social_priority_score: number
          title_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          social_component_score: number
          social_priority_score: number
          title_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          social_component_score?: number
          social_priority_score?: number
          title_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_title_social_scores_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vibe_preferences: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          vibe_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          vibe_type: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          vibe_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vibe_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          ip_country: string | null
          is_active: boolean
          is_age_over_18: boolean
          is_email_verified: boolean
          is_phone_verified: boolean
          language_preference: string | null
          last_onboarding_step: string | null
          onboarding_completed: boolean
          password_hash: string | null
          phone_number: string | null
          signup_method: string | null
          timezone: string | null
          username: string | null
        }
        Insert: {
          auth_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          ip_country?: string | null
          is_active?: boolean
          is_age_over_18: boolean
          is_email_verified?: boolean
          is_phone_verified?: boolean
          language_preference?: string | null
          last_onboarding_step?: string | null
          onboarding_completed?: boolean
          password_hash?: string | null
          phone_number?: string | null
          signup_method?: string | null
          timezone?: string | null
          username?: string | null
        }
        Update: {
          auth_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          ip_country?: string | null
          is_active?: boolean
          is_age_over_18?: boolean
          is_email_verified?: boolean
          is_phone_verified?: boolean
          language_preference?: string | null
          last_onboarding_step?: string | null
          onboarding_completed?: boolean
          password_hash?: string | null
          phone_number?: string | null
          signup_method?: string | null
          timezone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      vibe_emotion_weights: {
        Row: {
          emotion_id: string
          vibe_id: string
          weight: number
        }
        Insert: {
          emotion_id: string
          vibe_id: string
          weight: number
        }
        Update: {
          emotion_id?: string
          vibe_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vibe_emotion_weights_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_emotion_weights_vibe_id_fkey"
            columns: ["vibe_id"]
            isOneToOne: false
            referencedRelation: "vibes"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_genre_weights: {
        Row: {
          genre_id: string
          vibe_id: string
          weight: number
        }
        Insert: {
          genre_id: string
          vibe_id: string
          weight: number
        }
        Update: {
          genre_id?: string
          vibe_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vibe_genre_weights_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_genre_weights_vibe_id_fkey"
            columns: ["vibe_id"]
            isOneToOne: false
            referencedRelation: "vibes"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_list_followers: {
        Row: {
          followed_at: string
          follower_user_id: string
          id: string
          vibe_list_id: string
        }
        Insert: {
          followed_at?: string
          follower_user_id: string
          id?: string
          vibe_list_id: string
        }
        Update: {
          followed_at?: string
          follower_user_id?: string
          id?: string
          vibe_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_list_followers_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_list_followers_vibe_list_id_fkey"
            columns: ["vibe_list_id"]
            isOneToOne: false
            referencedRelation: "vibe_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_list_items: {
        Row: {
          added_at: string
          id: string
          title_id: string
          vibe_list_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          title_id: string
          vibe_list_id: string
        }
        Update: {
          added_at?: string
          id?: string
          title_id?: string
          vibe_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_list_items_vibe_list_id_fkey"
            columns: ["vibe_list_id"]
            isOneToOne: false
            referencedRelation: "vibe_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_list_shared_with: {
        Row: {
          id: string
          shared_at: string
          shared_with_user_id: string
          vibe_list_id: string
        }
        Insert: {
          id?: string
          shared_at?: string
          shared_with_user_id: string
          vibe_list_id: string
        }
        Update: {
          id?: string
          shared_at?: string
          shared_with_user_id?: string
          vibe_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_list_shared_with_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_list_shared_with_vibe_list_id_fkey"
            columns: ["vibe_list_id"]
            isOneToOne: false
            referencedRelation: "vibe_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_list_views: {
        Row: {
          id: string
          vibe_list_id: string
          viewed_at: string
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          vibe_list_id: string
          viewed_at?: string
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          vibe_list_id?: string
          viewed_at?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vibe_list_views_vibe_list_id_fkey"
            columns: ["vibe_list_id"]
            isOneToOne: false
            referencedRelation: "vibe_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vibe_list_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vibe_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mood_tags: string[] | null
          name: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mood_tags?: string[] | null
          name: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mood_tags?: string[] | null
          name?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "vibe_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vibes: {
        Row: {
          base_weight: number
          component_ratios: Json
          created_at: string
          decay_half_life_days: number
          description: string | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          base_weight?: number
          component_ratios?: Json
          created_at?: string
          decay_half_life_days?: number
          description?: string | null
          id: string
          label: string
          updated_at?: string
        }
        Update: {
          base_weight?: number
          component_ratios?: Json
          created_at?: string
          decay_half_life_days?: number
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      viib_emotion_classified_titles: {
        Row: {
          created_at: string
          emotion_id: string
          id: string
          intensity_level: number
          source: string | null
          title_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emotion_id: string
          id?: string
          intensity_level: number
          source?: string | null
          title_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emotion_id?: string
          id?: string
          intensity_level?: number
          source?: string | null
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viib_emotion_classified_titles_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viib_emotion_classified_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      viib_emotion_classified_titles_staging: {
        Row: {
          created_at: string
          emotion_id: string
          id: string
          intensity_level: number
          source: string | null
          title_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emotion_id: string
          id?: string
          intensity_level: number
          source?: string | null
          title_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emotion_id?: string
          id?: string
          intensity_level?: number
          source?: string | null
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viib_emotion_classified_titles_staging_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viib_emotion_classified_titles_staging_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      viib_intent_classified_titles: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          intent_type: string
          source: string | null
          title_id: string
          updated_at: string
        }
        Insert: {
          confidence_score: number
          created_at?: string
          id?: string
          intent_type: string
          source?: string | null
          title_id: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          intent_type?: string
          source?: string | null
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viib_intent_classified_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      viib_intent_classified_titles_staging: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          intent_type: Database["public"]["Enums"]["viib_intent_type"]
          source: string
          title_id: string
          updated_at: string
        }
        Insert: {
          confidence_score: number
          created_at?: string
          id?: string
          intent_type: Database["public"]["Enums"]["viib_intent_type"]
          source?: string
          title_id: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          intent_type?: Database["public"]["Enums"]["viib_intent_type"]
          source?: string
          title_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viib_intent_classified_titles_staging_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      viib_title_intent_stats: {
        Row: {
          intent_count: number
          last_computed_at: string
          primary_confidence_score: number | null
          primary_intent_type: string | null
          title_id: string
        }
        Insert: {
          intent_count?: number
          last_computed_at?: string
          primary_confidence_score?: number | null
          primary_intent_type?: string | null
          title_id: string
        }
        Update: {
          intent_count?: number
          last_computed_at?: string
          primary_confidence_score?: number | null
          primary_intent_type?: string | null
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viib_title_intent_stats_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: true
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      viib_weight_config: {
        Row: {
          context_weight: number
          created_at: string
          emotional_weight: number
          historical_weight: number
          id: string
          is_active: boolean
          notes: string | null
          novelty_weight: number
          social_weight: number
          vibe_weight: number
        }
        Insert: {
          context_weight: number
          created_at?: string
          emotional_weight: number
          historical_weight: number
          id?: string
          is_active?: boolean
          notes?: string | null
          novelty_weight: number
          social_weight: number
          vibe_weight?: number
        }
        Update: {
          context_weight?: number
          created_at?: string
          emotional_weight?: number
          historical_weight?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          novelty_weight?: number
          social_weight?: number
          vibe_weight?: number
        }
        Relationships: []
      }
      visual_taste_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          genre_id: string
          genre_name: string
          gradient_class: string | null
          id: string
          is_active: boolean | null
          mood_description: string | null
          poster_path: string | null
          poster_tmdb_id: number | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          genre_id: string
          genre_name: string
          gradient_class?: string | null
          id?: string
          is_active?: boolean | null
          mood_description?: string | null
          poster_path?: string | null
          poster_tmdb_id?: number | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          genre_id?: string
          genre_name?: string
          gradient_class?: string | null
          id?: string
          is_active?: boolean | null
          mood_description?: string | null
          poster_path?: string | null
          poster_tmdb_id?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      viib_recommendation_debug: {
        Row: {
          base_viib_score: number | null
          final_score: number | null
          social_priority_score: number | null
          title_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_taste_similarity: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: number
      }
      calculate_user_emotion_intensity: {
        Args: { p_emotion_id: string; p_energy_percentage: number }
        Returns: number
      }
      check_ip_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip_address: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      check_list_ownership: {
        Args: { p_list_id: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit_fast: {
        Args: { p_key: string; p_max_count: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          current_count: number
          requires_captcha: boolean
        }[]
      }
      check_recommendation_cache_freshness: {
        Args: never
        Returns: {
          age_hours: number
          cache_name: string
          needs_refresh: boolean
          newest_update: string
          oldest_update: string
          row_count: number
        }[]
      }
      cleanup_rate_limit_data: { Args: never; Returns: undefined }
      cleanup_rate_limit_entries: { Args: never; Returns: number }
      explain_recommendation: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: {
          emotional_match: number
          friend_name: string
          friend_rating: string
          full_explanation: string
          intent_confidence: number
          intent_match: string
          primary_reason: string
          secondary_reasons: string[]
          social_score: number
          taste_similarity: number
          title_id: string
          transformation_score: number
          transformation_type: string
        }[]
      }
      get_active_viib_weights: {
        Args: never
        Returns: {
          context_weight: number
          emotional_weight: number
          historical_weight: number
          id: string
          novelty_weight: number
          social_weight: number
        }[]
      }
      get_app_setting: {
        Args: { p_default?: string; p_key: string }
        Returns: string
      }
      get_corrupted_streaming_count: { Args: never; Returns: number }
      get_cron_job_progress: {
        Args: never
        Returns: {
          intent_count: number
          intent_updated_at: string
          social_count: number
          social_updated_at: string
          transform_count: number
          transform_updated_at: string
          vector_count: number
          vector_updated_at: string
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          database: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_display_emotion_phrase: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_job_classification_metrics: {
        Args: never
        Returns: {
          emotion_primary_distinct: number
          emotion_staging_distinct: number
          intent_primary_distinct: number
          intent_staging_distinct: number
          total_titles: number
        }[]
      }
      get_lockout_remaining: {
        Args: { p_identifier: string; p_window_minutes?: number }
        Returns: number
      }
      get_result_emotion_label: {
        Args: { p_emotion_label: string; p_intensity: number }
        Returns: string
      }
      get_titles_by_ids: {
        Args: { p_title_ids: string[] }
        Returns: {
          backdrop_path: string
          first_air_date: string
          id: string
          name: string
          overview: string
          poster_path: string
          release_date: string
          runtime: number
          title_type: string
          tmdb_id: number
          trailer_url: string
        }[]
      }
      get_titles_needing_classification: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          id: string
          name: string
          original_language: string
          overview: string
          title_genres: Json
          title_type: string
          trailer_transcript: string
        }[]
      }
      get_titles_with_all_streaming_services:
        | {
            Args: { p_limit?: number }
            Returns: {
              id: string
              name: string
              title_type: string
              tmdb_id: number
            }[]
          }
        | {
            Args: { p_cursor?: string; p_limit?: number }
            Returns: {
              id: string
              name: string
              title_type: string
              tmdb_id: number
            }[]
          }
      get_top_recommendations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          base_viib_score: number
          final_score: number
          intent_alignment_score: number
          social_priority_score: number
          title_id: string
        }[]
      }
      get_top_recommendations_v2: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          base_viib_score: number
          context_component: number
          emotional_component: number
          final_score: number
          historical_component: number
          novelty_component: number
          title_id: string
          vibe_component: number
        }[]
      }
      get_top_recommendations_v3: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          emotion_score: number
          final_score: number
          popularity_score: number
          quality_score: number
          social_score: number
          title_id: string
          vibe_score: number
        }[]
      }
      get_top_recommendations_with_intent: {
        Args: { p_limit: number; p_user_id: string }
        Returns: {
          base_viib_score: number
          final_score: number
          intent_alignment_score: number
          social_priority_score: number
          title_id: string
        }[]
      }
      get_user_id_from_auth: { Args: never; Returns: string }
      get_vibe_list_stats: {
        Args: { p_list_ids: string[] }
        Returns: {
          follower_count: number
          item_count: number
          list_id: string
          view_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_otp: { Args: { p_otp: string; p_salt?: string }; Returns: string }
      increment_job_titles: {
        Args: { p_increment: number; p_job_type: string }
        Returns: undefined
      }
      invalidate_old_otps: { Args: { p_email: string }; Returns: undefined }
      invalidate_old_phone_otps: {
        Args: { p_phone: string }
        Returns: undefined
      }
      is_account_locked: {
        Args: { p_identifier: string; p_window_minutes?: number }
        Returns: boolean
      }
      is_session_valid: {
        Args: { p_token_hash: string }
        Returns: {
          user_id: string
          valid: boolean
        }[]
      }
      link_auth_user_to_profile: {
        Args: { p_auth_id: string; p_user_id: string }
        Returns: undefined
      }
      log_recommendation_outcome: {
        Args: {
          p_rating_value: Database["public"]["Enums"]["rating_value"]
          p_title_id: string
          p_user_id: string
          p_was_selected: boolean
          p_watch_duration_percentage: number
        }
        Returns: undefined
      }
      promote_title_intents: { Args: { p_limit?: number }; Returns: number }
      record_login_attempt: {
        Args: {
          p_attempt_type?: string
          p_identifier: string
          p_ip_address: string
          p_success?: boolean
        }
        Returns: undefined
      }
      refresh_all_recommendation_caches: {
        Args: never
        Returns: {
          duration_ms: number
          rows_affected: number
          status: string
          step: string
        }[]
      }
      refresh_title_emotion_vectors: { Args: never; Returns: undefined }
      refresh_title_intent_alignment_scores: { Args: never; Returns: undefined }
      refresh_title_intent_alignment_scores_batch: {
        Args: { p_batch_size?: number }
        Returns: {
          has_more: boolean
          processed_count: number
        }[]
      }
      refresh_title_social_summary: { Args: never; Returns: undefined }
      refresh_title_transformation_scores: { Args: never; Returns: undefined }
      refresh_title_transformation_scores_batch: {
        Args: { p_batch_size?: number }
        Returns: {
          has_more: boolean
          processed_count: number
        }[]
      }
      refresh_title_user_emotion_match_cache: {
        Args: never
        Returns: undefined
      }
      refresh_user_title_social_scores_recent_users: {
        Args: never
        Returns: undefined
      }
      refresh_viib_reco_materializations: { Args: never; Returns: undefined }
      refresh_viib_title_intent_stats: {
        Args: { p_title_id: string }
        Returns: undefined
      }
      revoke_all_user_sessions: { Args: { p_user_id: string }; Returns: number }
      run_cron_job_now: { Args: { p_command: string }; Returns: undefined }
      store_user_emotion_vector: {
        Args: {
          p_emotion_label: string
          p_energy_percentage: number
          p_raw_arousal?: number
          p_raw_valence?: number
          p_user_id: string
        }
        Returns: undefined
      }
      toggle_cron_job: {
        Args: { p_active: boolean; p_jobid: number }
        Returns: undefined
      }
      translate_mood_to_emotion: {
        Args: {
          p_energy_percentage: number
          p_mood_text: string
          p_raw_arousal?: number
          p_raw_valence?: number
          p_user_id: string
        }
        Returns: {
          emotion_id: string
          emotion_label: string
        }[]
      }
      update_cron_schedule: {
        Args: { p_jobid: number; p_schedule: string }
        Returns: undefined
      }
      verify_otp_secure: {
        Args: {
          p_max_attempts?: number
          p_otp_input: string
          p_phone_number: string
        }
        Returns: {
          error_message: string
          success: boolean
          verification_id: string
        }[]
      }
      viib_autotune_weights:
        | { Args: { p_days?: number }; Returns: string }
        | {
            Args: { p_days?: number; p_min_samples?: number }
            Returns: undefined
          }
      viib_intent_alignment_score: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: number
      }
      viib_score: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: number
      }
      viib_score_components: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: {
          context_component: number
          emotional_component: number
          historical_component: number
          novelty_component: number
          social_component: number
        }[]
      }
      viib_score_components_old: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: Record<string, unknown>
      }
      viib_score_with_intent: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: number
      }
      viib_social_priority_score: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_type: "movie" | "series" | "documentary" | "short" | "other"
      device_type: "mobile" | "tv" | "tablet" | "web" | "other"
      discovery_source:
        | "recommendation"
        | "search"
        | "friend"
        | "trending"
        | "external_link"
        | "notification"
        | "other"
      emotion_category: "user_state" | "content_state" | "content_tone"
      engagement_action:
        | "click"
        | "preview"
        | "watch_start"
        | "watch_complete"
        | "abandon"
      environment_tag:
        | "alone"
        | "family"
        | "friends"
        | "commute"
        | "work"
        | "public"
        | "other"
      feedback_type:
        | "bug"
        | "suggestion"
        | "emotional_response"
        | "feature_request"
        | "other"
      interaction_type:
        | "started"
        | "completed"
        | "liked"
        | "disliked"
        | "browsed"
        | "wishlisted"
        | "ignored"
      model_type:
        | "collaborative"
        | "content_based"
        | "hybrid"
        | "deep_learning"
        | "reinforcement"
        | "other"
      network_type: "wifi" | "cellular" | "offline" | "unknown"
      notification_type:
        | "recommendation"
        | "friend_activity"
        | "system"
        | "reminder"
      provider_type_enum: "buy" | "rent" | "stream" | "free"
      rating_value: "love_it" | "like_it" | "ok" | "dislike_it" | "not_rated"
      relationship_type:
        | "friend"
        | "family"
        | "partner"
        | "colleague"
        | "acquaintance"
        | "other"
      signup_method:
        | "email"
        | "phone"
        | "google"
        | "apple"
        | "github"
        | "linkedin"
        | "other"
      time_of_day: "morning" | "afternoon" | "evening" | "night" | "late_night"
      title_type_enum: "movie" | "tv"
      transformation_type:
        | "soothe"
        | "stabilize"
        | "validate"
        | "amplify"
        | "complementary"
        | "reinforcing"
        | "neutral_balancing"
      viib_intent_type:
        | "adrenaline_rush"
        | "background_passive"
        | "comfort_escape"
        | "deep_thought"
        | "discovery"
        | "emotional_release"
        | "family_bonding"
        | "light_entertainment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      content_type: ["movie", "series", "documentary", "short", "other"],
      device_type: ["mobile", "tv", "tablet", "web", "other"],
      discovery_source: [
        "recommendation",
        "search",
        "friend",
        "trending",
        "external_link",
        "notification",
        "other",
      ],
      emotion_category: ["user_state", "content_state", "content_tone"],
      engagement_action: [
        "click",
        "preview",
        "watch_start",
        "watch_complete",
        "abandon",
      ],
      environment_tag: [
        "alone",
        "family",
        "friends",
        "commute",
        "work",
        "public",
        "other",
      ],
      feedback_type: [
        "bug",
        "suggestion",
        "emotional_response",
        "feature_request",
        "other",
      ],
      interaction_type: [
        "started",
        "completed",
        "liked",
        "disliked",
        "browsed",
        "wishlisted",
        "ignored",
      ],
      model_type: [
        "collaborative",
        "content_based",
        "hybrid",
        "deep_learning",
        "reinforcement",
        "other",
      ],
      network_type: ["wifi", "cellular", "offline", "unknown"],
      notification_type: [
        "recommendation",
        "friend_activity",
        "system",
        "reminder",
      ],
      provider_type_enum: ["buy", "rent", "stream", "free"],
      rating_value: ["love_it", "like_it", "ok", "dislike_it", "not_rated"],
      relationship_type: [
        "friend",
        "family",
        "partner",
        "colleague",
        "acquaintance",
        "other",
      ],
      signup_method: [
        "email",
        "phone",
        "google",
        "apple",
        "github",
        "linkedin",
        "other",
      ],
      time_of_day: ["morning", "afternoon", "evening", "night", "late_night"],
      title_type_enum: ["movie", "tv"],
      transformation_type: [
        "soothe",
        "stabilize",
        "validate",
        "amplify",
        "complementary",
        "reinforcing",
        "neutral_balancing",
      ],
      viib_intent_type: [
        "adrenaline_rush",
        "background_passive",
        "comfort_escape",
        "deep_thought",
        "discovery",
        "emotional_release",
        "family_bonding",
        "light_entertainment",
      ],
    },
  },
} as const
