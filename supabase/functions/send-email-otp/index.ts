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
    console.log('Processing email OTP request');

    if (!email) {
      throw new Error('Email is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get rate limit settings from app_settings
    const [rateLimitResult, windowResult] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'otp_rate_limit').single(),
      supabase.from('app_settings').select('value').eq('key', 'otp_rate_limit_window').single(),
    ]);

    const rateLimit = rateLimitResult.data?.value ? parseInt(rateLimitResult.data.value, 10) : 5;
    const rateLimitWindow = windowResult.data?.value ? parseInt(windowResult.data.value, 10) : 15;

    // Check rate limit - count recent OTPs for this email
    const windowStart = new Date(Date.now() - rateLimitWindow * 60 * 1000).toISOString();
    const { count: recentOtpCount } = await supabase
      .from('email_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', windowStart);

    if (recentOtpCount !== null && recentOtpCount >= rateLimit) {
      console.log(`Rate limit exceeded: ${recentOtpCount}/${rateLimit} in ${rateLimitWindow} minutes`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many verification attempts. Please wait ${rateLimitWindow} minutes before trying again.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // OTP generated (not logging value for security)

    // Store OTP in database (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase
      .from('email_verifications')
      .insert({
        email,
        otp_code: otpCode,
        expires_at: expiresAt,
        verified: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OTP');
    }

    // Send email using Gmail SMTP
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailPassword) {
      console.error('Gmail credentials not configured');
      throw new Error('Email service not configured');
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: email,
      subject: "Your ViiB Verification Code",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Your Verification Code</h2>
          <p>Your ViiB verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Your Verification Code</h2>
          <p>Your ViiB verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    await client.close();

    console.log('Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-email-otp function:', error);
    
    // Return user-friendly error message instead of technical details
    return new Response(
      JSON.stringify({ error: "Unable to send verification code. Please check your email address and try again." }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
