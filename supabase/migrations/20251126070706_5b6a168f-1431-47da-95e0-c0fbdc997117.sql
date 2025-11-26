-- Add password_hash column to users table
ALTER TABLE public.users
ADD COLUMN password_hash TEXT;