
-- =============================================================
-- FIX 1: refresh_title_emotion_vectors should only update
-- updated_at when values actually change (prevents false 
-- "recently updated" signals for hourly incremental logic)
-- =============================================================
CREATE OR REPLACE FUNCTION public.refresh_title_emotion_vectors()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
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
        valence = EXCLUDED.valence, arousal = EXCLUDED.arousal,
        dominance = EXCLUDED.dominance, emotion_strength = EXCLUDED.emotion_strength,
        -- Only bump updated_at when values actually changed
        updated_at = CASE
          WHEN title_emotion_vectors.valence IS DISTINCT FROM EXCLUDED.valence
            OR title_emotion_vectors.arousal IS DISTINCT FROM EXCLUDED.arousal
            OR title_emotion_vectors.dominance IS DISTINCT FROM EXCLUDED.dominance
            OR title_emotion_vectors.emotion_strength IS DISTINCT FROM EXCLUDED.emotion_strength
          THEN NOW()
          ELSE title_emotion_vectors.updated_at
        END;
$$;

-- =============================================================
-- FIX 2: Rewrite refresh_title_user_emotion_match_cache with
-- smaller batches (100), internal statement_timeout, and 
-- proper incremental support
-- =============================================================
CREATE OR REPLACE FUNCTION public.refresh_title_user_emotion_match_cache(p_title_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '600s'
AS $$
declare
  v_batch_size int := 100;
  v_offset int := 0;
  v_batch_ids uuid[];
  v_total_processed int := 0;
begin
  -- If specific title_ids provided, process them in small batches too
  if p_title_ids is not null then
    -- Small set: process in mini-batches of 100
    for v_offset in 0..ceil(array_length(p_title_ids, 1)::float / v_batch_size)::int - 1 loop
      v_batch_ids := p_title_ids[(v_offset * v_batch_size + 1):((v_offset + 1) * v_batch_size)];

      with titles_src as (
        select tev.title_id, tev.valence, tev.arousal, tev.dominance
        from public.title_emotion_vectors tev
        where tev.title_id = any(v_batch_ids)
      ),
      emotions_src as (
        select em.id as emotion_id, em.valence, em.arousal, em.dominance
        from public.emotion_master em
        where em.valence is not null and em.arousal is not null and em.dominance is not null
      ),
      calc as (
        select t.title_id, e.emotion_id as user_emotion_id,
          greatest(0.0, least(1.0,
            (((t.valence*e.valence) + (t.arousal*e.arousal) + (t.dominance*e.dominance))
            / nullif(sqrt(t.valence*t.valence + t.arousal*t.arousal + t.dominance*t.dominance)
              * sqrt(e.valence*e.valence + e.arousal*e.arousal + e.dominance*e.dominance), 0.0)
            + 1.0) / 2.0
          ))::real as cosine_score
        from titles_src t cross join emotions_src e
      )
      insert into public.title_user_emotion_match_cache(title_id, user_emotion_id, cosine_score, updated_at)
      select c.title_id, c.user_emotion_id, c.cosine_score, now() from calc c
      on conflict (title_id, user_emotion_id)
      do update set cosine_score = excluded.cosine_score, updated_at = now();

      -- Update transformation scores for this batch
      update public.title_user_emotion_match_cache c
      set transformation_score = tts.transformation_score, updated_at = now()
      from public.title_transformation_scores tts
      where c.title_id = tts.title_id and c.user_emotion_id = tts.user_emotion_id
        and c.title_id = any(v_batch_ids);

      v_total_processed := v_total_processed + array_length(v_batch_ids, 1);
    end loop;

    return;
  end if;

  -- Full refresh: process in smaller batches to avoid statement timeout
  v_offset := 0;
  loop
    select array_agg(title_id) into v_batch_ids
    from (
      select tev.title_id
      from public.title_emotion_vectors tev
      order by tev.title_id
      limit v_batch_size offset v_offset
    ) sub;

    exit when v_batch_ids is null or array_length(v_batch_ids, 1) is null;

    with titles_src as (
      select tev.title_id, tev.valence, tev.arousal, tev.dominance
      from public.title_emotion_vectors tev
      where tev.title_id = any(v_batch_ids)
    ),
    emotions_src as (
      select em.id as emotion_id, em.valence, em.arousal, em.dominance
      from public.emotion_master em
      where em.valence is not null and em.arousal is not null and em.dominance is not null
    ),
    calc as (
      select t.title_id, e.emotion_id as user_emotion_id,
        greatest(0.0, least(1.0,
          (((t.valence*e.valence) + (t.arousal*e.arousal) + (t.dominance*e.dominance))
          / nullif(sqrt(t.valence*t.valence + t.arousal*t.arousal + t.dominance*t.dominance)
            * sqrt(e.valence*e.valence + e.arousal*e.arousal + e.dominance*e.dominance), 0.0)
          + 1.0) / 2.0
        ))::real as cosine_score
      from titles_src t cross join emotions_src e
    )
    insert into public.title_user_emotion_match_cache(title_id, user_emotion_id, cosine_score, updated_at)
    select c.title_id, c.user_emotion_id, c.cosine_score, now() from calc c
    on conflict (title_id, user_emotion_id)
    do update set cosine_score = excluded.cosine_score, updated_at = now();

    update public.title_user_emotion_match_cache c
    set transformation_score = tts.transformation_score, updated_at = now()
    from public.title_transformation_scores tts
    where c.title_id = tts.title_id and c.user_emotion_id = tts.user_emotion_id
      and c.title_id = any(v_batch_ids);

    v_total_processed := v_total_processed + array_length(v_batch_ids, 1);
    v_offset := v_offset + v_batch_size;
  end loop;
end;
$$;

-- =============================================================
-- FIX 3: Fix run_recommendation_refresh hourly mode to use
-- titles.updated_at instead of title_emotion_vectors.updated_at
-- (which gets refreshed every run). Also increase statement_timeout.
-- =============================================================
CREATE OR REPLACE FUNCTION public.run_recommendation_refresh(p_mode text DEFAULT 'daily')
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
SET statement_timeout = '900s'
AS $$
declare
  v_run_id uuid;
  v_metrics jsonb := '{}'::jsonb;
  v_health jsonb;
  v_recent_title_ids uuid[];
begin
  -- Lock
  if not public.try_acquire_recommendation_refresh_lock() then
    raise exception 'Another recommendation refresh is already running.';
  end if;

  insert into public.recommendation_refresh_runs(mode, status)
  values (p_mode, 'running')
  returning id into v_run_id;

  begin
    -- Pre-check (non-strict)
    v_health := public.validate_recommendation_data_health(false);
    v_metrics := v_metrics || jsonb_build_object('pre_health', v_health);

    -- PHASE 2: Title intelligence
    perform public.refresh_title_emotion_vectors();
    perform public.refresh_title_transformation_scores();
    perform public.refresh_title_intent_alignment_scores();

    -- Emotion match cache: incremental for hourly, full for daily/weekly
    if lower(p_mode) = 'hourly' then
      -- Use titles.updated_at for truly new/changed content,
      -- NOT title_emotion_vectors.updated_at (which refreshes every run)
      select array_agg(tev.title_id) into v_recent_title_ids
      from public.title_emotion_vectors tev
      join public.titles t on t.id = tev.title_id
      where t.updated_at > now() - interval '3 hours';

      if v_recent_title_ids is not null and array_length(v_recent_title_ids, 1) > 0 then
        perform public.refresh_title_user_emotion_match_cache(v_recent_title_ids);
        v_metrics := v_metrics || jsonb_build_object('emotion_cache_mode', 'incremental', 'titles_processed', array_length(v_recent_title_ids, 1));
      else
        v_metrics := v_metrics || jsonb_build_object('emotion_cache_mode', 'skipped', 'reason', 'no recent updates');
      end if;
    else
      -- Full refresh for daily/weekly
      perform public.refresh_title_user_emotion_match_cache(null);
      v_metrics := v_metrics || jsonb_build_object('emotion_cache_mode', 'full');
    end if;

    -- PHASE 3: Social aggregation
    perform public.refresh_title_social_summary();

    begin
      perform public.refresh_user_title_social_scores_recent_users();
    exception when undefined_function then
      perform public.refresh_user_title_social_scores();
    end;

    -- PHASE 4: User personalization
    begin
      perform public.refresh_user_genre_preferences();
    exception when undefined_function then
      null;
    end;

    begin
      perform public.refresh_user_vibe_weights();
    exception when undefined_function then
      null;
    end;

    -- Fatigue scores
    perform public.refresh_user_title_fatigue_scores();

    -- Hourly vs Daily/Weekly extras
    if lower(p_mode) in ('daily','weekly') then
      perform public.refresh_cold_start_fallbacks(200);
      perform public.summarize_recommendation_outcomes_daily(60);
    end if;

    if lower(p_mode) = 'weekly' then
      perform public.prune_old_recommendation_logs(90, 180);

      begin
        perform public.refresh_viib_weight_config_from_outcomes(30);
      exception when undefined_function then
        null;
      end;

      perform public.validate_viib_weight_stability(0.25, 0.02, 0.60);
    end if;

    -- Post-check
    v_health := public.validate_recommendation_data_health(lower(p_mode) <> 'hourly');
    v_metrics := v_metrics || jsonb_build_object('post_health', v_health);

    update public.recommendation_refresh_runs
    set status='completed', finished_at=now(), metrics=v_metrics
    where id=v_run_id;

    perform public.release_recommendation_refresh_lock();

    return jsonb_build_object(
      'ok', true,
      'run_id', v_run_id,
      'mode', p_mode,
      'metrics', v_metrics
    );

  exception when others then
    update public.recommendation_refresh_runs
    set status='failed', finished_at=now(), error_message=sqlerrm, metrics=v_metrics
    where id=v_run_id;

    perform public.release_recommendation_refresh_lock();

    insert into public.system_logs(severity, operation, error_message, context)
    values ('error', 'run_recommendation_refresh', sqlerrm, jsonb_build_object('mode', p_mode, 'run_id', v_run_id));

    raise;
  end;
end;
$$;

-- =============================================================
-- FIX 4: Release any stuck lock from previous failed runs
-- =============================================================
SELECT public.release_recommendation_refresh_lock();
