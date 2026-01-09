-- Fix mark_user_reco_cache_stale to use v12 table
CREATE OR REPLACE FUNCTION public.mark_user_reco_cache_stale(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_reco_cache_state(user_id, is_stale, stale_reason, stale_at, updated_at)
  VALUES (p_user_id, true, p_reason, now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET is_stale = true,
      stale_reason = COALESCE(EXCLUDED.stale_reason, public.user_reco_cache_state.stale_reason),
      stale_at = now(),
      updated_at = now();

  UPDATE public.user_recommendation_candidates_v12
  SET is_stale = true
  WHERE user_id = p_user_id;
END;
$$;

-- Fix mark_user_reco_stale to use v12 table
CREATE OR REPLACE FUNCTION public.mark_user_reco_stale(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_reco_cache_state
    (user_id, is_stale, stale_reason, stale_at, updated_at)
  VALUES
    (p_user_id, true, p_reason, now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    is_stale = true,
    stale_reason = COALESCE(EXCLUDED.stale_reason, user_reco_cache_state.stale_reason),
    stale_at = now(),
    updated_at = now();

  UPDATE public.user_recommendation_candidates_v12
  SET is_stale = true
  WHERE user_id = p_user_id;
END;
$$;