-- Drop the OLD duplicate v6 (without p_mode parameter) and v3_3
DROP FUNCTION IF EXISTS public.get_top_recommendations_v6(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_top_recommendations_v3_3(uuid, integer) CASCADE;