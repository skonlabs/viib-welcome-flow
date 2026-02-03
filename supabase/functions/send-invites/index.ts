import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  validateOrigin,
} from '../_shared/cors.ts';
import { requireAuth, createAdminClient } from '../_shared/auth.ts';

interface InviteRequest {
  method: 'email' | 'phone';
  contacts: string[];
  note?: string;
}

/**
 * Send Invites Edge Function
 * REQUIRES: Valid Supabase Auth JWT
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Validate origin
  const originError = validateOrigin(req);
  if (originError) return originError;

  const corsHeaders = getCorsHeaders(req);

  try {
    // REQUIRE valid Supabase Auth JWT
    const authResult = await requireAuth(req);
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = authResult;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createAdminClient();

    const { method, contacts, note } = await req.json() as InviteRequest;

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one contact is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit invites
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit_fast', {
      p_key: `invites:${userId}`,
      p_max_count: 20,
      p_window_seconds: 86400  // 20 per day
    });

    if (rateLimitCheck && !rateLimitCheck[0]?.allowed) {
      return new Response(
        JSON.stringify({ error: 'Daily invite limit reached. Please try again tomorrow.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sender's information
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (senderError || !sender) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderName = sender.full_name || 'A friend';
    const appUrl = Deno.env.get('APP_URL') || 'https://viib.app';
    const inviteLink = `${appUrl}?invited_by=${userId}`;

    // Process invites based on method
    const results = [];

    for (const contact of contacts) {
      try {
        if (method === 'email') {
          const success = await sendEmailInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success, method: 'email' });
        } else if (method === 'phone') {
          const success = await sendSMSInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success, method: 'sms' });
        }

        // Log invite for tracking (don't block on errors)
        try {
          await supabase.from('system_logs').insert([{
            error_message: `Invite sent to ${method === 'email' ? 'email' : 'phone'}`,
            severity: 'info',
            user_id: userId,
            operation: 'send-invites',
            context: { method, success: true },
            resolved: false
          }]);
        } catch {
          // Silent fail for logging
        }

      } catch (error: any) {
        console.error(`Failed to send invite to contact:`, error.message);
        results.push({ contact, success: false, error: 'Failed to send' });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Sent ${successCount} invite${successCount !== 1 ? 's' : ''} successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error in send-invites function:', errorMessage);
    
    // Log error to system_logs
    const supabase = createAdminClient();
    await supabase.from('system_logs').insert([{
      severity: 'error',
      operation: 'send-invites',
      error_message: errorMessage,
      error_stack: errorStack,
      context: { source: 'edge-function' },
      resolved: false
    }]);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function sendEmailInvite(email: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

  if (!gmailUser || !gmailPassword) {
    console.error('Email configuration not set');
    return false;
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPassword },
      },
    });

    const personalNote = note ? `<p style="font-style: italic; color: #6b7280; margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 8px;">"${note}"</p>` : '';

    await client.send({
      from: gmailUser,
      to: email,
      subject: `${senderName} invited you to join ViiB`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">You've Been Invited to ViiB! 🎬</h2>
          <p><strong>${senderName}</strong> thinks you'd love ViiB - the app that helps you find your perfect movie or show based on your mood.</p>
          ${personalNote}
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background: linear-gradient(135deg, #a855f7, #0ea5e9); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Join ViiB Now
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Stop scrolling, start watching. Let your mood guide you to the perfect content.</p>
        </div>
      `,
    });

    await client.close();
    console.log(`Email invite sent successfully`);
    return true;
  } catch (error) {
    console.error('Failed to send email invite:', error);
    return false;
  }
}

async function sendSMSInvite(phone: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !twilioPhone) {
    console.error('Twilio configuration not set');
    return false;
  }

  try {
    const message = note 
      ? `${senderName} invited you to ViiB: "${note}". Join now: ${inviteLink}`
      : `${senderName} invited you to ViiB - find your perfect movie based on your mood! Join: ${inviteLink}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioPhone,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio API error:', errorData);
      return false;
    }

    console.log(`SMS invite sent successfully`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS invite:', error);
    return false;
  }
}
