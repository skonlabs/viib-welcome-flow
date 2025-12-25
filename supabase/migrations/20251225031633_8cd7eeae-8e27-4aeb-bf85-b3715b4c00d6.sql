-- Drop and recreate the job_type check constraint to include fix_streaming
ALTER TABLE public.jobs DROP CONSTRAINT jobs_job_type_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type = ANY (ARRAY[
  'classify_ai'::text, 
  'full_refresh'::text, 
  'sync_delta'::text, 
  'transcribe_trailers'::text, 
  'promote_ai'::text, 
  'enrich_trailers'::text, 
  'enrich_details'::text,
  'fix_streaming'::text
]));

-- Insert the new job for fixing streaming availability data
INSERT INTO public.jobs (
  job_name,
  job_type,
  status,
  is_active,
  configuration,
  total_titles_processed
) VALUES (
  'Fix Streaming Availability',
  'fix_streaming',
  'idle',
  true,
  '{"batch_size": 100}'::jsonb,
  0
);