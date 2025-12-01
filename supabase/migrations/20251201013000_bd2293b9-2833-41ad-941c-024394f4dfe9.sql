-- Create jobs table for tracking scheduled jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('full_refresh', 'sync_delta')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'failed', 'completed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_duration_seconds INTEGER,
  total_titles_processed INTEGER DEFAULT 0,
  error_message TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION update_jobs_updated_at();

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to manage jobs
CREATE POLICY "Admins can manage jobs"
ON public.jobs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT id FROM public.users WHERE id::text = current_setting('request.jwt.claim.sub', true))
    AND role = 'admin'
  )
);

-- Insert initial job configurations
INSERT INTO public.jobs (job_name, job_type, status, configuration, next_run_at) VALUES
(
  'Full Title Refresh',
  'full_refresh',
  'idle',
  '{"min_rating": 6.0, "titles_per_batch": 100, "start_year": 2020, "end_year": 2025}'::jsonb,
  NULL
),
(
  'Nightly Title Sync',
  'sync_delta',
  'idle',
  '{"min_rating": 6.0, "lookback_days": 7}'::jsonb,
  (now() + INTERVAL '1 day')::date + TIME '02:00:00'
);