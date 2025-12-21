-- Create the missing function that the trigger is calling
CREATE OR REPLACE FUNCTION public.refresh_viib_title_intent_stats(p_title_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO viib_title_intent_stats (
    title_id,
    primary_intent_type,
    primary_confidence_score,
    intent_count,
    last_computed_at
  )
  SELECT
    p_title_id,
    (
      SELECT intent_type 
      FROM viib_intent_classified_titles 
      WHERE title_id = p_title_id 
      ORDER BY confidence_score DESC 
      LIMIT 1
    ),
    (
      SELECT confidence_score 
      FROM viib_intent_classified_titles 
      WHERE title_id = p_title_id 
      ORDER BY confidence_score DESC 
      LIMIT 1
    ),
    (
      SELECT COUNT(*)::integer 
      FROM viib_intent_classified_titles 
      WHERE title_id = p_title_id
    ),
    NOW()
  ON CONFLICT (title_id) DO UPDATE SET
    primary_intent_type = EXCLUDED.primary_intent_type,
    primary_confidence_score = EXCLUDED.primary_confidence_score,
    intent_count = EXCLUDED.intent_count,
    last_computed_at = EXCLUDED.last_computed_at;
$$;