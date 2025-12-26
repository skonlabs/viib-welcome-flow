-- ============================================================================
-- ADMIN SETTINGS AND PERFORMANCE INDEXES MIGRATION
-- ============================================================================

-- ============================================================================
-- PART 1: APP SETTINGS TABLE
-- Stores configurable application settings including rate limits and countries
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('otp_rate_limit', '{"max_requests": 5, "window_minutes": 1}', 'Rate limit for OTP requests per minute'),
('supported_countries', '["US", "GB", "IN", "CA", "AU", "DE", "FR", "JP", "KR", "BR", "MX", "ES", "IT", "NL", "SE", "NO", "DK", "FI", "CH", "AT", "BE", "IE", "NZ", "SG", "HK", "TW", "PH", "MY", "ID", "TH", "VN", "PL", "CZ", "RO", "HU", "GR", "PT", "ZA", "AE", "SA", "IL", "TR", "AR", "CL", "CO", "PE"]', 'List of supported country codes for the app')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- PART 2: UPDATE VIIB_WEIGHT_CONFIG TABLE
-- Add is_active index for faster lookups
-- ============================================================================

-- Ensure viib_weight_config has proper defaults if not already present
DO $$
BEGIN
    -- Check if any active config exists
    IF NOT EXISTS (SELECT 1 FROM viib_weight_config WHERE is_active = true) THEN
        -- Insert default configuration
        INSERT INTO viib_weight_config (emotional_weight, social_weight, historical_weight, context_weight, novelty_weight, is_active, notes)
        VALUES (0.35, 0.20, 0.25, 0.10, 0.10, true, 'Default ViiB score weights')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- PART 3: PERFORMANCE INDEXES
-- Adding missing indexes to improve query performance
-- ============================================================================

-- User title interactions indexes
CREATE INDEX IF NOT EXISTS idx_uti_user_interaction_type ON user_title_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_uti_created_at ON user_title_interactions(created_at DESC);

-- User social recommendations indexes
CREATE INDEX IF NOT EXISTS idx_usr_receiver ON user_social_recommendations(receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_usr_sender ON user_social_recommendations(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_usr_created_at ON user_social_recommendations(created_at DESC);

-- Friend connections indexes
CREATE INDEX IF NOT EXISTS idx_fc_friend_user_id ON friend_connections(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_fc_relationship_type ON friend_connections(relationship_type);

-- Titles indexes
CREATE INDEX IF NOT EXISTS idx_titles_classification_status ON titles(classification_status);
CREATE INDEX IF NOT EXISTS idx_titles_created_at ON titles(created_at DESC);

-- Vibe lists indexes
CREATE INDEX IF NOT EXISTS idx_vibe_lists_created_at ON vibe_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_list_items_added_at ON vibe_list_items(added_at DESC);

-- Seasons indexes (for watchlist queries)
CREATE INDEX IF NOT EXISTS idx_seasons_title_season ON seasons(title_id, season_number);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Activation codes indexes
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_created_at ON activation_codes(created_at DESC);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON system_logs(severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved ON system_logs(resolved);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- Phone/Email verifications indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);

-- Title streaming availability indexes
CREATE INDEX IF NOT EXISTS idx_tsa_title_id ON title_streaming_availability(title_id);

-- User streaming subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_uss_user_active ON user_streaming_subscriptions(user_id, is_active);

-- ============================================================================
-- PART 4: RPC FUNCTION FOR BATCH WATCHLIST COUNTS
-- Single query to get counts for multiple list IDs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_vibe_list_stats(p_list_ids UUID[])
RETURNS TABLE (
    list_id UUID,
    item_count BIGINT,
    view_count BIGINT,
    follower_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vl.id AS list_id,
        COALESCE(items.cnt, 0) AS item_count,
        COALESCE(views.cnt, 0) AS view_count,
        COALESCE(followers.cnt, 0) AS follower_count
    FROM unnest(p_list_ids) AS vl(id)
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM vibe_list_items
        WHERE vibe_list_id = vl.id
    ) items ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM vibe_list_views
        WHERE vibe_list_id = vl.id
    ) views ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM vibe_list_followers
        WHERE vibe_list_id = vl.id
    ) followers ON true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 5: FUNCTION TO GET ACTIVE VIIB WEIGHTS
-- Returns the currently active weight configuration
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_viib_weights()
RETURNS TABLE (
    id UUID,
    emotional_weight REAL,
    social_weight REAL,
    historical_weight REAL,
    context_weight REAL,
    novelty_weight REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vwc.id,
        vwc.emotional_weight,
        vwc.social_weight,
        vwc.historical_weight,
        vwc.context_weight,
        vwc.novelty_weight
    FROM viib_weight_config vwc
    WHERE vwc.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 6: FUNCTION FOR BATCH TITLE LOOKUP
-- Efficiently loads title details for multiple IDs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_titles_by_ids(p_title_ids UUID[])
RETURNS TABLE (
    id UUID,
    name TEXT,
    title_type TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    trailer_url TEXT,
    runtime INTEGER,
    release_date DATE,
    first_air_date DATE,
    tmdb_id INTEGER,
    overview TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.name,
        t.title_type,
        t.poster_path,
        t.backdrop_path,
        t.trailer_url,
        t.runtime,
        t.release_date,
        t.first_air_date,
        t.tmdb_id,
        t.overview
    FROM titles t
    WHERE t.id = ANY(p_title_ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 7: FUNCTION TO CHECK LIST OWNERSHIP
-- Security function to verify user owns a list before modifications
-- ============================================================================

CREATE OR REPLACE FUNCTION check_list_ownership(p_list_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vibe_lists
        WHERE id = p_list_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 8: FUNCTION TO INVALIDATE OLD OTPS
-- Invalidates all unexpired OTPs when a new one is verified
-- ============================================================================

CREATE OR REPLACE FUNCTION invalidate_old_otps(p_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE email_verifications
    SET verified = true
    WHERE email = p_email
    AND verified = false
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION invalidate_old_phone_otps(p_phone TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE phone_verifications
    SET verified = true
    WHERE phone_number = p_phone
    AND verified = false
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
