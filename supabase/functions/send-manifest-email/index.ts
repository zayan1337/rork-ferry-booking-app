import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface PassengerManifestData {
  manifest_id: string;
  manifest_number: string;
  trip_id: string;
  trip_date: string;
  route_name: string;
  vessel_name: string;
  departure_time: string;
  captain_name: string;
  total_passengers: number;
  checked_in_passengers: number;
  no_show_passengers: number;
  passengers: Array<{
    passenger_id: string;
    passenger_name: string;
    contact_number: string;
    seat_number: string;
    booking_number: string;
    booking_status: string;
    check_in_status: boolean;
    checked_in_at?: string;
    special_assistance?: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    board_from?: string;
    drop_off_to?: string;
  }>;
  captain_notes?: string;
  weather_conditions?: string;
  delay_reason?: string;
  actual_departure_time: string;
}

// Send email via Gmail SMTP using native Deno TCP connection
async function sendEmailViaGmailSMTP(
  emailData: any,
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

    // Add recipients
    const recipients = emailData.to
      .split(',')
      .map((email: string) => email.trim());
    for (const recipient of recipients) {
      response = await sendTlsCommand(`RCPT TO:<${recipient}>`);
      if (!response.startsWith('250')) {
        throw new Error(`RCPT TO failed for ${recipient}: ${response}`);
      }
    }

    // Start data
    response = await sendTlsCommand('DATA');
    if (!response.startsWith('354')) {
      throw new Error(`DATA command failed: ${response}`);
    }

    // Send email headers and body
    // If multipartBody is provided, use it directly (for emails with attachments)
    // Otherwise, build simple HTML email
    let emailContent: string;
    if (emailData.multipartBody) {
      emailContent = emailData.multipartBody + '\r\n.';
    } else {
      emailContent = [
        `From: ${gmailUser}`,
        `To: ${emailData.to}`,
        `Subject: ${emailData.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        emailData.html || '',
        '.',
      ].join('\r\n');
    }

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

// Helper function to convert UTC to Asia timezone
function formatTimeInAsiaTimezone(utcTimeString: string): string {
  try {
    const date = new Date(utcTimeString);

    if (isNaN(date.getTime())) {
      return utcTimeString;
    }

    // Try Asia/Maldives first, fallback to manual calculation
    try {
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Maldives',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (timezoneError) {
      // Manual calculation: UTC + 5 hours
      const utcTime = date.getTime();
      const maldivesTime = new Date(utcTime + 5 * 60 * 60 * 1000);
      return maldivesTime.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });
    }
  } catch (error) {
    return utcTimeString; // Fallback to original string
  }
}

// Helper function to format date only in Asia timezone
function formatDateInAsiaTimezone(utcTimeString: string): string {
  try {
    const date = new Date(utcTimeString);
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Maldives',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    return utcTimeString;
  }
}

// Helper: return HHMMHrs in Asia/Maldives for a given time string
function formatHHMMHrsAsia(timeString: string): string {
  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      try {
        const t = date.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Maldives',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        return t.replace(':', '') + 'Hrs';
      } catch {
        const mv = new Date(date.getTime() + 5 * 60 * 60 * 1000);
        const hh = mv.getUTCHours().toString().padStart(2, '0');
        const mm = mv.getUTCMinutes().toString().padStart(2, '0');
        return `${hh}${mm}Hrs`;
      }
    }
  } catch {}
  return '';
}

// Helper function to Base64 encode UTF-8 string
function base64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to get ordered seat list (A1-A8, B1-B8, etc.)
function getOrderedSeats(maxSeats: number = 38): string[] {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J']; // Skipping 'I' as per image
  const cols = [1, 2, 3, 4, 5, 6, 7, 8];
  const seats: string[] = [];

  for (const row of rows) {
    for (const col of cols) {
      seats.push(`${row}${col}`);
      if (seats.length >= maxSeats) break;
    }
    if (seats.length >= maxSeats) break;
  }

  return seats;
}

// Helper function to escape XML content
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to format day of week
function getDayOfWeek(dateString: string): string {
  try {
    const date = new Date(dateString);
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()];
  } catch {
    return 'Monday'; // default
  }
}

// Generate Excel XML (SpreadsheetML) manifest
function generateExcelXml(data: PassengerManifestData): string {
  // Build seat list based ONLY on seats present for this trip's passengers
  // This avoids showing non-existent seats for the vessel in Excel
  const passengerMap = new Map<string, (typeof data.passengers)[0]>();
  const assignedSeats: string[] = [];
  const unassigned: (typeof data.passengers)[0][] = [];

  for (const p of data.passengers) {
    const seat = (p.seat_number || '').trim().toUpperCase();
    if (seat && seat !== 'NOT ASSIGNED') {
      if (!passengerMap.has(seat)) assignedSeats.push(seat);
      passengerMap.set(seat, p);
    } else {
      unassigned.push(p);
    }
  }

  // Sort seat labels by row letter then seat number (e.g., A1, A2, ..., B1, ...)
  const sortSeatLabels = (a: string, b: string): number => {
    const ra = a.match(/^[A-Za-z]+/g)?.[0] || '';
    const rb = b.match(/^[A-Za-z]+/g)?.[0] || '';
    if (ra !== rb) return ra.localeCompare(rb);
    const na = parseInt(a.replace(/^[A-Za-z]+/, '')) || 0;
    const nb = parseInt(b.replace(/^[A-Za-z]+/, '')) || 0;
    return na - nb;
  };
  assignedSeats.sort(sortSeatLabels);

  // Robust day/date/time for header
  const baseDateStr =
    data.trip_date || data.actual_departure_time || new Date().toISOString();
  const baseDate = new Date(baseDateStr);

  // Day of week
  const dayOfWeek = !isNaN(baseDate.getTime())
    ? getDayOfWeek(baseDate.toISOString())
    : getDayOfWeek(new Date().toISOString());

  // Date "DD MMM YYYY"
  let displayDate: string;
  if (!isNaN(baseDate.getTime())) {
    const day = baseDate.getDate().toString().padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[baseDate.getMonth()];
    const year = baseDate.getFullYear();
    displayDate = `${day} ${month} ${year}`;
  } else {
    displayDate = formatDateInAsiaTimezone(baseDateStr) || '';
  }

  // Time like "1030Hrs"
  const timeSource =
    data.departure_time || data.actual_departure_time || baseDateStr;
  const formattedTime = formatHHMMHrsAsia(timeSource) || '0000Hrs';

  // Route name - extract from/to for individual passenger use
  const routeParts = data.route_name.split(' to ');
  const fromLocation = routeParts[0] || data.route_name || 'Male';
  const toLocation = routeParts[1] || '';

  // Helper to resolve passenger contact number (passenger first, then booking owner)
  const getPassengerContact = (
    p: PassengerManifestData['passengers'][number] | undefined
  ): string => {
    return p?.contact_number && p.contact_number.trim()
      ? p.contact_number.trim()
      : (p?.client_phone || '').trim();
  };

  // Start building XML
  const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Interior ss:Color="#B0E0E6" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Passenger Manifest">
  <Table>`;

  // Header rows (3 rows as shown in image)
  const headerRows = `
   <Row>
    <Cell><Data ss:Type="String">${dayOfWeek}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">${displayDate || 'N/A'}</Data></Cell>
    <Cell><Data ss:Type="String">${data.route_name}</Data></Cell>
   </Row>
   <Row>
   <Cell><Data ss:Type="String">${formattedTime || 'N/A'}</Data></Cell>
   <Cell><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row>
   </Row>`;

  // Column headers (matching image exactly - no Gender column)
  const columnHeaders = `
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Seat</Data></Cell>
    <Cell><Data ss:Type="String">Name</Data></Cell>
    <Cell><Data ss:Type="String">Contact No.</Data></Cell>
    <Cell><Data ss:Type="String">Board from</Data></Cell>
    <Cell><Data ss:Type="String">Drop off to</Data></Cell>
   </Row>`;

  // Generate rows for seats present in this trip only
  const seatRowsAssigned = assignedSeats
    .map(seat => {
      const passenger = passengerMap.get(seat);
      return `
   <Row>
    <Cell><Data ss:Type="String">${seat}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(passenger?.passenger_name || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(getPassengerContact(passenger))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(passenger?.board_from || fromLocation || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(passenger?.drop_off_to || toLocation || '')}</Data></Cell>
   </Row>`;
    })
    .join('');

  // Optionally, list passengers without assigned seats at the end
  const seatRowsUnassigned = unassigned
    .map(
      p => `
   <Row>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.passenger_name || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(getPassengerContact(p))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.board_from || fromLocation || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(p.drop_off_to || toLocation || '')}</Data></Cell>
   </Row>`
    )
    .join('');

  const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

  return (
    xmlHeader +
    headerRows +
    columnHeaders +
    seatRowsAssigned +
    seatRowsUnassigned +
    xmlFooter
  );
}

// Build multipart email with HTML body and XML attachment
function buildMultipartEmail(
  htmlContent: string,
  attachmentName: string,
  attachmentBase64: string,
  to: string,
  from: string,
  subject: string
): string {
  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlContent,
    '',
    `--${boundary}`,
    `Content-Type: application/vnd.ms-excel; name="${attachmentName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    '',
    // Split base64 into 76-character lines as per RFC 2045
    attachmentBase64.match(/.{1,76}/g)?.join('\r\n') || attachmentBase64,
    '',
    `--${boundary}--`,
  ];

  return parts.join('\r\n');
}

// Helper function to format time only in Asia timezone
function formatTimeOnlyInAsiaTimezone(utcTimeString: string): string {
  try {
    const date = new Date(utcTimeString);

    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }

    // Try Asia/Maldives first, fallback to manual calculation
    try {
      return date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Maldives',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (timezoneError) {
      // Manual calculation: UTC + 5 hours
      const utcTime = date.getTime();
      const maldivesTime = new Date(utcTime + 5 * 60 * 60 * 1000);
      return maldivesTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });
    }
  } catch (error) {
    // Fallback: try to extract time manually
    try {
      const date = new Date(utcTimeString);
      const hours = date.getUTCHours() + 5; // Add 5 hours for Maldives time
      const minutes = date.getUTCMinutes();
      const adjustedHours = hours >= 24 ? hours - 24 : hours;
      const period = adjustedHours >= 12 ? 'PM' : 'AM';
      const displayHours =
        adjustedHours === 0
          ? 12
          : adjustedHours > 12
            ? adjustedHours - 12
            : adjustedHours;
      return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (fallbackError) {
      return 'N/A';
    }
  }
}

function generateManifestHTML(data: PassengerManifestData): string {
  const checkedInPassengers = data.passengers.filter(p => p.check_in_status);
  const noShowPassengers = data.passengers.filter(p => !p.check_in_status);

  const getPassengerContact = (
    p: PassengerManifestData['passengers'][number]
  ): string => {
    return p.contact_number && p.contact_number.trim()
      ? p.contact_number.trim()
      : (p.client_phone || '').trim();
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passenger Manifest - ${data.manifest_number}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: #fff; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .content { padding: 20px; }
        .trip-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .trip-info h2 { margin: 0 0 10px 0; color: #1e40af; font-size: 18px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .info-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
        .info-label { font-weight: bold; color: #64748b; }
        .info-value { color: #1e293b; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 8px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1e40af; }
        .stat-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .passengers-section { margin: 20px 0; }
        .passengers-section h3 { color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .passenger-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .passenger-table th, .passenger-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .passenger-table th { background: #f8fafc; font-weight: bold; color: #374151; }
        .status-checked-in { color: #059669; font-weight: bold; }
        .status-no-show { color: #dc2626; font-weight: bold; }
        .notes-section { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .notes-section h4 { margin: 0 0 10px 0; color: #92400e; }
        .footer { background: #f8fafc; padding: 15px; text-align: center; color: #64748b; font-size: 12px; }
        @media (max-width: 600px) {
            .info-grid { grid-template-columns: 1fr; }
            .stats { grid-template-columns: repeat(2, 1fr); }
            .passenger-table { font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Passenger Manifest</h1>
            <p>${data.manifest_number} | ${formatTimeInAsiaTimezone(data.actual_departure_time)}</p>
        </div>
        
        <div class="content">
            <div class="trip-info">
                <h2>Trip Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Route:</span>
                        <span class="info-value">${data.route_name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Vessel:</span>
                        <span class="info-value">${data.vessel_name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Travel Date:</span>
                        <span class="info-value">${formatDateInAsiaTimezone(
                          data.trip_date ||
                            data.departure_time ||
                            data.actual_departure_time
                        )}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Scheduled Departure:</span>
                        <span class="info-value">${data.departure_time}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Actual Departure:</span>
                        <span class="info-value">${formatTimeInAsiaTimezone(data.actual_departure_time)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Captain:</span>
                        <span class="info-value">${data.captain_name}</span>
                    </div>
                </div>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${data.total_passengers}</div>
                    <div class="stat-label">Total Passengers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #059669;">${data.checked_in_passengers}</div>
                    <div class="stat-label">Checked In</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #dc2626;">${data.no_show_passengers}</div>
                    <div class="stat-label">No Show</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${
                      data.total_passengers > 0
                        ? Math.round(
                            (data.checked_in_passengers /
                              data.total_passengers) *
                              100
                          )
                        : 0
                    }%</div>
                    <div class="stat-label">Check-in Rate</div>
                </div>
            </div>

            ${
              checkedInPassengers.length > 0
                ? `
            <div class="passengers-section">
                <h3>Checked-In Passengers (${checkedInPassengers.length})</h3>
                <table class="passenger-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Seat</th>
                            <th>Booking</th>
                            <th>Contact</th>
                            <th>Check-in Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${checkedInPassengers
                          .map(
                            p => `
                        <tr>
                            <td>${p.passenger_name}</td>
                            <td>${p.seat_number}</td>
                            <td>${p.booking_number}</td>
                            <td>${getPassengerContact(p)}</td>
                            <td class="status-checked-in">${p.checked_in_at ? formatTimeOnlyInAsiaTimezone(p.checked_in_at) : 'N/A'}</td>
                        </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
            `
                : ''
            }

            ${
              noShowPassengers.length > 0
                ? `
            <div class="passengers-section">
                <h3>No-Show Passengers (${noShowPassengers.length})</h3>
                <table class="passenger-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Seat</th>
                            <th>Booking</th>
                            <th>Contact</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${noShowPassengers
                          .map(
                            p => `
                        <tr>
                            <td>${p.passenger_name}</td>
                            <td>${p.seat_number}</td>
                            <td>${p.booking_number}</td>
                            <td>${p.contact_number}</td>
                            <td class="status-no-show">No Show</td>
                        </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
            `
                : ''
            }

            ${
              data.captain_notes || data.weather_conditions || data.delay_reason
                ? `
            <div class="notes-section">
                <h4>Additional Information</h4>
                ${data.captain_notes ? `<p><strong>Captain Notes:</strong> ${data.captain_notes}</p>` : ''}
                ${data.weather_conditions ? `<p><strong>Weather Conditions:</strong> ${data.weather_conditions}</p>` : ''}
                ${data.delay_reason ? `<p><strong>Delay Reason:</strong> ${data.delay_reason}</p>` : ''}
            </div>
            `
                : ''
            }
        </div>
        
        <div class="footer">
            <p>This manifest was generated automatically by ${Deno.env.get('COMPANY_NAME') || 'Crystal Transfer Vaavu'} Operations System</p>
            <p>Generated on: ${formatTimeInAsiaTimezone(new Date().toISOString())}</p>
        </div>
    </div>
</body>
</html>`;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { manifestData, recipients } = await req.json();

    if (!manifestData || !recipients || recipients.length === 0) {
      throw new Error('Missing manifest data or recipients');
    }

    const gmailUser = Deno.env.get('GMAIL_USER') || 'crystalhotelsmv@gmail.com';
    const gmailPassword =
      Deno.env.get('GMAIL_APP_PASSWORD') || 'aajq lrvf wfiy wqtx';
    const companyName =
      Deno.env.get('COMPANY_NAME') || 'Crystal Transfer Vaavu';

    if (!gmailUser || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    const htmlContent = generateManifestHTML(manifestData);

    // Generate Excel XML manifest
    const excelXml = generateExcelXml(manifestData);
    const excelBase64 = base64EncodeUtf8(excelXml);
    // Use .xls extension so clients (Gmail) prefer download/open in Excel
    const excelFileName = `Manifest-${manifestData.manifest_number}.xls`;

    // Build multipart email with HTML body and XML attachment
    const recipientsStr = recipients.join(',');
    const subject = `Passenger Manifest - ${manifestData.manifest_number} | ${manifestData.route_name}`;
    const multipartEmail = buildMultipartEmail(
      htmlContent,
      excelFileName,
      excelBase64,
      recipientsStr,
      gmailUser,
      subject
    );

    // Prepare email data (now using full multipart body)
    const emailData = {
      from: gmailUser,
      to: recipientsStr,
      subject: subject,
      multipartBody: multipartEmail, // Full multipart email body
    };

    // Send email using Gmail SMTP
    let messageId: string;
    try {
      messageId = await sendEmailViaGmailSMTP(
        emailData,
        gmailUser,
        gmailPassword
      );
    } catch (emailError) {
      console.error('❌ Gmail SMTP Error:', emailError);
      throw new Error(
        `Failed to send email via Gmail SMTP: ${emailError.message}`
      );
    }

    // Update email status in database for each recipient
    for (const recipient of recipients) {
      await supabaseClient.rpc('update_manifest_email_status', {
        p_manifest_id: manifestData.manifest_id,
        p_recipient_email: recipient,
        p_status: 'sent',
        p_resend_message_id: messageId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        message: 'Manifest email sent successfully via Gmail SMTP',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending manifest email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
