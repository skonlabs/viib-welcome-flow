-- Fix SECURITY DEFINER on translate_mood_to_emotion so it can bypass RLS
CREATE OR REPLACE FUNCTION public.translate_mood_to_emotion(p_user_id uuid, p_mood_text text, p_energy_percentage real)
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

    PERFORM store_user_emotion_vector(p_user_id, v_emotion_label, p_energy_percentage);

    RETURN QUERY
    SELECT em.id, em.emotion_label
    FROM emotion_master em
    WHERE em.emotion_label = v_emotion_label
      AND em.category = 'user_state'
    LIMIT 1;
END;
$function$;

-- Fix SECURITY DEFINER on store_user_emotion_vector so it can insert into user_emotion_states
CREATE OR REPLACE FUNCTION public.store_user_emotion_vector(p_user_id uuid, p_emotion_label text, p_energy_percentage real)
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
    v_arousal := v_arousal * v_intensity;

    INSERT INTO user_emotion_states (
        user_id, emotion_id, intensity, valence, arousal, dominance, created_at
    )
    VALUES (
        p_user_id, v_emotion_id, v_intensity, v_valence, v_arousal, v_dominance, now()
    );
END;
$function$;

-- Enable RLS on tables that don't have it (internal/system tables need service-only access)
ALTER TABLE public.viib_emotion_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_emotion_classified_titles_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_title_intent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_emotion_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_social_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_transformation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_user_emotion_match_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_transformation_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_display_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_to_intent_map ENABLE ROW LEVEL SECURITY;

-- Create service-role only policies for internal system tables (read by system, modified by jobs/cron)
CREATE POLICY "viib_emotion_classified_titles_public_read" ON public.viib_emotion_classified_titles FOR SELECT USING (true);
CREATE POLICY "viib_emotion_classified_titles_service" ON public.viib_emotion_classified_titles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "viib_emotion_classified_titles_staging_service" ON public.viib_emotion_classified_titles_staging FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "viib_intent_classified_titles_public_read" ON public.viib_intent_classified_titles FOR SELECT USING (true);
CREATE POLICY "viib_intent_classified_titles_service" ON public.viib_intent_classified_titles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "viib_intent_classified_titles_staging_service" ON public.viib_intent_classified_titles_staging FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "viib_title_intent_stats_public_read" ON public.viib_title_intent_stats FOR SELECT USING (true);
CREATE POLICY "viib_title_intent_stats_service" ON public.viib_title_intent_stats FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "title_emotion_vectors_public_read" ON public.title_emotion_vectors FOR SELECT USING (true);
CREATE POLICY "title_emotion_vectors_service" ON public.title_emotion_vectors FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "title_social_summary_public_read" ON public.title_social_summary FOR SELECT USING (true);
CREATE POLICY "title_social_summary_service" ON public.title_social_summary FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "title_transformation_scores_public_read" ON public.title_transformation_scores FOR SELECT USING (true);
CREATE POLICY "title_transformation_scores_service" ON public.title_transformation_scores FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "title_user_emotion_match_cache_public_read" ON public.title_user_emotion_match_cache FOR SELECT USING (true);
CREATE POLICY "title_user_emotion_match_cache_service" ON public.title_user_emotion_match_cache FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "emotion_transformation_map_public_read" ON public.emotion_transformation_map FOR SELECT USING (true);
CREATE POLICY "emotion_transformation_map_service" ON public.emotion_transformation_map FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "emotion_display_phrases_public_read" ON public.emotion_display_phrases FOR SELECT USING (true);
CREATE POLICY "emotion_display_phrases_service" ON public.emotion_display_phrases FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "emotion_to_intent_map_public_read" ON public.emotion_to_intent_map FOR SELECT USING (true);
CREATE POLICY "emotion_to_intent_map_service" ON public.emotion_to_intent_map FOR ALL USING (true) WITH CHECK (true);