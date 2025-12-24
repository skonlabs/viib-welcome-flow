-- ============================================================================
-- PHASE 1: RECOMMENDATION SYSTEM FOUNDATION
-- This migration fixes critical gaps in the recommendation system by:
-- 1. Seeding emotion_master with comprehensive PAD-model emotions
-- 2. Seeding emotion_to_intent_map with all emotion→intent mappings
-- 3. Seeding emotion_transformation_map with transformation rules
-- 4. Fixing viib_score_components to actually use transformation scores
-- 5. Fixing get_top_recommendations to use transformation scores
-- ============================================================================

-- ============================================================================
-- PART 1: SEED EMOTION_MASTER TABLE
-- PAD Model: Pleasure (Valence), Arousal, Dominance
-- Values NORMALIZED to 0-1 range (database constraint requires 0-1, not -1 to +1)
-- Formula: normalized = (original + 1) / 2
-- Categories: 'user_state' (what user feels), 'content_state' (what content evokes)
-- Using INSERT ON CONFLICT to avoid DELETE/TRUNCATE timeout issues
-- ============================================================================

-- Insert USER_STATE emotions (emotions users can feel)
-- Using ON CONFLICT (emotion_label, category) because that's the existing unique constraint
-- PAD values normalized from -1..+1 to 0..1 range
INSERT INTO emotion_master (emotion_label, category, valence, arousal, dominance, intensity_multiplier, description) VALUES
('happy', 'user_state', 0.9, 0.75, 0.8, 1.0, 'Feeling joyful, content, and positive'),
('sad', 'user_state', 0.15, 0.35, 0.25, 1.2, 'Feeling down, melancholic, or blue'),
('angry', 'user_state', 0.2, 0.9, 0.75, 1.3, 'Feeling frustrated, irritated, or furious'),
('anxious', 'user_state', 0.25, 0.85, 0.2, 1.2, 'Feeling worried, nervous, or uneasy'),
('calm', 'user_state', 0.7, 0.2, 0.65, 0.8, 'Feeling peaceful, relaxed, and centered'),
('excited', 'user_state', 0.85, 0.9, 0.75, 1.1, 'Feeling enthusiastic, energized, and eager'),
('bored', 'user_state', 0.35, 0.15, 0.4, 0.9, 'Feeling unstimulated, disengaged, or restless'),
('stressed', 'user_state', 0.2, 0.8, 0.3, 1.3, 'Feeling overwhelmed, pressured, or tense'),
('lonely', 'user_state', 0.2, 0.3, 0.25, 1.1, 'Feeling isolated, disconnected, or alone'),
('hopeful', 'user_state', 0.75, 0.65, 0.7, 1.0, 'Feeling optimistic about the future'),
('nostalgic', 'user_state', 0.6, 0.4, 0.5, 0.9, 'Feeling wistful about the past'),
('curious', 'user_state', 0.7, 0.7, 0.65, 1.0, 'Feeling inquisitive and wanting to learn'),
('tired', 'user_state', 0.4, 0.1, 0.35, 0.7, 'Feeling fatigued, low energy'),
('romantic', 'user_state', 0.85, 0.7, 0.6, 1.0, 'Feeling loving, affectionate'),
('adventurous', 'user_state', 0.8, 0.85, 0.8, 1.1, 'Feeling bold, ready for new experiences'),
('melancholic', 'user_state', 0.3, 0.3, 0.35, 1.0, 'Feeling pensive sadness'),
('content', 'user_state', 0.8, 0.35, 0.7, 0.9, 'Feeling satisfied and at peace'),
('frustrated', 'user_state', 0.25, 0.75, 0.4, 1.2, 'Feeling blocked or hindered'),
('inspired', 'user_state', 0.85, 0.8, 0.75, 1.1, 'Feeling motivated and creative'),
('overwhelmed', 'user_state', 0.25, 0.7, 0.2, 1.3, 'Feeling like too much is happening')
ON CONFLICT (emotion_label, category) DO UPDATE SET
    valence = EXCLUDED.valence,
    arousal = EXCLUDED.arousal,
    dominance = EXCLUDED.dominance,
    intensity_multiplier = EXCLUDED.intensity_multiplier,
    description = EXCLUDED.description;

