-- First, drop the existing check constraint on job_type
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;

-- Add new check constraint including classify_emotions
ALTER TABLE jobs ADD CONSTRAINT jobs_job_type_check 
CHECK (job_type IN ('full_refresh', 'sync_delta', 'enrich_trailers', 'transcribe_trailers', 'classify_emotions'));

-- Add classify_emotions job
INSERT INTO jobs (job_name, job_type, status, is_active, configuration)
VALUES (
  'Classify Title Emotions',
  'classify_emotions',
  'idle',
  true,
  '{"batch_size": 10}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Add unique constraint to title_emotional_signatures if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'title_emotional_signatures_title_id_emotion_id_key'
  ) THEN
    ALTER TABLE title_emotional_signatures 
    ADD CONSTRAINT title_emotional_signatures_title_id_emotion_id_key 
    UNIQUE (title_id, emotion_id);
  END IF;
END $$;