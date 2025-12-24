-- Create a batched version of refresh_title_intent_alignment_scores
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
  v_cursor text;
  v_has_more boolean := false;
BEGIN
  -- Get the cursor from jobs table
  SELECT (configuration->>'cursor')::text INTO v_cursor
  FROM jobs
  WHERE job_type = 'refresh_title_intent_alignment_scores'
  LIMIT 1;

  -- Process a batch of titles
  WITH batch_titles AS (
    SELECT t.id as title_id
    FROM titles t
    WHERE (v_cursor IS NULL OR t.id > v_cursor::uuid)
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
    RETURNING 1
  )
  SELECT COUNT(DISTINCT bt.title_id) INTO v_processed
  FROM batch_titles bt;

  -- Check if there are more titles to process
  SELECT EXISTS(
    SELECT 1 FROM titles t
    WHERE t.id > COALESCE(
      (SELECT id FROM titles WHERE (v_cursor IS NULL OR id > v_cursor::uuid) ORDER BY id LIMIT 1 OFFSET p_batch_size - 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    )
    LIMIT 1
  ) INTO v_has_more;

  -- Save the cursor for the next batch
  IF v_processed > 0 THEN
    UPDATE jobs
    SET 
      configuration = jsonb_set(
        COALESCE(configuration, '{}'::jsonb),
        '{cursor}',
        to_jsonb((SELECT id::text FROM titles WHERE (v_cursor IS NULL OR id > v_cursor::uuid) ORDER BY id LIMIT 1 OFFSET p_batch_size - 1))
      ),
      updated_at = now()
    WHERE job_type = 'refresh_title_intent_alignment_scores';
    
    -- If no rows updated, insert
    IF NOT FOUND THEN
      INSERT INTO jobs (job_type, job_name, status, configuration)
      VALUES (
        'refresh_title_intent_alignment_scores',
        'Refresh Title Intent Alignment Scores',
        'running',
        jsonb_build_object('cursor', (SELECT id::text FROM titles WHERE (v_cursor IS NULL OR id > v_cursor::uuid) ORDER BY id LIMIT 1 OFFSET p_batch_size - 1))
      );
    END IF;
  END IF;

  -- If no more to process, clear the cursor
  IF NOT v_has_more THEN
    UPDATE jobs
    SET 
      configuration = configuration - 'cursor',
      status = 'idle',
      updated_at = now()
    WHERE job_type = 'refresh_title_intent_alignment_scores';
  END IF;

  RETURN QUERY SELECT v_processed, v_has_more;
END;
$$;

-- Update the main function to use batch processing with a loop
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result record;
  v_total_processed integer := 0;
  v_iteration integer := 0;
  v_max_iterations integer := 25; -- Safety limit
BEGIN
  -- Reset cursor before starting
  UPDATE jobs
  SET 
    configuration = configuration - 'cursor',
    status = 'running',
    updated_at = now()
  WHERE job_type = 'refresh_title_intent_alignment_scores';

  -- Process in batches until complete or max iterations reached
  LOOP
    v_iteration := v_iteration + 1;
    
    SELECT * INTO v_result FROM refresh_title_intent_alignment_scores_batch(5000);
    
    v_total_processed := v_total_processed + v_result.processed_count;
    
    -- Exit if no more to process or max iterations reached
    EXIT WHEN NOT v_result.has_more OR v_iteration >= v_max_iterations;
  END LOOP;

  -- Mark job as complete
  UPDATE jobs
  SET 
    status = 'idle',
    total_titles_processed = v_total_processed,
    last_run_at = now(),
    updated_at = now()
  WHERE job_type = 'refresh_title_intent_alignment_scores';
END;
$$;