-- Insert CONTENT_STATE emotions (emotions content can evoke)
-- Using ON CONFLICT (emotion_label, category) because that's the existing unique constraint
-- PAD values normalized from -1..+1 to 0..1 range
INSERT INTO emotion_master (emotion_label, category, valence, arousal, dominance, intensity_multiplier, description) VALUES
-- Positive high-arousal
('thrilling', 'content_state', 0.8, 0.95, 0.7, 1.2, 'Content that creates excitement and suspense'),
('exhilarating', 'content_state', 0.9, 0.95, 0.8, 1.3, 'Content that produces intense excitement'),
('hilarious', 'content_state', 0.95, 0.85, 0.75, 1.1, 'Content that makes you laugh hard'),
('uplifting', 'content_state', 0.9, 0.75, 0.75, 1.0, 'Content that elevates mood and spirits'),
-- Positive low-arousal
('heartwarming', 'content_state', 0.9, 0.6, 0.65, 0.9, 'Content that creates warm, fuzzy feelings'),
('comforting', 'content_state', 0.8, 0.3, 0.65, 0.8, 'Content that soothes and relaxes'),
('peaceful', 'content_state', 0.75, 0.2, 0.7, 0.7, 'Content that creates tranquility'),
('cozy', 'content_state', 0.8, 0.25, 0.65, 0.8, 'Content that feels like a warm blanket'),
-- Negative high-arousal (negative valence = low normalized valence)
('terrifying', 'content_state', 0.2, 0.95, 0.25, 1.4, 'Content that creates intense fear'),
('intense', 'content_state', 0.5, 0.95, 0.65, 1.3, 'Content with high emotional stakes'),
('suspenseful', 'content_state', 0.55, 0.9, 0.4, 1.2, 'Content that keeps you on edge'),
('shocking', 'content_state', 0.4, 0.95, 0.35, 1.4, 'Content with unexpected twists'),
-- Negative low-arousal
('melancholic', 'content_state', 0.3, 0.35, 0.4, 1.0, 'Content with beautiful sadness'),
('bittersweet', 'content_state', 0.55, 0.45, 0.5, 1.0, 'Content mixing joy and sorrow'),
('poignant', 'content_state', 0.4, 0.6, 0.55, 1.1, 'Content that touches deeply'),
('somber', 'content_state', 0.25, 0.3, 0.45, 1.0, 'Content with serious, dark tone'),
-- Cognitive/Intellectual
('thought-provoking', 'content_state', 0.65, 0.7, 0.7, 1.1, 'Content that makes you think'),
('mind-bending', 'content_state', 0.7, 0.8, 0.6, 1.2, 'Content that challenges perception'),
('educational', 'content_state', 0.7, 0.65, 0.75, 0.9, 'Content that teaches and informs'),
('inspiring', 'content_state', 0.85, 0.75, 0.8, 1.1, 'Content that motivates action'),
-- Social/Connection
('romantic', 'content_state', 0.85, 0.7, 0.6, 1.0, 'Content about love and relationships'),
('nostalgic', 'content_state', 0.65, 0.4, 0.55, 0.9, 'Content that evokes fond memories'),
('wholesome', 'content_state', 0.85, 0.55, 0.7, 0.9, 'Content that is pure and good'),
('feel-good', 'content_state', 0.9, 0.65, 0.7, 1.0, 'Content designed to make you happy'),
-- Cathartic
('cathartic', 'content_state', 0.6, 0.75, 0.65, 1.2, 'Content that provides emotional release'),
('tear-jerker', 'content_state', 0.35, 0.7, 0.45, 1.2, 'Content that makes you cry'),
('empowering', 'content_state', 0.8, 0.8, 0.9, 1.1, 'Content that makes you feel strong'),
-- Light/Fun
('quirky', 'content_state', 0.75, 0.65, 0.6, 0.9, 'Content that is charmingly odd'),
('lighthearted', 'content_state', 0.8, 0.6, 0.65, 0.8, 'Content that is easy and fun'),
('escapist', 'content_state', 0.75, 0.55, 0.6, 0.9, 'Content for mental getaway')
ON CONFLICT (emotion_label, category) DO UPDATE SET
    valence = EXCLUDED.valence,
    arousal = EXCLUDED.arousal,
    dominance = EXCLUDED.dominance,
    intensity_multiplier = EXCLUDED.intensity_multiplier,
    description = EXCLUDED.description;


-- ============================================================================
-- PART 2: SEED EMOTION_TO_INTENT_MAP
-- Maps user emotions to content intents with weights (0-1)
-- Higher weight = stronger association
-- Using INSERT ON CONFLICT to avoid DELETE/TRUNCATE timeout issues
-- ============================================================================

-- Create unique constraint if not exists (for ON CONFLICT to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'emotion_to_intent_map_emotion_intent_unique'
    ) THEN
        ALTER TABLE emotion_to_intent_map
        ADD CONSTRAINT emotion_to_intent_map_emotion_intent_unique
        UNIQUE (emotion_id, intent_type);
    END IF;
END $$;

-- Insert emotion-to-intent mappings using dynamic ID lookups
-- This approach looks up actual emotion IDs from emotion_master instead of using hardcoded UUIDs

