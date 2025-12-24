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
-- Values range from -1.0 to 1.0
-- Categories: 'user_state' (what user feels), 'content_state' (what content evokes)
-- Using INSERT ON CONFLICT to avoid DELETE/TRUNCATE timeout issues
-- ============================================================================

-- Insert USER_STATE emotions (emotions users can feel)
INSERT INTO emotion_master (id, emotion_label, category, valence, arousal, dominance, intensity_multiplier, description) VALUES
('11111111-0001-0001-0001-000000000001', 'happy', 'user_state', 0.8, 0.5, 0.6, 1.0, 'Feeling joyful, content, and positive'),
('11111111-0001-0001-0001-000000000002', 'sad', 'user_state', -0.7, -0.3, -0.5, 1.2, 'Feeling down, melancholic, or blue'),
('11111111-0001-0001-0001-000000000003', 'angry', 'user_state', -0.6, 0.8, 0.5, 1.3, 'Feeling frustrated, irritated, or furious'),
('11111111-0001-0001-0001-000000000004', 'anxious', 'user_state', -0.5, 0.7, -0.6, 1.2, 'Feeling worried, nervous, or uneasy'),
('11111111-0001-0001-0001-000000000005', 'calm', 'user_state', 0.4, -0.6, 0.3, 0.8, 'Feeling peaceful, relaxed, and centered'),
('11111111-0001-0001-0001-000000000006', 'excited', 'user_state', 0.7, 0.8, 0.5, 1.1, 'Feeling enthusiastic, energized, and eager'),
('11111111-0001-0001-0001-000000000007', 'bored', 'user_state', -0.3, -0.7, -0.2, 0.9, 'Feeling unstimulated, disengaged, or restless'),
('11111111-0001-0001-0001-000000000008', 'stressed', 'user_state', -0.6, 0.6, -0.4, 1.3, 'Feeling overwhelmed, pressured, or tense'),
('11111111-0001-0001-0001-000000000009', 'lonely', 'user_state', -0.6, -0.4, -0.5, 1.1, 'Feeling isolated, disconnected, or alone'),
('11111111-0001-0001-0001-000000000010', 'hopeful', 'user_state', 0.5, 0.3, 0.4, 1.0, 'Feeling optimistic about the future'),
('11111111-0001-0001-0001-000000000011', 'nostalgic', 'user_state', 0.2, -0.2, 0.0, 0.9, 'Feeling wistful about the past'),
('11111111-0001-0001-0001-000000000012', 'curious', 'user_state', 0.4, 0.4, 0.3, 1.0, 'Feeling inquisitive and wanting to learn'),
('11111111-0001-0001-0001-000000000013', 'tired', 'user_state', -0.2, -0.8, -0.3, 0.7, 'Feeling fatigued, low energy'),
('11111111-0001-0001-0001-000000000014', 'romantic', 'user_state', 0.7, 0.4, 0.2, 1.0, 'Feeling loving, affectionate'),
('11111111-0001-0001-0001-000000000015', 'adventurous', 'user_state', 0.6, 0.7, 0.6, 1.1, 'Feeling bold, ready for new experiences'),
('11111111-0001-0001-0001-000000000016', 'melancholic', 'user_state', -0.4, -0.4, -0.3, 1.0, 'Feeling pensive sadness'),
('11111111-0001-0001-0001-000000000017', 'content', 'user_state', 0.6, -0.3, 0.4, 0.9, 'Feeling satisfied and at peace'),
('11111111-0001-0001-0001-000000000018', 'frustrated', 'user_state', -0.5, 0.5, -0.2, 1.2, 'Feeling blocked or hindered'),
('11111111-0001-0001-0001-000000000019', 'inspired', 'user_state', 0.7, 0.6, 0.5, 1.1, 'Feeling motivated and creative'),
('11111111-0001-0001-0001-000000000020', 'overwhelmed', 'user_state', -0.5, 0.4, -0.6, 1.3, 'Feeling like too much is happening')
ON CONFLICT (id) DO UPDATE SET
    emotion_label = EXCLUDED.emotion_label,
    category = EXCLUDED.category,
    valence = EXCLUDED.valence,
    arousal = EXCLUDED.arousal,
    dominance = EXCLUDED.dominance,
    intensity_multiplier = EXCLUDED.intensity_multiplier,
    description = EXCLUDED.description;

