-- Optimize refresh_title_user_emotion_match_cache to batch process
-- The cross join creates 111K * 37 = 4.1M rows which times out
-- Instead, we'll process in chunks by emotion_id

CREATE OR REPLACE FUNCTION public.refresh_title_user_emotion_match_cache()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '600s'
AS $function$
DECLARE
  v_emotion RECORD;
  v_batch_size INT := 5000;
  v_offset INT;
  v_total_vectors INT;
BEGIN
  -- Get total count of emotion vectors
  SELECT COUNT(*) INTO v_total_vectors FROM public.title_emotion_vectors;
  
  -- Process each emotion one at a time to avoid massive cross join
  FOR v_emotion IN SELECT id, valence, arousal, dominance FROM public.emotion_master
  LOOP
    -- Process in batches of 5000 titles per emotion
    v_offset := 0;
    LOOP
      INSERT INTO public.title_user_emotion_match_cache (
        title_id,
        user_emotion_id,
        cosine_score,
        transformation_score,
        updated_at
      )
      SELECT
        tev.title_id,
        v_emotion.id AS user_emotion_id,
        COALESCE(
          (
            (
              (v_emotion.valence * tev.valence) +
              (v_emotion.arousal * tev.arousal) +
              (v_emotion.dominance * tev.dominance)
            )
            /
            NULLIF(
              sqrt(v_emotion.valence^2 + v_emotion.arousal^2 + v_emotion.dominance^2) *
              sqrt(tev.valence^2 + tev.arousal^2 + tev.dominance^2),
              0
            )
            + 1.0
          ) / 2.0,
          0.5
        )::real AS cosine_score,
        tts.transformation_score::real AS transformation_score,
        now() AS updated_at
      FROM (
        SELECT title_id, valence, arousal, dominance
        FROM public.title_emotion_vectors
        ORDER BY title_id
        LIMIT v_batch_size OFFSET v_offset
      ) tev
      LEFT JOIN public.title_transformation_scores tts
        ON tts.title_id = tev.title_id
       AND tts.user_emotion_id = v_emotion.id
      ON CONFLICT (title_id, user_emotion_id)
      DO UPDATE SET
        cosine_score = EXCLUDED.cosine_score,
        transformation_score = EXCLUDED.transformation_score,
        updated_at = now();
      
      -- Check if we processed any rows
      IF NOT FOUND OR v_offset + v_batch_size >= v_total_vectors THEN
        EXIT;
      END IF;
      
      v_offset := v_offset + v_batch_size;
    END LOOP;
  END LOOP;
END;
$function$;