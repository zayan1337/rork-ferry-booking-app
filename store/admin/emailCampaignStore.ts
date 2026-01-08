import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import {
  EmailCampaign,
  EmailTemplate,
  CampaignRecipient,
  TargetCriteria,
  CreateCampaignForm,
  CreateTemplateForm,
  EmailCampaignStats,
} from '@/types/emailCampaign';

// User profile for selection
export interface SelectableUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  is_active: boolean;
}

// Trip for selection
export interface SelectableTrip {
  id: string;
  travel_date: string;
  departure_time: string;
  route_name: string;
  vessel_name: string;
  status: string;
  booking_count: number;
}

interface EmailCampaignState {
  // Data
  campaigns: EmailCampaign[];
  templates: EmailTemplate[];
  currentCampaign: EmailCampaign | null;
  recipients: CampaignRecipient[];
  stats: EmailCampaignStats;

  // User & Trip Selection
  availableUsers: SelectableUser[];
  availableTrips: SelectableTrip[];
  tripUsers: SelectableUser[];

  // UI State
  loading: {
    campaigns: boolean;
    templates: boolean;
    recipients: boolean;
    sending: boolean;
    recipientCount: boolean;
    users: boolean;
    trips: boolean;
    tripUsers: boolean;
  };
  error: string | null;
  recipientPreviewCount: number;

  // Actions - Campaigns
  fetchCampaigns: () => Promise<void>;
  fetchCampaign: (id: string) => Promise<EmailCampaign | null>;
  createCampaign: (
    campaign: CreateCampaignForm
  ) => Promise<EmailCampaign | null>;
  updateCampaign: (
    id: string,
    updates: Partial<EmailCampaign>
  ) => Promise<boolean>;
  deleteCampaign: (id: string) => Promise<boolean>;
  sendCampaign: (id: string) => Promise<boolean>;
  pauseCampaign: (id: string) => Promise<boolean>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<boolean>;

  // Actions - Templates
  fetchTemplates: () => Promise<void>;
  createTemplate: (
    template: CreateTemplateForm
  ) => Promise<EmailTemplate | null>;
  updateTemplate: (
    id: string,
    updates: Partial<EmailTemplate>
  ) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;

  // Actions - Recipients
  fetchRecipients: (campaignId: string) => Promise<void>;
  previewRecipientCount: (criteria: TargetCriteria) => Promise<number>;

  // Actions - User Selection
  fetchAvailableUsers: (searchQuery?: string) => Promise<void>;
  fetchAvailableTrips: () => Promise<void>;
  fetchUsersForTrip: (tripId: string) => Promise<SelectableUser[]>;

  // Actions - Stats
  fetchStats: () => Promise<void>;

  // Utility
  clearError: () => void;
  setCurrentCampaign: (campaign: EmailCampaign | null) => void;
}

