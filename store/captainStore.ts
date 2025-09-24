import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import {
  CaptainStore,
  CaptainTrip,
  CaptainPassenger,
  CaptainDashboardStats,
  CaptainProfile,
  CloseCheckinData,
} from '@/types/captain';

const initialState = {
  trips: [],
  passengers: [],
  dashboardStats: null,
  profile: null,
  loading: {
    trips: false,
    passengers: false,
    stats: false,
    profile: false,
    closeCheckin: false,
  },
  searchQuery: '',
  dateFilter: new Date().toISOString().split('T')[0],
  statusFilter: 'all',
  error: null,
};

export const useCaptainStore = create<CaptainStore>((set, get) => ({
  ...initialState,

  // Trip management
  fetchTodayTrips: async () => {
    set(state => ({
      ...state,
      loading: { ...state.loading, trips: true },
      error: null,
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('operations_trips_view')
        .select(
          `
          id,
          route_id,
          vessel_id,
          travel_date,
          departure_time,
          arrival_time,
          status,
          available_seats,
          booked_seats,
          captain_id,
          route_name,
          vessel_name,
          from_island_name,
          to_island_name,
          capacity,
          base_fare,
          confirmed_bookings,
          total_revenue
        `
        )
        .eq('captain_id', user.id)
        .eq('travel_date', today)
        .eq('is_active', true)
        .order('departure_time');

      if (error) throw error;

      const trips: CaptainTrip[] = (data || []).map(trip => ({
        id: trip.id,
        route_id: trip.route_id,
        vessel_id: trip.vessel_id,
        travel_date: trip.travel_date,
        departure_time: trip.departure_time,
        arrival_time: trip.arrival_time,
        status: trip.status,
        available_seats: trip.available_seats,
        booked_seats: trip.booked_seats || 0,
        checked_in_passengers: 0, // Will be fetched separately
        captain_id: trip.captain_id,
        is_checkin_closed: false, // Will be determined by status
        route_name: trip.route_name,
        vessel_name: trip.vessel_name,
        from_island_name: trip.from_island_name,
        to_island_name: trip.to_island_name,
        capacity: trip.capacity,
        base_fare: trip.base_fare,
        occupancy_rate: trip.capacity
          ? (trip.booked_seats / trip.capacity) * 100
          : 0,
        revenue: trip.total_revenue || 0,
        can_close_checkin: trip.status === 'boarding' && trip.booked_seats > 0,
      }));

      // Fetch checked-in passenger counts for each trip using captain_passengers_view
      for (const trip of trips) {
        const { data: checkedInData } = await supabase
          .from('captain_passengers_view')
          .select('id')
          .eq('trip_id', trip.id)
          .eq('check_in_status', true);

        trip.checked_in_passengers = checkedInData?.length || 0;
      }

      set(state => ({
        ...state,
        trips,
        loading: { ...state.loading, trips: false },
      }));
    } catch (error) {
      console.error('Error fetching today trips:', error);
      set(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to fetch trips',
        loading: { ...state.loading, trips: false },
      }));
    }
  },

  fetchTripsByDate: async (date: string) => {
    set(state => ({
      ...state,
      loading: { ...state.loading, trips: true },
      dateFilter: date,
      error: null,
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('operations_trips_view')
        .select(
          `
          id,
          route_id,
          vessel_id,
          travel_date,
          departure_time,
          arrival_time,
          status,
          available_seats,
          booked_seats,
          captain_id,
          route_name,
          vessel_name,
          from_island_name,
          to_island_name,
          capacity,
          base_fare,
          confirmed_bookings,
          total_revenue
        `
        )
        .eq('captain_id', user.id)
        .eq('travel_date', date)
        .eq('is_active', true)
        .order('departure_time');

      if (error) throw error;

      const trips: CaptainTrip[] = (data || []).map(trip => ({
        id: trip.id,
        route_id: trip.route_id,
        vessel_id: trip.vessel_id,
        travel_date: trip.travel_date,
        departure_time: trip.departure_time,
        arrival_time: trip.arrival_time,
        status: trip.status,
        available_seats: trip.available_seats,
        booked_seats: trip.booked_seats || 0,
        checked_in_passengers: 0,
        captain_id: trip.captain_id,
        is_checkin_closed: ['departed', 'arrived', 'completed'].includes(
          trip.status
        ),
        route_name: trip.route_name,
        vessel_name: trip.vessel_name,
        from_island_name: trip.from_island_name,
        to_island_name: trip.to_island_name,
        capacity: trip.capacity,
        base_fare: trip.base_fare,
        occupancy_rate: trip.capacity
          ? (trip.booked_seats / trip.capacity) * 100
          : 0,
        revenue: trip.total_revenue || 0,
        can_close_checkin: trip.status === 'boarding' && trip.booked_seats > 0,
      }));

      // Fetch checked-in passenger counts for each trip using captain_passengers_view
      for (const trip of trips) {
        const { data: checkedInData } = await supabase
          .from('captain_passengers_view')
          .select('id')
          .eq('trip_id', trip.id)
          .eq('check_in_status', true);

        trip.checked_in_passengers = checkedInData?.length || 0;
      }

      set(state => ({
        ...state,
        trips,
        loading: { ...state.loading, trips: false },
      }));
    } catch (error) {
      console.error('Error fetching trips by date:', error);
      set(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to fetch trips',
        loading: { ...state.loading, trips: false },
      }));
    }
  },

  fetchTripPassengers: async (tripId: string) => {
    set(state => ({
      ...state,
      loading: { ...state.loading, passengers: true },
      error: null,
    }));

    try {
      const { data, error } = await supabase
        .from('captain_passengers_view')
        .select(
          `
          id,
          booking_id,
          passenger_name,
          passenger_contact_number,
          seat_number,
          seat_id,
          check_in_status,
          checked_in_at,
          special_assistance_request,
          booking_number,
          booking_status,
          client_name,
          client_email,
          client_phone,
          trip_id,
          trip_date
        `
        )
        .eq('trip_id', tripId)
        .order('seat_number');

      if (error) throw error;

      const passengers: CaptainPassenger[] = (data || []).map(
        (passenger: any) => ({
          id: passenger.id,
          booking_id: passenger.booking_id,
          booking_number: passenger.booking_number || '',
          passenger_name: passenger.passenger_name,
          passenger_contact_number: passenger.passenger_contact_number,
          seat_number: passenger.seat_number || 'Not assigned',
          seat_id: passenger.seat_id,
          check_in_status: passenger.check_in_status || false,
          checked_in_at: passenger.checked_in_at,
          special_assistance_request: passenger.special_assistance_request,
          trip_id: passenger.trip_id,
          trip_date: passenger.trip_date,
          client_name: passenger.client_name || '',
          client_email: passenger.client_email || '',
          client_phone: passenger.client_phone || '',
          booking_status: passenger.booking_status || 'confirmed',
        })
      );

      set(state => ({
        ...state,
        passengers,
        loading: { ...state.loading, passengers: false },
      }));

      return passengers;
    } catch (error) {
      console.error('Error fetching trip passengers:', error);
      set(state => ({
        ...state,
        error:
          error instanceof Error ? error.message : 'Failed to fetch passengers',
        loading: { ...state.loading, passengers: false },
      }));
      return [];
    }
  },

  closeCheckin: async (data: CloseCheckinData) => {
    set(state => ({
      ...state,
      loading: { ...state.loading, closeCheckin: true },
      error: null,
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the database function to close check-in and generate manifest
      const { data: result, error: functionError } = await supabase.rpc(
        'close_trip_checkin',
        {
          p_trip_id: data.trip_id,
          p_captain_notes: data.captain_notes || null,
          p_weather_conditions: data.weather_conditions || null,
          p_delay_reason: data.delay_reason || null,
          p_actual_departure_time: data.actual_departure_time || null,
        }
      );

      if (functionError) throw functionError;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to close check-in');
      }

      // Prepare manifest data for email
      const currentTrip = get().trips.find(t => t.id === data.trip_id);
      const manifestData = {
        manifest_id: result.manifest_id,
        manifest_number: result.manifest_number,
        trip_id: data.trip_id,
        trip_date: currentTrip?.travel_date || '',
        route_name: currentTrip?.route_name || 'Unknown Route',
        vessel_name: currentTrip?.vessel_name || 'Unknown Vessel',
        departure_time: currentTrip?.departure_time || '',
        captain_name:
          currentTrip?.captain_name ||
          user.user_metadata?.full_name ||
          user.email ||
          'Unknown Captain',
        total_passengers: result.total_passengers,
        checked_in_passengers: result.checked_in_passengers,
        no_show_passengers: result.no_show_passengers,
        passengers: result.manifest_data || [],
        captain_notes: data.captain_notes,
        weather_conditions: data.weather_conditions,
        delay_reason: data.delay_reason,
        actual_departure_time:
          data.actual_departure_time || new Date().toISOString(),
      };

      // Send email with passenger manifest
      try {
        const { emailService } = await import('@/utils/emailService');
        const emailResult = await emailService.sendPassengerManifest(
          result.manifest_id,
          manifestData,
          result.email_recipients || []
        );

        if (!emailResult.success) {
          console.warn('Failed to send manifest email:', emailResult.error);
          // Don't fail the entire operation if email fails
        }
      } catch (emailError) {
        console.warn('Email service error:', emailError);
        // Don't fail the entire operation if email fails
      }

      // Update local state - mark trip as departed and check-in closed
      set(state => ({
        ...state,
        trips: state.trips.map(trip =>
          trip.id === data.trip_id
            ? {
                ...trip,
                status: 'departed',
                is_checkin_closed: true,
                checkin_closed_at: new Date().toISOString(),
                manifest_generated_at: new Date().toISOString(),
                manifest_sent_at: new Date().toISOString(),
                can_close_checkin: false,
              }
            : trip
        ),
        loading: { ...state.loading, closeCheckin: false },
      }));

      // Refresh trip data to get updated passenger counts
      await get().fetchTodayTrips();

      return true;
    } catch (error) {
      console.error('Error closing check-in:', error);
      set(state => ({
        ...state,
        error:
          error instanceof Error ? error.message : 'Failed to close check-in',
        loading: { ...state.loading, closeCheckin: false },
      }));
      return false;
    }
  },

  updateTripStatus: async (tripId: string, status: CaptainTrip['status']) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('trips')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tripId)
        .eq('captain_id', user.id);

      if (error) throw error;

      // Update local state
      set(state => ({
        ...state,
        trips: state.trips.map(trip =>
          trip.id === tripId ? { ...trip, status } : trip
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error updating trip status:', error);
      set(state => ({
        ...state,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update trip status',
      }));
      return false;
    }
  },

  // Dashboard
  fetchDashboardStats: async () => {
    set(state => ({
      ...state,
      loading: { ...state.loading, stats: true },
      error: null,
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Fetch today's trip stats
      const { data: tripStats, error: tripError } = await supabase
        .from('operations_trips_view')
        .select('id, status, booked_seats, total_revenue, capacity')
        .eq('captain_id', user.id)
        .eq('travel_date', today)
        .eq('is_active', true);

      if (tripError) throw tripError;

      // Fetch checked-in passengers count using captain_passengers_view
      const { data: checkedInData, error: checkedInError } = await supabase
        .from('captain_passengers_view')
        .select('id')
        .in(
          'trip_id',
          (tripStats || []).map(t => t.id)
        )
        .eq('check_in_status', true);

      if (checkedInError) throw checkedInError;

      const stats: CaptainDashboardStats = {
        todayTrips: tripStats?.length || 0,
        totalPassengers: (tripStats || []).reduce(
          (sum, trip) => sum + (trip.booked_seats || 0),
          0
        ),
        checkedInPassengers: checkedInData?.length || 0,
        completedTrips: (tripStats || []).filter(
          trip => trip.status === 'completed'
        ).length,
        onTimePercentage: 100, // TODO: Calculate based on actual vs scheduled departure times
        totalRevenue: (tripStats || []).reduce(
          (sum, trip) => sum + (trip.total_revenue || 0),
          0
        ),
        averageOccupancy: tripStats?.length
          ? tripStats.reduce(
              (sum, trip) =>
                sum + ((trip.booked_seats || 0) / (trip.capacity || 1)) * 100,
              0
            ) / tripStats.length
          : 0,
      };

      set(state => ({
        ...state,
        dashboardStats: stats,
        loading: { ...state.loading, stats: false },
      }));
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      set(state => ({
        ...state,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch dashboard stats',
        loading: { ...state.loading, stats: false },
      }));
    }
  },

  refreshDashboard: async () => {
    const { fetchDashboardStats, fetchTodayTrips } = get();
    await Promise.all([fetchDashboardStats(), fetchTodayTrips()]);
  },

  // Profile
  fetchProfile: async () => {
    set(state => ({
      ...state,
      loading: { ...state.loading, profile: true },
      error: null,
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('captain_profile_view')
        .select(
          `
          id,
          full_name,
          email,
          phone,
          mobile_number,
          role,
          created_at,
          total_trips,
          completed_trips,
          total_passengers,
          total_revenue,
          avg_occupancy_rate
        `
        )
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const profile: CaptainProfile = {
        id: data.id,
        full_name: data.full_name || 'Captain',
        email: data.email,
        phone: data.phone,
        status: 'active', // TODO: Add status field to user_profiles
        created_at: data.created_at,
      };

      set(state => ({
        ...state,
        profile,
        loading: { ...state.loading, profile: false },
      }));
    } catch (error) {
      console.error('Error fetching profile:', error);
      set(state => ({
        ...state,
        error:
          error instanceof Error ? error.message : 'Failed to fetch profile',
        loading: { ...state.loading, profile: false },
      }));
    }
  },

  updateProfile: async (data: Partial<CaptainProfile>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      set(state => ({
        ...state,
        profile: state.profile ? { ...state.profile, ...data } : null,
      }));

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      set(state => ({
        ...state,
        error:
          error instanceof Error ? error.message : 'Failed to update profile',
      }));
      return false;
    }
  },

  // Utility
  setSearchQuery: (query: string) => {
    set(state => ({ ...state, searchQuery: query }));
  },

  setDateFilter: (date: string) => {
    set(state => ({ ...state, dateFilter: date }));
  },

  setStatusFilter: (status: string) => {
    set(state => ({ ...state, statusFilter: status }));
  },

  clearError: () => {
    set(state => ({ ...state, error: null }));
  },

  reset: () => {
    set(initialState);
  },
}));
