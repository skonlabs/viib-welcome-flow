-- Drop old recommendation function versions v2, v3, v4, v5
DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v4(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v5(uuid, integer) CASCADE;