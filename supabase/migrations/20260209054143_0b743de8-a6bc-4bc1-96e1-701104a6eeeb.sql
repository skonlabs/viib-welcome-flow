-- Fix: refresh_title_user_emotion_match_cache times out on full catalog (111K × 73 = 8M+ rows)
-- Solution: Process in batches of 2000 titles when called with NULL (full refresh)

CREATE OR REPLACE FUNCTION public.refresh_title_user_emotion_match_cache(p_title_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '120s'
AS $$
declare
  v_batch_size int := 2000;
  v_offset int := 0;
  v_batch_ids uuid[];
  v_total int;
begin
  -- If specific title_ids provided, process them directly (small set)
  if p_title_ids is not null then
    -- Original single-pass logic for targeted refreshes
    with titles_src as (
      select tev.title_id, tev.valence, tev.arousal, tev.dominance
      from public.title_emotion_vectors tev
      where tev.title_id = any(p_title_ids)
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

    -- Update transformation scores for targeted titles
    update public.title_user_emotion_match_cache c
    set transformation_score = tts.transformation_score, updated_at = now()
    from public.title_transformation_scores tts
    where c.title_id = tts.title_id and c.user_emotion_id = tts.user_emotion_id
      and c.title_id = any(p_title_ids);

    return;
  end if;

  -- Full refresh: process in batches to avoid statement timeout
  select count(*) into v_total from public.title_emotion_vectors;

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

    -- Update transformation scores for this batch
    update public.title_user_emotion_match_cache c
    set transformation_score = tts.transformation_score, updated_at = now()
    from public.title_transformation_scores tts
    where c.title_id = tts.title_id and c.user_emotion_id = tts.user_emotion_id
      and c.title_id = any(v_batch_ids);

    v_offset := v_offset + v_batch_size;
  end loop;
end;
$$;