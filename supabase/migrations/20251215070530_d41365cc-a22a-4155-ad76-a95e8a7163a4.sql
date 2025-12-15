-- Add unique constraint for upsert on viib_intent_classified_titles_staging
ALTER TABLE public.viib_intent_classified_titles_staging 
ADD CONSTRAINT viib_intent_staging_title_intent_unique 
UNIQUE (title_id, intent_type);

-- Update the job_type check constraint to include new intent job types
ALTER TABLE public.jobs DROP CONSTRAINT jobs_job_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type = ANY (ARRAY['full_refresh'::text, 'sync_delta'::text, 'enrich_trailers'::text, 'transcribe_trailers'::text, 'classify_emotions'::text, 'promote_emotions'::text, 'classify_intents'::text, 'promote_intents'::text]));

-- Insert job rows for the new intent classification jobs
INSERT INTO public.jobs (job_name, job_type, status, is_active, configuration)
VALUES 
  ('Classify Title Intents', 'classify_intents', 'idle', true, '{"batch_size": 10}'::jsonb),
  ('Promote Title Intents', 'promote_intents', 'idle', true, '{"batch_size": 50}'::jsonb)
ON CONFLICT DO NOTHING;