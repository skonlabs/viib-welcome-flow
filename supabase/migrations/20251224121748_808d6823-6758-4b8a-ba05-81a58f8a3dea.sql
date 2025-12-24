-- Simplified batch function that doesn't use jobs table for cursor
-- Instead processes titles in order and tracks position internally
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores_batch(
  p_batch_size integer DEFAULT 5000
)
RETURNS TABLE(processed_count integer, has_more boolean)
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  v_processed integer := 0;
  v_has_more boolean := false;
  v_last_id uuid;
BEGIN
  -- Process a batch of titles and compute intent alignment scores
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

  -- Check if there are more titles beyond this batch
  SELECT EXISTS(
    SELECT 1 FROM titles t
    WHERE t.id > (SELECT MAX(bt.title_id) FROM (SELECT id as title_id FROM titles ORDER BY id LIMIT p_batch_size) bt)
    LIMIT 1
  ) INTO v_has_more;

  RETURN QUERY SELECT v_processed, v_has_more;
END;
$$;

-- Main function now processes ALL titles incrementally by using OFFSET
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '600s'
AS $$
DECLARE
  v_batch_size integer := 5000;
  v_offset integer := 0;
  v_processed integer;
  v_total_processed integer := 0;
  v_max_iterations integer := 25;
  v_iteration integer := 0;
BEGIN
  LOOP
    v_iteration := v_iteration + 1;
    
    -- Process batch with offset
    WITH batch_titles AS (
      SELECT t.id as title_id
      FROM titles t
      ORDER BY t.id
      LIMIT v_batch_size OFFSET v_offset
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
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_processed FROM upserted;
    
    v_total_processed := v_total_processed + v_processed;
    v_offset := v_offset + v_batch_size;
    
    -- Exit if no more rows processed or max iterations
    EXIT WHEN v_processed = 0;
    EXIT WHEN v_iteration >= v_max_iterations;
  END LOOP;
  
  RAISE NOTICE 'Refreshed % intent alignment scores in % iterations', v_total_processed, v_iteration;
END;
$$;