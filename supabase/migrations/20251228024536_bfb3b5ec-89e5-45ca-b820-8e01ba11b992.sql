-- Fix translate_mood_to_emotion to handle ALL user_state emotions
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
    v_found_emotion RECORD;
BEGIN
    -- First, try to find an exact match in emotion_master for user_state category
    SELECT em.id, em.emotion_label INTO v_found_emotion
    FROM emotion_master em
    WHERE LOWER(em.emotion_label) = LOWER(p_mood_text)
      AND em.category = 'user_state'
    LIMIT 1;
    
    -- If exact match found, use it directly
    IF v_found_emotion.emotion_label IS NOT NULL THEN
        v_emotion_label := v_found_emotion.emotion_label;
    ELSE
        -- Fallback to pattern matching for synonyms
        v_emotion_label :=
        CASE
            WHEN LOWER(p_mood_text) LIKE '%calm%' OR LOWER(p_mood_text) LIKE '%relaxed%' OR LOWER(p_mood_text) LIKE '%peaceful%' THEN 'calm'
            WHEN LOWER(p_mood_text) LIKE '%content%' THEN 'content'
            WHEN LOWER(p_mood_text) LIKE '%sad%' OR LOWER(p_mood_text) LIKE '%heavy%' THEN 'sad'
            WHEN LOWER(p_mood_text) LIKE '%tired%' THEN 'tired'
            WHEN LOWER(p_mood_text) LIKE '%melancholic%' THEN 'melancholic'
            WHEN LOWER(p_mood_text) LIKE '%anxious%' OR LOWER(p_mood_text) LIKE '%nervous%' OR LOWER(p_mood_text) LIKE '%tense%' THEN 'anxious'
            WHEN LOWER(p_mood_text) LIKE '%stressed%' OR LOWER(p_mood_text) LIKE '%overwhelmed%' THEN 'stressed'
            WHEN LOWER(p_mood_text) LIKE '%frustrated%' THEN 'frustrated'
            WHEN LOWER(p_mood_text) LIKE '%angry%' OR LOWER(p_mood_text) LIKE '%annoyed%' THEN 'angry'
            WHEN LOWER(p_mood_text) LIKE '%excited%' OR LOWER(p_mood_text) LIKE '%delighted%' THEN 'excited'
            WHEN LOWER(p_mood_text) LIKE '%happy%' OR LOWER(p_mood_text) LIKE '%cheerful%' THEN 'happy'
            WHEN LOWER(p_mood_text) LIKE '%bored%' THEN 'bored'
            WHEN LOWER(p_mood_text) LIKE '%lonely%' THEN 'lonely'
            WHEN LOWER(p_mood_text) LIKE '%hopeful%' THEN 'hopeful'
            WHEN LOWER(p_mood_text) LIKE '%curious%' THEN 'curious'
            WHEN LOWER(p_mood_text) LIKE '%adventurous%' THEN 'adventurous'
            WHEN LOWER(p_mood_text) LIKE '%inspired%' THEN 'inspired'
            WHEN LOWER(p_mood_text) LIKE '%romantic%' THEN 'romantic'
            WHEN LOWER(p_mood_text) LIKE '%nostalgic%' THEN 'nostalgic'
            ELSE 'calm'
        END;
    END IF;

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