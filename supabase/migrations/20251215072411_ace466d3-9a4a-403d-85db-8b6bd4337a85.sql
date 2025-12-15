-- Add promote_ai job type to the constraint and insert job record
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check CHECK (job_type IN (
  'full_refresh', 
  'sync_delta', 
  'enrich_trailers', 
  'transcribe_trailers', 
  'classify_emotions', 
  'classify_intents', 
  'promote_emotions', 
  'promote_intents',
  'classify_ai',
  'promote_ai'
));

-- Insert the new promote_ai job
INSERT INTO public.jobs (job_name, job_type, status, is_active, configuration)
VALUES (
  'Promote AI Classifications',
  'promote_ai',
  'idle',
  true,
  '{"batch_size": 50}'::jsonb
)
ON CONFLICT DO NOTHING;