-- Insert CONTENT_STATE emotions (emotions content can evoke)
INSERT INTO emotion_master (id, emotion_label, category, valence, arousal, dominance, intensity_multiplier, description) VALUES
-- Positive high-arousal
('22222222-0002-0002-0002-000000000001', 'thrilling', 'content_state', 0.6, 0.9, 0.4, 1.2, 'Content that creates excitement and suspense'),
('22222222-0002-0002-0002-000000000002', 'exhilarating', 'content_state', 0.8, 0.9, 0.6, 1.3, 'Content that produces intense excitement'),
('22222222-0002-0002-0002-000000000003', 'hilarious', 'content_state', 0.9, 0.7, 0.5, 1.1, 'Content that makes you laugh hard'),
('22222222-0002-0002-0002-000000000004', 'uplifting', 'content_state', 0.8, 0.5, 0.5, 1.0, 'Content that elevates mood and spirits'),
-- Positive low-arousal
('22222222-0002-0002-0002-000000000005', 'heartwarming', 'content_state', 0.8, 0.2, 0.3, 0.9, 'Content that creates warm, fuzzy feelings'),
('22222222-0002-0002-0002-000000000006', 'comforting', 'content_state', 0.6, -0.4, 0.3, 0.8, 'Content that soothes and relaxes'),
('22222222-0002-0002-0002-000000000007', 'peaceful', 'content_state', 0.5, -0.6, 0.4, 0.7, 'Content that creates tranquility'),
('22222222-0002-0002-0002-000000000008', 'cozy', 'content_state', 0.6, -0.5, 0.3, 0.8, 'Content that feels like a warm blanket'),
-- Negative high-arousal
('22222222-0002-0002-0002-000000000009', 'terrifying', 'content_state', -0.6, 0.9, -0.5, 1.4, 'Content that creates intense fear'),
('22222222-0002-0002-0002-000000000010', 'intense', 'content_state', 0.0, 0.9, 0.3, 1.3, 'Content with high emotional stakes'),
('22222222-0002-0002-0002-000000000011', 'suspenseful', 'content_state', 0.1, 0.8, -0.2, 1.2, 'Content that keeps you on edge'),
('22222222-0002-0002-0002-000000000012', 'shocking', 'content_state', -0.2, 0.9, -0.3, 1.4, 'Content with unexpected twists'),
-- Negative low-arousal
('22222222-0002-0002-0002-000000000013', 'melancholic', 'content_state', -0.4, -0.3, -0.2, 1.0, 'Content with beautiful sadness'),
('22222222-0002-0002-0002-000000000014', 'bittersweet', 'content_state', 0.1, -0.1, 0.0, 1.0, 'Content mixing joy and sorrow'),
('22222222-0002-0002-0002-000000000015', 'poignant', 'content_state', -0.2, 0.2, 0.1, 1.1, 'Content that touches deeply'),
('22222222-0002-0002-0002-000000000016', 'somber', 'content_state', -0.5, -0.4, -0.1, 1.0, 'Content with serious, dark tone'),
-- Cognitive/Intellectual
('22222222-0002-0002-0002-000000000017', 'thought-provoking', 'content_state', 0.3, 0.4, 0.4, 1.1, 'Content that makes you think'),
('22222222-0002-0002-0002-000000000018', 'mind-bending', 'content_state', 0.4, 0.6, 0.2, 1.2, 'Content that challenges perception'),
('22222222-0002-0002-0002-000000000019', 'educational', 'content_state', 0.4, 0.3, 0.5, 0.9, 'Content that teaches and informs'),
('22222222-0002-0002-0002-000000000020', 'inspiring', 'content_state', 0.7, 0.5, 0.6, 1.1, 'Content that motivates action'),
-- Social/Connection
('22222222-0002-0002-0002-000000000021', 'romantic', 'content_state', 0.7, 0.4, 0.2, 1.0, 'Content about love and relationships'),
('22222222-0002-0002-0002-000000000022', 'nostalgic', 'content_state', 0.3, -0.2, 0.1, 0.9, 'Content that evokes fond memories'),
('22222222-0002-0002-0002-000000000023', 'wholesome', 'content_state', 0.7, 0.1, 0.4, 0.9, 'Content that is pure and good'),
('22222222-0002-0002-0002-000000000024', 'feel-good', 'content_state', 0.8, 0.3, 0.4, 1.0, 'Content designed to make you happy'),
-- Cathartic
('22222222-0002-0002-0002-000000000025', 'cathartic', 'content_state', 0.2, 0.5, 0.3, 1.2, 'Content that provides emotional release'),
('22222222-0002-0002-0002-000000000026', 'tear-jerker', 'content_state', -0.3, 0.4, -0.1, 1.2, 'Content that makes you cry'),
('22222222-0002-0002-0002-000000000027', 'empowering', 'content_state', 0.6, 0.6, 0.8, 1.1, 'Content that makes you feel strong'),
-- Light/Fun
('22222222-0002-0002-0002-000000000028', 'quirky', 'content_state', 0.5, 0.3, 0.2, 0.9, 'Content that is charmingly odd'),
('22222222-0002-0002-0002-000000000029', 'lighthearted', 'content_state', 0.6, 0.2, 0.3, 0.8, 'Content that is easy and fun'),
('22222222-0002-0002-0002-000000000030', 'escapist', 'content_state', 0.5, 0.1, 0.2, 0.9, 'Content for mental getaway')
ON CONFLICT (id) DO UPDATE SET
    emotion_label = EXCLUDED.emotion_label,
    category = EXCLUDED.category,
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

