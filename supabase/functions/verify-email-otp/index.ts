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
    if (verification.otp_code !== otp) {
      console.error('Invalid OTP');
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

    // Mark verification as complete
    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since we verified via OTP
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Failed to create user account');
    }

    // Create user record in public.users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: name,
        signup_method: 'email',
        onboarding_completed: false,
      });

    if (userError) {
      console.error('User creation error:', userError);
      throw new Error('Failed to create user profile');
    }

    console.log('User created successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        user: authData.user 
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
