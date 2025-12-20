-- ============================================================================
-- RENAME TABLES: title_emotional_signatures -> viib_emotion_classified_titles
-- ============================================================================

-- 1. Rename the main table
ALTER TABLE IF EXISTS public.title_emotional_signatures 
RENAME TO viib_emotion_classified_titles;

-- 2. Rename the staging table
ALTER TABLE IF EXISTS public.title_emotional_signatures_staging 
RENAME TO viib_emotion_classified_titles_staging;

-- 3. Rename indexes on the main table (safe with IF EXISTS)
ALTER INDEX IF EXISTS idx_title_emotional_signatures_title_id 
RENAME TO idx_viib_emotion_classified_titles_title_id;

ALTER INDEX IF EXISTS title_emotional_signatures_title_id_emotion_id_key 
RENAME TO viib_emotion_classified_titles_title_id_emotion_id_key;

-- 4. Rename indexes on the staging table
ALTER INDEX IF EXISTS idx_title_emotional_signatures_staging_title_created 
RENAME TO idx_viib_emotion_classified_titles_staging_title_created;

ALTER INDEX IF EXISTS title_emotional_signatures_staging_title_id_emotion_id_key 
RENAME TO viib_emotion_classified_titles_staging_title_id_emotion_id_key;

-- 5. Rename foreign key constraints on the main table
ALTER TABLE public.viib_emotion_classified_titles 
RENAME CONSTRAINT title_emotional_signatures_emotion_id_fkey 
TO viib_emotion_classified_titles_emotion_id_fkey;

ALTER TABLE public.viib_emotion_classified_titles 
RENAME CONSTRAINT title_emotional_signatures_title_id_fkey 
TO viib_emotion_classified_titles_title_id_fkey;

-- 6. Rename foreign key constraints on the staging table
ALTER TABLE public.viib_emotion_classified_titles_staging 
RENAME CONSTRAINT title_emotional_signatures_staging_emotion_id_fkey 
TO viib_emotion_classified_titles_staging_emotion_id_fkey;

ALTER TABLE public.viib_emotion_classified_titles_staging 
RENAME CONSTRAINT title_emotional_signatures_staging_title_id_fkey 
TO viib_emotion_classified_titles_staging_title_id_fkey;

-- 7. Rename trigger if it exists (using DO block for conditional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_title_emotional_signatures_updated_at') THEN
        ALTER TRIGGER update_title_emotional_signatures_updated_at 
        ON public.viib_emotion_classified_titles 
        RENAME TO update_viib_emotion_classified_titles_updated_at;
    END IF;
END $$;

-- ============================================================================
-- UPDATE DATABASE FUNCTIONS
-- ============================================================================

-- 8. Update get_titles_needing_classification function
CREATE OR REPLACE FUNCTION public.get_titles_needing_classification(p_cursor uuid DEFAULT NULL::uuid, p_limit integer DEFAULT NULL::integer)
 RETURNS TABLE(id uuid, name text, title_type text, overview text, trailer_transcript text, original_language text, title_genres json)
 LANGUAGE sql
 STABLE
 SET statement_timeout TO '120s'
AS $function$
  SELECT DISTINCT ON (t.id)
    t.id,
    t.name,
    t.title_type,
    t.overview,
    t.trailer_transcript,
    t.original_language,
    t.title_genres
  FROM titles t
  LEFT JOIN viib_emotion_classified_titles ves ON ves.title_id = t.id
  LEFT JOIN viib_emotion_classified_titles_staging vess ON vess.title_id = t.id
  LEFT JOIN viib_intent_classified_titles vit ON vit.title_id = t.id
  LEFT JOIN viib_intent_classified_titles_staging vits ON vits.title_id = t.id
  WHERE
    (p_cursor IS NULL OR t.id > p_cursor)
    AND (
      (ves.title_id IS NULL AND vess.title_id IS NULL)
      OR (ves.title_id IS NOT NULL AND ves.updated_at < NOW() - INTERVAL '7 days')
      OR (vit.title_id IS NULL AND vits.title_id IS NULL)
      OR (vit.title_id IS NOT NULL AND vit.updated_at < NOW() - INTERVAL '7 days')
    )
  ORDER BY t.id ASC
  LIMIT p_limit;
$function$;

-- 9. Update get_job_classification_metrics function
CREATE OR REPLACE FUNCTION public.get_job_classification_metrics()
 RETURNS TABLE(total_titles bigint, emotion_primary_distinct bigint, emotion_staging_distinct bigint, intent_primary_distinct bigint, intent_staging_distinct bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    (SELECT COUNT(*) FROM titles) AS total_titles,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles) AS emotion_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_emotion_classified_titles_staging) AS emotion_staging_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles) AS intent_primary_distinct,
    (SELECT COUNT(DISTINCT title_id) FROM viib_intent_classified_titles_staging) AS intent_staging_distinct;
