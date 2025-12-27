import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { verifyPasswordSecure } from "../_shared/crypto.ts";

/**
 * Account Deletion Edge Function
 * GDPR compliant - permanently deletes all user data
 *
 * Required body:
 * - userId: string (the user's UUID)
 * - password: string (for verification)
 * - confirmDeletion: boolean (must be true)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin for security
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId, password, confirmDeletion, reason } = await req.json();

    if (!userId || !password || confirmDeletion !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User ID, password, and deletion confirmation are required'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Capture IP for rate limiting and audit
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit account deletion requests
    const { data: rateLimitCheck } = await supabase.rpc('check_ip_rate_limit', {
      p_ip_address: ipAddress,
      p_endpoint: 'account_delete',
      p_max_requests: 1,
      p_window_seconds: 86400  // 1 per day
    });

    if (rateLimitCheck && !rateLimitCheck[0]?.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account deletion can only be requested once per day. Please try again tomorrow.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verify password using constant-time comparison
    const isPasswordValid = await verifyPasswordSecure(password, user.password_hash);

    if (!isPasswordValid) {
      // Record failed attempt
      await supabase.rpc('record_login_attempt', {
        p_identifier: user.email,
        p_ip_address: ipAddress,
        p_attempt_type: 'account_delete',
        p_success: false
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Log the deletion request before proceeding (for audit purposes)
    await supabase.from('system_logs').insert({
      level: 'info',
      message: 'Account deletion initiated',
      context: {
        user_id: userId,
        email: user.email,
        ip_address: ipAddress,
        reason: reason || 'Not specified',
        timestamp: new Date().toISOString()
      }
    });

    // Begin deletion process - order matters due to foreign key constraints
    // Delete in reverse dependency order

    // 1. Delete social recommendations (both sent and received)
    await supabase.from('user_social_recommendations')
      .delete()
      .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`);

    // 2. Delete friend connections
    await supabase.from('friend_connections')
      .delete()
      .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`);

    // 3. Delete vibe list shares
    const { data: userLists } = await supabase
      .from('vibe_lists')
      .select('id')
      .eq('user_id', userId);

    if (userLists && userLists.length > 0) {
      const listIds = userLists.map(l => l.id);

      // Delete list items
      await supabase.from('vibe_list_items')
        .delete()
        .in('vibe_list_id', listIds);

      // Delete list followers
      await supabase.from('vibe_list_followers')
        .delete()
        .in('vibe_list_id', listIds);

      // Delete list shares
      await supabase.from('vibe_list_shared_with')
        .delete()
        .in('vibe_list_id', listIds);

      // Delete list views
      await supabase.from('vibe_list_views')
        .delete()
        .in('vibe_list_id', listIds);
    }

    // Also delete lists they follow
    await supabase.from('vibe_list_followers')
      .delete()
      .eq('follower_user_id', userId);

    await supabase.from('vibe_list_shared_with')
      .delete()
      .eq('shared_with_user_id', userId);

    // 4. Delete the vibe lists themselves
    await supabase.from('vibe_lists')
      .delete()
      .eq('user_id', userId);

    // 5. Delete title interactions
    await supabase.from('user_title_interactions')
      .delete()
      .eq('user_id', userId);

    // 6. Delete emotion states
    await supabase.from('user_emotion_states')
      .delete()
      .eq('user_id', userId);

    // 7. Delete streaming subscriptions
    await supabase.from('user_streaming_subscriptions')
      .delete()
      .eq('user_id', userId);

    // 8. Delete language preferences
    await supabase.from('user_language_preferences')
      .delete()
      .eq('user_id', userId);

    // 9. Delete vibe preferences
    await supabase.from('user_vibe_preferences')
      .delete()
      .eq('user_id', userId);

    // 10. Delete personality profile
    await supabase.from('personality_profiles')
      .delete()
      .eq('user_id', userId);

    // 11. Delete context logs
    await supabase.from('user_context_logs')
      .delete()
      .eq('user_id', userId);

    // 12. Delete recommendation outcomes
    await supabase.from('recommendation_outcomes')
      .delete()
      .eq('user_id', userId);

    // 13. Delete social scores
    await supabase.from('user_title_social_scores')
      .delete()
      .eq('user_id', userId);

    // 14. Delete feedback
    await supabase.from('feedback')
      .delete()
      .eq('user_id', userId);

    // 15. Delete user roles
    await supabase.from('user_roles')
      .delete()
      .eq('user_id', userId);

    // 16. Mark activation codes as unused (don't delete, just decouple)
    await supabase.from('activation_codes')
      .update({ used_by: null })
      .eq('used_by', userId);

    // 17. Delete email verifications
    if (user.email) {
      await supabase.from('email_verifications')
        .delete()
        .eq('email', user.email);

      await supabase.from('login_attempts')
        .delete()
        .eq('identifier', user.email);
    }

    // 18. Finally, delete the user record itself
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Failed to delete user record:', deleteError);
      throw new Error('Failed to complete account deletion');
    }

    // Log successful deletion
    await supabase.from('system_logs').insert({
      level: 'info',
      message: 'Account deletion completed',
      context: {
        deleted_user_id: userId,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your account and all associated data have been permanently deleted.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while deleting your account. Please contact support.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
