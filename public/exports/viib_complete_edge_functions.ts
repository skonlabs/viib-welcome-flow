/**
 * ============================================================================
 * ViiB Complete Edge Functions Source Code (ALL)
 * ============================================================================
 * Generated: 2025-12-15
 * Total Functions: 17
 *
 * This file is a single-file export of ALL Supabase Edge Functions in this repo.
 * It is intended for download/sharing and is NOT meant to be deployed as-is.
 *
 * Notes:
 * - This file will contain multiple `import` statements and multiple `serve()`/
 *   `Deno.serve()` handlers; that is OK for an export artifact.
 * - Secrets are referenced via Deno.env.get(...) inside each function.
 * ============================================================================
 */

/* eslint-disable */

// ============================================================================
// FUNCTION 1: hash-password
// Location: supabase/functions/hash-password/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash password using Web Crypto API (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, ["deriveBits"]);

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);

  // Combine salt and hash, encode as base64
  const combined = [...saltArray, ...hashArray];
  const base64 = btoa(String.fromCharCode(...combined));

  return base64;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      throw new Error("Password is required");
    }

    const hashedPassword = await hashPassword(password);

    return new Response(
      JSON.stringify({
        success: true,
        hashedPassword,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error hashing password:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

// ============================================================================
// FUNCTION 2: verify-password
// Location: supabase/functions/verify-password/index.ts
// ============================================================================

import { serve as serve_verify_password } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient_verify_password } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders_verify_password = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify password using Web Crypto API (PBKDF2)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    // Decode the stored hash from base64
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));

    // Extract salt (first 16 bytes) and hash (remaining bytes)
    const salt = combined.slice(0, 16);
    const storedHashBytes = combined.slice(16);

    // Hash the provided password with the extracted salt
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, ["deriveBits"]);

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );

    const hashArray = new Uint8Array(hashBuffer);

    // Compare the hashes
    if (hashArray.length !== storedHashBytes.length) {
      return false;
    }

    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHashBytes[i]) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

serve_verify_password(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders_verify_password });
  }

  try {
    const { email, phone, password } = await req.json();

    if (!password || (!email && !phone)) {
      throw new Error("Email or phone and password are required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient_verify_password(supabaseUrl, supabaseKey);

    // Fetch user from database
    // Note: We don't check is_active here because accounts with incomplete onboarding
    // will have is_active: false. The frontend will handle onboarding redirect logic.
    let query;
    if (email) {
      query = supabase.from("users").select("id, password_hash").eq("email", email);
    } else {
      query = supabase.from("users").select("id, password_hash").eq("phone_number", phone);
    }

    const { data: userData, error: fetchError } = await query.maybeSingle();

    if (fetchError || !userData) {
      console.log("User not found or fetch error:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid credentials",
        }),
        {
          headers: { ...corsHeaders_verify_password, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, userData.password_hash);

    if (!isValid) {
      console.log("Password verification failed");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid credentials",
        }),
        {
          headers: { ...corsHeaders_verify_password, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    console.log("Password verified successfully for user:", userData.id);
    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.id,
      }),
      {
        headers: { ...corsHeaders_verify_password, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error verifying password:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to verify credentials",
      }),
      {
        headers: { ...corsHeaders_verify_password, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

// ============================================================================
// FUNCTION 3: send-phone-otp
// Location: supabase/functions/send-phone-otp/index.ts
// ============================================================================

import { serve as serve_send_phone_otp } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient_send_phone_otp } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders_send_phone_otp = {
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
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    });

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
    /^\+1555\d{7}$/, // +1555XXXXXXX
    /^\+1(1234567890|0{10})$/, // +11234567890 or +10000000000
    /^\+9{11,}$/, // +99999999999...
  ];

  return testPatterns.some((pattern) => pattern.test(phoneNumber));
}

// Helper function to generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve_send_phone_otp(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders_send_phone_otp });
  }

  try {
    const supabaseClient = createClient_send_phone_otp(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Normalize phone number - remove all spaces and keep only digits and +
    const normalizedPhone = phoneNumber.replace(/\s+/g, "");

    // ALWAYS use hardcoded OTP for testing to avoid SMS costs
    const otpCode = "111111";

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP in database
    const { error: dbError } = await supabaseClient.from("phone_verifications").insert({
      phone_number: normalizedPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      verified: false,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to create verification request");
    }

    // SMS sending disabled - using hardcoded OTP for all numbers during testing
    console.log("TEST MODE: OTP hardcoded as 111111 for", normalizedPhone);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent successfully (TEST MODE: Use 111111)",
      }),
      {
        headers: { ...corsHeaders_send_phone_otp, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in send-phone-otp:", error);
    return new Response(JSON.stringify({ error: error?.message || "An error occurred" }), {
      headers: { ...corsHeaders_send_phone_otp, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// ============================================================================
// FUNCTION 4: verify-phone-otp
// Location: supabase/functions/verify-phone-otp/index.ts
// ============================================================================

import { serve as serve_verify_phone_otp } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient_verify_phone_otp } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders_verify_phone_otp = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve_verify_phone_otp(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders_verify_phone_otp });
  }

  try {
    const supabaseClient = createClient_verify_phone_otp(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { phoneNumber, otpCode } = await req.json();

    if (!phoneNumber || !otpCode) {
      throw new Error("Phone number and OTP code are required");
    }

    // Normalize phone number - remove all spaces and keep only digits and +
    const normalizedPhone = phoneNumber.replace(/\s+/g, "");

    // Find the most recent non-verified OTP for this phone number
    const { data: verifications, error: fetchError } = await supabaseClient
      .from("phone_verifications")
      .select("*")
      .eq("phone_number", normalizedPhone)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      throw new Error("Failed to verify code");
    }

    if (!verifications || verifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your code has expired or is invalid. Please request a new code.",
        }),
        {
          headers: { ...corsHeaders_verify_phone_otp, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const verification = verifications[0];

    // Check if OTP matches
    if (verification.otp_code !== otpCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The code you entered is incorrect. Please check and try again.",
        }),
        {
          headers: { ...corsHeaders_verify_phone_otp, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // DO NOT mark as verified here - let the calling code do it after user creation succeeds
    console.log("Phone OTP validated successfully:", normalizedPhone);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        verificationId: verification.id,
      }),
      {
        headers: { ...corsHeaders_verify_phone_otp, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in verify-phone-otp:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to verify code. Please try again.",
      }),
      {
        headers: { ...corsHeaders_verify_phone_otp, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

// ============================================================================
// FUNCTION 5: send-email-otp
// Location: supabase/functions/send-email-otp/index.ts
// ============================================================================

import { serve as serve_send_email_otp } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient_send_email_otp } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient as SMTPClient_send_email_otp } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders_send_email_otp = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve_send_email_otp(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders_send_email_otp });
  }

  try {
    const { email } = await req.json();
    console.log("Sending OTP to email:", email);

    if (!email) {
      throw new Error("Email is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient_send_email_otp(supabaseUrl, supabaseKey);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otpCode);

    // Store OTP in database (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase.from("email_verifications").insert({
      email,
      otp_code: otpCode,
      expires_at: expiresAt,
      verified: false,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store OTP");
    }

    // Send email using Gmail SMTP
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.error("Gmail credentials not configured");
      throw new Error("Email service not configured");
    }

    const client = new SMTPClient_send_email_otp({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: email,
      subject: "Your ViiB Verification Code",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Your Verification Code</h2>
          <p>Your ViiB verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Your Verification Code</h2>
          <p>Your ViiB verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    await client.close();

    console.log("Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders_send_email_otp, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in send-email-otp function:", error);

    return new Response(
      JSON.stringify({ error: "Unable to send verification code. Please check your email address and try again." }),
      {
        headers: { ...corsHeaders_send_email_otp, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// ============================================================================
// FUNCTION 6: verify-email-otp
// Location: supabase/functions/verify-email-otp/index.ts
// ============================================================================

import { serve as serve_verify_email_otp } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient_verify_email_otp } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders_verify_email_otp = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve_verify_email_otp(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders_verify_email_otp });
  }

  try {
    const { email, otp, password, name } = await req.json();
    console.log("Verifying OTP for email:", email);

    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";

    let ipCountry = "Unknown";
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        ipCountry = geoData.country_name || "Unknown";
      }
    } catch (geoError) {
      console.error("Failed to fetch geo data:", geoError);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient_verify_email_otp(supabaseUrl, supabaseKey);

    const { data: verifications, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(5);

    const verification = verifications?.find((v: any) => !v.verified);

    if (fetchError || !verification) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No verification code found. Please request a new code.",
        }),
        { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your code has expired. Please request a new code.",
        }),
        { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const dbOtp = String(verification.otp_code).trim();
    const userOtp = String(otp).trim();

    if (dbOtp !== userOtp) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid code. Please check and try again.",
        }),
        { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, onboarding_completed, is_email_verified")
      .eq("email", email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      await supabase.from("email_verifications").update({ verified: true }).eq("id", verification.id);

      userId = existingUser.id;
    } else {
      const { data: hashData, error: hashError } = await supabase.functions.invoke("hash-password", {
        body: { password },
      });

      if (hashError || !hashData?.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unable to process request. Please try again.",
          }),
          { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
        );
      }

      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email,
          password_hash: hashData.hashedPassword,
          signup_method: "email",
          is_email_verified: true,
          is_age_over_18: true,
          onboarding_completed: false,
          is_active: false,
          ip_address: ipAddress,
          ip_country: ipCountry,
        })
        .select("id")
        .single();

      if (userError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unable to create account. Please try again.",
          }),
          { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
        );
      }

      await supabase.from("email_verifications").update({ verified: true }).eq("id", verification.id);

      userId = newUser.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email verified successfully",
        userId: userId,
      }),
      { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("Error in verify-email-otp function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to verify code. Please request a new code.",
      }),
      { headers: { ...corsHeaders_verify_email_otp, "Content-Type": "application/json" }, status: 200 },
    );
  }
});

// ============================================================================
// FUNCTION 7: send-activation-invite
// Location: supabase/functions/send-activation-invite/index.ts
// ============================================================================

