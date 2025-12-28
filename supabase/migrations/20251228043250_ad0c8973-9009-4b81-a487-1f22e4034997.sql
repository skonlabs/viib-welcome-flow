-- Remove old recommendation functions, keep only v3
DROP FUNCTION IF EXISTS public.get_top_recommendations(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(UUID, INTEGER);