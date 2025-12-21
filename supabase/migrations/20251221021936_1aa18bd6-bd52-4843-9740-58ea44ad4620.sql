-- Add statement_timeout to refresh_title_intent_alignment_scores
CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '300s'
AS $function$
/*
Purpose: Materializes intent alignment between user emotions and titles.
*/
INSERT INTO title_intent_alignment_scores (
    user_emotion_id,
    title_id,
    alignment_score
)
SELECT
    e2i.emotion_id           AS user_emotion_id,
    vit.title_id             AS title_id,
    LEAST(
        GREATEST(
            COALESCE(
                SUM(e2i.weight * vit.confidence_score)
                / NULLIF(SUM(e2i.weight), 0),
                0.7
            ),
            0.0
        ),
        1.0
    ) AS alignment_score
FROM emotion_to_intent_map e2i
JOIN viib_intent_classified_titles vit
  ON vit.intent_type = e2i.intent_type
GROUP BY
    e2i.emotion_id,
    vit.title_id
ON CONFLICT (user_emotion_id, title_id)
DO UPDATE SET
    alignment_score = EXCLUDED.alignment_score;
$function$;

-- Add statement_timeout to refresh_title_social_summary
CREATE OR REPLACE FUNCTION public.refresh_title_social_summary()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
AS $function$
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
    )
    INSERT INTO title_social_summary (
        title_id, social_mean_rating, social_rec_power, updated_at
    )
    SELECT
        t.id AS title_id,
        COALESCE(r.mean_rating, 0.0) AS social_mean_rating,
        COALESCE(
            CASE
                WHEN ra.rec_count IS NULL OR ra.rec_count = 0 THEN 0.0
                ELSE LEAST(LOG(1 + ra.rec_count::REAL), 5.0)
            END,
            0.0
        ) AS social_rec_power,
        NOW() AS updated_at
    FROM titles t
    LEFT JOIN rating_agg r ON r.title_id = t.id
    LEFT JOIN rec_agg   ra ON ra.title_id = t.id
    ON CONFLICT (title_id) DO UPDATE
    SET
        social_mean_rating = EXCLUDED.social_mean_rating,
        social_rec_power   = EXCLUDED.social_rec_power,
        updated_at         = EXCLUDED.updated_at;
$function$;