-- HAPPY user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('light_entertainment'::text, 0.9::real),
    ('family_bonding', 0.8),
    ('adrenaline_rush', 0.7),
    ('comfort_escape', 0.6),
    ('discovery', 0.5)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'happy' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- SAD user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.95::real),
    ('emotional_release', 0.9),
    ('light_entertainment', 0.7),
    ('family_bonding', 0.5)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'sad' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ANGRY user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('adrenaline_rush'::text, 0.9::real),
    ('emotional_release', 0.85),
    ('comfort_escape', 0.6),
    ('deep_thought', 0.4)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'angry' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ANXIOUS user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.95::real),
    ('light_entertainment', 0.85),
    ('background_passive', 0.8),
    ('family_bonding', 0.6)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'anxious' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- CALM user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.9::real),
    ('deep_thought', 0.85),
    ('discovery', 0.8),
    ('background_passive', 0.75),
    ('family_bonding', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'calm' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- EXCITED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('adrenaline_rush'::text, 0.95::real),
    ('discovery', 0.8),
    ('light_entertainment', 0.75),
    ('deep_thought', 0.5)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'excited' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- BORED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('adrenaline_rush'::text, 0.9::real),
    ('discovery', 0.85),
    ('deep_thought', 0.8),
    ('light_entertainment', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'bored' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- STRESSED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.95::real),
    ('light_entertainment', 0.9),
    ('background_passive', 0.85),
    ('emotional_release', 0.6)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'stressed' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- LONELY user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.95::real),
    ('family_bonding', 0.9),
    ('emotional_release', 0.8),
    ('light_entertainment', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'lonely' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- HOPEFUL user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('discovery'::text, 0.9::real),
    ('deep_thought', 0.85),
    ('light_entertainment', 0.7),
    ('family_bonding', 0.65)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'hopeful' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- NOSTALGIC user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.95::real),
    ('emotional_release', 0.8),
    ('family_bonding', 0.75),
    ('light_entertainment', 0.6)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'nostalgic' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- CURIOUS user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('discovery'::text, 0.95::real),
    ('deep_thought', 0.9),
    ('adrenaline_rush', 0.6)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'curious' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- TIRED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('background_passive'::text, 0.95::real),
    ('comfort_escape', 0.9),
    ('light_entertainment', 0.85),
    ('family_bonding', 0.6)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'tired' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ROMANTIC user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('emotional_release'::text, 0.9::real),
    ('comfort_escape', 0.85),
    ('light_entertainment', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'romantic' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ADVENTUROUS user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('adrenaline_rush'::text, 0.95::real),
    ('discovery', 0.9),
    ('deep_thought', 0.6)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'adventurous' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- MELANCHOLIC user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('emotional_release'::text, 0.95::real),
    ('comfort_escape', 0.85),
    ('deep_thought', 0.8)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'melancholic' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- CONTENT user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.9::real),
    ('background_passive', 0.85),
    ('family_bonding', 0.8),
    ('discovery', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'content' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- FRUSTRATED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('emotional_release'::text, 0.9::real),
    ('adrenaline_rush', 0.85),
    ('light_entertainment', 0.75),
    ('comfort_escape', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'frustrated' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- INSPIRED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('discovery'::text, 0.95::real),
    ('deep_thought', 0.9),
    ('adrenaline_rush', 0.7)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'inspired' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- OVERWHELMED user
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight)
SELECT em.id, v.intent_type, v.weight
FROM emotion_master em
CROSS JOIN (VALUES
    ('comfort_escape'::text, 0.95::real),
    ('background_passive', 0.9),
    ('light_entertainment', 0.85)
) AS v(intent_type, weight)
WHERE em.emotion_label = 'overwhelmed' AND em.category = 'user_state'
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;


-- ============================================================================
-- PART 3: SEED EMOTION_TRANSFORMATION_MAP
-- Defines how content emotions can transform user emotions
-- Using dynamic ID lookups from emotion_master instead of hardcoded UUIDs
-- transformation_type: soothe, stabilize, validate, amplify, complementary, reinforcing, neutral_balancing
-- ============================================================================

-- Create unique constraint if not exists (for ON CONFLICT to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'emotion_transformation_map_user_content_unique'
    ) THEN
        ALTER TABLE emotion_transformation_map
        ADD CONSTRAINT emotion_transformation_map_user_content_unique
        UNIQUE (user_emotion_id, content_emotion_id);
    END IF;
END $$;

-- Insert all transformation mappings using a single efficient query
-- This creates mappings between user emotions and content emotions with transformation rules
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank)
SELECT u.id, c.id, v.transformation_type::text, v.confidence_score::real, v.priority_rank::int
FROM (VALUES
    -- HAPPY user transformations
    ('happy', 'hilarious', 'amplify', 0.9, 1),
    ('happy', 'feel-good', 'reinforcing', 0.95, 2),
    ('happy', 'thrilling', 'amplify', 0.85, 3),
    ('happy', 'uplifting', 'reinforcing', 0.9, 4),
    ('happy', 'lighthearted', 'reinforcing', 0.85, 5),
    -- SAD user transformations
    ('sad', 'comforting', 'soothe', 0.95, 1),
    ('sad', 'heartwarming', 'soothe', 0.9, 2),
    ('sad', 'tear-jerker', 'validate', 0.85, 3),
    ('sad', 'uplifting', 'complementary', 0.9, 4),
    ('sad', 'melancholic', 'validate', 0.8, 5),
    ('sad', 'hilarious', 'complementary', 0.75, 6),
    -- ANGRY user transformations
    ('angry', 'thrilling', 'validate', 0.9, 1),
    ('angry', 'intense', 'validate', 0.85, 2),
    ('angry', 'cathartic', 'soothe', 0.8, 3),
    ('angry', 'empowering', 'complementary', 0.85, 4),
    ('angry', 'peaceful', 'soothe', 0.7, 5),
    -- ANXIOUS user transformations
    ('anxious', 'comforting', 'soothe', 0.95, 1),
    ('anxious', 'peaceful', 'soothe', 0.9, 2),
    ('anxious', 'cozy', 'soothe', 0.9, 3),
    ('anxious', 'lighthearted', 'soothe', 0.85, 4),
    ('anxious', 'escapist', 'complementary', 0.8, 5),
    ('anxious', 'wholesome', 'soothe', 0.85, 6),
    -- CALM user transformations
    ('calm', 'peaceful', 'reinforcing', 0.95, 1),
    ('calm', 'thought-provoking', 'complementary', 0.9, 2),
    ('calm', 'educational', 'complementary', 0.85, 3),
    ('calm', 'cozy', 'reinforcing', 0.9, 4),
    ('calm', 'mind-bending', 'amplify', 0.75, 5),
    -- EXCITED user transformations
    ('excited', 'thrilling', 'amplify', 0.95, 1),
    ('excited', 'exhilarating', 'amplify', 0.95, 2),
    ('excited', 'intense', 'reinforcing', 0.9, 3),
    ('excited', 'hilarious', 'amplify', 0.85, 4),
    ('excited', 'mind-bending', 'complementary', 0.8, 5),
    -- BORED user transformations
    ('bored', 'thrilling', 'complementary', 0.95, 1),
    ('bored', 'suspenseful', 'complementary', 0.9, 2),
    ('bored', 'mind-bending', 'complementary', 0.9, 3),
    ('bored', 'shocking', 'complementary', 0.85, 4),
    ('bored', 'thought-provoking', 'complementary', 0.85, 5),
    -- STRESSED user transformations
    ('stressed', 'comforting', 'soothe', 0.95, 1),
    ('stressed', 'peaceful', 'soothe', 0.95, 2),
    ('stressed', 'lighthearted', 'soothe', 0.9, 3),
    ('stressed', 'hilarious', 'soothe', 0.85, 4),
    ('stressed', 'escapist', 'complementary', 0.85, 5),
    -- LONELY user transformations
    ('lonely', 'heartwarming', 'soothe', 0.95, 1),
    ('lonely', 'wholesome', 'soothe', 0.9, 2),
    ('lonely', 'romantic', 'validate', 0.85, 3),
    ('lonely', 'feel-good', 'complementary', 0.9, 4),
    ('lonely', 'nostalgic', 'validate', 0.8, 5),
    -- HOPEFUL user transformations
    ('hopeful', 'inspiring', 'amplify', 0.95, 1),
    ('hopeful', 'uplifting', 'amplify', 0.9, 2),
    ('hopeful', 'empowering', 'reinforcing', 0.9, 3),
    ('hopeful', 'thought-provoking', 'complementary', 0.85, 4),
    ('hopeful', 'feel-good', 'reinforcing', 0.85, 5),
    -- NOSTALGIC user transformations
    ('nostalgic', 'nostalgic', 'validate', 0.95, 1),
    ('nostalgic', 'heartwarming', 'reinforcing', 0.9, 2),
    ('nostalgic', 'bittersweet', 'validate', 0.85, 3),
    ('nostalgic', 'cozy', 'reinforcing', 0.85, 4),
    -- CURIOUS user transformations
    ('curious', 'thought-provoking', 'amplify', 0.95, 1),
    ('curious', 'mind-bending', 'amplify', 0.95, 2),
    ('curious', 'educational', 'reinforcing', 0.9, 3),
    ('curious', 'suspenseful', 'amplify', 0.8, 4),
    -- TIRED user transformations
    ('tired', 'comforting', 'validate', 0.95, 1),
    ('tired', 'cozy', 'validate', 0.95, 2),
    ('tired', 'lighthearted', 'validate', 0.9, 3),
    ('tired', 'peaceful', 'validate', 0.9, 4),
    ('tired', 'escapist', 'validate', 0.85, 5),
    -- ROMANTIC user transformations
    ('romantic', 'romantic', 'amplify', 0.95, 1),
    ('romantic', 'heartwarming', 'reinforcing', 0.9, 2),
    ('romantic', 'bittersweet', 'validate', 0.85, 3),
    ('romantic', 'poignant', 'validate', 0.85, 4),
    -- ADVENTUROUS user transformations
    ('adventurous', 'thrilling', 'amplify', 0.95, 1),
    ('adventurous', 'exhilarating', 'amplify', 0.95, 2),
    ('adventurous', 'mind-bending', 'complementary', 0.85, 3),
    ('adventurous', 'intense', 'reinforcing', 0.9, 4),
    -- MELANCHOLIC user transformations
    ('melancholic', 'melancholic', 'validate', 0.95, 1),
    ('melancholic', 'poignant', 'validate', 0.9, 2),
    ('melancholic', 'cathartic', 'soothe', 0.85, 3),
    ('melancholic', 'bittersweet', 'validate', 0.85, 4),
    ('melancholic', 'uplifting', 'complementary', 0.75, 5),
    -- CONTENT user transformations
    ('content', 'cozy', 'reinforcing', 0.95, 1),
    ('content', 'wholesome', 'reinforcing', 0.9, 2),
    ('content', 'peaceful', 'reinforcing', 0.9, 3),
    ('content', 'thought-provoking', 'complementary', 0.8, 4),
    -- FRUSTRATED user transformations
    ('frustrated', 'cathartic', 'soothe', 0.9, 1),
    ('frustrated', 'empowering', 'complementary', 0.9, 2),
    ('frustrated', 'hilarious', 'soothe', 0.85, 3),
    ('frustrated', 'thrilling', 'validate', 0.8, 4),
    -- INSPIRED user transformations
    ('inspired', 'inspiring', 'amplify', 0.95, 1),
    ('inspired', 'empowering', 'amplify', 0.9, 2),
    ('inspired', 'thought-provoking', 'reinforcing', 0.9, 3),
    ('inspired', 'educational', 'reinforcing', 0.85, 4),
    -- OVERWHELMED user transformations
    ('overwhelmed', 'comforting', 'soothe', 0.95, 1),
    ('overwhelmed', 'peaceful', 'soothe', 0.95, 2),
    ('overwhelmed', 'cozy', 'soothe', 0.9, 3),
    ('overwhelmed', 'lighthearted', 'soothe', 0.85, 4),
    ('overwhelmed', 'escapist', 'complementary', 0.85, 5)
) AS v(user_emotion, content_emotion, transformation_type, confidence_score, priority_rank)
JOIN emotion_master u ON u.emotion_label = v.user_emotion AND u.category = 'user_state'
JOIN emotion_master c ON c.emotion_label = v.content_emotion AND c.category = 'content_state'
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;