$function$;

-- 10. Update viib_score_components function
CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
 RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
 LANGUAGE plpgsql
AS $function$
declare
    v_user_emotion_id uuid;
    v_user_valence real;
    v_user_arousal real;
    v_user_dominance real;
    v_user_intensity real;
    v_title_valence real;
    v_title_arousal real;
    v_title_dominance real;
    v_user_norm real;
    v_title_norm real;
    v_direct_cosine real := null;
    v_transformation_score real := null;
    v_emotional_score real := 0.5;
    v_has_emotion_data boolean := false;
    v_friend_rating_score real := 0.0;
    v_friend_recommendation_score real := 0.0;
    v_has_strong_history boolean := false;
    v_has_wishlist boolean := false;
    v_avg_session_minutes real;
    v_runtime_minutes real;
    v_diff_ratio real;
    v_interaction_exists boolean := false;
begin
    emotional_component := 0.5;
    social_component := 0.0;
    historical_component := 0.0;
    context_component := 0.5;
    novelty_component := 1.0;

    select ues.emotion_id, ues.valence, ues.arousal, ues.dominance, ues.intensity
    into v_user_emotion_id, v_user_valence, v_user_arousal, v_user_dominance, v_user_intensity
    from user_emotion_states ues
    where ues.user_id = p_user_id
    order by created_at desc limit 1;

    if v_user_emotion_id is not null then
        select
            coalesce(avg(em.valence * (vec.intensity_level / 10.0)), null),
            coalesce(avg(em.arousal * (vec.intensity_level / 10.0)), null),
            coalesce(avg(em.dominance * (vec.intensity_level / 10.0)), null)
        into v_title_valence, v_title_arousal, v_title_dominance
        from viib_emotion_classified_titles vec
        join emotion_master em on em.id = vec.emotion_id
        where vec.title_id = p_title_id;

        select exists (select 1 from viib_emotion_classified_titles vec2 where vec2.title_id = p_title_id)
        into v_has_emotion_data;

        if v_has_emotion_data then
            v_user_norm := sqrt(power(v_user_valence,2) + power(v_user_arousal,2) + power(v_user_dominance,2));
            v_title_norm := sqrt(power(v_title_valence,2) + power(v_title_arousal,2) + power(v_title_dominance,2));
            if v_user_norm > 0 and v_title_norm > 0 then
                v_direct_cosine := (v_user_valence * v_title_valence + v_user_arousal * v_title_arousal + v_user_dominance * v_title_dominance) / (v_user_norm * v_title_norm);
                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            end if;
            v_emotional_score := 0.5 * coalesce(v_direct_cosine, 0) + 0.5 * coalesce(v_transformation_score, 0);
            emotional_component := least(greatest(v_emotional_score, 0.0), 1.0);
        end if;
    end if;

    select coalesce(avg(case uti.rating_value when 'love_it' then 1.0 when 'like_it' then 0.75 when 'ok' then 0.5 else 0.0 end * fc.trust_score), 0)
    into v_friend_rating_score
    from friend_connections fc
    join user_title_interactions uti on uti.user_id = fc.friend_user_id and uti.title_id = p_title_id
    where fc.user_id = p_user_id and (fc.is_blocked is null or fc.is_blocked = false);

    select coalesce(avg(fc.trust_score * 0.8), 0)
    into v_friend_recommendation_score
    from user_social_recommendations usr
    join friend_connections fc on fc.user_id = p_user_id and fc.friend_user_id = usr.sender_user_id
    where usr.receiver_user_id = p_user_id and usr.title_id = p_title_id;

    if v_friend_rating_score > 0 and v_friend_recommendation_score > 0 then
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    else
        social_component := greatest(v_friend_rating_score, v_friend_recommendation_score);
    end if;
    social_component := least(greatest(social_component, 0.0), 1.0);

    select bool_or(interaction_type in ('completed','liked') and rating_value in ('love_it','like_it')), bool_or(interaction_type = 'wishlisted')
    into v_has_strong_history, v_has_wishlist
    from user_title_interactions where user_id = p_user_id and title_id = p_title_id;

    if v_has_strong_history then historical_component := 1.0;
    elsif v_has_wishlist then historical_component := 0.5;
    else historical_component := 0.0;
    end if;

    select coalesce(avg(session_length_seconds) / 60.0, null) into v_avg_session_minutes from user_context_logs where user_id = p_user_id;
    select t.runtime::real into v_runtime_minutes from titles t where t.id = p_title_id;

    if v_avg_session_minutes is not null and v_runtime_minutes is not null then
        v_diff_ratio := abs(v_runtime_minutes - v_avg_session_minutes) / greatest(v_runtime_minutes, v_avg_session_minutes);
        context_component := least(greatest(1.0 - v_diff_ratio, 0.0), 1.0);
    else
        context_component := 0.5;
    end if;

    select exists (select 1 from user_title_interactions where user_id = p_user_id and title_id = p_title_id) into v_interaction_exists;
    if v_interaction_exists then novelty_component := 0.3; else novelty_component := 1.0; end if;

    return query select emotional_component, social_component, historical_component, context_component, novelty_component;
