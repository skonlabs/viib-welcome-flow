-- Update store_user_emotion_vector to accept raw valence/arousal from UI
DROP FUNCTION IF EXISTS public.store_user_emotion_vector(uuid, text, real);

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
    
    -- Use raw values from UI if provided, otherwise fall back to emotion defaults
    IF p_raw_valence IS NOT NULL THEN
        v_valence := p_raw_valence;
    END IF;
    
    IF p_raw_arousal IS NOT NULL THEN
        v_arousal := p_raw_arousal;
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

-- Update translate_mood_to_emotion to pass raw values through
DROP FUNCTION IF EXISTS public.translate_mood_to_emotion(uuid, text, real);

CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(
    p_user_id uuid, 
    p_mood_text text, 
    p_energy_percentage real,
    p_raw_valence real DEFAULT NULL,
    p_raw_arousal real DEFAULT NULL
)
RETURNS TABLE(emotion_id uuid, emotion_label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_emotion_label TEXT;
BEGIN
    v_emotion_label :=
    CASE
        WHEN LOWER(p_mood_text) LIKE '%calm%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%relaxed%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%peaceful%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%content%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%sad%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%heavy%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%tired%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%melancholic%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%anxious%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%nervous%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%tense%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%stressed%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%overwhelmed%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%frustrated%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%angry%' THEN 'angry'
        WHEN LOWER(p_mood_text) LIKE '%annoyed%' THEN 'angry'
        WHEN LOWER(p_mood_text) LIKE '%excited%' THEN 'excited'
        WHEN LOWER(p_mood_text) LIKE '%delighted%' THEN 'excited'
        WHEN LOWER(p_mood_text) LIKE '%happy%' THEN 'happy'
        WHEN LOWER(p_mood_text) LIKE '%cheerful%' THEN 'happy'
        WHEN LOWER(p_mood_text) LIKE '%bored%' THEN 'bored'
        WHEN LOWER(p_mood_text) LIKE '%lonely%' THEN 'lonely'
        WHEN LOWER(p_mood_text) LIKE '%hopeful%' THEN 'hopeful'
        ELSE 'calm'
    END;

    -- Pass raw valence/arousal through to store function
    PERFORM store_user_emotion_vector(p_user_id, v_emotion_label, p_energy_percentage, p_raw_valence, p_raw_arousal);

    RETURN QUERY
    SELECT em.id, em.emotion_label
    FROM emotion_master em
    WHERE em.emotion_label = v_emotion_label
      AND em.category = 'user_state'
    LIMIT 1;
END;
$function$;