-- ============================================================================
-- Security Fixes Migration
-- Date: December 27, 2025
-- Addresses P0 and P1 security vulnerabilities
-- ============================================================================

-- ============================================================================
-- PART 1: Fix phone_verifications RLS - Remove overly permissive policies
-- Issue: Public SELECT/UPDATE exposes OTP codes to attackers
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow insert for phone verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Allow select for phone verification" ON public.phone_verifications;
DROP POLICY IF EXISTS "Allow update for phone verification" ON public.phone_verifications;

-- Create restrictive policies - only service role should access this table
-- Application code uses service_role key in edge functions
CREATE POLICY "Service role only - insert" ON public.phone_verifications
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role only - select" ON public.phone_verifications
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role only - update" ON public.phone_verifications
    FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role only - delete" ON public.phone_verifications
    FOR DELETE TO service_role USING (true);

-- ============================================================================
-- PART 2: Add OTP hash storage column (for P1: Hash OTPs)
-- OTPs should be hashed like passwords, not stored in plaintext
-- ============================================================================

-- Add column for hashed OTP (we'll keep otp_code temporarily for migration)
ALTER TABLE public.phone_verifications
    ADD COLUMN IF NOT EXISTS otp_hash TEXT;

-- Add attempt counter for brute force protection
ALTER TABLE public.phone_verifications
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;

-- Add max attempts (lock out after 5 failed attempts)
ALTER TABLE public.phone_verifications
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 5;

-- Add locked status
ALTER TABLE public.phone_verifications
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Create index for faster hash lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp_hash
    ON public.phone_verifications(phone_number, otp_hash)
    WHERE verified = FALSE AND is_locked = FALSE;

-- ============================================================================
-- PART 3: Email verifications - same security fixes
-- ============================================================================

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Allow insert for email verification" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow select for email verification" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow update for email verification" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow public insert" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow public select" ON public.email_verifications;
DROP POLICY IF EXISTS "Allow public update" ON public.email_verifications;

-- Create restrictive policies for email_verifications if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_verifications') THEN
        -- Add OTP hash column
        ALTER TABLE public.email_verifications
            ADD COLUMN IF NOT EXISTS otp_hash TEXT;
        ALTER TABLE public.email_verifications
            ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
        ALTER TABLE public.email_verifications
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

        -- Create policies
        EXECUTE 'CREATE POLICY "Service role only - insert" ON public.email_verifications FOR INSERT TO service_role WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Service role only - select" ON public.email_verifications FOR SELECT TO service_role USING (true)';
        EXECUTE 'CREATE POLICY "Service role only - update" ON public.email_verifications FOR UPDATE TO service_role USING (true)';
        EXECUTE 'CREATE POLICY "Service role only - delete" ON public.email_verifications FOR DELETE TO service_role USING (true)';
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Policies already exist, ignore
    NULL;
END $$;


-- ============================================================================
-- PART 4: App Settings for Test Mode Control (P0: Gate test phones)
-- ============================================================================

-- Add setting to control test phone number behavior
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
    'allow_test_phone_numbers',
    'false'::jsonb,
    'Allow test phone numbers with fixed OTP. MUST be false in production.'
)
ON CONFLICT (setting_key) DO UPDATE SET
    description = EXCLUDED.description;

-- Add setting for allowed CORS origins
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
    'allowed_cors_origins',
    '["https://viib.app","https://www.viib.app","https://app.viib.app"]'::jsonb,
    'JSON array of allowed CORS origins for edge functions'
)
ON CONFLICT (setting_key) DO UPDATE SET
    description = EXCLUDED.description;

-- Add environment flag setting
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
    'environment',
    '"production"'::jsonb,
    'Current environment: development, staging, or production'
)
ON CONFLICT (setting_key) DO UPDATE SET
    description = EXCLUDED.description;


-- ============================================================================
-- PART 5: Fix Recommendation SQL Issues
-- ============================================================================

