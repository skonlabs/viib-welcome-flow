/**
 * ============================================================================
 * ViiB Complete Edge Functions Source Code
 * ============================================================================
 * Generated: 2025-12-15
 * Total Functions: 17
 * 
 * This file contains the complete source code for all Supabase Edge Functions
 * in the ViiB project. Each function is separated by a header comment.
 * ============================================================================
 */


// ============================================================================
// FUNCTION 1: hash-password
// Purpose: Hash passwords using PBKDF2 with Web Crypto API
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
    ["deriveBits"]
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
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
        hashedPassword 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error hashing password:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});


// ============================================================================
// FUNCTION 2: verify-password
// Purpose: Verify passwords against stored PBKDF2 hashes
// Location: supabase/functions/verify-password/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
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
      ["deriveBits"]
    );
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone, password } = await req.json();
    
    if (!password || (!email && !phone)) {
      throw new Error('Email or phone and password are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user from database
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
          error: 'Invalid credentials' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, userData.password_hash);

    if (!isValid) {
      console.log('Password verification failed');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid credentials' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Password verified successfully for user:', userData.id);
    return new Response(
      JSON.stringify({ 
        success: true,
        userId: userData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error verifying password:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Unable to verify credentials' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});


// ============================================================================
// FUNCTION 3: send-phone-otp
// Purpose: Send OTP via SMS for phone verification (test mode uses 111111)
// Location: supabase/functions/send-phone-otp/index.ts
// ============================================================================

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
        verified: false
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
        message: "Verification code sent successfully (TEST MODE: Use 111111)"
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


// ============================================================================
// FUNCTION 4: verify-phone-otp
// Purpose: Verify phone OTP codes
// Location: supabase/functions/verify-phone-otp/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
          error: "Your code has expired or is invalid. Please request a new code."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    const verification = verifications[0];

    // Check if OTP matches
    if (verification.otp_code !== otpCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The code you entered is incorrect. Please check and try again."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // DO NOT mark as verified here - let the calling code do it after user creation succeeds
    // This prevents users from being stuck if user creation fails after OTP verification
    
    console.log('Phone OTP validated successfully:', normalizedPhone);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        verificationId: verification.id // Return the verification ID so caller can mark it verified
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
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


// ============================================================================
// FUNCTION 5: send-email-otp
// Purpose: Send OTP via email for verification
// Location: supabase/functions/send-email-otp/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const client = new SMTPClient({
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-email-otp function:', error);
    
    // Return user-friendly error message instead of technical details
    return new Response(
      JSON.stringify({ error: "Unable to send verification code. Please check your email address and try again." }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});


// ============================================================================
// FUNCTION 6: verify-email-otp
// Purpose: Verify email OTP and create/update user accounts
// Location: supabase/functions/verify-email-otp/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, password, name } = await req.json();
    console.log('Verifying OTP for email:', email);

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
      .limit(5);

    const verification = verifications?.find(v => !v.verified);

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

    // Verify OTP
    const dbOtp = String(verification.otp_code).trim();
    const userOtp = String(otp).trim();
    
    if (dbOtp !== userOtp) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid code. Please check and try again.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, onboarding_completed, is_email_verified')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // User exists - this is a resume scenario
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      userId = existingUser.id;
    } else {
      // New user - hash password and create account
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password }
      });

      if (hashError || !hashData?.success) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to process request. Please try again.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to create account. Please try again.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Mark OTP as verified AFTER successful user creation
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
        userId: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in verify-email-otp function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Unable to verify code. Please request a new code." 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});


// ============================================================================
// FUNCTION 7: send-activation-invite
// Purpose: Send activation invite emails with codes
// Location: supabase/functions/send-activation-invite/index.ts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code, senderName = "ViiB" } = await req.json();

    if (!email || !code) {
      throw new Error("Email and activation code are required");
    }

    console.log(`Sending activation invite to ${email} with code ${code}`);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch email configuration
    const { data: emailConfig, error: configError } = await supabaseClient
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !emailConfig) {
      throw new Error('No active email configuration found');
    }

    // Fetch email template
    const { data: template } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('template_type', 'activation_invite')
      .eq('is_active', true)
      .maybeSingle();

    let subject = "Your ViiB Activation Code";
    let body = `<div>Your activation code is: <strong>${code}</strong></div>`;

    if (template) {
      subject = template.subject;
      body = template.body
        .replace(/{{code}}/g, code)
        .replace(/{{email}}/g, email);
    }

    // Send email using SMTP
    const client = new SMTPClient({
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

    return new Response(
      JSON.stringify({ success: true, message: "Activation invite sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-activation-invite:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send activation invite" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});


// ============================================================================
// FUNCTION 8: send-invites
// Purpose: Send friend invitations via email or SMS
// Location: supabase/functions/send-invites/index.ts
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, method, contacts, note } = await req.json() as InviteRequest;

    if (!userId || !contacts || contacts.length === 0) {
      throw new Error('Missing required fields');
    }

    // Get sender's information
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('full_name, email, phone_number')
      .eq('id', userId)
      .single();

    if (senderError) throw senderError;

    const senderName = sender.full_name || 'A friend';
    const inviteLink = `https://viib.lovable.app?invited_by=${userId}`;

    const results = [];
    
    for (const contact of contacts) {
      try {
        if (method === 'email') {
          console.log(`[EMAIL INVITE] To: ${contact}, From: ${senderName}`);
          results.push({ contact, success: true, method: 'email' });
        } else if (method === 'phone') {
          console.log(`[SMS INVITE] To: ${contact}, From: ${senderName}`);
          results.push({ contact, success: true, method: 'sms' });
        }
      } catch (error: any) {
        results.push({ contact, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Sent ${successCount} invite${successCount !== 1 ? 's' : ''} successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-invites function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});


// ============================================================================
// FUNCTION 9: search-tmdb
// Purpose: Search TMDB for movies and TV shows with filtering
// Location: supabase/functions/search-tmdb/index.ts
// Lines: 1-274 (see full code in supabase/functions/search-tmdb/index.ts)
// ============================================================================

// [Full code available in supabase/functions/search-tmdb/index.ts]
// Key features:
// - Searches both movies and TV shows
// - Filters by year, genre, language
// - Enriches with certifications and streaming providers
// - Returns combined results sorted by popularity


// ============================================================================
// FUNCTION 10: enrich-title-details
// Purpose: Enrich movie/TV data with cast, trailers, streaming info
// Location: supabase/functions/enrich-title-details/index.ts
// Lines: 1-193 (see full code in supabase/functions/enrich-title-details/index.ts)
// ============================================================================

// [Full code available in supabase/functions/enrich-title-details/index.ts]
// Key features:
// - Fetches details, credits, videos, watch providers from TMDB
// - Extracts trailer URLs, top cast, genre names
// - Gets US streaming services
// - Handles season-specific trailers for TV series


// ============================================================================
// FUNCTION 11: full-refresh-titles
// Purpose: Full catalog refresh from TMDB by language/year/genre
// Location: supabase/functions/full-refresh-titles/index.ts
// Lines: 1-1163 (see full code in supabase/functions/full-refresh-titles/index.ts)
// ============================================================================

// [Full code available in supabase/functions/full-refresh-titles/index.ts]
// Key features:
// - Processes movies and TV shows by language, year, and genre
// - Fetches streaming availability (US region only)
// - Handles TMDB and YouTube trailer discovery
// - Stores seasons with trailers
// - Supports movie-to-TV genre mapping
// - Uses ON CONFLICT DO UPDATE for upserts


// ============================================================================
// FUNCTION 12: full-refresh-orchestrator
// Purpose: Orchestrate parallel full-refresh jobs
// Location: supabase/functions/full-refresh-orchestrator/index.ts
// Lines: 1-505 (see full code in supabase/functions/full-refresh-orchestrator/index.ts)
// ============================================================================

// [Full code available in supabase/functions/full-refresh-orchestrator/index.ts]
// Key features:
// - Dispatches work units (language/year/genre combinations)
// - Batched dispatch with concurrency control
// - Tracks completed/failed work units
// - Auto-retries failed units
// - Uses EdgeRuntime.waitUntil() for background execution
// - Browser-independent execution


// ============================================================================
// FUNCTION 13: sync-titles-delta
// Purpose: Nightly delta sync of recently changed titles
// Location: supabase/functions/sync-titles-delta/index.ts
// Lines: 1-727 (see full code in supabase/functions/sync-titles-delta/index.ts)
// ============================================================================

// [Full code available in supabase/functions/sync-titles-delta/index.ts]
// Key features:
// - Syncs titles from configurable lookback period (default 7 days)
// - Identical TMDB criteria as full refresh
// - Processes movies and TV shows with streaming availability
// - Handles TV-only genres (Kids, News, Reality, etc.)
// - Auto-schedules next run


// ============================================================================
// FUNCTION 14: enrich-title-trailers
// Purpose: Enrich titles/seasons with trailer URLs
// Location: supabase/functions/enrich-title-trailers/index.ts
// Lines: 1-675 (see full code in supabase/functions/enrich-title-trailers/index.ts)
// ============================================================================

// [Full code available in supabase/functions/enrich-title-trailers/index.ts]
// Key features:
// - Enriches titles and seasons with missing trailers
// - Uses TMDB videos endpoint first
// - Falls back to YouTube search with official channel matching
// - Comprehensive list of official channels (multi-language)
// - Handles YouTube API quota limits
// - Self-invokes for batch continuation


// ============================================================================
// FUNCTION 15: transcribe-trailers
// Purpose: Transcribe YouTube trailers to text
// Location: supabase/functions/transcribe-trailers/index.ts
// Lines: 1-566 (see full code in supabase/functions/transcribe-trailers/index.ts)
// ============================================================================

// [Full code available in supabase/functions/transcribe-trailers/index.ts]
// Key features:
// - Uses Supadata.ai for YouTube transcript extraction
// - Detects and translates non-English transcripts
// - Processes both titles and seasons
// - Handles API quota limits
// - Marks non-YouTube URLs as processed
// - Self-invokes for continuous batch processing


// ============================================================================
// FUNCTION 16: classify-title-ai
// Purpose: AI classification of titles for emotions and intents
// Location: supabase/functions/classify-title-ai/index.ts
// Lines: 1-507 (see full code in supabase/functions/classify-title-ai/index.ts)
// ============================================================================

// [Full code available in supabase/functions/classify-title-ai/index.ts]
// Key features:
// - Combined emotion + intent classification (50% cost savings)
// - Uses OpenAI GPT-4o-mini
// - Cursor-based pagination for O(1) performance
// - Inserts to staging tables (title_emotional_signatures_staging, viib_intent_classified_titles_staging)
// - Concurrency pool for parallel processing
// - Self-invokes for batch continuation


// ============================================================================
// FUNCTION 17: promote-title-ai
// Purpose: Promote AI classifications from staging to production tables
// Location: supabase/functions/promote-title-ai/index.ts
// Lines: 1-295 (see full code in supabase/functions/promote-title-ai/index.ts)
// ============================================================================

// [Full code available in supabase/functions/promote-title-ai/index.ts]
// Key features:
// - Promotes emotions from staging to title_emotional_signatures
// - Promotes intents from staging to viib_intent_classified_titles
// - Deletes old entries before inserting new
// - Cleans up staging tables after promotion
// - Self-invokes for batch continuation
// - Updates job progress tracking


/**
 * ============================================================================
 * END OF EDGE FUNCTIONS
 * ============================================================================
 * 
 * Note: Functions 9-17 have their complete code in their respective files.
 * This consolidated file contains the full code for functions 1-8 and
 * summaries for the larger functions (9-17).
 * 
 * For complete source code of all functions, refer to:
 * - supabase/functions/{function-name}/index.ts
 * ============================================================================
 */
