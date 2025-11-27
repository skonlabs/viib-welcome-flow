-- Add last_onboarding_step column to users table to track onboarding progress
ALTER TABLE public.users 
ADD COLUMN last_onboarding_step text DEFAULT '/app/onboarding/welcome';