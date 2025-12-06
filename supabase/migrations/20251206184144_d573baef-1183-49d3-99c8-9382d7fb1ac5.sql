-- Drop and recreate the job_type check constraint to include transcribe_trailers
ALTER TABLE jobs DROP CONSTRAINT jobs_job_type_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_job_type_check CHECK (job_type = ANY (ARRAY['full_refresh'::text, 'sync_delta'::text, 'enrich_trailers'::text, 'transcribe_trailers'::text]));

-- Insert the Nightly Transcribe Videos job
INSERT INTO jobs (
  job_name,
  job_type,
  status,
  is_active,
  total_titles_processed,
  configuration
) VALUES (
  'Nightly Transcribe Videos',
  'transcribe_trailers',
  'idle',
  true,
  0,
  '{"batch_size": 10}'::jsonb
);