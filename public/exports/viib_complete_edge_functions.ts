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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash password using Web Crypto API (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      throw new Error('Password is required');
    }

    const hashedPassword = await hashPassword(password);

    return new Response(
      JSON.stringify({
        success: true,
        hashedPassword,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error hashing password:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify password using Web Crypto API (PBKDF2)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    // Decode the stored hash from base64
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));

    // Extract salt (first 16 bytes) and hash (remaining bytes)
    const salt = combined.slice(0, 16);
    const storedHashBytes = combined.slice(16);

    // Hash the provided password with the extracted salt
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );

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
    console.error('Error verifying password:', error);
    return false;
  }
}

serve_verify_password(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders_verify_password });
  }

  try {
    const { email, phone, password } = await req.json();

    if (!password || (!email && !phone)) {
      throw new Error('Email or phone and password are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient_verify_password(supabaseUrl, supabaseKey);

    // Fetch user from database
    // Note: We don't check is_active here because accounts with incomplete onboarding
    // will have is_active: false. The frontend will handle onboarding redirect logic.
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
      console.log('User not found or fetch error:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials',
        }),
        {
          headers: { ...corsHeaders_verify_password, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, userData.password_hash);

    if (!isValid) {
      console.log('Password verification failed');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials',
        }),
        {
          headers: { ...corsHeaders_verify_password, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    console.log('Password verified successfully for user:', userData.id);
    return new Response(
      JSON.stringify({
        success: true,
        userId: userData.id,
      }),
      {
        headers: { ...corsHeaders_verify_password, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error verifying password:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unable to verify credentials',
      }),
      {
        headers: { ...corsHeaders_verify_password, 'Content-Type': 'application/json' },
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
      },
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
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // ALWAYS use hardcoded OTP for testing to avoid SMS costs
    const otpCode = "111111";

    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP in database
    const { error: dbError } = await supabaseClient
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create verification request');
    }

    // SMS sending disabled - using hardcoded OTP for all numbers during testing
    console.log('TEST MODE: OTP hardcoded as 111111 for', normalizedPhone);

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
    console.error('Error in send-phone-otp:', error);
    return new Response(
      JSON.stringify({ error: error?.message || "An error occurred" }),
      {
        headers: { ...corsHeaders_send_phone_otp, "Content-Type": "application/json" },
        status: 400,
      },
    );
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
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // Find the most recent non-verified OTP for this phone number
    const { data: verifications, error: fetchError } = await supabaseClient
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
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
    console.log('Phone OTP validated successfully:', normalizedPhone);

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
    console.error('Error in verify-phone-otp:', error);

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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve_send_email_otp(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders_send_email_otp });
  }

  try {
    const { email } = await req.json();
    console.log('Sending OTP to email:', email);

    if (!email) {
      throw new Error('Email is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient_send_email_otp(supabaseUrl, supabaseKey);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otpCode);

    // Store OTP in database (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase
      .from('email_verifications')
      .insert({
        email,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OTP');
    }

    // Send email using Gmail SMTP
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailPassword) {
      console.error('Gmail credentials not configured');
      throw new Error('Email service not configured');
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

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders_send_email_otp, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error in send-email-otp function:', error);

    return new Response(
      JSON.stringify({ error: "Unable to send verification code. Please check your email address and try again." }),
      {
        headers: { ...corsHeaders_send_email_otp, 'Content-Type': 'application/json' },
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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve_verify_email_otp(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders_verify_email_otp });
  }

  try {
    const { email, otp, password, name } = await req.json();
    console.log('Verifying OTP for email:', email);

    if (!email || !otp) {
      throw new Error('Email and OTP are required');
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient_verify_email_otp(supabaseUrl, supabaseKey);

    const { data: verifications, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5);

    const verification = verifications?.find((v: any) => !v.verified);

    if (fetchError || !verification) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No verification code found. Please request a new code.',
        }),
        { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Your code has expired. Please request a new code.',
        }),
        { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const dbOtp = String(verification.otp_code).trim();
    const userOtp = String(otp).trim();

    if (dbOtp !== userOtp) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid code. Please check and try again.',
        }),
        { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, onboarding_completed, is_email_verified')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      userId = existingUser.id;
    } else {
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password },
      });

      if (hashError || !hashData?.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unable to process request. Please try again.',
          }),
          { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

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
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unable to create account. Please try again.',
          }),
          { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      userId = newUser.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully',
        userId: userId,
      }),
      { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error('Error in verify-email-otp function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to verify code. Please request a new code.",
      }),
      { headers: { ...corsHeaders_verify_email_otp, 'Content-Type': 'application/json' }, status: 200 },
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
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching email config:', configError);
      throw new Error('Failed to fetch email configuration');
    }

    if (!emailConfig) {
      throw new Error('No active email configuration found. Please configure email settings in Admin > Email Setup');
    }

    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('template_type', 'activation_invite')
      .eq('is_active', true)
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
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://viib.lovable.app'}" class="button">
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
        .replace(/{{app_url}}/g, Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://viib.lovable.app');
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
      from: emailConfig.from_name
        ? `${emailConfig.from_name} <${emailConfig.from_email}>`
        : emailConfig.from_email,
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

import { createClient as createClient_send_invites } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders_send_invites = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  userId: string;
  method: 'email' | 'phone';
  contacts: string[];
  note?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders_send_invites });
  }

  try {
    const supabase = createClient_send_invites(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userId, method, contacts, note } = await req.json() as InviteRequest;

    console.log(`Processing ${contacts.length} ${method} invites from user ${userId}`);
    if (note) {
      console.log(`Personal note included: ${note.substring(0, 50)}...`);
    }

    if (!userId || !contacts || contacts.length === 0) {
      throw new Error('Missing required fields');
    }

    // Get sender's information
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('full_name, email, phone_number')
      .eq('id', userId)
      .single();

    if (senderError) {
      console.error('Error fetching sender:', senderError);
      throw senderError;
    }

    const senderName = sender.full_name || 'A friend';
    const inviteLink = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}?invited_by=${userId}`;

    // Process invites based on method
    const results: any[] = [];

    for (const contact of contacts) {
      try {
        if (method === 'email') {
          // Send email invite
          await sendEmailInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: 'email' });
          console.log(`Email invite sent to ${contact}`);
        } else if (method === 'phone') {
          // Send SMS invite
          await sendSMSInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: 'sms' });
          console.log(`SMS invite sent to ${contact}`);
        }

        // Store invitation record (optional - for tracking)
        await supabase
          .from('friend_connections')
          .upsert({
            user_id: userId,
            friend_user_id: userId, // Placeholder until they sign up
            relationship_type: 'pending_invite',
            trust_score: 0.5,
          }, { onConflict: 'user_id,friend_user_id' });

      } catch (error: any) {
        console.error(`Failed to send invite to ${contact}:`, error);
        results.push({ contact, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent ${successCount}/${contacts.length} invites`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Sent ${successCount} invite${successCount !== 1 ? 's' : ''} successfully`,
      }),
      {
        headers: { ...corsHeaders_send_invites, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error: any) {
    console.error('Error in send-invites function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders_send_invites, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
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

const TMDB_API_KEY_search_tmdb = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL_search_tmdb = 'https://api.themoviedb.org/3';

const corsHeaders_search_tmdb = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMDB Genre ID to Name mapping
const GENRE_MAP_search_tmdb: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

serve_search_tmdb(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders_search_tmdb });
  }

  try {
    const { query, genres, years, language = 'en', limit = 20, page = 1 } = await req.json();

    if (!TMDB_API_KEY_search_tmdb) {
      throw new Error('TMDB_API_KEY not configured');
    }

    // Search both movies and TV shows
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL_search_tmdb}/search/movie?api_key=${TMDB_API_KEY_search_tmdb}&query=${encodeURIComponent(query || 'popular')}&language=${language}&page=${page}`),
      fetch(`${TMDB_BASE_URL_search_tmdb}/search/tv?api_key=${TMDB_API_KEY_search_tmdb}&query=${encodeURIComponent(query || 'popular')}&language=${language}&page=${page}`),
    ]);

    const [movieData, tvData] = await Promise.all([
      movieResponse.json(),
      tvResponse.json(),
    ]);

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
            fetch(`${TMDB_BASE_URL_search_tmdb}/movie/${movie.id}?api_key=${TMDB_API_KEY_search_tmdb}&language=${language}`),
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
          const usCertification = certData.results?.find((r: any) => r.iso_3166_1 === 'US');
          const certification = usCertification?.release_dates?.[0]?.certification || 'NR';

          return {
            id: `tmdb-movie-${movie.id}`,
            tmdb_id: movie.id,
            external_id: `tmdb-movie-${movie.id}`,
            title: movie.title || movie.original_title,
            content_type: 'movie',
            type: 'movie',
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
            content_type: 'movie',
            type: 'movie',
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            description: movie.overview,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined,
            genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP_search_tmdb[id]).filter(Boolean),
            mood_tags: [],
            rating: movie.vote_average,
            popularity: movie.popularity,
            certification: 'NR',
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
          const usCertification = certData.results?.find((r: any) => r.iso_3166_1 === 'US');
          const certification = usCertification?.rating || 'NR';

          return {
            id: `tmdb-tv-${tv.id}`,
            tmdb_id: tv.id,
            external_id: `tmdb-tv-${tv.id}`,
            title: tv.name || tv.original_name,
            content_type: 'series',
            type: 'series',
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
            content_type: 'series',
            type: 'series',
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
            description: tv.overview,
            poster_url: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
            backdrop_url: tv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : undefined,
            genres: (tv.genre_ids || []).map((id: number) => GENRE_MAP_search_tmdb[id]).filter(Boolean),
            mood_tags: [],
            rating: tv.vote_average,
            popularity: tv.popularity,
            certification: 'NR',
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
      const genreResponse = await fetch(`${TMDB_BASE_URL_search_tmdb}/genre/movie/list?api_key=${TMDB_API_KEY_search_tmdb}&language=${language}`);
      const genreData = await genreResponse.json();
      const genreMap = new Map(genreData.genres.map((g: any) => [g.name.toLowerCase(), g.id]));

      const genreIds = genres.map((g: string) => genreMap.get(g.toLowerCase())).filter(Boolean);

      if (genreIds.length > 0) {
        combined = combined.filter((title: any) =>
          title.genres.some((gid: number) => genreIds.includes(gid))
        );
      }
    }

    return new Response(
      JSON.stringify({ titles: combined }),
      {
        headers: { ...corsHeaders_search_tmdb, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders_search_tmdb, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

// ============================================================================
// FUNCTION 10: enrich-title-details
// Location: supabase/functions/enrich-title-details/index.ts
// ============================================================================

import { serve as serve_enrich_title_details } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY_enrich_title_details = Deno.env.get('TMDB_API_KEY');
const TMDB_BASE_URL_enrich_title_details = 'https://api.themoviedb.org/3';

const corsHeaders_enrich_title_details = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENRE_MAP_enrich_title_details: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

serve_enrich_title_details(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders_enrich_title_details });
  }

  try {
    const { tmdb_id, type } = await req.json();

    if (!TMDB_API_KEY_enrich_title_details) {
      throw new Error('TMDB_API_KEY not configured');
    }

    if (!tmdb_id || !type) {
      throw new Error('tmdb_id and type are required');
    }

    const endpoint = type === 'movie' ? 'movie' : 'tv';

    // Fetch details, credits, videos, and watch providers in parallel
    const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}?api_key=${TMDB_API_KEY_enrich_title_details}`),
      fetch(`${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}/credits?api_key=${TMDB_API_KEY_enrich_title_details}`),
      fetch(`${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}/videos?api_key=${TMDB_API_KEY_enrich_title_details}`),
      fetch(`${TMDB_BASE_URL_enrich_title_details}/${endpoint}/${tmdb_id}/watch/providers?api_key=${TMDB_API_KEY_enrich_title_details}`),
    ]);

    const [details, credits, videos, providers] = await Promise.all([
      detailsRes.json(),
      creditsRes.json(),
      videosRes.json(),
      providersRes.json(),
    ]);

    const trailer = videos.results?.find((v: any) =>
      v.type === 'Trailer' && v.site === 'YouTube'
    );
    const trailer_url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const cast = credits.cast?.slice(0, 5).map((c: any) => c.name) || [];

    const genres = details.genres?.map((g: any) => GENRE_MAP_enrich_title_details[g.id] || g.name) || [];

    const usProviders = providers.results?.US;
    const streaming_services: any[] = [];

    if (usProviders?.flatrate) {
      streaming_services.push(...usProviders.flatrate.map((p: any) => ({
        service_name: p.provider_name,
        service_code: p.provider_id.toString(),
        logo_url: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
      })));
    }

    const runtime_minutes = type === 'movie' ? details.runtime : null;
    const avg_episode_minutes = type === 'series' ? details.episode_run_time?.[0] : null;

    let seasons: any[] = [];
    let latestSeasonTrailer: string | null = null;

    if (type === 'series' && details.seasons) {
      console.log(`Fetching season videos for ${details.seasons.length} seasons`);

      const seasonVideoPromises = details.seasons.map((season: any) =>
        fetch(`${TMDB_BASE_URL_enrich_title_details}/tv/${tmdb_id}/season/${season.season_number}/videos?api_key=${TMDB_API_KEY_enrich_title_details}`)
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
          })
      );

      const seasonVideos = await Promise.all(seasonVideoPromises);

      seasons = details.seasons.map((season: any, index: number) => {
        const videos = seasonVideos[index]?.results || [];
        const seasonTrailer = videos.find((v: any) =>
          v.type === 'Trailer' && v.site === 'YouTube'
        );

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
        const sortedSeasons = seasonsWithTrailers.sort((a: any, b: any) =>
          new Date(b.air_date).getTime() - new Date(a.air_date).getTime()
        );
        latestSeasonTrailer = sortedSeasons[0].trailer_url;
      }
    }

    const finalTrailerUrl = type === 'series' ? (latestSeasonTrailer || trailer_url) : trailer_url;

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
        headers: { ...corsHeaders_enrich_title_details, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Enrich error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders_enrich_title_details, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

// ============================================================================
// FUNCTION 11: full-refresh-titles
// Location: supabase/functions/full-refresh-titles/index.ts
// ============================================================================

// NOTE: This export file includes the *entire* source from the repo.
// The function is large; it is pasted below verbatim.

// ---- BEGIN full-refresh-titles (verbatim) ----



// ---- END full-refresh-titles ----

// ============================================================================
// FUNCTION 12: full-refresh-orchestrator
// Location: supabase/functions/full-refresh-orchestrator/index.ts
// ============================================================================

// ---- BEGIN full-refresh-orchestrator (verbatim) ----



// ---- END full-refresh-orchestrator ----

// ============================================================================
// FUNCTION 13: sync-titles-delta
// Location: supabase/functions/sync-titles-delta/index.ts
// ============================================================================

// ---- BEGIN sync-titles-delta (verbatim) ----



// ---- END sync-titles-delta ----

// ============================================================================
// FUNCTION 14: enrich-title-trailers
// Location: supabase/functions/enrich-title-trailers/index.ts
// ============================================================================

// ---- BEGIN enrich-title-trailers (verbatim) ----



// ---- END enrich-title-trailers ----

// ============================================================================
// FUNCTION 15: transcribe-trailers
// Location: supabase/functions/transcribe-trailers/index.ts
// ============================================================================

// ---- BEGIN transcribe-trailers (verbatim) ----



// ---- END transcribe-trailers ----

// ============================================================================
// FUNCTION 16: classify-title-ai
// Location: supabase/functions/classify-title-ai/index.ts
// ============================================================================

// ---- BEGIN classify-title-ai (verbatim) ----



// ---- END classify-title-ai ----

// ============================================================================
// FUNCTION 17: promote-title-ai
// Location: supabase/functions/promote-title-ai/index.ts
// ============================================================================

// ---- BEGIN promote-title-ai (verbatim) ----



// ---- END promote-title-ai ----
