-- Create table for enabled countries for phone verification
CREATE TABLE IF NOT EXISTS public.enabled_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  dial_code TEXT NOT NULL,
  flag_emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enabled_countries ENABLE ROW LEVEL SECURITY;

-- Everyone can read enabled countries (public data)
CREATE POLICY "Anyone can read enabled countries" ON public.enabled_countries
FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage enabled countries" ON public.enabled_countries
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default enabled countries
INSERT INTO public.enabled_countries (country_code, country_name, dial_code, flag_emoji) VALUES
('US', 'United States', '+1', '🇺🇸'),
('CA', 'Canada', '+1', '🇨🇦'),
('GB', 'United Kingdom', '+44', '🇬🇧'),
('AU', 'Australia', '+61', '🇦🇺'),
('IN', 'India', '+91', '🇮🇳')
ON CONFLICT (country_code) DO NOTHING;

-- Create table for visual taste preferences (genre-based posters)
CREATE TABLE IF NOT EXISTS public.visual_taste_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id TEXT NOT NULL,
  genre_name TEXT NOT NULL,
  mood_description TEXT,
  poster_tmdb_id INTEGER,
  poster_path TEXT,
  gradient_class TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visual_taste_options ENABLE ROW LEVEL SECURITY;

-- Everyone can read visual taste options
CREATE POLICY "Anyone can read visual taste options" ON public.visual_taste_options
FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage visual taste options" ON public.visual_taste_options
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default visual taste options with representative movie posters
INSERT INTO public.visual_taste_options (genre_id, genre_name, mood_description, poster_tmdb_id, poster_path, gradient_class, display_order) VALUES
('scifi', 'Epic Sci-Fi', 'Expansive Worlds', 157336, '/nBNZadXqJSdt05SHLqgT0HuC5Gm.jpg', 'from-blue-600 via-indigo-700 to-purple-800', 1),
('drama', 'Intimate Drama', 'Deep Emotions', 550, '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'from-rose-600 via-pink-700 to-red-800', 2),
('thriller', 'Mystery Thriller', 'Edge of Seat', 27205, '/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg', 'from-slate-700 via-gray-800 to-zinc-900', 3),
('comedy', 'Feel-Good Comedy', 'Pure Joy', 620, '/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', 'from-amber-500 via-orange-600 to-yellow-600', 4),
('documentary', 'Nature Documentary', 'Awe & Wonder', 417859, '/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg', 'from-emerald-600 via-teal-700 to-cyan-800', 5),
('history', 'Historical Epic', 'Grand Scale', 98, '/8DUxtioaQQMgxitHqvWJ3K6xzGM.jpg', 'from-amber-700 via-yellow-800 to-stone-900', 6)
ON CONFLICT DO NOTHING;

-- Add app_settings for debug_enabled_users if not exists
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES ('debug_enabled_users', '[]'::jsonb, 'List of user IDs that have console logging enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Create table for recommendation notifications
CREATE TABLE IF NOT EXISTS public.recommendation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'added_to_watchlist', 'marked_as_seen', 'liked'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendation_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications (as receiver)
CREATE POLICY "Users can read their own notifications" ON public.recommendation_notifications
FOR SELECT USING (receiver_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Users can create notifications when they interact with recommendations
CREATE POLICY "Users can create notifications" ON public.recommendation_notifications
FOR INSERT WITH CHECK (
  sender_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  OR receiver_user_id IN (
    SELECT sender_user_id FROM public.user_social_recommendations 
    WHERE receiver_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
);

-- Users can mark their notifications as read
CREATE POLICY "Users can update their notifications" ON public.recommendation_notifications
FOR UPDATE USING (receiver_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));