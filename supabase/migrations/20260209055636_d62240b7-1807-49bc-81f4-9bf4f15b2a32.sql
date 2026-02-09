-- Create a function to sync public.jobs execution data from cron.job_run_details
-- This bridges the gap between pg_cron automation and the Jobs UI

CREATE OR REPLACE FUNCTION public.sync_jobs_with_cron_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_mapping record;
  v_last_run timestamptz;
  v_last_status text;
  v_next_run timestamptz;
  v_schedule text;
begin
  -- Define mapping between public.jobs.job_type and cron.job.jobid
  for v_mapping in
    select j.id as job_id, j.job_type, j.status as job_status, cj.jobid as cron_jobid, cj.schedule, cj.active as cron_active
    from public.jobs j
    inner join cron.job cj on (
      (j.job_type = 'sync_delta' and cj.jobname = 'viib-sync-titles-delta') or
      (j.job_type = 'enrich_details' and cj.jobname = 'viib-enrich-title-details-batch') or
      (j.job_type = 'enrich_trailers' and cj.jobname = 'viib-enrich-title-trailers') or
      (j.job_type = 'transcribe_trailers' and cj.jobname = 'viib-transcribe-trailers') or
      (j.job_type = 'fix_streaming' and cj.jobname = 'viib-fix-streaming-availability') or
      (j.job_type = 'classify_ai' and cj.jobname = 'viib-classify-title-ai') or
      (j.job_type = 'promote_ai' and cj.jobname = 'viib-promote-title-ai')
    )
  loop
    -- Get the latest run details for this cron job
    select jrd.start_time, jrd.status
    into v_last_run, v_last_status
    from cron.job_run_details jrd
    where jrd.jobid = v_mapping.cron_jobid
    order by jrd.start_time desc
    limit 1;

    -- Calculate next run from cron schedule using pg_cron's built-in parsing
    -- We'll approximate based on the schedule pattern
    v_next_run := null;
    if v_mapping.cron_active then
      -- Use a simple approach: parse common patterns
      v_schedule := v_mapping.schedule;
      
      -- For schedules like "*/15 * * * *" (every 15 min)
      if v_schedule ~ '^\*/[0-9]+ \* \* \* \*$' then
        declare
          v_interval_min int;
        begin
          v_interval_min := substring(v_schedule from '^\*/([0-9]+)')::int;
          v_next_run := date_trunc('minute', now()) + (v_interval_min || ' minutes')::interval;
        end;
      -- "*/30 * * * *" (every 30 min)  
      elsif v_schedule ~ '^\*/[0-9]+ \* \* \* \*$' then
        null; -- already handled above
      -- "0 * * * *" or "N * * * *" (every hour at minute N)
      elsif v_schedule ~ '^[0-9]+ \* \* \* \*$' then
        declare
          v_min int;
        begin
          v_min := split_part(v_schedule, ' ', 1)::int;
          v_next_run := date_trunc('hour', now()) + (v_min || ' minutes')::interval;
          if v_next_run <= now() then
            v_next_run := v_next_run + interval '1 hour';
          end if;
        end;
      -- "N */M * * *" (every M hours at minute N)
      elsif v_schedule ~ '^[0-9]+ \*/[0-9]+ \* \* \*$' then
        declare
          v_min int;
          v_hour_interval int;
        begin
          v_min := split_part(v_schedule, ' ', 1)::int;
          v_hour_interval := substring(split_part(v_schedule, ' ', 2) from '\*/([0-9]+)')::int;
          -- Find next occurrence
          v_next_run := date_trunc('hour', now()) + (v_min || ' minutes')::interval;
          while v_next_run <= now() or (extract(hour from v_next_run)::int % v_hour_interval != 0) loop
            v_next_run := v_next_run + interval '1 hour';
          end loop;
        end;
      -- "0 */6 * * *" type patterns already covered above
      else
        -- For complex schedules, just show "Scheduled" (null next_run)
        v_next_run := null;
      end if;
    end if;

    -- Update the public.jobs row only if not currently manually running
    if v_mapping.job_status != 'running' then
      update public.jobs
      set 
        last_run_at = coalesce(v_last_run, last_run_at),
        next_run_at = v_next_run,
        status = case 
          when v_last_status = 'failed' and v_last_run > coalesce(last_run_at, '1970-01-01'::timestamptz) then 'failed'
          when v_last_status = 'succeeded' and v_last_run > coalesce(last_run_at, '1970-01-01'::timestamptz) then 'idle'
          else status
        end,
        error_message = case
          when v_last_status = 'failed' and v_last_run > coalesce(last_run_at, '1970-01-01'::timestamptz) then 'Cron execution failed'
          when v_last_status = 'succeeded' and v_last_run > coalesce(last_run_at, '1970-01-01'::timestamptz) then null
          else error_message
        end,
        updated_at = now()
      where id = v_mapping.job_id;
    end if;
  end loop;
end;
$$;

-- Create a cron job to sync every 5 minutes
SELECT cron.schedule(
  'viib-sync-jobs-cron-status',
  '*/5 * * * *',
  $$SELECT public.sync_jobs_with_cron_status();$$
);

-- Run it once now to populate immediately
SELECT public.sync_jobs_with_cron_status();