import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { hashOtp, constantTimeCompare } from "../_shared/crypto.ts";

// Maximum verification attempts before lockout
const MAX_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin for security
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, otp, password, name } = await req.json();
    console.log('Verifying email OTP');

    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    // Capture IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    
    // Get country from IP using ipapi.co
    let ipCountry = 'Unknown';
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        ipCountry = geoData.country_name || 'Unknown';
      }
    } catch (geoError) {
      console.error('Failed to fetch geo data:', geoError);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the latest OTP for this email
    const { data: verifications, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5); // Get last 5 to see what's there

    // Debug logging removed - contained sensitive email data
    if (fetchError) console.log('Verification fetch error:', fetchError);

    // Find the first unverified one
    const verification = verifications?.find(v => !v.verified);

    if (fetchError || !verification) {
      console.error('Verification not found. Fetch error:', fetchError, 'Verifications:', verifications);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No verification code found. Please request a new code.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if OTP has expired
    if (new Date(verification.expires_at) < new Date()) {
      console.error('OTP expired');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Your code has expired. Please request a new code.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check IP-based rate limiting for OTP verification attempts
    const { data: rateLimitCheck } = await supabase.rpc('check_ip_rate_limit', {
      p_ip_address: ipAddress,
      p_endpoint: 'verify_otp',
      p_max_requests: 10,
      p_window_seconds: 300  // 10 attempts per 5 minutes
    });

    if (rateLimitCheck && !rateLimitCheck[0]?.allowed) {
      console.log('IP rate limit exceeded for OTP verification');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many verification attempts. Please wait a few minutes and try again.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Verify OTP using constant-time comparison (prevents timing attacks)
    const userOtp = String(otp).trim();
    const inputOtpHash = await hashOtp(userOtp, email);

    // Support both hash-based and legacy plaintext comparison during migration
    const hashMatch = verification.otp_hash
      ? constantTimeCompare(verification.otp_hash, inputOtpHash)
      : false;
    const legacyMatch = verification.otp_code
      ? constantTimeCompare(String(verification.otp_code).trim(), userOtp)
      : false;
    const otpMatches = hashMatch || legacyMatch;

    if (!otpMatches) {
      // Record failed attempt for brute force protection
      await supabase.rpc('record_login_attempt', {
        p_identifier: email,
        p_ip_address: ipAddress,
        p_attempt_type: 'otp',
        p_success: false
      });

      console.log('OTP verification failed - invalid code');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid code. Please check and try again.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('OTP matched successfully!');

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, onboarding_completed, is_email_verified')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // User exists - this is a resume scenario
      console.log('Existing user found, resuming onboarding');

      // Mark the OTP as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      // Invalidate all other unverified OTPs for this email (security best practice)
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false)
        .neq('id', verification.id);

      userId = existingUser.id;
    } else {
      // New user - hash password and create account
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password }
      });

      if (hashError || !hashData?.success) {
        console.error('Failed to hash password:', hashError || hashData?.error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to process request. Please try again.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Create user record
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: hashData.hashedPassword,
          signup_method: 'email',
          is_email_verified: true,
          is_age_over_18: true,
          onboarding_completed: false,
          is_active: false,
          ip_address: ipAddress,
          ip_country: ipCountry,
        })
        .select('id')
        .single();

      if (userError) {
        console.error('Failed to create user:', userError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to create account. Please try again.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Mark OTP as verified AFTER successful user creation
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      // Invalidate all other unverified OTPs for this email (security best practice)
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false)
        .neq('id', verification.id);

      userId = newUser.id;
      console.log('New user created successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully',
        userId: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in verify-email-otp function:', error);
    
    // Return generic user-friendly message without exposing system details
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Unable to verify code. Please request a new code." 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
