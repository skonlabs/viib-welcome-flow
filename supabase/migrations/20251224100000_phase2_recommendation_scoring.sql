-- ============================================================================
-- PHASE 2: RECOMMENDATION SCORING IMPROVEMENTS
-- This migration fixes critical issues in the recommendation scoring system:
-- 1. Fixes viib_intent_alignment_score to use transformation scores
-- 2. Fixes viib_social_priority_score to consider emotion matching
-- 3. Fixes refresh_title_user_emotion_match_cache logic errors
-- 4. Improves explain_recommendation with transformation details
-- 5. Adds cascade refresh trigger for emotion classification updates
-- 6. Ensures consistent transformation weights across all functions
-- ============================================================================

-- ============================================================================
-- PART 1: FIX viib_intent_alignment_score
-- Now uses transformation scores from title_transformation_scores for better
-- emotion-aware intent alignment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.viib_intent_alignment_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_emotion_id UUID;
    v_score REAL;
    v_cached_score REAL;
BEGIN
    -- Get user's current emotion
    SELECT ues.emotion_id
    INTO v_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    IF v_emotion_id IS NULL THEN
        -- No emotion state, return neutral score
        RETURN 0.5;
    END IF;

    -- First try to get from pre-computed cache (title_intent_alignment_scores)
    SELECT tias.alignment_score
    INTO v_cached_score
    FROM title_intent_alignment_scores tias
    WHERE tias.title_id = p_title_id
      AND tias.emotion_id = v_emotion_id;

    IF v_cached_score IS NOT NULL THEN
        RETURN v_cached_score;
    END IF;

    -- Calculate score with transformation weighting
    -- Join emotion_to_intent_map with viib_intent_classified_titles
    -- Factor in transformation_score from title_transformation_scores
    SELECT COALESCE(
        SUM(
            e2i.weight *
            vit.confidence_score *
            COALESCE(tts.transformation_score, 0.5)
        ) / NULLIF(SUM(e2i.weight), 0),
        0.5
    )
    INTO v_score
    FROM emotion_to_intent_map e2i
    JOIN viib_intent_classified_titles vit
      ON vit.intent_type = e2i.intent_type
     AND vit.title_id = p_title_id
    LEFT JOIN title_transformation_scores tts
      ON tts.title_id = p_title_id
     AND tts.user_emotion_id = v_emotion_id
    WHERE e2i.emotion_id = v_emotion_id;

    -- Clamp to valid range
    v_score := GREATEST(LEAST(COALESCE(v_score, 0.5), 1.0), 0.0);

    RETURN v_score;
END;
$function$;


-- ============================================================================
-- PART 2: FIX viib_social_priority_score
-- Now considers emotion matching and transformation potential
-- Weights friend recommendations by emotional alignment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.viib_social_priority_score(p_user_id uuid, p_title_id uuid)
RETURNS real
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_user_emotion_id UUID;
    v_score REAL;
