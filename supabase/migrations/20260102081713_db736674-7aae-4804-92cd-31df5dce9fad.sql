-- Drop old versions of get_top_recommendations
DROP FUNCTION IF EXISTS public.get_top_recommendations_v6(uuid, integer, uuid);
DROP FUNCTION IF EXISTS public.get_top_recommendations_v7(uuid, integer, uuid);