import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  userId: string;
  method: 'email' | 'phone';
  contacts: string[];
  note?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, method, contacts, note } = await req.json() as InviteRequest;

    console.log(`Processing ${contacts.length} ${method} invites from user ${userId}`);
    if (note) {
      console.log(`Personal note included: ${note.substring(0, 50)}...`);
    }

    if (!userId || !contacts || contacts.length === 0) {
      throw new Error('Missing required fields');
    }

    // Get sender's information
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('full_name, email, phone_number')
      .eq('id', userId)
      .single();

    if (senderError) {
      console.error('Error fetching sender:', senderError);
      throw senderError;
    }

    const senderName = sender.full_name || 'A friend';
    const inviteLink = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}?invited_by=${userId}`;

    // Process invites based on method
    const results = [];
    
    for (const contact of contacts) {
      try {
        if (method === 'email') {
          // Send email invite
          const emailResult = await sendEmailInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: 'email' });
          console.log(`Email invite sent to ${contact}`);
        } else if (method === 'phone') {
          // Send SMS invite
          const smsResult = await sendSMSInvite(contact, senderName, inviteLink, note);
          results.push({ contact, success: true, method: 'sms' });
          console.log(`SMS invite sent to ${contact}`);
        }

        // Store invitation record (optional - for tracking)
        await supabase
          .from('friend_connections')
          .upsert({
            user_id: userId,
            friend_user_id: userId, // Placeholder until they sign up
            relationship_type: 'pending_invite',
            trust_score: 0.5,
          }, { onConflict: 'user_id,friend_user_id' });
          
      } catch (error: any) {
        console.error(`Failed to send invite to ${contact}:`, error);
        results.push({ contact, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent ${successCount}/${contacts.length} invites`);

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
    console.error('Error in send-invites function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function sendEmailInvite(email: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  // For testing: log the invite instead of sending
  console.log(`[EMAIL INVITE] To: ${email}, From: ${senderName}, Link: ${inviteLink}`);
  if (note) {
    console.log(`[EMAIL INVITE] Personal Note: ${note}`);
  }
  
  // TODO: Implement actual email sending using Resend or Gmail SMTP
  // Email body should include:
  // - Sender's name and personal note (if provided)
  // - Invitation link
  // - Brief description of ViiB
  
  return true;
}

async function sendSMSInvite(phone: string, senderName: string, inviteLink: string, note?: string): Promise<boolean> {
  // For testing: log the invite instead of sending
  console.log(`[SMS INVITE] To: ${phone}, From: ${senderName}, Link: ${inviteLink}`);
  if (note) {
    console.log(`[SMS INVITE] Personal Note: ${note}`);
  }
  
  // TODO: Implement actual SMS sending using Twilio
  // SMS should include:
  // - Sender's name and personal note (if provided)
  // - Shortened invitation link
  
  return true;
}
