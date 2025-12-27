import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { verifyPasswordSecure } from "../_shared/crypto.ts";

/**
 * Password Verification Edge Function
 *
 * NOTE: For LOGIN, use Supabase Auth directly (supabase.auth.signInWithPassword).
 * This function is for password verification in NON-LOGIN contexts only
 * (e.g., confirming password before sensitive operations).
 *
 * REQUIRES: Rate limiting is enforced per identifier
 */

// Verify Cloudflare Turnstile CAPTCHA
async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    return true; // Skip if not configured
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}

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
    const { email, phone, password, captchaToken } = await req.json();

    if (!password || (!email && !phone)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email or phone and password are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting
    const identifier = email || phone;
    const rateLimitKey = `password_verify:${identifier}`;
    const { data: rateLimitData } = await supabase.rpc('check_rate_limit_fast', {
      p_key: rateLimitKey,
      p_max_count: 5,
      p_window_seconds: 900 // 15 minutes
    });

    const rateLimit = rateLimitData?.[0];

    if (rateLimit && !rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many failed attempts. Please wait 15 minutes before trying again.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    // Check if CAPTCHA is required
    if (rateLimit?.requires_captcha) {
      if (!captchaToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Please complete the security check',
            requiresCaptcha: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          }
        );
      }

      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Security check failed. Please try again.',
            requiresCaptcha: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403
          }
        );
      }
    }

    // Fetch user from database
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
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Verify password using constant-time comparison
    const isValid = await verifyPasswordSecure(password, userData.password_hash);

    if (!isValid) {
      // Check if we should now require CAPTCHA
      const { data: newRateLimit } = await supabase.rpc('check_rate_limit_fast', {
        p_key: rateLimitKey,
        p_max_count: 5,
        p_window_seconds: 900
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials',
          requiresCaptcha: newRateLimit?.[0]?.requires_captcha || false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Password verified successfully
    // NOTE: This does NOT create a session - use Supabase Auth for login
    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.id,
        message: 'Password verified'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error verifying password');

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to verify credentials'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
