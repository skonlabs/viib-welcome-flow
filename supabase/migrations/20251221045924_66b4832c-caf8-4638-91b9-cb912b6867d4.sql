-- Optimize refresh_title_social_summary to only process titles with activity
-- and add timeout protection

CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
AS $function$
DECLARE
  v_interaction_count INT;
  v_rec_count INT;
BEGIN
  -- Early exit if no interactions or recommendations exist
  SELECT COUNT(*) INTO v_interaction_count FROM user_title_interactions WHERE rating_value IS NOT NULL LIMIT 1;
  SELECT COUNT(*) INTO v_rec_count FROM user_social_recommendations LIMIT 1;
  
  IF v_interaction_count = 0 AND v_rec_count = 0 THEN
    RAISE NOTICE 'No interactions or recommendations found, skipping refresh';
    RETURN;
  END IF;

  -- Only process titles that have actual activity (not all 111K titles)
  WITH rating_agg AS (
    SELECT
      uti.title_id,
      AVG(
        CASE uti.rating_value
          WHEN 'love_it' THEN 1.0
          WHEN 'like_it' THEN 0.75
          WHEN 'ok'      THEN 0.5
          ELSE 0.0
        END
      ) AS mean_rating
    FROM user_title_interactions uti
    WHERE uti.rating_value IS NOT NULL
    GROUP BY uti.title_id
  ),
  rec_agg AS (
    SELECT
      usr.title_id,
      COUNT(*) AS rec_count
    FROM user_social_recommendations usr
    GROUP BY usr.title_id
  ),
  -- Get only titles that have activity
  active_titles AS (
    SELECT title_id FROM rating_agg
    UNION
    SELECT title_id FROM rec_agg
  )
  INSERT INTO title_social_summary (
    title_id, social_mean_rating, social_rec_power, updated_at
  )
  SELECT
    at.title_id,
    COALESCE(r.mean_rating, 0.0) AS social_mean_rating,
    COALESCE(
      CASE
        WHEN ra.rec_count IS NULL OR ra.rec_count = 0 THEN 0.0
        ELSE LEAST(LOG(1 + ra.rec_count::REAL), 5.0)
      END,
      0.0
    ) AS social_rec_power,
    NOW() AS updated_at
  FROM active_titles at
  LEFT JOIN rating_agg r ON r.title_id = at.title_id
  LEFT JOIN rec_agg ra ON ra.title_id = at.title_id
  ON CONFLICT (title_id) DO UPDATE
  SET
    social_mean_rating = EXCLUDED.social_mean_rating,
    social_rec_power   = EXCLUDED.social_rec_power,
    updated_at         = EXCLUDED.updated_at;
END;
$function$;