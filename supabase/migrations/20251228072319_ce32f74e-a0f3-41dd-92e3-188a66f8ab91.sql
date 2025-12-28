-- Drop and recreate with release_date/first_air_date and popularity filter
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v3(
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
  release_date DATE,
  first_air_date DATE,
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
  WITH user_langs AS (
    SELECT ulp.language_code, ulp.priority_order
    FROM user_language_preferences ulp
    WHERE ulp.user_id = p_user_id
  ),
  user_stream AS (
    SELECT uss.streaming_service_id
    FROM user_streaming_subscriptions uss
    WHERE uss.user_id = p_user_id AND uss.is_active = true
  ),
  user_inter AS (
    SELECT DISTINCT uti.title_id AS tid FROM user_title_interactions uti WHERE uti.user_id = p_user_id
  ),
  -- Filter out titles that ONLY have Family genre (kids-only content)
  kids_only AS (
    SELECT tg1.title_id AS tid
    FROM title_genres tg1
    WHERE v_family_genre_id IS NOT NULL
    GROUP BY tg1.title_id
    HAVING bool_and(tg1.genre_id = v_family_genre_id)
  ),
  scored AS (
    SELECT 
      t.id AS tid,
      t.tmdb_id AS t_tmdb_id,
      t.name AS t_title,
      t.title_type AS t_type,
      t.poster_path AS t_poster,
      t.backdrop_path AS t_backdrop,
      t.trailer_url AS t_trailer,
      t.runtime AS t_runtime,
      t.overview AS t_overview,
      t.title_genres AS t_genres,
      t.release_date AS t_release_date,
      t.first_air_date AS t_first_air_date,
      t.original_language AS t_lang,
      t.popularity AS t_popularity,
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
      END AS emo_score,
      COALESCE(
        (SELECT AVG(vgw.weight) 
         FROM title_genres tg2
         JOIN vibe_genre_weights vgw ON vgw.genre_id = tg2.genre_id
         WHERE tg2.title_id = t.id 
         AND vgw.vibe_id = v_user_vibe_type),
        0.4
      ) AS vib_score,
      COALESCE(tss.social_rec_power, 0) * 0.5 + 
      COALESCE(utss.social_priority_score, 0) * 0.5 AS soc_score,
      CASE 
        WHEN t.original_language = (SELECT ul.language_code FROM user_langs ul WHERE ul.priority_order = 1) THEN 1.0
        WHEN t.original_language = (SELECT ul.language_code FROM user_langs ul WHERE ul.priority_order = 2) THEN 0.85
        WHEN t.original_language = (SELECT ul.language_code FROM user_langs ul WHERE ul.priority_order = 3) THEN 0.70
        WHEN t.original_language IN (SELECT ul.language_code FROM user_langs ul) THEN 0.60
        ELSE 0.40
      END AS lang_score
    FROM titles t
    LEFT JOIN title_emotion_vectors tev ON tev.title_id = t.id
    LEFT JOIN title_transformation_scores tts ON tts.title_id = t.id 
      AND tts.user_emotion_id = v_user_emotion_id
    LEFT JOIN title_social_summary tss ON tss.title_id = t.id
    LEFT JOIN user_title_social_scores utss ON utss.title_id = t.id 
      AND utss.user_id = p_user_id
    WHERE t.id NOT IN (SELECT ui.tid FROM user_inter ui)
      AND t.poster_path IS NOT NULL
      AND t.runtime > 20
      AND t.popularity >= 15  -- Filter out obscure/unknown titles
      AND t.id NOT IN (SELECT ko.tid FROM kids_only ko)
      AND EXISTS (
        SELECT 1 FROM title_streaming_availability tsa
        JOIN user_stream us ON us.streaming_service_id = tsa.streaming_service_id
        WHERE tsa.title_id = t.id AND tsa.region_code = v_user_country
      )
  )
  SELECT 
    s.tid,
    s.t_tmdb_id,
    s.t_title,
    s.t_type,
    s.t_poster,
    s.t_backdrop,
    s.t_trailer,
    s.t_runtime,
    s.t_overview,
    s.t_genres,
    s.t_release_date,
    s.t_first_air_date,
    s.emo_score::REAL,
    s.vib_score::REAL,
    s.soc_score::REAL,
    s.lang_score::REAL,
    (s.emo_score * v_emotion_weight + 
     s.vib_score * v_vibe_weight + 
     s.soc_score * v_social_weight + 
     s.lang_score * v_language_weight)::REAL AS fin_score,
    CASE 
      WHEN s.emo_score > 0.7 THEN 'Matches your ' || COALESCE(v_user_emotion_label, 'mood')
      WHEN s.lang_score = 1.0 THEN 'Great pick in your language'
      WHEN s.soc_score > 0.5 THEN 'Loved by your circle'
      WHEN s.vib_score > 0.6 THEN 'Fits your ' || COALESCE(v_user_vibe_type, 'vibe')
      ELSE 'Recommended for you'
    END AS rec_reason
  FROM scored s
  ORDER BY (s.emo_score * v_emotion_weight + 
            s.vib_score * v_vibe_weight + 
            s.soc_score * v_social_weight + 
            s.lang_score * v_language_weight) DESC,
           s.t_popularity DESC,
           s.lang_score DESC
  LIMIT p_limit;
END;
$$;