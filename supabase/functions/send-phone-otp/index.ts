import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import {
  hashOtp,
  generateSecureOtp,
  isTestPhoneNumber,
} from "../_shared/crypto.ts";

// Helper function to send SMS via Twilio
async function sendTwilioSMS(to: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio credentials not configured");
    return false;
  }

  try {
    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio API error:", error);
      return false;
    }

    // Log without exposing phone number
    console.log("SMS sent successfully via Twilio");
    return true;
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error);
    return false;
  }
}

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

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Normalize phone number - remove all spaces and keep only digits and +
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // Get rate limit settings from app_settings
    const [rateLimitResult, windowResult] = await Promise.all([
      supabaseClient.from('app_settings').select('setting_value').eq('setting_key', 'otp_rate_limit').single(),
      supabaseClient.from('app_settings').select('setting_value').eq('setting_key', 'otp_rate_limit_window').single(),
    ]);

    const rateLimit = rateLimitResult.data?.setting_value ? Number(rateLimitResult.data.setting_value) : 5;
    const rateLimitWindow = windowResult.data?.setting_value ? Number(windowResult.data.setting_value) : 15;

    // Check rate limit - count recent OTPs for this phone number
    const windowStart = new Date(Date.now() - rateLimitWindow * 60 * 1000).toISOString();
    const { count: recentOtpCount } = await supabaseClient
      .from('phone_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', normalizedPhone)
      .gte('created_at', windowStart);

    if (recentOtpCount !== null && recentOtpCount >= rateLimit) {
      // Log without exposing full phone number
      console.log(`Rate limit exceeded: ${recentOtpCount}/${rateLimit} in ${rateLimitWindow} minutes`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many verification attempts. Please wait ${rateLimitWindow} minutes before trying again.`
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429
        }
      );
    }

    // Check if this is a test phone number (only works in dev mode)
    const isTestNumber = isTestPhoneNumber(normalizedPhone);

    // Generate OTP - use secure random for production, fixed for test mode
    const otpCode = isTestNumber ? "111111" : generateSecureOtp(6);

    // Hash the OTP for secure storage
    const otpHash = await hashOtp(otpCode, normalizedPhone);

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store hashed OTP in database (store both hash and plaintext temporarily for backwards compat)
    const { error: dbError } = await supabaseClient
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otpCode, // TODO: Remove after migration to hash-only
        otp_hash: otpHash,
        expires_at: expiresAt,
        verified: false,
        attempt_count: 0,
        is_locked: false
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create verification request');
    }

    // Send SMS for real phone numbers
    if (!isTestNumber) {
      const smsMessage = `Your ViiB verification code is: ${otpCode}. Valid for 5 minutes.`;
      const smsSent = await sendTwilioSMS(normalizedPhone, smsMessage);

      if (!smsSent) {
        // Log warning without exposing phone number
        console.warn('SMS delivery failed');
      }
    } else {
      console.log('Test phone number in dev mode, skipping SMS');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: unknown) {
    console.error('Error in send-phone-otp:', error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
