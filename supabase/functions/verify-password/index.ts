import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { verifyPasswordSecure } from "../_shared/crypto.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin for security
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, phone, password } = await req.json();

    if (!password || (!email && !phone)) {
      throw new Error('Email or phone and password are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting: Check failed attempts using login_attempts table
    const identifier = email || phone;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    // Check if account is locked
    const { data: lockCheck } = await supabase.rpc('is_account_locked', {
      p_identifier: identifier,
      p_window_minutes: 15
    });

    if (lockCheck === true) {
      // Get remaining lockout time
      const { data: remainingSeconds } = await supabase.rpc('get_lockout_remaining', {
        p_identifier: identifier,
        p_window_minutes: 15
      });

      const remainingMinutes = Math.ceil((remainingSeconds || 0) / 60);
      console.log(`Account locked for identifier (rate limited)`);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many failed attempts. Please wait ${remainingMinutes} minutes before trying again.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    // Fetch user from database
    // Note: We don't check is_active here because accounts with incomplete onboarding
    // will have is_active: false. The frontend will handle onboarding redirect logic.
    let query;
    if (email) {
      query = supabase
        .from('users')
        .select('id, password_hash')
        .eq('email', email);
    } else {
      query = supabase
        .from('users')
        .select('id, password_hash')
        .eq('phone_number', phone);
    }

    const { data: userData, error: fetchError } = await query.maybeSingle();

    if (fetchError || !userData) {
      // Record failed attempt
      await supabase.rpc('record_login_attempt', {
        p_identifier: identifier,
        p_ip_address: ipAddress,
        p_attempt_type: 'password',
        p_success: false
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Verify password using constant-time comparison
    const isValid = await verifyPasswordSecure(password, userData.password_hash);

    if (!isValid) {
      // Record failed attempt
      await supabase.rpc('record_login_attempt', {
        p_identifier: identifier,
        p_ip_address: ipAddress,
        p_attempt_type: 'password',
        p_success: false
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Record successful attempt (clears lockout)
    await supabase.rpc('record_login_attempt', {
      p_identifier: identifier,
      p_ip_address: ipAddress,
      p_attempt_type: 'password',
      p_success: true
    });

    console.log('Password verified successfully');
    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error verifying password:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to verify credentials'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
