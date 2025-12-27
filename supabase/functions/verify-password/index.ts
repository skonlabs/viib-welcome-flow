import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { verifyPasswordSecure } from "../_shared/crypto.ts";
import { createSessionToken } from "../_shared/session.ts";

// Verify Cloudflare Turnstile CAPTCHA
async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    console.warn('CAPTCHA secret not configured, skipping verification');
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
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
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
    const { email, phone, password, rememberMe, captchaToken } = await req.json();

    if (!password || (!email && !phone)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email or phone and password are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400, // Bad Request
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting using lightweight rate limit store
    const identifier = email || phone;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const rateLimitKey = `password:${identifier}`;
    const { data: rateLimitData } = await supabase.rpc('check_rate_limit_fast', {
      p_key: rateLimitKey,
      p_max_count: 5,
      p_window_seconds: 900 // 15 minutes
    });

    const rateLimit = rateLimitData?.[0];

    if (rateLimit && !rateLimit.allowed) {
      console.log(`Rate limit exceeded for password verification`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many failed attempts. Please wait 15 minutes before trying again.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 // Too Many Requests
        }
      );
    }

    // Check if CAPTCHA is required (after threshold failures)
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
            status: 403 // Forbidden
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
            status: 403 // Forbidden
          }
        );
      }
    }

    // Fetch user from database
    let query;
    if (email) {
      query = supabase
        .from('users')
        .select('id, email, phone_number, password_hash')
        .eq('email', email);
    } else {
      query = supabase
        .from('users')
        .select('id, email, phone_number, password_hash')
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
          status: 401, // Unauthorized
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
          status: 401, // Unauthorized
        }
      );
    }

    // Record successful attempt
    await supabase.rpc('record_login_attempt', {
      p_identifier: identifier,
      p_ip_address: ipAddress,
      p_attempt_type: 'password',
      p_success: true
    });

    // Create signed session token
    const sessionToken = await createSessionToken(userData.id, {
      email: userData.email || undefined,
      phone: userData.phone_number || undefined,
      rememberMe: rememberMe === true,
    });

    // Hash the token for storage (for revocation lookup)
    const tokenHashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(sessionToken)
    );
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Store session token record for revocation support
    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    ).toISOString();

    await supabase.from('session_tokens').insert({
      user_id: userData.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: req.headers.get('user-agent') || null,
      is_remember_me: rememberMe === true,
    });

    console.log('Password verified successfully, session created');
    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.id,
        sessionToken, // Signed JWT-like token
        expiresAt,
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
        status: 500, // Internal Server Error
      }
    );
  }
});