BEGIN
    -- Get user's current emotion
    SELECT ues.emotion_id
    INTO v_user_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Calculate weighted social score considering:
    -- 1. Trust score from friend connection
    -- 2. Taste similarity with friend
    -- 3. Emotional transformation potential (how well content transforms user's emotion)
    SELECT COALESCE(MAX(social_priority), 0.0)
    INTO v_score
    FROM (
        SELECT
            CASE
                -- High trust + high similarity + good transformation = highest priority
                WHEN fc.trust_score >= 0.8
                     AND calculate_taste_similarity(p_user_id, fc.friend_user_id) >= 0.7
                     AND COALESCE(tts.transformation_score, 0.5) >= 0.7
                THEN 1.0

                -- High trust + good similarity OR good transformation
                WHEN fc.trust_score >= 0.8
                     AND (calculate_taste_similarity(p_user_id, fc.friend_user_id) >= 0.6
                          OR COALESCE(tts.transformation_score, 0.5) >= 0.7)
                THEN 0.95

                -- Medium trust with good transformation
                WHEN fc.trust_score >= 0.5
                     AND COALESCE(tts.transformation_score, 0.5) >= 0.7
                THEN 0.9

                -- Medium trust OR similarity
                WHEN fc.trust_score >= 0.5
                     OR calculate_taste_similarity(p_user_id, fc.friend_user_id) >= 0.6
                THEN 0.85

                -- Has some transformation potential
                WHEN COALESCE(tts.transformation_score, 0.5) >= 0.6
                THEN 0.7

                -- Default for any friend recommendation
                ELSE 0.5
            END AS social_priority
        FROM user_social_recommendations usr
        JOIN friend_connections fc
          ON fc.friend_user_id = usr.sender_user_id
         AND fc.user_id = usr.receiver_user_id
        LEFT JOIN title_transformation_scores tts
          ON tts.title_id = p_title_id
         AND tts.user_emotion_id = v_user_emotion_id
        WHERE usr.receiver_user_id = p_user_id
          AND usr.title_id = p_title_id
    ) scored;

    RETURN COALESCE(v_score, 0.0);
END;
$function$;


-- ============================================================================
-- PART 3: FIX refresh_title_user_emotion_match_cache
-- Fixed loop logic to properly process all emotions and all titles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_title_user_emotion_match_cache()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '600s'
AS $function$
DECLARE
    v_emotion RECORD;
    v_batch_size INT := 5000;
    v_offset INT;
    v_rows_inserted INT;
BEGIN
    -- Process each user_state emotion one at a time to avoid massive cross join
    FOR v_emotion IN
        SELECT id, valence, arousal, dominance
        FROM public.emotion_master
        WHERE category = 'user_state'
    LOOP
        -- Process in batches of 5000 titles per emotion
        v_offset := 0;

        LOOP
            -- Insert batch of title-emotion match scores
            WITH batch_insert AS (
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
                    -- Calculate cosine similarity between user emotion and title emotion
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
                    COALESCE(tts.transformation_score, 0.5)::real AS transformation_score,
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
                    updated_at = now()
                RETURNING 1
            )
            SELECT COUNT(*) INTO v_rows_inserted FROM batch_insert;

            -- If no rows were inserted, we've processed all titles for this emotion
            IF v_rows_inserted = 0 THEN
                EXIT;
            END IF;

            -- Move to next batch
            v_offset := v_offset + v_batch_size;
        END LOOP;
    END LOOP;
END;
$function$;


-- ============================================================================
-- PART 4: FIX explain_recommendation
-- Add transformation type explanation for better user understanding
-- ============================================================================

CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id uuid, p_title_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    c_emotional REAL;
    c_social REAL;
    c_historical REAL;
    c_context REAL;
    c_novelty REAL;
    w_emotional REAL := 0.35;
    w_social REAL := 0.20;
    w_historical REAL := 0.25;
    w_context REAL := 0.10;
    w_novelty REAL := 0.10;
    v_base_score REAL;
    v_social_priority REAL;
    v_final_score REAL;
    v_intent_score REAL;
    v_user_emotion_id UUID;
    v_user_emotion_label TEXT;
    v_transformation_type TEXT;
    v_transformation_score REAL;
    v_content_emotion_label TEXT;
    reasons TEXT[] := ARRAY[]::TEXT[];
    payload JSONB;
BEGIN
    -- Get current weights from config
    SELECT emotional_weight, social_weight, historical_weight, context_weight, novelty_weight
    INTO w_emotional, w_social, w_historical, w_context, w_novelty
    FROM viib_weight_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get score components
    SELECT emotional_component, social_component, historical_component, context_component, novelty_component
    INTO c_emotional, c_social, c_historical, c_context, c_novelty
    FROM viib_score_components(p_user_id, p_title_id);

    -- Get user's current emotion
    SELECT ues.emotion_id, em.emotion_label
    INTO v_user_emotion_id, v_user_emotion_label
    FROM user_emotion_states ues
    JOIN emotion_master em ON em.id = ues.emotion_id
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Get best transformation for this title
    IF v_user_emotion_id IS NOT NULL THEN
        SELECT
            etm.transformation_type,
            tts.transformation_score,
            em_content.emotion_label
        INTO v_transformation_type, v_transformation_score, v_content_emotion_label
        FROM title_transformation_scores tts
        JOIN emotion_transformation_map etm
            ON etm.user_emotion_id = tts.user_emotion_id
        JOIN viib_emotion_classified_titles vect
            ON vect.title_id = tts.title_id
        JOIN emotion_master em_content
            ON em_content.id = vect.emotion_id
            AND em_content.id = etm.content_emotion_id
        WHERE tts.title_id = p_title_id
          AND tts.user_emotion_id = v_user_emotion_id
        ORDER BY tts.transformation_score DESC, etm.priority_rank ASC
        LIMIT 1;
    END IF;

    -- Calculate base score
    v_base_score := c_emotional * w_emotional +
                    c_social * w_social +
                    c_historical * w_historical +
                    c_context * w_context +
                    c_novelty * w_novelty;

    v_social_priority := viib_social_priority_score(p_user_id, p_title_id);
    v_intent_score := viib_intent_alignment_score(p_user_id, p_title_id);
    v_final_score := GREATEST(v_base_score, v_social_priority);

    -- Build explanation reasons
    IF v_social_priority > v_base_score AND v_social_priority >= 0.8 THEN
        reasons := reasons || 'A trusted friend with similar taste recommended this.';
    ELSIF v_social_priority > v_base_score THEN
        reasons := reasons || 'A friend recommendation increased the priority of this title.';
    END IF;

    -- Add transformation-based explanation
    IF v_transformation_type IS NOT NULL AND v_transformation_score >= 0.7 THEN
        CASE v_transformation_type
            WHEN 'soothe' THEN
                reasons := reasons || format('This content will help soothe your %s feelings.', v_user_emotion_label);
            WHEN 'validate' THEN
                reasons := reasons || format('This content validates and understands your %s state.', v_user_emotion_label);
            WHEN 'amplify' THEN
                reasons := reasons || format('This will amplify your positive %s energy.', v_user_emotion_label);
            WHEN 'complementary' THEN
                reasons := reasons || format('This offers a complementary experience to your %s mood.', v_user_emotion_label);
            WHEN 'reinforcing' THEN
                reasons := reasons || format('This reinforces and deepens your current %s feeling.', v_user_emotion_label);
            WHEN 'stabilize' THEN
                reasons := reasons || format('This content will help stabilize your emotional state.');
            WHEN 'neutral_balancing' THEN
                reasons := reasons || format('This provides a balanced, neutral emotional experience.');
            ELSE
                reasons := reasons || format('This content matches well with your %s mood.', v_user_emotion_label);
        END CASE;
    ELSIF c_emotional >= 0.7 THEN
        reasons := reasons || 'This title strongly matches your current mood.';
    ELSIF c_emotional >= 0.5 THEN
        reasons := reasons || 'This title aligns well with how you are feeling.';
    END IF;

    IF v_intent_score >= 0.7 THEN
        reasons := reasons || 'This matches your viewing intent perfectly.';
    END IF;

    IF c_historical >= 0.7 THEN
        reasons := reasons || 'You have previously enjoyed similar titles.';
    END IF;

    IF c_context >= 0.7 THEN
        reasons := reasons || 'This fits well into your typical viewing session length.';
    END IF;

    IF c_novelty >= 0.8 THEN
        reasons := reasons || 'This is a fresh discovery you have not watched before.';
    END IF;

    IF array_length(reasons, 1) IS NULL THEN
        reasons := ARRAY['Recommended based on your mood, history, context, and social signals combined.'];
    END IF;

    -- Build response payload
    payload := jsonb_build_object(
        'user_id', p_user_id,
        'title_id', p_title_id,
        'base_viib_score', v_base_score,
        'social_priority_score', v_social_priority,
        'intent_alignment_score', v_intent_score,
        'final_score', v_final_score,
        'user_emotion', jsonb_build_object(
            'emotion_id', v_user_emotion_id,
            'emotion_label', v_user_emotion_label
        ),
        'transformation', CASE WHEN v_transformation_type IS NOT NULL THEN
            jsonb_build_object(
                'type', v_transformation_type,
                'score', v_transformation_score,
                'target_emotion', v_content_emotion_label
            )
        ELSE NULL END,
        'components', jsonb_build_object(
            'emotional', jsonb_build_object('value', c_emotional, 'weight', w_emotional),
            'social', jsonb_build_object('value', c_social, 'weight', w_social),
            'historical', jsonb_build_object('value', c_historical, 'weight', w_historical),
            'context', jsonb_build_object('value', c_context, 'weight', w_context),
            'novelty', jsonb_build_object('value', c_novelty, 'weight', w_novelty)
        ),
        'reasons', to_jsonb(reasons)
    );

    RETURN payload;
END;
$function$;


-- ============================================================================
-- PART 5: FIX refresh_title_transformation_scores
-- Ensure consistent transformation type weights (matching Phase 1)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
AS $function$
BEGIN
    -- Insert or update transformation scores for all title-emotion combinations
    INSERT INTO public.title_transformation_scores (
        title_id,
        user_emotion_id,
        transformation_score,
        updated_at
    )
    SELECT
        vect.title_id,
        etm.user_emotion_id,
        -- Calculate weighted transformation score
        -- Use consistent weights from Phase 1
        (
            etm.confidence_score *
            CASE etm.transformation_type
                WHEN 'amplify' THEN 1.0           -- Best: amplifies positive emotions
                WHEN 'complementary' THEN 0.95    -- Great: provides complementary experience
                WHEN 'soothe' THEN 0.9            -- Great: soothes negative emotions
                WHEN 'validate' THEN 0.85         -- Good: validates current state
                WHEN 'reinforcing' THEN 0.8       -- Good: reinforces current feeling
                WHEN 'neutral_balancing' THEN 0.7 -- OK: provides balance
                WHEN 'stabilize' THEN 0.65        -- OK: stabilizes emotions
                ELSE 0.5                          -- Default for unknown types
            END *
            (vect.intensity_level / 10.0)         -- Weight by content intensity
        )::real AS transformation_score,
        now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em_content
        ON em_content.id = vect.emotion_id
       AND em_content.category = 'content_state'
    JOIN emotion_transformation_map etm
        ON etm.content_emotion_id = vect.emotion_id
    ON CONFLICT (title_id, user_emotion_id)
    DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = now();
END;
$function$;


-- ============================================================================
-- PART 6: FIX refresh_title_intent_alignment_scores
-- Pre-compute intent alignment scores for each emotion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
AS $function$
BEGIN
    -- Pre-compute intent alignment scores for all title-emotion combinations
    INSERT INTO public.title_intent_alignment_scores (
        title_id,
        emotion_id,
        alignment_score,
        updated_at
    )
    SELECT
        vit.title_id,
        e2i.emotion_id,
        (
            SUM(e2i.weight * vit.confidence_score * COALESCE(tts.transformation_score, 0.5))
            / NULLIF(SUM(e2i.weight), 0)
        )::real AS alignment_score,
        now() AS updated_at
    FROM viib_intent_classified_titles vit
    JOIN emotion_to_intent_map e2i
        ON e2i.intent_type = vit.intent_type
    LEFT JOIN title_transformation_scores tts
        ON tts.title_id = vit.title_id
       AND tts.user_emotion_id = e2i.emotion_id
    GROUP BY vit.title_id, e2i.emotion_id
    ON CONFLICT (title_id, emotion_id)
    DO UPDATE SET
        alignment_score = EXCLUDED.alignment_score,
        updated_at = now();
END;
$function$;


-- ============================================================================
-- PART 7: ADD CASCADE REFRESH TRIGGER
-- When emotion classifications are updated, refresh dependent scores
-- ============================================================================

-- Create a function to cascade refresh when emotion classifications change
CREATE OR REPLACE FUNCTION public.cascade_refresh_emotion_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Refresh title emotion vectors for the affected title
    INSERT INTO public.title_emotion_vectors (title_id, valence, arousal, dominance, updated_at)
    SELECT
        COALESCE(NEW.title_id, OLD.title_id) AS title_id,
        COALESCE(AVG(em.valence * (vect.intensity_level / 10.0)), 0.5)::real AS valence,
        COALESCE(AVG(em.arousal * (vect.intensity_level / 10.0)), 0.5)::real AS arousal,
        COALESCE(AVG(em.dominance * (vect.intensity_level / 10.0)), 0.5)::real AS dominance,
        now() AS updated_at
    FROM viib_emotion_classified_titles vect
    JOIN emotion_master em ON em.id = vect.emotion_id
    WHERE vect.title_id = COALESCE(NEW.title_id, OLD.title_id)
    GROUP BY vect.title_id
    ON CONFLICT (title_id)
    DO UPDATE SET
        valence = EXCLUDED.valence,
        arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance,
        updated_at = now();

    -- Refresh transformation scores for the affected title
    INSERT INTO public.title_transformation_scores (title_id, user_emotion_id, transformation_score, updated_at)
    SELECT
        vect.title_id,
        etm.user_emotion_id,
        (
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
    WHERE vect.title_id = COALESCE(NEW.title_id, OLD.title_id)
    ON CONFLICT (title_id, user_emotion_id)
    DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = now();

    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger on viib_emotion_classified_titles
DROP TRIGGER IF EXISTS trigger_cascade_refresh_emotion_scores ON public.viib_emotion_classified_titles;

CREATE TRIGGER trigger_cascade_refresh_emotion_scores
AFTER INSERT OR UPDATE OR DELETE ON public.viib_emotion_classified_titles
FOR EACH ROW
EXECUTE FUNCTION public.cascade_refresh_emotion_scores();


-- ============================================================================
-- PART 8: ENSURE title_intent_alignment_scores TABLE EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'title_intent_alignment_scores'
    ) THEN
        CREATE TABLE public.title_intent_alignment_scores (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title_id UUID NOT NULL REFERENCES public.titles(id),
            emotion_id UUID NOT NULL REFERENCES public.emotion_master(id),
            alignment_score REAL NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_title_intent_alignment_unique
        ON public.title_intent_alignment_scores(title_id, emotion_id);
    END IF;

    -- Add unique constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'title_intent_alignment_scores_title_emotion_unique'
    ) THEN
        ALTER TABLE public.title_intent_alignment_scores
        ADD CONSTRAINT title_intent_alignment_scores_title_emotion_unique
        UNIQUE (title_id, emotion_id);
    END IF;
END $$;


-- ============================================================================
-- PART 9: ADD get_top_recommendations_v2
-- Improved version that properly uses all scores
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(
    p_user_id uuid,
    p_limit integer DEFAULT 10
)
RETURNS TABLE(
    title_id uuid,
    base_viib_score real,
    intent_alignment_score real,
    social_priority_score real,
    transformation_score real,
    final_score real,
    recommendation_reason text
)
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_user_emotion_id UUID;
BEGIN
    -- Get user's current emotion
    SELECT ues.emotion_id
    INTO v_user_emotion_id
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    RETURN QUERY
    WITH candidate_titles AS (
        -- Get titles available to user based on streaming subscriptions and language
        SELECT t.id
        FROM titles t
        WHERE t.id IN (
            SELECT tsa.title_id
            FROM title_streaming_availability tsa
            JOIN user_streaming_subscriptions uss
              ON tsa.streaming_service_id = uss.streaming_service_id
             AND uss.user_id = p_user_id
             AND uss.is_active = TRUE
        )
        AND t.original_language IN (
            SELECT ulp.language_code
            FROM user_language_preferences ulp
            WHERE ulp.user_id = p_user_id
        )
        -- Exclude already watched/disliked
        AND NOT EXISTS (
            SELECT 1
            FROM user_title_interactions uti
            WHERE uti.user_id = p_user_id
              AND uti.title_id = t.id
              AND uti.interaction_type IN ('completed', 'disliked')
        )
    ),
    scored AS (
        SELECT
            ct.id AS title_id,
            -- Base ViiB score from components
            (
                SELECT
                    sc.emotional_component * 0.35 +
                    sc.social_component * 0.20 +
                    sc.historical_component * 0.25 +
                    sc.context_component * 0.10 +
                    sc.novelty_component * 0.10
                FROM viib_score_components(p_user_id, ct.id) sc
            )::real AS base_score,
            -- Intent alignment
            viib_intent_alignment_score(p_user_id, ct.id) AS intent_score,
            -- Social priority
            viib_social_priority_score(p_user_id, ct.id) AS social_score,
            -- Transformation score from cache
            COALESCE(
                (SELECT tts.transformation_score
                 FROM title_transformation_scores tts
                 WHERE tts.title_id = ct.id
                   AND tts.user_emotion_id = v_user_emotion_id),
                0.5
            )::real AS transform_score
        FROM candidate_titles ct
    ),
    ranked AS (
        SELECT
            s.title_id,
            s.base_score,
            s.intent_score,
            s.social_score,
            s.transform_score,
            -- Final score combines all factors
            -- Prioritize social recommendations if high
            GREATEST(
                s.base_score * s.intent_score * (0.5 + 0.5 * s.transform_score),
                s.social_score
            )::real AS final_score,
            -- Determine primary reason
            CASE
                WHEN s.social_score > s.base_score * s.intent_score THEN 'friend_recommendation'
                WHEN s.transform_score >= 0.8 THEN 'emotional_transformation'
                WHEN s.intent_score >= 0.8 THEN 'intent_match'
                WHEN s.base_score >= 0.7 THEN 'mood_match'
                ELSE 'general_recommendation'
            END AS recommendation_reason
        FROM scored s
    )
    SELECT
        r.title_id,
        r.base_score,
        r.intent_score,
        r.social_score,
        r.transform_score,
        r.final_score,
        r.recommendation_reason
    FROM ranked r
    ORDER BY r.final_score DESC
    LIMIT p_limit;
END;
$function$;


-- ============================================================================
-- PART 10: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.viib_intent_alignment_score(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.viib_social_priority_score(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_title_user_emotion_match_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.explain_recommendation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_title_transformation_scores() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_title_intent_alignment_scores() TO service_role;
GRANT EXECUTE ON FUNCTION public.cascade_refresh_emotion_scores() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_recommendations_v2(uuid, integer) TO authenticated;


-- ============================================================================
-- PHASE 2 COMPLETE
-- Summary of fixes:
-- 1. viib_intent_alignment_score: Now uses transformation scores and pre-computed cache
-- 2. viib_social_priority_score: Now considers emotion matching and transformation
-- 3. refresh_title_user_emotion_match_cache: Fixed loop logic to process all emotions
-- 4. explain_recommendation: Added transformation type explanations
-- 5. refresh_title_transformation_scores: Consistent weights with Phase 1
-- 6. refresh_title_intent_alignment_scores: Pre-computes alignment with transformation
-- 7. cascade_refresh_emotion_scores: Trigger for automatic score updates
-- 8. get_top_recommendations_v2: Improved recommendation function using all scores
-- ============================================================================
