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

    // Hash the password
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
      })
      .select('id')
      .single();

    if (userError) {
      console.error('Failed to create user:', userError);
      
      // Check for duplicate email
      if (userError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'This email is already registered. Please sign in instead.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
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

    // Only mark OTP as verified AFTER successful user creation
    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    console.log('User created and email verified successfully:', newUser.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully',
        userId: newUser.id
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
