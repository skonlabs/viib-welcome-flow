-- Disable RLS on all content/catalog tables
-- These tables contain system data (movies, TV shows, genres, etc.) that should be:
-- - Publicly readable by all users
-- - Writable only by service role (edge functions)

ALTER TABLE public.titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_genres DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_languages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_streaming_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.title_emotional_signatures DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_intent_classified_titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viib_title_intent_stats DISABLE ROW LEVEL SECURITY;

-- These are system/content tables, not user-specific data
-- RLS is unnecessary and blocks edge function writes