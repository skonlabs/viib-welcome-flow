-- ============================================================================
-- Complete RLS Coverage for All Tables
-- Date: December 27, 2025
--
-- This migration ensures ALL tables have proper RLS policies.
-- Tables are categorized as:
-- 1. Content tables (public read, service-role write)
-- 2. System/config tables (service-role only)
-- 3. User-owned tables (auth-based access)
-- ============================================================================


-- ============================================================================
-- CONTENT TABLES: Public read, service-role write
-- These contain reference data that all users can read
-- ============================================================================

-- languages
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'languages') THEN
        ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "languages_public_read" ON public.languages;
        DROP POLICY IF EXISTS "languages_service_write" ON public.languages;
        CREATE POLICY "languages_public_read" ON public.languages FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "languages_service_write" ON public.languages FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- spoken_languages
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'spoken_languages') THEN
        ALTER TABLE public.spoken_languages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "spoken_languages_public_read" ON public.spoken_languages;
        DROP POLICY IF EXISTS "spoken_languages_service_write" ON public.spoken_languages;
        CREATE POLICY "spoken_languages_public_read" ON public.spoken_languages FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "spoken_languages_service_write" ON public.spoken_languages FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- title_spoken_languages
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_spoken_languages') THEN
        ALTER TABLE public.title_spoken_languages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_spoken_languages_public_read" ON public.title_spoken_languages;
        DROP POLICY IF EXISTS "title_spoken_languages_service_write" ON public.title_spoken_languages;
        CREATE POLICY "title_spoken_languages_public_read" ON public.title_spoken_languages FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "title_spoken_languages_service_write" ON public.title_spoken_languages FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- seasons
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seasons') THEN
        ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "seasons_public_read" ON public.seasons;
        DROP POLICY IF EXISTS "seasons_service_write" ON public.seasons;
        CREATE POLICY "seasons_public_read" ON public.seasons FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "seasons_service_write" ON public.seasons FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- episodes
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'episodes') THEN
        ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "episodes_public_read" ON public.episodes;
        DROP POLICY IF EXISTS "episodes_service_write" ON public.episodes;
        CREATE POLICY "episodes_public_read" ON public.episodes FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "episodes_service_write" ON public.episodes FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- providers
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'providers') THEN
        ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "providers_public_read" ON public.providers;
        DROP POLICY IF EXISTS "providers_service_write" ON public.providers;
        CREATE POLICY "providers_public_read" ON public.providers FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "providers_service_write" ON public.providers FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- title_providers
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_providers') THEN
        ALTER TABLE public.title_providers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_providers_public_read" ON public.title_providers;
        DROP POLICY IF EXISTS "title_providers_service_write" ON public.title_providers;
        CREATE POLICY "title_providers_public_read" ON public.title_providers FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "title_providers_service_write" ON public.title_providers FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- keywords
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'keywords') THEN
        ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "keywords_public_read" ON public.keywords;
        DROP POLICY IF EXISTS "keywords_service_write" ON public.keywords;
        CREATE POLICY "keywords_public_read" ON public.keywords FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "keywords_service_write" ON public.keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- title_keywords
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_keywords') THEN
        ALTER TABLE public.title_keywords ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_keywords_public_read" ON public.title_keywords;
        DROP POLICY IF EXISTS "title_keywords_service_write" ON public.title_keywords;
        CREATE POLICY "title_keywords_public_read" ON public.title_keywords FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "title_keywords_service_write" ON public.title_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- official_trailer_channels
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'official_trailer_channels') THEN
        ALTER TABLE public.official_trailer_channels ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "official_trailer_channels_public_read" ON public.official_trailer_channels;
        DROP POLICY IF EXISTS "official_trailer_channels_service_write" ON public.official_trailer_channels;
        CREATE POLICY "official_trailer_channels_public_read" ON public.official_trailer_channels FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "official_trailer_channels_service_write" ON public.official_trailer_channels FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- title_intent_alignment_scores (internal scoring table)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_intent_alignment_scores') THEN
        ALTER TABLE public.title_intent_alignment_scores ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_intent_alignment_scores_service" ON public.title_intent_alignment_scores;
        CREATE POLICY "title_intent_alignment_scores_service" ON public.title_intent_alignment_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ============================================================================
-- SYSTEM/CONFIG TABLES: Service-role only
-- These are administrative tables with no public access
-- ============================================================================

-- activation_codes
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activation_codes') THEN
        ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "activation_codes_service" ON public.activation_codes;
        CREATE POLICY "activation_codes_service" ON public.activation_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- jobs
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
        ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "jobs_service" ON public.jobs;
        CREATE POLICY "jobs_service" ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- email_config
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_config') THEN
        ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "email_config_service" ON public.email_config;
        CREATE POLICY "email_config_service" ON public.email_config FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- email_templates
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_templates') THEN
        ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "email_templates_service" ON public.email_templates;
        CREATE POLICY "email_templates_service" ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- rate_limit_config
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rate_limit_config') THEN
        ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "rate_limit_config_service" ON public.rate_limit_config;
        CREATE POLICY "rate_limit_config_service" ON public.rate_limit_config FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- viib_weight_config
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'viib_weight_config') THEN
        ALTER TABLE public.viib_weight_config ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "viib_weight_config_service" ON public.viib_weight_config;
        CREATE POLICY "viib_weight_config_service" ON public.viib_weight_config FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ============================================================================
