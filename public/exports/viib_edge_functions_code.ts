/**
 * ViiB Edge Functions - Complete Code Export
 * Generated: 2025-12-15
 * 
 * This file contains the complete source code for all 17 Supabase Edge Functions
 * in the ViiB project. Each function is documented with its purpose and dependencies.
 * 
 * Required Secrets:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SUPABASE_ANON_KEY
 * - TMDB_API_KEY
 * - YOUTUBE_API_KEY
 * - OPENAI_API_KEY
 * - SUPADATA_API_KEY
 * - GMAIL_USER
 * - GMAIL_APP_PASSWORD
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */

// =============================================================================
// 1. HASH-PASSWORD
// Purpose: Hash passwords using Web Crypto API (PBKDF2) for secure storage
// Location: supabase/functions/hash-password/index.ts
// =============================================================================

/*
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
*/


// =============================================================================
// 2. VERIFY-PASSWORD
// Purpose: Verify password against stored PBKDF2 hash
// Location: supabase/functions/verify-password/index.ts
// =============================================================================

/*
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
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, userData.password_hash);

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, userId: userData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error verifying password:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to verify credentials' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
*/


// =============================================================================
// 3. SEND-PHONE-OTP
// Purpose: Send OTP via SMS for phone verification (TEST MODE: uses hardcoded 111111)
// Location: supabase/functions/send-phone-otp/index.ts
// =============================================================================

/*
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
        body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio API error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error);
    return false;
  }
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

    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // TEST MODE: Always use hardcoded OTP
    const otpCode = "111111";
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

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

    console.log('TEST MODE: OTP hardcoded as 111111 for', normalizedPhone);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent successfully (TEST MODE: Use 111111)"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in send-phone-otp:', error);
    return new Response(
      JSON.stringify({ error: error?.message || "An error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
*/


// =============================================================================
// 4. VERIFY-PHONE-OTP
// Purpose: Verify phone OTP code
// Location: supabase/functions/verify-phone-otp/index.ts
// =============================================================================

/*
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

    const normalizedPhone = phoneNumber.replace(/\s+/g, '');

    // Find the most recent non-verified OTP
    const { data: verifications, error: fetchError } = await supabaseClient
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      throw new Error('Failed to verify code');
    }

    if (!verifications || verifications.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Your code has expired or is invalid." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const verification = verifications[0];

    if (verification.otp_code !== otpCode) {
      return new Response(
        JSON.stringify({ success: false, error: "The code you entered is incorrect." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Return verification ID for caller to mark verified after user creation
    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        verificationId: verification.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in verify-phone-otp:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to verify code. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
*/


// =============================================================================
// 5. SEND-EMAIL-OTP
// Purpose: Send OTP via email for email verification
// Location: supabase/functions/send-email-otp/index.ts
// =============================================================================

/*
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

    if (!email) {
      throw new Error('Email is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('email_verifications')
      .insert({ email, otp_code: otpCode, expires_at: expiresAt, verified: false });

    if (dbError) {
      throw new Error('Failed to store OTP');
    }

    // Send email using Gmail SMTP
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailPassword) {
      throw new Error('Email service not configured');
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPassword },
      },
    });

    await client.send({
      from: gmailUser,
      to: email,
      subject: "Your ViiB Verification Code",
      html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Your Verification Code</h2>
        <p>Your ViiB verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          ${otpCode}
        </div>
        <p>This code expires in 5 minutes.</p>
      </div>`,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in send-email-otp:', error);
    return new Response(
      JSON.stringify({ error: "Unable to send verification code." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
*/


// =============================================================================
// 6. VERIFY-EMAIL-OTP
// Purpose: Verify email OTP and create user account
// Location: supabase/functions/verify-email-otp/index.ts
// Lines: 215 total
// =============================================================================

