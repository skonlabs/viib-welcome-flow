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
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      emotion_energy_profile: {
        Row: {
          created_at: string
          emotion_id: string
          id: string
          intensity_multiplier: number
        }
        Insert: {
          created_at?: string
          emotion_id: string
          id?: string
          intensity_multiplier: number
        }
        Update: {
          created_at?: string
          emotion_id?: string
          id?: string
          intensity_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "emotion_energy_profile_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: true
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_master: {
        Row: {
          arousal: number | null
          category: string
          description: string | null
          dominance: number | null
          emotion_label: string
          id: string
          valence: number | null
        }
        Insert: {
          arousal?: number | null
          category: string
          description?: string | null
          dominance?: number | null
          emotion_label: string
          id?: string
          valence?: number | null
        }
        Update: {
          arousal?: number | null
          category?: string
          description?: string | null
          dominance?: number | null
          emotion_label?: string
          id?: string
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
          from_emotion_id: string
          id: string
          strength: number
          to_emotion_id: string
          transformation_type: string
        }
        Insert: {
          from_emotion_id: string
          id?: string
          strength: number
          to_emotion_id: string
          transformation_type: string
        }
        Update: {
          from_emotion_id?: string
          id?: string
          strength?: number
          to_emotion_id?: string
          transformation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_transformation_map_from_emotion_id_fkey"
            columns: ["from_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotion_transformation_map_to_emotion_id_fkey"
            columns: ["to_emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_connections: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          is_muted: boolean
          relationship_type: string | null
          trust_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          is_muted?: boolean
          relationship_type?: string | null
          trust_score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
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
            foreignKeyName: "friend_connections_friend_user_id_fkey"
            columns: ["friend_user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      genres: {
        Row: {
          genre_name: string
          id: string
        }
        Insert: {
          genre_name: string
          id?: string
        }
        Update: {
          genre_name?: string
          id?: string
        }
        Relationships: []
      }
      language_master: {
        Row: {
          language_code: string
          language_name: string
        }
        Insert: {
          language_code: string
          language_name: string
        }
        Update: {
          language_code?: string
          language_name?: string
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
          {
            foreignKeyName: "personality_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          verified?: boolean
        }
        Relationships: []
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
            foreignKeyName: "recommendation_outcomes_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
        ]
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
      title_emotional_signatures: {
        Row: {
          emotion_id: string
          id: string
          intensity_level: number
          title_id: string
        }
        Insert: {
          emotion_id: string
          id?: string
          intensity_level: number
          title_id: string
        }
        Update: {
          emotion_id?: string
          id?: string
          intensity_level?: number
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_emotional_signatures_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_emotional_signatures_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_emotional_signatures_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
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
          {
            foreignKeyName: "title_genres_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
          },
        ]
      }
      title_languages: {
        Row: {
          language_code: string
          language_type: string
          title_id: string
        }
        Insert: {
          language_code: string
          language_type: string
          title_id: string
        }
        Update: {
          language_code?: string
          language_type?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_languages_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "language_master"
            referencedColumns: ["language_code"]
          },
          {
            foreignKeyName: "title_languages_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_languages_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
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
          {
            foreignKeyName: "title_streaming_availability_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
          },
        ]
      }
      titles: {
        Row: {
          content_type: string
          created_at: string
          id: string
          original_language: string | null
          original_title_name: string | null
          popularity_score: number | null
          release_year: number | null
          runtime_minutes: number | null
          synopsis: string | null
          title_name: string
        }
        Insert: {
          content_type: string
          created_at?: string
          id?: string
          original_language?: string | null
          original_title_name?: string | null
          popularity_score?: number | null
          release_year?: number | null
          runtime_minutes?: number | null
          synopsis?: string | null
          title_name: string
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          original_language?: string | null
          original_title_name?: string | null
          popularity_score?: number | null
          release_year?: number | null
          runtime_minutes?: number | null
          synopsis?: string | null
          title_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "titles_original_language_fkey"
            columns: ["original_language"]
            isOneToOne: false
            referencedRelation: "language_master"
            referencedColumns: ["language_code"]
          },
        ]
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
          {
            foreignKeyName: "user_context_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_emotion_states: {
        Row: {
          arousal: number | null
          created_at: string
          dominance: number | null
          emotion_id: string
          emotion_intensity: number
          id: string
          user_id: string
          valence: number | null
        }
        Insert: {
          arousal?: number | null
          created_at?: string
          dominance?: number | null
          emotion_id: string
          emotion_intensity: number
          id?: string
          user_id: string
          valence?: number | null
        }
        Update: {
          arousal?: number | null
          created_at?: string
          dominance?: number | null
          emotion_id?: string
          emotion_intensity?: number
          id?: string
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
          {
            foreignKeyName: "user_emotion_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
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
            referencedRelation: "language_master"
            referencedColumns: ["language_code"]
          },
          {
            foreignKeyName: "user_language_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_language_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
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
        Relationships: []
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
            foreignKeyName: "user_social_recommendations_receiver_user_id_fkey"
            columns: ["receiver_user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_social_recommendations_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_social_recommendations_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_social_recommendations_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_social_recommendations_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
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
          {
            foreignKeyName: "user_streaming_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_title_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          rating_value: Database["public"]["Enums"]["rating_value"] | null
          title_id: string
          user_id: string
          watch_duration_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          rating_value?: Database["public"]["Enums"]["rating_value"] | null
          title_id: string
          user_id: string
          watch_duration_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          rating_value?: Database["public"]["Enums"]["rating_value"] | null
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
            foreignKeyName: "user_title_interactions_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
          },
          {
            foreignKeyName: "user_title_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_title_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "user_vibe_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
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
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
          {
            foreignKeyName: "viib_intent_classified_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
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
          {
            foreignKeyName: "viib_title_intent_stats_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: true
            referencedRelation: "viib_recommendation_debug"
            referencedColumns: ["title_id"]
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
      vw_missing_emotion_energy_profiles: {
        Row: {
          emotion_label: string | null
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
      explain_recommendation: {
        Args: { p_title_id: string; p_user_id: string }
        Returns: Json
      }
      get_top_recommendations: {
        Args: { p_limit: number; p_user_id: string }
        Returns: {
          base_viib_score: number
          final_score: number
          social_priority_score: number
          title_id: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      refresh_viib_title_intent_stats: {
        Args: { p_title_id: string }
        Returns: undefined
      }
      store_user_emotion_vector: {
        Args: {
          p_emotion_label: string
          p_energy_percentage: number
          p_user_id: string
        }
        Returns: undefined
      }
      translate_mood_to_emotion: {
        Args: {
          p_energy_percentage: number
          p_mood_text: string
          p_user_id: string
        }
        Returns: undefined
      }
      viib_autotune_weights: { Args: { p_days?: number }; Returns: string }
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
      emotion_category: "user_state" | "content_tone"
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
      transformation_type: "soothe" | "stabilize" | "validate" | "amplify"
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
      emotion_category: ["user_state", "content_tone"],
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
      transformation_type: ["soothe", "stabilize", "validate", "amplify"],
    },
  },
} as const