export const useEmailCampaignStore = create<EmailCampaignState>((set, get) => ({
  // Initial State
  campaigns: [],
  templates: [],
  currentCampaign: null,
  recipients: [],
  stats: {
    total_campaigns: 0,
    active_campaigns: 0,
    scheduled_campaigns: 0,
    draft_campaigns: 0,
    total_emails_sent: 0,
    total_notifications_sent: 0,
    average_open_rate: 0,
    average_click_rate: 0,
    total_templates: 0,
  },
  availableUsers: [],
  availableTrips: [],
  tripUsers: [],
  loading: {
    campaigns: false,
    templates: false,
    recipients: false,
    sending: false,
    recipientCount: false,
    users: false,
    trips: false,
    tripUsers: false,
  },
  error: null,
  recipientPreviewCount: 0,

  // Campaign Actions
  fetchCampaigns: async () => {
    set(state => ({
      loading: { ...state.loading, campaigns: true },
      error: null,
    }));
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select(
          `
          *,
          created_by_profile:user_profiles!email_campaigns_created_by_fkey(full_name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const campaigns = (data || []).map(c => ({
        ...c,
        created_by_name: c.created_by_profile?.full_name || 'Unknown',
      }));

      set({ campaigns, loading: { ...get().loading, campaigns: false } });
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      set({
        error: error.message || 'Failed to fetch campaigns',
        loading: { ...get().loading, campaigns: false },
      });
    }
  },

  fetchCampaign: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select(
          `
          *,
          created_by_profile:user_profiles!email_campaigns_created_by_fkey(full_name)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      const campaign = {
        ...data,
        created_by_name: data.created_by_profile?.full_name || 'Unknown',
      };

      set({ currentCampaign: campaign });
      return campaign;
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      set({ error: error.message });
      return null;
    }
  },

  createCampaign: async (campaignData: CreateCampaignForm) => {
    set(state => ({
      loading: { ...state.loading, campaigns: true },
      error: null,
    }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get recipient count
      const recipientCount = await get().previewRecipientCount(
        campaignData.target_criteria
      );

      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          name: campaignData.name,
          subject: campaignData.subject,
          template_id: campaignData.template_id || null,
          html_content: campaignData.html_content,
          send_email: campaignData.send_email,
          send_notification: campaignData.send_notification,
          target_criteria: campaignData.target_criteria,
          scheduled_at: campaignData.scheduled_at || null,
          status: campaignData.scheduled_at ? 'scheduled' : 'draft',
          total_recipients: recipientCount,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh campaigns list
      await get().fetchCampaigns();

      set({ loading: { ...get().loading, campaigns: false } });
      return data;
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      set({
        error: error.message || 'Failed to create campaign',
        loading: { ...get().loading, campaigns: false },
      });
      return null;
    }
  },

  updateCampaign: async (id: string, updates: Partial<EmailCampaign>) => {
    try {
      // If target_criteria is being updated, recalculate the recipient count
      const finalUpdates = { ...updates };
      if (updates.target_criteria) {
        const recipientCount = await get().previewRecipientCount(
          updates.target_criteria
        );
        finalUpdates.total_recipients = recipientCount;
      }

      const { error } = await supabase
        .from('email_campaigns')
        .update(finalUpdates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      set(state => ({
        campaigns: state.campaigns.map(c =>
          c.id === id ? { ...c, ...finalUpdates } : c
        ),
        currentCampaign:
          state.currentCampaign?.id === id
            ? { ...state.currentCampaign, ...finalUpdates }
            : state.currentCampaign,
      }));

      return true;
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      set({ error: error.message });
      return false;
    }
  },

  deleteCampaign: async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        campaigns: state.campaigns.filter(c => c.id !== id),
        currentCampaign:
          state.currentCampaign?.id === id ? null : state.currentCampaign,
      }));

      return true;
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      set({ error: error.message });
      return false;
    }
  },

  sendCampaign: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, sending: true },
      error: null,
    }));
    try {
      // Update status to sending
      await get().updateCampaign(id, {
        status: 'sending',
        started_at: new Date().toISOString(),
      });

      // Call edge function to send emails
      const { data, error } = await supabase.functions.invoke(
        'send-bulk-email',
        {
          body: { campaignId: id },
        }
      );

      if (error) throw error;

      // Refresh campaign data
      await get().fetchCampaign(id);
      await get().fetchCampaigns();

      set({ loading: { ...get().loading, sending: false } });
      return true;
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      await get().updateCampaign(id, { status: 'failed' });
      set({
        error: error.message || 'Failed to send campaign',
        loading: { ...get().loading, sending: false },
      });
      return false;
    }
  },

  pauseCampaign: async (id: string) => {
    return get().updateCampaign(id, { status: 'paused' });
  },

  scheduleCampaign: async (id: string, scheduledAt: string) => {
    return get().updateCampaign(id, {
      status: 'scheduled',
      scheduled_at: scheduledAt,
    });
  },

  // Template Actions
  fetchTemplates: async () => {
    set(state => ({
      loading: { ...state.loading, templates: true },
      error: null,
    }));
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        templates: data || [],
        loading: { ...get().loading, templates: false },
      });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      set({
        error: error.message,
        loading: { ...get().loading, templates: false },
      });
    }
  },

  createTemplate: async (templateData: CreateTemplateForm) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          name: templateData.name,
          subject: templateData.subject,
          html_content: templateData.html_content,
          category: templateData.category,
          variables: templateData.variables,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({ templates: [data, ...state.templates] }));
      return data;
    } catch (error: any) {
      console.error('Error creating template:', error);
      set({ error: error.message });
      return null;
    }
  },

  updateTemplate: async (id: string, updates: Partial<EmailTemplate>) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        templates: state.templates.map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));

      return true;
    } catch (error: any) {
      console.error('Error updating template:', error);
      set({ error: error.message });
      return false;
    }
  },

  deleteTemplate: async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        templates: state.templates.filter(t => t.id !== id),
      }));

      return true;
    } catch (error: any) {
      console.error('Error deleting template:', error);
      set({ error: error.message });
      return false;
    }
  },

  // Recipient Actions
  fetchRecipients: async (campaignId: string) => {
    set(state => ({ loading: { ...state.loading, recipients: true } }));
    try {
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      set({
        recipients: data || [],
        loading: { ...get().loading, recipients: false },
      });
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      set({ loading: { ...get().loading, recipients: false } });
    }
  },

  previewRecipientCount: async (criteria: TargetCriteria) => {
    set(state => ({ loading: { ...state.loading, recipientCount: true } }));
    try {
      // If selectedUserIds is provided (individual selection mode)
      if (criteria.selectedUserIds && criteria.selectedUserIds.length > 0) {
        const recipientCount = criteria.selectedUserIds.length;
        set({
          recipientPreviewCount: recipientCount,
          loading: { ...get().loading, recipientCount: false },
        });
        return recipientCount;
      }

      // If allUsers is true, count all active users
      if (criteria.allUsers) {
        const { count, error } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .not('email', 'is', null);

        if (error) throw error;

        const recipientCount = count || 0;
        set({
          recipientPreviewCount: recipientCount,
          loading: { ...get().loading, recipientCount: false },
        });
        return recipientCount;
      }

      // If roles are specified, count users with those roles
      if (criteria.roles && criteria.roles.length > 0) {
        const { count, error } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .not('email', 'is', null)
          .in('role', criteria.roles);

        if (error) throw error;

        const recipientCount = count || 0;
        set({
          recipientPreviewCount: recipientCount,
          loading: { ...get().loading, recipientCount: false },
        });
        return recipientCount;
      }

      // Try using the database function for complex criteria
      const { data, error } = await supabase.rpc('count_campaign_recipients', {
        criteria: criteria,
      });

      if (error) {
        // No specific criteria, return 0
        set({
          recipientPreviewCount: 0,
          loading: { ...get().loading, recipientCount: false },
        });
        return 0;
      }

      const recipientCount = data || 0;
      set({
        recipientPreviewCount: recipientCount,
        loading: { ...get().loading, recipientCount: false },
      });
      return recipientCount;
    } catch (error: any) {
      console.error('Error counting recipients:', error);
      set({ loading: { ...get().loading, recipientCount: false } });
      return 0;
    }
  },

  // Stats Actions
  fetchStats: async () => {
    try {
      // Fetch campaign stats
      const { data: campaigns } = await supabase
        .from('email_campaigns')
        .select('status, sent_count, opened_count, clicked_count');

      const { count: templateCount } = await supabase
        .from('email_templates')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const campaignList = campaigns || [];

      const stats: EmailCampaignStats = {
        total_campaigns: campaignList.length,
        active_campaigns: campaignList.filter(c => c.status === 'sending')
          .length,
        scheduled_campaigns: campaignList.filter(c => c.status === 'scheduled')
          .length,
        draft_campaigns: campaignList.filter(c => c.status === 'draft').length,
        total_emails_sent: campaignList.reduce(
          (sum, c) => sum + (c.sent_count || 0),
          0
        ),
        total_notifications_sent: 0, // TODO: Track notifications separately
        average_open_rate:
          campaignList.length > 0
            ? campaignList.reduce((sum, c) => {
                const rate =
                  c.sent_count > 0 ? (c.opened_count / c.sent_count) * 100 : 0;
                return sum + rate;
              }, 0) / campaignList.length
            : 0,
        average_click_rate:
          campaignList.length > 0
            ? campaignList.reduce((sum, c) => {
                const rate =
                  c.sent_count > 0 ? (c.clicked_count / c.sent_count) * 100 : 0;
                return sum + rate;
              }, 0) / campaignList.length
            : 0,
        total_templates: templateCount || 0,
      };

      set({ stats });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  },

  // User Selection Actions
  fetchAvailableUsers: async (searchQuery?: string) => {
    set(state => ({ loading: { ...state.loading, users: true } }));
    try {
      let query = supabase
        .from('user_profiles')
        .select('id, email, full_name, role, mobile_number, is_active')
        .eq('is_active', true)
        .not('email', 'is', null)
        .order('full_name', { ascending: true })
        .limit(200);

      if (searchQuery) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      set({
        availableUsers: data || [],
        loading: { ...get().loading, users: false },
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      set({ loading: { ...get().loading, users: false } });
    }
  },

  fetchAvailableTrips: async () => {
    set(state => ({ loading: { ...state.loading, trips: true } }));
    try {
      // Fetch upcoming trips (today and future) with booking counts
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('trips')
        .select(
          `
          id,
          travel_date,
          departure_time,
          status,
          routes!inner(name),
          vessels!inner(name)
        `
        )
        .gte('travel_date', today)
        .in('status', ['scheduled', 'boarding'])
        .order('travel_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50);

      if (error) throw error;

      // Get booking counts for each trip
      const tripIds = (data || []).map(t => t.id);

      let bookingCounts: Record<string, number> = {};
      if (tripIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('trip_id')
          .in('trip_id', tripIds)
          .in('status', [
            'confirmed',
            'pending_payment',
            'reserved',
            'checked_in',
          ]);

        if (bookings) {
          bookingCounts = bookings.reduce((acc: Record<string, number>, b) => {
            acc[b.trip_id] = (acc[b.trip_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const trips: SelectableTrip[] = (data || []).map(t => ({
        id: t.id,
        travel_date: t.travel_date,
        departure_time: t.departure_time,
        route_name: (t.routes as any)?.name || 'Unknown Route',
        vessel_name: (t.vessels as any)?.name || 'Unknown Vessel',
        status: t.status,
        booking_count: bookingCounts[t.id] || 0,
      }));

      set({
        availableTrips: trips,
        loading: { ...get().loading, trips: false },
      });
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      set({ loading: { ...get().loading, trips: false } });
    }
  },

  fetchUsersForTrip: async (tripId: string) => {
    set(state => ({ loading: { ...state.loading, tripUsers: true } }));
    try {
      // Get all users who have bookings for this trip
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          user_id,
          user_profiles!inner(
            id,
            email,
            full_name,
            role,
            mobile_number,
            is_active
          )
        `
        )
        .eq('trip_id', tripId)
        .in('status', [
          'confirmed',
          'pending_payment',
          'reserved',
          'checked_in',
        ]);

      if (error) throw error;

      // Extract unique users
      const userMap = new Map<string, SelectableUser>();
      (data || []).forEach(booking => {
        const user = booking.user_profiles as any;
        if (user && user.id && !userMap.has(user.id)) {
          userMap.set(user.id, {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            mobile_number: user.mobile_number,
            is_active: user.is_active,
          });
        }
      });

      const users = Array.from(userMap.values());
      set({
        tripUsers: users,
        loading: { ...get().loading, tripUsers: false },
      });

      return users;
    } catch (error: any) {
      console.error('Error fetching trip users:', error);
      set({ loading: { ...get().loading, tripUsers: false } });
      return [];
    }
  },

  // Utility Actions
  clearError: () => set({ error: null }),
  setCurrentCampaign: campaign => set({ currentCampaign: campaign }),
}));
