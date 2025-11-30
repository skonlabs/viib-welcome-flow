-- Create vibe_lists table for user-created lists
CREATE TABLE IF NOT EXISTS vibe_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  mood_tags TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'trusted_circle', 'public', 'link_share')) DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vibe_list_items table for titles in lists
CREATE TABLE IF NOT EXISTS vibe_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_list_id UUID NOT NULL REFERENCES vibe_lists(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vibe_list_views table for tracking list views
CREATE TABLE IF NOT EXISTS vibe_list_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_list_id UUID NOT NULL REFERENCES vibe_lists(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vibe_list_followers table for following public lists
CREATE TABLE IF NOT EXISTS vibe_list_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_list_id UUID NOT NULL REFERENCES vibe_lists(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vibe_list_id, follower_user_id)
);

-- Create vibe_list_shared_with table for trusted circle sharing
CREATE TABLE IF NOT EXISTS vibe_list_shared_with (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_list_id UUID NOT NULL REFERENCES vibe_lists(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vibe_list_id, shared_with_user_id)
);

-- Create profiles table for user display names (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vibe_lists_user_id ON vibe_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_vibe_lists_visibility ON vibe_lists(visibility);
CREATE INDEX IF NOT EXISTS idx_vibe_list_items_list_id ON vibe_list_items(vibe_list_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_items_title_id ON vibe_list_items(title_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_views_list_id ON vibe_list_views(vibe_list_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_followers_list_id ON vibe_list_followers(vibe_list_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_followers_user_id ON vibe_list_followers(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_shared_with_list_id ON vibe_list_shared_with(vibe_list_id);
CREATE INDEX IF NOT EXISTS idx_vibe_list_shared_with_user_id ON vibe_list_shared_with(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Create updated_at trigger for vibe_lists
CREATE OR REPLACE FUNCTION update_vibe_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vibe_lists_updated_at_trigger
BEFORE UPDATE ON vibe_lists
FOR EACH ROW
EXECUTE FUNCTION update_vibe_lists_updated_at();

-- Create updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();