-- ============================================================================
-- PART 4: SEED EMOTION_DISPLAY_PHRASES
-- Phrases shown to users based on their emotion and intensity
-- Using INSERT ON CONFLICT to avoid DELETE/TRUNCATE timeout issues
-- ============================================================================

-- Create unique constraint if not exists (for ON CONFLICT to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'emotion_display_phrases_emotion_phrase_unique'
    ) THEN
        ALTER TABLE emotion_display_phrases
        ADD CONSTRAINT emotion_display_phrases_emotion_phrase_unique
        UNIQUE (emotion_id, display_phrase);
    END IF;
END $$;

-- Insert all emotion display phrases using dynamic ID lookups
-- This avoids hardcoded UUIDs that may not exist in the target database
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity)
SELECT em.id, v.display_phrase, v.min_intensity::real, v.max_intensity::real
FROM (VALUES
    -- Happy phrases by intensity
    ('happy', 'Feeling pretty good', 0.0, 0.3),
    ('happy', 'In a good mood', 0.3, 0.5),
    ('happy', 'Feeling happy', 0.5, 0.7),
    ('happy', 'Really happy', 0.7, 0.85),
    ('happy', 'On top of the world', 0.85, 1.0),
    -- Sad phrases
    ('sad', 'A bit down', 0.0, 0.3),
    ('sad', 'Feeling low', 0.3, 0.5),
    ('sad', 'Feeling sad', 0.5, 0.7),
    ('sad', 'Really sad', 0.7, 0.85),
    ('sad', 'Deeply sad', 0.85, 1.0),
    -- Angry phrases
    ('angry', 'A bit irritated', 0.0, 0.3),
    ('angry', 'Frustrated', 0.3, 0.5),
    ('angry', 'Angry', 0.5, 0.7),
    ('angry', 'Really angry', 0.7, 0.85),
    ('angry', 'Furious', 0.85, 1.0),
    -- Anxious phrases
    ('anxious', 'Slightly uneasy', 0.0, 0.3),
    ('anxious', 'A bit anxious', 0.3, 0.5),
    ('anxious', 'Anxious', 0.5, 0.7),
    ('anxious', 'Very anxious', 0.7, 0.85),
    ('anxious', 'Extremely anxious', 0.85, 1.0),
    -- Calm phrases
    ('calm', 'Somewhat relaxed', 0.0, 0.3),
    ('calm', 'Relaxed', 0.3, 0.5),
    ('calm', 'Calm and peaceful', 0.5, 0.7),
    ('calm', 'Very calm', 0.7, 0.85),
    ('calm', 'Deeply serene', 0.85, 1.0),
    -- Excited phrases
    ('excited', 'A bit excited', 0.0, 0.3),
    ('excited', 'Excited', 0.3, 0.5),
    ('excited', 'Really excited', 0.5, 0.7),
    ('excited', 'Super excited', 0.7, 0.85),
    ('excited', 'Absolutely thrilled', 0.85, 1.0),
    -- Bored phrases
    ('bored', 'Slightly bored', 0.0, 0.3),
    ('bored', 'A bit bored', 0.3, 0.5),
    ('bored', 'Bored', 0.5, 0.7),
    ('bored', 'Really bored', 0.7, 0.85),
    ('bored', 'Extremely bored', 0.85, 1.0),
    -- Stressed phrases
    ('stressed', 'A bit tense', 0.0, 0.3),
    ('stressed', 'Stressed', 0.3, 0.5),
    ('stressed', 'Very stressed', 0.5, 0.7),
    ('stressed', 'Overwhelmed with stress', 0.7, 0.85),
    ('stressed', 'Extremely stressed', 0.85, 1.0),
    -- Lonely phrases
    ('lonely', 'A bit lonely', 0.0, 0.3),
    ('lonely', 'Feeling alone', 0.3, 0.5),
    ('lonely', 'Lonely', 0.5, 0.7),
    ('lonely', 'Very lonely', 0.7, 0.85),
    ('lonely', 'Deeply isolated', 0.85, 1.0),
    -- Hopeful phrases
    ('hopeful', 'Somewhat hopeful', 0.0, 0.3),
    ('hopeful', 'Hopeful', 0.3, 0.5),
    ('hopeful', 'Very hopeful', 0.5, 0.7),
    ('hopeful', 'Highly optimistic', 0.7, 0.85),
    ('hopeful', 'Filled with hope', 0.85, 1.0)
) AS v(emotion_label, display_phrase, min_intensity, max_intensity)
JOIN emotion_master em ON em.emotion_label = v.emotion_label AND em.category = 'user_state'
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;


