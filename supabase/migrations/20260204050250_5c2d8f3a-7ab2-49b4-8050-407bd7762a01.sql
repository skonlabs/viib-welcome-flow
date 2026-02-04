-- Drop existing function first, then recreate with new signature
DROP FUNCTION IF EXISTS public.get_cron_jobs();

-- Recreate get_cron_jobs function to include execution history from cron.job_run_details
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  database text,
  active boolean,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  RETURN QUERY
  WITH job_runs AS (
    SELECT 
      jrd.jobid,
      jrd.start_time,
      jrd.status,
      ROW_NUMBER() OVER (PARTITION BY jrd.jobid ORDER BY jrd.start_time DESC) as rn
    FROM cron.job_run_details jrd
  ),
  latest_runs AS (
    SELECT 
      jr.jobid,
      jr.start_time as last_run_at,
      jr.status as last_status
    FROM job_runs jr
    WHERE jr.rn = 1
  )
  SELECT 
    j.jobid::bigint,
    j.jobname::text,
    j.schedule::text,
    j.command::text,
    j.database::text,
    j.active::boolean,
    lr.last_run_at::timestamptz,
    CASE 
      WHEN j.active THEN 
        -- Calculate next run based on schedule (simplified - just add based on pattern)
        COALESCE(lr.last_run_at, now()) + interval '1 hour'
      ELSE NULL
    END::timestamptz as next_run_at,
    lr.last_status::text
  FROM cron.job j
  LEFT JOIN latest_runs lr ON j.jobid = lr.jobid
  ORDER BY j.jobname;
END;
$$;