-- Drop and recreate get_top_recommendations_v2 with fixes:
-- 1. Use DISTINCT to prevent duplicate candidates
-- 2. Use NOT EXISTS instead of NOT IN (handles NULLs correctly)
-- 3. Handle empty user preferences gracefully
-- 4. Add COALESCE for all nullable operations

DROP FUNCTION IF EXISTS public.get_top_recommendations_v2(uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_top_recommendations_v2(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    title_id UUID,
    base_viib_score REAL,
    intent_alignment_score REAL,
    social_priority_score REAL,
    transformation_score REAL,
    final_score REAL,
    recommendation_reason TEXT
)
LANGUAGE plpgsql
STABLE
SET statement_timeout = '60s'
AS $$
DECLARE
    w_emotional      REAL := 0.35;
    w_social         REAL := 0.20;
    w_historical     REAL := 0.25;
    w_context        REAL := 0.10;
    w_novelty        REAL := 0.10;
    v_user_has_emotion BOOLEAN := FALSE;
    v_user_has_subscriptions BOOLEAN := FALSE;
    v_user_has_language_prefs BOOLEAN := FALSE;
BEGIN
    -- Check if user has emotion state
    SELECT EXISTS(
        SELECT 1 FROM user_emotion_states WHERE user_id = p_user_id
    ) INTO v_user_has_emotion;

    -- Check if user has streaming subscriptions
    SELECT EXISTS(
        SELECT 1 FROM user_streaming_subscriptions
        WHERE user_id = p_user_id AND is_active = TRUE
    ) INTO v_user_has_subscriptions;

    -- Check if user has language preferences
    SELECT EXISTS(
        SELECT 1 FROM user_language_preferences
        WHERE user_id = p_user_id
    ) INTO v_user_has_language_prefs;

    -- Load active weights if available
    SELECT
        COALESCE(emotional_weight, 0.35),
        COALESCE(social_weight, 0.20),
        COALESCE(historical_weight, 0.25),
        COALESCE(context_weight, 0.10),
        COALESCE(novelty_weight, 0.10)
    INTO w_emotional, w_social, w_historical, w_context, w_novelty
    FROM viib_weight_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN QUERY
    WITH
    -- User's interacted titles (for exclusion using NOT EXISTS pattern)
    user_interactions AS (
        SELECT DISTINCT uti.title_id
        FROM user_title_interactions uti
        WHERE uti.user_id = p_user_id
          AND uti.interaction_type IN ('completed', 'disliked')
    ),

    -- User's language preferences
    user_languages AS (
        SELECT language_code
        FROM user_language_preferences
        WHERE user_id = p_user_id
    ),

    -- Cold start fallback: Get popular titles if user has no emotion state
    cold_start_candidates AS (
        SELECT DISTINCT t.id AS cid, t.popularity
        FROM titles t
        WHERE t.classification_status = 'complete'
          AND NOT v_user_has_emotion
          -- Use NOT EXISTS instead of NOT IN (handles NULLs correctly)
          AND NOT EXISTS (
              SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id
          )
        ORDER BY t.popularity DESC
        LIMIT 50
    ),

    -- Regular candidate selection for users with preferences
    candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE
            t.classification_status = 'complete'
            AND v_user_has_emotion
            -- Available on user's streaming services (if they have any)
            AND (
                NOT v_user_has_subscriptions
                OR EXISTS (
                    SELECT 1
                    FROM title_streaming_availability tsa
                    JOIN user_streaming_subscriptions uss
                        ON uss.streaming_service_id = tsa.streaming_service_id
                        AND uss.user_id = p_user_id
                        AND uss.is_active = TRUE
                    WHERE tsa.title_id = t.id
                )
            )
            -- Handle empty language preferences gracefully
            AND (
                NOT v_user_has_language_prefs
                OR EXISTS (
                    SELECT 1 FROM user_languages ul
                    WHERE ul.language_code = t.original_language
                )
            )
            -- Use NOT EXISTS instead of NOT IN
            AND NOT EXISTS (
                SELECT 1 FROM user_interactions ui WHERE ui.title_id = t.id
            )
    ),

    -- Combine cold start and regular candidates (DISTINCT already applied above)
    all_candidates AS (
        SELECT cid FROM candidate_titles
        UNION  -- UNION removes duplicates automatically
        SELECT cid FROM cold_start_candidates
    ),

    -- Pre-filter to top 300 by social recommendations and popularity
    prefiltered AS (
        SELECT
            ac.cid,
            COALESCE(rec.rec_count, 0) AS social_rec_count,
            COALESCE(t.popularity, 0) AS popularity_score
        FROM all_candidates ac
        JOIN titles t ON t.id = ac.cid
        LEFT JOIN (
            SELECT usr.title_id, COUNT(*) AS rec_count
            FROM user_social_recommendations usr
            WHERE usr.receiver_user_id = p_user_id
            GROUP BY usr.title_id
        ) rec ON rec.title_id = ac.cid
        ORDER BY social_rec_count DESC, popularity_score DESC
        LIMIT 300
    ),

    -- Calculate full score components for pre-filtered titles
    scored AS (
        SELECT
            pf.cid,
            COALESCE(vsc.emotional_component, 0.5) AS emotional_component,
            COALESCE(vsc.social_component, 0.0) AS social_component,
            COALESCE(vsc.historical_component, 0.5) AS historical_component,
            COALESCE(vsc.context_component, 0.5) AS context_component,
            COALESCE(vsc.novelty_component, 0.5) AS novelty_component,
            (
                COALESCE(vsc.emotional_component, 0.5) * w_emotional +
                COALESCE(vsc.social_component, 0.0) * w_social +
                COALESCE(vsc.historical_component, 0.5) * w_historical +
                COALESCE(vsc.context_component, 0.5) * w_context +
                COALESCE(vsc.novelty_component, 0.5) * w_novelty
            ) AS base_score
        FROM prefiltered pf
        LEFT JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc ON TRUE
    ),

    -- Get top 100 by base score for intent scoring
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component
        FROM scored s
        ORDER BY s.base_score DESC
        LIMIT 100
    ),

    -- Add intent alignment and social priority (with COALESCE for safety)
    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            tb.emotional_component,
            COALESCE(viib_intent_alignment_score(p_user_id, tb.cid), 1.0) AS intent_score,
            COALESCE(viib_social_priority_score(p_user_id, tb.cid), 0.0) AS social_score
        FROM top_base tb
    ),

    -- Combine scores
    combined AS (
        SELECT
            wi.cid,
            wi.base_score,
            wi.intent_score,
            wi.social_score,
            wi.emotional_component AS trans_score,
            GREATEST(
                wi.base_score * wi.intent_score,
                wi.social_score
            ) AS combined_score
        FROM with_intent wi
    ),

    -- Get explanations (with safe fallback)
    with_explanations AS (
        SELECT
            c.cid,
            c.base_score,
            c.intent_score,
            c.social_score,
            c.trans_score,
            c.combined_score,
            er.primary_reason
        FROM combined c
        LEFT JOIN LATERAL (
            SELECT primary_reason
            FROM explain_recommendation(p_user_id, c.cid)
        ) er ON TRUE
    )

    SELECT
        we.cid AS title_id,
        we.base_score AS base_viib_score,
        we.intent_score AS intent_alignment_score,
        we.social_score AS social_priority_score,
        we.trans_score AS transformation_score,
        we.combined_score AS final_score,
        COALESCE(we.primary_reason, 'Recommended for you') AS recommendation_reason
    FROM with_explanations we
    ORDER BY we.combined_score DESC
    LIMIT p_limit;
