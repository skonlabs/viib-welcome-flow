-- Fix increment_job_titles to not override job status when updating counters
CREATE OR REPLACE FUNCTION public.increment_job_titles(p_job_type text, p_increment integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only increment counters and update last_run_at
  -- DO NOT change status - it might have been stopped by admin
  UPDATE jobs
  SET 
    total_titles_processed = COALESCE(total_titles_processed, 0) + p_increment,
    last_run_at = NOW()
  WHERE job_type = p_job_type;
END;
$function$;