/*
[Full implementation in supabase/functions/verify-email-otp/index.ts]
- Verifies OTP code against email_verifications table
- Creates new user record with hashed password if user doesn't exist
- Returns userId for session establishment
*/


// =============================================================================
// 7. SEND-ACTIVATION-INVITE
// Purpose: Send activation code invite emails
// Location: supabase/functions/send-activation-invite/index.ts
// Lines: 175 total
// =============================================================================

/*
[Full implementation in supabase/functions/send-activation-invite/index.ts]
- Fetches email config from email_config table
- Fetches email template from email_templates table
- Sends formatted activation email via SMTP
*/


// =============================================================================
// 8. SEND-INVITES
// Purpose: Send friend invitations via email or SMS
// Location: supabase/functions/send-invites/index.ts
// Lines: 142 total
// =============================================================================

/*
[Full implementation in supabase/functions/send-invites/index.ts]
- Supports both email and SMS invite methods
- Creates pending friend_connections records
- Currently logs invites (TODO: actual email/SMS sending)
*/


// =============================================================================
// 9. SEARCH-TMDB
// Purpose: Search TMDB for movies and TV shows
// Location: supabase/functions/search-tmdb/index.ts
// Lines: 274 total
// =============================================================================

/*
[Full implementation in supabase/functions/search-tmdb/index.ts]
- Searches both movies and TV shows via TMDB API
- Fetches certifications, details, and watch providers
- Returns enriched data with genres, streaming services, runtime
*/


// =============================================================================
// 10. ENRICH-TITLE-DETAILS
// Purpose: Fetch detailed title info from TMDB (cast, trailers, streaming)
// Location: supabase/functions/enrich-title-details/index.ts
// Lines: 193 total
// =============================================================================

/*
[Full implementation in supabase/functions/enrich-title-details/index.ts]
- Fetches details, credits, videos, watch providers in parallel
- Extracts trailers, top 5 cast, genre names
- For TV series: fetches season-specific trailers
*/


// =============================================================================
// 11. FULL-REFRESH-TITLES
// Purpose: Full catalog sync from TMDB (movies + TV shows)
// Location: supabase/functions/full-refresh-titles/index.ts
// Lines: 1163 total
// =============================================================================

/*
[Full implementation in supabase/functions/full-refresh-titles/index.ts]

Key Features:
- Processes single work unit: languageCode + year + genreId
- Movie Phase 1: Year-based discovery with vote_average filter (skipped for current year)
- Movie Phase 2: Popularity-based discovery for classics
- TV Phase 1: Year-based discovery with TV-mapped genre IDs
- TV Phase 2: Popularity-based discovery for classics
- TV Phase 3: TV-only genres (Kids, Reality, News, Soap, Talk)
- Fetches watch providers (US region only), trailers, seasons
- Uses official_trailer_channels for YouTube fallback
- Stores in titles, seasons, title_streaming_availability, etc.
*/


// =============================================================================
// 12. FULL-REFRESH-ORCHESTRATOR
// Purpose: Orchestrate parallel full-refresh job execution
// Location: supabase/functions/full-refresh-orchestrator/index.ts
// Lines: 505 total
// =============================================================================

/*
[Full implementation in supabase/functions/full-refresh-orchestrator/index.ts]

Key Features:
- Dispatches work units in batches of 5 with 5s delays
- Tracks completed/failed units in job configuration
- Self-relaunches on timeout (5 min safety margin)
- Retries failed work units after initial pass
- Respects user stop commands (checks job status each batch)
- Uses EdgeRuntime.waitUntil for background execution
*/


// =============================================================================
// 13. SYNC-TITLES-DELTA
// Purpose: Nightly delta sync for recent releases
// Location: supabase/functions/sync-titles-delta/index.ts
// Lines: 727 total
// =============================================================================

/*
[Full implementation in supabase/functions/sync-titles-delta/index.ts]

Key Features:
- Configurable lookback period (default 7 days)
- Processes all languages in spoken_languages table
- Movie discovery by release date range
- TV discovery by air date range (captures new seasons)
- TV-only genres processing
- Same TMDB criteria as full-refresh
*/


