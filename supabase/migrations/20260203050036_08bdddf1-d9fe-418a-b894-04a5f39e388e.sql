
-- ============================================================================
-- Clean up remaining v12 references in functions
-- The mark_user_reco_cache_stale function still has v12 back-compat code
-- ============================================================================

-- Update mark_user_reco_cache_stale to remove v12 references
CREATE OR REPLACE FUNCTION public.mark_user_reco_cache_stale(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Mark v13 cache stale
  UPDATE public.user_recommendation_candidates_v13
     SET is_stale = true
   WHERE user_id = p_user_id
     AND COALESCE(is_stale,false) = false;

  -- Update cache state table if exists
  UPDATE public.user_reco_cache_state_v13
  SET is_stale = true,
      last_input_change_at = now()
  WHERE user_id = p_user_id;

  -- Optional: enqueue refresh if queue function exists
  BEGIN
    PERFORM public.mark_reco_stale_and_enqueue(p_user_id, COALESCE(p_reason,'reco inputs changed'));
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_user_reco_cache_stale(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_user_reco_cache_stale(uuid, text) TO service_role;
