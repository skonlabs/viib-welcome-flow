-- ============================================================================
-- RATE LIMIT SETTINGS MIGRATION
-- Adds configurable rate limit window settings to app_settings table
-- ============================================================================

-- First, ensure the app_settings table uses the correct schema
-- The Edge Functions expect 'key' and 'value' columns (text), not setting_key/setting_value

-- Add new columns if they don't exist (for backwards compatibility)
DO $$
BEGIN
    -- Check if 'key' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'key') THEN
        ALTER TABLE app_settings ADD COLUMN key TEXT;
    END IF;

    -- Check if 'value' column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'value') THEN
        ALTER TABLE app_settings ADD COLUMN value TEXT;
    END IF;
END $$;

-- Insert rate limit settings (using key/value columns)
INSERT INTO app_settings (key, value, description) VALUES
    ('otp_rate_limit', '5', 'Maximum OTP requests per rate limit window'),
    ('otp_rate_limit_window', '15', 'Rate limit window in minutes for OTP requests'),
    ('password_max_attempts', '5', 'Maximum password verification attempts per window'),
    ('password_rate_limit_window', '15', 'Rate limit window in minutes for password attempts')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Create index on key column if not exists
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
