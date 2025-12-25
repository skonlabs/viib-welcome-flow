-- Create RPC to get titles with all streaming services (corrupted data)
CREATE OR REPLACE FUNCTION get_titles_with_all_streaming_services(p_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, tmdb_id integer, title_type text, name text)
LANGUAGE sql
STABLE
AS $$
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
  LIMIT p_limit;
$$;