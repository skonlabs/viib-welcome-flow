-- Add IP address column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS ip_country text;