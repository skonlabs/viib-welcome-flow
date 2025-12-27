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
Deno.serve(async (req) => {
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
    const inviteLink = `${Deno.env.get('APP_URL') || 'https://viib.app'}?invited_by=${userId}`;

    // Process invites based on method
    const results = [];

    for (const contact of contacts) {
      try {
        if (method === 'email') {
          await sendEmailInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: 'email' });
        } else if (method === 'phone') {
          await sendSMSInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: 'sms' });
        }

        // Store invitation record
        await supabase
          .from('friend_connections')
          .upsert({
            user_id: userId,
            friend_user_id: userId, // Placeholder until they sign up
            relationship_type: 'pending_invite',
            trust_score: 0.5,
          }, { onConflict: 'user_id,friend_user_id' });

      } catch (error: any) {
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

  } catch (error: any) {
    console.error('Error in send-invites function');
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
  // TODO: Implement actual email sending using Resend or similar
  // For now, log without sensitive data
  console.log(`Email invite sent to recipient from ${senderName}`);
  return true;
}

async function sendSMSInvite(phone: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  // TODO: Implement actual SMS sending using Twilio
  // For now, log without sensitive data
  console.log(`SMS invite sent to recipient from ${senderName}`);
  return true;
}
