-- Fix: validate_recommendation_data_health still inserting NULL into error_message (NOT NULL column)
CREATE OR REPLACE FUNCTION public.validate_recommendation_data_health(p_strict boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_titles_total int;
  v_titles_complete int;
  v_titles_with_vectors int;
  v_titles_with_intent int;
  v_titles_with_social int;
  v_cache_rows bigint;
  v_emotions int;
  v_msg text := '';
  v_ok boolean := true;
  v_result jsonb;
begin
  select count(*) into v_titles_total from public.titles;
  select count(*) into v_titles_complete from public.titles where classification_status = 'complete';

  select count(*) into v_titles_with_vectors from public.title_emotion_vectors;
  select count(*) into v_titles_with_social from public.title_social_summary;

  select count(distinct title_id) into v_titles_with_intent from public.title_intent_alignment_scores;

  select count(*) into v_emotions from public.emotion_master;
  select count(*) into v_cache_rows from public.title_user_emotion_match_cache;

  if v_titles_complete = 0 then
    v_ok := false;
    v_msg := v_msg || 'No complete titles. ';
  end if;

  if v_titles_with_vectors < greatest(1, (v_titles_complete * 0.80)::int) then
    v_ok := false;
    v_msg := v_msg || 'Low title_emotion_vectors coverage. ';
  end if;

  if v_titles_with_intent < greatest(1, (v_titles_complete * 0.60)::int) then
    v_ok := false;
    v_msg := v_msg || 'Low title_intent_alignment_scores coverage. ';
  end if;

  if v_emotions > 0 and v_cache_rows < (v_emotions * greatest(1, (v_titles_complete * 0.50)::int)) then
    v_ok := false;
    v_msg := v_msg || 'Low title_user_emotion_match_cache coverage. ';
  end if;

  v_result := jsonb_build_object(
    'ok', v_ok,
    'message', coalesce(nullif(v_msg,''), 'OK'),
    'titles_total', v_titles_total,
    'titles_complete', v_titles_complete,
    'titles_with_vectors', v_titles_with_vectors,
    'titles_with_intent_distinct', v_titles_with_intent,
    'titles_with_social', v_titles_with_social,
    'emotion_count', v_emotions,
    'cache_rows', v_cache_rows,
    'checked_at', now()
  );

  -- FIX: Use 'Health check passed' instead of NULL to satisfy NOT NULL constraint
  insert into public.system_logs(severity, operation, error_message, context)
  values (
    case when v_ok then 'info' else (case when p_strict then 'error' else 'warning' end) end,
    'validate_recommendation_data_health',
    case when v_ok then 'Health check passed' else v_msg end,
    v_result
  );

  if p_strict and not v_ok then
    raise exception 'Recommendation health check failed: %', v_msg;
  end if;

  return v_result;
end;
$$;