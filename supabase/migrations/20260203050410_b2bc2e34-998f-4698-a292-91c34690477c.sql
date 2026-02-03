
-- ============================================================================
-- Fix mark_reco_stale_and_enqueue to use v13 instead of v12
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_reco_stale_and_enqueue(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Mark v13 candidates as stale
  UPDATE public.user_recommendation_candidates_v13
     SET is_stale = true
   WHERE user_id = p_user_id
     AND COALESCE(is_stale, false) = false;

  -- Update cache state table
  UPDATE public.user_reco_cache_state_v13
  SET is_stale = true,
      last_input_change_at = now()
  WHERE user_id = p_user_id;

  -- Enqueue refresh request
  INSERT INTO public.user_reco_refresh_queue(user_id, requested_at, reason)
  VALUES (p_user_id, now(), p_reason)
  ON CONFLICT (user_id)
  DO UPDATE
    SET requested_at = EXCLUDED.requested_at,
        reason       = EXCLUDED.reason;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_reco_stale_and_enqueue(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_reco_stale_and_enqueue(uuid, text) TO service_role;
