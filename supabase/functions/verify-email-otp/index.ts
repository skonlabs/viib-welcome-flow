import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { hashOtp, constantTimeCompare } from "../_shared/crypto.ts";

/**
 * Email OTP Verification Edge Function
 *
 * This function:
 * 1. Verifies the OTP code
 * 2. Creates a Supabase Auth account (for new users)
 * 3. Creates/updates the user profile in the users table
 * 4. Links the profile to the auth account via auth_id
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
    const { email, otp, password } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and OTP are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Capture IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    // Get country from IP using ipapi.co
    let ipCountry = 'Unknown';
    let countryCode = 'US'; // Default country code for streaming availability
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        ipCountry = geoData.country_name || 'Unknown';
        countryCode = geoData.country_code || 'US';
      }
    } catch {
      // Ignore geo lookup errors
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the latest unverified OTP for this email
    const { data: verifications, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const verification = verifications?.[0];

    if (fetchError || !verification) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No verification code found. Please request a new code.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if OTP has expired
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Your code has expired. Please request a new code.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit_fast', {
      p_key: `verify_otp:${email}`,
      p_max_count: 10,
      p_window_seconds: 300
    });

    if (rateLimitCheck && !rateLimitCheck[0]?.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many verification attempts. Please wait a few minutes and try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Verify OTP using constant-time comparison
    const userOtp = String(otp).trim();
    const inputOtpHash = await hashOtp(userOtp, email);

    // Support both hash-based and legacy plaintext comparison
    const hashMatch = verification.otp_hash
      ? constantTimeCompare(verification.otp_hash, inputOtpHash)
      : false;
    const legacyMatch = verification.otp_code
      ? constantTimeCompare(String(verification.otp_code).trim(), userOtp)
      : false;
    const otpMatches = hashMatch || legacyMatch;

    if (!otpMatches) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid code. Please check and try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, auth_id, onboarding_completed, is_email_verified')
      .eq('email', email)
      .maybeSingle();

    let userId: string;
    let authId: string | null = null;

    if (existingUser) {
      // User exists - check if they need an auth account
      userId = existingUser.id;
      authId = existingUser.auth_id;

      // If no auth_id, create Supabase Auth account and link it
      if (!authId && password) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Already verified via OTP
        });

        if (authError) {
          // If user already exists in auth, try to get their ID
          if (authError.message.includes('already registered')) {
            const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
            const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email);
            if (existingAuthUser) {
              authId = existingAuthUser.id;
            }
          } else {
            console.error('Failed to create auth user:', authError.message);
          }
        } else if (authUser?.user) {
          authId = authUser.user.id;
        }

        // Link auth account to user profile
        if (authId) {
          await supabase
            .from('users')
            .update({ auth_id: authId, is_email_verified: true })
            .eq('id', userId);
        }
      }

      // Mark email verified
      if (!existingUser.is_email_verified) {
        await supabase
          .from('users')
          .update({ is_email_verified: true })
          .eq('id', userId);
      }
    } else {
      // New user - create both auth account and profile

      // First create Supabase Auth account
      if (password) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Already verified via OTP
        });

        if (authError) {
          console.error('Failed to create auth user:', authError.message);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Unable to create account. Please try again.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        authId = authUser?.user?.id || null;
      }

      // Hash password for users table (backup, Supabase Auth is primary)
      let passwordHash = null;
      if (password) {
        const { data: hashData } = await supabase.functions.invoke('hash-password', {
          body: { password }
        });
        passwordHash = hashData?.hashedPassword || null;
      }

      // Create user profile
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          auth_id: authId,
          password_hash: passwordHash,
          signup_method: 'email',
          is_email_verified: true,
          is_age_over_18: true,
          onboarding_completed: false,
          is_active: false,
          ip_address: ipAddress,
          ip_country: ipCountry,
          country: countryCode, // Set country code for streaming recommendations
        })
        .select('id')
        .single();

      if (userError) {
        console.error('Failed to create user profile');
        // If user creation failed but auth account was created, clean up
        if (authId) {
          await supabase.auth.admin.deleteUser(authId);
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unable to create account. Please try again.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      userId = newUser.id;
    }

    // Mark OTP as verified
    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    // Clean up other unverified OTPs for this email
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email)
      .eq('verified', false);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully',
        userId: userId,
        authId: authId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in verify-email-otp function');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to verify code. Please request a new code.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
