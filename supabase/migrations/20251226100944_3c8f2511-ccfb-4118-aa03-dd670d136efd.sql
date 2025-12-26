-- First drop the existing function, then recreate with array_append fix
DROP FUNCTION IF EXISTS public.explain_recommendation(uuid, uuid);

CREATE OR REPLACE FUNCTION public.explain_recommendation(p_user_id uuid, p_title_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Build explanation reasons using explicit array append
    IF v_social_priority > v_base_score AND v_social_priority >= 0.8 THEN
        reasons := array_append(reasons, 'A trusted friend with similar taste recommended this.');
    ELSIF v_social_priority > v_base_score THEN
        reasons := array_append(reasons, 'A friend recommendation increased the priority of this title.');
    END IF;

    -- Add transformation-based explanation
    IF v_transformation_type IS NOT NULL AND v_transformation_score >= 0.7 THEN
        CASE v_transformation_type
            WHEN 'soothe' THEN
                reasons := array_append(reasons, format('This content will help soothe your %s feelings.', v_user_emotion_label));
            WHEN 'validate' THEN
                reasons := array_append(reasons, format('This content validates and understands your %s state.', v_user_emotion_label));
            WHEN 'amplify' THEN
                reasons := array_append(reasons, format('This will amplify your positive %s energy.', v_user_emotion_label));
            WHEN 'complementary' THEN
                reasons := array_append(reasons, format('This offers a complementary experience to your %s mood.', v_user_emotion_label));
            WHEN 'reinforcing' THEN
                reasons := array_append(reasons, format('This reinforces and deepens your current %s feeling.', v_user_emotion_label));
            WHEN 'stabilize' THEN
                reasons := array_append(reasons, 'This content will help stabilize your emotional state.');
            WHEN 'neutral_balancing' THEN
                reasons := array_append(reasons, 'This provides a balanced, neutral emotional experience.');
            ELSE
                reasons := array_append(reasons, format('This content matches well with your %s mood.', v_user_emotion_label));
        END CASE;
    ELSIF c_emotional >= 0.7 THEN
        reasons := array_append(reasons, 'This title strongly matches your current mood.');
    ELSIF c_emotional >= 0.5 THEN
        reasons := array_append(reasons, 'This title aligns well with how you are feeling.');
    END IF;

    IF v_intent_score >= 0.7 THEN
        reasons := array_append(reasons, 'This matches your viewing intent perfectly.');
    END IF;

    IF c_historical >= 0.7 THEN
        reasons := array_append(reasons, 'You have previously enjoyed similar titles.');
    END IF;

    IF c_context >= 0.7 THEN
        reasons := array_append(reasons, 'This fits well into your typical viewing session length.');
    END IF;

    IF c_novelty >= 0.8 THEN
        reasons := array_append(reasons, 'This is a fresh discovery you have not watched before.');
    END IF;

    IF array_length(reasons, 1) IS NULL THEN
        reasons := ARRAY['Recommended based on your mood, history, context, and social signals combined.']::TEXT[];
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
$$;