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
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Email and password are required" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get base URL for redirect
    const baseUrl = Deno.env.get("APP_BASE_URL") || req.headers.get("origin") || "";

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        name: name || null
      }
    });

    if (authError) {
      console.error("Signup error:", authError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: authError.message,
          code: (authError as any).code || "signup_error"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    console.log("User created successfully:", authData.user?.id);

    // Create user record in public.users table
    if (authData.user?.id) {
      try {
        const { error: userError } = await supabaseAdmin
          .from("users")
          .insert({
            id: authData.user.id,
            email: email,
            full_name: name || null,
            signup_method: "email",
            onboarding_completed: false
          });

        if (userError && userError.code !== "23505") { // Ignore duplicate key errors
          console.error("Error creating user record:", userError);
        }
      } catch (userRecordError) {
        console.error("Error in user record creation:", userRecordError);
      }
    }

    // Generate verification link
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email: email,
        password: password,
        options: {
          redirectTo: `${baseUrl}/app/onboarding/biometric`
        }
      });

      if (linkError) {
        console.error("Error generating verification link:", linkError);
      } else {
        console.log("Verification link generated for:", email);
        // In production, you would send this link via email
        // For now, we'll just log it for testing
        console.log("Verification link:", linkData?.properties?.action_link);
      }
    } catch (emailError) {
      console.error("Error in email verification flow:", emailError);
      // Don't fail the signup if email sending fails - user can resend later
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        message: "Account created successfully. Please check your email to verify your account."
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error: any) {
    console.error("Unexpected error in signup-email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || "An unexpected error occurred" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  }
});