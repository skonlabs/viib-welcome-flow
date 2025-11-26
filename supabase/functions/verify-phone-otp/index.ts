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

    // Mark as verified in phone_verifications table
    const { error: updateError } = await supabaseClient
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to verify code');
    }

    // Check if user already exists with this phone number
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      throw new Error('Failed to verify user');
    }

    if (existingUser) {
      // Update existing user
      const { error: updateUserError } = await supabaseClient
        .from('users')
        .update({ is_phone_verified: true })
        .eq('phone_number', normalizedPhone);

      if (updateUserError) {
        console.error('Failed to update user record:', updateUserError);
        throw new Error('Failed to update user account');
      }
      console.log('Existing user updated with phone verification:', normalizedPhone);
    } else {
      // Create new user record
      const { error: insertError } = await supabaseClient
        .from('users')
        .insert({
          phone_number: normalizedPhone,
          signup_method: 'phone',
          is_phone_verified: true,
          onboarding_completed: false,
          is_active: false, // Only activate after onboarding completion
        });

      if (insertError) {
        console.error('Failed to create user record:', insertError);
        throw new Error('Failed to create user account');
      }
      console.log('New user created with phone verification:', normalizedPhone);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully"
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
