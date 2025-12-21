-- Drop the existing check constraint and recreate with new job type
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Add the check constraint with the new enrich_details job type
ALTER TABLE jobs ADD CONSTRAINT jobs_job_type_check CHECK (
  job_type IN ('classify_ai', 'full_refresh', 'sync_delta', 'transcribe_trailers', 'promote_ai', 'enrich_trailers', 'enrich_details')
);

-- Insert the new job entry
INSERT INTO jobs (job_name, job_type, status, is_active, configuration) 
VALUES (
  'Enrich Title Details', 
  'enrich_details', 
  'idle', 
  true,
  '{"batch_size": 50, "max_runtime_ms": 55000}'::jsonb
);