end;
$function$;

-- 11. Update refresh_title_emotion_vectors function
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
AS $function$
    INSERT INTO title_emotion_vectors (title_id, valence, arousal, dominance, emotion_strength, updated_at)
    SELECT
        vec.title_id,
        AVG(em.valence * (vec.intensity_level / 10.0)) AS valence,
        AVG(em.arousal * (vec.intensity_level / 10.0)) AS arousal,
        AVG(em.dominance * (vec.intensity_level / 10.0)) AS dominance,
        AVG(vec.intensity_level / 10.0) AS emotion_strength,
        NOW() AS updated_at
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    GROUP BY vec.title_id
    ON CONFLICT (title_id) DO UPDATE SET
        valence = EXCLUDED.valence,
        arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance,
        emotion_strength = EXCLUDED.emotion_strength,
        updated_at = EXCLUDED.updated_at;
$function$;

-- 12. Update refresh_title_transformation_scores function
CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
 RETURNS void
 LANGUAGE sql
 SET statement_timeout TO '300s'
AS $function$
    INSERT INTO title_transformation_scores (user_emotion_id, title_id, transformation_score, updated_at)
    SELECT
        etm.user_emotion_id,
        vec.title_id,
        COALESCE(SUM(etm.confidence_score * CASE etm.transformation_type WHEN 'complementary' THEN 1.0 WHEN 'neutral_balancing' THEN 0.8 WHEN 'reinforcing' THEN 0.7 ELSE 0.5 END * (vec.intensity_level / 10.0)) / NULLIF(SUM(etm.confidence_score), 0), 0.0) AS transformation_score,
        NOW() AS updated_at
    FROM emotion_transformation_map etm
    JOIN emotion_master em_user ON em_user.id = etm.user_emotion_id AND em_user.category = 'user_state'
    JOIN viib_emotion_classified_titles vec ON vec.emotion_id = etm.content_emotion_id
    GROUP BY etm.user_emotion_id, vec.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = EXCLUDED.updated_at;
