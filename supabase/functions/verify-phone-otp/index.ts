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

    // Mark the current OTP as verified
    const { error: updateError } = await supabaseClient
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    if (updateError) {
      console.error('Failed to mark OTP as verified:', updateError);
    }

    // Invalidate all other unverified OTPs for this phone number (security best practice)
    const { error: invalidateError } = await supabaseClient
      .from('phone_verifications')
      .delete()
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .neq('id', verification.id);

    if (invalidateError) {
      console.error('Failed to invalidate old OTPs:', invalidateError);
    }

    console.log('Phone OTP validated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
        verificationId: verification.id
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
