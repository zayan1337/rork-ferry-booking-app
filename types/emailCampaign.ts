// Email Campaign Types

export type UserRole = 'customer' | 'agent' | 'admin' | 'captain';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  category:
    | 'marketing'
    | 'operational'
    | 'transactional'
    | 'emergency'
    | 'general';
  variables: TemplateVariable[];
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
}

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'failed'
  | 'cancelled';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_id?: string;
  html_content?: string;
  // Channel configuration
  send_email: boolean;
  send_notification: boolean;
  // Status
  status: CampaignStatus;
  // Targeting
  target_criteria: TargetCriteria;
  // Scheduling
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  // Statistics
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  // Metadata
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TargetCriteria {
  // User targeting
  roles?: UserRole[];
  // Booking-based targeting
  routes?: string[];
  vessels?: string[];
  zones?: string[];
  islands?: string[];
  bookingStatus?: (
    | 'reserved'
    | 'pending_payment'
    | 'confirmed'
    | 'checked_in'
    | 'completed'
    | 'cancelled'
  )[];
  // Date-based targeting
  dateRange?: {
    from: string;
    to: string;
  };
  tripDateRange?: {
    from: string;
    to: string;
  };
  // Booking frequency
  bookingCountMin?: number;
  bookingCountMax?: number;
  // Specific user targeting
  excludeUsers?: string[];
  includeOnlyUsers?: string[];
  // Selected users (individual selection with checkboxes)
  selectedUserIds?: string[];
  // Trip-based targeting
  selectedTripIds?: string[];
  // All users option
  allUsers?: boolean;
}

export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  user_id?: string;
  email: string;
  full_name?: string;
  // Status tracking
  email_status: RecipientStatus;
  notification_status: RecipientStatus;
  // Engagement tracking
  email_sent_at?: string;
  email_opened_at?: string;
  email_clicked_at?: string;
  notification_sent_at?: string;
  notification_read_at?: string;
  // Error tracking
  error_message?: string;
  created_at: string;
}

// Form types
export interface CreateCampaignForm {
  name: string;
  subject: string;
  template_id?: string;
  html_content: string;
  send_email: boolean;
  send_notification: boolean;
  target_criteria: TargetCriteria;
  scheduled_at?: string;
}

export interface CreateTemplateForm {
  name: string;
  subject: string;
  html_content: string;
  category: EmailTemplate['category'];
  variables: TemplateVariable[];
}

// Analytics types
export interface CampaignAnalytics {
  campaign_id: string;
  total_recipients: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_failed: number;
  notifications_sent: number;
  notifications_read: number;
  open_rate: number;
  click_rate: number;
  delivery_rate: number;
}

// Stats types
export interface EmailCampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  scheduled_campaigns: number;
  draft_campaigns: number;
  total_emails_sent: number;
  total_notifications_sent: number;
  average_open_rate: number;
  average_click_rate: number;
  total_templates: number;
}