END;
$$;


-- ============================================================================
-- PART 6: Performance Improvements for Rate Limiting
-- Add proper indexes for efficient rate limit queries
-- ============================================================================

-- Index for efficient IP rate limit lookups
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_active
    ON ip_rate_limits(ip_address, endpoint)
    WHERE window_start > NOW() - INTERVAL '1 hour';

-- Index for login attempts by identifier and time
CREATE INDEX IF NOT EXISTS idx_login_attempts_recent
    ON login_attempts(identifier, success, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '24 hours';

-- Index for system_logs rate limit queries (if using system_logs for rate limiting)
CREATE INDEX IF NOT EXISTS idx_system_logs_rate_limit
    ON system_logs(operation, created_at DESC)
    WHERE operation LIKE '%_failed';

-- Partial index for phone verifications (active, non-expired, non-locked)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_active
    ON phone_verifications(phone_number, created_at DESC)
    WHERE verified = FALSE AND is_locked = FALSE;


-- ============================================================================
-- PART 7: Function to hash OTP codes (SHA-256)
-- This will be called from edge functions
-- ============================================================================

CREATE OR REPLACE FUNCTION hash_otp(p_otp TEXT, p_salt TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_salt TEXT;
    v_combined TEXT;
BEGIN
    -- Use provided salt or phone number as salt
    v_salt := COALESCE(p_salt, 'viib_otp_salt_');
    v_combined := v_salt || p_otp;

    -- Return SHA-256 hash encoded as hex
    RETURN encode(sha256(v_combined::bytea), 'hex');
END;
$$;


-- ============================================================================
-- PART 8: Function to verify OTP with brute force protection
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_otp_secure(
    p_phone_number TEXT,
    p_otp_input TEXT,
    p_max_attempts INTEGER DEFAULT 5
)
RETURNS TABLE(
    success BOOLEAN,
    error_message TEXT,
    verification_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_otp_hash TEXT;
    v_attempts INTEGER;
BEGIN
    -- Calculate hash of input OTP
    v_otp_hash := hash_otp(p_otp_input, p_phone_number);

    -- Find most recent non-verified, non-expired, non-locked verification
    SELECT pv.id, pv.otp_hash, pv.otp_code, pv.attempt_count, pv.expires_at
    INTO v_record
    FROM phone_verifications pv
    WHERE pv.phone_number = p_phone_number
      AND pv.verified = FALSE
      AND pv.is_locked = FALSE
      AND pv.expires_at > NOW()
    ORDER BY pv.created_at DESC
    LIMIT 1;

    -- No valid verification found
    IF v_record IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No active verification found. Please request a new code.', NULL::UUID;
        RETURN;
    END IF;

    -- Check if max attempts exceeded
    IF v_record.attempt_count >= p_max_attempts THEN
        -- Lock this verification
        UPDATE phone_verifications
        SET is_locked = TRUE
        WHERE id = v_record.id;

        RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please request a new code.', NULL::UUID;
        RETURN;
    END IF;

    -- Verify OTP (check both hash and plaintext for backwards compatibility)
    IF (v_record.otp_hash IS NOT NULL AND v_record.otp_hash = v_otp_hash)
       OR (v_record.otp_code = p_otp_input) THEN
        -- Mark as verified
        UPDATE phone_verifications
        SET verified = TRUE
        WHERE id = v_record.id;

        -- Clean up other unverified OTPs for this phone
        DELETE FROM phone_verifications
        WHERE phone_number = p_phone_number
          AND verified = FALSE
          AND id != v_record.id;

        RETURN QUERY SELECT TRUE, NULL::TEXT, v_record.id;
        RETURN;
    ELSE
        -- Increment attempt counter
        UPDATE phone_verifications
        SET attempt_count = attempt_count + 1
        WHERE id = v_record.id;

        v_attempts := v_record.attempt_count + 1;

        IF v_attempts >= p_max_attempts THEN
            UPDATE phone_verifications
            SET is_locked = TRUE
            WHERE id = v_record.id;

            RETURN QUERY SELECT FALSE, 'Too many failed attempts. Please request a new code.', NULL::UUID;
        ELSE
            RETURN QUERY SELECT FALSE,
                format('Incorrect code. %s attempts remaining.', p_max_attempts - v_attempts),
                NULL::UUID;
        END IF;
        RETURN;
    END IF;
END;
$$;


-- ============================================================================
-- COMPLETE
-- ============================================================================