import { serve as serve_send_activation_invite } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createClient_send_activation_invite } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient as SMTPClient_send_activation_invite } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders_send_activation_invite = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve_send_activation_invite(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders_send_activation_invite });
  }

  try {
    const { email, code, senderName = "ViiB" } = await req.json();

    if (!email || !code) {
      throw new Error("Email and activation code are required");
    }

    console.log(`Sending activation invite to ${email} with code ${code}`);

    const supabaseClient = createClient_send_activation_invite(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: emailConfig, error: configError } = await supabaseClient
      .from("email_config")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching email config:", configError);
      throw new Error("Failed to fetch email configuration");
    }

    if (!emailConfig) {
      throw new Error("No active email configuration found. Please configure email settings in Admin > Email Setup");
    }

    const { data: template, error: templateError } = await supabaseClient
      .from("email_templates")
      .select("*")
      .eq("template_type", "activation_invite")
      .eq("is_active", true)
      .maybeSingle();

    let subject = "Your ViiB Activation Code";
    let body = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
            .code-box { background: #f3f4f6; border: 2px dashed #667eea; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #667eea; font-family: 'Courier New', monospace; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to ViiB! 🎉</h1>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">You've Been Invited!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Someone has invited you to join ViiB - your personalized entertainment companion.
                Use the activation code below to get started on your journey.
              </p>

              <div class="code-box">
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">YOUR ACTIVATION CODE</div>
                <div class="code">${code}</div>
              </div>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                To activate your account:
              </p>
              <ol style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                <li>Visit the ViiB app</li>
                <li>Click "Get Started" or "Sign Up"</li>
                <li>Enter your activation code when prompted</li>
                <li>Complete your profile setup</li>
              </ol>

              <div style="text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://viib.lovable.app"}" class="button">
                  Get Started Now
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                This activation code is unique to you. Please don't share it with others.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© ${new Date().getFullYear()} ViiB. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">Discover content that matches your vibe.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    if (template && !templateError) {
      subject = template.subject;
      body = template.body
        .replace(/{{code}}/g, code)
        .replace(/{{email}}/g, email)
        .replace(
          /{{app_url}}/g,
          Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://viib.lovable.app",
        );
    }

    const client = new SMTPClient_send_activation_invite({
      connection: {
        hostname: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        tls: emailConfig.use_ssl,
        auth: {
          username: emailConfig.smtp_user,
          password: emailConfig.smtp_password,
        },
      },
    });

    await client.send({
      from: emailConfig.from_name ? `${emailConfig.from_name} <${emailConfig.from_email}>` : emailConfig.from_email,
      to: email,
      subject: subject,
      content: "text/html",
      html: body,
    });

    await client.close();

    console.log(`Activation invite sent successfully to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Activation invite sent successfully",
      }),
      {
        headers: { ...corsHeaders_send_activation_invite, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in send-activation-invite:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send activation invite",
      }),
      {
        headers: { ...corsHeaders_send_activation_invite, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

// ============================================================================
// FUNCTION 8: send-invites
// Location: supabase/functions/send-invites/index.ts
// ============================================================================

import { createClient as createClient_send_invites } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders_send_invites = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  userId: string;
  method: "email" | "phone";
  contacts: string[];
  note?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders_send_invites });
  }

  try {
    const supabase = createClient_send_invites(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { userId, method, contacts, note } = (await req.json()) as InviteRequest;

    console.log(`Processing ${contacts.length} ${method} invites from user ${userId}`);
    if (note) {
      console.log(`Personal note included: ${note.substring(0, 50)}...`);
    }

    if (!userId || !contacts || contacts.length === 0) {
      throw new Error("Missing required fields");
    }

    // Get sender's information
    const { data: sender, error: senderError } = await supabase
      .from("users")
      .select("full_name, email, phone_number")
      .eq("id", userId)
      .single();

    if (senderError) {
      console.error("Error fetching sender:", senderError);
      throw senderError;
    }

    const senderName = sender.full_name || "A friend";
    const inviteLink = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovableproject.com")}?invited_by=${userId}`;

    // Process invites based on method
    const results: any[] = [];

    for (const contact of contacts) {
      try {
        if (method === "email") {
          // Send email invite
          await sendEmailInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: "email" });
          console.log(`Email invite sent to ${contact}`);
        } else if (method === "phone") {
          // Send SMS invite
          await sendSMSInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: "sms" });
          console.log(`SMS invite sent to ${contact}`);
        }

        // Store invitation record (optional - for tracking)
        await supabase.from("friend_connections").upsert(
          {
            user_id: userId,
            friend_user_id: userId, // Placeholder until they sign up
            relationship_type: "pending_invite",
            trust_score: 0.5,
          },
          { onConflict: "user_id,friend_user_id" },
        );
      } catch (error: any) {
        console.error(`Failed to send invite to ${contact}:`, error);
        results.push({ contact, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Successfully sent ${successCount}/${contacts.length} invites`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Sent ${successCount} invite${successCount !== 1 ? "s" : ""} successfully`,
      }),
      {
        headers: { ...corsHeaders_send_invites, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in send-invites function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders_send_invites, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function sendEmailInvite(email: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  // For testing: log the invite instead of sending
  console.log(`[EMAIL INVITE] To: ${email}, From: ${senderName}, Link: ${inviteLink}`);
  if (note) {
    console.log(`[EMAIL INVITE] Personal Note: ${note}`);
  }
  return true;
}

async function sendSMSInvite(phone: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  // For testing: log the invite instead of sending
  console.log(`[SMS INVITE] To: ${phone}, From: ${senderName}, Link: ${inviteLink}`);
  if (note) {
    console.log(`[SMS INVITE] Personal Note: ${note}`);
  }
  return true;
}

// ============================================================================
// FUNCTION 9: search-tmdb
// Location: supabase/functions/search-tmdb/index.ts
// ============================================================================

import { serve as serve_search_tmdb } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY_search_tmdb = Deno.env.get("TMDB_API_KEY");
const TMDB_BASE_URL_search_tmdb = "https://api.themoviedb.org/3";

const corsHeaders_search_tmdb = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TMDB Genre ID to Name mapping
const GENRE_MAP_search_tmdb: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

serve_search_tmdb(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders_search_tmdb });
  }

  try {
    const { query, genres, years, language = "en", limit = 20, page = 1 } = await req.json();

    if (!TMDB_API_KEY_search_tmdb) {
      throw new Error("TMDB_API_KEY not configured");
    }

    // Search both movies and TV shows
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL_search_tmdb}/search/movie?api_key=${TMDB_API_KEY_search_tmdb}&query=${encodeURIComponent(query || "popular")}&language=${language}&page=${page}`,
      ),
      fetch(
        `${TMDB_BASE_URL_search_tmdb}/search/tv?api_key=${TMDB_API_KEY_search_tmdb}&query=${encodeURIComponent(query || "popular")}&language=${language}&page=${page}`,
      ),
    ]);

    const [movieData, tvData] = await Promise.all([movieResponse.json(), tvResponse.json()]);

    // Filter movies by year
    const filteredMovies = (movieData.results || []).filter((movie: any) => {
      if (!years || years.length === 0) return true;
      if (!movie.release_date) return false;
      const movieYear = new Date(movie.release_date).getFullYear();
      return years.includes(movieYear);
    });

    // For TV shows, we'll filter after fetching season details
    const filteredTv = tvData.results || [];

    // Fetch certifications and details for movies
    const moviesWithCertifications = await Promise.all(
      filteredMovies.slice(0, 10).map(async (movie: any) => {
        try {
          const [certResponse, detailsResponse, providersResponse] = await Promise.all([
            fetch(`${TMDB_BASE_URL_search_tmdb}/movie/${movie.id}/release_dates?api_key=${TMDB_API_KEY_search_tmdb}`),
            fetch(
              `${TMDB_BASE_URL_search_tmdb}/movie/${movie.id}?api_key=${TMDB_API_KEY_search_tmdb}&language=${language}`,
            ),
            fetch(`${TMDB_BASE_URL_search_tmdb}/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY_search_tmdb}`),
          ]);
          const [certData, details, providersData] = await Promise.all([
            certResponse.json(),
            detailsResponse.json(),
            providersResponse.json(),
          ]);

          // Extract US streaming providers
          const usProviders = providersData.results?.US?.flatrate || [];
          const streaming_services = usProviders.map((p: any) => ({
            service_code: p.provider_name,
            service_name: p.provider_name,
          }));

          // Find US certification
          const usCertification = certData.results?.find((r: any) => r.iso_3166_1 === "US");
          const certification = usCertification?.release_dates?.[0]?.certification || "NR";

          return {
            id: `tmdb-movie-${movie.id}`,
            tmdb_id: movie.id,
            external_id: `tmdb-movie-${movie.id}`,
            title: movie.title || movie.original_title,
            content_type: "movie",
            type: "movie",
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            description: movie.overview,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined,
            genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP_search_tmdb[id]).filter(Boolean),
            mood_tags: [],
            rating: movie.vote_average,
            popularity: movie.popularity,
            certification: certification,
            runtime_minutes: details.runtime,
            original_language: movie.original_language,
            streaming_services: streaming_services,
          };
        } catch (error) {
          console.error(`Error fetching details for movie ${movie.id}:`, error);
          return {
            id: `tmdb-movie-${movie.id}`,
            tmdb_id: movie.id,
            external_id: `tmdb-movie-${movie.id}`,
            title: movie.title || movie.original_title,
            content_type: "movie",
            type: "movie",
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            description: movie.overview,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined,
            genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP_search_tmdb[id]).filter(Boolean),
            mood_tags: [],
            rating: movie.vote_average,
            popularity: movie.popularity,
            certification: "NR",
            original_language: movie.original_language,
            streaming_services: [],
          };
        }
      }),
    );

    // Fetch detailed info for TV shows to get number of seasons, certification, and season dates
    const tvShowsWithDetails = await Promise.all(
      filteredTv.slice(0, 10).map(async (tv: any) => {
        try {
          const [detailsResponse, certResponse, providersResponse] = await Promise.all([
            fetch(`${TMDB_BASE_URL_search_tmdb}/tv/${tv.id}?api_key=${TMDB_API_KEY_search_tmdb}&language=${language}`),
            fetch(`${TMDB_BASE_URL_search_tmdb}/tv/${tv.id}/content_ratings?api_key=${TMDB_API_KEY_search_tmdb}`),
            fetch(`${TMDB_BASE_URL_search_tmdb}/tv/${tv.id}/watch/providers?api_key=${TMDB_API_KEY_search_tmdb}`),
          ]);
          const [details, certData, providersData] = await Promise.all([
            detailsResponse.json(),
            certResponse.json(),
            providersResponse.json(),
          ]);

          // Check if any season matches the year filter
          if (years && years.length > 0) {
            const hasMatchingSeason = details.seasons?.some((season: any) => {
              if (!season.air_date) return false;
              const seasonYear = new Date(season.air_date).getFullYear();
              return years.includes(seasonYear);
            });

            // If no season matches the year filter, skip this show
            if (!hasMatchingSeason) {
              return null;
            }
          }

          // Extract US streaming providers
          const usProviders = providersData.results?.US?.flatrate || [];
          const streaming_services = usProviders.map((p: any) => ({
            service_code: p.provider_name,
            service_name: p.provider_name,
          }));

          // Find US certification
          const usCertification = certData.results?.find((r: any) => r.iso_3166_1 === "US");
          const certification = usCertification?.rating || "NR";

          return {
            id: `tmdb-tv-${tv.id}`,
            tmdb_id: tv.id,
            external_id: `tmdb-tv-${tv.id}`,
            title: tv.name || tv.original_name,
            content_type: "series",
            type: "series",
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
            description: tv.overview,
            poster_url: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
            backdrop_url: tv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : undefined,
            genres: (tv.genre_ids || []).map((id: number) => GENRE_MAP_search_tmdb[id]).filter(Boolean),
            mood_tags: [],
            rating: tv.vote_average,
            popularity: tv.popularity,
            number_of_seasons: details.number_of_seasons,
            certification: certification,
            avg_episode_minutes: details.episode_run_time?.[0],
            original_language: tv.original_language,
            streaming_services: streaming_services,
          };
        } catch (error) {
          console.error(`Error fetching details for TV show ${tv.id}:`, error);
          return {
            id: `tmdb-tv-${tv.id}`,
            tmdb_id: tv.id,
            external_id: `tmdb-tv-${tv.id}`,
            title: tv.name || tv.original_name,
            content_type: "series",
            type: "series",
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
            description: tv.overview,
            poster_url: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
            backdrop_url: tv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : undefined,
            genres: (tv.genre_ids || []).map((id: number) => GENRE_MAP_search_tmdb[id]).filter(Boolean),
            mood_tags: [],
            rating: tv.vote_average,
            popularity: tv.popularity,
            certification: "NR",
            original_language: tv.original_language,
            streaming_services: [],
          };
        }
      }),
    );

    // Combine and sort by popularity (filter out null values)
    let combined = [...moviesWithCertifications, ...tvShowsWithDetails]
      .filter((item) => item !== null)
      .sort((a: any, b: any) => b.popularity - a.popularity)
      .slice(0, limit);

    // Filter by genres if specified
    if (genres && genres.length > 0) {
      // Get genre IDs from TMDB
      const genreResponse = await fetch(
        `${TMDB_BASE_URL_search_tmdb}/genre/movie/list?api_key=${TMDB_API_KEY_search_tmdb}&language=${language}`,
      );
      const genreData = await genreResponse.json();
      const genreMap = new Map(genreData.genres.map((g: any) => [g.name.toLowerCase(), g.id]));

      const genreIds = genres.map((g: string) => genreMap.get(g.toLowerCase())).filter(Boolean);

      if (genreIds.length > 0) {
        combined = combined.filter((title: any) => title.genres.some((gid: number) => genreIds.includes(gid)));
      }
    }

    return new Response(JSON.stringify({ titles: combined }), {
      headers: { ...corsHeaders_search_tmdb, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders_search_tmdb, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ============================================================================
// FUNCTION 10: enrich-title-details
// Location: supabase/functions/enrich-title-details/index.ts
// ============================================================================

import { serve as serve_enrich_title_details } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY_enrich_title_details = Deno.env.get("TMDB_API_KEY");
const TMDB_BASE_URL_enrich_title_details = "https://api.themoviedb.org/3";

const corsHeaders_enrich_title_details = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENRE_MAP_enrich_title_details: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

serve_enrich_title_details(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders_enrich_title_details });
  }

  try {
    const { tmdb_id, type } = await req.json();

    if (!TMDB_API_KEY_enrich_title_details) {
      throw new Error("TMDB_API_KEY not configured");
    }

    if (!tmdb_id || !type) {
      throw new Error("tmdb_id and type are required");
    }

    const endpoint = type === "movie" ? "movie" : "tv";

    // Fetch details, credits, videos, and watch providers in parallel
    const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}?api_key=${TMDB_API_KEY_enrich_title_details}`,
      ),
      fetch(
        `${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}/credits?api_key=${TMDB_API_KEY_enrich_title_details}`,
      ),
      fetch(
        `${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}/videos?api_key=${TMDB_API_KEY_enrich_title_details}`,
      ),
      fetch(
        `${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}/watch/providers?api_key=${TMDB_API_KEY_enrich_title_details}`,
      ),
    ]);

    const [details, credits, videos, providers] = await Promise.all([
      detailsRes.json(),
      creditsRes.json(),
      videosRes.json(),
      providersRes.json(),
    ]);

    const trailer = videos.results?.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
    const trailer_url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const cast = credits.cast?.slice(0, 5).map((c: any) => c.name) || [];

    const genres = details.genres?.map((g: any) => GENRE_MAP_enrich_title_details[g.id] || g.name) || [];

    const usProviders = providers.results?.US;
    const streaming_services: any[] = [];

    if (usProviders?.flatrate) {
      streaming_services.push(
        ...usProviders.flatrate.map((p: any) => ({
          service_name: p.provider_name,
          service_code: p.provider_id.toString(),
          logo_url: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        })),
      );
    }

    const runtime_minutes = type === "movie" ? details.runtime : null;
    const avg_episode_minutes = type === "series" ? details.episode_run_time?.[0] : null;

    let seasons: any[] = [];
    let latestSeasonTrailer: string | null = null;

    if (type === "series" && details.seasons) {
      console.log(`Fetching season videos for ${details.seasons.length} seasons`);

      const seasonVideoPromises = details.seasons.map((season: any) =>
        fetch(
          `${TMDB_BASE_URL_enrich_title_details}/tv/${tmdb_id}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY_enrich_title_details}`,
        )
          .then((res) => {
            if (!res.ok) {
              console.error(`Failed to fetch videos for season ${season.season_number}: ${res.status}`);
              return { results: [] };
            }
            return res.json();
          })
          .catch((err) => {
            console.error(`Error fetching videos for season ${season.season_number}:`, err);
            return { results: [] };
          }),
      );

      const seasonVideos = await Promise.all(seasonVideoPromises);

      seasons = details.seasons.map((season: any, index: number) => {
        const videos = seasonVideos[index]?.results || [];
        const seasonTrailer = videos.find((v: any) => v.type === "Trailer" && v.site === "YouTube");

        const trailerUrl = seasonTrailer ? `https://www.youtube.com/watch?v=${seasonTrailer.key}` : null;

        return {
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episode_count,
          air_date: season.air_date,
          overview: season.overview,
          poster_path: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : null,
          id: season.id,
          trailer_url: trailerUrl,
        };
      });

      const seasonsWithTrailers = seasons.filter((s: any) => s.air_date && s.trailer_url);

      if (seasonsWithTrailers.length > 0) {
        const sortedSeasons = seasonsWithTrailers.sort(
          (a: any, b: any) => new Date(b.air_date).getTime() - new Date(a.air_date).getTime(),
        );
        latestSeasonTrailer = sortedSeasons[0].trailer_url;
      }
    }

    const finalTrailerUrl = type === "series" ? latestSeasonTrailer || trailer_url : trailer_url;

    return new Response(
      JSON.stringify({
        trailer_url: finalTrailerUrl,
        cast,
        genres,
        streaming_services,
        runtime_minutes,
        avg_episode_minutes,
        seasons,
      }),
      {
        headers: { ...corsHeaders_enrich_title_details, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Enrich error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders_enrich_title_details, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ============================================================================
// FUNCTION 11: full-refresh-titles
// Location: supabase/functions/full-refresh-titles/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TMDB Genre ID to Name mapping (includes both Movie and TV genre IDs)
const TMDB_GENRE_MAP: Record<number, string> = {
  // Movie genres
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV-specific genres
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// CRITICAL: Map movie genre IDs to their TV equivalents
// TMDB uses DIFFERENT genre IDs for TV shows vs Movies!
// These are the ONLY valid TV genres from TMDB API
const VALID_TV_GENRES = new Set([
  10759, // Action & Adventure
  16, // Animation
  35, // Comedy
  80, // Crime
  99, // Documentary
  18, // Drama
  10751, // Family
  10762, // Kids
  10763, // News
  10764, // Reality
  10765, // Sci-Fi & Fantasy
  10766, // Soap
  10767, // Talk
  10768, // War & Politics
  37, // Western
  9648, // Mystery
]);

// Map movie genre IDs to TV genre IDs
// Returns null if genre has NO TV equivalent
const MOVIE_TO_TV_GENRE_MAP: Record<number, number | null> = {
  // These movie genres MAP to different TV genre IDs
  28: 10759, // Action → Action & Adventure (TV)
  12: 10759, // Adventure → Action & Adventure (TV)
  878: 10765, // Science Fiction → Sci-Fi & Fantasy (TV)
  14: 10765, // Fantasy → Sci-Fi & Fantasy (TV)
  10752: 10768, // War → War & Politics (TV)

  // These genres use SAME ID for both movies and TV
  16: 16, // Animation
  35: 35, // Comedy
  80: 80, // Crime
  99: 99, // Documentary
  18: 18, // Drama
  10751: 10751, // Family
  9648: 9648, // Mystery
  37: 37, // Western

  // CRITICAL: These movie genres have NO TV equivalent!
  // TV shows in TMDB don't use these genre IDs
  // Setting to null means we skip TV discovery for these genres
  27: null, // Horror - NO TV EQUIVALENT
  36: null, // History - NO TV EQUIVALENT
  10402: null, // Music - NO TV EQUIVALENT
  10749: null, // Romance - NO TV EQUIVALENT
  53: null, // Thriller - NO TV EQUIVALENT
  10770: null, // TV Movie - NO TV EQUIVALENT (doesn't make sense for TV)
};

// TV-ONLY genres that have NO movie equivalent
// These must be searched during specific movie genre work units
// Map: movie genre ID → array of TV-only genres to also search
const TV_ONLY_GENRES_TO_SEARCH: Record<number, number[]> = {
  35: [10767], // When searching Comedy, also search Talk (10767)
  18: [10764, 10766], // When searching Drama, also search Reality (10764), Soap (10766)
  10751: [10762], // When searching Family, also search Kids (10762)
  99: [10763], // When searching Documentary, also search News (10763)
};

// Human-readable names for TV-only genres
const TV_ONLY_GENRE_NAMES: Record<number, string> = {
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10766: "Soap",
  10767: "Talk",
};

// TMDB Provider ID to service name mapping (US region)
const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: "Netflix",
  9: "Prime Video",
  119: "Prime Video",
  15: "Hulu",
  350: "Apple TV",
  2: "Apple TV",
  337: "DisneyPlus",
  390: "DisneyPlus",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let requestBody: any = {};
  try {
    const text = await req.text();
    if (text) requestBody = JSON.parse(text);
  } catch (e) {
    // Ignore if no body or invalid JSON
  }

  try {
    console.log("Starting Full Refresh job...", requestBody);

    const startTime = Date.now();

    const { data: jobData } = await supabase
      .from("jobs")
      .select("configuration")
      .eq("job_type", "full_refresh")
      .single();

    const config = (jobData?.configuration as any) || {};
    const minRating = config.min_rating || 6.0;

    const languageCode = requestBody.languageCode;
    const year = requestBody.startYear;
    const tmdbGenreId = requestBody.genreId;

    if (!languageCode || !year || !tmdbGenreId) {
      throw new Error("Missing required parameters: languageCode, startYear, genreId");
    }

    // Fetch all genres from our DB
    const { data: genres } = await supabase.from("genres").select("id, genre_name, tmdb_genre_id");

    const genreNameToId: Record<string, string> = {};
    (genres || []).forEach((g) => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    // Fetch existing languages - ONLY use these, never add new ones
    const { data: existingLanguages } = await supabase.from("spoken_languages").select("iso_639_1");
    const validLanguageCodes = new Set((existingLanguages || []).map((l) => l.iso_639_1));
    console.log(`Valid language codes: ${validLanguageCodes.size}`);

    // Fetch supported streaming services
    const { data: streamingServices } = await supabase
      .from("streaming_services")
      .select("id, service_name")
      .eq("is_active", true);

    const serviceNameToId: Record<string, string> = {};
    (streamingServices || []).forEach((s) => {
      serviceNameToId[s.service_name.toLowerCase()] = s.id;
    });

    console.log(`Supported streaming services: ${Object.keys(serviceNameToId).join(", ")}`);

    // Fetch official trailer channels from database
    const { data: officialChannels } = await supabase
      .from("official_trailer_channels")
      .select("channel_name, language_code, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    console.log(`Loaded ${officialChannels?.length || 0} official trailer channels`);

    const genreName = TMDB_GENRE_MAP[tmdbGenreId] || `Unknown(${tmdbGenreId})`;
    console.log(`Processing: Language=${languageCode}, Year=${year}, Genre=${genreName} (ID: ${tmdbGenreId})`);

    let totalProcessed = 0;
    let moviesProcessed = 0;
    let seriesProcessed = 0;
    let skippedNoProvider = 0;
    const MAX_RUNTIME_MS = 90000;

    // Helper function to fetch watch providers from TMDB (US region only)
    async function fetchWatchProviders(
      tmdbId: number,
      titleType: string,
    ): Promise<{ providers: Array<{ tmdbId: number; name: string; serviceId: string }> }> {
      try {
        const endpoint = titleType === "movie" ? "movie" : "tv";
        const res = await fetch(
          `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`,
        );
        if (!res.ok) return { providers: [] };

        const data = await res.json();
        const usProviders = data.results?.US?.flatrate || [];
        const matchedProviders: Array<{ tmdbId: number; name: string; serviceId: string }> = [];

        for (const provider of usProviders) {
          const mappedName = TMDB_PROVIDER_MAP[provider.provider_id];
          if (mappedName) {
            const serviceId = serviceNameToId[mappedName.toLowerCase()];
            if (serviceId) {
              matchedProviders.push({
                tmdbId: provider.provider_id,
                name: mappedName,
                serviceId,
              });
            }
          }
        }

        return { providers: matchedProviders };
      } catch (e) {
        console.error(`Error fetching watch providers for ${tmdbId}:`, e);
        return { providers: [] };
      }
    }

    // Helper function to fetch trailer from TMDB or YouTube
    async function fetchTrailer(
      tmdbId: number,
      titleType: string,
      titleName: string,
      releaseYear: number | null,
      titleLang: string = "en",
      latestSeasonNumber?: number,
      seasonName?: string,
    ): Promise<{ url: string | null; isTmdbTrailer: boolean }> {
      try {
        let trailerKey: string | null = null;

        // For TV series, try to get the latest season's trailer first
        if (titleType === "tv" && latestSeasonNumber && latestSeasonNumber > 0) {
          const seasonVideosRes = await fetch(
            `https://api.themoviedb.org/3/tv/${tmdbId}/season/${latestSeasonNumber}/videos?api_key=${TMDB_API_KEY}`,
          );
          if (seasonVideosRes.ok) {
            const seasonVideosData = await seasonVideosRes.json();
            const seasonTrailer = seasonVideosData.results?.find(
              (v: any) => v.type === "Trailer" && v.site === "YouTube",
            );
            if (seasonTrailer) {
              trailerKey = seasonTrailer.key;
              console.log(`Found season ${latestSeasonNumber} trailer for ${titleName}`);
            }
          }
        }

        // Fallback to series/movie level trailer if no season trailer found
        if (!trailerKey) {
          const endpoint = titleType === "movie" ? "movie" : "tv";
          const videosRes = await fetch(
            `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`,
          );

          if (videosRes.ok) {
            const videosData = await videosRes.json();
            const trailer = videosData.results?.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
            if (trailer) {
              trailerKey = trailer.key;
            }
          }
        }

        if (trailerKey) {
          return { url: `https://www.youtube.com/watch?v=${trailerKey}`, isTmdbTrailer: true };
        }

        // YouTube fallback - search official channels only
        if (YOUTUBE_API_KEY) {
          const relevantChannels = (officialChannels || [])
            .filter((c) => c.language_code === titleLang || c.language_code === "global" || c.language_code === "en")
            .map((c) => c.channel_name.toLowerCase());

          const searchQuery =
            titleType === "tv" && seasonName
              ? `${titleName} ${seasonName} official trailer`
              : `${titleName} ${releaseYear || ""} official trailer`;
          const youtubeRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`,
          );
          if (youtubeRes.ok) {
            const searchData = await youtubeRes.json();

            const officialChannelTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
              return relevantChannels.some((officialName) => channelTitle.includes(officialName.toLowerCase()));
            });

            if (officialChannelTrailer) {
              return {
                url: `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`,
                isTmdbTrailer: false,
              };
            }

            const verifiedTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
              const videoTitle = item.snippet.title?.toLowerCase() || "";

              const hasOfficialInTitle = videoTitle.includes("official trailer");
              const isOfficialChannel =
                channelTitle.includes("pictures") ||
                channelTitle.includes("studios") ||
                channelTitle.includes("entertainment") ||
                channelTitle.includes("trailers") ||
                channelTitle.includes("movies") ||
                channelTitle.includes("films") ||
                channelTitle.includes("productions") ||
                channelTitle.includes("netflix") ||
                channelTitle.includes("disney") ||
                channelTitle.includes("prime video");

              return hasOfficialInTitle && isOfficialChannel;
            });

            if (verifiedTrailer) {
              return { url: `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`, isTmdbTrailer: false };
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching trailer for ${titleName}:`, e);
      }
      return { url: null, isTmdbTrailer: true };
    }

    // Helper function to fetch full movie details
    async function fetchMovieDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.error(`Error fetching movie details ${tmdbId}:`, e);
      }
      return null;
    }

    // Helper function to fetch full TV details
    async function fetchTvDetails(tmdbId: number) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.error(`Error fetching TV details ${tmdbId}:`, e);
      }
      return null;
    }

    // ==========================================
    // MOVIES PROCESSING
    // ==========================================

    // Helper function to process a movie
    async function processMovie(movie: any, phase: string) {
      try {
        const { providers } = await fetchWatchProviders(movie.id, "movie");

        if (providers.length === 0) {
          skippedNoProvider++;
          return false;
        }

        const details = await fetchMovieDetails(movie.id);

        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
        const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(
          movie.id,
          "movie",
          movie.title,
          releaseYear,
          movie.original_language || languageCode,
        );

        // Build genres JSON array from TMDB genre IDs
        const movieGenreIds = movie.genre_ids || [];
        const genresJson = movieGenreIds.map((gId: number) => TMDB_GENRE_MAP[gId]).filter(Boolean);

        const { data: upsertedTitle, error: titleError } = await supabase
          .from("titles")
          .upsert(
            {
              tmdb_id: movie.id,
              title_type: "movie",
              name: movie.title || details?.title,
              original_name: movie.original_title || details?.original_title,
              overview: movie.overview || details?.overview,
              release_date: movie.release_date || details?.release_date || null,
              first_air_date: null,
              last_air_date: null,
              status: details?.status || null,
              runtime: details?.runtime || null,
              episode_run_time: null,
              popularity: movie.popularity ?? details?.popularity,
              vote_average: movie.vote_average ?? details?.vote_average,
              poster_path: movie.poster_path || details?.poster_path,
              backdrop_path: movie.backdrop_path || details?.backdrop_path,
              original_language: movie.original_language || details?.original_language,
              is_adult: movie.adult || false,
              imdb_id: details?.imdb_id || null,
              tagline: details?.tagline || null,
              trailer_url: trailerUrl,
              is_tmdb_trailer: isTmdbTrailer,
              title_genres: genresJson,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tmdb_id,title_type" },
          )
          .select("id")
          .single();

        if (titleError) {
          console.error(`Error upserting movie ${movie.title} (${phase}):`, titleError);
          return false;
        }

        if (upsertedTitle) {
          totalProcessed++;
          moviesProcessed++;

          for (const provider of providers) {
            await supabase.from("title_streaming_availability").upsert(
              {
                title_id: upsertedTitle.id,
                streaming_service_id: provider.serviceId,
                region_code: "US",
              },
              { onConflict: "title_id,streaming_service_id,region_code" },
            );
          }

          if (details?.spoken_languages) {
            for (const lang of details.spoken_languages) {
              if (validLanguageCodes.has(lang.iso_639_1)) {
                await supabase
                  .from("title_spoken_languages")
                  .upsert(
                    { title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 },
                    { onConflict: "title_id,iso_639_1" },
                  );
              }
            }
          }

          if (details?.keywords?.keywords) {
            for (const kw of details.keywords.keywords.slice(0, 10)) {
              const { data: kwData } = await supabase
                .from("keywords")
                .upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: "tmdb_keyword_id" })
                .select("id")
                .single();
              if (kwData) {
                await supabase
                  .from("title_keywords")
                  .upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: "title_id,keyword_id" });
              }
            }
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error(`Error processing movie ${movie.title} (${phase}):`, error);
        return false;
      }
    }

    const processedMovieIds = new Set<number>();

    // CRITICAL: Determine if we should skip vote_average filter for recent content
    // New releases (within current year) may not have enough votes yet
    const currentYear = new Date().getFullYear();
    const isCurrentYear = year === currentYear;

    // Build vote_average filter - SKIP for current year to capture new releases
    const voteAverageFilter = isCurrentYear ? "" : `&vote_average.gte=${minRating}`;
    console.log(
      `Year ${year}: ${isCurrentYear ? "SKIPPING vote_average filter (current year - new releases)" : `Using vote_average.gte=${minRating}`}`,
    );

    // MOVIE PHASE 1: Year-based discovery
    // Using primary_release_year for EXACT year match
    let moviePage = 1;
    let movieTotalPages = 1;

    while (moviePage <= movieTotalPages && moviePage <= 20) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_RUNTIME_MS) {
        console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
        await supabase.from("system_logs").insert({
          severity: "warning",
          operation: "full-refresh-titles-timeout",
          error_message: `Thread approaching time limit at ${elapsed}ms for ${languageCode}/${year}/${genreName}`,
          context: {
            languageCode,
            year,
            genre: genreName,
            genreId: tmdbGenreId,
            totalProcessed,
            elapsedMs: elapsed,
            phase: "movies-year",
            page: moviePage,
          },
        });
        break;
      }

      // CRITICAL: with_genres expects a single genre ID
      // Movies that CONTAIN this genre will be returned (OR logic with multiple, AND if comma-separated)
      // We use single genre, so any movie with this genre is returned
      // NOTE: vote_average filter is SKIPPED for current year to capture new releases
      const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=${year}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}${voteAverageFilter}&sort_by=popularity.desc&page=${moviePage}`;

      console.log(
        `[Movie Phase 1] Fetching: year=${year}, genre=${tmdbGenreId}, lang=${languageCode}, page=${moviePage}${isCurrentYear ? " (no vote filter)" : ""}`,
      );

      try {
        const moviesResponse = await fetch(moviesUrl);
        const moviesData = await moviesResponse.json();
        const movies = moviesData.results || [];
        movieTotalPages = Math.min(moviesData.total_pages || 1, 20);
        console.log(`[Year-based] Found ${movies.length} movies (page ${moviePage}/${movieTotalPages})`);

        for (const movie of movies) {
          processedMovieIds.add(movie.id);
          await processMovie(movie, "year-based");
        }

        moviePage++;
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (err) {
        console.error("Error fetching movies page (year-based):", err);
        break;
      }
    }

    // MOVIE PHASE 2: Popularity-based discovery (captures classics regardless of year)
    const elapsedAfterMoviePhase1 = Date.now() - startTime;
    if (elapsedAfterMoviePhase1 < MAX_RUNTIME_MS - 30000) {
      console.log(`Starting Movie Phase 2: Popularity-based discovery for ${languageCode}/${genreName}`);

      let popularMoviePage = 1;
      let popularMovieTotalPages = 1;
      const MAX_POPULAR_MOVIE_PAGES = 15; // Increased to capture more classics

      while (popularMoviePage <= popularMovieTotalPages && popularMoviePage <= MAX_POPULAR_MOVIE_PAGES) {
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_RUNTIME_MS) {
          console.log(`Approaching time limit at ${elapsed}ms during Movie Phase 2. Stopping gracefully.`);
          break;
        }

        // NO year filter - get ALL popular movies for this language/genre
        const popularMovieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${tmdbGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${popularMoviePage}`;

        try {
          const popularResponse = await fetch(popularMovieUrl);
          const popularData = await popularResponse.json();
          const movies = popularData.results || [];
          popularMovieTotalPages = Math.min(popularData.total_pages || 1, MAX_POPULAR_MOVIE_PAGES);
          console.log(
            `[Popularity-based] Found ${movies.length} movies (page ${popularMoviePage}/${popularMovieTotalPages})`,
          );

          for (const movie of movies) {
            if (processedMovieIds.has(movie.id)) {
              continue;
            }
            processedMovieIds.add(movie.id);
            await processMovie(movie, "popularity-based");
          }

          popularMoviePage++;
          await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (err) {
          console.error("Error fetching movies page (popularity-based):", err);
          break;
        }
      }
    } else {
      console.log(`Skipping Movie Phase 2 due to time constraints (${elapsedAfterMoviePhase1}ms elapsed)`);
    }

    // ==========================================
    // TV SHOWS PROCESSING
    // ==========================================

    // CRITICAL: Check if this genre has a TV equivalent
    // Movie-only genres (Horror, History, Music, Romance, Thriller, TV Movie) have NO TV equivalent
    const tvGenreId = MOVIE_TO_TV_GENRE_MAP[tmdbGenreId];

    if (tvGenreId === null) {
      console.log(
        `⚠️ Genre "${genreName}" (${tmdbGenreId}) is movie-only - NO TV equivalent exists. Skipping TV discovery.`,
      );
      // Skip TV discovery entirely for movie-only genres
    } else {
      // TV genre exists - proceed with TV discovery
      if (tvGenreId !== tmdbGenreId) {
        console.log(`Mapping movie genre "${genreName}" (${tmdbGenreId}) → TV genre ID ${tvGenreId}`);
      } else {
        console.log(`Using same genre ID ${tmdbGenreId} for TV (${genreName})`);
      }

      // Helper function to process a TV show
      async function processTvShow(show: any, phase: string) {
        try {
          const { providers } = await fetchWatchProviders(show.id, "tv");

          if (providers.length === 0) {
            skippedNoProvider++;
            return false;
          }

          const details = await fetchTvDetails(show.id);

          const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
          const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
          const latestSeasonNumber =
            seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
          const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
          const seasonName = latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
          const { url: trailerUrl, isTmdbTrailer: isTmdbTrailerTv } = await fetchTrailer(
            show.id,
            "tv",
            show.name,
            releaseYear,
            show.original_language || languageCode,
            latestSeasonNumber,
            seasonName,
          );

          // Build genres JSON array from TMDB genre IDs
          const showGenreIds = show.genre_ids || [];
          const genresJson = showGenreIds.map((gId: number) => TMDB_GENRE_MAP[gId]).filter(Boolean);

          const { data: upsertedTitle, error: titleError } = await supabase
            .from("titles")
            .upsert(
              {
                tmdb_id: show.id,
                title_type: "tv",
                name: show.name || details?.name,
                original_name: show.original_name || details?.original_name,
                overview: show.overview || details?.overview,
                release_date: null,
                first_air_date: show.first_air_date || details?.first_air_date || null,
                last_air_date: details?.last_air_date || null,
                status: details?.status || null,
                runtime: null,
                episode_run_time: details?.episode_run_time || null,
                popularity: show.popularity ?? details?.popularity,
                vote_average: show.vote_average ?? details?.vote_average,
                poster_path: show.poster_path || details?.poster_path,
                backdrop_path: show.backdrop_path || details?.backdrop_path,
                original_language: show.original_language || details?.original_language,
                is_adult: show.adult || false,
                imdb_id: details?.external_ids?.imdb_id || null,
                tagline: details?.tagline || null,
                trailer_url: trailerUrl,
                is_tmdb_trailer: isTmdbTrailerTv,
                title_genres: genresJson,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "tmdb_id,title_type" },
            )
            .select("id")
            .single();

          if (titleError) {
            console.error(`Error upserting show ${show.name} (${phase}):`, titleError);
            return false;
          }

          if (upsertedTitle) {
            totalProcessed++;
            seriesProcessed++;

            for (const provider of providers) {
              await supabase.from("title_streaming_availability").upsert(
                {
                  title_id: upsertedTitle.id,
                  streaming_service_id: provider.serviceId,
                  region_code: "US",
                },
                { onConflict: "title_id,streaming_service_id,region_code" },
              );
            }

            if (details?.spoken_languages) {
              for (const lang of details.spoken_languages) {
                if (validLanguageCodes.has(lang.iso_639_1)) {
                  await supabase
                    .from("title_spoken_languages")
                    .upsert(
                      { title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 },
                      { onConflict: "title_id,iso_639_1" },
                    );
                }
              }
            }

            // Store seasons with trailers
            if (details?.seasons) {
              for (const season of details.seasons) {
                let seasonTrailerUrl: string | null = null;
                let seasonIsTmdbTrailer = true;

                if (season.season_number > 0) {
                  try {
                    const seasonVideosRes = await fetch(
                      `https://api.themoviedb.org/3/tv/${show.id}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY}`,
                    );
                    if (seasonVideosRes.ok) {
                      const seasonVideosData = await seasonVideosRes.json();
                      const seasonTrailer = seasonVideosData.results?.find(
                        (v: any) => v.type === "Trailer" && v.site === "YouTube",
                      );
                      if (seasonTrailer) {
                        seasonTrailerUrl = `https://www.youtube.com/watch?v=${seasonTrailer.key}`;
                        seasonIsTmdbTrailer = true;
                      }
                    }

                    if (!seasonTrailerUrl && YOUTUBE_API_KEY) {
                      const seasonSearchName = season.name || `Season ${season.season_number}`;
                      const searchQuery = `${show.name} ${seasonSearchName} official trailer`;
                      const relevantChannels = (officialChannels || [])
                        .filter(
                          (c) =>
                            c.language_code === (show.original_language || languageCode) ||
                            c.language_code === "global" ||
                            c.language_code === "en",
                        )
                        .map((c) => c.channel_name.toLowerCase());

                      const ytRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`,
                      );
                      if (ytRes.ok) {
                        const ytData = await ytRes.json();
                        const officialChannelTrailer = ytData.items?.find((item: any) => {
                          const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
                          return relevantChannels.some((officialName) =>
                            channelTitle.includes(officialName.toLowerCase()),
                          );
                        });
                        if (officialChannelTrailer) {
                          seasonTrailerUrl = `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`;
                          seasonIsTmdbTrailer = false;
                        } else {
                          const verifiedTrailer = ytData.items?.find((item: any) => {
                            const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
                            const videoTitle = item.snippet.title?.toLowerCase() || "";
                            const hasOfficialInTitle = videoTitle.includes("official trailer");
                            const isOfficialChannel =
                              channelTitle.includes("pictures") ||
                              channelTitle.includes("studios") ||
                              channelTitle.includes("entertainment") ||
                              channelTitle.includes("netflix") ||
                              channelTitle.includes("disney");
                            return hasOfficialInTitle && isOfficialChannel;
                          });
                          if (verifiedTrailer) {
                            seasonTrailerUrl = `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`;
                            seasonIsTmdbTrailer = false;
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error(`Error fetching season ${season.season_number} trailer:`, e);
                  }
                }

                await supabase.from("seasons").upsert(
                  {
                    title_id: upsertedTitle.id,
                    season_number: season.season_number,
                    episode_count: season.episode_count,
                    air_date: season.air_date || null,
                    name: season.name,
                    overview: season.overview,
                    poster_path: season.poster_path,
                    trailer_url: seasonTrailerUrl,
                    is_tmdb_trailer: seasonIsTmdbTrailer,
                  },
                  { onConflict: "title_id,season_number" },
                );
              }
            }

            if (details?.keywords?.results) {
              for (const kw of details.keywords.results.slice(0, 10)) {
                const { data: kwData } = await supabase
                  .from("keywords")
                  .upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: "tmdb_keyword_id" })
                  .select("id")
                  .single();
                if (kwData) {
                  await supabase
                    .from("title_keywords")
                    .upsert(
                      { title_id: upsertedTitle.id, keyword_id: kwData.id },
                      { onConflict: "title_id,keyword_id" },
                    );
                }
              }
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error(`Error processing show ${show.name} (${phase}):`, error);
          return false;
        }
      }

      const processedTvIds = new Set<number>();

      // TV PHASE 1: Year-based discovery
      // IMPORTANT: air_date filter in discover/tv refers to FIRST air date, not season air dates
      // This means shows that premiered in this year will be found
      let tvPage = 1;
      let tvTotalPages = 1;

      while (tvPage <= tvTotalPages && tvPage <= 20) {
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_RUNTIME_MS) {
          console.log(`Approaching time limit at ${elapsed}ms. Stopping gracefully.`);
          await supabase.from("system_logs").insert({
            severity: "warning",
            operation: "full-refresh-titles-timeout",
            error_message: `Thread approaching time limit at ${elapsed}ms for ${languageCode}/${year}/${genreName}`,
            context: {
              languageCode,
              year,
              genre: genreName,
              genreId: tmdbGenreId,
              tvGenreId,
              totalProcessed,
              elapsedMs: elapsed,
              phase: "tv-year",
              page: tvPage,
            },
          });
          break;
        }

        // Use CORRECT TV genre ID for TV show discovery
        // NOTE: vote_average filter is SKIPPED for current year to capture new releases
        const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${year}-01-01&air_date.lte=${year}-12-31&with_genres=${tvGenreId}&with_original_language=${languageCode}${voteAverageFilter}&sort_by=popularity.desc&page=${tvPage}`;

        console.log(
          `[TV Phase 1] Fetching: year=${year}, tvGenreId=${tvGenreId}, lang=${languageCode}, page=${tvPage}${isCurrentYear ? " (no vote filter)" : ""}`,
        );

        try {
          const tvResponse = await fetch(tvUrl);
          const tvData = await tvResponse.json();
          const shows = tvData.results || [];
          tvTotalPages = Math.min(tvData.total_pages || 1, 20);
          console.log(`[Year-based] Found ${shows.length} TV shows (page ${tvPage}/${tvTotalPages})`);

          for (const show of shows) {
            processedTvIds.add(show.id);
            await processTvShow(show, "year-based");
          }

          tvPage++;
          await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (err) {
          console.error("Error fetching TV shows page (year-based):", err);
          break;
        }
      }

      // TV PHASE 2: Popularity-based discovery (captures classic/popular shows regardless of year)
      // This is CRITICAL for catching shows like "Breaking Bad", "Friends", "The Office"
      // that premiered years ago but are still highly popular
      const elapsedAfterTvPhase1 = Date.now() - startTime;
      if (elapsedAfterTvPhase1 < MAX_RUNTIME_MS - 30000) {
        console.log(`Starting TV Phase 2: Popularity-based discovery for ${languageCode}/${genreName}`);

        let popularPage = 1;
        let popularTotalPages = 1;
        const MAX_POPULAR_PAGES = 15; // Increased to capture more classics

        while (popularPage <= popularTotalPages && popularPage <= MAX_POPULAR_PAGES) {
          const elapsed = Date.now() - startTime;
          if (elapsed > MAX_RUNTIME_MS) {
            console.log(`Approaching time limit at ${elapsed}ms during TV Phase 2. Stopping gracefully.`);
            break;
          }

          // NO year filter - get ALL popular shows for this language/genre
          const popularUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${tvGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${popularPage}`;

          try {
            const popularResponse = await fetch(popularUrl);
            const popularData = await popularResponse.json();
            const shows = popularData.results || [];
            popularTotalPages = Math.min(popularData.total_pages || 1, MAX_POPULAR_PAGES);
            console.log(`[Popularity-based] Found ${shows.length} TV shows (page ${popularPage}/${popularTotalPages})`);

            for (const show of shows) {
              if (processedTvIds.has(show.id)) {
                continue;
              }
              processedTvIds.add(show.id);
              await processTvShow(show, "popularity-based");
            }

            popularPage++;
            await new Promise((resolve) => setTimeout(resolve, 250));
          } catch (err) {
            console.error("Error fetching TV shows page (popularity-based):", err);
            break;
          }
        }
      } else {
        console.log(`Skipping TV Phase 2 due to time constraints (${elapsedAfterTvPhase1}ms elapsed)`);
      }
    }

    // ==========================================
    // TV PHASE 3: TV-ONLY GENRES (Kids, Reality, News, Soap, Talk)
    // These genres have NO movie equivalent and must be searched separately
    // ==========================================
    const tvOnlyGenresToSearch = TV_ONLY_GENRES_TO_SEARCH[tmdbGenreId] || [];

    if (tvOnlyGenresToSearch.length > 0) {
      const elapsedBeforeTvOnly = Date.now() - startTime;
      if (elapsedBeforeTvOnly < MAX_RUNTIME_MS - 20000) {
        console.log(
          `Starting TV Phase 3: TV-only genres ${tvOnlyGenresToSearch.map((g) => TV_ONLY_GENRE_NAMES[g] || g).join(", ")} for ${languageCode}`,
        );

        // Reuse processedTvIds from earlier phases if available
        const processedTvIdsForTvOnly = new Set<number>();

        for (const tvOnlyGenreId of tvOnlyGenresToSearch) {
          const tvOnlyGenreName = TV_ONLY_GENRE_NAMES[tvOnlyGenreId] || `Unknown(${tvOnlyGenreId})`;
          console.log(`Searching TV-only genre: ${tvOnlyGenreName} (${tvOnlyGenreId})`);

          // Phase 3a: Year-based discovery for TV-only genre
          let tvOnlyPage = 1;
          let tvOnlyTotalPages = 1;

          while (tvOnlyPage <= tvOnlyTotalPages && tvOnlyPage <= 10) {
            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_RUNTIME_MS) {
              console.log(`Time limit reached during TV-only genre discovery. Stopping.`);
              break;
            }

            // NOTE: vote_average filter is SKIPPED for current year to capture new releases
            const tvOnlyUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${year}-01-01&air_date.lte=${year}-12-31&with_genres=${tvOnlyGenreId}&with_original_language=${languageCode}${voteAverageFilter}&sort_by=popularity.desc&page=${tvOnlyPage}`;

            try {
              const tvOnlyResponse = await fetch(tvOnlyUrl);
              const tvOnlyData = await tvOnlyResponse.json();
              const shows = tvOnlyData.results || [];
              tvOnlyTotalPages = Math.min(tvOnlyData.total_pages || 1, 10);
              console.log(
                `[TV-only ${tvOnlyGenreName}] Found ${shows.length} shows (page ${tvOnlyPage}/${tvOnlyTotalPages})`,
              );

              for (const show of shows) {
                if (processedTvIdsForTvOnly.has(show.id)) continue;
                processedTvIdsForTvOnly.add(show.id);

                // Process TV show using existing helper function
                const { providers } = await fetchWatchProviders(show.id, "tv");
                if (providers.length === 0) {
                  skippedNoProvider++;
                  continue;
                }

                const details = await fetchTvDetails(show.id);
                const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
                const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
                const latestSeasonNumber =
                  seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
                const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
                const seasonName =
                  latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
                const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(
                  show.id,
                  "tv",
                  show.name,
                  releaseYear,
                  show.original_language || languageCode,
                  latestSeasonNumber,
                  seasonName,
                );

                // Build genres JSON array
                const showGenreIds = show.genre_ids || [];
                const genresJson = showGenreIds.map((gId: number) => TMDB_GENRE_MAP[gId]).filter(Boolean);

                const { data: upsertedTitle, error: titleError } = await supabase
                  .from("titles")
                  .upsert(
                    {
                      tmdb_id: show.id,
                      title_type: "tv",
                      name: show.name,
                      original_name: show.original_name,
                      overview: show.overview,
                      release_date: null,
                      first_air_date: show.first_air_date || null,
                      last_air_date: details?.last_air_date || null,
                      status: details?.status || null,
                      runtime: null,
                      episode_run_time: details?.episode_run_time || null,
                      popularity: show.popularity,
                      vote_average: show.vote_average,
                      poster_path: show.poster_path,
                      backdrop_path: show.backdrop_path,
                      original_language: show.original_language,
                      is_adult: show.adult || false,
                      imdb_id: details?.external_ids?.imdb_id || null,
                      tagline: details?.tagline || null,
                      trailer_url: trailerUrl,
                      is_tmdb_trailer: isTmdbTrailer,
                      title_genres: genresJson,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "tmdb_id,title_type" },
                  )
                  .select("id")
                  .single();

                if (titleError) {
                  console.error(`Error upserting TV-only show ${show.name}:`, titleError);
                  continue;
                }

                if (upsertedTitle) {
                  totalProcessed++;
                  seriesProcessed++;

                  for (const provider of providers) {
                    await supabase.from("title_streaming_availability").upsert(
                      {
                        title_id: upsertedTitle.id,
                        streaming_service_id: provider.serviceId,
                        region_code: "US",
                      },
                      { onConflict: "title_id,streaming_service_id,region_code" },
                    );
                  }

                  // Map languages
                  if (details?.spoken_languages) {
                    for (const lang of details.spoken_languages) {
                      if (validLanguageCodes.has(lang.iso_639_1)) {
                        await supabase
                          .from("title_spoken_languages")
                          .upsert(
                            { title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 },
                            { onConflict: "title_id,iso_639_1" },
                          );
                      }
                    }
                  }

                  // Store seasons
                  if (details?.seasons) {
                    for (const season of details.seasons) {
                      await supabase.from("seasons").upsert(
                        {
                          title_id: upsertedTitle.id,
                          season_number: season.season_number,
                          episode_count: season.episode_count,
                          air_date: season.air_date || null,
                          name: season.name,
                          overview: season.overview,
                          poster_path: season.poster_path,
                          trailer_url: null,
                          is_tmdb_trailer: true,
                        },
                        { onConflict: "title_id,season_number" },
                      );
                    }
                  }
                }
              }

              tvOnlyPage++;
              await new Promise((resolve) => setTimeout(resolve, 250));
            } catch (err) {
              console.error(`Error fetching TV-only genre ${tvOnlyGenreName}:`, err);
              break;
            }
          }

          // Phase 3b: Popularity-based for TV-only genre (to catch classics)
          const elapsedAfterTvOnlyYears = Date.now() - startTime;
          if (elapsedAfterTvOnlyYears < MAX_RUNTIME_MS - 10000) {
            let tvOnlyPopPage = 1;
            const MAX_TV_ONLY_POP_PAGES = 5;

            while (tvOnlyPopPage <= MAX_TV_ONLY_POP_PAGES) {
              const elapsed = Date.now() - startTime;
              if (elapsed > MAX_RUNTIME_MS) break;

              const tvOnlyPopUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${tvOnlyGenreId}&with_original_language=${languageCode}&vote_average.gte=${minRating}&sort_by=popularity.desc&page=${tvOnlyPopPage}`;

              try {
                const popResponse = await fetch(tvOnlyPopUrl);
                const popData = await popResponse.json();
                const shows = popData.results || [];

                for (const show of shows) {
                  if (processedTvIdsForTvOnly.has(show.id)) continue;
                  processedTvIdsForTvOnly.add(show.id);

                  const { providers } = await fetchWatchProviders(show.id, "tv");
                  if (providers.length === 0) {
                    skippedNoProvider++;
                    continue;
                  }

                  const details = await fetchTvDetails(show.id);
                  const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
                  const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
                  const latestSeasonNumber =
                    seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
                  const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
                  const seasonName =
                    latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
                  const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(
                    show.id,
                    "tv",
                    show.name,
                    releaseYear,
                    show.original_language || languageCode,
                    latestSeasonNumber,
                    seasonName,
                  );

                  // Build genres JSON array
                  const showGenreIds = show.genre_ids || [];
                  const genresJson = showGenreIds.map((gId: number) => TMDB_GENRE_MAP[gId]).filter(Boolean);

                  const { data: upsertedTitle, error: titleError } = await supabase
                    .from("titles")
                    .upsert(
                      {
                        tmdb_id: show.id,
                        title_type: "tv",
                        name: show.name,
                        original_name: show.original_name,
                        overview: show.overview,
                        release_date: null,
                        first_air_date: show.first_air_date || null,
                        last_air_date: details?.last_air_date || null,
                        status: details?.status || null,
                        runtime: null,
                        episode_run_time: details?.episode_run_time || null,
                        popularity: show.popularity,
                        vote_average: show.vote_average,
                        poster_path: show.poster_path,
                        backdrop_path: show.backdrop_path,
                        original_language: show.original_language,
                        is_adult: show.adult || false,
                        imdb_id: details?.external_ids?.imdb_id || null,
                        tagline: details?.tagline || null,
                        trailer_url: trailerUrl,
                        is_tmdb_trailer: isTmdbTrailer,
                        title_genres: genresJson,
                        updated_at: new Date().toISOString(),
                      },
                      { onConflict: "tmdb_id,title_type" },
                    )
                    .select("id")
                    .single();

                  if (!titleError && upsertedTitle) {
                    totalProcessed++;
                    seriesProcessed++;

                    for (const provider of providers) {
                      await supabase.from("title_streaming_availability").upsert(
                        {
                          title_id: upsertedTitle.id,
                          streaming_service_id: provider.serviceId,
                          region_code: "US",
                        },
                        { onConflict: "title_id,streaming_service_id,region_code" },
                      );
                    }

                    if (details?.spoken_languages) {
                      for (const lang of details.spoken_languages) {
                        if (validLanguageCodes.has(lang.iso_639_1)) {
                          await supabase
                            .from("title_spoken_languages")
                            .upsert(
                              { title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 },
                              { onConflict: "title_id,iso_639_1" },
                            );
                        }
                      }
                    }

                    if (details?.seasons) {
                      for (const season of details.seasons) {
                        await supabase.from("seasons").upsert(
                          {
                            title_id: upsertedTitle.id,
                            season_number: season.season_number,
                            episode_count: season.episode_count,
                            air_date: season.air_date || null,
                            name: season.name,
                            overview: season.overview,
                            poster_path: season.poster_path,
                            trailer_url: null,
                            is_tmdb_trailer: true,
                          },
                          { onConflict: "title_id,season_number" },
                        );
                      }
                    }
                  }
                }

                tvOnlyPopPage++;
                await new Promise((resolve) => setTimeout(resolve, 250));
              } catch (err) {
                console.error(`Error in TV-only popularity phase for ${tvOnlyGenreName}:`, err);
                break;
              }
            }
          }
        }
        console.log(`Completed TV Phase 3: TV-only genres for ${languageCode}`);
      } else {
        console.log(`Skipping TV Phase 3 due to time constraints`);
      }
    }

    // Update job stats
    try {
      await supabase.rpc("increment_job_titles", {
        p_job_type: "full_refresh",
        p_increment: totalProcessed,
      });
    } catch (err) {
      console.error("Error incrementing job titles:", err);
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    console.log(
      `Completed: ${languageCode}/${year}/${genreName}. Processed: ${totalProcessed}, Skipped (no provider): ${skippedNoProvider}, Duration: ${durationMs}ms`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        language: languageCode,
        year,
        genre: genreName,
        genreId: tmdbGenreId,
        titlesProcessed: totalProcessed,
        moviesProcessed,
        seriesProcessed,
        skippedNoProvider,
        durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Full refresh error:", error);

    // Log error to system_logs
    await supabase.from("system_logs").insert({
      severity: "error",
      operation: "full-refresh-titles-error",
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_stack: error instanceof Error ? error.stack : null,
      context: { requestBody: requestBody || {} },
    });

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// FUNCTION 12: full-refresh-orchestrator
// Location: supabase/functions/full-refresh-orchestrator/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TMDB Genre ID to Name mapping for readable logging
const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { jobId, chunks, startIndex = 0 } = await req.json();

    if (!jobId || !chunks || !Array.isArray(chunks)) {
      throw new Error("Missing required parameters: jobId, chunks");
    }

    // Fetch job configuration to get completed work units
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("configuration, status")
      .eq("id", jobId)
      .single();

    if (jobError) throw jobError;

    // Check if job was stopped before we start
    if (jobData.status === "failed" || jobData.status === "idle") {
      console.log(`Job ${jobId} is not running (status: ${jobData.status}). Aborting orchestrator.`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Job is not running (status: ${jobData.status})`,
          jobId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const config = jobData.configuration || {};
    const completedUnits = config.completed_work_units || [];
    const failedUnits = config.failed_work_units || [];

    // Filter out already-completed chunks
    const remainingChunks = chunks.filter((chunk: any) => {
      const isCompleted = completedUnits.some(
        (unit: any) =>
          unit.languageCode === chunk.languageCode && unit.year === chunk.year && unit.genreId === chunk.genreId,
      );
      return !isCompleted;
    });

    console.log(
      `Orchestrator started: ${remainingChunks.length} remaining threads (${completedUnits.length} already completed) for job ${jobId}`,
    );

    // Dispatch threads in batches with proper concurrency control
    const dispatchAllThreads = async () => {
      const BATCH_SIZE = 5; // Process 5 threads concurrently per batch
      const BATCH_DELAY_MS = 5000; // 5 second delay between batches
      const MAX_ORCHESTRATOR_RUNTIME_MS = 300000; // 5 minutes safety margin before timeout
      const orchestratorStartTime = Date.now();
      const totalThreads = remainingChunks.length;
      const totalBatches = Math.ceil(totalThreads / BATCH_SIZE);

      console.log(`Starting batch dispatch: ${totalThreads} threads in ${totalBatches} batches of ${BATCH_SIZE}`);

      let wasStoppedByAdmin = false;

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, remainingChunks.length);
        const batchNumber = batchIndex + 1;

        // Check if approaching orchestrator timeout BEFORE starting this batch
        const orchestratorElapsed = Date.now() - orchestratorStartTime;
        if (orchestratorElapsed > MAX_ORCHESTRATOR_RUNTIME_MS) {
          console.log(
            `Orchestrator approaching timeout at ${orchestratorElapsed}ms. Stopping at batch ${batchNumber}.`,
          );

          // Log timeout to system_logs
          await supabase.from("system_logs").insert({
            severity: "warning",
            operation: "full-refresh-orchestrator-timeout",
            error_message: `Orchestrator approaching timeout at ${orchestratorElapsed}ms after processing ${batchStart} threads`,
            context: {
              jobId,
              batchNumber,
              totalBatches,
              threadsProcessed: batchStart,
              totalThreads: remainingChunks.length,
              elapsedMs: orchestratorElapsed,
              completedCount: completedUnits.length,
              totalWorkUnits: chunks.length,
            },
          });

          // Relaunch orchestrator with ALL original chunks (filtering happens on next invocation)
          console.log(`Relaunching orchestrator to continue processing...`);
          await supabase.functions.invoke("full-refresh-orchestrator", {
            body: { jobId, chunks, startIndex: 0 },
          });

          return; // Exit current orchestrator
        }

        console.log(`Starting batch ${batchNumber}/${totalBatches}: threads ${batchStart + 1} to ${batchEnd}`);

        // Check if job was stopped before starting batch
        const { data: jobStatus, error: statusError } = await supabase
          .from("jobs")
          .select("status, error_message, updated_at")
          .eq("id", jobId)
          .single();

        console.log(`Status check before batch ${batchNumber}:`, {
          status: jobStatus?.status,
          error_message: jobStatus?.error_message,
          updated_at: jobStatus?.updated_at,
          statusError,
        });

        if (jobStatus?.status === "failed" || jobStatus?.status === "idle") {
          console.error(
            `Job ${jobId} status changed to '${jobStatus.status}'. Error: ${jobStatus.error_message}. Halting orchestration at batch ${batchNumber}.`,
          );
          wasStoppedByAdmin = true;

          // Log job stoppage to system_logs
          await supabase.from("system_logs").insert({
            severity: "error",
            operation: "full-refresh-orchestrator-stopped",
            error_message: `Job manually stopped or failed. Status: ${jobStatus.status}. ${jobStatus.error_message || ""}`,
            context: {
              jobId,
              status: jobStatus.status,
              batchNumber,
              totalBatches,
              threadsProcessed: batchStart,
              totalThreads: chunks.length,
              errorMessage: jobStatus.error_message,
            },
          });

          break;
        }

        // Dispatch all threads in current batch and collect results
        const batchPromises = [];
        const batchChunks: any[] = [];

        // Track currently processing units
        const currentlyProcessing: any[] = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const chunk = remainingChunks[i];
          currentlyProcessing.push({
            languageCode: chunk.languageCode,
            year: chunk.year,
            genreId: chunk.genreId,
            genreName: GENRE_MAP[chunk.genreId] || "Unknown",
          });
        }

        // Update job config with currently processing
        const { data: processingConfigData } = await supabase
          .from("jobs")
          .select("configuration")
          .eq("id", jobId)
          .single();

        await supabase
          .from("jobs")
          .update({
            configuration: {
              ...(processingConfigData?.configuration || {}),
              currently_processing: currentlyProcessing,
            },
          })
          .eq("id", jobId);

        for (let i = batchStart; i < batchEnd; i++) {
          const chunk = remainingChunks[i];
          batchChunks.push(chunk);

          const promise = supabase.functions
            .invoke("full-refresh-titles", {
              body: {
                languageCode: chunk.languageCode,
                startYear: chunk.year,
                endYear: chunk.year,
                genreId: chunk.genreId,
                jobId: jobId,
              },
            })
            .then((result) => {
              return { success: !result.error, chunk, result };
            })
            .catch((error) => {
              console.error(
                `Error dispatching thread for ${chunk.languageCode}/${chunk.year}/${chunk.genreId}:`,
                error,
              );
              return { success: false, chunk, error };
            });

          batchPromises.push(promise);
        }

        // Wait for all threads in this batch to complete
        const batchResults = await Promise.all(batchPromises);

        // Process results and update job configuration
        const newCompletedUnits: any[] = [];
        const newFailedUnits: any[] = [];

        for (const result of batchResults) {
          const genreName = GENRE_MAP[result.chunk.genreId] || "Unknown";

          if (result.success && "result" in result) {
            // Extract movie/series counts from response data
            const responseData = (result as any).result?.data || {};
            newCompletedUnits.push({
              languageCode: result.chunk.languageCode,
              year: result.chunk.year,
              genreId: result.chunk.genreId,
              genreName,
              completedAt: new Date().toISOString(),
              titlesProcessed: responseData.titlesProcessed || 0,
              moviesProcessed: responseData.moviesProcessed || 0,
              seriesProcessed: responseData.seriesProcessed || 0,
            });
          } else {
            const errorMsg = "error" in result ? result.error?.message || "Unknown error" : "Unknown error";
            newFailedUnits.push({
              languageCode: result.chunk.languageCode,
              year: result.chunk.year,
              genreId: result.chunk.genreId,
              genreName,
              error: errorMsg,
              attempts: 1,
              failedAt: new Date().toISOString(),
            });
          }
        }

        // Update job configuration with new completed/failed units
        const { data: currentJobData } = await supabase.from("jobs").select("configuration").eq("id", jobId).single();

        const currentConfig = currentJobData?.configuration || {};
        const updatedCompletedUnits = [...(currentConfig.completed_work_units || []), ...newCompletedUnits];
        const updatedFailedUnits = [...(currentConfig.failed_work_units || []), ...newFailedUnits];

        await supabase
          .from("jobs")
          .update({
            configuration: {
              ...currentConfig,
              completed_work_units: updatedCompletedUnits,
              failed_work_units: updatedFailedUnits,
              currently_processing: [], // Clear after batch completes
              thread_tracking: {
                succeeded: updatedCompletedUnits.length,
                failed: updatedFailedUnits.length,
              },
            },
          })
          .eq("id", jobId);

        console.log(
          `Batch ${batchNumber}/${totalBatches} completed. Success: ${newCompletedUnits.length}, Failed: ${newFailedUnits.length}`,
        );

        // Add delay between batches to prevent overwhelming Supabase
        if (batchIndex < totalBatches - 1) {
          console.log(`Waiting ${BATCH_DELAY_MS}ms before starting next batch...`);
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      // If job was stopped, don't proceed to retry phase
      if (wasStoppedByAdmin) {
        console.log(`Job was stopped by admin. Skipping retry phase.`);
        return;
      }

      // RETRY FAILED THREADS
      // After all new threads complete, automatically retry any previously failed threads
      const { data: retryJobData } = await supabase
        .from("jobs")
        .select("configuration, status")
        .eq("id", jobId)
        .single();

      // Check again if job was stopped
      if (retryJobData?.status === "failed" || retryJobData?.status === "idle") {
        console.log(`Job stopped before retry phase. Aborting.`);
        return;
      }

      const retryConfig = retryJobData?.configuration || {};
      const failedUnitsToRetry = retryConfig.failed_work_units || [];

      if (failedUnitsToRetry.length > 0) {
        console.log(`Found ${failedUnitsToRetry.length} failed threads to retry`);

        const retryBatchSize = 5;
        const totalRetryBatches = Math.ceil(failedUnitsToRetry.length / retryBatchSize);

        for (let retryBatchIndex = 0; retryBatchIndex < totalRetryBatches; retryBatchIndex++) {
          const retryBatchStart = retryBatchIndex * retryBatchSize;
          const retryBatchEnd = Math.min(retryBatchStart + retryBatchSize, failedUnitsToRetry.length);
          const retryBatchNum = retryBatchIndex + 1;

          console.log(
            `Starting retry batch ${retryBatchNum}/${totalRetryBatches}: retrying ${retryBatchStart + 1} to ${retryBatchEnd}`,
          );

          const retryPromises = [];
          const retryChunks: any[] = [];

          for (let i = retryBatchStart; i < retryBatchEnd; i++) {
            const failedUnit = failedUnitsToRetry[i];
            retryChunks.push(failedUnit);

            const promise = supabase.functions
              .invoke("full-refresh-titles", {
                body: {
                  languageCode: failedUnit.languageCode,
                  startYear: failedUnit.year,
                  endYear: failedUnit.year,
                  genreId: failedUnit.genreId,
                  jobId: jobId,
                },
              })
              .then((result) => {
                return { success: !result.error, unit: failedUnit, result };
              })
              .catch((error) => {
                return { success: false, unit: failedUnit, error };
              });

            retryPromises.push(promise);
          }

          const retryResults = await Promise.all(retryPromises);

          // Update job configuration: move successful retries to completed, update remaining failures
          const { data: retryUpdateData } = await supabase
            .from("jobs")
            .select("configuration")
            .eq("id", jobId)
            .single();

          const updateConfig = retryUpdateData?.configuration || {};
          let currentCompletedUnits = updateConfig.completed_work_units || [];
          let currentFailedUnits = updateConfig.failed_work_units || [];

          for (const result of retryResults) {
            const genreName = GENRE_MAP[result.unit.genreId] || "Unknown";

            if (result.success) {
              console.log(`Retry succeeded: ${result.unit.languageCode}/${result.unit.year}/${genreName}`);

              // Add to completed
              currentCompletedUnits.push({
                languageCode: result.unit.languageCode,
                year: result.unit.year,
                genreId: result.unit.genreId,
                genreName,
                completedAt: new Date().toISOString(),
                wasRetry: true,
              });

              // Remove from failed
              currentFailedUnits = currentFailedUnits.filter(
                (u: any) =>
                  !(
                    u.languageCode === result.unit.languageCode &&
                    u.year === result.unit.year &&
                    u.genreId === result.unit.genreId
                  ),
              );
            } else {
              console.error(`Retry failed: ${result.unit.languageCode}/${result.unit.year}/${genreName}`);

              // Update attempts count
              currentFailedUnits = currentFailedUnits.map((u: any) => {
                if (
                  u.languageCode === result.unit.languageCode &&
                  u.year === result.unit.year &&
                  u.genreId === result.unit.genreId
                ) {
                  return { ...u, attempts: (u.attempts || 0) + 1, lastAttempt: new Date().toISOString() };
                }
                return u;
              });
            }
          }

          await supabase
            .from("jobs")
            .update({
              configuration: {
                ...updateConfig,
                completed_work_units: currentCompletedUnits,
                failed_work_units: currentFailedUnits,
                thread_tracking: {
                  succeeded: currentCompletedUnits.length,
                  failed: currentFailedUnits.length,
                },
              },
            })
            .eq("id", jobId);

          console.log(`Retry batch ${retryBatchNum}/${totalRetryBatches} completed`);

          if (retryBatchIndex < totalRetryBatches - 1) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }
      }

      // FINAL: Mark job as completed
      const { data: finalJobData } = await supabase
        .from("jobs")
        .select("configuration, status")
        .eq("id", jobId)
        .single();

      // Don't mark complete if job was stopped
      if (finalJobData?.status === "failed" || finalJobData?.status === "idle") {
        console.log(`Job was stopped. Not marking as complete.`);
        return;
      }

      const finalConfig = finalJobData?.configuration || {};
      const finalCompleted = finalConfig.completed_work_units || [];
      const finalFailed = finalConfig.failed_work_units || [];
      const startTime = finalConfig.start_time || Date.now();
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

      console.log(
        `Orchestrator completed: ${finalCompleted.length}/${chunks.length} threads completed, ${finalFailed.length} failed for job ${jobId}`,
      );

      // Mark job as completed
      await supabase
        .from("jobs")
        .update({
          status: "completed",
          last_run_duration_seconds: durationSeconds,
          error_message: finalFailed.length > 0 ? `Completed with ${finalFailed.length} failed work unit(s)` : null,
        })
        .eq("id", jobId);

      console.log(`Job ${jobId} marked as completed. Duration: ${durationSeconds}s`);
    };

    // Use waitUntil to ensure background task continues even if response is sent
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(dispatchAllThreads());

    // Return immediately - the job will continue running in the background
    return new Response(
      JSON.stringify({
        success: true,
        message: `Orchestrator started. Dispatching ${remainingChunks.length} remaining threads in the background.`,
        jobId,
        totalThreads: chunks.length,
        remainingThreads: remainingChunks.length,
        completedThreads: completedUnits.length,
        failedThreads: failedUnits.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in full-refresh-orchestrator:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// FUNCTION 13: sync-titles-delta
// Location: supabase/functions/sync-titles-delta/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TMDB Genre ID to Name mapping (includes both Movie and TV genre IDs)
const TMDB_GENRE_MAP: Record<number, string> = {
  // Movie genres
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV-specific genres
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// Map movie genre IDs to TV genre IDs
const MOVIE_TO_TV_GENRE_MAP: Record<number, number | null> = {
  28: 10759, // Action → Action & Adventure (TV)
  12: 10759, // Adventure → Action & Adventure (TV)
  878: 10765, // Science Fiction → Sci-Fi & Fantasy (TV)
  14: 10765, // Fantasy → Sci-Fi & Fantasy (TV)
  10752: 10768, // War → War & Politics (TV)
  16: 16, // Animation
  35: 35, // Comedy
  80: 80, // Crime
  99: 99, // Documentary
  18: 18, // Drama
  10751: 10751, // Family
  9648: 9648, // Mystery
  37: 37, // Western
  // Movie-only genres - NO TV equivalent
  27: null, // Horror
  36: null, // History
  10402: null, // Music
  10749: null, // Romance
  53: null, // Thriller
  10770: null, // TV Movie
};

// TV-ONLY genres to search
const TV_ONLY_GENRES: number[] = [10762, 10763, 10764, 10766, 10767]; // Kids, News, Reality, Soap, Talk

// TMDB Provider ID to service name mapping (US region only)
const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: "Netflix",
  9: "Prime Video",
  119: "Prime Video",
  15: "Hulu",
  350: "Apple TV",
  2: "Apple TV",
  337: "DisneyPlus",
  390: "DisneyPlus",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing required environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("Starting Nightly Sync Delta job...");

    const startTime = Date.now();
    await supabase
      .from("jobs")
      .update({ status: "running", last_run_at: new Date().toISOString(), error_message: null })
      .eq("job_type", "sync_delta");

    // Load job configuration
    const { data: jobData } = await supabase.from("jobs").select("configuration").eq("job_type", "sync_delta").single();

    const config = (jobData?.configuration as any) || {};
    const minRating = config.min_rating || 6.0;
    const lookbackDays = config.lookback_days || 7;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();

    console.log(`Syncing titles from ${startDateStr} to ${endDateStr} (${lookbackDays} days lookback)`);

    // Load reference data
    const { data: genres } = await supabase.from("genres").select("id, genre_name, tmdb_genre_id");
    const { data: existingLanguages } = await supabase.from("spoken_languages").select("iso_639_1, language_name");
    const { data: streamingServices } = await supabase
      .from("streaming_services")
      .select("id, service_name")
      .eq("is_active", true);

    const { data: officialChannels } = await supabase
      .from("official_trailer_channels")
      .select("channel_name, language_code, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    // Build lookup maps
    const validLanguageCodes = new Set((existingLanguages || []).map((l) => l.iso_639_1));
    const genreNameToId: Record<string, string> = {};
    (genres || []).forEach((g) => {
      genreNameToId[g.genre_name.toLowerCase()] = g.id;
    });

    const serviceNameToId: Record<string, string> = {};
    (streamingServices || []).forEach((s) => {
      serviceNameToId[s.service_name.toLowerCase()] = s.id;
    });

    console.log(
      `Loaded: ${validLanguageCodes.size} languages, ${Object.keys(genreNameToId).length} genres, ${Object.keys(serviceNameToId).length} streaming services`,
    );

    let totalProcessed = 0;
    let moviesProcessed = 0;
    let seriesProcessed = 0;
    let skippedNoProvider = 0;

    // ========================================
    // HELPER FUNCTIONS (same as full-refresh)
    // ========================================

    async function fetchWatchProviders(
      tmdbId: number,
      titleType: string,
    ): Promise<{ providers: Array<{ tmdbId: number; name: string; serviceId: string }> }> {
      try {
        const endpoint = titleType === "movie" ? "movie" : "tv";
        const res = await fetch(
          `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`,
        );
        if (!res.ok) return { providers: [] };

        const data = await res.json();
        const usProviders = data.results?.US?.flatrate || [];
        const matchedProviders: Array<{ tmdbId: number; name: string; serviceId: string }> = [];

        for (const provider of usProviders) {
          const mappedName = TMDB_PROVIDER_MAP[provider.provider_id];
          if (mappedName) {
            const serviceId = serviceNameToId[mappedName.toLowerCase()];
            if (serviceId) {
              matchedProviders.push({ tmdbId: provider.provider_id, name: mappedName, serviceId });
            }
          }
        }

        return { providers: matchedProviders };
      } catch (e) {
        console.error(`Error fetching watch providers for ${tmdbId}:`, e);
        return { providers: [] };
      }
    }

    async function fetchTrailer(
      tmdbId: number,
      titleType: string,
      titleName: string,
      releaseYear: number | null,
      titleLang: string = "en",
      latestSeasonNumber?: number,
      seasonName?: string,
    ): Promise<{ url: string | null; isTmdbTrailer: boolean }> {
      try {
        let trailerKey: string | null = null;

        // For TV series, try to get the latest season's trailer first
        if (titleType === "tv" && latestSeasonNumber && latestSeasonNumber > 0) {
          const seasonVideosRes = await fetch(
            `https://api.themoviedb.org/3/tv/${tmdbId}/season/${latestSeasonNumber}/videos?api_key=${TMDB_API_KEY}`,
          );
          if (seasonVideosRes.ok) {
            const seasonVideosData = await seasonVideosRes.json();
            const seasonTrailer = seasonVideosData.results?.find(
              (v: any) => v.type === "Trailer" && v.site === "YouTube",
            );
            if (seasonTrailer) {
              trailerKey = seasonTrailer.key;
            }
          }
        }

        // Fallback to series/movie level trailer
        if (!trailerKey) {
          const endpoint = titleType === "movie" ? "movie" : "tv";
          const videosRes = await fetch(
            `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`,
          );
          if (videosRes.ok) {
            const videosData = await videosRes.json();
            const trailer = videosData.results?.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
            if (trailer) trailerKey = trailer.key;
          }
        }

        if (trailerKey) {
          return { url: `https://www.youtube.com/watch?v=${trailerKey}`, isTmdbTrailer: true };
        }

        // YouTube fallback
        if (YOUTUBE_API_KEY) {
          const relevantChannels = (officialChannels || [])
            .filter((c) => c.language_code === titleLang || c.language_code === "global" || c.language_code === "en")
            .map((c) => c.channel_name.toLowerCase());

          const searchQuery =
            titleType === "tv" && seasonName
              ? `${titleName} ${seasonName} official trailer`
              : `${titleName} ${releaseYear || ""} official trailer`;

          const youtubeRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`,
          );
          if (youtubeRes.ok) {
            const searchData = await youtubeRes.json();

            const officialChannelTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
              return relevantChannels.some((officialName) => channelTitle.includes(officialName.toLowerCase()));
            });

            if (officialChannelTrailer) {
              return {
                url: `https://www.youtube.com/watch?v=${officialChannelTrailer.id.videoId}`,
                isTmdbTrailer: false,
              };
            }

            const verifiedTrailer = searchData.items?.find((item: any) => {
              const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
              const videoTitle = item.snippet.title?.toLowerCase() || "";
              const hasOfficialInTitle = videoTitle.includes("official trailer");
              const isOfficialChannel =
                channelTitle.includes("pictures") ||
                channelTitle.includes("studios") ||
                channelTitle.includes("entertainment") ||
                channelTitle.includes("netflix") ||
                channelTitle.includes("disney");
              return hasOfficialInTitle && isOfficialChannel;
            });

            if (verifiedTrailer) {
              return { url: `https://www.youtube.com/watch?v=${verifiedTrailer.id.videoId}`, isTmdbTrailer: false };
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching trailer for ${titleName}:`, e);
      }
      return { url: null, isTmdbTrailer: true };
    }

    async function fetchMovieDetails(tmdbId: number) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=keywords`,
        );
        if (res.ok) return await res.json();
      } catch (e) {
        /* ignore */
      }
      return null;
    }

    async function fetchTvDetails(tmdbId: number) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=keywords,external_ids`,
        );
        if (res.ok) return await res.json();
      } catch (e) {
        /* ignore */
      }
      return null;
    }

    // ========================================
    // MOVIE PROCESSING
    // ========================================

    async function processMovie(movie: any) {
      try {
        const { providers } = await fetchWatchProviders(movie.id, "movie");
        if (providers.length === 0) {
          skippedNoProvider++;
          return false;
        }

        const details = await fetchMovieDetails(movie.id);
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
        const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(
          movie.id,
          "movie",
          movie.title,
          releaseYear,
          movie.original_language,
        );

        // Build genres JSON array from TMDB genre IDs
        const movieGenreIds = movie.genre_ids || [];
        const genresJson = movieGenreIds.map((gId: number) => TMDB_GENRE_MAP[gId]).filter(Boolean);

        const { data: upsertedTitle, error: titleError } = await supabase
          .from("titles")
          .upsert(
            {
              tmdb_id: movie.id,
              title_type: "movie",
              name: movie.title || details?.title,
              original_name: movie.original_title || details?.original_title,
              overview: movie.overview || details?.overview,
              release_date: movie.release_date || details?.release_date || null,
              first_air_date: null,
              last_air_date: null,
              status: details?.status || null,
              runtime: details?.runtime || null,
              episode_run_time: null,
              popularity: movie.popularity ?? details?.popularity,
              vote_average: movie.vote_average ?? details?.vote_average,
              poster_path: movie.poster_path || details?.poster_path,
              backdrop_path: movie.backdrop_path || details?.backdrop_path,
              original_language: movie.original_language || details?.original_language,
              is_adult: movie.adult || false,
              imdb_id: details?.imdb_id || null,
              tagline: details?.tagline || null,
              trailer_url: trailerUrl,
              is_tmdb_trailer: isTmdbTrailer,
              title_genres: genresJson,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tmdb_id,title_type" },
          )
          .select("id")
          .single();

        if (titleError) {
          console.error(`Error upserting movie ${movie.title}:`, titleError);
          return false;
        }

        if (upsertedTitle) {
          totalProcessed++;
          moviesProcessed++;

          // Streaming availability
          for (const provider of providers) {
            await supabase.from("title_streaming_availability").upsert(
              {
                title_id: upsertedTitle.id,
                streaming_service_id: provider.serviceId,
                region_code: "US",
              },
              { onConflict: "title_id,streaming_service_id,region_code" },
            );
          }

          // Spoken languages
          if (details?.spoken_languages) {
            for (const lang of details.spoken_languages) {
              if (validLanguageCodes.has(lang.iso_639_1)) {
                await supabase
                  .from("title_spoken_languages")
                  .upsert(
                    { title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 },
                    { onConflict: "title_id,iso_639_1" },
                  );
              }
            }
          }

          // Keywords
          if (details?.keywords?.keywords) {
            for (const kw of details.keywords.keywords.slice(0, 10)) {
              const { data: kwData } = await supabase
                .from("keywords")
                .upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: "tmdb_keyword_id" })
                .select("id")
                .single();
              if (kwData) {
                await supabase
                  .from("title_keywords")
                  .upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: "title_id,keyword_id" });
              }
            }
          }

          return true;
        }
        return false;
      } catch (error) {
        console.error(`Error processing movie ${movie.title}:`, error);
        return false;
      }
    }

    // ========================================
    // TV SHOW PROCESSING
    // ========================================

    async function processTvShow(show: any, languageCode: string) {
      try {
        const { providers } = await fetchWatchProviders(show.id, "tv");
        if (providers.length === 0) {
          skippedNoProvider++;
          return false;
        }

        const details = await fetchTvDetails(show.id);
        const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;
        const seasons = details?.seasons?.filter((s: any) => s.season_number > 0) || [];
        const latestSeasonNumber =
          seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : undefined;
        const latestSeason = seasons.find((s: any) => s.season_number === latestSeasonNumber);
        const seasonName = latestSeason?.name || (latestSeasonNumber ? `Season ${latestSeasonNumber}` : undefined);
        const { url: trailerUrl, isTmdbTrailer } = await fetchTrailer(
          show.id,
          "tv",
          show.name,
          releaseYear,
          show.original_language || languageCode,
          latestSeasonNumber,
          seasonName,
        );

        // Build genres JSON array from TMDB genre IDs
        const showGenreIds = show.genre_ids || [];
        const genresJson = showGenreIds.map((gId: number) => TMDB_GENRE_MAP[gId]).filter(Boolean);

        const { data: upsertedTitle, error: titleError } = await supabase
          .from("titles")
          .upsert(
            {
              tmdb_id: show.id,
              title_type: "tv",
              name: show.name || details?.name,
              original_name: show.original_name || details?.original_name,
              overview: show.overview || details?.overview,
              release_date: null,
              first_air_date: show.first_air_date || details?.first_air_date || null,
              last_air_date: details?.last_air_date || null,
              status: details?.status || null,
              runtime: null,
              episode_run_time: details?.episode_run_time || null,
              popularity: show.popularity ?? details?.popularity,
              vote_average: show.vote_average ?? details?.vote_average,
              poster_path: show.poster_path || details?.poster_path,
              backdrop_path: show.backdrop_path || details?.backdrop_path,
              original_language: show.original_language || details?.original_language,
              is_adult: show.adult || false,
              imdb_id: details?.external_ids?.imdb_id || null,
              tagline: details?.tagline || null,
              trailer_url: trailerUrl,
              is_tmdb_trailer: isTmdbTrailer,
              title_genres: genresJson,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tmdb_id,title_type" },
          )
          .select("id")
          .single();

        if (titleError) {
          console.error(`Error upserting show ${show.name}:`, titleError);
          return false;
        }

        if (upsertedTitle) {
          totalProcessed++;
          seriesProcessed++;

          // Streaming availability
          for (const provider of providers) {
            await supabase.from("title_streaming_availability").upsert(
              {
                title_id: upsertedTitle.id,
                streaming_service_id: provider.serviceId,
                region_code: "US",
              },
              { onConflict: "title_id,streaming_service_id,region_code" },
            );
          }

          // Spoken languages
          if (details?.spoken_languages) {
            for (const lang of details.spoken_languages) {
              if (validLanguageCodes.has(lang.iso_639_1)) {
                await supabase
                  .from("title_spoken_languages")
                  .upsert(
                    { title_id: upsertedTitle.id, iso_639_1: lang.iso_639_1 },
                    { onConflict: "title_id,iso_639_1" },
                  );
              }
            }
          }

          // Seasons with trailers
          if (details?.seasons) {
            for (const season of details.seasons) {
              let seasonTrailerUrl: string | null = null;
              let seasonIsTmdbTrailer = true;

              if (season.season_number > 0) {
                try {
                  const seasonVideosRes = await fetch(
                    `https://api.themoviedb.org/3/tv/${show.id}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY}`,
                  );
                  if (seasonVideosRes.ok) {
                    const seasonVideosData = await seasonVideosRes.json();
                    const seasonTrailer = seasonVideosData.results?.find(
                      (v: any) => v.type === "Trailer" && v.site === "YouTube",
                    );
                    if (seasonTrailer) {
                      seasonTrailerUrl = `https://www.youtube.com/watch?v=${seasonTrailer.key}`;
                    }
                  }

                  if (!seasonTrailerUrl && YOUTUBE_API_KEY) {
                    const seasonSearchName = season.name || `Season ${season.season_number}`;
                    const searchQuery = `${show.name} ${seasonSearchName} official trailer`;
                    const relevantChannels = (officialChannels || [])
                      .filter(
                        (c) =>
                          c.language_code === (show.original_language || languageCode) ||
                          c.language_code === "global" ||
                          c.language_code === "en",
                      )
                      .map((c) => c.channel_name.toLowerCase());

                    const ytRes = await fetch(
                      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`,
                    );
                    if (ytRes.ok) {
                      const ytData = await ytRes.json();
                      const found = ytData.items?.find((item: any) => {
                        const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
                        return relevantChannels.some((name) => channelTitle.includes(name.toLowerCase()));
                      });
                      if (found) {
                        seasonTrailerUrl = `https://www.youtube.com/watch?v=${found.id.videoId}`;
                        seasonIsTmdbTrailer = false;
                      }
                    }
                  }
                } catch (e) {
                  console.error(`Error fetching season ${season.season_number} trailer:`, e);
                }
              }

              await supabase.from("seasons").upsert(
                {
                  title_id: upsertedTitle.id,
                  season_number: season.season_number,
                  episode_count: season.episode_count,
                  air_date: season.air_date || null,
                  name: season.name,
                  overview: season.overview,
                  poster_path: season.poster_path,
                  trailer_url: seasonTrailerUrl,
                  is_tmdb_trailer: seasonIsTmdbTrailer,
                },
                { onConflict: "title_id,season_number" },
              );
            }
          }

          // Keywords
          if (details?.keywords?.results) {
            for (const kw of details.keywords.results.slice(0, 10)) {
              const { data: kwData } = await supabase
                .from("keywords")
                .upsert({ tmdb_keyword_id: kw.id, name: kw.name }, { onConflict: "tmdb_keyword_id" })
                .select("id")
                .single();
              if (kwData) {
                await supabase
                  .from("title_keywords")
                  .upsert({ title_id: upsertedTitle.id, keyword_id: kwData.id }, { onConflict: "title_id,keyword_id" });
              }
            }
          }

          return true;
        }
        return false;
      } catch (error) {
        console.error(`Error processing show ${show.name}:`, error);
        return false;
      }
    }

    // ========================================
    // MAIN DISCOVERY LOOP
    // ========================================

    const processedMovieIds = new Set<number>();
    const processedTvIds = new Set<number>();

    // Process each language
    for (const language of existingLanguages || []) {
      console.log(`\n=== Processing language: ${language.language_name} (${language.iso_639_1}) ===`);

      // ----------------------------------------
      // MOVIES: Date-range discovery
      // ----------------------------------------
      console.log(`[Movies] Fetching releases from ${startDateStr} to ${endDateStr}`);

      let moviePage = 1;
      let movieTotalPages = 1;

      while (moviePage <= movieTotalPages && moviePage <= 10) {
        // NOTE: For recent releases, skip vote_average filter as they may not have enough votes yet
        const moviesUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_date.gte=${startDateStr}&primary_release_date.lte=${endDateStr}&with_original_language=${language.iso_639_1}&sort_by=popularity.desc&page=${moviePage}`;

        try {
          const moviesResponse = await fetch(moviesUrl);
          const moviesData = await moviesResponse.json();
          const movies = moviesData.results || [];
          movieTotalPages = Math.min(moviesData.total_pages || 1, 10);

          console.log(`[Movies] Found ${movies.length} titles (page ${moviePage}/${movieTotalPages})`);

          for (const movie of movies) {
            if (processedMovieIds.has(movie.id)) continue;
            processedMovieIds.add(movie.id);
            await processMovie(movie);
          }

          moviePage++;
          await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (err) {
          console.error("Error fetching movies:", err);
          break;
        }
      }

      // ----------------------------------------
      // TV SHOWS: Date-range discovery (by air_date for recent seasons)
      // ----------------------------------------
      console.log(`[TV Shows] Fetching airings from ${startDateStr} to ${endDateStr}`);

      let tvPage = 1;
      let tvTotalPages = 1;

      while (tvPage <= tvTotalPages && tvPage <= 10) {
        // air_date filter captures shows with episodes airing in the date range
        const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${startDateStr}&air_date.lte=${endDateStr}&with_original_language=${language.iso_639_1}&sort_by=popularity.desc&page=${tvPage}`;

        try {
          const tvResponse = await fetch(tvUrl);
          const tvData = await tvResponse.json();
          const shows = tvData.results || [];
          tvTotalPages = Math.min(tvData.total_pages || 1, 10);

          console.log(`[TV Shows] Found ${shows.length} titles (page ${tvPage}/${tvTotalPages})`);

          for (const show of shows) {
            if (processedTvIds.has(show.id)) continue;
            processedTvIds.add(show.id);
            await processTvShow(show, language.iso_639_1);
          }

          tvPage++;
          await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (err) {
          console.error("Error fetching TV shows:", err);
          break;
        }
      }

      // Progress update
      if (totalProcessed > 0 && totalProcessed % 50 === 0) {
        await supabase.rpc("increment_job_titles", { p_job_type: "sync_delta", p_increment: 0 });
        console.log(`Progress: ${totalProcessed} titles processed (${moviesProcessed} movies, ${seriesProcessed} TV)`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // ----------------------------------------
    // TV-ONLY GENRES (Kids, News, Reality, Soap, Talk)
    // These don't have movie equivalents, search separately
    // ----------------------------------------
    console.log(`\n=== Processing TV-only genres ===`);

    for (const tvOnlyGenreId of TV_ONLY_GENRES) {
      const genreName = TMDB_GENRE_MAP[tvOnlyGenreId] || `Genre ${tvOnlyGenreId}`;
      console.log(`[TV-Only] Processing ${genreName} (${tvOnlyGenreId})`);

      for (const language of existingLanguages || []) {
        let tvPage = 1;
        let tvTotalPages = 1;

        while (tvPage <= tvTotalPages && tvPage <= 5) {
          const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&air_date.gte=${startDateStr}&air_date.lte=${endDateStr}&with_genres=${tvOnlyGenreId}&with_original_language=${language.iso_639_1}&sort_by=popularity.desc&page=${tvPage}`;

          try {
            const tvResponse = await fetch(tvUrl);
            const tvData = await tvResponse.json();
            const shows = tvData.results || [];
            tvTotalPages = Math.min(tvData.total_pages || 1, 5);

            for (const show of shows) {
              if (processedTvIds.has(show.id)) continue;
              processedTvIds.add(show.id);
              await processTvShow(show, language.iso_639_1);
            }

            tvPage++;
            await new Promise((resolve) => setTimeout(resolve, 250));
          } catch (err) {
            console.error(`Error fetching ${genreName} shows:`, err);
            break;
          }
        }
      }
    }

    // ========================================
    // COMPLETION
    // ========================================

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0);

    await supabase
      .from("jobs")
      .update({
        status: "completed",
        total_titles_processed: totalProcessed,
        last_run_duration_seconds: duration,
        next_run_at: nextRun.toISOString(),
      })
      .eq("job_type", "sync_delta");

    console.log(`\n=== Nightly Sync Complete ===`);
    console.log(`Total: ${totalProcessed} titles (${moviesProcessed} movies, ${seriesProcessed} TV)`);
    console.log(`Skipped (no streaming): ${skippedNoProvider}`);
    console.log(`Duration: ${duration} seconds`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        moviesProcessed,
        seriesProcessed,
        skippedNoProvider,
        duration,
        lookbackDays,
        message: `Synced ${totalProcessed} titles in ${duration}s`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in sync-titles-delta:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0);

    await supabase
      .from("jobs")
      .update({ status: "failed", error_message: errorMessage, next_run_at: nextRun.toISOString() })
      .eq("job_type", "sync_delta");

    await supabase.from("system_logs").insert({
      severity: "error",
      operation: "sync-titles-delta",
      error_message: errorMessage,
      context: { stack: error instanceof Error ? error.stack : null },
    });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// FUNCTION 14: enrich-title-trailers
// Location: supabase/functions/enrich-title-trailers/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RUNTIME_MS = 85000; // 85 seconds (leave buffer)
const BATCH_SIZE = 50; // Process 50 records per batch (limit per YouTube/TMDB request)

// Comprehensive list of official studio and distributor channels (multi-language)
const OFFICIAL_CHANNELS = [
  // Major Hollywood Studios
  "Universal Pictures",
  "Warner Bros. Pictures",
  "Warner Bros.",
  "WB Pictures",
  "Sony Pictures Entertainment",
  "Sony Pictures",
  "Columbia Pictures",
  "Paramount Pictures",
  "Paramount",
  "20th Century Studios",
  "20th Century Fox",
  "Walt Disney Studios",
  "Disney",
  "Marvel Entertainment",
  "Marvel Studios",
  "DC",
  "Lionsgate Movies",
  "Lionsgate",
  "MGM",
  "Metro-Goldwyn-Mayer",

  // Indie/Specialty Distributors
  "A24",
  "Searchlight Pictures",
  "Fox Searchlight",
  "Focus Features",
  "Sony Pictures Classics",
  "NEON",
  "Magnolia Pictures",
  "IFC Films",
  "STXfilms",
  "STX Entertainment",
  "Entertainment One",
  "eOne Films",
  "Bleecker Street",
  "Annapurna Pictures",
  "Roadside Attractions",
  "FilmDistrict",
  "Open Road Films",
  "LD Entertainment",
  "Vertical Entertainment",

  // Streaming Services (Official Channels)
  "Netflix",
  "Netflix Film",
  "Amazon Prime Video",
  "Prime Video",
  "Apple TV",
  "Apple TV+",
  "HBO",
  "HBO Max",
  "Max",
  "Hulu",
  "Peacock",
  "Peacock TV",
  "Disney+",
  "Disney Plus",
  "DisneyPlus Hotstar",

  // Additional Studios
  "DreamWorks",
  "Amblin",
  "New Line Cinema",
  "Miramax",
  "Relativity Media",
  "Screen Gems",
  "TriStar Pictures",
  "Summit Entertainment",
  "FilmNation",
  "Plan B",
  "Participant",
  "Lucasfilm",
  "Pixar",

  // Horror/Genre Specialists
  "Blumhouse",
  "A24 Films",
  "Shudder",
  "Scream Factory",

  // Documentary Distributors
  "National Geographic",
  "PBS",
  "Sundance",
  "HBO Documentary Films",

  // ===== INDIAN (Hindi/Bollywood) =====
  "T-Series",
  "TSeries",
  "Dharma Productions",
  "Red Chillies Entertainment",
  "Yash Raj Films",
  "YRF",
  "Zee Studios",
  "Eros Now",
  "Tips Official",
  "Sony Music India",
  "Pen Movies",
  "Zee Music Company",
  "Goldmines",
  "Saregama",
  "Speed Records",
  "Venus",
  "Ultra Bollywood",
  "Shemaroo",

  // ===== SOUTH INDIAN (Tamil/Telugu/Kannada/Malayalam) =====
  "Sun Pictures",
  "Lyca Productions",
  "Hombale Films",
  "Geetha Arts",
  "Mythri Movie Makers",
  "Sri Venkateswara Creations",
  "Aditya Music",
  "Red Giant Movies",
  "Lahari Music",
  "Think Music India",
  "Sony Music South",
  "Mango Music",
  "Saregama Tamil",
  "Saregama Telugu",
  "Star Maa",
  "Mammootty Kampany",
  "Prithviraj Productions",
  "Wayfarer Films",

  // ===== KOREAN =====
  "CJ ENM",
  "Showbox",
  "NEW",
  "Lotte Entertainment",
  "KOFIC",
  "CJ Entertainment",
  "Megabox Plus M",
  "Next Entertainment World",
  "1theK",
  "Stone Music Entertainment",
  "Kakao Entertainment",

  // ===== JAPANESE =====
  "Toho Movie Channel",
  "Warner Bros Japan",
  "Sony Pictures Japan",
  "Toei Animation",
  "Aniplex",
  "KADOKAWA",
  "Shochiku",
  "MAPPA",
  "Crunchyroll",
  "Funimation",
  "Studio Ghibli",
  "Toho",
  "Nikkatsu",
  "Toei Company",
  "Bandai Namco",
  "Sunrise",
  "A-1 Pictures",

  // ===== CHINESE =====
  "Tencent Video",
  "iQIYI",
  "Youku",
  "Huace Film",
  "China Movie Channel",
  "Mango TV",
  "Bilibili",
  "Alibaba Pictures",
  "Bona Film",
  "Huanxi Media",
  "Wanda Pictures",
  "China Film",
  "Enlight Media",

  // ===== SPANISH (Latin America & Spain) =====
  "Cinepolis",
  "Sony Pictures Latinoamérica",
  "Warner Bros. Latinoamérica",
  "Universal Pictures Latinoamérica",
  "Netflix Latinoamérica",
  "Sensacine",
  "eOne Spain",
  "A Contracorriente Films",
  "Filmax",
  "DeAPlaneta",

  // ===== FRENCH =====
  "Allociné",
  "Universal Pictures France",
  "Sony Pictures France",
  "Warner Bros. France",
  "Pathé",
  "Gaumont",
  "StudioCanal",
  "Metropolitan Filmexport",
  "UGC Distribution",
  "Wild Bunch",

  // ===== GERMAN =====
  "KinoCheck",
  "Constantin Film",
  "Sony Pictures DE",
  "Warner Bros. DE",
  "Universal Pictures Germany",
  "Tobis Film",
  "Wild Bunch Germany",

  // ===== ITALIAN =====
  "FilmIsNow Trailer",
  "01 Distribution",
  "Vision Distribution",
  "Netflix Italia",
  "Warner Bros. Italia",
  "Universal Pictures Italia",
  "Medusa Film",
  "Lucky Red",
  "Eagle Pictures",

  // ===== PORTUGUESE/BRAZILIAN =====
  "Telecine",
  "Netflix Brasil",
  "Sony Pictures Brasil",
  "Warner Bros. Brasil",
  "Globo Filmes",
  "Paris Filmes",
  "Diamond Films Brasil",

  // ===== TURKISH =====
  "Netflix Türkiye",
  "BluTV",
  "Exxen",
  "BKM",
  "TRT",

  // ===== RUSSIAN =====
  "Kinopoisk",
  "Central Partnership",
  "Mosfilm",
  "Sony Pictures Russia",

  // ===== OTHER INTERNATIONAL =====
  "Film4",
  "Working Title",
  "Legendary Entertainment",
  "Constantin Film",
  "Nordisk Film",
  "SF Studios",
  "Svensk Filmindustri",
];

// Keywords that indicate official status
const OFFICIAL_KEYWORDS = ["official", "trailer", "studios", "pictures", "entertainment", "films", "productions"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { jobId } = await req.json();

    console.log(`Starting trailer enrichment job: ${jobId}`);

    if (!TMDB_API_KEY || !YOUTUBE_API_KEY) {
      throw new Error("API keys not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if job is still running (respect stop commands)
    if (jobId) {
      const { data: jobData } = await supabase.from("jobs").select("status").eq("id", jobId).single();

      if (jobData?.status !== "running") {
        console.log(`Job ${jobId} status is "${jobData?.status}", not running. Exiting.`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Job stopped (status: ${jobData?.status})`,
            skipped: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    let totalProcessed = 0;
    let titlesEnriched = 0;
    let seasonsEnriched = 0;
    let failed = 0;
    let quotaExceeded = false; // Track if YouTube quota is exceeded

    // Helper function to check if we should continue
    function shouldContinue(): boolean {
      return Date.now() - startTime < MAX_RUNTIME_MS && !quotaExceeded;
    }

    // Helper function to search YouTube for trailers with comprehensive channel matching
    async function searchYouTubeTrailer(
      titleName: string,
      contentType: "movie" | "tv",
      releaseYear: number | null,
      seasonName?: string,
    ): Promise<{ url: string; isTmdbTrailer: false } | null> {
      // Build search query
      let searchQuery: string;
      if (seasonName) {
        searchQuery = `${titleName} ${seasonName} official trailer`;
      } else {
        const typeLabel = contentType === "movie" ? "movie" : "tv series";
        searchQuery = releaseYear
          ? `${titleName} ${typeLabel} official trailer ${releaseYear}`
          : `${titleName} ${typeLabel} official trailer`;
      }

      console.log(`Searching YouTube for: ${searchQuery}`);

      try {
        const youtubeResponse = await fetch(
          `${YOUTUBE_SEARCH_URL}?` +
            `part=snippet&q=${encodeURIComponent(searchQuery)}&` +
            `type=video&videoDefinition=high&` +
            `order=relevance&maxResults=10&key=${YOUTUBE_API_KEY}`,
        );

        if (!youtubeResponse.ok) {
          const errorText = await youtubeResponse.text();
          console.error(`YouTube API error for "${titleName}":`, errorText);

          // Check if quota exceeded
          if (youtubeResponse.status === 403 && errorText.includes("quotaExceeded")) {
            console.error("YouTube API quota exceeded");
            throw new Error("QUOTA_EXCEEDED");
          }
          return null;
        }

        const youtubeData = await youtubeResponse.json();

        if (!youtubeData.items || youtubeData.items.length === 0) {
          console.log(`No YouTube results for "${titleName}"`);
          return null;
        }

        // Find first video from an official channel
        let selectedVideo = null;

        for (const item of youtubeData.items) {
          const channelTitle = item.snippet.channelTitle?.toLowerCase() || "";
          const videoTitle = item.snippet.title?.toLowerCase() || "";

          // Check if channel name matches any official channel
          const isOfficialChannel = OFFICIAL_CHANNELS.some(
            (official) =>
              channelTitle.includes(official.toLowerCase()) || official.toLowerCase().includes(channelTitle),
          );

          // Check if video title contains "official trailer" or "official teaser"
          const isOfficialVideo =
            videoTitle.includes("official trailer") ||
            videoTitle.includes("official teaser") ||
            videoTitle.includes("official clip");

          // Check if channel has official keywords
          const hasOfficialKeywords = OFFICIAL_KEYWORDS.some((keyword) => channelTitle.includes(keyword));

          if (isOfficialChannel || (isOfficialVideo && hasOfficialKeywords)) {
            selectedVideo = item;
            console.log(`✓ Found official trailer from channel: "${item.snippet.channelTitle}" for "${titleName}"`);
            break;
          }
        }

        // If no official channel found, skip this title
        if (!selectedVideo) {
          console.log(`✗ No official trailer found for "${titleName}", skipping...`);
          console.log(
            `  Available channels were:`,
            youtubeData.items.map((i: any) => i.snippet.channelTitle).join(", "),
          );
          return null;
        }

        const videoId = selectedVideo.id.videoId;
        return {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          isTmdbTrailer: false,
        };
      } catch (e) {
        if (e instanceof Error && e.message === "QUOTA_EXCEEDED") {
          throw e; // Re-throw quota errors to stop processing
        }
        console.error(`YouTube search error for ${titleName}:`, e);
        return null;
      }
    }

    // Helper function to fetch trailer from TMDB videos endpoint
    async function fetchTmdbTrailer(tmdbId: number, endpoint: string, seasonNumber?: number): Promise<string | null> {
      try {
        let url: string;
        if (seasonNumber !== undefined) {
          url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}/videos?api_key=${TMDB_API_KEY}`;
        } else {
          url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
        }

        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        const trailer = data.results?.find((v: any) => v.type === "Trailer" && v.site === "YouTube");

        return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
      } catch (e) {
        console.error(`TMDB trailer fetch error for ${tmdbId}:`, e);
        return null;
      }
    }

    // ==========================================
    // PHASE 1: Enrich TITLES with null trailer_url
    // ==========================================
    console.log("=== PHASE 1: Enriching titles with missing trailers ===");

    let hasMoreTitles = true;

    while (hasMoreTitles && shouldContinue()) {
      const { data: titlesWithoutTrailers, error: titlesError } = await supabase
        .from("titles")
        .select("id, tmdb_id, name, release_date, first_air_date, title_type, original_language")
        .not("tmdb_id", "is", null)
        .is("trailer_url", null)
        .limit(BATCH_SIZE);

      if (titlesError) {
        console.error("Error fetching titles:", titlesError);
        break;
      }

      if (!titlesWithoutTrailers || titlesWithoutTrailers.length === 0) {
        console.log("No more titles to process");
        hasMoreTitles = false;
        break;
      }

      console.log(`Processing batch of ${titlesWithoutTrailers.length} titles`);

      for (const title of titlesWithoutTrailers) {
        if (!shouldContinue()) {
          console.log("Time limit approaching, stopping title processing");
          break;
        }

        try {
          // Add delay to respect YouTube API rate limits
          if (totalProcessed > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
          }

          const dateStr = title.title_type === "movie" ? title.release_date : title.first_air_date;
          const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;
          const contentType = title.title_type === "movie" ? "movie" : "tv";

          let trailerUrl: string | null = null;
          let isTmdbTrailer = true;

          if (title.title_type === "movie") {
            // Try TMDB for movies
            trailerUrl = await fetchTmdbTrailer(title.tmdb_id, "movie");
          } else {
            // For TV, try to get latest season trailer first, then series-level
            try {
              const tvRes = await fetch(`${TMDB_BASE_URL}/tv/${title.tmdb_id}?api_key=${TMDB_API_KEY}`);
              if (tvRes.ok) {
                const tvData = await tvRes.json();
                const seasons = tvData.seasons?.filter((s: any) => s.season_number > 0) || [];
                const latestSeasonNumber =
                  seasons.length > 0 ? Math.max(...seasons.map((s: any) => s.season_number)) : null;

                if (latestSeasonNumber) {
                  trailerUrl = await fetchTmdbTrailer(title.tmdb_id, "tv", latestSeasonNumber);
                }
              }
            } catch (e) {
              console.error(`Error fetching TV details for ${title.tmdb_id}:`, e);
            }

            // Fallback to series-level TMDB trailer
            if (!trailerUrl) {
              trailerUrl = await fetchTmdbTrailer(title.tmdb_id, "tv");
            }
          }

          // Fallback to YouTube if no TMDB trailer
          if (!trailerUrl) {
            const ytResult = await searchYouTubeTrailer(title.name, contentType, releaseYear);
            if (ytResult) {
              trailerUrl = ytResult.url;
              isTmdbTrailer = false;
            }
          }

          // Always update the title - either with trailer URL or empty string to mark as "checked"
          const { error: updateError } = await supabase
            .from("titles")
            .update({
              trailer_url: trailerUrl || "", // Empty string means "checked, no trailer found"
              is_tmdb_trailer: trailerUrl ? isTmdbTrailer : false,
            })
            .eq("id", title.id);

          if (updateError) {
            console.error(`Failed to update title ${title.id}:`, updateError);
            failed++;
          } else if (trailerUrl) {
            titlesEnriched++;
            console.log(`✓ Title: ${title.name} (${title.title_type}) - ${isTmdbTrailer ? "TMDB" : "YouTube"}`);
          } else {
            console.log(`○ No trailer found: ${title.name} (marked as checked)`);
          }

          totalProcessed++;
        } catch (titleError) {
          if (titleError instanceof Error && titleError.message === "QUOTA_EXCEEDED") {
            console.error("YouTube quota exceeded, stopping processing");
            quotaExceeded = true;
            break;
          }
          console.error(`Error processing title ${title.id}:`, titleError);
          failed++;
          totalProcessed++;
        }
      }
    }

    // ==========================================
    // PHASE 2: Enrich SEASONS with null trailer_url
    // ==========================================
    if (shouldContinue()) {
      console.log("=== PHASE 2: Enriching seasons with missing trailers ===");

      let hasMoreSeasons = true;

      while (hasMoreSeasons && shouldContinue()) {
        // Get seasons without trailers, joining with titles to get tmdb_id and name
        const { data: seasonsWithoutTrailers, error: seasonsError } = await supabase
          .from("seasons")
          .select(
            `
            id,
            title_id,
            season_number,
            name,
            titles!inner (
              tmdb_id,
              name,
              original_language
            )
          `,
          )
          .is("trailer_url", null)
          .gt("season_number", 0)
          .limit(BATCH_SIZE);

        if (seasonsError) {
          console.error("Error fetching seasons:", seasonsError);
          break;
        }

        if (!seasonsWithoutTrailers || seasonsWithoutTrailers.length === 0) {
          console.log("No more seasons to process");
          hasMoreSeasons = false;
          break;
        }

        console.log(`Processing batch of ${seasonsWithoutTrailers.length} seasons`);

        for (const season of seasonsWithoutTrailers) {
          if (!shouldContinue()) {
            console.log("Time limit approaching, stopping season processing");
            break;
          }

          try {
            // Add delay to respect YouTube API rate limits
            if (totalProcessed > 0) {
              await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
            }

            const titleInfo = season.titles as any;
            const tmdbId = titleInfo?.tmdb_id;
            const titleName = titleInfo?.name;

            if (!tmdbId || !titleName) {
              console.log(`Skipping season ${season.id} - missing title info`);
              continue;
            }

            let trailerUrl: string | null = null;
            let isTmdbTrailer = true;

            // Try TMDB season-specific trailer
            trailerUrl = await fetchTmdbTrailer(tmdbId, "tv", season.season_number);

            // Fallback to series-level TMDB trailer
            if (!trailerUrl) {
              trailerUrl = await fetchTmdbTrailer(tmdbId, "tv");
            }

            // Fallback to YouTube with season-specific search
            if (!trailerUrl) {
              const seasonName = season.name || `Season ${season.season_number}`;
              const ytResult = await searchYouTubeTrailer(titleName, "tv", null, seasonName);
              if (ytResult) {
                trailerUrl = ytResult.url;
                isTmdbTrailer = false;
              }
            }

            // Always update the season - either with trailer URL or empty string to mark as "checked"
            const { error: updateError } = await supabase
              .from("seasons")
              .update({
                trailer_url: trailerUrl || "", // Empty string means "checked, no trailer found"
                is_tmdb_trailer: trailerUrl ? isTmdbTrailer : false,
              })
              .eq("id", season.id);

            if (updateError) {
              console.error(`Failed to update season ${season.id}:`, updateError);
              failed++;
            } else if (trailerUrl) {
              seasonsEnriched++;
              console.log(`✓ Season: ${titleName} S${season.season_number} - ${isTmdbTrailer ? "TMDB" : "YouTube"}`);
            } else {
              console.log(`○ No trailer found: ${titleName} S${season.season_number} (marked as checked)`);
            }

            totalProcessed++;
          } catch (seasonError) {
            if (seasonError instanceof Error && seasonError.message === "QUOTA_EXCEEDED") {
              console.error("YouTube quota exceeded, stopping processing");
              quotaExceeded = true;
              break;
            }
            console.error(`Error processing season ${season.id}:`, seasonError);
            failed++;
            totalProcessed++;
          }
        }
      }
    }

    // Update job counter
    if (jobId && totalProcessed > 0) {
      await supabase.rpc("increment_job_titles", {
        p_job_type: "enrich_trailers",
        p_increment: totalProcessed,
      });
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Check remaining work
    const { count: titleCount } = await supabase
      .from("titles")
      .select("*", { count: "exact", head: true })
      .not("tmdb_id", "is", null)
      .is("trailer_url", null);

    const { count: seasonCount } = await supabase
      .from("seasons")
      .select("*", { count: "exact", head: true })
      .is("trailer_url", null)
      .gt("season_number", 0);

    const remainingTitles = titleCount || 0;
    const remainingSeasons = seasonCount || 0;

    const isComplete = remainingTitles === 0 && remainingSeasons === 0;

    console.log(
      `Trailer enrichment batch completed: ${titlesEnriched} titles, ${seasonsEnriched} seasons enriched, ${failed} failed in ${duration}s`,
    );
    console.log(`Remaining: ${remainingTitles} titles, ${remainingSeasons} seasons`);
    if (quotaExceeded) {
      console.log("YouTube quota exceeded - job will be stopped");
    }

    // Update job - but respect stop commands (don't override status if stopped)
    if (jobId) {
      // Check current status before updating
      const { data: currentJob } = await supabase.from("jobs").select("status").eq("id", jobId).single();

      const wasStoppedByUser = currentJob?.status !== "running";

      if (wasStoppedByUser) {
        console.log(`Job was stopped by user (status: ${currentJob?.status}). Not restarting.`);
        // Only update stats, don't change status
        await supabase
          .from("jobs")
          .update({
            last_run_at: new Date().toISOString(),
            last_run_duration_seconds: duration,
          })
          .eq("id", jobId);
      } else if (quotaExceeded) {
        // Quota exceeded - stop the job with error message
        console.log("Stopping job due to YouTube quota exceeded");
        await supabase
          .from("jobs")
          .update({
            status: "stopped",
            error_message: "YouTube API quota exceeded. Job will resume when quota resets (midnight Pacific time).",
            last_run_at: new Date().toISOString(),
            last_run_duration_seconds: duration,
          })
          .eq("id", jobId);
      } else {
        // Job is still running, update normally
        const newStatus = isComplete ? "completed" : "running";
        await supabase
          .from("jobs")
          .update({
            status: newStatus,
            last_run_at: new Date().toISOString(),
            last_run_duration_seconds: duration,
            ...(isComplete ? { error_message: null } : {}),
          })
          .eq("id", jobId);
      }

      // Only schedule next batch if job is still running, not complete, and quota not exceeded
      if (!isComplete && !wasStoppedByUser && !quotaExceeded) {
        console.log("More work remaining, scheduling next batch via EdgeRuntime.waitUntil...");

        const invokeNextBatch = async () => {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-title-trailers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
              console.error("Failed to invoke next batch:", await response.text());
            } else {
              console.log("Next batch invoked successfully");
            }
          } catch (e) {
            console.error("Error invoking next batch:", e);
          }
        };

        // Use EdgeRuntime.waitUntil for reliable background continuation
        if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
          EdgeRuntime.waitUntil(invokeNextBatch());
          console.log("Next batch scheduled via EdgeRuntime.waitUntil");
        } else {
          // Fallback - fire and forget
          invokeNextBatch();
          console.log("Next batch dispatched (no EdgeRuntime available)");
        }
      } else if (wasStoppedByUser) {
        console.log("Job was stopped by user, not scheduling next batch");
      } else if (quotaExceeded) {
        console.log("Job stopped due to YouTube quota exceeded, not scheduling next batch");
      }
    }

    return new Response(
      JSON.stringify({
        success: !quotaExceeded,
        message: quotaExceeded
          ? "YouTube API quota exceeded - job stopped"
          : isComplete
            ? "All trailers enriched"
            : "Batch completed, more work remaining",
        titlesEnriched,
        seasonsEnriched,
        failed,
        totalProcessed,
        remainingTitles,
        remainingSeasons,
        duration,
        quotaExceeded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Fatal error in enrich-title-trailers:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ============================================================================
// FUNCTION 15: transcribe-trailers
// Location: supabase/functions/transcribe-trailers/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to check if URL is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/|youtu\.be\/)/.test(url);
}

// Function to check if URL is valid and not empty
function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Must start with http:// or https://
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;

  return true;
}

// Function to check if URL is a direct video file we can download
function isDownloadableVideoUrl(url: string): boolean {
  // Only YouTube URLs are currently supported for transcription
  // TMDB video links and other streaming URLs cannot be downloaded directly
  return isYouTubeUrl(url);
}

// Function to detect if text is in English
async function isEnglish(text: string): Promise<boolean> {
  if (typeof text !== "string" || !text || text.trim().length === 0) {
    console.warn("Invalid text input for language detection, assuming English");
    return true;
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, assuming English");
    return true;
  }

  try {
    const textSample = text.substring(0, 500);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: 'Detect the language of the text. Respond with ONLY "english" or "other". No explanations.',
          },
          {
            role: "user",
            content: textSample,
          },
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.warn("Language detection failed, assuming English");
      return true;
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim().toLowerCase();
    return result === "english";
  } catch (error) {
    console.error(`Language detection error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

// Function to translate non-English text to English
async function translateToEnglish(transcript: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping translation");
    return transcript;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Translate the following text to English. Return ONLY the translated text with no explanations or additional commentary.",
          },
          {
            role: "user",
            content: transcript,
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI translation API error: ${errorText}`);
      return transcript;
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      console.warn("No translation result from OpenAI");
      return transcript;
    }

    console.log(`✓ Transcript translated to English (${transcript.length} → ${translatedText.length} chars)`);
    return translatedText;
  } catch (error) {
    console.error(`Translation error: ${error instanceof Error ? error.message : String(error)}`);
    return transcript;
  }
}

// Function to ensure transcript is in English
async function ensureEnglishTranscript(transcript: string): Promise<string> {
  const alreadyEnglish = await isEnglish(transcript);

  if (alreadyEnglish) {
    console.log(`✓ Transcript already in English, skipping translation`);
    return transcript;
  }

  console.log(`⚠ Non-English transcript detected, translating...`);
  return await translateToEnglish(transcript);
}

// Track if we hit API limit to stop processing
let supadataLimitExceeded = false;

// Function to get transcript for a YouTube URL
async function getYouTubeTranscript(videoUrl: string): Promise<string | null> {
  // If we already hit the limit, don't make more requests
  if (supadataLimitExceeded) {
    console.log("Supadata API limit already exceeded, skipping");
    return null;
  }

  const SUPADATA_API_KEY = Deno.env.get("SUPADATA_API_KEY");
  if (!SUPADATA_API_KEY) {
    console.error("Supadata API key not configured");
    return null;
  }

  try {
    const supadataResponse = await fetch(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}&text=true&lang=en-US`,
      {
        headers: {
          "x-api-key": SUPADATA_API_KEY,
        },
      },
    );

    if (!supadataResponse.ok) {
      const errorText = await supadataResponse.text();
      console.error(`Supadata API error: ${errorText}`);

      // Check if it's a rate limit or quota error
      if (errorText.includes("limit-exceeded") || errorText.includes("Limit Exceeded") || errorText.includes("quota")) {
        console.error("⚠ Supadata API limit exceeded - stopping YouTube transcriptions");
        supadataLimitExceeded = true;
      }

      return null;
    }

    const supadataData = await supadataResponse.json();
    const { content, lang } = supadataData;

    if (!content || content.trim().length === 0) {
      console.log("No transcript available from Supadata");
      return null;
    }

    console.log(`✓ Supadata transcript extracted: ${content.length} characters, language: ${lang}`);

    // If language is English, use content directly, otherwise translate
    const isEnglishLang = lang && (lang === "en" || lang.toLowerCase().startsWith("en-"));
    if (isEnglishLang) {
      return content;
    } else {
      console.log(`⚠ Non-English transcript (${lang}), translating to English...`);
      return await translateToEnglish(content);
    }
  } catch (error) {
    console.error(`Supadata error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Main transcription function - only supports YouTube URLs
async function transcribeVideo(videoUrl: string): Promise<string | null> {
  // Validate URL first
  if (!isValidUrl(videoUrl)) {
    console.log(`⚠ Invalid or empty URL, skipping`);
    return null;
  }

  // Only YouTube URLs are supported for transcription
  if (isYouTubeUrl(videoUrl)) {
    console.log(`YouTube URL detected, using Supadata.ai API`);
    return await getYouTubeTranscript(videoUrl);
  } else {
    // Non-YouTube URLs (like TMDB direct links) cannot be transcribed
    console.log(`⚠ Non-YouTube URL detected (${videoUrl.substring(0, 50)}...), skipping - only YouTube supported`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_RUNTIME_MS = 85000; // 85 seconds safety margin
  const BATCH_SIZE = 10;

  // Reset limit flag at start of each invocation
  supadataLimitExceeded = false;

  try {
    const body = await req.json();
    const jobId = body.jobId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if job is still running
    if (jobId) {
      const { data: job } = await supabase.from("jobs").select("status, error_message").eq("id", jobId).single();

      if (job?.status !== "running") {
        console.log(`Job ${jobId} is no longer running (status: ${job?.status}). Stopping.`);
        return new Response(JSON.stringify({ message: "Job stopped", processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let totalTitlesProcessed = 0;
    let totalSeasonsProcessed = 0;
    let hasMoreWork = true;

    // Continuous batch processing loop
    while (hasMoreWork && Date.now() - startTime < MAX_RUNTIME_MS && !supadataLimitExceeded) {
      // Check job status periodically
      if (jobId && totalTitlesProcessed % 20 === 0 && totalTitlesProcessed > 0) {
        const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();

        if (job?.status !== "running") {
          console.log(`Job stopped during processing. Exiting.`);
          break;
        }
      }

      // ========== PHASE 1: Process titles (movies + series) ==========
      // Filter for YouTube URLs only (contains 'youtube.com' or 'youtu.be')
      const { data: titles, error: titlesError } = await supabase
        .from("titles")
        .select("id, name, trailer_url, title_type")
        .not("trailer_url", "is", null)
        .neq("trailer_url", "") // Exclude empty strings
        .is("trailer_transcript", null)
        .or("trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%") // Only YouTube URLs
        .limit(BATCH_SIZE);

      if (titlesError) {
        console.error("Error fetching titles:", titlesError);
        break;
      }

      if (titles && titles.length > 0) {
        for (const title of titles) {
          if (Date.now() - startTime >= MAX_RUNTIME_MS) break;
          if (supadataLimitExceeded) break;

          // Double-check URL validity
          if (!isValidUrl(title.trailer_url)) {
            console.log(`⚠ Skipping title ${title.name} - invalid URL`);
            await supabase.from("titles").update({ trailer_transcript: "" }).eq("id", title.id);
            continue;
          }

          console.log(`Processing title: ${title.name} (${title.title_type})`);

          const transcript = await transcribeVideo(title.trailer_url!);

          if (transcript) {
            const { error: updateError } = await supabase
              .from("titles")
              .update({ trailer_transcript: transcript })
              .eq("id", title.id);

            if (updateError) {
              console.error(`Failed to update title ${title.id}:`, updateError);
            } else {
              console.log(`✓ Updated title ${title.name} with transcript (${transcript.length} chars)`);
              totalTitlesProcessed++;
            }
          } else {
            // Mark as processed with empty string to skip in future runs
            await supabase.from("titles").update({ trailer_transcript: "" }).eq("id", title.id);
            console.log(`✗ No transcript available for ${title.name}, marked as processed`);
          }
        }
      }

      // Stop if Supadata limit was hit
      if (supadataLimitExceeded) {
        console.log("Stopping due to Supadata API limit");
        break;
      }

      // ========== PHASE 2: Process seasons ==========
      const { data: seasons, error: seasonsError } = await supabase
        .from("seasons")
        .select("id, name, season_number, trailer_url, title_id")
        .not("trailer_url", "is", null)
        .neq("trailer_url", "") // Exclude empty strings
        .is("trailer_transcript", null)
        .or("trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%") // Only YouTube URLs
        .limit(BATCH_SIZE);

      if (seasonsError) {
        console.error("Error fetching seasons:", seasonsError);
        break;
      }

      if (seasons && seasons.length > 0) {
        // Get parent title names for logging
        const titleIds = [...new Set(seasons.map((s) => s.title_id))];
        const { data: parentTitles } = await supabase.from("titles").select("id, name").in("id", titleIds);

        const titleNameMap = new Map(parentTitles?.map((t) => [t.id, t.name]) || []);

        for (const season of seasons) {
          if (Date.now() - startTime >= MAX_RUNTIME_MS) break;
          if (supadataLimitExceeded) break;

          // Double-check URL validity
          if (!isValidUrl(season.trailer_url)) {
            console.log(`⚠ Skipping season - invalid URL`);
            await supabase.from("seasons").update({ trailer_transcript: "" }).eq("id", season.id);
            continue;
          }

          const titleName = titleNameMap.get(season.title_id) || "Unknown";
          console.log(`Processing season: ${titleName} - ${season.name || `Season ${season.season_number}`}`);

          const transcript = await transcribeVideo(season.trailer_url!);

          if (transcript) {
            const { error: updateError } = await supabase
              .from("seasons")
              .update({ trailer_transcript: transcript })
              .eq("id", season.id);

            if (updateError) {
              console.error(`Failed to update season ${season.id}:`, updateError);
            } else {
              console.log(
                `✓ Updated ${titleName} Season ${season.season_number} with transcript (${transcript.length} chars)`,
              );
              totalSeasonsProcessed++;
            }
          } else {
            // Mark as processed with empty string
            await supabase.from("seasons").update({ trailer_transcript: "" }).eq("id", season.id);
            console.log(
              `✗ No transcript available for ${titleName} Season ${season.season_number}, marked as processed`,
            );
          }
        }
      }

      // Check if there's more YouTube work to do
      const { count: remainingTitles } = await supabase
        .from("titles")
        .select("*", { count: "exact", head: true })
        .not("trailer_url", "is", null)
        .neq("trailer_url", "")
        .is("trailer_transcript", null)
        .or("trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%");

      const { count: remainingSeasons } = await supabase
        .from("seasons")
        .select("*", { count: "exact", head: true })
        .not("trailer_url", "is", null)
        .neq("trailer_url", "")
        .is("trailer_transcript", null)
        .or("trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%");

      hasMoreWork = (remainingTitles || 0) > 0 || (remainingSeasons || 0) > 0;

      if (!hasMoreWork) {
        console.log("No more YouTube items to transcribe");
        break;
      }

      // Update job progress
      if (jobId && totalTitlesProcessed + totalSeasonsProcessed > 0) {
        await supabase.rpc("increment_job_titles", {
          p_job_type: "transcribe_trailers",
          p_increment: totalTitlesProcessed + totalSeasonsProcessed,
        });
      }
    }

    // Mark non-YouTube URLs as processed (set to empty string so they're skipped)
    console.log("Marking non-YouTube trailer URLs as processed...");

    // Mark non-YouTube title trailers
    await supabase
      .from("titles")
      .update({ trailer_transcript: "" })
      .not("trailer_url", "is", null)
      .neq("trailer_url", "")
      .is("trailer_transcript", null)
      .not("trailer_url", "ilike", "%youtube.com%")
      .not("trailer_url", "ilike", "%youtu.be%");

    // Mark non-YouTube season trailers
    await supabase
      .from("seasons")
      .update({ trailer_transcript: "" })
      .not("trailer_url", "is", null)
      .neq("trailer_url", "")
      .is("trailer_transcript", null)
      .not("trailer_url", "ilike", "%youtube.com%")
      .not("trailer_url", "ilike", "%youtu.be%");

    // Final job update
    if (jobId) {
      const { count: remainingTitles } = await supabase
        .from("titles")
        .select("*", { count: "exact", head: true })
        .not("trailer_url", "is", null)
        .neq("trailer_url", "")
        .is("trailer_transcript", null)
        .or("trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%");

      const { count: remainingSeasons } = await supabase
        .from("seasons")
        .select("*", { count: "exact", head: true })
        .not("trailer_url", "is", null)
        .neq("trailer_url", "")
        .is("trailer_transcript", null)
        .or("trailer_url.ilike.%youtube.com%,trailer_url.ilike.%youtu.be%");

      const hasMoreWork = (remainingTitles || 0) > 0 || (remainingSeasons || 0) > 0;

      if (supadataLimitExceeded) {
        // API limit hit - stop job with message
        await supabase
          .from("jobs")
          .update({
            status: "stopped",
            error_message: "Supadata API limit exceeded. Job paused until quota resets.",
          })
          .eq("id", jobId);
        console.log("Job stopped - Supadata API limit exceeded");
      } else if (!hasMoreWork) {
        // All done - mark job as completed
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            last_run_duration_seconds: durationSeconds,
            error_message: null,
          })
          .eq("id", jobId);
        console.log("Job completed - all transcripts processed");
      } else {
        // More work remains - self-invoke to continue using EdgeRuntime.waitUntil
        console.log(
          `Time limit reached. Remaining: ${remainingTitles} titles, ${remainingSeasons} seasons. Self-invoking...`,
        );

        const selfInvoke = async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-trailers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ jobId }),
            });
            console.log(`Self-invocation response: ${response.status}`);
          } catch (error) {
            console.error("Self-invoke failed:", error);
          }
        };

        // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
        EdgeRuntime.waitUntil(selfInvoke());
      }
    }

    const totalProcessed = totalTitlesProcessed + totalSeasonsProcessed;
    return new Response(
      JSON.stringify({
        message: `Processed ${totalProcessed} items (${totalTitlesProcessed} titles, ${totalSeasonsProcessed} seasons)`,
        titlesProcessed: totalTitlesProcessed,
        seasonsProcessed: totalSeasonsProcessed,
        supadataLimitExceeded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// FUNCTION 16: classify-title-ai
// Location: supabase/functions/classify-title-ai/index.ts
// ============================================================================

// ============================================================================
// ViiB — Combined AI Classification (Emotions + Intents in ONE API call)
// ============================================================================
// 50% cost savings: Input tokens sent once, both classifications returned
// Uses CURSOR-BASED pagination (id > last_id) for O(1) performance
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const openai = new OpenAI({ apiKey: openaiKey });

const JOB_TYPE = "classify_ai";
const BATCH_SIZE = 10;
const MAX_CONCURRENT = 3;
const MAX_TRANSCRIPT_CHARS = 4000;
const MAX_RUNTIME_MS = 85000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid intent types from the enum
const INTENT_TYPES = [
  "adrenaline_rush",
  "background_passive",
  "comfort_escape",
  "deep_thought",
  "discovery",
  "emotional_release",
  "family_bonding",
  "light_entertainment",
] as const;

type IntentType = (typeof INTENT_TYPES)[number];

interface TitleRow {
  id: string;
  title_type: "movie" | "tv" | string | null;
  name: string | null;
  overview: string | null;
  trailer_transcript: string | null;
  original_language: string | null;
  title_genres?: string[] | null;
}

interface EmotionRow {
  id: string;
  emotion_label: string;
}

interface ModelEmotion {
  emotion_label: string;
  intensity_level: number;
}

interface ModelIntent {
  intent_type: IntentType;
  confidence_score: number;
}

interface ModelResponse {
  title: string;
  emotions: ModelEmotion[];
  intents: ModelIntent[];
}

interface JobConfig {
  last_processed_id?: string | null;
}

// ---------------------------------------------------------------------
// Job helpers
// ---------------------------------------------------------------------
async function getJobConfig(): Promise<{ status: string; config: JobConfig }> {
  const { data } = await supabase.from("jobs").select("status, configuration").eq("job_type", JOB_TYPE).single();
  return {
    status: data?.status ?? "idle",
    config: (data?.configuration as JobConfig) ?? {},
  };
}

async function incrementJobTitles(count: number): Promise<void> {
  await supabase.rpc("increment_job_titles", {
    p_job_type: JOB_TYPE,
    p_increment: count,
  });
}

async function markJobComplete(): Promise<void> {
  await supabase.from("jobs").update({ status: "idle", error_message: null }).eq("job_type", JOB_TYPE);
}

// ---------------------------------------------------------------------
// Simple concurrency pool
// ---------------------------------------------------------------------
async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  async function next(): Promise<void> {
    const index = i++;
    if (index >= items.length) return;
    results[index] = await worker(items[index]);
    await next();
  }

  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(limit, items.length); w++) {
    workers.push(next());
  }

  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------
// Combined Prompt builders (Emotions + Intents in ONE call)
// ---------------------------------------------------------------------
function buildSystemPrompt(emotionLabels: string[]): string {
  return `You are an expert in emotional content modeling and viewer intent analysis for movies and TV series.

You will provide TWO classifications in a SINGLE response:

1. EMOTIONS: Estimate which emotions a viewer experiences while watching, with intensity (1-10).
2. INTENTS: Classify what viewing intent the title satisfies - WHY someone would watch this.

IMPORTANT WEIGHTING:
- IF trailer transcript provided: treat as PRIMARY signal (~80% weight)
- IF NO transcript: infer from overview, genres, title, tone

EMOTION VOCABULARY (use ONLY these):
${emotionLabels.join(", ")}

INTENT TYPES (use ONLY these exact labels):
- adrenaline_rush: Action-packed, exciting, heart-pounding content
- background_passive: Light content suitable for background watching
- comfort_escape: Familiar, cozy content for relaxation
- deep_thought: Intellectually stimulating content
- discovery: Educational or eye-opening content
- emotional_release: Content for cathartic emotional expression
- family_bonding: Appropriate for family viewing together
- light_entertainment: Fun, easy-to-watch casual content

Output: SINGLE JSON object with:
- "emotions": array of 3-15 emotions with emotion_label and intensity_level (1-10)
- "intents": array of 1-3 intents with intent_type and confidence_score (0.0-1.0)

DO NOT invent labels. NO explanation text. Only JSON.`;
}

function buildUserPrompt(t: TitleRow): string {
  const hasTranscript = !!t.trailer_transcript?.trim();
  const genres = Array.isArray(t.title_genres) ? t.title_genres.filter(Boolean) : [];

  return `
Title Type: ${t.title_type === "tv" ? "TV SERIES" : "MOVIE"}
Title: ${t.name ?? "(unknown)"}
Language: ${t.original_language ?? "(unknown)"}
Genres: ${genres.length ? genres.join(", ") : "(none)"}

${hasTranscript ? "Transcript (PRIMARY):" : "Overview:"}
${hasTranscript ? t.trailer_transcript!.slice(0, MAX_TRANSCRIPT_CHARS) : t.overview || "(no overview)"}

Return ONLY JSON: { "title": "...", "emotions": [...], "intents": [...] }`;
}

// ---------------------------------------------------------------------
// AI classification (COMBINED - both emotions and intents)
// ---------------------------------------------------------------------
async function classifyWithAI(title: TitleRow, emotionLabels: string[]): Promise<ModelResponse | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: buildSystemPrompt(emotionLabels) },
        { role: "user", content: buildUserPrompt(title) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    return raw ? (JSON.parse(raw) as ModelResponse) : null;
  } catch (err) {
    console.error("AI error for title:", title.id, err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Insert staging rows for emotions
// ---------------------------------------------------------------------
async function insertEmotionStagingRows(
  titleId: string,
  emotions: ModelEmotion[],
  emotionLabelToId: Map<string, string>,
) {
  const payload = emotions
    .filter((e) => emotionLabelToId.has(e.emotion_label))
    .map((e) => ({
      title_id: titleId,
      emotion_id: emotionLabelToId.get(e.emotion_label)!,
      intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
      source: "ai",
    }));

  if (!payload.length) return 0;

  const { error } = await supabase
    .from("viib_emotion_classified_titles_staging")
    .upsert(payload, { onConflict: "title_id,emotion_id", ignoreDuplicates: true });
  if (error) throw error;
  return payload.length;
}

// ---------------------------------------------------------------------
// Insert staging rows for intents
// ---------------------------------------------------------------------
async function insertIntentStagingRows(titleId: string, intents: ModelIntent[]) {
  const payload = intents
    .filter((i) => INTENT_TYPES.includes(i.intent_type))
    .map((i) => ({
      title_id: titleId,
      intent_type: i.intent_type,
      confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
      source: "ai",
    }));

  if (!payload.length) return 0;

  const { error } = await supabase
    .from("viib_intent_classified_titles_staging")
    .upsert(payload, { onConflict: "title_id,intent_type", ignoreDuplicates: true });
  if (error) throw error;
  return payload.length;
}

// ---------------------------------------------------------------------
// Background processing logic
// Classifies titles NOT in EITHER primary table
// ---------------------------------------------------------------------
async function processClassificationBatch(cursor?: string): Promise<void> {
  const startTime = Date.now();

  // Check job status
  const { status } = await getJobConfig();
  if (status !== "running") {
    console.log("Job not running, exiting.");
    return;
  }

  // Get counts for progress tracking
  const { count: totalTitles } = await supabase.from("titles").select("id", { count: "exact", head: true });

  console.log(`Total titles in catalog: ${totalTitles}`);

  // Load emotion vocabulary
  const { data: emotions, error: emoErr } = await supabase
    .from("emotion_master")
    .select("id, emotion_label")
    .eq("category", "content_state");

  if (emoErr || !emotions?.length) {
    console.error("Failed to load emotion_master:", emoErr);
    return;
  }

  const emotionLabelToId = new Map<string, string>();
  const emotionLabels: string[] = [];
  for (const e of emotions as EmotionRow[]) {
    emotionLabels.push(e.emotion_label);
    emotionLabelToId.set(e.emotion_label, e.id);
  }

  let totalProcessed = 0;
  let currentCursor: string | null = cursor || null;

  // Continuous batch processing within time limit
  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    // Check job status each batch
    const jobStatus = await getJobConfig();
    if (jobStatus?.status !== "running") {
      console.log("Job stopped by user, aborting.");
      return;
    }

    // Get a batch of titles starting from cursor
    let query = supabase
      .from("titles")
      .select("id, name, title_type, overview, trailer_transcript, original_language, title_genres")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE * 3);

    if (currentCursor) {
      query = query.gt("id", currentCursor);
    }

    const { data: candidateTitles, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching titles:", fetchError);
      return;
    }

    if (!candidateTitles || candidateTitles.length === 0) {
      console.log("No more titles to check!");
      await markJobComplete();
      return;
    }

    // Check BOTH primary tables AND staging tables for these titles
    const candidateIds = candidateTitles.map((t) => t.id);

    // Check emotion primary table
    const { data: emotionClassified } = await supabase
      .from("viib_emotion_classified_titles")
      .select("title_id")
      .in("title_id", candidateIds);

    // Check intent primary table
    const { data: intentClassified } = await supabase
      .from("viib_intent_classified_titles")
      .select("title_id")
      .in("title_id", candidateIds);

    // Check emotion staging table (already classified but not yet promoted)
    const { data: emotionStaging } = await supabase
      .from("viib_emotion_classified_titles_staging")
      .select("title_id")
      .in("title_id", candidateIds);

    // Check intent staging table (already classified but not yet promoted)
    const { data: intentStaging } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id")
      .in("title_id", candidateIds);

    // Build sets of already done title_ids (primary OR staging counts as done)
    const emotionDoneSet = new Set<string>([
      ...(emotionClassified || []).map((r) => r.title_id),
      ...(emotionStaging || []).map((r) => r.title_id),
    ]);
    const intentDoneSet = new Set<string>([
      ...(intentClassified || []).map((r) => r.title_id),
      ...(intentStaging || []).map((r) => r.title_id),
    ]);

    // A title needs processing if it's missing from BOTH primary AND staging for EITHER type
    const needsProcessing = candidateTitles.filter((t) => !emotionDoneSet.has(t.id) || !intentDoneSet.has(t.id));

    const batch = needsProcessing.slice(0, BATCH_SIZE);

    // Update cursor to last candidate checked
    currentCursor = candidateTitles[candidateTitles.length - 1].id;

    console.log(
      `Checked ${candidateTitles.length}, needs processing: ${needsProcessing.length}, batch: ${batch.length}, cursor: ${currentCursor}`,
    );

    // If this batch has nothing to process, continue to next cursor
    if (!batch || batch.length === 0) {
      console.log(`No titles to process in this range, continuing...`);
      continue;
    }

    console.log(`Processing batch of ${batch.length} titles with COMBINED AI call...`);
    let batchProcessed = 0;

    await runWithConcurrency(batch as TitleRow[], MAX_CONCURRENT, async (title) => {
      const label = title.name ?? title.id;
      console.log(`→ Classifying ${label} (emotions + intents)`);

      try {
        const result = await classifyWithAI(title, emotionLabels);
        if (!result) return;

        let emotionsSaved = 0;
        let intentsSaved = 0;

        // ALWAYS save BOTH to staging - promote job handles deduplication via primary table check
        // This ensures no title is missed for either classification
        if (result.emotions?.length) {
          const cleanedEmotions = result.emotions
            .filter((e) => emotionLabels.includes(e.emotion_label))
            .map((e) => ({
              emotion_label: e.emotion_label,
              intensity_level: Math.min(10, Math.max(1, Math.round(e.intensity_level))),
            }));

          if (cleanedEmotions.length) {
            emotionsSaved = await insertEmotionStagingRows(title.id, cleanedEmotions, emotionLabelToId);
          }
        }

        if (result.intents?.length) {
          const cleanedIntents = result.intents
            .filter((i) => INTENT_TYPES.includes(i.intent_type))
            .map((i) => ({
              intent_type: i.intent_type,
              confidence_score: Math.min(1.0, Math.max(0.0, i.confidence_score)),
            }));

          if (cleanedIntents.length) {
            intentsSaved = await insertIntentStagingRows(title.id, cleanedIntents);
          }
        }

        if (emotionsSaved > 0 || intentsSaved > 0) {
          batchProcessed++;
          console.log(`✓ ${title.id}: ${emotionsSaved} emotions, ${intentsSaved} intents saved`);
        }
      } catch (err) {
        console.error("Error processing title:", title.id, err);
      }
    });

    if (batchProcessed > 0) {
      await incrementJobTitles(batchProcessed);
      totalProcessed += batchProcessed;
    }

    // Small delay between batches
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Batch complete. Processed: ${totalProcessed}, cursor: ${currentCursor}`);

  // Self-invoke for next batch if more work remains
  const { status: finalStatus } = await getJobConfig();
  if (finalStatus === "running") {
    console.log(`Self-invoking next batch with cursor ${currentCursor}...`);

    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/classify-title-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ continuation: true, cursor: currentCursor }),
      }).catch((err) => console.error("Self-invoke failed:", err)),
    );
  }
}

// ---------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Continuation call
    if (body.continuation) {
      EdgeRuntime.waitUntil(processClassificationBatch(body.cursor));
      return new Response(JSON.stringify({ message: "Continuation batch started", cursor: body.cursor }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initial call - start fresh
    console.log("▶ classify-title-ai job started (combined emotions + intents)");

    EdgeRuntime.waitUntil(processClassificationBatch());

    return new Response(
      JSON.stringify({
        message: "Combined AI classification job started in background",
        status: "running",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error starting classify-title-ai:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// FUNCTION 17: promote-title-ai
// Location: supabase/functions/promote-title-ai/index.ts
// ============================================================================

// ============================================================================
// ViiB — Promote AI Classifications (Emotions + Intents from Staging → Final)
// ============================================================================
// WHAT THIS FUNCTION DOES:
// 1. Reads rows from viib_emotion_classified_titles_staging where source='ai'
// 2. Reads rows from viib_intent_classified_titles_staging where source='ai'
// 3. Takes up to N distinct title_ids (batch mode)
// 4. Promotes emotions: delete old -> insert new -> delete staging
// 5. Promotes intents: delete old -> insert new -> delete staging
// 6. Returns a JSON summary
//
// EFFICIENT: Combines both promotion jobs into one to reduce overhead
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const DEFAULT_BATCH_SIZE = 50;
const JOB_TYPE = "promote_ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// JSON helpers
// ============================================================================
function jsonOk(obj: any) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// ============================================================================
// Job status helpers
// ============================================================================
async function getJobStatus(): Promise<string | null> {
  const { data } = await supabase.from("jobs").select("status").eq("job_type", JOB_TYPE).maybeSingle();
  return data?.status || null;
}

async function updateJobProgress(titlesProcessed: number) {
  await supabase.rpc("increment_job_titles", {
    p_job_type: JOB_TYPE,
    p_increment: titlesProcessed,
  });
}

async function markJobComplete() {
  await supabase
    .from("jobs")
    .update({
      status: "idle",
      error_message: null,
    })
    .eq("job_type", JOB_TYPE);
}

async function markJobError(message: string) {
  await supabase
    .from("jobs")
    .update({
      status: "failed",
      error_message: message,
    })
    .eq("job_type", JOB_TYPE);
}

// ============================================================================
// EDGE FUNCTION START
// ============================================================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize: number = body.batchSize ?? DEFAULT_BATCH_SIZE;

  console.log(`\n▶ promote-title-ai — START (batchSize=${batchSize})`);

  // Check if job was stopped
  const jobStatus = await getJobStatus();
  if (jobStatus === "stopped") {
    console.log("Job stopped, exiting.");
    return jsonOk({ message: "Job stopped by user" });
  }

  let emotionsPromoted = 0;
  let intentsPromoted = 0;
  let emotionRowsInserted = 0;
  let intentRowsInserted = 0;

  // ------------------------------------------------------------------------
  // PART 1: PROMOTE EMOTIONS
  // ------------------------------------------------------------------------
  const { data: emotionTitles, error: emotionErr } = await supabase
    .from("viib_emotion_classified_titles_staging")
    .select("title_id")
    .eq("source", "ai")
    .limit(batchSize);

  if (emotionErr) {
    console.error("Error loading emotion staging titles:", emotionErr);
  }

  if (emotionTitles && emotionTitles.length > 0) {
    const emotionTitleIds = [...new Set(emotionTitles.map((r: any) => r.title_id))];
    console.log(`Promoting ${emotionTitleIds.length} emotion titles...`);

    // Fetch staging rows
    const { data: emotionRows, error: stagingErr } = await supabase
      .from("viib_emotion_classified_titles_staging")
      .select("title_id, emotion_id, intensity_level, source")
      .in("title_id", emotionTitleIds)
      .eq("source", "ai");

    if (!stagingErr && emotionRows && emotionRows.length > 0) {
      // Map to final format
      const finalEmotionRows = emotionRows.map((r: any) => ({
        title_id: r.title_id,
        emotion_id: r.emotion_id,
        intensity_level: r.intensity_level,
        source: "ai",
      }));

      // Delete old emotions
      await supabase.from("viib_emotion_classified_titles").delete().in("title_id", emotionTitleIds);

      // Insert new emotions
      const { error: insertErr } = await supabase.from("viib_emotion_classified_titles").insert(finalEmotionRows);

      if (!insertErr) {
        emotionRowsInserted = finalEmotionRows.length;
        emotionsPromoted = emotionTitleIds.length;

        // Delete staging rows
        await supabase
          .from("viib_emotion_classified_titles_staging")
          .delete()
          .in("title_id", emotionTitleIds)
          .eq("source", "ai");
      } else {
        console.error("Failed to insert emotions:", insertErr);
      }
    }
  }

  // ------------------------------------------------------------------------
  // PART 2: PROMOTE INTENTS
  // ------------------------------------------------------------------------
  const { data: intentTitles, error: intentErr } = await supabase
    .from("viib_intent_classified_titles_staging")
    .select("title_id")
    .eq("source", "ai")
    .limit(batchSize);

  if (intentErr) {
    console.error("Error loading intent staging titles:", intentErr);
  }

  if (intentTitles && intentTitles.length > 0) {
    const intentTitleIds = [...new Set(intentTitles.map((r: any) => r.title_id))];
    console.log(`Promoting ${intentTitleIds.length} intent titles...`);

    // Fetch staging rows
    const { data: intentRows, error: stagingErr } = await supabase
      .from("viib_intent_classified_titles_staging")
      .select("title_id, intent_type, confidence_score, source")
      .in("title_id", intentTitleIds)
      .eq("source", "ai");

    if (!stagingErr && intentRows && intentRows.length > 0) {
      // Map to final format
      const finalIntentRows = intentRows.map((r: any) => ({
        title_id: r.title_id,
        intent_type: r.intent_type,
        confidence_score: r.confidence_score,
        source: "ai",
      }));

      // Delete old intents
      await supabase.from("viib_intent_classified_titles").delete().in("title_id", intentTitleIds);

      // Insert new intents
      const { error: insertErr } = await supabase.from("viib_intent_classified_titles").insert(finalIntentRows);

      if (!insertErr) {
        intentRowsInserted = finalIntentRows.length;
        intentsPromoted = intentTitleIds.length;

        // Delete staging rows
        await supabase
          .from("viib_intent_classified_titles_staging")
          .delete()
          .in("title_id", intentTitleIds)
          .eq("source", "ai");
      } else {
        console.error("Failed to insert intents:", insertErr);
      }
    }
  }

  // Update job progress
  const totalPromoted = Math.max(emotionsPromoted, intentsPromoted);
  if (totalPromoted > 0) {
    await updateJobProgress(totalPromoted);
  }

  // ------------------------------------------------------------------------
  // CHECK IF MORE WORK REMAINS
  // ------------------------------------------------------------------------
  const { count: remainingEmotions } = await supabase
    .from("viib_emotion_classified_titles_staging")
    .select("*", { count: "exact", head: true })
    .eq("source", "ai");

  const { count: remainingIntents } = await supabase
    .from("viib_intent_classified_titles_staging")
    .select("*", { count: "exact", head: true })
    .eq("source", "ai");

  const hasMoreWork = (remainingEmotions && remainingEmotions > 0) || (remainingIntents && remainingIntents > 0);

  if (hasMoreWork) {
    console.log(`Remaining: ${remainingEmotions || 0} emotions, ${remainingIntents || 0} intents. Self-invoking...`);

    EdgeRuntime.waitUntil(
      fetch(`${supabaseUrl}/functions/v1/promote-title-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ batchSize }),
      }).catch((err) => console.error("Self-invoke failed:", err)),
    );

    return jsonOk({
      message: "Batch complete, continuing...",
      emotions_promoted: emotionsPromoted,
      intents_promoted: intentsPromoted,
      emotion_rows_inserted: emotionRowsInserted,
      intent_rows_inserted: intentRowsInserted,
      remaining_emotions: remainingEmotions || 0,
      remaining_intents: remainingIntents || 0,
    });
  }

  // Mark complete
  await markJobComplete();
  console.log("▶ promote-title-ai — COMPLETE\n");

  return jsonOk({
    message: "Promotion complete.",
    emotions_promoted: emotionsPromoted,
    intents_promoted: intentsPromoted,
    emotion_rows_inserted: emotionRowsInserted,
    intent_rows_inserted: intentRowsInserted,
  });
});
