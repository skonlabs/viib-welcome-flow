-- Drop existing function
DROP FUNCTION IF EXISTS public.translate_mood_to_emotion(uuid, text, real);

-- Recreate function that stores emotion then returns id and label
CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(
    p_user_id uuid,
    p_mood_text text,
    p_energy_percentage real
)
RETURNS TABLE(emotion_id uuid, emotion_label text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_emotion_label TEXT;
BEGIN
    -- Simple mapping layer (expandable to ML model later)
    v_emotion_label :=
    CASE
        WHEN LOWER(p_mood_text) LIKE '%calm%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%relaxed%' THEN 'calm'
        WHEN LOWER(p_mood_text) LIKE '%sad%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%heavy%' THEN 'sad'
        WHEN LOWER(p_mood_text) LIKE '%anxious%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%nervous%' THEN 'anxious'
        WHEN LOWER(p_mood_text) LIKE '%stressed%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%overwhelmed%' THEN 'stressed'
        WHEN LOWER(p_mood_text) LIKE '%angry%' THEN 'angry'
        WHEN LOWER(p_mood_text) LIKE '%excited%' THEN 'excited'
        WHEN LOWER(p_mood_text) LIKE '%happy%' THEN 'happy'
        WHEN LOWER(p_mood_text) LIKE '%bored%' THEN 'bored'
        WHEN LOWER(p_mood_text) LIKE '%lonely%' THEN 'lonely'
        WHEN LOWER(p_mood_text) LIKE '%hopeful%' THEN 'hopeful'
        ELSE 'calm'
    END;

    -- Store the emotion vector
    PERFORM store_user_emotion_vector(
        p_user_id,
        v_emotion_label,
        p_energy_percentage
    );

    -- Return emotion_id and emotion_label
    RETURN QUERY
    SELECT em.id, em.emotion_label
    FROM emotion_master em
    WHERE em.emotion_label = v_emotion_label
      AND em.category = 'user_state'
    LIMIT 1;
END;
$function$;