-- ============================================================================
-- SUPABASE AUTH MIGRATION & COMPLETE RLS LOCKDOWN
-- Date: December 27, 2025
--
-- This migration:
-- 1. Links users table to auth.users for proper Supabase Auth integration
-- 2. Removes ALL public RLS policies
-- 3. Creates auth.uid() based RLS policies
-- 4. Secures OTP tables (service-role only)
-- 5. Ensures no table is publicly readable/writable
-- ============================================================================

-- ============================================================================
-- PART 1: Link users table to auth.users
-- ============================================================================

-- Add auth_id column to link to auth.users
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- Function to get user_id from auth.uid()
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = auth.uid();

    RETURN v_user_id;
END;
$$;


-- ============================================================================
-- PART 2: DROP ALL EXISTING PUBLIC RLS POLICIES
-- We will recreate them with proper auth.uid() checks
-- ============================================================================

-- phone_verifications: service-role only (already done, but ensure)
DROP POLICY IF EXISTS "Allow insert for phone verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Allow select for phone verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Allow update for phone verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role only - insert" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role only - select" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role only - update" ON public.phone_verifications;
DROP POLICY IF EXISTS "Service role only - delete" ON public.phone_verifications;

-- email_verifications: service-role only
DROP POLICY IF EXISTS "Allow insert for email verification" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow select for email verification" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow update for email verification" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow public insert" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow public select" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow public update" ON public.email_verifications;
DROP POLICY IF EXISTS "Service role only - insert" ON public.email_verifications;
DROP POLICY IF EXISTS "Service role only - select" ON public.email_verifications;
DROP POLICY IF EXISTS "Service role only - update" ON public.email_verifications;
DROP POLICY IF EXISTS "Service role only - delete" ON public.email_verifications;

-- users table
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow public read" ON public.users;
DROP POLICY IF EXISTS "Allow public insert" ON public.users;
DROP POLICY IF EXISTS "Allow public update" ON public.users;
DROP POLICY IF EXISTS "Public read access" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;


-- ============================================================================
-- PART 3: CREATE SECURE RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables (ensure it's on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- phone_verifications: SERVICE ROLE ONLY
-- No public access whatsoever
-- ----------------------------------------
CREATE POLICY "phone_verifications_service_role_all"
    ON public.phone_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------
-- email_verifications: SERVICE ROLE ONLY
-- No public access whatsoever
-- ----------------------------------------
CREATE POLICY "email_verifications_service_role_all"
    ON public.email_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------
-- users: Auth-based access
-- Users can only access their own row
-- ----------------------------------------
CREATE POLICY "users_select_own"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth_id = auth.uid());

CREATE POLICY "users_update_own"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Service role can manage all users
CREATE POLICY "users_service_role_all"
    ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================================
-- PART 4: USER-OWNED TABLES - RLS WITH auth.uid()
-- ============================================================================

-- Helper function to check table ownership
-- Tables use user_id column which links to users.id
-- We need to check if users.auth_id = auth.uid()

-- user_emotion_states
ALTER TABLE public.user_emotion_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_emotion_states_select" ON public.user_emotion_states;
DROP POLICY IF EXISTS "user_emotion_states_insert" ON public.user_emotion_states;
DROP POLICY IF EXISTS "user_emotion_states_update" ON public.user_emotion_states;
DROP POLICY IF EXISTS "user_emotion_states_delete" ON public.user_emotion_states;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_emotion_states;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.user_emotion_states;
DROP POLICY IF EXISTS "Enable update for all users" ON public.user_emotion_states;

CREATE POLICY "user_emotion_states_auth"
    ON public.user_emotion_states
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_emotion_states_service"
    ON public.user_emotion_states
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_streaming_subscriptions
ALTER TABLE public.user_streaming_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_streaming_subscriptions;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_streaming_subscriptions;
DROP POLICY IF EXISTS "Enable update for all" ON public.user_streaming_subscriptions;
DROP POLICY IF EXISTS "Enable delete for all" ON public.user_streaming_subscriptions;

