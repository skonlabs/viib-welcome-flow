-- ============================================================================
-- Fix user_reco_refresh_queue table schema and function
-- The function references columns that don't exist: locked_at, attempts, last_error
-- ============================================================================

-- Add missing columns to user_reco_refresh_queue
ALTER TABLE public.user_reco_refresh_queue 
ADD COLUMN IF NOT EXISTS locked_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error text DEFAULT NULL;

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_user_reco_refresh_queue_locked 
ON public.user_reco_refresh_queue(locked_at) 
WHERE locked_at IS NULL;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.process_user_reco_refresh_queue(p_limit integer DEFAULT 5)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT user_id
    FROM public.user_reco_refresh_queue
    WHERE locked_at IS NULL
    ORDER BY requested_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Lock the row
    UPDATE public.user_reco_refresh_queue
      SET locked_at = now(),
          attempts = COALESCE(attempts, 0) + 1,
          last_error = NULL
    WHERE user_id = r.user_id;

    BEGIN
      -- Refresh recommendations for this user
      PERFORM public.refresh_user_recommendation_candidates_v13(r.user_id, 300);
      
      -- Success - remove from queue
      DELETE FROM public.user_reco_refresh_queue WHERE user_id = r.user_id;
    EXCEPTION WHEN OTHERS THEN
      -- Failure - record error and unlock
      UPDATE public.user_reco_refresh_queue
        SET last_error = SQLERRM,
            locked_at = NULL
      WHERE user_id = r.user_id;
    END;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_user_reco_refresh_queue(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_user_reco_refresh_queue(integer) TO service_role;