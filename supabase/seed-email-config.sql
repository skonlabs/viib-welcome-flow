-- Seed Email Configuration for ViiB Application
-- Run this in Supabase SQL Editor to populate email_config table
-- NOTE: Replace placeholder values with your actual SMTP credentials

INSERT INTO public.email_config (
  smtp_host,
  smtp_port,
  smtp_user,
  smtp_password,
  from_email,
  from_name,
  use_ssl,
  is_active
) VALUES (
  'smtp.gmail.com',                    -- SMTP host (Gmail example)
  465,                                  -- SMTP port (465 for SSL, 587 for TLS)
  'your-email@gmail.com',               -- SMTP username (your email)
  'your-app-password-here',             -- SMTP password (use App Password for Gmail)
  'noreply@viib.app',                   -- From email address
  'ViiB Team',                          -- From name
  true,                                 -- Use SSL/TLS
  true                                  -- Active configuration
)
ON CONFLICT (id) DO UPDATE SET
  smtp_host = EXCLUDED.smtp_host,
  smtp_port = EXCLUDED.smtp_port,
  smtp_user = EXCLUDED.smtp_user,
  smtp_password = EXCLUDED.smtp_password,
  from_email = EXCLUDED.from_email,
  from_name = EXCLUDED.from_name,
  use_ssl = EXCLUDED.use_ssl,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- IMPORTANT NOTES:
-- 1. For Gmail, you need to create an App Password:
--    - Go to https://myaccount.google.com/apppasswords
--    - Generate a new app password for "Mail"
--    - Use that password in smtp_password field
--
-- 2. For security, consider storing SMTP credentials in Supabase secrets/vault
--    instead of directly in the database
--
-- 3. Alternatively, you can configure these values through the Email Setup UI
--    in the admin panel at /app/admin
