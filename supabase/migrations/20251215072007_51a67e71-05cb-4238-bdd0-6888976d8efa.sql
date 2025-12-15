-- Add classify_ai job type to the check constraint
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check CHECK (job_type IN ('full_refresh', 'sync_delta', 'enrich_trailers', 'transcribe_trailers', 'classify_emotions', 'promote_emotions', 'classify_intents', 'promote_intents', 'classify_ai'));

-- Insert the new combined classify AI job
INSERT INTO public.jobs (job_name, job_type, status, is_active, configuration)
VALUES ('Classify Title AI', 'classify_ai', 'idle', true, '{"batch_size": 10}')
ON CONFLICT DO NOTHING;