-- HAPPY user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000001', 'light_entertainment', 0.9),
('11111111-0001-0001-0001-000000000001', 'family_bonding', 0.8),
('11111111-0001-0001-0001-000000000001', 'adrenaline_rush', 0.7),
('11111111-0001-0001-0001-000000000001', 'comfort_escape', 0.6),
('11111111-0001-0001-0001-000000000001', 'discovery', 0.5)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- SAD user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000002', 'comfort_escape', 0.95),
('11111111-0001-0001-0001-000000000002', 'emotional_release', 0.9),
('11111111-0001-0001-0001-000000000002', 'light_entertainment', 0.7),
('11111111-0001-0001-0001-000000000002', 'family_bonding', 0.5)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ANGRY user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000003', 'adrenaline_rush', 0.9),
('11111111-0001-0001-0001-000000000003', 'emotional_release', 0.85),
('11111111-0001-0001-0001-000000000003', 'comfort_escape', 0.6),
('11111111-0001-0001-0001-000000000003', 'deep_thought', 0.4)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ANXIOUS user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000004', 'comfort_escape', 0.95),
('11111111-0001-0001-0001-000000000004', 'light_entertainment', 0.85),
('11111111-0001-0001-0001-000000000004', 'background_passive', 0.8),
('11111111-0001-0001-0001-000000000004', 'family_bonding', 0.6)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- CALM user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000005', 'comfort_escape', 0.9),
('11111111-0001-0001-0001-000000000005', 'deep_thought', 0.85),
('11111111-0001-0001-0001-000000000005', 'discovery', 0.8),
('11111111-0001-0001-0001-000000000005', 'background_passive', 0.75),
('11111111-0001-0001-0001-000000000005', 'family_bonding', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- EXCITED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000006', 'adrenaline_rush', 0.95),
('11111111-0001-0001-0001-000000000006', 'discovery', 0.8),
('11111111-0001-0001-0001-000000000006', 'light_entertainment', 0.75),
('11111111-0001-0001-0001-000000000006', 'deep_thought', 0.5)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- BORED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000007', 'adrenaline_rush', 0.9),
('11111111-0001-0001-0001-000000000007', 'discovery', 0.85),
('11111111-0001-0001-0001-000000000007', 'deep_thought', 0.8),
('11111111-0001-0001-0001-000000000007', 'light_entertainment', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- STRESSED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000008', 'comfort_escape', 0.95),
('11111111-0001-0001-0001-000000000008', 'light_entertainment', 0.9),
('11111111-0001-0001-0001-000000000008', 'background_passive', 0.85),
('11111111-0001-0001-0001-000000000008', 'emotional_release', 0.6)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- LONELY user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000009', 'comfort_escape', 0.95),
('11111111-0001-0001-0001-000000000009', 'family_bonding', 0.9),
('11111111-0001-0001-0001-000000000009', 'emotional_release', 0.8),
('11111111-0001-0001-0001-000000000009', 'light_entertainment', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- HOPEFUL user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000010', 'discovery', 0.9),
('11111111-0001-0001-0001-000000000010', 'deep_thought', 0.85),
('11111111-0001-0001-0001-000000000010', 'light_entertainment', 0.7),
('11111111-0001-0001-0001-000000000010', 'family_bonding', 0.65)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- NOSTALGIC user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000011', 'comfort_escape', 0.95),
('11111111-0001-0001-0001-000000000011', 'emotional_release', 0.8),
('11111111-0001-0001-0001-000000000011', 'family_bonding', 0.75),
('11111111-0001-0001-0001-000000000011', 'light_entertainment', 0.6)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- CURIOUS user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000012', 'discovery', 0.95),
('11111111-0001-0001-0001-000000000012', 'deep_thought', 0.9),
('11111111-0001-0001-0001-000000000012', 'adrenaline_rush', 0.6)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- TIRED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000013', 'background_passive', 0.95),
('11111111-0001-0001-0001-000000000013', 'comfort_escape', 0.9),
('11111111-0001-0001-0001-000000000013', 'light_entertainment', 0.85),
('11111111-0001-0001-0001-000000000013', 'family_bonding', 0.6)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ROMANTIC user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000014', 'emotional_release', 0.9),
('11111111-0001-0001-0001-000000000014', 'comfort_escape', 0.85),
('11111111-0001-0001-0001-000000000014', 'light_entertainment', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- ADVENTUROUS user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000015', 'adrenaline_rush', 0.95),
('11111111-0001-0001-0001-000000000015', 'discovery', 0.9),
('11111111-0001-0001-0001-000000000015', 'deep_thought', 0.6)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- MELANCHOLIC user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000016', 'emotional_release', 0.95),
('11111111-0001-0001-0001-000000000016', 'comfort_escape', 0.85),
('11111111-0001-0001-0001-000000000016', 'deep_thought', 0.8)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- CONTENT user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000017', 'comfort_escape', 0.9),
('11111111-0001-0001-0001-000000000017', 'background_passive', 0.85),
('11111111-0001-0001-0001-000000000017', 'family_bonding', 0.8),
('11111111-0001-0001-0001-000000000017', 'discovery', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- FRUSTRATED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000018', 'emotional_release', 0.9),
('11111111-0001-0001-0001-000000000018', 'adrenaline_rush', 0.85),
('11111111-0001-0001-0001-000000000018', 'light_entertainment', 0.75),
('11111111-0001-0001-0001-000000000018', 'comfort_escape', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- INSPIRED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000019', 'discovery', 0.95),
('11111111-0001-0001-0001-000000000019', 'deep_thought', 0.9),
('11111111-0001-0001-0001-000000000019', 'adrenaline_rush', 0.7)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;

-- OVERWHELMED user → what intents match?
INSERT INTO emotion_to_intent_map (emotion_id, intent_type, weight) VALUES
('11111111-0001-0001-0001-000000000020', 'comfort_escape', 0.95),
('11111111-0001-0001-0001-000000000020', 'background_passive', 0.9),
('11111111-0001-0001-0001-000000000020', 'light_entertainment', 0.85)
ON CONFLICT (emotion_id, intent_type) DO UPDATE SET weight = EXCLUDED.weight;


-- ============================================================================
-- PART 3: SEED EMOTION_TRANSFORMATION_MAP
-- Defines how content emotions can transform user emotions
-- transformation_type: soothe, stabilize, validate, amplify, complementary, reinforcing, neutral_balancing
-- Using INSERT ON CONFLICT to avoid DELETE/TRUNCATE timeout issues
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

-- HAPPY user transformations (already positive - can amplify, validate, or go adventurous)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000003', 'amplify', 0.9, 1),         -- hilarious amplifies happy
('11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000024', 'reinforcing', 0.95, 2),    -- feel-good reinforces
('11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000001', 'amplify', 0.85, 3),        -- thrilling can amplify excitement
('11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000004', 'reinforcing', 0.9, 4),     -- uplifting reinforces
('11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000029', 'reinforcing', 0.85, 5)     -- lighthearted reinforces
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- SAD user transformations (need comfort, uplift, or cathartic release)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000006', 'soothe', 0.95, 1),         -- comforting soothes sadness
('11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000005', 'soothe', 0.9, 2),          -- heartwarming soothes
('11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000026', 'validate', 0.85, 3),       -- tear-jerker validates (catharsis)
('11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000004', 'complementary', 0.9, 4),   -- uplifting transforms mood
('11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000013', 'validate', 0.8, 5),        -- melancholic content validates
('11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000003', 'complementary', 0.75, 6)   -- hilarious can lift mood
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- ANGRY user transformations (need release, validation, or calming)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000001', 'validate', 0.9, 1),        -- thrilling validates high arousal
('11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000010', 'validate', 0.85, 2),       -- intense validates
('11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000025', 'soothe', 0.8, 3),          -- cathartic provides release
('11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000027', 'complementary', 0.85, 4),  -- empowering transforms anger to power
('11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000007', 'soothe', 0.7, 5)           -- peaceful soothes eventually
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- ANXIOUS user transformations (need calming, comfort, distraction)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000004', '22222222-0002-0002-0002-000000000006', 'soothe', 0.95, 1),         -- comforting soothes anxiety
('11111111-0001-0001-0001-000000000004', '22222222-0002-0002-0002-000000000007', 'soothe', 0.9, 2),          -- peaceful soothes
('11111111-0001-0001-0001-000000000004', '22222222-0002-0002-0002-000000000008', 'soothe', 0.9, 3),          -- cozy soothes
('11111111-0001-0001-0001-000000000004', '22222222-0002-0002-0002-000000000029', 'soothe', 0.85, 4),         -- lighthearted distracts
('11111111-0001-0001-0001-000000000004', '22222222-0002-0002-0002-000000000030', 'complementary', 0.8, 5),   -- escapist provides escape
('11111111-0001-0001-0001-000000000004', '22222222-0002-0002-0002-000000000023', 'soothe', 0.85, 6)          -- wholesome soothes
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- CALM user transformations (can go anywhere - stable base)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000005', '22222222-0002-0002-0002-000000000007', 'reinforcing', 0.95, 1),    -- peaceful reinforces calm
('11111111-0001-0001-0001-000000000005', '22222222-0002-0002-0002-000000000017', 'complementary', 0.9, 2),   -- thought-provoking engages mind
('11111111-0001-0001-0001-000000000005', '22222222-0002-0002-0002-000000000019', 'complementary', 0.85, 3),  -- educational is engaging
('11111111-0001-0001-0001-000000000005', '22222222-0002-0002-0002-000000000008', 'reinforcing', 0.9, 4),     -- cozy reinforces
('11111111-0001-0001-0001-000000000005', '22222222-0002-0002-0002-000000000018', 'amplify', 0.75, 5)         -- mind-bending can stimulate
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- EXCITED user transformations (can amplify or channel)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000006', '22222222-0002-0002-0002-000000000001', 'amplify', 0.95, 1),        -- thrilling amplifies
('11111111-0001-0001-0001-000000000006', '22222222-0002-0002-0002-000000000002', 'amplify', 0.95, 2),        -- exhilarating amplifies
('11111111-0001-0001-0001-000000000006', '22222222-0002-0002-0002-000000000010', 'reinforcing', 0.9, 3),     -- intense reinforces
('11111111-0001-0001-0001-000000000006', '22222222-0002-0002-0002-000000000003', 'amplify', 0.85, 4),        -- hilarious adds joy
('11111111-0001-0001-0001-000000000006', '22222222-0002-0002-0002-000000000018', 'complementary', 0.8, 5)    -- mind-bending channels
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- BORED user transformations (need stimulation)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000007', '22222222-0002-0002-0002-000000000001', 'complementary', 0.95, 1),  -- thrilling counters boredom
('11111111-0001-0001-0001-000000000007', '22222222-0002-0002-0002-000000000011', 'complementary', 0.9, 2),   -- suspenseful engages
('11111111-0001-0001-0001-000000000007', '22222222-0002-0002-0002-000000000018', 'complementary', 0.9, 3),   -- mind-bending stimulates
('11111111-0001-0001-0001-000000000007', '22222222-0002-0002-0002-000000000012', 'complementary', 0.85, 4),  -- shocking wakes up
('11111111-0001-0001-0001-000000000007', '22222222-0002-0002-0002-000000000017', 'complementary', 0.85, 5)   -- thought-provoking engages
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- STRESSED user transformations (need relief)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000008', '22222222-0002-0002-0002-000000000006', 'soothe', 0.95, 1),         -- comforting soothes stress
('11111111-0001-0001-0001-000000000008', '22222222-0002-0002-0002-000000000007', 'soothe', 0.95, 2),         -- peaceful soothes
('11111111-0001-0001-0001-000000000008', '22222222-0002-0002-0002-000000000029', 'soothe', 0.9, 3),          -- lighthearted relieves
('11111111-0001-0001-0001-000000000008', '22222222-0002-0002-0002-000000000003', 'soothe', 0.85, 4),         -- hilarious relieves through laughter
('11111111-0001-0001-0001-000000000008', '22222222-0002-0002-0002-000000000030', 'complementary', 0.85, 5)   -- escapist provides escape
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- LONELY user transformations (need connection, warmth)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000009', '22222222-0002-0002-0002-000000000005', 'soothe', 0.95, 1),         -- heartwarming soothes loneliness
('11111111-0001-0001-0001-000000000009', '22222222-0002-0002-0002-000000000023', 'soothe', 0.9, 2),          -- wholesome provides warmth
('11111111-0001-0001-0001-000000000009', '22222222-0002-0002-0002-000000000021', 'validate', 0.85, 3),       -- romantic validates feelings
('11111111-0001-0001-0001-000000000009', '22222222-0002-0002-0002-000000000024', 'complementary', 0.9, 4),   -- feel-good lifts spirits
('11111111-0001-0001-0001-000000000009', '22222222-0002-0002-0002-000000000022', 'validate', 0.8, 5)         -- nostalgic validates
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- HOPEFUL user transformations (can build on hope)
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000010', '22222222-0002-0002-0002-000000000020', 'amplify', 0.95, 1),        -- inspiring amplifies hope
('11111111-0001-0001-0001-000000000010', '22222222-0002-0002-0002-000000000004', 'amplify', 0.9, 2),         -- uplifting amplifies
('11111111-0001-0001-0001-000000000010', '22222222-0002-0002-0002-000000000027', 'reinforcing', 0.9, 3),     -- empowering reinforces
('11111111-0001-0001-0001-000000000010', '22222222-0002-0002-0002-000000000017', 'complementary', 0.85, 4),  -- thought-provoking deepens
('11111111-0001-0001-0001-000000000010', '22222222-0002-0002-0002-000000000024', 'reinforcing', 0.85, 5)     -- feel-good reinforces
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- NOSTALGIC user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000011', '22222222-0002-0002-0002-000000000022', 'validate', 0.95, 1),       -- nostalgic content validates
('11111111-0001-0001-0001-000000000011', '22222222-0002-0002-0002-000000000005', 'reinforcing', 0.9, 2),     -- heartwarming reinforces
('11111111-0001-0001-0001-000000000011', '22222222-0002-0002-0002-000000000014', 'validate', 0.85, 3),       -- bittersweet validates
('11111111-0001-0001-0001-000000000011', '22222222-0002-0002-0002-000000000008', 'reinforcing', 0.85, 4)     -- cozy reinforces
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- CURIOUS user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000012', '22222222-0002-0002-0002-000000000017', 'amplify', 0.95, 1),        -- thought-provoking amplifies curiosity
('11111111-0001-0001-0001-000000000012', '22222222-0002-0002-0002-000000000018', 'amplify', 0.95, 2),        -- mind-bending amplifies
('11111111-0001-0001-0001-000000000012', '22222222-0002-0002-0002-000000000019', 'reinforcing', 0.9, 3),     -- educational satisfies
('11111111-0001-0001-0001-000000000012', '22222222-0002-0002-0002-000000000011', 'amplify', 0.8, 4)          -- suspenseful builds intrigue
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- TIRED user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000013', '22222222-0002-0002-0002-000000000006', 'validate', 0.95, 1),       -- comforting matches low energy
('11111111-0001-0001-0001-000000000013', '22222222-0002-0002-0002-000000000008', 'validate', 0.95, 2),       -- cozy matches
('11111111-0001-0001-0001-000000000013', '22222222-0002-0002-0002-000000000029', 'validate', 0.9, 3),        -- lighthearted easy watch
('11111111-0001-0001-0001-000000000013', '22222222-0002-0002-0002-000000000007', 'validate', 0.9, 4),        -- peaceful matches
('11111111-0001-0001-0001-000000000013', '22222222-0002-0002-0002-000000000030', 'validate', 0.85, 5)        -- escapist easy watch
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- ROMANTIC user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000014', '22222222-0002-0002-0002-000000000021', 'amplify', 0.95, 1),        -- romantic amplifies
('11111111-0001-0001-0001-000000000014', '22222222-0002-0002-0002-000000000005', 'reinforcing', 0.9, 2),     -- heartwarming reinforces
('11111111-0001-0001-0001-000000000014', '22222222-0002-0002-0002-000000000014', 'validate', 0.85, 3),       -- bittersweet validates
('11111111-0001-0001-0001-000000000014', '22222222-0002-0002-0002-000000000015', 'validate', 0.85, 4)        -- poignant validates
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- ADVENTUROUS user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000015', '22222222-0002-0002-0002-000000000001', 'amplify', 0.95, 1),        -- thrilling amplifies
('11111111-0001-0001-0001-000000000015', '22222222-0002-0002-0002-000000000002', 'amplify', 0.95, 2),        -- exhilarating amplifies
('11111111-0001-0001-0001-000000000015', '22222222-0002-0002-0002-000000000018', 'complementary', 0.85, 3),  -- mind-bending adds mental adventure
('11111111-0001-0001-0001-000000000015', '22222222-0002-0002-0002-000000000010', 'reinforcing', 0.9, 4)      -- intense reinforces
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- MELANCHOLIC user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000016', '22222222-0002-0002-0002-000000000013', 'validate', 0.95, 1),       -- melancholic validates
('11111111-0001-0001-0001-000000000016', '22222222-0002-0002-0002-000000000015', 'validate', 0.9, 2),        -- poignant validates
('11111111-0001-0001-0001-000000000016', '22222222-0002-0002-0002-000000000025', 'soothe', 0.85, 3),         -- cathartic provides release
('11111111-0001-0001-0001-000000000016', '22222222-0002-0002-0002-000000000014', 'validate', 0.85, 4),       -- bittersweet validates
('11111111-0001-0001-0001-000000000016', '22222222-0002-0002-0002-000000000004', 'complementary', 0.75, 5)   -- uplifting can help lift
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- CONTENT user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000017', '22222222-0002-0002-0002-000000000008', 'reinforcing', 0.95, 1),    -- cozy reinforces contentment
('11111111-0001-0001-0001-000000000017', '22222222-0002-0002-0002-000000000023', 'reinforcing', 0.9, 2),     -- wholesome reinforces
('11111111-0001-0001-0001-000000000017', '22222222-0002-0002-0002-000000000007', 'reinforcing', 0.9, 3),     -- peaceful reinforces
('11111111-0001-0001-0001-000000000017', '22222222-0002-0002-0002-000000000017', 'complementary', 0.8, 4)    -- thought-provoking gently engages
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- FRUSTRATED user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000018', '22222222-0002-0002-0002-000000000025', 'soothe', 0.9, 1),          -- cathartic releases frustration
('11111111-0001-0001-0001-000000000018', '22222222-0002-0002-0002-000000000027', 'complementary', 0.9, 2),   -- empowering transforms
('11111111-0001-0001-0001-000000000018', '22222222-0002-0002-0002-000000000003', 'soothe', 0.85, 3),         -- hilarious relieves
('11111111-0001-0001-0001-000000000018', '22222222-0002-0002-0002-000000000001', 'validate', 0.8, 4)         -- thrilling validates energy
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- INSPIRED user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000019', '22222222-0002-0002-0002-000000000020', 'amplify', 0.95, 1),        -- inspiring amplifies
('11111111-0001-0001-0001-000000000019', '22222222-0002-0002-0002-000000000027', 'amplify', 0.9, 2),         -- empowering amplifies
('11111111-0001-0001-0001-000000000019', '22222222-0002-0002-0002-000000000017', 'reinforcing', 0.9, 3),     -- thought-provoking reinforces
('11111111-0001-0001-0001-000000000019', '22222222-0002-0002-0002-000000000019', 'reinforcing', 0.85, 4)     -- educational reinforces
ON CONFLICT (user_emotion_id, content_emotion_id) DO UPDATE SET
    transformation_type = EXCLUDED.transformation_type,
    confidence_score = EXCLUDED.confidence_score,
    priority_rank = EXCLUDED.priority_rank;

-- OVERWHELMED user transformations
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('11111111-0001-0001-0001-000000000020', '22222222-0002-0002-0002-000000000006', 'soothe', 0.95, 1),         -- comforting soothes
('11111111-0001-0001-0001-000000000020', '22222222-0002-0002-0002-000000000007', 'soothe', 0.95, 2),         -- peaceful soothes
('11111111-0001-0001-0001-000000000020', '22222222-0002-0002-0002-000000000008', 'soothe', 0.9, 3),          -- cozy soothes
('11111111-0001-0001-0001-000000000020', '22222222-0002-0002-0002-000000000029', 'soothe', 0.85, 4),         -- lighthearted provides relief
('11111111-0001-0001-0001-000000000020', '22222222-0002-0002-0002-000000000030', 'complementary', 0.85, 5)   -- escapist helps escape
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

-- Happy phrases by intensity
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000001', 'Feeling pretty good', 0.0, 0.3),
('11111111-0001-0001-0001-000000000001', 'In a good mood', 0.3, 0.5),
('11111111-0001-0001-0001-000000000001', 'Feeling happy', 0.5, 0.7),
('11111111-0001-0001-0001-000000000001', 'Really happy', 0.7, 0.85),
('11111111-0001-0001-0001-000000000001', 'On top of the world', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Sad phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000002', 'A bit down', 0.0, 0.3),
('11111111-0001-0001-0001-000000000002', 'Feeling low', 0.3, 0.5),
('11111111-0001-0001-0001-000000000002', 'Feeling sad', 0.5, 0.7),
('11111111-0001-0001-0001-000000000002', 'Really sad', 0.7, 0.85),
('11111111-0001-0001-0001-000000000002', 'Deeply sad', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Angry phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000003', 'A bit irritated', 0.0, 0.3),
('11111111-0001-0001-0001-000000000003', 'Frustrated', 0.3, 0.5),
('11111111-0001-0001-0001-000000000003', 'Angry', 0.5, 0.7),
('11111111-0001-0001-0001-000000000003', 'Really angry', 0.7, 0.85),
('11111111-0001-0001-0001-000000000003', 'Furious', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Anxious phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000004', 'Slightly uneasy', 0.0, 0.3),
('11111111-0001-0001-0001-000000000004', 'A bit anxious', 0.3, 0.5),
('11111111-0001-0001-0001-000000000004', 'Anxious', 0.5, 0.7),
('11111111-0001-0001-0001-000000000004', 'Very anxious', 0.7, 0.85),
('11111111-0001-0001-0001-000000000004', 'Extremely anxious', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Calm phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000005', 'Somewhat relaxed', 0.0, 0.3),
('11111111-0001-0001-0001-000000000005', 'Relaxed', 0.3, 0.5),
('11111111-0001-0001-0001-000000000005', 'Calm and peaceful', 0.5, 0.7),
('11111111-0001-0001-0001-000000000005', 'Very calm', 0.7, 0.85),
('11111111-0001-0001-0001-000000000005', 'Deeply serene', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Excited phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000006', 'A bit excited', 0.0, 0.3),
('11111111-0001-0001-0001-000000000006', 'Excited', 0.3, 0.5),
('11111111-0001-0001-0001-000000000006', 'Really excited', 0.5, 0.7),
('11111111-0001-0001-0001-000000000006', 'Super excited', 0.7, 0.85),
('11111111-0001-0001-0001-000000000006', 'Absolutely thrilled', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Bored phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000007', 'Slightly bored', 0.0, 0.3),
('11111111-0001-0001-0001-000000000007', 'A bit bored', 0.3, 0.5),
('11111111-0001-0001-0001-000000000007', 'Bored', 0.5, 0.7),
('11111111-0001-0001-0001-000000000007', 'Really bored', 0.7, 0.85),
('11111111-0001-0001-0001-000000000007', 'Extremely bored', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Stressed phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000008', 'A bit tense', 0.0, 0.3),
('11111111-0001-0001-0001-000000000008', 'Stressed', 0.3, 0.5),
('11111111-0001-0001-0001-000000000008', 'Very stressed', 0.5, 0.7),
('11111111-0001-0001-0001-000000000008', 'Overwhelmed with stress', 0.7, 0.85),
('11111111-0001-0001-0001-000000000008', 'Extremely stressed', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Lonely phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000009', 'A bit lonely', 0.0, 0.3),
('11111111-0001-0001-0001-000000000009', 'Feeling alone', 0.3, 0.5),
('11111111-0001-0001-0001-000000000009', 'Lonely', 0.5, 0.7),
('11111111-0001-0001-0001-000000000009', 'Very lonely', 0.7, 0.85),
('11111111-0001-0001-0001-000000000009', 'Deeply isolated', 0.85, 1.0)
ON CONFLICT (emotion_id, display_phrase) DO UPDATE SET
    min_intensity = EXCLUDED.min_intensity,
    max_intensity = EXCLUDED.max_intensity;

-- Hopeful phrases
INSERT INTO emotion_display_phrases (emotion_id, display_phrase, min_intensity, max_intensity) VALUES
('11111111-0001-0001-0001-000000000010', 'Somewhat hopeful', 0.0, 0.3),
('11111111-0001-0001-0001-000000000010', 'Hopeful', 0.3, 0.5),
('11111111-0001-0001-0001-000000000010', 'Very hopeful', 0.5, 0.7),
('11111111-0001-0001-0001-000000000010', 'Highly optimistic', 0.7, 0.85),
('11111111-0001-0001-0001-000000000010', 'Filled with hope', 0.85, 1.0)
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
