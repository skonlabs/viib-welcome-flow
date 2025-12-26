-- ============================================================================
-- Rate Limiting Improvements & Enhanced Recommendation Explanations
-- Date: December 26, 2025
-- ============================================================================

-- ============================================================================
-- PART 1: IP-Based Rate Limiting Table
-- Tracks rate limits by IP address to prevent abuse
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip_address, endpoint)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_lookup
ON ip_rate_limits(ip_address, endpoint, window_start);

-- Auto-cleanup old entries (older than 1 hour)
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_cleanup
ON ip_rate_limits(window_start);

-- ============================================================================
-- PART 2: Login Attempt Tracking for Brute Force Protection
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- email or phone
    ip_address TEXT,
    attempt_type TEXT NOT NULL DEFAULT 'password', -- 'password', 'otp'
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
ON login_attempts(identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
ON login_attempts(ip_address, created_at DESC);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_identifier TEXT, p_window_minutes INTEGER DEFAULT 15)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_failed_count INTEGER;
    v_lockout_threshold INTEGER := 5;
BEGIN
    SELECT COUNT(*) INTO v_failed_count
    FROM login_attempts
    WHERE identifier = p_identifier
      AND success = FALSE
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    RETURN v_failed_count >= v_lockout_threshold;
END;
$$;

