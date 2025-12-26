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
      .limit(5); // Get last 5 to see what's there

    console.log('All verifications for', email, ':', JSON.stringify(verifications));
    console.log('Fetch error:', fetchError);

    // Find the first unverified one
    const verification = verifications?.find(v => !v.verified);

    if (fetchError || !verification) {
      console.error('Verification not found. Fetch error:', fetchError, 'Verifications:', verifications);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No verification code found. Please request a new code.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if OTP has expired
    if (new Date(verification.expires_at) < new Date()) {
      console.error('OTP expired');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Your code has expired. Please request a new code.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Verify OTP - ensure both are strings and trimmed
    const dbOtp = String(verification.otp_code).trim();
    const userOtp = String(otp).trim();
    console.log('Comparing OTPs - Database:', dbOtp, 'User entered:', userOtp, 'Match:', dbOtp === userOtp);
    
    if (dbOtp !== userOtp) {
      console.error('Invalid OTP - Mismatch! DB:', dbOtp, 'User:', userOtp);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid code. Please check and try again.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('OTP matched successfully!');

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, onboarding_completed, is_email_verified')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // User exists - this is a resume scenario
      console.log('Existing user found, resuming onboarding:', existingUser.id);

      // Mark the OTP as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      // Invalidate all other unverified OTPs for this email (security best practice)
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false)
        .neq('id', verification.id);

      userId = existingUser.id;
    } else {
      // New user - hash password and create account
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password }
      });

      if (hashError || !hashData?.success) {
        console.error('Failed to hash password:', hashError || hashData?.error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to process request. Please try again.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
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
        console.error('Failed to create user:', userError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to create account. Please try again.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Mark OTP as verified AFTER successful user creation
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      // Invalidate all other unverified OTPs for this email (security best practice)
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false)
        .neq('id', verification.id);

      userId = newUser.id;
      console.log('New user created successfully:', userId);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully',
        userId: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in verify-email-otp function:', error);
    
    // Return generic user-friendly message without exposing system details
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Unable to verify code. Please request a new code." 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
