-- Drop and recreate with properly qualified column references
DROP FUNCTION IF EXISTS get_top_recommendations_v2(uuid, integer);

CREATE OR REPLACE FUNCTION get_top_recommendations_v2(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  title_id uuid,
  base_viib_score real,
  intent_alignment_score real,
  social_priority_score real,
  transformation_score real,
  final_score real,
  recommendation_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_emotion_id uuid;
  v_has_streaming_prefs boolean;
  v_user_region text;
BEGIN
  -- Get user's current emotion
  SELECT ues.emotion_id INTO v_user_emotion_id
  FROM user_emotion_states ues
  WHERE ues.user_id = p_user_id
  ORDER BY ues.created_at DESC
  LIMIT 1;

  -- Check if user has streaming preferences
  SELECT EXISTS(
    SELECT 1 FROM user_streaming_subscriptions uss
    WHERE uss.user_id = p_user_id AND uss.is_active = true
  ) INTO v_has_streaming_prefs;

  -- Get user region
  SELECT u.country INTO v_user_region
  FROM users u
  WHERE u.id = p_user_id;

  -- Return recommendations
  RETURN QUERY
  WITH user_interactions AS (
    SELECT uti.title_id as interacted_title_id
    FROM user_title_interactions uti
    WHERE uti.user_id = p_user_id
  ),
  user_languages AS (
    SELECT ulp.language_code
    FROM user_language_preferences ulp
    WHERE ulp.user_id = p_user_id
  ),
  scored_titles AS (
    SELECT 
      t.id as scored_title_id,
      COALESCE(tss.social_mean_rating, 0.5)::REAL as base_score,
      COALESCE(tias.alignment_score, 0.3)::REAL as intent_score,
      COALESCE(utss.social_priority_score, 0)::REAL as social_score,
      COALESCE(tts.transformation_score, 0.5)::REAL as transform_score,
      CASE 
        WHEN tias.alignment_score >= 0.7 THEN 'Perfect match for your current mood'
        WHEN tias.alignment_score >= 0.5 THEN 'Thought-provoking content for the curious mind'
        WHEN tts.transformation_score >= 0.7 THEN 'A cathartic experience for emotional processing'
        WHEN COALESCE(utss.social_priority_score, 0) > 0 THEN 'Recommended by your trusted circle'
        WHEN t.vote_average >= 8.0 THEN 'Critically acclaimed masterpiece'
        WHEN t.popularity >= 100 THEN 'Trending and popular right now'
        ELSE 
          CASE 
            WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(to_jsonb(t.title_genres)) g WHERE g.value IN ('Action', 'Thriller')) THEN 'Heart-pounding excitement awaits'
            WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(to_jsonb(t.title_genres)) g WHERE g.value IN ('Comedy')) THEN 'Easy, fun content for casual viewing'
            WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(to_jsonb(t.title_genres)) g WHERE g.value IN ('Drama')) THEN 'A cathartic experience for emotional processing'
            ELSE 'Curated just for you'
          END
      END as reason
    FROM titles t
    LEFT JOIN title_social_summary tss ON tss.title_id = t.id
    LEFT JOIN title_intent_alignment_scores tias ON tias.title_id = t.id AND tias.user_emotion_id = v_user_emotion_id
    LEFT JOIN user_title_social_scores utss ON utss.title_id = t.id AND utss.user_id = p_user_id
    LEFT JOIN title_transformation_scores tts ON tts.title_id = t.id AND tts.user_emotion_id = v_user_emotion_id
    WHERE t.id NOT IN (SELECT ui.interacted_title_id FROM user_interactions ui)
      AND t.poster_path IS NOT NULL
      AND t.overview IS NOT NULL
      AND (
        NOT v_has_streaming_prefs
        OR EXISTS (
          SELECT 1 FROM title_streaming_availability tsa
          JOIN user_streaming_subscriptions uss2 ON uss2.streaming_service_id = tsa.streaming_service_id
          WHERE tsa.title_id = t.id
            AND uss2.user_id = p_user_id
            AND uss2.is_active = true
            AND (v_user_region IS NULL OR tsa.region_code = v_user_region)
        )
      )
      AND (
        NOT EXISTS (SELECT 1 FROM user_languages)
        OR t.original_language IN (SELECT ul.language_code FROM user_languages ul)
        OR t.original_language = 'en'
      )
  )
  SELECT 
    st.scored_title_id as title_id,
    st.base_score as base_viib_score,
    st.intent_score as intent_alignment_score,
    st.social_score as social_priority_score,
    st.transform_score as transformation_score,
    (
      (st.base_score * 0.2) +
      (st.intent_score * 0.3) +
      (st.social_score * 0.2) +
      (st.transform_score * 0.3)
    )::REAL as final_score,
    st.reason as recommendation_reason
  FROM scored_titles st
  ORDER BY (
    (st.base_score * 0.2) +
    (st.intent_score * 0.3) +
    (st.social_score * 0.2) +
    (st.transform_score * 0.3)
  ) DESC
  LIMIT p_limit;
END;
$$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';