$function$;

-- 13. Update get_top_recommendations function
CREATE OR REPLACE FUNCTION public.get_top_recommendations(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, final_score real)
 LANGUAGE sql
 STABLE
AS $function$
WITH
wf AS (
    SELECT COALESCE(emotional_weight, 0.35) AS w_emotional, COALESCE(social_weight, 0.20) AS w_social, COALESCE(historical_weight, 0.25) AS w_historical, COALESCE(context_weight, 0.10) AS w_context, COALESCE(novelty_weight, 0.10) AS w_novelty
    FROM viib_weight_config WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1
),
ue AS (
    SELECT emotion_id, valence, arousal, dominance, COALESCE(intensity, 0.7) AS intensity
    FROM user_emotion_states WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1
),
us AS (
    SELECT AVG(session_length_seconds) / 60.0 AS avg_session_minutes FROM user_context_logs WHERE user_id = p_user_id
),
te AS (
    SELECT vec.title_id, AVG(em.valence * (vec.intensity_level / 10.0)) AS v, AVG(em.arousal * (vec.intensity_level / 10.0)) AS a, AVG(em.dominance * (vec.intensity_level / 10.0)) AS d
    FROM viib_emotion_classified_titles vec JOIN emotion_master em ON em.id = vec.emotion_id GROUP BY vec.title_id
),
tr AS (
    SELECT vec.title_id, SUM(etm.confidence_score * CASE etm.transformation_type WHEN 'complementary' THEN 1.0 WHEN 'neutral_balancing' THEN 0.7 WHEN 'reinforcing' THEN 0.6 ELSE 0.5 END * (vec.intensity_level / 10.0)) / NULLIF(SUM(etm.confidence_score), 0) AS score
    FROM ue JOIN emotion_transformation_map etm ON etm.user_emotion_id = ue.emotion_id JOIN viib_emotion_classified_titles vec ON vec.emotion_id = etm.content_emotion_id GROUP BY vec.title_id
),
ui AS (
    SELECT title_id, BOOL_OR(interaction_type IN ('completed','liked')) AS strong_like, BOOL_OR(interaction_type = 'wishlisted') AS wishlisted, MAX(created_at) AS last_interaction_at, COUNT(*) AS cnt
    FROM user_title_interactions WHERE user_id = p_user_id GROUP BY title_id
),
sr AS (
    SELECT uti.title_id, AVG(CASE uti.rating_value WHEN 'love_it' THEN 1.0 WHEN 'like_it' THEN 0.75 WHEN 'ok' THEN 0.5 ELSE 0.0 END * fc.trust_score) AS score
    FROM friend_connections fc JOIN user_title_interactions uti ON uti.user_id = fc.friend_user_id WHERE fc.user_id = p_user_id AND fc.is_blocked = FALSE GROUP BY uti.title_id
),
srec AS (
    SELECT usr.title_id, MAX(fc.trust_score) AS trust
    FROM user_social_recommendations usr JOIN friend_connections fc ON fc.friend_user_id = usr.sender_user_id AND fc.user_id = p_user_id AND fc.is_blocked = FALSE
    WHERE usr.receiver_user_id = p_user_id GROUP BY usr.title_id
),
candidates AS (
    SELECT DISTINCT t.id FROM titles t
    WHERE t.classification_status = 'complete'
      AND EXISTS (SELECT 1 FROM title_streaming_availability tsa JOIN user_streaming_subscriptions uss ON uss.streaming_service_id = tsa.streaming_service_id AND uss.user_id = p_user_id AND uss.is_active = TRUE WHERE tsa.title_id = t.id)
      AND t.original_language IN (SELECT language_code FROM user_language_preferences WHERE user_id = p_user_id)
      AND NOT EXISTS (SELECT 1 FROM user_title_interactions uti WHERE uti.user_id = p_user_id AND uti.title_id = t.id AND uti.interaction_type IN ('completed','disliked'))
),
pf AS (
    SELECT c.id AS title_id, COALESCE(t.popularity, 0) AS pop, COALESCE(ui.cnt, 0) AS seen
    FROM candidates c JOIN titles t ON t.id = c.id LEFT JOIN ui ON ui.title_id = c.id ORDER BY pop DESC, seen ASC LIMIT 300
),
components AS (
    SELECT pf.title_id,
        CASE WHEN ue.emotion_id IS NULL OR te.title_id IS NULL THEN 0.5 ELSE GREATEST(LEAST((COALESCE(((((ue.valence * te.v + ue.arousal * te.a + ue.dominance * te.d) / NULLIF(sqrt(ue.valence^2 + ue.arousal^2 + ue.dominance^2) * sqrt(te.v^2 + te.a^2 + te.d^2), 0)) + 1.0) / 2.0), 0.5) * (1.0 - tw.trans_wt) + COALESCE(tr.score, 0.0) * tw.trans_wt), 1.0), 0.0) END AS emotional,
        GREATEST(LEAST(COALESCE(sr.score, 0.0) * 0.6 + COALESCE(srec.trust, 0.0) * 0.4, 1.0), 0.0) AS social,
        CASE WHEN ui.strong_like THEN EXP(-EXTRACT(DAY FROM (NOW() - ui.last_interaction_at)) / 180.0) WHEN ui.wishlisted THEN 0.5 ELSE 0.0 END AS historical,
        CASE WHEN us.avg_session_minutes IS NULL OR t.runtime IS NULL THEN 0.5 ELSE GREATEST(LEAST(1.0 - ABS(t.runtime::REAL - us.avg_session_minutes) / GREATEST(t.runtime::REAL, us.avg_session_minutes), 1.0), 0.0) END AS context,
        CASE WHEN ui.cnt IS NULL OR ui.cnt = 0 THEN CASE WHEN ue.valence < 0.4 AND ue.dominance < 0.4 THEN 0.4 ELSE 1.0 END ELSE 0.3 END AS novelty
    FROM pf JOIN titles t ON t.id = pf.title_id LEFT JOIN ue ON TRUE LEFT JOIN us ON TRUE LEFT JOIN te ON te.title_id = pf.title_id LEFT JOIN tr ON tr.title_id = pf.title_id LEFT JOIN ui ON ui.title_id = pf.title_id LEFT JOIN sr ON sr.title_id = pf.title_id LEFT JOIN srec ON srec.title_id = pf.title_id
    CROSS JOIN LATERAL (SELECT CASE WHEN tr.score IS NULL THEN 0.0 WHEN ue.intensity < 0.4 THEN 0.3 ELSE 0.6 END AS trans_wt) tw
),
base AS (
    SELECT c.title_id, (c.emotional * wf.w_emotional) + (c.social * wf.w_social) + (c.historical * wf.w_historical) + (c.context * wf.w_context) + (c.novelty * wf.w_novelty) AS base_viib_score
    FROM components c CROSS JOIN wf
),
intent AS (
    SELECT title_id, COALESCE(alignment_score, 0.7) AS intent_alignment_score FROM title_intent_alignment_scores
)
SELECT b.title_id, b.base_viib_score, COALESCE(i.intent_alignment_score, 0.7) AS intent_alignment_score, COALESCE(srec.trust, 0.0) AS social_priority_score, GREATEST(b.base_viib_score * COALESCE(i.intent_alignment_score, 0.7), b.base_viib_score * 0.7 + COALESCE(srec.trust, 0.0) * 0.3) AS final_score
FROM base b LEFT JOIN intent i ON i.title_id = b.title_id LEFT JOIN srec ON srec.title_id = b.title_id ORDER BY final_score DESC LIMIT p_limit;
$function$;