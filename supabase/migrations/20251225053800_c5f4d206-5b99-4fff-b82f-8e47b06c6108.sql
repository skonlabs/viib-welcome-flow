
-- Drop and recreate with cursor support
CREATE OR REPLACE FUNCTION public.get_titles_with_all_streaming_services(
  p_limit integer DEFAULT 100,
  p_cursor uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, tmdb_id integer, title_type text, name text)
LANGUAGE sql
STABLE
AS $function$
  WITH service_counts AS (
    SELECT 
      tsa.title_id,
      COUNT(DISTINCT tsa.streaming_service_id) as service_count
    FROM title_streaming_availability tsa
    WHERE tsa.region_code = 'US'
    GROUP BY tsa.title_id
  ),
  active_services AS (
    SELECT COUNT(*) as total FROM streaming_services WHERE is_active = true
  ),
  corrupted_title_ids AS (
    SELECT sc.title_id
    FROM service_counts sc, active_services act
    WHERE sc.service_count >= act.total - 1
  )
  SELECT t.id, t.tmdb_id::integer, t.title_type, t.name
  FROM titles t
  JOIN corrupted_title_ids cti ON cti.title_id = t.id
  WHERE t.tmdb_id IS NOT NULL
    AND (p_cursor IS NULL OR t.id > p_cursor)
  ORDER BY t.id
  LIMIT p_limit;
$function$;
