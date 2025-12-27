import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/auth.ts";

/**
 * Send Activation Invite Edge Function
 * REQUIRES: Valid Supabase Auth JWT with admin role
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Require authentication
    const authResult = await requireAuth(req);
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { userId } = authResult;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Verify user has admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { email, code, senderName = "ViiB" } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and activation code are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch email configuration
    const { data: emailConfig, error: configError } = await supabase
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching email config');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch email configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!emailConfig) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active email configuration found. Please configure email settings in Admin > Email Setup' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch email template for activation invite
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', 'activation_invite')
      .eq('is_active', true)
      .maybeSingle();

    let subject = "Your ViiB Activation Code";
    let body = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
            .code-box { background: #f3f4f6; border: 2px dashed #667eea; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #667eea; font-family: 'Courier New', monospace; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Welcome to ViiB!</h1>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">You've Been Invited!</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Someone has invited you to join ViiB - your personalized entertainment companion.
                Use the activation code below to get started on your journey.
              </p>

              <div class="code-box">
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">YOUR ACTIVATION CODE</div>
                <div class="code">${code}</div>
              </div>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                To activate your account:
              </p>
              <ol style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                <li>Visit the ViiB app</li>
                <li>Click "Get Started" or "Sign Up"</li>
                <li>Enter your activation code when prompted</li>
                <li>Complete your profile setup</li>
              </ol>

              <div style="text-align: center;">
                <a href="https://viib.app" class="button">
                  Get Started Now
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                This activation code is unique to you. Please don't share it with others.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">ViiB. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">Discover content that matches your vibe.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Use template if available
    if (template && !templateError) {
      subject = template.subject;
      body = template.body
        .replace(/{{code}}/g, code)
        .replace(/{{email}}/g, email)
        .replace(/{{app_url}}/g, 'https://viib.app');
    }

    // Send email using SMTP
    const client = new SMTPClient({
      connection: {
        hostname: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        tls: emailConfig.use_ssl,
        auth: {
          username: emailConfig.smtp_user,
          password: emailConfig.smtp_password,
        },
      },
    });

    await client.send({
      from: emailConfig.from_name
        ? `${emailConfig.from_name} <${emailConfig.from_email}>`
        : emailConfig.from_email,
      to: email,
      subject: subject,
      content: "text/html",
      html: body,
    });

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Activation invite sent successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in send-activation-invite");

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send activation invite",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