CREATE POLICY "user_streaming_subscriptions_auth"
    ON public.user_streaming_subscriptions
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_streaming_subscriptions_service"
    ON public.user_streaming_subscriptions
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_language_preferences
ALTER TABLE public.user_language_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_language_preferences;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_language_preferences;
DROP POLICY IF EXISTS "Enable update for all" ON public.user_language_preferences;
DROP POLICY IF EXISTS "Enable delete for all" ON public.user_language_preferences;

CREATE POLICY "user_language_preferences_auth"
    ON public.user_language_preferences
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_language_preferences_service"
    ON public.user_language_preferences
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_title_interactions
ALTER TABLE public.user_title_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_title_interactions;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_title_interactions;
DROP POLICY IF EXISTS "Enable update for all" ON public.user_title_interactions;
DROP POLICY IF EXISTS "Enable delete for all" ON public.user_title_interactions;

CREATE POLICY "user_title_interactions_auth"
    ON public.user_title_interactions
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_title_interactions_service"
    ON public.user_title_interactions
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_vibe_preferences
ALTER TABLE public.user_vibe_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Enable update for all" ON public.user_vibe_preferences;
DROP POLICY IF EXISTS "Enable delete for all" ON public.user_vibe_preferences;

CREATE POLICY "user_vibe_preferences_auth"
    ON public.user_vibe_preferences
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_vibe_preferences_service"
    ON public.user_vibe_preferences
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- friend_connections
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.friend_connections;
DROP POLICY IF EXISTS "Enable insert for all" ON public.friend_connections;
DROP POLICY IF EXISTS "Enable update for all" ON public.friend_connections;
DROP POLICY IF EXISTS "Enable delete for all" ON public.friend_connections;

CREATE POLICY "friend_connections_auth"
    ON public.friend_connections
    FOR ALL
    TO authenticated
    USING (
        user_id = get_user_id_from_auth()
        OR friend_user_id = get_user_id_from_auth()
    )
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "friend_connections_service"
    ON public.friend_connections
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_social_recommendations
ALTER TABLE public.user_social_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_social_recommendations;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_social_recommendations;

CREATE POLICY "user_social_recommendations_auth"
    ON public.user_social_recommendations
    FOR ALL
    TO authenticated
    USING (
        sender_user_id = get_user_id_from_auth()
        OR receiver_user_id = get_user_id_from_auth()
    )
    WITH CHECK (sender_user_id = get_user_id_from_auth());

CREATE POLICY "user_social_recommendations_service"
    ON public.user_social_recommendations
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- vibe_lists
ALTER TABLE public.vibe_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.vibe_lists;
DROP POLICY IF EXISTS "Enable insert for all" ON public.vibe_lists;
DROP POLICY IF EXISTS "Enable update for all" ON public.vibe_lists;
DROP POLICY IF EXISTS "Enable delete for all" ON public.vibe_lists;

CREATE POLICY "vibe_lists_select_auth"
    ON public.vibe_lists
    FOR SELECT
    TO authenticated
    USING (
        user_id = get_user_id_from_auth()
        OR visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM vibe_list_shared_with
            WHERE vibe_list_id = vibe_lists.id
            AND shared_with_user_id = get_user_id_from_auth()
        )
    );

CREATE POLICY "vibe_lists_modify_auth"
    ON public.vibe_lists
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "vibe_lists_service"
    ON public.vibe_lists
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- vibe_list_items
ALTER TABLE public.vibe_list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.vibe_list_items;
DROP POLICY IF EXISTS "Enable insert for all" ON public.vibe_list_items;
DROP POLICY IF EXISTS "Enable update for all" ON public.vibe_list_items;
DROP POLICY IF EXISTS "Enable delete for all" ON public.vibe_list_items;

CREATE POLICY "vibe_list_items_auth"
    ON public.vibe_list_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vibe_lists
            WHERE id = vibe_list_items.vibe_list_id
            AND user_id = get_user_id_from_auth()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vibe_lists
            WHERE id = vibe_list_items.vibe_list_id
            AND user_id = get_user_id_from_auth()
        )
    );