-- ============================================================================
-- PART 5: FIX viib_score_components FUNCTION
-- The critical fix: Actually query transformation_score from title_transformation_scores
-- ============================================================================

CREATE OR REPLACE FUNCTION public.viib_score_components(p_user_id uuid, p_title_id uuid)
RETURNS TABLE(emotional_component real, social_component real, historical_component real, context_component real, novelty_component real)
LANGUAGE plpgsql
AS $function$
DECLARE
    -- User emotion state
    v_user_emotion_id uuid;
    v_user_valence real;
    v_user_arousal real;
    v_user_dominance real;
    v_user_intensity real;

    -- Title emotion data
    v_title_valence real;
    v_title_arousal real;
    v_title_dominance real;
    v_has_emotion_data boolean := false;

    -- Score components
    v_user_norm real;
    v_title_norm real;
    v_direct_cosine real := 0.5;
    v_transformation_score real := 0.5;  -- Default to neutral
    v_emotional_score real := 0.5;

    -- Social components
    v_friend_rating_score real := 0.0;
    v_friend_recommendation_score real := 0.0;

    -- Historical
    v_has_strong_history boolean := false;
    v_has_wishlist boolean := false;
    v_last_interaction_days real;

    -- Context
    v_avg_session_minutes real;
    v_runtime_minutes real;
    v_diff_ratio real;

    -- Novelty
    v_interaction_exists boolean := false;
