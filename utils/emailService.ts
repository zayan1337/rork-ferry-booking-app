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
  passengers: {
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
  }[];
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
  /**
   * Send passenger manifest email using Supabase Edge Function with Gmail SMTP
   */
  async sendPassengerManifest(
    manifestId: string,
    manifestData: PassengerManifestData,
    recipients: string[]
  ): Promise<EmailResult> {
    try {
      // Get the current user's session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        'send-manifest-email',
        {
          body: {
            manifestData,
            recipients,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        throw new Error(
          error.message || 'Failed to send email via Edge Function'
        );
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to send email');
      }

      return {
        success: true,
        messageId: data.messageId,
      };
    } catch (error) {
      // Provide helpful error messages for common issues
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide helpful guidance for common Gmail SMTP errors
        if (errorMessage.includes('authentication')) {
          errorMessage =
            'Gmail authentication failed. Please check your app password and ensure 2FA is enabled.';
        } else if (errorMessage.includes('credentials')) {
          errorMessage =
            'Gmail credentials not configured. Please check your environment variables.';
        } else if (errorMessage.includes('SMTP')) {
          errorMessage =
            'Gmail SMTP connection failed. Please check your network connection.';
        }
      }

      // Update email status as failed for all recipients
      try {
        for (const recipient of recipients) {
          await supabase.rpc('update_manifest_email_status', {
            p_manifest_id: manifestId,
            p_recipient_email: recipient,
            p_status: 'failed',
            p_error_message: errorMessage,
          });
        }
      } catch (dbError) {
        // Ignore database update errors
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const emailService = new EmailService();
