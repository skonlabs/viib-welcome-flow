import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { hashOtp, generateSecureOtp, constantTimeCompare } from "../_shared/crypto.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin for security
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, otp, newPassword, action } = await req.json();

    // Capture IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      'unknown';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check IP-based rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_ip_rate_limit', {
      p_ip_address: ipAddress,
      p_endpoint: 'password_reset',
      p_max_requests: 3,
      p_window_seconds: 3600  // 3 requests per hour
    });

    if (rateLimitCheck && !rateLimitCheck[0]?.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many password reset attempts. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Action: request - Send password reset OTP
    if (action === 'request') {
      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      // Always return success to prevent email enumeration
      if (!user) {
        console.log('Password reset requested for non-existent email');
        return new Response(
          JSON.stringify({ success: true, message: 'If an account exists, a reset code has been sent.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Generate 6-digit OTP using cryptographically secure random
      const otpCode = generateSecureOtp(6);
      const otpHash = await hashOtp(otpCode, email);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      // Store OTP with hash
      const { error: dbError } = await supabase
        .from('email_verifications')
        .insert({
          email,
          otp_code: otpCode, // TODO: Remove after migration to hash-only
          otp_hash: otpHash,
          expires_at: expiresAt,
          verified: false,
          attempt_count: 0,
          is_locked: false,
        });

      if (dbError) {
        console.error('Failed to store reset OTP:', dbError);
        throw new Error('Failed to process request');
      }

      // Send email
      const gmailUser = Deno.env.get('GMAIL_USER');
      const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

      if (gmailUser && gmailPassword) {
        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: { username: gmailUser, password: gmailPassword },
          },
        });

        await client.send({
          from: gmailUser,
          to: email,
          subject: "Reset Your ViiB Password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0ea5e9;">Password Reset Request</h2>
              <p>You requested to reset your ViiB password. Use this code:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${otpCode}
              </div>
              <p>This code will expire in 15 minutes.</p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            </div>
          `,
        });

        await client.close();
      }

      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset code has been sent.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Action: verify - Verify OTP and reset password
    if (action === 'verify') {
      if (!email || !otp || !newPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email, OTP, and new password are required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 8 characters long' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get latest unverified OTP
      const { data: verification } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!verification) {
        return new Response(
          JSON.stringify({ success: false, error: 'No reset code found. Please request a new one.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Check expiration
      if (new Date(verification.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Reset code has expired. Please request a new one.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Verify OTP using constant-time comparison
      const userOtp = String(otp).trim();
      const inputOtpHash = await hashOtp(userOtp, email);

      // Support both hash and legacy comparison
      const hashMatch = verification.otp_hash
        ? constantTimeCompare(verification.otp_hash, inputOtpHash)
        : false;
      const legacyMatch = verification.otp_code
        ? constantTimeCompare(String(verification.otp_code).trim(), userOtp)
        : false;

      if (!hashMatch && !legacyMatch) {
        // Record failed attempt
        await supabase.rpc('record_login_attempt', {
          p_identifier: email,
          p_ip_address: ipAddress,
          p_attempt_type: 'password_reset',
          p_success: false
        });

        return new Response(
          JSON.stringify({ success: false, error: 'Invalid code. Please check and try again.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Hash new password
      const { data: hashData, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password: newPassword }
      });

      if (hashError || !hashData?.success) {
        throw new Error('Failed to process password');
      }

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashData.hashedPassword })
        .eq('email', email);

      if (updateError) {
        throw new Error('Failed to update password');
      }

      // Mark OTP as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);

      // Clean up other unverified OTPs
      await supabase
        .from('email_verifications')
        .delete()
        .eq('email', email)
        .eq('verified', false);

      // Record successful attempt
      await supabase.rpc('record_login_attempt', {
        p_identifier: email,
        p_ip_address: ipAddress,
        p_attempt_type: 'password_reset',
        p_success: true
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Password has been reset successfully.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error in reset-password function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred. Please try again.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
