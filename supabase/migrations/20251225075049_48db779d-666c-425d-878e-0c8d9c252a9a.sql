-- Drop and recreate the function with optimized counting
CREATE OR REPLACE FUNCTION public.get_corrupted_streaming_count()
RETURNS integer
LANGUAGE sql
STABLE
SET statement_timeout = '30s'
AS $$
  SELECT COUNT(DISTINCT tsa.title_id)::integer
  FROM title_streaming_availability tsa
  INNER JOIN streaming_services ss ON tsa.streaming_service_id = ss.id AND ss.is_active = true
  GROUP BY tsa.title_id
  HAVING COUNT(DISTINCT tsa.streaming_service_id) = (SELECT COUNT(*) FROM streaming_services WHERE is_active = true)
$$;