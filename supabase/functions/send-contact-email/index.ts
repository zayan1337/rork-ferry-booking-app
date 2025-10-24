import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ContactFormData {
  name: string;
  email: string;
  message: string;
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
      port: 587, // Use STARTTLS port
    });

    // Helper function to read response
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) throw new Error('Connection closed');
      return decoder.decode(buffer.subarray(0, n));
    };

    // Helper function to send command
    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + '\r\n'));
      const response = await readResponse();
      return response;
    };

    // Read initial greeting
    let response = await readResponse();

    if (!response.startsWith('220')) {
      throw new Error(`SMTP greeting failed: ${response}`);
    }

    // Send EHLO
    response = await sendCommand('EHLO localhost');
    if (!response.startsWith('250')) {
      throw new Error(`EHLO failed: ${response}`);
    }

    // Start TLS
    response = await sendCommand('STARTTLS');
    if (!response.startsWith('220')) {
      throw new Error(`STARTTLS failed: ${response}`);
    }

    // Upgrade to TLS connection
    tlsConn = await Deno.startTls(conn, { hostname: 'smtp.gmail.com' });

    // Helper functions for TLS connection
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
      const response = await readTlsResponse();
      return response;
    };

    // Send EHLO again after TLS
    response = await sendTlsCommand('EHLO localhost');
    if (!response.startsWith('250')) {
      throw new Error(`EHLO after TLS failed: ${response}`);
    }

    // Authenticate using LOGIN method
    response = await sendTlsCommand('AUTH LOGIN');
    if (!response.startsWith('334')) {
      throw new Error(`AUTH LOGIN failed: ${response}`);
    }

    // Send username (base64 encoded)
    const encodedUsername = btoa(gmailUser);
    response = await sendTlsCommand(encodedUsername);
    if (!response.startsWith('334')) {
      throw new Error(`Username authentication failed: ${response}`);
    }

    // Send password (base64 encoded)
    const encodedPassword = btoa(gmailPassword);
    response = await sendTlsCommand(encodedPassword);
    if (!response.startsWith('235')) {
      throw new Error(`Password authentication failed: ${response}`);
    }

    // Send email
    response = await sendTlsCommand(`MAIL FROM:<${gmailUser}>`);
    if (!response.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${response}`);
    }

    // Add recipient
    response = await sendTlsCommand(`RCPT TO:<${emailData.to}>`);
    if (!response.startsWith('250')) {
      throw new Error(`RCPT TO failed for ${emailData.to}: ${response}`);
    }

    // Start data
    response = await sendTlsCommand('DATA');
    if (!response.startsWith('354')) {
      throw new Error(`DATA command failed: ${response}`);
    }

    // Send email headers and body
    const emailContent = [
      `From: ${gmailUser}`,
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

    // Quit gracefully
    try {
      await sendTlsCommand('QUIT');
    } catch (quitError) {
      // Connection may already be closed
    }

    // Close connections safely
    try {
      tlsConn.close();
    } catch (tlsCloseError) {
      // Ignore close errors
    }

    try {
      conn.close();
    } catch (connCloseError) {
      // Ignore close errors
    }

    // Generate a unique message ID for tracking
    const messageId = `gmail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return messageId;
  } catch (error) {
    console.error('❌ Gmail SMTP Error:', error);

    // Clean up connections on error
    try {
      if (typeof tlsConn !== 'undefined') {
        tlsConn.close();
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    try {
      if (typeof conn !== 'undefined') {
        conn.close();
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw new Error(`Gmail SMTP failed: ${error.message}`);
  }
}

function generateContactEmailHTML(data: ContactFormData): string {
  // Use UTC+5 offset instead of timezone name for better compatibility
  const now = new Date();
  const maldivesTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // UTC+5

  const timestamp = maldivesTime.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .contact-details {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            margin-bottom: 15px;
            align-items: flex-start;
        }
        .detail-label {
            font-weight: 600;
            color: #495057;
            min-width: 80px;
            margin-right: 15px;
        }
        .detail-value {
            flex: 1;
            color: #212529;
        }
        .message-content {
            background: #e9ecef;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .timestamp {
            color: #6c757d;
            font-size: 14px;
            margin-top: 20px;
            text-align: center;
        }
        .reply-note {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 New Contact Form Submission</h1>
        </div>
        
        <div class="content">
            <div class="contact-details">
                <div class="detail-row">
                    <div class="detail-label">Name:</div>
                    <div class="detail-value">${data.name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">
                        <a href="mailto:${data.email}" style="color: #667eea; text-decoration: none;">
                            ${data.email}
                        </a>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Submitted:</div>
                    <div class="detail-value">${timestamp}</div>
                </div>
            </div>

            <div class="message-content">
                <strong>Message:</strong><br>
                ${data.message.replace(/\n/g, '<br>')}
            </div>

            <div class="reply-note">
                <strong>💡 Reply Instructions:</strong><br>
                Reply directly to this email to respond to the customer. The customer's email address is: <strong>${data.email}</strong>
            </div>
        </div>

        <div class="footer">
            <p>This message was sent from the Rork Ferry Booking System contact form.</p>
            <div class="timestamp">
                Received: ${timestamp}
            </div>
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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const { name, email, message }: ContactFormData = await req.json();

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin email addresses from environment or database
    const adminEmails = Deno.env.get('ADMIN_EMAILS')?.split(',') || [
      'admin@rorkferry.com',
    ];

    // Get Gmail credentials
    const gmailUser = Deno.env.get('GMAIL_USER') || 'crystalhotelsmv@gmail.com';
    const gmailPassword =
      Deno.env.get('GMAIL_APP_PASSWORD') || 'aajq lrvf wfiy wqtx';

    if (!gmailUser || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    // Prepare email data
    const emailData = {
      from: gmailUser,
      to: adminEmails[0], // Send to primary admin
      subject: `New Contact Form Submission - ${name}`,
      html: generateContactEmailHTML({ name, email, message }),
    };

    // Send email using Gmail SMTP
    let messageId: string;
    try {
      messageId = await sendEmailViaGmailSMTP(
        emailData,
        gmailUser,
        gmailPassword
      );
      console.log('✅ Contact form email sent successfully via Gmail SMTP');
    } catch (emailError) {
      console.error('❌ Gmail SMTP Error:', emailError);
      throw new Error(
        `Failed to send email via Gmail SMTP: ${emailError.message}`
      );
    }

    // Store in admin_notifications table
    const { error: notificationError } = await supabaseClient
      .from('admin_notifications')
      .insert({
        title: `Contact Form: ${name}`,
        message: `New contact form submission from ${name} (${email}): ${message}`,
        notification_type: 'contact_form',
        recipient_role: 'admin',
        priority: 1,
        metadata: {
          contact_name: name,
          contact_email: email,
          contact_message: message,
          submitted_at: new Date().toISOString(),
        },
      });

    if (notificationError) {
      console.error('Error storing notification:', notificationError);
      // Don't fail the request if notification storage fails
    }

    // Log the contact form submission
    const { error: logError } = await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: null, // Anonymous contact form
        action: 'contact_form_submission',
        details: {
          contact_name: name,
          contact_email: email,
          message_length: message.length,
        },
        entity_type: 'contact_form',
        entity_id: null,
      });

    if (logError) {
      console.error('Error logging activity:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contact form submitted successfully',
        messageId: messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Contact form error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process contact form submission',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
