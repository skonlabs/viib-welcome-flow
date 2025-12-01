-- First, alter the jobs table check constraint to include enrich_trailers
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

ALTER TABLE jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN ('full_refresh', 'sync_delta', 'enrich_trailers'));

-- Now insert trailer enrichment job
INSERT INTO jobs (job_name, job_type, status, is_active, configuration, total_titles_processed)
VALUES (
  'Trailer Enrichment',
  'enrich_trailers',
  'idle',
  true,
  '{"batch_size": 50, "start_offset": 0}'::jsonb,
  0
)
ON CONFLICT DO NOTHING;