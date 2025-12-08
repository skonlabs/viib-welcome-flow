-- Add indexes to speed up recommendation queries

-- Index for user streaming subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_user_streaming_subscriptions_user_id 
ON public.user_streaming_subscriptions(user_id);

-- Index for user language preferences lookup
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_user_id 
ON public.user_language_preferences(user_id);

-- Composite index for user title interactions lookup
CREATE INDEX IF NOT EXISTS idx_user_title_interactions_user_title 
ON public.user_title_interactions(user_id, title_id);

-- Additional index on title_streaming_availability for join performance
CREATE INDEX IF NOT EXISTS idx_title_streaming_availability_title_id 
ON public.title_streaming_availability(title_id);

-- Index on titles original_language for filtering
CREATE INDEX IF NOT EXISTS idx_titles_original_language 
ON public.titles(original_language);