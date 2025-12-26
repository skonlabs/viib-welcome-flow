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

    // Rate limiting: Check failed attempts
    const identifier = email || phone;

    // Get rate limit settings from app_settings
    const [maxAttemptsResult, windowResult] = await Promise.all([
      supabase.from('app_settings').select('setting_value').eq('setting_key', 'password_max_attempts').single(),
      supabase.from('app_settings').select('setting_value').eq('setting_key', 'password_rate_limit_window').single(),
    ]);

    const maxAttempts = maxAttemptsResult.data?.setting_value ? Number(maxAttemptsResult.data.setting_value) : 5;
    const rateLimitWindow = windowResult.data?.setting_value ? Number(windowResult.data.setting_value) : 15;
    const windowStart = new Date(Date.now() - rateLimitWindow * 60 * 1000).toISOString();

    // Check recent failed attempts from system_logs
    const { count: failedAttempts } = await supabase
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('operation', 'password_verification_failed')
      .eq('context->>identifier', identifier)
      .gte('created_at', windowStart);

    if (failedAttempts !== null && failedAttempts >= maxAttempts) {
      console.log(`Rate limit exceeded for ${identifier}: ${failedAttempts}/${maxAttempts} failed attempts`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many failed attempts. Please wait ${rateLimitWindow} minutes before trying again.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

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
      // Log failed attempt for rate limiting
      await supabase.from('system_logs').insert({
        error_message: 'User not found',
        operation: 'password_verification_failed',
        context: { identifier },
        severity: 'warning'
      });

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
      // Log failed attempt for rate limiting
      await supabase.from('system_logs').insert({
        error_message: 'Invalid password',
        operation: 'password_verification_failed',
        context: { identifier },
        severity: 'warning'
      });

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

    console.log('Password verified successfully');
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
