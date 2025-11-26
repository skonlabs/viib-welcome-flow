-- Add verification status columns to users table
ALTER TABLE public.users
ADD COLUMN is_phone_verified boolean NOT NULL DEFAULT false,
ADD COLUMN is_email_verified boolean NOT NULL DEFAULT false;