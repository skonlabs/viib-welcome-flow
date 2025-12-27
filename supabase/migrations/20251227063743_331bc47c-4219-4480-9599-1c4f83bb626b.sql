-- ============================================================================
-- FIX REMAINING FUNCTION SEARCH PATHS (correct signatures)
-- ============================================================================

ALTER FUNCTION public.cascade_refresh_emotion_scores() SET search_path = public;
ALTER FUNCTION public.get_lockout_remaining(text, integer) SET search_path = public;
ALTER FUNCTION public.hash_otp(text, text) SET search_path = public;
ALTER FUNCTION public.is_session_valid(text) SET search_path = public;
ALTER FUNCTION public.record_login_attempt(text, text, text, boolean) SET search_path = public;
ALTER FUNCTION public.revoke_all_user_sessions(uuid) SET search_path = public;
ALTER FUNCTION public.verify_otp_secure(text, text, integer) SET search_path = public;

NOTIFY pgrst, 'reload schema';