-- Function to check IP-based rate limiting
CREATE OR REPLACE FUNCTION check_ip_rate_limit(
    p_ip_address TEXT,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMPTZ;
    v_reset_at TIMESTAMPTZ;
BEGIN
    -- Calculate window start
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

    -- Try to get or create rate limit record
    INSERT INTO ip_rate_limits (ip_address, endpoint, request_count, window_start)
    VALUES (p_ip_address, p_endpoint, 1, NOW())
    ON CONFLICT (ip_address, endpoint) DO UPDATE
    SET
        request_count = CASE
            WHEN ip_rate_limits.window_start < v_window_start THEN 1
            ELSE ip_rate_limits.request_count + 1
        END,
        window_start = CASE
            WHEN ip_rate_limits.window_start < v_window_start THEN NOW()
            ELSE ip_rate_limits.window_start
        END
    RETURNING ip_rate_limits.request_count, ip_rate_limits.window_start
    INTO v_current_count, v_window_start;

    v_reset_at := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

    RETURN QUERY SELECT
        v_current_count <= p_max_requests,
        v_current_count,
        v_reset_at;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_identifier TEXT,
    p_ip_address TEXT,
    p_attempt_type TEXT DEFAULT 'password',
    p_success BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO login_attempts (identifier, ip_address, attempt_type, success)
    VALUES (p_identifier, p_ip_address, p_attempt_type, p_success);

    -- Clean up old attempts (keep last 24 hours)
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to get remaining lockout time
CREATE OR REPLACE FUNCTION get_lockout_remaining(p_identifier TEXT, p_window_minutes INTEGER DEFAULT 15)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_last_attempt TIMESTAMPTZ;
    v_remaining_seconds INTEGER;
BEGIN
    SELECT MAX(created_at) INTO v_last_attempt
    FROM login_attempts
    WHERE identifier = p_identifier
      AND success = FALSE;

    IF v_last_attempt IS NULL THEN
        RETURN 0;
    END IF;

    v_remaining_seconds := EXTRACT(EPOCH FROM (
        v_last_attempt + (p_window_minutes || ' minutes')::INTERVAL - NOW()
    ))::INTEGER;

    RETURN GREATEST(0, v_remaining_seconds);
END;
$$;


-- ============================================================================
-- PART 3: Enhanced Recommendation Explanations
-- Provides detailed, personalized explanations for why content is recommended
-- ============================================================================

-- Drop and recreate explain_recommendation with better explanations
CREATE OR REPLACE FUNCTION explain_recommendation(p_user_id UUID, p_title_id UUID)
RETURNS TABLE(
    title_id UUID,
    emotional_match REAL,
    transformation_type TEXT,
    transformation_score REAL,
    social_score REAL,
    friend_name TEXT,
    friend_rating TEXT,
    taste_similarity REAL,
    intent_match TEXT,
    intent_confidence REAL,
    primary_reason TEXT,
    secondary_reasons TEXT[],
    full_explanation TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_emotion_id UUID;
    v_user_emotion_label TEXT;
    v_user_intensity REAL;
    v_emotional_match REAL := 0.5;
    v_transformation_type TEXT := 'neutral';
    v_transformation_score REAL := 0.5;
    v_social_score REAL := 0;
    v_friend_name TEXT := NULL;
    v_friend_rating TEXT := NULL;
    v_taste_similarity REAL := 0;
    v_intent_match TEXT := NULL;
    v_intent_confidence REAL := 0;
    v_title_name TEXT;
    v_title_emotions TEXT[];
    v_primary_reason TEXT;
    v_secondary_reasons TEXT[] := '{}';
    v_full_explanation TEXT;
BEGIN
    -- Get title name
    SELECT name INTO v_title_name FROM titles WHERE id = p_title_id;

    -- Get user's current emotion state
    SELECT ues.emotion_id, em.emotion_label, ues.intensity
    INTO v_user_emotion_id, v_user_emotion_label, v_user_intensity
    FROM user_emotion_states ues
    JOIN emotion_master em ON em.id = ues.emotion_id
    WHERE ues.user_id = p_user_id
    ORDER BY ues.created_at DESC
    LIMIT 1;

    -- Get title's primary emotions
    SELECT ARRAY_AGG(em.emotion_label ORDER BY vec.intensity_level DESC)
    INTO v_title_emotions
    FROM viib_emotion_classified_titles vec
    JOIN emotion_master em ON em.id = vec.emotion_id
    WHERE vec.title_id = p_title_id
    LIMIT 3;

    -- Calculate emotional match and transformation
    IF v_user_emotion_id IS NOT NULL THEN
        SELECT
            etm.transformation_type,
            etm.confidence_score,
            COALESCE(tts.transformation_score, 0.5)
        INTO v_transformation_type, v_transformation_score, v_emotional_match
        FROM emotion_transformation_map etm
        LEFT JOIN title_transformation_scores tts
            ON tts.user_emotion_id = v_user_emotion_id
            AND tts.title_id = p_title_id
        WHERE etm.user_emotion_id = v_user_emotion_id
          AND EXISTS (
              SELECT 1 FROM viib_emotion_classified_titles vec
              WHERE vec.title_id = p_title_id
                AND vec.emotion_id = etm.content_emotion_id
          )
        ORDER BY etm.priority_rank
        LIMIT 1;
    END IF;

    -- Get social recommendation details
    SELECT
        COALESCE(u.full_name, u.username, 'A friend'),
        CASE uti.rating_value
            WHEN 'love_it' THEN 'loved'
            WHEN 'like_it' THEN 'liked'
            WHEN 'ok' THEN 'thought was okay'
            ELSE 'watched'
        END,
        fc.trust_score,
        calculate_taste_similarity(p_user_id, fc.friend_user_id)
    INTO v_friend_name, v_friend_rating, v_social_score, v_taste_similarity
    FROM friend_connections fc
    JOIN users u ON u.id = fc.friend_user_id
    LEFT JOIN user_title_interactions uti
        ON uti.user_id = fc.friend_user_id
        AND uti.title_id = p_title_id
    WHERE fc.user_id = p_user_id
      AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE)
      AND (
          uti.rating_value IN ('love_it', 'like_it')
          OR EXISTS (
              SELECT 1 FROM user_social_recommendations usr
              WHERE usr.sender_user_id = fc.friend_user_id
                AND usr.receiver_user_id = p_user_id
                AND usr.title_id = p_title_id
          )
      )
    ORDER BY fc.trust_score DESC, uti.rating_value DESC NULLS LAST
    LIMIT 1;

    -- Get intent alignment
    SELECT
        vit.intent_type,
        vit.confidence_score
    INTO v_intent_match, v_intent_confidence
    FROM viib_intent_classified_titles vit
    WHERE vit.title_id = p_title_id
    ORDER BY vit.confidence_score DESC
    LIMIT 1;

    -- Build primary reason based on strongest signal
    IF v_social_score >= 0.7 AND v_friend_name IS NOT NULL THEN
        IF v_taste_similarity >= 0.7 THEN
            v_primary_reason := format('%s (%s%% taste match) %s this',
                v_friend_name,
                ROUND(v_taste_similarity * 100)::TEXT,
                COALESCE(v_friend_rating, 'recommended'));
        ELSE
            v_primary_reason := format('%s %s this',
                v_friend_name,
                COALESCE(v_friend_rating, 'recommended'));
        END IF;
    ELSIF v_transformation_score >= 0.8 THEN
        v_primary_reason := CASE v_transformation_type
            WHEN 'soothe' THEN format('Perfect for when you''re feeling %s - this will help you relax', v_user_emotion_label)
            WHEN 'validate' THEN format('Matches your %s mood - sometimes you just need content that gets you', v_user_emotion_label)
            WHEN 'amplify' THEN format('Will amplify your %s energy with its %s vibes', v_user_emotion_label, COALESCE(v_title_emotions[1], 'exciting'))
            WHEN 'complementary' THEN format('A great contrast to your %s mood - offers a fresh perspective', v_user_emotion_label)
            WHEN 'reinforcing' THEN format('Reinforces your %s state with similar emotional energy', v_user_emotion_label)
            ELSE format('Emotionally aligned with how you''re feeling')
        END;
    ELSIF v_intent_confidence >= 0.8 THEN
        v_primary_reason := CASE v_intent_match
            WHEN 'light_entertainment' THEN 'Easy, fun content for casual viewing'
            WHEN 'comfort_escape' THEN 'Cozy escapism when you need to unwind'
            WHEN 'adrenaline_rush' THEN 'Heart-pounding excitement awaits'
            WHEN 'deep_thought' THEN 'Thought-provoking content for the curious mind'
            WHEN 'discovery' THEN 'Expand your horizons with something new'
            WHEN 'emotional_release' THEN 'A cathartic experience for emotional processing'
            WHEN 'family_bonding' THEN 'Perfect for watching together'
            WHEN 'background_passive' THEN 'Great for background viewing'
            ELSE 'Matches what you''re looking for right now'
        END;
    ELSE
        v_primary_reason := 'Trending and popular among viewers like you';
    END IF;

    -- Build secondary reasons
    IF v_title_emotions IS NOT NULL AND array_length(v_title_emotions, 1) > 0 THEN
        v_secondary_reasons := v_secondary_reasons || format('Evokes %s emotions', array_to_string(v_title_emotions[1:2], ', '));
    END IF;

    IF v_transformation_score >= 0.6 AND v_primary_reason NOT LIKE '%feeling%' THEN
        v_secondary_reasons := v_secondary_reasons || format('Good emotional match for your current mood');
    END IF;

    IF v_friend_name IS NOT NULL AND v_primary_reason NOT LIKE '%friend%' AND v_primary_reason NOT LIKE v_friend_name || '%' THEN
        v_secondary_reasons := v_secondary_reasons || format('%s also enjoyed this', v_friend_name);
    END IF;

    -- Build full explanation
    v_full_explanation := v_primary_reason;
    IF array_length(v_secondary_reasons, 1) > 0 THEN
        v_full_explanation := v_full_explanation || '. Also: ' || array_to_string(v_secondary_reasons, '; ');
    END IF;

    RETURN QUERY SELECT
        p_title_id,
        COALESCE(v_emotional_match, 0.5),
        COALESCE(v_transformation_type, 'neutral'),
        COALESCE(v_transformation_score, 0.5),
        COALESCE(v_social_score, 0.0),
        v_friend_name,
        v_friend_rating,
        COALESCE(v_taste_similarity, 0.0),
        v_intent_match,
        COALESCE(v_intent_confidence, 0.0),
        v_primary_reason,
        v_secondary_reasons,
        v_full_explanation;
END;
$$;


-- ============================================================================
-- PART 4: Update get_top_recommendations_v2 to include explanation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_recommendations_v2(p_user_id UUID, p_limit INTEGER DEFAULT 10)
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
    -- Cold start fallback: Get popular titles if user has no emotion state
    cold_start_candidates AS (
        SELECT t.id AS cid, t.popularity
        FROM titles t
        WHERE t.classification_status = 'complete'
          AND NOT v_user_has_emotion
          AND NOT EXISTS (
              SELECT 1 FROM user_title_interactions uti
              WHERE uti.user_id = p_user_id
                AND uti.title_id = t.id
                AND uti.interaction_type IN ('completed', 'disliked')
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
            -- In user's language preferences (or any if none set)
            AND (
                NOT EXISTS (
                    SELECT 1 FROM user_language_preferences
                    WHERE user_id = p_user_id
                )
                OR t.original_language IN (
                    SELECT language_code
                    FROM user_language_preferences
                    WHERE user_id = p_user_id
                )
            )
            -- Not already watched or disliked
            AND NOT EXISTS (
                SELECT 1
                FROM user_title_interactions uti
                WHERE uti.user_id = p_user_id
                    AND uti.title_id = t.id
                    AND uti.interaction_type IN ('completed', 'disliked')
            )
    ),

    -- Combine cold start and regular candidates
    all_candidates AS (
        SELECT cid FROM candidate_titles
        UNION
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
            vsc.emotional_component,
            vsc.social_component,
            vsc.historical_component,
            vsc.context_component,
            vsc.novelty_component,
            (
                vsc.emotional_component * w_emotional +
                vsc.social_component * w_social +
                vsc.historical_component * w_historical +
                vsc.context_component * w_context +
                vsc.novelty_component * w_novelty
            ) AS base_score
        FROM prefiltered pf
        CROSS JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc
    ),

    -- Get top 100 by base score for intent scoring
    top_base AS (
        SELECT s.cid, s.base_score, s.emotional_component
        FROM scored s
        ORDER BY s.base_score DESC
        LIMIT 100
    ),

    -- Add intent alignment and social priority
    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            tb.emotional_component,
            viib_intent_alignment_score(p_user_id, tb.cid) AS intent_score,
            viib_social_priority_score(p_user_id, tb.cid) AS social_score
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

    -- Get explanations
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
        LEFT JOIN LATERAL explain_recommendation(p_user_id, c.cid) er ON TRUE
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
-- PART 5: Cleanup function for rate limit data
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_rate_limit_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up old IP rate limit entries (older than 1 hour)
    DELETE FROM ip_rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';

    -- Clean up old login attempts (older than 24 hours)
    DELETE FROM login_attempts
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;


-- ============================================================================
-- PART 6: Add rate limit configuration for new endpoints
-- ============================================================================

INSERT INTO rate_limit_config (endpoint, max_requests, window_seconds, is_active, description)
VALUES
    ('login_password', 5, 900, TRUE, 'Password login attempts - 5 per 15 minutes'),
    ('login_otp', 5, 300, TRUE, 'OTP verification attempts - 5 per 5 minutes'),
    ('password_reset', 3, 3600, TRUE, 'Password reset requests - 3 per hour'),
    ('account_delete', 1, 86400, TRUE, 'Account deletion - 1 per day')
ON CONFLICT (endpoint) DO UPDATE SET
    max_requests = EXCLUDED.max_requests,
    window_seconds = EXCLUDED.window_seconds,
    description = EXCLUDED.description;


-- ============================================================================
-- COMPLETE
-- ============================================================================
