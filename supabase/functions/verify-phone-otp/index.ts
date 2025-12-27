import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { hashOtp, constantTimeCompare } from "../_shared/crypto.ts";

/**
 * Phone OTP Verification Edge Function
 *
 * This function:
 * 1. Verifies the OTP code
 * 2. Creates a Supabase Auth account (for new users)
 * 3. Creates/updates the user profile in the users table
 * 4. Links the profile to the auth account via auth_id
 */

// Maximum verification attempts before lockout
const MAX_ATTEMPTS = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin for security
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { phoneNumber, otpCode } = await req.json();

    if (!phoneNumber || !otpCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number and OTP code are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Normalize phone number - remove all spaces and keep only digits and +
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // Find the most recent non-verified, non-locked OTP for this phone number
    const { data: verifications, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .eq('is_locked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Database fetch error');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify code' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (!verifications || verifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your code has expired or is invalid. Please request a new code."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const verification = verifications[0];

    // Check if max attempts exceeded
    if (verification.attempt_count >= MAX_ATTEMPTS) {
      await supabase
        .from('phone_verifications')
        .update({ is_locked: true })
        .eq('id', verification.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many failed attempts. Please request a new code."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Hash the input OTP for comparison
    const inputOtpHash = await hashOtp(otpCode, normalizedPhone);

    // Check if OTP matches using constant-time comparison
    const hashMatch = verification.otp_hash
      ? constantTimeCompare(verification.otp_hash, inputOtpHash)
      : false;
    const legacyMatch = verification.otp_code
      ? constantTimeCompare(verification.otp_code, otpCode)
      : false;

    if (!hashMatch && !legacyMatch) {
      // Increment attempt counter
      const newAttemptCount = (verification.attempt_count || 0) + 1;
      await supabase
        .from('phone_verifications')
        .update({
          attempt_count: newAttemptCount,
          is_locked: newAttemptCount >= MAX_ATTEMPTS
        })
        .eq('id', verification.id);

      const attemptsRemaining = MAX_ATTEMPTS - newAttemptCount;
      const errorMessage = attemptsRemaining > 0
        ? `The code you entered is incorrect. ${attemptsRemaining} attempts remaining.`
        : "Too many failed attempts. Please request a new code.";

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // OTP verified successfully - now handle user creation

    // Capture IP address
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    // Get country from IP
    let ipCountry = 'Unknown';
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        ipCountry = geoData.country_name || 'Unknown';
      }
    } catch {
      // Ignore geo lookup errors
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, auth_id, is_phone_verified')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    let userId: string;
    let authId: string | null = null;

    if (existingUser) {
      // User exists
      userId = existingUser.id;
      authId = existingUser.auth_id;

      // If no auth_id, create Supabase Auth account
      if (!authId) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          phone: normalizedPhone,
          phone_confirm: true, // Already verified via OTP
        });

        if (authError) {
          // If user already exists in auth, try to get their ID
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
            const existingAuthUser = existingAuthUsers?.users?.find(u => u.phone === normalizedPhone);
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
            .update({ auth_id: authId, is_phone_verified: true })
            .eq('id', userId);
        }
      }

      // Mark phone verified if not already
      if (!existingUser.is_phone_verified) {
        await supabase
          .from('users')
          .update({ is_phone_verified: true })
          .eq('id', userId);
      }
    } else {
      // New user - create Supabase Auth account first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true, // Already verified via OTP
      });

      if (authError) {
        console.error('Failed to create auth user:', authError.message);
        // Continue anyway - we can still create the profile
      } else if (authUser?.user) {
        authId = authUser.user.id;
      }

      // Create user profile
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          phone_number: normalizedPhone,
          auth_id: authId,
          signup_method: 'phone',
          is_phone_verified: true,
          is_age_over_18: true,
          onboarding_completed: false,
          is_active: false,
          ip_address: ipAddress,
          ip_country: ipCountry,
        })
        .select('id')
        .single();

      if (userError) {
        console.error('Failed to create user profile');
        // Clean up auth account if profile creation failed
        if (authId) {
          await supabase.auth.admin.deleteUser(authId);
        }
        return new Response(
          JSON.stringify({ success: false, error: 'Unable to create account. Please try again.' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      userId = newUser.id;
    }

    // Mark the current OTP as verified
    await supabase
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    // Invalidate all other unverified OTPs for this phone number
    await supabase
      .from('phone_verifications')
      .delete()
      .eq('phone_number', normalizedPhone)
      .eq('verified', false);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        userId: userId,
        authId: authId,
        verificationId: verification.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in verify-phone-otp');
    return new Response(
      JSON.stringify({ success: false, error: "Unable to verify code. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