BEGIN
    -- Initialize defaults
    emotional_component := 0.5;
    social_component := 0.0;
    historical_component := 0.0;
    context_component := 0.5;
    novelty_component := 1.0;

    -- =========================================================================
    -- 1. EMOTIONAL COMPONENT (35% weight)
    -- =========================================================================

    -- Get user's current emotion state
    SELECT ues.emotion_id, ues.valence, ues.arousal, ues.dominance, COALESCE(ues.intensity, 0.5)
    INTO v_user_emotion_id, v_user_valence, v_user_arousal, v_user_dominance, v_user_intensity
    FROM user_emotion_states ues
    WHERE ues.user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_user_emotion_id IS NOT NULL THEN
        -- Get title's average emotion vector from classified emotions
        SELECT
            COALESCE(AVG(em.valence * (vec.intensity_level / 10.0)), 0),
            COALESCE(AVG(em.arousal * (vec.intensity_level / 10.0)), 0),
            COALESCE(AVG(em.dominance * (vec.intensity_level / 10.0)), 0)
        INTO v_title_valence, v_title_arousal, v_title_dominance
        FROM viib_emotion_classified_titles vec
        JOIN emotion_master em ON em.id = vec.emotion_id
        WHERE vec.title_id = p_title_id;

        -- Check if title has emotion data
        SELECT EXISTS (
            SELECT 1 FROM viib_emotion_classified_titles vec2
            WHERE vec2.title_id = p_title_id
        ) INTO v_has_emotion_data;

        IF v_has_emotion_data THEN
            -- Calculate cosine similarity between user and title emotion vectors
            v_user_norm := sqrt(power(v_user_valence,2) + power(v_user_arousal,2) + power(v_user_dominance,2));
            v_title_norm := sqrt(power(v_title_valence,2) + power(v_title_arousal,2) + power(v_title_dominance,2));

            IF v_user_norm > 0.001 AND v_title_norm > 0.001 THEN
                v_direct_cosine := (
                    v_user_valence * v_title_valence +
                    v_user_arousal * v_title_arousal +
                    v_user_dominance * v_title_dominance
                ) / (v_user_norm * v_title_norm);
                -- Normalize from [-1,1] to [0,1]
                v_direct_cosine := (v_direct_cosine + 1.0) / 2.0;
            END IF;

            -- *** CRITICAL FIX: Actually get transformation score from the table ***
            SELECT COALESCE(tts.transformation_score, 0.5)
            INTO v_transformation_score
            FROM title_transformation_scores tts
            WHERE tts.user_emotion_id = v_user_emotion_id
              AND tts.title_id = p_title_id;

            -- If no pre-computed score, calculate on-the-fly from transformation map
            IF v_transformation_score IS NULL OR v_transformation_score = 0.5 THEN
                SELECT COALESCE(
                    SUM(etm.confidence_score *
                        CASE etm.transformation_type
                            WHEN 'amplify' THEN 1.0
                            WHEN 'complementary' THEN 0.95
                            WHEN 'soothe' THEN 0.9
                            WHEN 'validate' THEN 0.85
                            WHEN 'reinforcing' THEN 0.8
                            WHEN 'neutral_balancing' THEN 0.7
                            WHEN 'stabilize' THEN 0.65
                            ELSE 0.5
                        END * (vec.intensity_level / 10.0)
                    ) / NULLIF(SUM(etm.confidence_score), 0),
                    0.5
                )
                INTO v_transformation_score
                FROM emotion_transformation_map etm
                JOIN viib_emotion_classified_titles vec
                    ON vec.emotion_id = etm.content_emotion_id
                    AND vec.title_id = p_title_id
                WHERE etm.user_emotion_id = v_user_emotion_id;
            END IF;

            -- Combine: 50% direct similarity + 50% transformation potential
            -- Weight transformation more if user is in negative emotional state
            IF v_user_valence < 0 THEN
                -- User is in negative state, transformation matters more
                v_emotional_score := 0.35 * v_direct_cosine + 0.65 * COALESCE(v_transformation_score, 0.5);
            ELSE
                -- User is positive, balance between matching and transformation
                v_emotional_score := 0.5 * v_direct_cosine + 0.5 * COALESCE(v_transformation_score, 0.5);
            END IF;

            emotional_component := LEAST(GREATEST(v_emotional_score, 0.0), 1.0);
        END IF;
    END IF;

    -- =========================================================================
    -- 2. SOCIAL COMPONENT (20% weight)
    -- =========================================================================

    -- Get friend ratings for this title (weighted by trust)
    SELECT COALESCE(
        AVG(
            CASE uti.rating_value
                WHEN 'love_it' THEN 1.0
                WHEN 'like_it' THEN 0.75
                WHEN 'ok' THEN 0.5
                ELSE 0.0
            END * fc.trust_score
        ), 0
    )
    INTO v_friend_rating_score
    FROM friend_connections fc
    JOIN user_title_interactions uti
        ON uti.user_id = fc.friend_user_id
        AND uti.title_id = p_title_id
        AND uti.rating_value IS NOT NULL
    WHERE fc.user_id = p_user_id
      AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE);

    -- Get direct friend recommendations for this title
    SELECT COALESCE(AVG(fc.trust_score * 0.85), 0)
    INTO v_friend_recommendation_score
    FROM user_social_recommendations usr
    JOIN friend_connections fc
        ON fc.user_id = p_user_id
        AND fc.friend_user_id = usr.sender_user_id
        AND (fc.is_blocked IS NULL OR fc.is_blocked = FALSE)
    WHERE usr.receiver_user_id = p_user_id
      AND usr.title_id = p_title_id;

    -- Combine social signals
    IF v_friend_rating_score > 0 AND v_friend_recommendation_score > 0 THEN
        social_component := (v_friend_rating_score + v_friend_recommendation_score) / 2.0;
    ELSE
        social_component := GREATEST(v_friend_rating_score, v_friend_recommendation_score);
    END IF;
    social_component := LEAST(GREATEST(social_component, 0.0), 1.0);

    -- =========================================================================
    -- 3. HISTORICAL COMPONENT (25% weight)
    -- =========================================================================

    SELECT
        BOOL_OR(interaction_type IN ('completed','liked') AND rating_value IN ('love_it','like_it')),
        BOOL_OR(interaction_type = 'wishlisted'),
        EXTRACT(DAY FROM (NOW() - MAX(created_at)))
    INTO v_has_strong_history, v_has_wishlist, v_last_interaction_days
    FROM user_title_interactions
    WHERE user_id = p_user_id AND title_id = p_title_id;

    IF v_has_strong_history THEN
        -- Time decay: reduce score for older interactions
        historical_component := EXP(-COALESCE(v_last_interaction_days, 0) / 180.0);
    ELSIF v_has_wishlist THEN
        historical_component := 0.6;  -- Wishlisted shows interest
    ELSE
        historical_component := 0.0;
    END IF;

    -- =========================================================================
    -- 4. CONTEXT COMPONENT (10% weight)
    -- =========================================================================

    SELECT COALESCE(AVG(session_length_seconds) / 60.0, NULL)
    INTO v_avg_session_minutes
    FROM user_context_logs
    WHERE user_id = p_user_id;

    SELECT t.runtime::real
    INTO v_runtime_minutes
    FROM titles t
    WHERE t.id = p_title_id;

    IF v_avg_session_minutes IS NOT NULL AND v_runtime_minutes IS NOT NULL AND v_runtime_minutes > 0 THEN
        v_diff_ratio := ABS(v_runtime_minutes - v_avg_session_minutes) / GREATEST(v_runtime_minutes, v_avg_session_minutes);
        context_component := LEAST(GREATEST(1.0 - v_diff_ratio, 0.0), 1.0);
    ELSE
        context_component := 0.5;  -- Neutral default
    END IF;

    -- =========================================================================
    -- 5. NOVELTY COMPONENT (10% weight)
    -- =========================================================================

    SELECT EXISTS (
        SELECT 1 FROM user_title_interactions
        WHERE user_id = p_user_id AND title_id = p_title_id
    ) INTO v_interaction_exists;

    IF v_interaction_exists THEN
        novelty_component := 0.3;  -- Not novel, but not zero (re-watch value)
    ELSE
        novelty_component := 1.0;  -- Full novelty bonus
    END IF;

    RETURN QUERY SELECT emotional_component, social_component, historical_component, context_component, novelty_component;
