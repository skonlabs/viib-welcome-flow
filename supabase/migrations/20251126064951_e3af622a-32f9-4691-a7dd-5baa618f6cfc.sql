-- Add unique constraints for email and phone_number to prevent duplicates
ALTER TABLE public.users
ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE public.users
ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);