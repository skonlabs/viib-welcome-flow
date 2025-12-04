-- Insert the Full Refresh job
INSERT INTO public.jobs (job_name, job_type, status, is_active, configuration)
VALUES (
  'Full Refresh',
  'full_refresh',
  'idle',
  true,
  '{"min_rating": 6, "start_year": 2020, "end_year": 2025}'::jsonb
);