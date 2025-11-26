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
    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      console.error('Verification not found:', fetchError);
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

    // Verify OTP
    console.log('Comparing OTPs - Database:', verification.otp_code, 'User entered:', otp, 'Types:', typeof verification.otp_code, typeof otp);
    if (verification.otp_code !== otp) {
      console.error('Invalid OTP - Mismatch!');
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

    // Mark verification as complete - that's ALL this function does
    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    console.log('Email OTP verified successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully'
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
