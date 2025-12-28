-- Fix transformation mappings for 5 emotions that have no valid content emotion matches
-- Replace non-existent content emotions with actual classified ones

-- First, delete the old broken mappings for these 5 user emotions
DELETE FROM emotion_transformation_map 
WHERE user_emotion_id IN (
  'a655a8e0-d3c0-4ea5-a763-2ae9b877e646', -- adventurous
  '86a56a17-b9d2-4ba2-b049-39a555565e4a', -- curious
  'b1619d3a-828a-4dd8-ac50-210f6eb0bb0d', -- frustrated
  'd982a7c7-63ed-4c35-98a6-8f46dde365a3', -- inspired
  '0bd1f287-2b53-4134-b941-3f663ccffd2d'  -- romantic
);

-- Insert new mappings using ACTUAL classified content emotions

-- ADVENTUROUS user → adventure, excited, exciting, energizing content
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('a655a8e0-d3c0-4ea5-a763-2ae9b877e646', 'c49342a8-1e3e-4036-88ab-1d6894d89ac5', 'amplify', 0.95, 1),       -- adventure
('a655a8e0-d3c0-4ea5-a763-2ae9b877e646', '09e2e18c-38c9-43cc-b3c2-28fd3c49dc96', 'reinforcing', 0.90, 2),   -- excited
('a655a8e0-d3c0-4ea5-a763-2ae9b877e646', '52818406-a091-47e5-a165-9dc2f9186dc2', 'amplify', 0.90, 3),       -- exciting
('a655a8e0-d3c0-4ea5-a763-2ae9b877e646', 'b88d8d50-8739-456f-812c-507e2b9f9709', 'reinforcing', 0.85, 4);   -- energizing

-- CURIOUS user → curiosity, emotional_depth, adventure content
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('86a56a17-b9d2-4ba2-b049-39a555565e4a', '254e4299-5619-4553-be59-3f8a51f80d13', 'amplify', 0.95, 1),       -- curiosity
('86a56a17-b9d2-4ba2-b049-39a555565e4a', '5737cae9-91ce-4ce0-b93f-119e5b83e322', 'reinforcing', 0.90, 2),   -- emotional_depth
('86a56a17-b9d2-4ba2-b049-39a555565e4a', 'c49342a8-1e3e-4036-88ab-1d6894d89ac5', 'complementary', 0.85, 3), -- adventure
('86a56a17-b9d2-4ba2-b049-39a555565e4a', 'd506da27-0786-4f9a-b83b-6a8ddc75e8f5', 'reinforcing', 0.80, 4);   -- hopeful

-- FRUSTRATED user → soothing, calm, lighthearted, gentle_humor content
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('b1619d3a-828a-4dd8-ac50-210f6eb0bb0d', '61d47dac-c530-4b4d-a1c9-2131a1ffbeb7', 'soothe', 0.95, 1),        -- soothing
('b1619d3a-828a-4dd8-ac50-210f6eb0bb0d', '64feeee1-b969-47d7-bf8e-2399440d48b6', 'complementary', 0.90, 2), -- calm
('b1619d3a-828a-4dd8-ac50-210f6eb0bb0d', '89bdbbde-d64f-4c44-a4b8-fbe0432d7f57', 'soothe', 0.85, 3),        -- lighthearted
('b1619d3a-828a-4dd8-ac50-210f6eb0bb0d', '8b07e599-25a8-4346-9c43-fd09ab424e5a', 'soothe', 0.80, 4);        -- gentle_humor

-- INSPIRED user → uplifting, hopeful, emotional_depth, energizing content
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('d982a7c7-63ed-4c35-98a6-8f46dde365a3', 'df466f4a-5840-401c-a65c-53d058777b51', 'amplify', 0.95, 1),       -- uplifting
('d982a7c7-63ed-4c35-98a6-8f46dde365a3', 'd506da27-0786-4f9a-b83b-6a8ddc75e8f5', 'reinforcing', 0.90, 2),   -- hopeful
('d982a7c7-63ed-4c35-98a6-8f46dde365a3', '5737cae9-91ce-4ce0-b93f-119e5b83e322', 'amplify', 0.85, 3),       -- emotional_depth
('d982a7c7-63ed-4c35-98a6-8f46dde365a3', 'b88d8d50-8739-456f-812c-507e2b9f9709', 'reinforcing', 0.80, 4);   -- energizing

-- ROMANTIC user → connection, warm, emotional_depth, hopeful content
INSERT INTO emotion_transformation_map (user_emotion_id, content_emotion_id, transformation_type, confidence_score, priority_rank) VALUES
('0bd1f287-2b53-4134-b941-3f663ccffd2d', '46288c53-b8fa-424c-988a-41a8b7d5ce2b', 'amplify', 0.95, 1),       -- connection
('0bd1f287-2b53-4134-b941-3f663ccffd2d', 'cdef2194-d730-45fd-91a1-87d73dfd640e', 'reinforcing', 0.90, 2),   -- warm
('0bd1f287-2b53-4134-b941-3f663ccffd2d', '5737cae9-91ce-4ce0-b93f-119e5b83e322', 'reinforcing', 0.85, 3),   -- emotional_depth
('0bd1f287-2b53-4134-b941-3f663ccffd2d', 'd506da27-0786-4f9a-b83b-6a8ddc75e8f5', 'validate', 0.80, 4);      -- hopeful