-- USER-OWNED TABLES: Auth-based access
-- ============================================================================

-- vibe_list_views (user can view their own list views)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vibe_list_views') THEN
        ALTER TABLE public.vibe_list_views ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "vibe_list_views_auth" ON public.vibe_list_views;
        DROP POLICY IF EXISTS "vibe_list_views_service" ON public.vibe_list_views;
        CREATE POLICY "vibe_list_views_auth" ON public.vibe_list_views
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM vibe_lists
                    WHERE id = vibe_list_views.vibe_list_id
                    AND user_id = get_user_id_from_auth()
                )
            )
            WITH CHECK (viewer_user_id = get_user_id_from_auth());
        CREATE POLICY "vibe_list_views_service" ON public.vibe_list_views FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- vibe_list_followers (user can follow/unfollow lists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vibe_list_followers') THEN
        ALTER TABLE public.vibe_list_followers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "vibe_list_followers_auth" ON public.vibe_list_followers;
        DROP POLICY IF EXISTS "vibe_list_followers_service" ON public.vibe_list_followers;
        CREATE POLICY "vibe_list_followers_auth" ON public.vibe_list_followers
            FOR ALL TO authenticated
            USING (follower_user_id = get_user_id_from_auth())
            WITH CHECK (follower_user_id = get_user_id_from_auth());
        CREATE POLICY "vibe_list_followers_service" ON public.vibe_list_followers FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- vibe_list_shared_with (user can see lists shared with them)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vibe_list_shared_with') THEN
        ALTER TABLE public.vibe_list_shared_with ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "vibe_list_shared_with_auth" ON public.vibe_list_shared_with;
        DROP POLICY IF EXISTS "vibe_list_shared_with_service" ON public.vibe_list_shared_with;
        CREATE POLICY "vibe_list_shared_with_auth" ON public.vibe_list_shared_with
            FOR ALL TO authenticated
            USING (
                shared_with_user_id = get_user_id_from_auth()
                OR EXISTS (
                    SELECT 1 FROM vibe_lists
                    WHERE id = vibe_list_shared_with.vibe_list_id
                    AND user_id = get_user_id_from_auth()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM vibe_lists
                    WHERE id = vibe_list_shared_with.vibe_list_id
                    AND user_id = get_user_id_from_auth()
                )
            );
        CREATE POLICY "vibe_list_shared_with_service" ON public.vibe_list_shared_with FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- recommendation_outcomes (user can see their own recommendation outcomes)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recommendation_outcomes') THEN
        ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "recommendation_outcomes_auth" ON public.recommendation_outcomes;
        DROP POLICY IF EXISTS "recommendation_outcomes_service" ON public.recommendation_outcomes;
        CREATE POLICY "recommendation_outcomes_auth" ON public.recommendation_outcomes
            FOR ALL TO authenticated
            USING (user_id = get_user_id_from_auth())
            WITH CHECK (user_id = get_user_id_from_auth());
        CREATE POLICY "recommendation_outcomes_service" ON public.recommendation_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- user_title_social_scores (user can see their own scores)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_title_social_scores') THEN
        ALTER TABLE public.user_title_social_scores ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "user_title_social_scores_auth" ON public.user_title_social_scores;
        DROP POLICY IF EXISTS "user_title_social_scores_service" ON public.user_title_social_scores;
        CREATE POLICY "user_title_social_scores_auth" ON public.user_title_social_scores
            FOR ALL TO authenticated
            USING (user_id = get_user_id_from_auth())
            WITH CHECK (user_id = get_user_id_from_auth());
        CREATE POLICY "user_title_social_scores_service" ON public.user_title_social_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ============================================================================
-- ADDITIONAL PUBLIC READ TABLES
-- ============================================================================

-- title_streaming_availability (public read)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_streaming_availability') THEN
        ALTER TABLE public.title_streaming_availability ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_streaming_availability_public_read" ON public.title_streaming_availability;
        DROP POLICY IF EXISTS "title_streaming_availability_service_write" ON public.title_streaming_availability;
        CREATE POLICY "title_streaming_availability_public_read" ON public.title_streaming_availability FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "title_streaming_availability_service_write" ON public.title_streaming_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- title_emotions (public read)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_emotions') THEN
        ALTER TABLE public.title_emotions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_emotions_public_read" ON public.title_emotions;
        DROP POLICY IF EXISTS "title_emotions_service_write" ON public.title_emotions;
        CREATE POLICY "title_emotions_public_read" ON public.title_emotions FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "title_emotions_service_write" ON public.title_emotions FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- genres (public read)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'genres') THEN
        ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "genres_public_read" ON public.genres;
        DROP POLICY IF EXISTS "genres_service_write" ON public.genres;
        CREATE POLICY "genres_public_read" ON public.genres FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "genres_service_write" ON public.genres FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- title_genres (public read)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'title_genres') THEN
        ALTER TABLE public.title_genres ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "title_genres_public_read" ON public.title_genres;
        DROP POLICY IF EXISTS "title_genres_service_write" ON public.title_genres;
        CREATE POLICY "title_genres_public_read" ON public.title_genres FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "title_genres_service_write" ON public.title_genres FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ============================================================================
-- COMPLETE
-- ============================================================================
