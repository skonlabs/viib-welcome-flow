-- Seed Rate Limit Configurations for ViiB Application
-- Run this in Supabase SQL Editor to populate rate_limit_config table

INSERT INTO public.rate_limit_config (endpoint, max_requests, window_seconds, is_active, description) VALUES
-- Authentication & Verification Endpoints (Strict limits to prevent abuse)
('/api/send-phone-otp', 5, 300, true, 'Phone OTP sending - 5 requests per 5 minutes to prevent spam'),
('/api/send-email-otp', 5, 300, true, 'Email OTP sending - 5 requests per 5 minutes to prevent spam'),
('/api/verify-phone-otp', 10, 300, true, 'Phone OTP verification - 10 attempts per 5 minutes'),
('/api/verify-email-otp', 10, 300, true, 'Email OTP verification - 10 attempts per 5 minutes'),
('/api/verify-password', 10, 300, true, 'Password verification - 10 attempts per 5 minutes to prevent brute force'),
('/api/hash-password', 3, 60, true, 'Password hashing - 3 requests per minute'),

-- User Authentication Endpoints
('/api/auth/signup', 3, 3600, true, 'User signup - 3 attempts per hour'),
('/api/auth/login', 10, 300, true, 'User login - 10 attempts per 5 minutes'),
('/api/auth/logout', 10, 60, true, 'User logout - 10 requests per minute'),
('/api/auth/refresh', 20, 60, true, 'Token refresh - 20 requests per minute'),

-- User Profile & Settings Endpoints
('/api/user/profile', 30, 60, true, 'User profile access - 30 requests per minute'),
('/api/user/settings', 20, 60, true, 'User settings - 20 requests per minute'),
('/api/user/preferences', 20, 60, true, 'User preferences - 20 requests per minute'),

-- Feedback & Support Endpoints
('/api/feedback', 10, 3600, true, 'Feedback submission - 10 submissions per hour'),
('/api/support/ticket', 5, 3600, true, 'Support ticket creation - 5 tickets per hour'),

-- Content Discovery Endpoints
('/api/recommendations', 20, 60, true, 'Content recommendations - 20 requests per minute'),
('/api/search', 30, 60, true, 'Search functionality - 30 requests per minute'),
('/api/titles', 50, 60, true, 'Title browsing - 50 requests per minute'),
('/api/genres', 20, 60, true, 'Genre browsing - 20 requests per minute'),

-- Social Features Endpoints
('/api/friends', 30, 60, true, 'Friend operations - 30 requests per minute'),
('/api/social/recommendations', 20, 60, true, 'Social recommendations - 20 requests per minute'),
('/api/social/share', 15, 60, true, 'Content sharing - 15 shares per minute'),

-- Analytics & Tracking Endpoints
('/api/analytics', 50, 60, true, 'Analytics data - 50 requests per minute'),
('/api/tracking/view', 100, 60, true, 'View tracking - 100 requests per minute'),
('/api/tracking/interaction', 100, 60, true, 'Interaction tracking - 100 requests per minute'),

-- Admin Endpoints (Higher limits for admin operations)
('/api/admin/users', 100, 60, true, 'Admin user management - 100 requests per minute'),
('/api/admin/feedback', 100, 60, true, 'Admin feedback management - 100 requests per minute'),
('/api/admin/analytics', 100, 60, true, 'Admin analytics - 100 requests per minute'),
('/api/admin/config', 50, 60, true, 'Admin configuration - 50 requests per minute'),

-- Onboarding Endpoints
('/api/onboarding/vibe', 10, 60, true, 'Vibe selection - 10 requests per minute'),
('/api/onboarding/platforms', 10, 60, true, 'Platform selection - 10 requests per minute'),
('/api/onboarding/mood', 10, 60, true, 'Mood calibration - 10 requests per minute'),
('/api/onboarding/complete', 5, 60, true, 'Onboarding completion - 5 requests per minute'),

-- General API Catch-all (Apply to any endpoint not specifically configured)
('/api/*', 100, 60, true, 'General API endpoints - 100 requests per minute default')

ON CONFLICT (endpoint) DO UPDATE SET
  max_requests = EXCLUDED.max_requests,
  window_seconds = EXCLUDED.window_seconds,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();
