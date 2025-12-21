
-- Mark classify_ai job as complete (idle)
UPDATE jobs 
SET status = 'idle', 
    error_message = null, 
    configuration = '{}'
WHERE job_type = 'classify_ai';
