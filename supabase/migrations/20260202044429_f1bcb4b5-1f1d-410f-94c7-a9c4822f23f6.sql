
-- Fix: Add triggers to mark recommendation cache stale when user interactions change
-- This ensures recommendations refresh after user rates, wishlists, or dismisses titles

-- First, update the legacy mark_user_reco_stale function to target v13
CREATE OR REPLACE FUNCTION public.mark_user_reco_stale(p_user_id uuid, p_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Update cache state table if exists
  UPDATE public.user_reco_cache_state_v13
  SET is_stale = true,
      last_input_change_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Create trigger function for user_title_interactions
CREATE OR REPLACE FUNCTION public.tg_user_interaction_mark_reco_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id from the affected row
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  IF v_user_id IS NOT NULL THEN
    -- Mark their recommendations as stale
    UPDATE public.user_recommendation_candidates_v13
    SET is_stale = true
    WHERE user_id = v_user_id
      AND COALESCE(is_stale, false) = false;
      
    -- Update cache state
    UPDATE public.user_reco_cache_state_v13
    SET is_stale = true,
        last_input_change_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger function for user_mood_settings/user_emotion_states
CREATE OR REPLACE FUNCTION public.tg_user_mood_mark_reco_stale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  IF v_user_id IS NOT NULL THEN
    UPDATE public.user_recommendation_candidates_v13
    SET is_stale = true
    WHERE user_id = v_user_id
      AND COALESCE(is_stale, false) = false;
      
    UPDATE public.user_reco_cache_state_v13
    SET is_stale = true,
        last_input_change_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on user_title_interactions
DROP TRIGGER IF EXISTS trg_user_interaction_stale ON public.user_title_interactions;
CREATE TRIGGER trg_user_interaction_stale
  AFTER INSERT OR UPDATE OR DELETE ON public.user_title_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_interaction_mark_reco_stale();

-- Create triggers on user_emotion_states (mood changes)
DROP TRIGGER IF EXISTS trg_user_emotion_stale ON public.user_emotion_states;
CREATE TRIGGER trg_user_emotion_stale
  AFTER INSERT OR UPDATE ON public.user_emotion_states
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_mood_mark_reco_stale();

-- Create trigger on user_streaming_subscriptions (platform changes)
DROP TRIGGER IF EXISTS trg_user_streaming_stale ON public.user_streaming_subscriptions;
CREATE TRIGGER trg_user_streaming_stale
  AFTER INSERT OR UPDATE OR DELETE ON public.user_streaming_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_interaction_mark_reco_stale();

-- Create trigger on user_genre_preferences (taste changes)
DROP TRIGGER IF EXISTS trg_user_genre_stale ON public.user_genre_preferences;
CREATE TRIGGER trg_user_genre_stale
  AFTER INSERT OR UPDATE OR DELETE ON public.user_genre_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_interaction_mark_reco_stale();

-- Create trigger on user_language_preferences (language changes)
DROP TRIGGER IF EXISTS trg_user_language_stale ON public.user_language_preferences;
CREATE TRIGGER trg_user_language_stale
  AFTER INSERT OR UPDATE OR DELETE ON public.user_language_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_user_interaction_mark_reco_stale();
