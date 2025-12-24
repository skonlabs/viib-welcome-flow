-- Create a batched version that processes titles incrementally
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores_batch(
    p_batch_size integer DEFAULT 5000
)
RETURNS TABLE(processed_count integer, has_more boolean)
LANGUAGE plpgsql
SET statement_timeout TO '60s'
AS $function$
DECLARE
    v_processed integer := 0;
    v_total_to_process integer;
BEGIN
    -- Count titles that need processing (not updated in last hour or never processed)
    SELECT COUNT(DISTINCT vect.title_id)
    INTO v_total_to_process
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em_content
        ON em_content.id = vect.emotion_id
       AND em_content.category = 'content_state'
    WHERE NOT EXISTS (
        SELECT 1 FROM title_transformation_scores tts
        WHERE tts.title_id = vect.title_id
          AND tts.updated_at > now() - interval '1 hour'
    );

    -- Process a batch of titles
    WITH batch_titles AS (
        SELECT DISTINCT vect.title_id
        FROM viib_emotion_classified_titles vect
        JOIN emotion_master em_content
            ON em_content.id = vect.emotion_id
           AND em_content.category = 'content_state'
        WHERE NOT EXISTS (
            SELECT 1 FROM title_transformation_scores tts
            WHERE tts.title_id = vect.title_id
              AND tts.updated_at > now() - interval '1 hour'
        )
        ORDER BY vect.title_id
        LIMIT p_batch_size
    ),
    inserted AS (
        INSERT INTO public.title_transformation_scores (
            title_id,
            user_emotion_id,
            transformation_score,
            updated_at
        )
        SELECT
            vect.title_id,
            etm.user_emotion_id,
            MAX(
                etm.confidence_score *
                CASE etm.transformation_type
                    WHEN 'amplify' THEN 1.0
                    WHEN 'complementary' THEN 0.95
                    WHEN 'soothe' THEN 0.9
                    WHEN 'validate' THEN 0.85
                    WHEN 'reinforcing' THEN 0.8
                    WHEN 'neutral_balancing' THEN 0.7
                    WHEN 'stabilize' THEN 0.65
                    ELSE 0.5
                END *
                (vect.intensity_level / 10.0)
            )::real AS transformation_score,
            now() AS updated_at
        FROM viib_emotion_classified_titles vect
        JOIN emotion_master em_content
            ON em_content.id = vect.emotion_id
           AND em_content.category = 'content_state'
        JOIN emotion_transformation_map etm
            ON etm.content_emotion_id = vect.emotion_id
        WHERE vect.title_id IN (SELECT title_id FROM batch_titles)
        GROUP BY vect.title_id, etm.user_emotion_id
        ON CONFLICT (title_id, user_emotion_id)
        DO UPDATE SET
            transformation_score = EXCLUDED.transformation_score,
            updated_at = now()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_processed FROM inserted;

    processed_count := v_processed;
    has_more := v_total_to_process > p_batch_size;
    
    RETURN NEXT;
END;
$function$;

-- Update the original function to use batching internally with a loop limit
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
AS $function$
DECLARE
    v_batch_result RECORD;
    v_total_processed integer := 0;
    v_max_iterations integer := 25;  -- Safety limit: 25 batches * 5000 = 125K max
    v_iteration integer := 0;
BEGIN
    LOOP
        v_iteration := v_iteration + 1;
        
        -- Process one batch
        SELECT * INTO v_batch_result 
        FROM refresh_title_transformation_scores_batch(5000);
        
        v_total_processed := v_total_processed + v_batch_result.processed_count;
        
        -- Exit conditions
        EXIT WHEN NOT v_batch_result.has_more;
        EXIT WHEN v_iteration >= v_max_iterations;
        EXIT WHEN v_batch_result.processed_count = 0;
    END LOOP;
    
    RAISE NOTICE 'Processed % transformation score records in % iterations', 
        v_total_processed, v_iteration;
END;
$function$;