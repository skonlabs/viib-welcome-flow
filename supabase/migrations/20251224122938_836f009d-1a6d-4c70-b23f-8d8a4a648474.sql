-- Performance indexes for recommendation engine queries
CREATE INDEX IF NOT EXISTS idx_e2i_intent_type ON public.emotion_to_intent_map(intent_type);
CREATE INDEX IF NOT EXISTS idx_fc_user_id ON public.friend_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_ues_user_created ON public.user_emotion_states(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uti_user_title ON public.user_title_interactions(user_id, title_id);
CREATE INDEX IF NOT EXISTS idx_tts_user_emotion_id ON public.title_transformation_scores(user_emotion_id);
CREATE INDEX IF NOT EXISTS idx_vect_emotion_id ON public.viib_emotion_classified_titles(emotion_id);
CREATE INDEX IF NOT EXISTS idx_vect_title_id ON public.viib_emotion_classified_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_vict_intent_type ON public.viib_intent_classified_titles(intent_type);
CREATE INDEX IF NOT EXISTS idx_vict_title_id ON public.viib_intent_classified_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_tuemc_user_emotion ON public.title_user_emotion_match_cache(user_emotion_id);