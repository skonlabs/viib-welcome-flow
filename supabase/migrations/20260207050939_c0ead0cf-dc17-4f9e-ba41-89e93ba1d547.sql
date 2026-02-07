
-- Fix: refresh_title_intent_alignment_scores_batch - MAX(uuid) does not exist
-- Must drop first due to return type change
DROP FUNCTION IF EXISTS public.refresh_title_intent_alignment_scores_batch(integer);

CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores_batch(p_batch_size integer DEFAULT 2000)
RETURNS TABLE(processed integer, has_more boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed integer := 0;
  v_has_more boolean := false;
BEGIN
  WITH batch_titles AS (
    SELECT t.id as title_id
    FROM titles t
    ORDER BY t.id
    LIMIT p_batch_size
  ),
  title_emotions AS (
    SELECT 
      ect.title_id,
      ect.emotion_id,
      ect.intensity_level
    FROM viib_emotion_classified_titles ect
    WHERE ect.title_id IN (SELECT title_id FROM batch_titles)
  ),
  intent_mappings AS (
    SELECT 
      te.title_id,
      eim.emotion_id as user_emotion_id,
      SUM(eim.weight * te.intensity_level) as alignment_score
    FROM title_emotions te
    JOIN emotion_to_intent_map eim ON te.emotion_id = eim.emotion_id
    GROUP BY te.title_id, eim.emotion_id
  ),
  upserted AS (
    INSERT INTO title_intent_alignment_scores (title_id, user_emotion_id, alignment_score, updated_at)
    SELECT 
      im.title_id,
      im.user_emotion_id,
      COALESCE(im.alignment_score, 0),
      now()
    FROM intent_mappings im
    ON CONFLICT (title_id, user_emotion_id) 
    DO UPDATE SET 
      alignment_score = EXCLUDED.alignment_score,
      updated_at = now()
    RETURNING title_id
  )
  SELECT COUNT(DISTINCT title_id) INTO v_processed FROM upserted;

  -- FIX: Cast uuid to text for MAX() to work
  SELECT EXISTS(
    SELECT 1 FROM titles t
    WHERE t.id::text > (SELECT MAX(bt.title_id::text) FROM (SELECT id as title_id FROM titles ORDER BY id LIMIT p_batch_size) bt)
    LIMIT 1
  ) INTO v_has_more;

  RETURN QUERY SELECT v_processed, v_has_more;
END;
$$;
