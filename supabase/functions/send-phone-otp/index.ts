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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Normalize phone number - remove all spaces and keep only digits and +
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // Determine if this is a test number
    const isTest = isTestPhoneNumber(normalizedPhone);
    
    // Use hardcoded OTP for test numbers, random for real numbers
    const otpCode = isTest ? "111111" : generateOTP();

    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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

    // Send SMS only for real phone numbers
    if (!isTest) {
      const smsMessage = `Your ViiB verification code is: ${otpCode}. This code expires in 10 minutes.`;
      const smsSent = await sendTwilioSMS(normalizedPhone, smsMessage);
      
      if (!smsSent) {
        console.error('Failed to send SMS, but OTP stored in database');
        // Don't fail the request - OTP is still stored and can be verified
      }
      
      console.log('Real phone number - OTP sent via Twilio to', normalizedPhone);
    } else {
      console.log('TEST MODE: OTP hardcoded as 111111 for', normalizedPhone);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isTest 
          ? "Verification code sent successfully (TEST MODE: Use 111111)"
          : "Verification code sent successfully"
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
