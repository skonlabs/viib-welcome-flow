-- ============================================================================
-- RATE LIMIT SETTINGS MIGRATION
-- Adds configurable rate limit settings to app_settings table
-- ============================================================================

-- Insert/update rate limit settings using correct column names (setting_key, setting_value as JSONB)
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('otp_rate_limit', '5'::jsonb, 'Maximum OTP requests per rate limit window'),
    ('otp_rate_limit_window', '15'::jsonb, 'Rate limit window in minutes for OTP requests'),
    ('password_max_attempts', '5'::jsonb, 'Maximum password verification attempts per window'),
    ('password_rate_limit_window', '15'::jsonb, 'Rate limit window in minutes for password attempts')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;
