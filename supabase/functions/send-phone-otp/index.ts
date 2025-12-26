import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log("SMS sent successfully via Twilio to", to);
    return true;
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error);
    return false;
  }
}

// Helper function to check if phone number is a test number
function isTestPhoneNumber(phoneNumber: string): boolean {
  // Test numbers: +1555XXXXXXX, +15555551234, or common dev test numbers
  // Common test patterns: +11234567890, +10000000000, +99999999999
  const testPatterns = [
    /^\+1555\d{7}$/,           // +1555XXXXXXX
    /^\+1(1234567890|0{10})$/, // +11234567890 or +10000000000
    /^\+9{11,}$/,              // +99999999999...
  ];
  
  return testPatterns.some(pattern => pattern.test(phoneNumber));
}

// Helper function to generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
      console.log(`Rate limit exceeded for ${normalizedPhone}: ${recentOtpCount}/${rateLimit} in ${rateLimitWindow} minutes`);
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

    // Check if this is a test phone number (for development/testing only)
    const isTestNumber = isTestPhoneNumber(normalizedPhone);

    // Generate OTP - use test code for test numbers, random for production
    const otpCode = isTestNumber ? "111111" : generateOTP();

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP in database
    const { error: dbError } = await supabaseClient
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false
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
        // Log warning but don't fail - OTP is still stored in database
        console.warn('SMS delivery failed for', normalizedPhone.substring(0, 6) + '***');
      }
    } else {
      console.log('Test phone number detected, skipping SMS');
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
  } catch (error: any) {
    console.error('Error in send-phone-otp:', error);
    return new Response(
      JSON.stringify({ error: error?.message || "An error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
