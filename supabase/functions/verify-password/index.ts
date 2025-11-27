import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const isValid = await compare(password, userData.password_hash);

    if (!isValid) {
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
