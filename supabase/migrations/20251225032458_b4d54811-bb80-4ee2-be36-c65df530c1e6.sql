-- Create function to count titles with corrupted streaming data (all services assigned)
CREATE OR REPLACE FUNCTION get_corrupted_streaming_count()
RETURNS integer
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
  )
  SELECT COUNT(*)::integer
  FROM service_counts sc, active_services act
  WHERE sc.service_count >= act.total - 1;
$$;