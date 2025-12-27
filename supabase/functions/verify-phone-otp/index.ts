import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { hashOtp, constantTimeCompare } from "../_shared/crypto.ts";

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { phoneNumber, otpCode } = await req.json();

    if (!phoneNumber || !otpCode) {
      throw new Error("Phone number and OTP code are required");
    }

    // Normalize phone number - remove all spaces and keep only digits and +
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // Find the most recent non-verified, non-locked OTP for this phone number
    const { data: verifications, error: fetchError } = await supabaseClient
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .eq('is_locked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      throw new Error('Failed to verify code');
    }

    if (!verifications || verifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your code has expired or is invalid. Please request a new code."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    const verification = verifications[0];

    // Check if max attempts exceeded
    if (verification.attempt_count >= MAX_ATTEMPTS) {
      // Lock this verification
      await supabaseClient
        .from('phone_verifications')
        .update({ is_locked: true })
        .eq('id', verification.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many failed attempts. Please request a new code."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Hash the input OTP for comparison
    const inputOtpHash = await hashOtp(otpCode, normalizedPhone);

    // Check if OTP matches using constant-time comparison
    // Support both hash-based and legacy plaintext comparison during migration
    const hashMatch = verification.otp_hash
      ? constantTimeCompare(verification.otp_hash, inputOtpHash)
      : false;
    const legacyMatch = verification.otp_code
      ? constantTimeCompare(verification.otp_code, otpCode)
      : false;

    if (!hashMatch && !legacyMatch) {
      // Increment attempt counter
      const newAttemptCount = (verification.attempt_count || 0) + 1;
      await supabaseClient
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
        JSON.stringify({
          success: false,
          error: errorMessage
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Mark the current OTP as verified
    const { error: updateError } = await supabaseClient
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    if (updateError) {
      console.error('Failed to mark OTP as verified:', updateError);
    }

    // Invalidate all other unverified OTPs for this phone number (security best practice)
    const { error: invalidateError } = await supabaseClient
      .from('phone_verifications')
      .delete()
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .neq('id', verification.id);

    if (invalidateError) {
      console.error('Failed to invalidate old OTPs:', invalidateError);
    }

    console.log('Phone OTP validated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        verificationId: verification.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: unknown) {
    console.error('Error in verify-phone-otp:', error);

    // Return user-friendly error message instead of technical details
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to verify code. Please try again."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  }
});
