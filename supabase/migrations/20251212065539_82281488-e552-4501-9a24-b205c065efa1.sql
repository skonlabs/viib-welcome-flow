-- Update job_type check constraint to include promote_emotions
ALTER TABLE jobs DROP CONSTRAINT jobs_job_type_check;

ALTER TABLE jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type = ANY (ARRAY['full_refresh'::text, 'sync_delta'::text, 'enrich_trailers'::text, 'transcribe_trailers'::text, 'classify_emotions'::text, 'promote_emotions'::text]));

-- Add Promote Title Emotions job
INSERT INTO jobs (job_name, job_type, status, is_active, configuration)
VALUES ('Promote Title Emotions', 'promote_emotions', 'idle', true, '{"batch_size": 50}');