-- Optimize refresh_user_title_social_scores_recent_users to handle empty data gracefully
-- and add timeout protection

CREATE OR REPLACE FUNCTION public.refresh_user_title_social_scores_recent_users()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '300s'
AS $function$
DECLARE
  v_recent_user_count INT;
BEGIN
  -- Early exit if no recent users
  SELECT COUNT(DISTINCT user_id) INTO v_recent_user_count
  FROM public.user_context_logs
  WHERE created_at >= now() - interval '7 days';
  
  IF v_recent_user_count = 0 THEN
    RAISE NOTICE 'No recent users found, skipping refresh';
    RETURN;
  END IF;

  -- Main insert logic
  WITH recent_users AS (
    SELECT DISTINCT user_id
    FROM public.user_context_logs
    WHERE created_at >= now() - interval '7 days'
  ),
  friend_ratings AS (
    SELECT
      fc.user_id,
      uti.title_id,
      AVG(
        CASE uti.rating_value
          WHEN 'love_it' THEN 1.0
          WHEN 'like_it' THEN 0.75
          WHEN 'ok'      THEN 0.5
          ELSE 0.0
        END * fc.trust_score
      )::real AS friend_rating_score
    FROM public.friend_connections fc
    JOIN recent_users ru ON ru.user_id = fc.user_id
    JOIN public.user_title_interactions uti
      ON uti.user_id = fc.friend_user_id
    WHERE fc.is_blocked = FALSE
      AND uti.title_id IS NOT NULL
    GROUP BY fc.user_id, uti.title_id
  ),
  friend_recs AS (
    SELECT
      fc.user_id,
      usr.title_id,
      AVG(fc.trust_score * 0.8)::real AS friend_recommendation_score
    FROM public.friend_connections fc
    JOIN recent_users ru ON ru.user_id = fc.user_id
    JOIN public.user_social_recommendations usr
      ON usr.receiver_user_id = fc.user_id
     AND usr.sender_user_id   = fc.friend_user_id
    WHERE fc.is_blocked = FALSE
      AND usr.title_id IS NOT NULL
    GROUP BY fc.user_id, usr.title_id
  ),
  social_component AS (
    SELECT
      COALESCE(fr.user_id, frec.user_id) AS user_id,
      COALESCE(fr.title_id, frec.title_id) AS title_id,
      CASE
        WHEN fr.friend_rating_score IS NOT NULL AND frec.friend_recommendation_score IS NOT NULL THEN
          LEAST(GREATEST(((fr.friend_rating_score + frec.friend_recommendation_score) / 2.0), 0.0), 1.0)::real
        ELSE
          LEAST(GREATEST(GREATEST(COALESCE(fr.friend_rating_score, 0.0), COALESCE(frec.friend_recommendation_score, 0.0)), 0.0), 1.0)::real
      END AS social_component_score
    FROM friend_ratings fr
    FULL OUTER JOIN friend_recs frec
      ON fr.user_id = frec.user_id
     AND fr.title_id = frec.title_id
  ),
  -- Simplified priority calculation - avoid expensive calculate_taste_similarity calls
  priority AS (
    SELECT
      fc.user_id,
      usr.title_id,
      MAX(
        CASE
          WHEN fc.trust_score >= 0.8 THEN 1.0
          WHEN fc.trust_score >= 0.5 THEN 0.85
          ELSE 0.50
        END
      )::real AS social_priority_score
    FROM public.friend_connections fc
    JOIN recent_users ru ON ru.user_id = fc.user_id
    JOIN public.user_social_recommendations usr
      ON usr.receiver_user_id = fc.user_id
     AND usr.sender_user_id   = fc.friend_user_id
    WHERE fc.is_blocked = FALSE
    GROUP BY fc.user_id, usr.title_id
  )
  INSERT INTO public.user_title_social_scores (
    user_id,
    title_id,
    social_component_score,
    social_priority_score,
    updated_at
  )
  SELECT
    sc.user_id,
    sc.title_id,
    sc.social_component_score,
    COALESCE(p.social_priority_score, 0.0)::real AS social_priority_score,
    now()
  FROM social_component sc
  LEFT JOIN priority p
    ON p.user_id = sc.user_id
   AND p.title_id = sc.title_id
  ON CONFLICT (user_id, title_id)
  DO UPDATE SET
    social_component_score = EXCLUDED.social_component_score,
    social_priority_score  = EXCLUDED.social_priority_score,
    updated_at             = now();
END;
$function$;