END;
$function$;


-- ============================================================================
-- PART 6: UPDATE get_top_recommendations FUNCTION
-- Ensure it properly uses the fixed viib_score_components
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_recommendations(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, final_score real)
LANGUAGE plpgsql
STABLE
SET statement_timeout = '60s'
AS $function$
DECLARE
    w_emotional      REAL := 0.35;
    w_social         REAL := 0.20;
    w_historical     REAL := 0.25;
    w_context        REAL := 0.10;
    w_novelty        REAL := 0.10;
BEGIN
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
    -- Get candidate titles (available on user's streaming services, in their language, not watched/disliked)
    candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE
            -- Must have classification complete (has emotion data)
            t.classification_status = 'complete'
            -- Available on user's streaming services
            AND EXISTS (
                SELECT 1
                FROM title_streaming_availability tsa
                JOIN user_streaming_subscriptions uss
                    ON uss.streaming_service_id = tsa.streaming_service_id
                    AND uss.user_id = p_user_id
                    AND uss.is_active = TRUE
                WHERE tsa.title_id = t.id
            )
            -- In user's language preferences
            AND t.original_language IN (
                SELECT language_code
                FROM user_language_preferences
                WHERE user_id = p_user_id
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

    -- Pre-filter to top 300 by social recommendations and popularity
    prefiltered AS (
        SELECT
            ct.cid,
            COALESCE(rec.rec_count, 0) AS social_rec_count,
            COALESCE(t.popularity, 0) AS popularity_score
        FROM candidate_titles ct
        JOIN titles t ON t.id = ct.cid
        LEFT JOIN (
            SELECT usr.title_id, COUNT(*) AS rec_count
            FROM user_social_recommendations usr
            WHERE usr.receiver_user_id = p_user_id
            GROUP BY usr.title_id
        ) rec ON rec.title_id = ct.cid
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
        SELECT s.cid, s.base_score
        FROM scored s
        ORDER BY s.base_score DESC
        LIMIT 100
    ),

    -- Add intent alignment and social priority
    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
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
            GREATEST(
                wi.base_score * wi.intent_score,
                wi.social_score
            ) AS combined_score
        FROM with_intent wi
    )

    SELECT
        c.cid AS title_id,
        c.base_score AS base_viib_score,
        c.intent_score AS intent_alignment_score,
        c.social_score AS social_priority_score,
        c.combined_score AS final_score
    FROM combined c
    ORDER BY c.combined_score DESC
    LIMIT p_limit;
END;
$function$;


-- ============================================================================
-- PART 7: UPDATE get_top_recommendations_with_intent FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_recommendations_with_intent(p_user_id uuid, p_limit integer)
RETURNS TABLE(title_id uuid, base_viib_score real, intent_alignment_score real, social_priority_score real, final_score real)
LANGUAGE plpgsql
STABLE
SET statement_timeout = '60s'
AS $function$
DECLARE
    w_emotional      REAL := 0.35;
    w_social         REAL := 0.20;
    w_historical     REAL := 0.25;
    w_context        REAL := 0.10;
    w_novelty        REAL := 0.10;
BEGIN
    -- Load active weights
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
    WITH candidate_titles AS (
        SELECT DISTINCT t.id AS cid
        FROM titles t
        WHERE
            t.classification_status = 'complete'
            AND EXISTS (
                SELECT 1
                FROM title_streaming_availability tsa
                JOIN user_streaming_subscriptions uss
                    ON uss.streaming_service_id = tsa.streaming_service_id
                    AND uss.user_id = p_user_id
                    AND uss.is_active = TRUE
                WHERE tsa.title_id = t.id
            )
            AND t.original_language IN (
                SELECT ulp.language_code
                FROM user_language_preferences ulp
                WHERE ulp.user_id = p_user_id
            )
            AND NOT EXISTS (
                SELECT 1
                FROM user_title_interactions uti
                WHERE uti.user_id = p_user_id
                    AND uti.title_id = t.id
                    AND uti.interaction_type IN ('completed','disliked')
            )
    ),

    prefiltered AS (
        SELECT
            ct.cid,
            COALESCE(usr.rec_count, 0) AS social_rec_count,
            COALESCE(t.popularity, 0) AS popularity_score,
            COALESCE(uti_agg.interactions, 0) AS user_interaction_count
        FROM candidate_titles ct
        JOIN titles t ON t.id = ct.cid
        LEFT JOIN (
            SELECT usr_inner.title_id AS usr_title_id, COUNT(*) AS rec_count
            FROM user_social_recommendations usr_inner
            WHERE usr_inner.receiver_user_id = p_user_id
            GROUP BY usr_inner.title_id
        ) usr ON usr.usr_title_id = ct.cid
        LEFT JOIN (
            SELECT uti_inner.title_id AS uti_title_id, COUNT(*) AS interactions
            FROM user_title_interactions uti_inner
            WHERE uti_inner.user_id = p_user_id
            GROUP BY uti_inner.title_id
        ) uti_agg ON uti_agg.uti_title_id = ct.cid
        ORDER BY
            social_rec_count DESC,
            popularity_score DESC,
            user_interaction_count ASC
        LIMIT 300
    ),

    scored_components AS (
        SELECT
            pf.cid,
            vsc.emotional_component,
            vsc.social_component,
            vsc.historical_component,
            vsc.context_component,
            vsc.novelty_component
        FROM prefiltered pf
        CROSS JOIN LATERAL viib_score_components(p_user_id, pf.cid) AS vsc
    ),

    base_scored AS (
        SELECT
            sc.cid,
            (
                sc.emotional_component * w_emotional +
                sc.social_component * w_social +
                sc.historical_component * w_historical +
                sc.context_component * w_context +
                sc.novelty_component * w_novelty
            ) AS base_score
        FROM scored_components sc
    ),

    top_base AS (
        SELECT b.cid, b.base_score
        FROM base_scored b
        ORDER BY b.base_score DESC
        LIMIT 100
    ),

    with_intent AS (
        SELECT
            tb.cid,
            tb.base_score,
            viib_intent_alignment_score(p_user_id, tb.cid) AS intent_score,
            viib_social_priority_score(p_user_id, tb.cid) AS social_score
        FROM top_base tb
    ),

    combined AS (
        SELECT
            wi.cid,
            wi.base_score,
            wi.intent_score,
            wi.social_score,
            GREATEST(
                wi.base_score * wi.intent_score,
                wi.social_score
            ) AS combined_score
        FROM with_intent wi
    )

    SELECT
        c.cid,
        c.base_score,
        c.intent_score,
        c.social_score,
        c.combined_score
    FROM combined c
    ORDER BY c.combined_score DESC
    LIMIT p_limit;
END;
$function$;


-- ============================================================================
-- PART 8: UPDATE refresh_title_transformation_scores FUNCTION
-- Make sure it properly computes transformation scores
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_title_transformation_scores()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout TO '300s'
AS $function$
BEGIN
    -- Clear and rebuild transformation scores
    TRUNCATE title_transformation_scores;

    INSERT INTO title_transformation_scores (user_emotion_id, title_id, transformation_score, updated_at)
    SELECT
        etm.user_emotion_id,
        vec.title_id,
        COALESCE(
            SUM(
                etm.confidence_score *
                CASE etm.transformation_type
                    WHEN 'amplify' THEN 1.0
                    WHEN 'complementary' THEN 0.95
                    WHEN 'soothe' THEN 0.9
                    WHEN 'validate' THEN 0.85
                    WHEN 'reinforcing' THEN 0.8
                    WHEN 'neutral_balancing' THEN 0.7
                    WHEN 'stabilize' THEN 0.65
                    ELSE 0.5
                END *
                (vec.intensity_level / 10.0)
            ) / NULLIF(SUM(etm.confidence_score), 0),
            0.5
        ) AS transformation_score,
        NOW() AS updated_at
    FROM emotion_transformation_map etm
    JOIN emotion_master em_user
        ON em_user.id = etm.user_emotion_id
        AND em_user.category = 'user_state'
    JOIN viib_emotion_classified_titles vec
        ON vec.emotion_id = etm.content_emotion_id
    GROUP BY etm.user_emotion_id, vec.title_id
    ON CONFLICT (user_emotion_id, title_id) DO UPDATE SET
        transformation_score = EXCLUDED.transformation_score,
        updated_at = EXCLUDED.updated_at;
END;
$function$;


-- ============================================================================
-- PART 9: Ensure viib_weight_config has default active weights
-- ============================================================================

INSERT INTO viib_weight_config (emotional_weight, social_weight, historical_weight, context_weight, novelty_weight, is_active, notes)
SELECT 0.35, 0.20, 0.25, 0.10, 0.10, TRUE, 'Default weights - Phase 1 foundation'
WHERE NOT EXISTS (SELECT 1 FROM viib_weight_config WHERE is_active = TRUE);


-- ============================================================================
-- COMPLETE: Phase 1 Foundation Migration
-- ============================================================================
-- Summary of changes:
-- 1. ✅ Seeded emotion_master with 20 user_state + 30 content_state emotions
-- 2. ✅ Seeded emotion_to_intent_map with all 20 user emotions mapped to 8 intents
-- 3. ✅ Seeded emotion_transformation_map with transformation rules for all 20 user emotions
-- 4. ✅ Seeded emotion_display_phrases for user-friendly emotion display
-- 5. ✅ Fixed viib_score_components to actually query transformation scores
-- 6. ✅ Fixed get_top_recommendations to use updated scoring
-- 7. ✅ Fixed get_top_recommendations_with_intent to use updated scoring
-- 8. ✅ Fixed refresh_title_transformation_scores to compute scores correctly
-- 9. ✅ Ensured viib_weight_config has default active weights
-- ============================================================================
