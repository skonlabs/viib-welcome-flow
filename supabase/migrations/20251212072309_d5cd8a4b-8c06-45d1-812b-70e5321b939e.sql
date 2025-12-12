-- Add longer statement timeout to heavy refresh functions
-- These process large datasets and need more time

CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout = '300s'
AS $function$
    INSERT INTO title_emotion_vectors (
        title_id, valence, arousal, dominance, emotion_strength, updated_at
    )
    SELECT
        tes.title_id,
        AVG(em.valence   * (tes.intensity_level / 10.0)) AS valence,
        AVG(em.arousal   * (tes.intensity_level / 10.0)) AS arousal,
        AVG(em.dominance * (tes.intensity_level / 10.0)) AS dominance,
        AVG(tes.intensity_level / 10.0)                  AS emotion_strength,
        NOW()                                            AS updated_at
    FROM title_emotional_signatures tes
    JOIN emotion_master em ON em.id = tes.emotion_id
    GROUP BY tes.title_id
    ON CONFLICT (title_id) DO UPDATE
    SET
        valence          = EXCLUDED.valence,
        arousal          = EXCLUDED.arousal,
        dominance        = EXCLUDED.dominance,
        emotion_strength = EXCLUDED.emotion_strength,
        updated_at       = EXCLUDED.updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout = '300s'
AS $function$
    INSERT INTO title_transformation_scores (
        user_emotion_id, title_id, transformation_score, updated_at
    )
    SELECT
        etm.user_emotion_id,
        tes.title_id,
        COALESCE(
            SUM(
                etm.confidence_score *
                CASE etm.transformation_type
                    WHEN 'complementary'      THEN 1.0
                    WHEN 'neutral_balancing'  THEN 0.8
                    WHEN 'reinforcing'        THEN 0.7
                    ELSE 0.5
                END *
                (tes.intensity_level / 10.0)
            ) / NULLIF(SUM(etm.confidence_score), 0),
            0.0
        ) AS transformation_score,
        NOW() AS updated_at
    FROM emotion_transformation_map etm
    JOIN emotion_master em_user
      ON em_user.id = etm.user_emotion_id
     AND em_user.category = 'user_state'
    JOIN title_emotional_signatures tes
      ON tes.emotion_id = etm.content_emotion_id
    GROUP BY etm.user_emotion_id, tes.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE
    SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at           = EXCLUDED.updated_at;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_title_intent_alignment_scores()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout = '300s'
AS $function$
    INSERT INTO title_intent_alignment_scores (
        user_emotion_id, title_id, alignment_score, updated_at
    )
    SELECT
        e2i.emotion_id AS user_emotion_id,
        vit.title_id,
        COALESCE(
            SUM(e2i.weight * vit.confidence_score)
            / NULLIF(SUM(e2i.weight), 0),
            0.7
        ) AS alignment_score,
        NOW() AS updated_at
    FROM emotion_to_intent_map e2i
    JOIN viib_intent_classified_titles vit
      ON vit.intent_type = e2i.intent_type
    GROUP BY e2i.emotion_id, vit.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE
    SET
        alignment_score = EXCLUDED.alignment_score,
        updated_at      = EXCLUDED.updated_at;
$function$;