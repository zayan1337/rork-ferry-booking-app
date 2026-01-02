import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface BulkEmailRequest {
  campaignId: string;
  batchSize?: number;
  dryRun?: boolean;
}

interface Recipient {
  user_id: string;
  email: string;
  full_name: string;
}

// Send email via Gmail SMTP using native Deno TCP connection
async function sendEmailViaGmailSMTP(
  emailData: {
    from: string;
    to: string;
    subject: string;
    html: string;
  },
  gmailUser: string,
  gmailPassword: string
): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let conn: Deno.TcpConn | undefined;
  let tlsConn: Deno.TlsConn | undefined;

  try {
    // Connect to Gmail SMTP server
    conn = await Deno.connect({
      hostname: 'smtp.gmail.com',
      port: 587,
    });

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) throw new Error('Connection closed');
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    let response = await readResponse();
    if (!response.startsWith('220')) {
      throw new Error(`SMTP greeting failed: ${response}`);
    }

    response = await sendCommand('EHLO localhost');
    if (!response.startsWith('250')) {
      throw new Error(`EHLO failed: ${response}`);
    }

    response = await sendCommand('STARTTLS');
    if (!response.startsWith('220')) {
      throw new Error(`STARTTLS failed: ${response}`);
    }

    tlsConn = await Deno.startTls(conn, { hostname: 'smtp.gmail.com' });

    const readTlsResponse = async (): Promise<string> => {
      if (!tlsConn) throw new Error('TLS connection not established');
      const buffer = new Uint8Array(4096);
      const n = await tlsConn.read(buffer);
      if (n === null) throw new Error('TLS connection closed');
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendTlsCommand = async (command: string): Promise<string> => {
      if (!tlsConn) throw new Error('TLS connection not established');
      await tlsConn.write(encoder.encode(command + '\r\n'));
      return await readTlsResponse();
    };

    response = await sendTlsCommand('EHLO localhost');
    if (!response.startsWith('250')) {
      throw new Error(`EHLO after TLS failed: ${response}`);
    }

    response = await sendTlsCommand('AUTH LOGIN');
    if (!response.startsWith('334')) {
      throw new Error(`AUTH LOGIN failed: ${response}`);
    }

    const encodedUsername = btoa(gmailUser);
    response = await sendTlsCommand(encodedUsername);
    if (!response.startsWith('334')) {
      throw new Error(`Username authentication failed: ${response}`);
    }

    const encodedPassword = btoa(gmailPassword);
    response = await sendTlsCommand(encodedPassword);
    if (!response.startsWith('235')) {
      throw new Error(`Password authentication failed: ${response}`);
    }

    response = await sendTlsCommand(`MAIL FROM:<${gmailUser}>`);
    if (!response.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${response}`);
    }

    response = await sendTlsCommand(`RCPT TO:<${emailData.to}>`);
    if (!response.startsWith('250')) {
      throw new Error(`RCPT TO failed for ${emailData.to}: ${response}`);
    }

    response = await sendTlsCommand('DATA');
    if (!response.startsWith('354')) {
      throw new Error(`DATA command failed: ${response}`);
    }

    const emailContent = [
      `From: Crystal Transfer Vaavu <${gmailUser}>`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      emailData.html,
      '.',
    ].join('\r\n');

    await tlsConn.write(encoder.encode(emailContent + '\r\n'));
    response = await readTlsResponse();

    if (!response.startsWith('250')) {
      throw new Error(`Email send failed: ${response}`);
    }

    try {
      await sendTlsCommand('QUIT');
    } catch {
      // Connection may already be closed
    }

    try {
      tlsConn.close();
    } catch {
      // Ignore close errors
    }

    try {
      conn.close();
    } catch {
      // Ignore close errors
    }

    const messageId = `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return messageId;
  } catch (error) {
    console.error('❌ Gmail SMTP Error:', error);

    try {
      if (typeof tlsConn !== 'undefined') {
        tlsConn.close();
      }
    } catch {
      // Ignore cleanup errors
    }

    try {
      if (typeof conn !== 'undefined') {
        conn.close();
      }
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(`Gmail SMTP failed: ${error.message}`);
  }
}

// Replace template variables in content
function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

// Generate email HTML wrapper
function generateEmailHTML(content: string, recipientName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crystal Transfer Vaavu</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f7f7f7;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1a73e8;
            margin: 0;
        }
        .content {
            margin-bottom: 30px;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Crystal Transfer Vaavu</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>This email was sent to you by Crystal Transfer Vaavu.</p>
            <p>© 2025 Crystal Transfer Vaavu. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      campaignId,
      batchSize = 50,
      dryRun = false,
    }: BulkEmailRequest = await req.json();

    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    console.log(`📧 Starting bulk email campaign: ${campaignId}`);

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Update campaign status to sending
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Get recipients based on target criteria
    let recipients: Recipient[] = [];
    const criteria = campaign.target_criteria;

    if (criteria.allUsers) {
      // Get all active users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('is_active', true)
        .not('email', 'is', null);

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      recipients = (users || []).map(u => ({
        user_id: u.id,
        email: u.email,
        full_name: u.full_name || 'Valued Customer',
      }));
    } else {
      // Use the database function to get filtered recipients
      const { data: filteredUsers, error: filterError } = await supabase.rpc(
        'get_campaign_recipients',
        { criteria }
      );

      if (filterError) {
        // Fallback: filter by roles only
        let query = supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .eq('is_active', true)
          .not('email', 'is', null);

        if (criteria.roles && criteria.roles.length > 0) {
          query = query.in('role', criteria.roles);
        }

        const { data: fallbackUsers } = await query;
        recipients = (fallbackUsers || []).map(u => ({
          user_id: u.id,
          email: u.email,
          full_name: u.full_name || 'Valued Customer',
        }));
      } else {
        recipients = (filteredUsers || []).map((u: any) => ({
          user_id: u.user_id,
          email: u.email,
          full_name: u.full_name || 'Valued Customer',
        }));
      }
    }

    console.log(`📬 Found ${recipients.length} recipients`);

    // Update total recipients count
    await supabase
      .from('email_campaigns')
      .update({ total_recipients: recipients.length })
      .eq('id', campaignId);

    if (dryRun) {
      console.log('🧪 Dry run mode - not sending actual emails');
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          recipientCount: recipients.length,
          recipients: recipients.slice(0, 10), // Return first 10 for preview
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get Gmail credentials
    const gmailUser = Deno.env.get('GMAIL_USER') || 'crystalhotelsmv@gmail.com';
    const gmailPassword =
      Deno.env.get('GMAIL_APP_PASSWORD') || 'aajq lrvf wfiy wqtx';

    if (!gmailUser || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    let sentCount = 0;
    let failedCount = 0;

    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        try {
          // Prepare email content with variables replaced
          const variables = {
            user_name: recipient.full_name,
            USER_NAME: recipient.full_name,
            email: recipient.email,
            USER_EMAIL: recipient.email,
          };

          let emailContent = campaign.html_content || '';
          emailContent = replaceTemplateVariables(emailContent, variables);

          const htmlEmail = generateEmailHTML(
            emailContent,
            recipient.full_name
          );

          // Send email
          if (campaign.send_email) {
            await sendEmailViaGmailSMTP(
              {
                from: gmailUser,
                to: recipient.email,
                subject: replaceTemplateVariables(campaign.subject, variables),
                html: htmlEmail,
              },
              gmailUser,
              gmailPassword
            );
          }

          // Create campaign recipient record
          await supabase.from('campaign_recipients').insert({
            campaign_id: campaignId,
            user_id: recipient.user_id,
            email: recipient.email,
            full_name: recipient.full_name,
            email_status: campaign.send_email ? 'sent' : 'pending',
            notification_status: campaign.send_notification
              ? 'pending'
              : 'pending',
            email_sent_at: campaign.send_email
              ? new Date().toISOString()
              : null,
          });

          // Send in-app notification if enabled
          if (campaign.send_notification) {
            await supabase.from('admin_notifications').insert({
              title: campaign.subject,
              message:
                campaign.html_content?.replace(/<[^>]*>/g, '').slice(0, 500) ||
                campaign.name,
              notification_type: 'campaign',
              recipient_id: recipient.user_id,
              priority: 0,
              is_system: false,
              metadata: {
                campaign_id: campaignId,
                campaign_name: campaign.name,
              },
            });

            // Update notification status
            await supabase
              .from('campaign_recipients')
              .update({
                notification_status: 'sent',
                notification_sent_at: new Date().toISOString(),
              })
              .eq('campaign_id', campaignId)
              .eq('user_id', recipient.user_id);
          }

          sentCount++;
          console.log(
            `✅ Sent to ${recipient.email} (${sentCount}/${recipients.length})`
          );

          // Rate limiting: wait 100ms between emails
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Failed to send to ${recipient.email}:`, error);
          failedCount++;

          // Record failure
          await supabase.from('campaign_recipients').insert({
            campaign_id: campaignId,
            user_id: recipient.user_id,
            email: recipient.email,
            full_name: recipient.full_name,
            email_status: 'failed',
            notification_status: 'pending',
            error_message: error.message,
          });
        }
      }

      // Update campaign progress after each batch
      await supabase
        .from('email_campaigns')
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq('id', campaignId);
    }

    // Update campaign as completed
    const finalStatus = failedCount === recipients.length ? 'failed' : 'sent';
    await supabase
      .from('email_campaigns')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', campaignId);

    console.log(
      `📊 Campaign completed: ${sentCount} sent, ${failedCount} failed`
    );

    // Log to email_logs
    await supabase.from('email_logs').insert({
      email_type: 'bulk_campaign',
      recipient: `${sentCount} recipients`,
      status: finalStatus,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
        status: finalStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Bulk email error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
