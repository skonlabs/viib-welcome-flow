
-- Step 1: Add intensity_multiplier column to emotion_master
ALTER TABLE public.emotion_master 
ADD COLUMN intensity_multiplier real DEFAULT 1.0;

-- Step 2: Copy data from emotion_energy_profile to emotion_master
UPDATE public.emotion_master em
SET intensity_multiplier = eep.intensity_multiplier
FROM public.emotion_energy_profile eep
WHERE em.id = eep.emotion_id;

-- Step 3: Update calculate_user_emotion_intensity function to use emotion_master directly
CREATE OR REPLACE FUNCTION public.calculate_user_emotion_intensity(p_emotion_id uuid, p_energy_percentage real)
 RETURNS real
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_multiplier REAL;
    v_normalized_energy REAL;
    v_intensity REAL;
BEGIN
    -- Normalize energy (0–100 → 0–1)
    v_normalized_energy := GREATEST(LEAST(p_energy_percentage / 100.0, 1.0), 0.0);

    -- Get intensity_multiplier directly from emotion_master
    SELECT intensity_multiplier
    INTO v_multiplier
    FROM emotion_master
    WHERE id = p_emotion_id;

    IF v_multiplier IS NULL THEN
        v_multiplier := 1.0;
    END IF;

    v_intensity := v_normalized_energy * v_multiplier;

    -- Clamp to safe bounds
    v_intensity := LEAST(GREATEST(v_intensity, 0.1), 1.0);

    RETURN v_intensity;
END;
$function$;

-- Step 4: Drop the view that references emotion_energy_profile
DROP VIEW IF EXISTS public.vw_missing_emotion_energy_profiles;

-- Step 5: Drop the emotion_energy_profile table
DROP TABLE public.emotion_energy_profile;
