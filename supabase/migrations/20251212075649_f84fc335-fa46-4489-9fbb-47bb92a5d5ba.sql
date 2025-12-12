-- Update all existing staging rows to today's date
UPDATE public.title_emotional_signatures_staging SET created_at = now();