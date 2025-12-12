-- Create async wrapper functions that use pg_net to invoke themselves asynchronously
-- This allows the UI to return immediately while the heavy work runs in background

-- First, increase the statement_timeout for run_cron_job_now to 300s
CREATE OR REPLACE FUNCTION public.run_cron_job_now(p_command text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout = '300s'
AS $function$
BEGIN
  EXECUTE p_command;
END;
$function$;