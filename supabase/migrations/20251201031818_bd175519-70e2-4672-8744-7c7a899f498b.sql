-- Create atomic increment function for job progress tracking
CREATE OR REPLACE FUNCTION public.increment_job_titles(
  p_job_type TEXT,
  p_increment INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jobs
  SET 
    total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment,
    last_run_at = NOW(),
    status = 'running'
  WHERE job_type = p_job_type;
END;
$$;

COMMENT ON FUNCTION public.increment_job_titles IS 'Atomically increment job title counter to prevent race conditions in parallel processing';