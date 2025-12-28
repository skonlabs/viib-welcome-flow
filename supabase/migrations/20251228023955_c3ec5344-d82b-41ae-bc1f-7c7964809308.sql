-- Fix store_user_emotion_vector to convert raw values from -1..1 to 0..1 scale
DROP FUNCTION IF EXISTS public.store_user_emotion_vector(uuid, text, real, real, real);

CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(
    p_user_id uuid, 
    p_emotion_label text, 
    p_energy_percentage real,
    p_raw_valence real DEFAULT NULL,
    p_raw_arousal real DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_emotion_id UUID;
    v_intensity REAL;
    v_valence REAL;
    v_arousal REAL;
    v_dominance REAL;
BEGIN
    SELECT id, valence, arousal, dominance
    INTO v_emotion_id, v_valence, v_arousal, v_dominance
    FROM emotion_master
    WHERE emotion_label = p_emotion_label
      AND category = 'user_state';

    IF v_emotion_id IS NULL THEN
        RAISE EXCEPTION 'Invalid user_state emotion: %', p_emotion_label;
    END IF;

    v_intensity := calculate_user_emotion_intensity(v_emotion_id, p_energy_percentage);
    
    -- Use raw values from UI if provided
    -- Raw values come in -1 to 1 scale, convert to 0 to 1 scale for storage
    IF p_raw_valence IS NOT NULL THEN
        v_valence := (p_raw_valence + 1.0) / 2.0;
    END IF;
    
    IF p_raw_arousal IS NOT NULL THEN
        v_arousal := (p_raw_arousal + 1.0) / 2.0;
    ELSE
        -- Legacy behavior: scale arousal by intensity if no raw value provided
        v_arousal := v_arousal * v_intensity;
    END IF;

    INSERT INTO user_emotion_states (
        user_id, emotion_id, intensity, valence, arousal, dominance, created_at
    )
    VALUES (
        p_user_id, v_emotion_id, v_intensity, v_valence, v_arousal, v_dominance, now()
    );
END;
$function$;