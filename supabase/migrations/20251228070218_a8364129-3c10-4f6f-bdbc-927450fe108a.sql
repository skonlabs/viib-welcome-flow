-- Drop and recreate get_top_recommendations_v3 to filter out kids content
DROP FUNCTION IF EXISTS get_top_recommendations_v3(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_top_recommendations_v3(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  title_id UUID,
  tmdb_id INTEGER,
  title TEXT,
  title_type TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  trailer_url TEXT,
  runtime INTEGER,
  overview TEXT,
  genres JSON,
  emotion_score REAL,
  vibe_score REAL,
  social_score REAL,
  language_score REAL,
  final_score REAL,
  recommendation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_emotion_id UUID;
  v_user_emotion_label TEXT;
  v_user_intensity REAL;
  v_user_valence REAL;
  v_user_arousal REAL;
  v_user_dominance REAL;
  v_user_vibe_type TEXT;
  v_user_country TEXT;
  v_emotion_weight REAL := 0.45;
  v_vibe_weight REAL := 0.15;
  v_social_weight REAL := 0.20;
  v_language_weight REAL := 0.20;
  v_family_genre_id UUID;
BEGIN
  -- Get Family genre ID to filter out kids-only content
  SELECT g.id INTO v_family_genre_id
  FROM genres g
  WHERE g.genre_name = 'Family';
  
  -- Get user's current emotion state
  SELECT ues.emotion_id, em.emotion_label, ues.intensity, 
         ues.valence, ues.arousal, ues.dominance
  INTO v_user_emotion_id, v_user_emotion_label, v_user_intensity,
       v_user_valence, v_user_arousal, v_user_dominance
  FROM user_emotion_states ues
  JOIN emotion_master em ON em.id = ues.emotion_id
  WHERE ues.user_id = p_user_id
  ORDER BY ues.created_at DESC
  LIMIT 1;
  
  -- Get user's vibe preference
  SELECT vibe_type INTO v_user_vibe_type
  FROM user_vibe_preferences
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- Get user's country (default to US)
  SELECT COALESCE(country, 'US') INTO v_user_country
  FROM users
  WHERE id = p_user_id;
  
  v_user_country := COALESCE(v_user_country, 'US');
  
  RETURN QUERY
  WITH user_languages AS (
    SELECT language_code, priority_order
    FROM user_language_preferences
    WHERE user_id = p_user_id
  ),
  user_streaming AS (
    SELECT streaming_service_id
    FROM user_streaming_subscriptions
    WHERE user_id = p_user_id AND is_active = true
  ),
  user_interacted AS (
    SELECT DISTINCT title_id FROM user_title_interactions WHERE user_id = p_user_id
  ),
  -- Filter out titles that ONLY have Family genre (kids-only content)
  kids_only_titles AS (
    SELECT tg.title_id
    FROM title_genres tg
    WHERE v_family_genre_id IS NOT NULL
    GROUP BY tg.title_id
    HAVING bool_and(tg.genre_id = v_family_genre_id)
  ),
  scored_titles AS (
    SELECT 
      t.id as title_id,
      t.tmdb_id,
      t.name as title,
      t.title_type,
      t.poster_path,
      t.backdrop_path,
      t.trailer_url,
      t.runtime,
      t.overview,
      t.title_genres as genres,
      t.original_language,
      CASE 
        WHEN v_user_emotion_id IS NOT NULL AND tev.title_id IS NOT NULL THEN
          GREATEST(0, 1 - (
            SQRT(
              POWER(COALESCE(v_user_valence, 0) - COALESCE(tev.valence, 0), 2) +
              POWER(COALESCE(v_user_arousal, 0) - COALESCE(tev.arousal, 0), 2) +
              POWER(COALESCE(v_user_dominance, 0) - COALESCE(tev.dominance, 0), 2)
            ) / 1.732
          )) * COALESCE(v_user_intensity, 0.5) +
          COALESCE(tts.transformation_score, 0) * 0.2
        ELSE 0.3
      END as emotion_score,
      COALESCE(
        (SELECT AVG(vgw.weight) 
         FROM title_genres tg
         JOIN vibe_genre_weights vgw ON vgw.genre_id = tg.genre_id
         WHERE tg.title_id = t.id 
         AND vgw.vibe_id = v_user_vibe_type),
        0.4
      ) as vibe_score,
      COALESCE(tss.social_rec_power, 0) * 0.5 + 
      COALESCE(utss.social_priority_score, 0) * 0.5 as social_score,
      CASE 
        WHEN t.original_language = (SELECT language_code FROM user_languages WHERE priority_order = 1) THEN 1.0
        WHEN t.original_language = (SELECT language_code FROM user_languages WHERE priority_order = 2) THEN 0.85
        WHEN t.original_language = (SELECT language_code FROM user_languages WHERE priority_order = 3) THEN 0.70
        WHEN t.original_language IN (SELECT language_code FROM user_languages) THEN 0.60
        ELSE 0.40
      END as language_score
    FROM titles t
    LEFT JOIN title_emotion_vectors tev ON tev.title_id = t.id
    LEFT JOIN title_transformation_scores tts ON tts.title_id = t.id 
      AND tts.user_emotion_id = v_user_emotion_id
    LEFT JOIN title_social_summary tss ON tss.title_id = t.id
    LEFT JOIN user_title_social_scores utss ON utss.title_id = t.id 
      AND utss.user_id = p_user_id
    WHERE t.id NOT IN (SELECT title_id FROM user_interacted)
      AND t.poster_path IS NOT NULL
      AND t.runtime > 20
      AND t.id NOT IN (SELECT title_id FROM kids_only_titles)
      AND EXISTS (
        SELECT 1 FROM title_streaming_availability tsa
        JOIN user_streaming us ON us.streaming_service_id = tsa.streaming_service_id
        WHERE tsa.title_id = t.id AND tsa.region_code = v_user_country
      )
  )
  SELECT 
    st.title_id,
    st.tmdb_id,
    st.title,
    st.title_type,
    st.poster_path,
    st.backdrop_path,
    st.trailer_url,
    st.runtime,
    st.overview,
    st.genres,
    st.emotion_score::REAL,
    st.vibe_score::REAL,
    st.social_score::REAL,
    st.language_score::REAL,
    (st.emotion_score * v_emotion_weight + 
     st.vibe_score * v_vibe_weight + 
     st.social_score * v_social_weight + 
     st.language_score * v_language_weight)::REAL as final_score,
    CASE 
      WHEN st.emotion_score > 0.7 THEN 'Matches your ' || COALESCE(v_user_emotion_label, 'mood')
      WHEN st.language_score = 1.0 THEN 'Great pick in your language'
      WHEN st.social_score > 0.5 THEN 'Loved by your circle'
      WHEN st.vibe_score > 0.6 THEN 'Fits your ' || COALESCE(v_user_vibe_type, 'vibe')
      ELSE 'Recommended for you'
    END as recommendation_reason
  FROM scored_titles st
  ORDER BY (st.emotion_score * v_emotion_weight + 
            st.vibe_score * v_vibe_weight + 
            st.social_score * v_social_weight + 
            st.language_score * v_language_weight) DESC,
           st.language_score DESC
  LIMIT p_limit;
END;
$$;