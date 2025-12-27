-- ============================================================================
-- Session Management & Performance Indexes
-- Date: December 27, 2025
-- Addresses remaining security and performance issues
-- ============================================================================

-- ============================================================================
-- PART 1: Session Tokens Table for Token Invalidation/Revocation
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL, -- Hash of the token for lookup
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    is_remember_me BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- Service role only policies
CREATE POLICY "Service role only - session tokens"
    ON session_tokens FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id
    ON session_tokens(user_id, revoked_at)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_session_tokens_hash
    ON session_tokens(token_hash)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_session_tokens_expires
    ON session_tokens(expires_at)
    WHERE revoked_at IS NULL;

-- Function to revoke all sessions for a user
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE session_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to check if a session token is valid
CREATE OR REPLACE FUNCTION is_session_valid(p_token_hash TEXT)
RETURNS TABLE(valid BOOLEAN, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (st.id IS NOT NULL AND st.revoked_at IS NULL AND st.expires_at > NOW()) AS valid,
        st.user_id
    FROM session_tokens st
    WHERE st.token_hash = p_token_hash
    LIMIT 1;
END;
$$;


-- ============================================================================
-- PART 2: Composite Indexes for Recommendation Performance
-- ============================================================================

-- title_streaming_availability: for join with user subscriptions
CREATE INDEX IF NOT EXISTS idx_title_streaming_avail_composite
    ON title_streaming_availability(streaming_service_id, title_id);

-- user_streaming_subscriptions: for filtering active subscriptions
CREATE INDEX IF NOT EXISTS idx_user_streaming_subs_composite
    ON user_streaming_subscriptions(user_id, is_active, streaming_service_id)
    WHERE is_active = TRUE;

-- user_language_preferences: for language filtering
CREATE INDEX IF NOT EXISTS idx_user_language_prefs_composite
    ON user_language_preferences(user_id, language_code);

-- user_title_interactions: for exclusion queries
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_composite
    ON user_title_interactions(user_id, interaction_type, title_id);

-- user_title_interactions: for specific exclusion types
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_excluded
    ON user_title_interactions(user_id, title_id)
    WHERE interaction_type IN ('completed', 'disliked');

-- viib_emotion_classified_titles: for emotion matching
CREATE INDEX IF NOT EXISTS idx_emotion_classified_titles_composite
    ON viib_emotion_classified_titles(title_id, emotion_id, intensity_level DESC);

-- title_transformation_scores: for transformation lookups
CREATE INDEX IF NOT EXISTS idx_title_transformation_composite
    ON title_transformation_scores(user_emotion_id, title_id, transformation_score DESC);

-- user_emotion_states: for getting latest emotion
CREATE INDEX IF NOT EXISTS idx_user_emotion_states_latest
    ON user_emotion_states(user_id, created_at DESC);

-- friend_connections: for social recommendations
CREATE INDEX IF NOT EXISTS idx_friend_connections_active
    ON friend_connections(user_id, friend_user_id, trust_score DESC)
    WHERE is_blocked IS NULL OR is_blocked = FALSE;

-- user_social_recommendations: for social rec lookup
CREATE INDEX IF NOT EXISTS idx_social_recommendations_receiver
    ON user_social_recommendations(receiver_user_id, title_id);


-- ============================================================================
-- PART 3: CAPTCHA Verification Settings
-- ============================================================================

-- Add CAPTCHA settings to app_settings
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES
    ('captcha_enabled', 'true', 'Enable CAPTCHA verification for OTP endpoints'),
    ('captcha_provider', 'turnstile', 'CAPTCHA provider: turnstile (Cloudflare) or recaptcha'),
    ('captcha_threshold', '3', 'Number of failed attempts before requiring CAPTCHA')
ON CONFLICT (setting_key) DO UPDATE SET
    description = EXCLUDED.description;

-- Track CAPTCHA requirements per identifier
ALTER TABLE login_attempts
    ADD COLUMN IF NOT EXISTS requires_captcha BOOLEAN DEFAULT FALSE;


-- ============================================================================
-- PART 4: Lightweight Rate Limit Store (replaces system_logs counting)
-- ============================================================================

-- This table is optimized for fast rate limit checks with TTL
CREATE TABLE IF NOT EXISTS rate_limit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL, -- Format: "type:identifier" e.g., "password:user@email.com"
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(key)
);

-- Fast lookups by key
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_key
    ON rate_limit_entries(key);

-- For cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_expires
    ON rate_limit_entries(expires_at);

-- Enable RLS
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - rate limits"
    ON rate_limit_entries FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Efficient rate limit check and increment function
CREATE OR REPLACE FUNCTION check_rate_limit_fast(
    p_key TEXT,
    p_max_count INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, requires_captcha BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    v_expires_at TIMESTAMPTZ := v_now + (p_window_seconds || ' seconds')::INTERVAL;
    v_current INTEGER;
    v_captcha_threshold INTEGER := 3;
BEGIN
    -- Upsert rate limit entry
    INSERT INTO rate_limit_entries (key, count, window_start, expires_at)
    VALUES (p_key, 1, v_now, v_expires_at)
    ON CONFLICT (key) DO UPDATE SET
        count = CASE
            WHEN rate_limit_entries.window_start < v_window_start THEN 1
            ELSE rate_limit_entries.count + 1
        END,
        window_start = CASE
            WHEN rate_limit_entries.window_start < v_window_start THEN v_now
            ELSE rate_limit_entries.window_start
        END,
        expires_at = CASE
            WHEN rate_limit_entries.window_start < v_window_start THEN v_expires_at
            ELSE rate_limit_entries.expires_at
        END
    RETURNING rate_limit_entries.count INTO v_current;

    RETURN QUERY SELECT
        v_current <= p_max_count,
        v_current,
        v_current >= v_captcha_threshold AND v_current <= p_max_count;
END;
$$;

-- Cleanup function for expired rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS INTEGER
LANGUAGE plpgsql
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


-- ============================================================================
-- PART 5: Add proper HTTP status tracking for monitoring
-- ============================================================================

-- Add status code to system_logs for better monitoring
ALTER TABLE system_logs
    ADD COLUMN IF NOT EXISTS http_status INTEGER;


-- ============================================================================
-- COMPLETE
-- ============================================================================
