import { supabase } from './supabase';

export interface PassengerManifestData {
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
  }>;
  captain_notes?: string;
  weather_conditions?: string;
  delay_reason?: string;
  actual_departure_time: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private resendApiKey: string;
  private fromEmail: string;
  private companyName: string;

  constructor() {
    // These should be set in your Supabase environment variables
    this.resendApiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'vaishnavvfies@gmail.com';
    this.companyName = process.env.COMPANY_NAME || 'Crystal Transfer Vaavu';
  }

  /**
   * Generate HTML content for passenger manifest email
   */
  private generateManifestHTML(data: PassengerManifestData): string {
    const checkedInPassengers = data.passengers.filter(p => p.check_in_status);
    const noShowPassengers = data.passengers.filter(p => !p.check_in_status);

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
        .stat-card { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; }
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
            <p>${data.manifest_number} | ${new Date(data.actual_departure_time).toLocaleDateString()}</p>
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
                        <span class="info-value">${new Date(data.trip_date).toLocaleDateString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Scheduled Departure:</span>
                        <span class="info-value">${data.departure_time}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Actual Departure:</span>
                        <span class="info-value">${new Date(data.actual_departure_time).toLocaleString()}</span>
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
                    <div class="stat-number">${Math.round((data.checked_in_passengers / data.total_passengers) * 100)}%</div>
                    <div class="stat-label">Check-in Rate</div>
                </div>
            </div>

            ${checkedInPassengers.length > 0 ? `
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
                        ${checkedInPassengers.map(p => `
                        <tr>
                            <td>${p.passenger_name}</td>
                            <td>${p.seat_number}</td>
                            <td>${p.booking_number}</td>
                            <td>${p.contact_number}</td>
                            <td class="status-checked-in">${p.checked_in_at ? new Date(p.checked_in_at).toLocaleTimeString() : 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${noShowPassengers.length > 0 ? `
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
                        ${noShowPassengers.map(p => `
                        <tr>
                            <td>${p.passenger_name}</td>
                            <td>${p.seat_number}</td>
                            <td>${p.booking_number}</td>
                            <td>${p.contact_number}</td>
                            <td class="status-no-show">No Show</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${(data.captain_notes || data.weather_conditions || data.delay_reason) ? `
            <div class="notes-section">
                <h4>Additional Information</h4>
                ${data.captain_notes ? `<p><strong>Captain Notes:</strong> ${data.captain_notes}</p>` : ''}
                ${data.weather_conditions ? `<p><strong>Weather Conditions:</strong> ${data.weather_conditions}</p>` : ''}
                ${data.delay_reason ? `<p><strong>Delay Reason:</strong> ${data.delay_reason}</p>` : ''}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This manifest was generated automatically by ${this.companyName} Operations System</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Send passenger manifest email using Resend
   */
  async sendPassengerManifest(
    manifestId: string,
    manifestData: PassengerManifestData,
    recipients: string[]
  ): Promise<EmailResult> {
    try {
      if (!this.resendApiKey) {
        throw new Error('Resend API key not configured');
      }

      const htmlContent = this.generateManifestHTML(manifestData);
      
      // Send email using Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: recipients,
          subject: `Passenger Manifest - ${manifestData.manifest_number} | ${manifestData.route_name}`,
          html: htmlContent,
          tags: [
            { name: 'type', value: 'passenger-manifest' },
            { name: 'manifest_id', value: manifestId },
            { name: 'trip_id', value: manifestData.trip_id },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      // Update email status in database for each recipient
      for (const recipient of recipients) {
        await supabase.rpc('update_manifest_email_status', {
          p_manifest_id: manifestId,
          p_recipient_email: recipient,
          p_status: 'sent',
          p_resend_message_id: result.id,
        });
      }

      return {
        success: true,
        messageId: result.id,
      };

    } catch (error) {
      console.error('Error sending passenger manifest email:', error);
      
      // Update email status as failed for all recipients
      for (const recipient of recipients) {
        await supabase.rpc('update_manifest_email_status', {
          p_manifest_id: manifestId,
          p_recipient_email: recipient,
          p_status: 'failed',
          p_error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(to: string): Promise<EmailResult> {
    try {
      if (!this.resendApiKey) {
        throw new Error('Resend API key not configured');
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: 'Test Email - Ferry Operations System',
          html: `
            <h2>Test Email</h2>
            <p>This is a test email from the Ferry Operations System.</p>
            <p>If you received this email, the email service is configured correctly.</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
          `,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send test email');
      }

      return {
        success: true,
        messageId: result.id,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const emailService = new EmailService();