CREATE POLICY "vibe_list_items_service"
    ON public.vibe_list_items
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- personality_profiles
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.personality_profiles;
DROP POLICY IF EXISTS "Enable insert for all" ON public.personality_profiles;
DROP POLICY IF EXISTS "Enable update for all" ON public.personality_profiles;

CREATE POLICY "personality_profiles_auth"
    ON public.personality_profiles
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "personality_profiles_service"
    ON public.personality_profiles
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_context_logs
ALTER TABLE public.user_context_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_context_logs;
DROP POLICY IF EXISTS "Enable insert for all" ON public.user_context_logs;

CREATE POLICY "user_context_logs_auth"
    ON public.user_context_logs
    FOR ALL
    TO authenticated
    USING (user_id = get_user_id_from_auth())
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "user_context_logs_service"
    ON public.user_context_logs
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.feedback;
DROP POLICY IF EXISTS "Enable insert for all" ON public.feedback;

CREATE POLICY "feedback_insert_auth"
    ON public.feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = get_user_id_from_auth());

CREATE POLICY "feedback_select_own"
    ON public.feedback
    FOR SELECT
    TO authenticated
    USING (user_id = get_user_id_from_auth());

CREATE POLICY "feedback_service"
    ON public.feedback
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.user_roles;

CREATE POLICY "user_roles_select_own"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = get_user_id_from_auth());

CREATE POLICY "user_roles_service"
    ON public.user_roles
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- ============================================================================
-- PART 5: SYSTEM TABLES - SERVICE ROLE ONLY
-- ============================================================================

-- login_attempts: service-role only
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.login_attempts;
DROP POLICY IF EXISTS "Enable insert for all" ON public.login_attempts;

CREATE POLICY "login_attempts_service"
    ON public.login_attempts
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- ip_rate_limits: service-role only
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.ip_rate_limits;
DROP POLICY IF EXISTS "Enable insert for all" ON public.ip_rate_limits;

CREATE POLICY "ip_rate_limits_service"
    ON public.ip_rate_limits
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- rate_limit_entries: service-role only
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_entries_service"
    ON public.rate_limit_entries
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- session_tokens: service-role only
ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_tokens_service"
    ON public.session_tokens
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- system_logs: service-role only
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.system_logs;
DROP POLICY IF EXISTS "Enable insert for all" ON public.system_logs;

CREATE POLICY "system_logs_service"
    ON public.system_logs
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- app_settings: service-role only (read by anon for non-sensitive settings)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.app_settings;

CREATE POLICY "app_settings_service"
    ON public.app_settings
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Allow anon to read non-sensitive settings
CREATE POLICY "app_settings_anon_read"
    ON public.app_settings
    FOR SELECT
    TO anon
    USING (
        setting_key NOT LIKE '%secret%'
        AND setting_key NOT LIKE '%key%'
        AND setting_key NOT LIKE '%password%'
        AND setting_key NOT LIKE '%token%'
    );


-- ============================================================================
-- PART 6: PUBLIC READ-ONLY TABLES (titles, streaming services, etc.)
-- ============================================================================

-- titles: public read, service-role write
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.titles;

CREATE POLICY "titles_public_read"
    ON public.titles
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "titles_service_write"
    ON public.titles
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- streaming_services: public read
ALTER TABLE public.streaming_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.streaming_services;

CREATE POLICY "streaming_services_public_read"
    ON public.streaming_services
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "streaming_services_service_write"
    ON public.streaming_services
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- emotion_master: public read
ALTER TABLE public.emotion_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.emotion_master;

CREATE POLICY "emotion_master_public_read"
    ON public.emotion_master
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "emotion_master_service_write"
    ON public.emotion_master
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);


-- ============================================================================
-- PART 7: FUNCTION TO CREATE AUTH USER AND LINK TO USERS TABLE
-- ============================================================================

-- This function is called by edge functions after Supabase Auth signup
CREATE OR REPLACE FUNCTION link_auth_user_to_profile(
    p_auth_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET auth_id = p_auth_id
    WHERE id = p_user_id;
END;
$$;


-- ============================================================================
-- COMPLETE
-- ============================================================================