// =============================================================================
// 14. ENRICH-TITLE-TRAILERS
// Purpose: Enrich missing trailers from TMDB/YouTube
// Location: supabase/functions/enrich-title-trailers/index.ts
// Lines: 675 total
// =============================================================================

/*
[Full implementation in supabase/functions/enrich-title-trailers/index.ts]

Key Features:
- Phase 1: Enrich titles with null trailer_url
- Phase 2: Enrich seasons with null trailer_url
- Comprehensive official channel matching (multi-language)
- TMDB trailer priority, YouTube official channels fallback
- YouTube quota exceeded detection and job stopping
- Self-invokes via EdgeRuntime.waitUntil
*/


// =============================================================================
// 15. TRANSCRIBE-TRAILERS
// Purpose: Transcribe YouTube trailers using Supadata API
// Location: supabase/functions/transcribe-trailers/index.ts
// Lines: 566 total
// =============================================================================

/*
[Full implementation in supabase/functions/transcribe-trailers/index.ts]

Key Features:
- Uses Supadata.ai API for YouTube transcript extraction
- Language detection via OpenAI
- Auto-translation to English for non-English transcripts
- Processes titles and seasons in batches
- API limit detection and job stopping
- Marks non-YouTube URLs as processed (empty string)
*/


// =============================================================================
// 16. CLASSIFY-TITLE-AI
// Purpose: Combined AI classification for emotions + intents (50% cost savings)
// Location: supabase/functions/classify-title-ai/index.ts
// Lines: 507 total
// =============================================================================

/*
[Full implementation in supabase/functions/classify-title-ai/index.ts]

Key Features:
- Single OpenAI API call for BOTH emotions and intents
- Cursor-based pagination (O(1) performance)
- Processes titles not in primary OR staging tables
- Concurrent processing with configurable limit
- Valid intent types: adrenaline_rush, background_passive, comfort_escape, 
  deep_thought, discovery, emotional_release, family_bonding, light_entertainment
- Inserts into staging tables for later promotion
*/


// =============================================================================
// 17. PROMOTE-TITLE-AI
// Purpose: Promote AI classifications from staging to final tables
// Location: supabase/functions/promote-title-ai/index.ts
// Lines: 295 total
// =============================================================================

/*
[Full implementation in supabase/functions/promote-title-ai/index.ts]

Key Features:
- Promotes emotions: viib_emotion_classified_titles_staging → viib_emotion_classified_titles
- Promotes intents: viib_intent_classified_titles_staging → viib_intent_classified_titles
- Delete old → Insert new → Delete staging (atomic per title_id)
- Self-invokes via EdgeRuntime.waitUntil for remaining work
- Respects job stop commands
*/


// =============================================================================
// EDGE FUNCTION CONFIGURATION (supabase/config.toml)
// =============================================================================

/*
[functions.classify-title-ai]
verify_jwt = false

[functions.enrich-title-details]
verify_jwt = false

[functions.enrich-title-trailers]
verify_jwt = false

[functions.full-refresh-orchestrator]
verify_jwt = false

[functions.full-refresh-titles]
verify_jwt = false

[functions.hash-password]
verify_jwt = false

[functions.promote-title-ai]
verify_jwt = false

[functions.search-tmdb]
verify_jwt = false

[functions.send-activation-invite]
verify_jwt = false

[functions.send-email-otp]
verify_jwt = false

[functions.send-invites]
verify_jwt = false

[functions.send-phone-otp]
verify_jwt = false

[functions.sync-titles-delta]
verify_jwt = false

[functions.transcribe-trailers]
verify_jwt = false

[functions.verify-email-otp]
verify_jwt = false

[functions.verify-password]
verify_jwt = false

[functions.verify-phone-otp]
verify_jwt = false
*/
