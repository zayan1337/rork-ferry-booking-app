import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailRequest {
  userId: string;
  email?: string;
  fullName?: string;
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

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { userId, email, fullName }: WelcomeEmailRequest = await req.json();

    // If email and fullName not provided, fetch from user_profiles
    let userEmail = email;
    let userName = fullName;

    if (!userEmail || !userName) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error(
          `Failed to fetch user profile: ${profileError.message}`
        );
      }

      userEmail = userEmail || profile.email;
      userName = userName || profile.full_name || 'Valued Customer';
    }

    if (!userEmail) {
      throw new Error('User email is required');
    }

    // Get Gmail credentials
    const gmailUser = Deno.env.get('GMAIL_USER') || 'crystalhotelsmv@gmail.com';
    const gmailPassword =
      Deno.env.get('GMAIL_APP_PASSWORD') || 'aajq lrvf wfiy wqtx';

    if (!gmailUser || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    // Get the email template with icons instead of emojis
    let emailTemplate = getEmailTemplate();

    // Replace placeholders in template
    const appUrl = Deno.env.get('APP_URL') || 'https://www.crystalhotels.mv';
    const supportEmail =
      Deno.env.get('SUPPORT_EMAIL') || 'mailto:crystalhotelsmv@gmail.com';
    const faqUrl = `${appUrl}/faq`;
    const privacyUrl = `${appUrl}/privacy-policy`;
    const termsUrl = `${appUrl}/terms-and-conditions`;
    const facebookUrl =
      Deno.env.get('FACEBOOK_URL') ||
      'https://www.facebook.com/people/Crystal-Transfer-Vaavu/61580302100438/';
    const instagramUrl =
      Deno.env.get('INSTAGRAM_URL') ||
      'https://www.instagram.com/crystaltransfermv';
    const tiktokUrl =
      Deno.env.get('TIKTOK_URL') || 'https://www.tiktok.com/@crystal.transfer';

    emailTemplate = emailTemplate
      .replace(/{{USER_NAME}}/g, userName)
      .replace(/{{USER_EMAIL}}/g, userEmail)
      .replace(/{{APP_URL}}/g, appUrl)
      .replace(/{{SUPPORT_EMAIL}}/g, supportEmail)
      .replace(/{{FAQ_URL}}/g, faqUrl)
      .replace(/{{PRIVACY_URL}}/g, privacyUrl)
      .replace(/{{TERMS_URL}}/g, termsUrl)
      .replace(/{{FACEBOOK_URL}}/g, facebookUrl)
      .replace(/{{INSTAGRAM_URL}}/g, instagramUrl)
      .replace(/{{TIKTOK_URL}}/g, tiktokUrl);

    // Prepare email data
    const emailData = {
      from: gmailUser,
      to: userEmail,
      subject: 'Welcome to Crystal Transfer Vaavu - Get Started!',
      html: emailTemplate,
    };

    // Send email using Gmail SMTP
    let messageId: string;
    try {
      messageId = await sendEmailViaGmailSMTP(
        emailData,
        gmailUser,
        gmailPassword
      );
      console.log('✅ Welcome email sent successfully via Gmail SMTP');
    } catch (emailError) {
      console.error('❌ Gmail SMTP Error:', emailError);
      throw new Error(
        `Failed to send email via Gmail SMTP: ${emailError.message}`
      );
    }

    // Log email sent to database for tracking
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_type: 'welcome',
      recipient: userEmail,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully',
        messageId: messageId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-welcome-email:', error);
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

/**
 * Get email template with SVG icons instead of emojis
 * Embedded template for reliability and email client compatibility
 */
function getEmailTemplate(): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to Crystal Transfer Vaavu</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
        sans-serif;
      background-color: #f7f7f7;
    "
  >
    <table
      role="presentation"
      cellspacing="0"
      cellpadding="0"
      border="0"
      width="100%"
      style="background-color: #f7f7f7; padding: 40px 20px"
    >
      <tr>
        <td>
          <table
            role="presentation"
            cellspacing="0"
            cellpadding="0"
            border="0"
            width="100%"
            style="
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            "
          >
            <!-- Header Section with Success Icon -->
            <tr>
              <td style="text-align: center; padding: 40px 30px 10px">
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="margin: 0 auto"
                >
                  <tr>
                    <td
                      style="
                        width: 64px;
                        height: 64px;
                        background-color: #4caf50;
                        border-radius: 50%;
                        text-align: center;
                        vertical-align: middle;
                        line-height: 64px;
                        font-size: 38px;
                        color: white;
                        font-weight: bold;
                      "
                    >
                      ✓
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="text-align: center; padding: 0 30px 20px">
                <h1
                  style="
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                    color: #1a73e8;
                  "
                >
                  Welcome Aboard, {{USER_NAME}}!
                </h1>
              </td>
            </tr>

            <!-- Content Section -->
            <tr>
              <td style="padding: 0 30px 30px">
                <p
                  style="
                    margin: 0 0 20px;
                    font-size: 16px;
                    line-height: 1.6;
                    color: #333333;
                  "
                >
                  Congratulations! Your email has been successfully verified and
                  your Crystal Transfer Vaavu account is now active.
                </p>
                <p
                  style="
                    margin: 0 0 20px;
                    font-size: 16px;
                    line-height: 1.6;
                    color: #333333;
                  "
                >
                  We're thrilled to have you join our ferry booking community.
                  You can now enjoy seamless ferry transfers across the
                  beautiful islands of Maldives.
                </p>

                <!-- CTA Button -->
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="100%"
                  style="margin: 30px 0"
                >
                  <tr>
                    <td style="text-align: center">
                      <a
                        href="{{APP_URL}}"
                        style="
                          display: inline-block;
                          background-color: #1a73e8;
                          color: #ffffff;
                          text-decoration: none;
                          padding: 16px 40px;
                          border-radius: 6px;
                          font-weight: 600;
                          font-size: 16px;
                          box-shadow: 0 2px 4px rgba(26, 115, 232, 0.3);
                        "
                        >Start Booking Now</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- What You Can Do Section -->
            <tr>
              <td style="padding: 0 30px 30px">
                <h2
                  style="
                    margin: 0 0 20px;
                    font-size: 20px;
                    font-weight: 600;
                    color: #1a73e8;
                    text-align: center;
                  "
                >
                  What You Can Do Now
                </h2>

                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="100%"
                >
                  <!-- Feature 1 -->
                  <tr>
                    <td style="padding-bottom: 20px">
                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        width="100%"
                      >
                        <tr>
                          <td
                            style="
                              width: 50px;
                              vertical-align: top;
                              padding-right: 15px;
                            "
                          >
                            <table
                              role="presentation"
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                            >
                              <tr>
                                <td
                                  style="
                                    width: 40px;
                                    height: 40px;
                                    background-color: #e3f2fd;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                    line-height: 40px;
                                    font-size: 20px;
                                  "
                                >
                                  🎫
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top">
                            <h3
                              style="
                                margin: 0 0 8px;
                                font-size: 16px;
                                font-weight: 600;
                                color: #333333;
                              "
                            >
                              Book Ferry Tickets
                            </h3>
                            <p
                              style="
                                margin: 0;
                                font-size: 14px;
                                line-height: 1.5;
                                color: #666666;
                              "
                            >
                              Browse routes, select your preferred time, and
                              book tickets instantly with secure payment
                              options.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Feature 2 -->
                  <tr>
                    <td style="padding-bottom: 20px">
                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        width="100%"
                      >
                        <tr>
                          <td
                            style="
                              width: 50px;
                              vertical-align: top;
                              padding-right: 15px;
                            "
                          >
                            <table
                              role="presentation"
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                            >
                              <tr>
                                <td
                                  style="
                                    width: 40px;
                                    height: 40px;
                                    background-color: #e8f5e9;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                    line-height: 40px;
                                    font-size: 20px;
                                  "
                                >
                                  📱
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top">
                            <h3
                              style="
                                margin: 0 0 8px;
                                font-size: 16px;
                                font-weight: 600;
                                color: #333333;
                              "
                            >
                              Manage Bookings
                            </h3>
                            <p
                              style="
                                margin: 0;
                                font-size: 14px;
                                line-height: 1.5;
                                color: #666666;
                              "
                            >
                              View, modify, or cancel your bookings anytime from
                              your dashboard. Stay in control of your travel
                              plans.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Feature 3 -->
                  <tr>
                    <td style="padding-bottom: 20px">
                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        width="100%"
                      >
                        <tr>
                          <td
                            style="
                              width: 50px;
                              vertical-align: top;
                              padding-right: 15px;
                            "
                          >
                            <table
                              role="presentation"
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                            >
                              <tr>
                                <td
                                  style="
                                    width: 40px;
                                    height: 40px;
                                    background-color: #fff3e0;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                    line-height: 40px;
                                    font-size: 20px;
                                  "
                                >
                                  🎁
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top">
                            <h3
                              style="
                                margin: 0 0 8px;
                                font-size: 16px;
                                font-weight: 600;
                                color: #333333;
                              "
                            >
                              Exclusive Offers
                            </h3>
                            <p
                              style="
                                margin: 0;
                                font-size: 14px;
                                line-height: 1.5;
                                color: #666666;
                              "
                            >
                              Get access to special deals, seasonal discounts,
                              and loyalty rewards for frequent travelers.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Feature 4 -->
                  <tr>
                    <td>
                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        width="100%"
                      >
                        <tr>
                          <td
                            style="
                              width: 50px;
                              vertical-align: top;
                              padding-right: 15px;
                            "
                          >
                            <table
                              role="presentation"
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                            >
                              <tr>
                                <td
                                  style="
                                    width: 40px;
                                    height: 40px;
                                    background-color: #fce4ec;
                                    border-radius: 50%;
                                    text-align: center;
                                    vertical-align: middle;
                                    line-height: 40px;
                                    font-size: 20px;
                                  "
                                >
                                  🌍
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: top">
                            <h3
                              style="
                                margin: 0 0 8px;
                                font-size: 16px;
                                font-weight: 600;
                                color: #333333;
                              "
                            >
                              Explore Routes
                            </h3>
                            <p
                              style="
                                margin: 0;
                                font-size: 14px;
                                line-height: 1.5;
                                color: #666666;
                              "
                            >
                              Discover all available ferry routes connecting the
                              stunning islands of Vaavu Atoll and beyond.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Tips Section -->
            <tr>
              <td
                style="
                  padding: 30px;
                  background-color: #f8f9fa;
                  border-top: 1px solid #eeeeee;
                "
              >
                <h3
                  style="
                    margin: 0 0 15px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #333333;
                  "
                >
                  💡 Quick Tips for First-Time Users:
                </h3>
                <ul
                  style="margin: 0 0 15px; padding-left: 20px; color: #666666"
                >
                  <li
                    style="
                      margin-bottom: 8px;
                      font-size: 14px;
                      line-height: 1.5;
                    "
                  >
                    Book in advance to get the best seats
                  </li>
                  <li
                    style="
                      margin-bottom: 8px;
                      font-size: 14px;
                      line-height: 1.5;
                    "
                  >
                    Check weather conditions before your trip
                  </li>
                  <li
                    style="
                      margin-bottom: 8px;
                      font-size: 14px;
                      line-height: 1.5;
                    "
                  >
                    Arrive at the ferry terminal 15 minutes early
                  </li>
                  <li
                    style="margin-bottom: 0; font-size: 14px; line-height: 1.5"
                  >
                    Keep your booking confirmation handy
                  </li>
                </ul>
              </td>
            </tr>

            <!-- Need Help Section -->
            <tr>
              <td style="padding: 30px; border-top: 1px solid #eeeeee">
                <h3
                  style="
                    margin: 0 0 15px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #333333;
                    text-align: center;
                  "
                >
                  Need Help? We're Here for You!
                </h3>
                <p
                  style="
                    margin: 0 0 20px;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #666666;
                    text-align: center;
                  "
                >
                  Have questions or need assistance? Our support team is ready
                  to help you.
                </p>
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="100%"
                >
                  <tr>
                    <td style="text-align: center">
                      <a
                        href="{{SUPPORT_EMAIL}}"
                        style="
                          display: inline-block;
                          color: #1a73e8;
                          text-decoration: none;
                          font-weight: 500;
                          font-size: 14px;
                          margin-right: 20px;
                        "
                      >
                        📧 Email Support
                      </a>
                      <a
                        href="{{FAQ_URL}}"
                        style="
                          display: inline-block;
                          color: #1a73e8;
                          text-decoration: none;
                          font-weight: 500;
                          font-size: 14px;
                        "
                      >
                        ❓ FAQs
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Social Media Section -->
            <tr>
              <td
                style="
                  padding: 20px 30px;
                  text-align: center;
                  border-top: 1px solid #eeeeee;
                "
              >
                <p
                  style="
                    margin: 0 0 15px;
                    font-size: 14px;
                    color: #666666;
                    font-weight: 500;
                  "
                >
                  Follow us on social media for updates and special offers:
                </p>
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="100%"
                >
                  <tr>
                    <td style="text-align: center">
                      <a
                        href="{{FACEBOOK_URL}}"
                        style="
                          display: inline-block;
                          margin: 0 8px;
                          text-decoration: none;
                        "
                      >
                        <div
                          style="
                            width: 36px;
                            height: 36px;
                            background-color: #1877f2;
                            border-radius: 50%;
                            line-height: 36px;
                            color: white;
                            font-weight: bold;
                          "
                        >
                          f
                        </div>
                      </a>
                      <a
                        href="{{INSTAGRAM_URL}}"
                        style="
                          display: inline-block;
                          margin: 0 8px;
                          text-decoration: none;
                        "
                      >
                        <div
                          style="
                            width: 36px;
                            height: 36px;
                            background: linear-gradient(
                              45deg,
                              #f09433 0%,
                              #e6683c 25%,
                              #dc2743 50%,
                              #cc2366 75%,
                              #bc1888 100%
                            );
                            border-radius: 50%;
                            line-height: 36px;
                            color: white;
                            font-weight: bold;
                          "
                        >
                          i
                        </div>
                      </a>
                      <a
                        href="{{TIKTOK_URL}}"
                        style="
                          display: inline-block;
                          margin: 0 8px;
                          text-decoration: none;
                        "
                      >
                        <div
                          style="
                            width: 36px;
                            height: 36px;
                            background-color: #000000;
                            border-radius: 50%;
                            line-height: 36px;
                            color: white;
                            font-weight: bold;
                          "
                        >
                          ♪
                        </div>
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer Section -->
            <tr>
              <td
                style="
                  text-align: center;
                  padding: 30px;
                  border-top: 1px solid #eeeeee;
                  background-color: #f8f9fa;
                "
              >
                <p style="margin: 0 0 10px; font-size: 14px; color: #666666">
                  This email was sent to <strong>{{USER_EMAIL}}</strong>
                </p>
                <p style="margin: 0 0 10px; font-size: 14px; color: #666666">
                  Crystal Transfer Vaavu - Your Trusted Ferry Booking Partner
                </p>
                <p style="margin: 0 0 15px; font-size: 12px; color: #999999">
                  © 2025 Crystal Transfer Vaavu. All rights reserved.
                </p>
                <p style="margin: 0; font-size: 12px; color: #999999">
                  <a
                    href="{{PRIVACY_URL}}"
                    style="color: #1a73e8; text-decoration: none"
                    >Privacy Policy</a
                  >
                  |
                  <a
                    href="{{TERMS_URL}}"
                    style="color: #1a73e8; text-decoration: none"
                    >Terms of Service</a
                  >
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
