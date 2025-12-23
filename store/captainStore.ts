import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { getMaldivesTodayString } from '@/utils/timezoneUtils';
import {
  CaptainStore,
  CaptainTrip,
  CaptainPassenger,
  CaptainDashboardStats,
  CaptainProfile,
  CloseCheckinData,
  CaptainRouteStop,
} from '@/types/captain';
import {
  getCaptainTripStops,
  getPassengersForStop,
  moveToNextStop,
  completeStopBoarding,
  processMultiStopCheckIn,
} from '@/utils/captain/multiStopCaptainUtils';
import {
  fetchCancellationDetails,
  calculateTotalRevenue,
  type BookingForRevenue,
} from '@/utils/revenueCalculation';

// Helper function to get total stops for a trip
async function getTotalStopsForTrip(tripId: string): Promise<number> {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .select('route_id')
      .eq('id', tripId)
      .single();

    if (error || !trip) return 0;

    const { count, error: countError } = await supabase
      .from('route_stops')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', trip.route_id);

    if (countError) return 0;
    return count || 0;
  } catch (error) {
    console.error('Error getting total stops:', error);
    return 0;
  }
}

// Helper function to enrich passengers with board_from/drop_off_to using booking segments
async function enrichPassengerStops(passengers: any[]): Promise<any[]> {
  try {
    const bookingNumbers = Array.from(
      new Set(
        passengers.map(p => (p.booking_number || '').trim()).filter(Boolean)
      )
    );

    if (bookingNumbers.length === 0) return passengers;

    // Fetch booking → segments → route stops → island names in one go
    const { data: bookingsData, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        booking_segments(
          boarding_stop_id,
          destination_stop_id,
          boarding_stop:route_stops!booking_segments_boarding_stop_id_fkey(
            id,
            stop_sequence,
            island_id,
            islands(name)
          ),
          destination_stop:route_stops!booking_segments_destination_stop_id_fkey(
            id,
            stop_sequence,
            island_id,
            islands(name)
          )
        )
      `
      )
      .in('booking_number', bookingNumbers);

    if (error) {
      console.error('Failed to fetch booking segments for manifest:', error);
      return passengers;
    }

    const byBookingNumber: Record<string, any> = {};
    (bookingsData || []).forEach((b: any) => {
      // Handle both array and object response from Supabase
      const segments = b.booking_segments;
      let seg = null;

      if (Array.isArray(segments)) {
        // If it's an array, get the first element
        seg = segments[0];
      } else if (segments && typeof segments === 'object') {
        // If it's an object (single record), use it directly
        seg = segments;
      }

      const boardingName = seg?.boarding_stop?.islands?.name || '';
      const destinationName = seg?.destination_stop?.islands?.name || '';
      byBookingNumber[(b.booking_number || '').trim()] = {
        board_from: boardingName,
        drop_off_to: destinationName,
      };
    });

    // Merge back into passengers
    return passengers.map((p: any) => {
      const bn = (p.booking_number || '').trim();
      const resolved = byBookingNumber[bn];
      if (resolved) {
        return {
          ...p,
          board_from: p.board_from || resolved.board_from || '',
          drop_off_to: p.drop_off_to || resolved.drop_off_to || '',
        };
      }
      return p;
    });
  } catch (err) {
    console.error('enrichPassengerStops error:', err);
    return passengers;
  }
}

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
  dateFilter: getMaldivesTodayString(),
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

      const today = getMaldivesTodayString();

      const { data, error } = await supabase
        .from('trips')
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
          is_active,
          created_at,
          updated_at,
          current_stop_sequence,
          current_stop_id,
          trip_progress_status,
          special_assistance_count:bookings(count),
          route:route_id(
            id,
            name,
            base_fare,
            distance,
            duration,
            description
          ),
          vessel:vessel_id(
            id,
            name,
            model,
            registration_number,
            seating_capacity
          )
        `
        )
        .eq('captain_id', user.id)
        .eq('travel_date', today)
        .order('departure_time');

      if (error) throw error;

      // First create trips without total_stops
      const trips: CaptainTrip[] = (data || []).map(trip => {
        const route = Array.isArray(trip.route) ? trip.route[0] : trip.route;
        const vessel = Array.isArray(trip.vessel)
          ? trip.vessel[0]
          : trip.vessel;

        return {
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
          is_active: trip.is_active,
          is_checkin_closed: false, // Will be determined by status
          current_stop_sequence: trip.current_stop_sequence || 1,
          current_stop_id: trip.current_stop_id,
          trip_progress_status: trip.trip_progress_status,
          special_assistance_count: Array.isArray(trip.special_assistance_count)
            ? trip.special_assistance_count[0]?.count || 0
            : trip.special_assistance_count || 0,
          route_name: route?.name || 'Unknown Route',
          vessel_name: vessel?.name || 'Unknown Vessel',
          from_island_name: 'Multi-Stop Route', // Will be determined from route stops
          to_island_name: 'Multi-Stop Route', // Will be determined from route stops
          capacity: vessel?.seating_capacity || 0,
          base_fare: route?.base_fare || 0,
          occupancy_rate: vessel?.seating_capacity
            ? ((trip.booked_seats || 0) / vessel.seating_capacity) * 100
            : 0,
          revenue: 0, // Will be calculated separately
          can_close_checkin:
            trip.status === 'boarding' && trip.booked_seats > 0,
          // Multi-stop fields - all routes are now multi-stop
          is_multi_stop: true, // All routes are multi-stop now
          total_stops: undefined, // Will be set below
        };
      });

      // Fetch total stops for all trips (all routes are now multi-stop)
      for (const trip of trips) {
        trip.total_stops = await getTotalStopsForTrip(trip.id);

        // If trip is completed, show the final stop in progress
        if (trip.status === 'completed' && trip.total_stops) {
          trip.current_stop_sequence = trip.total_stops;
        }
      }

      // Fetch booking counts, checked-in passenger counts, and revenue for each trip
      for (const trip of trips) {
        // Run all queries in parallel for this trip
        const [
          { data: allPassengers, error: allError },
          { data: checkedInData, error: checkedInError },
          { data: bookingsData, error: bookingsError },
        ] = await Promise.all([
          // Count total active bookings (already filtered by view)
          supabase
            .from('captain_passengers_view')
            .select('id', { count: 'exact', head: false })
            .eq('trip_id', trip.id),
          // Count checked-in passengers
          supabase
            .from('captain_passengers_view')
            .select('id', { count: 'exact', head: false })
            .eq('trip_id', trip.id)
            .eq('check_in_status', true),
          // Fetch all bookings for revenue calculation (including cancelled with partial refunds)
          supabase
            .from('bookings')
            .select('id, total_fare, status')
            .eq('trip_id', trip.id),
        ]);

        if (allError) {
          console.error('Error fetching all passengers count:', allError);
          trip.booked_seats = 0;
        } else {
          trip.booked_seats = allPassengers?.length || 0;
        }

        if (checkedInError) {
          console.error('Error fetching checked-in count:', checkedInError);
          trip.checked_in_passengers = 0;
        } else {
          trip.checked_in_passengers = checkedInData?.length || 0;
        }

        // Calculate revenue from all bookings (including cancelled with partial refunds)
        if (bookingsError) {
          console.error('Error fetching bookings for revenue:', bookingsError);
          trip.revenue = 0;
        } else {
          // Fetch cancellation details for all bookings
          const bookingIds = bookingsData?.map(b => b.id) || [];
          const cancellationMap = await fetchCancellationDetails(bookingIds);

          // Calculate net revenue accounting for partial refunds
          const bookingsForRevenue: BookingForRevenue[] =
            bookingsData?.map(booking => ({
              id: booking.id,
              status: booking.status,
              total_fare: booking.total_fare || 0,
            })) || [];

          trip.revenue = calculateTotalRevenue(
            bookingsForRevenue,
            cancellationMap
          );
        }

        // Recalculate occupancy rate with actual booked_seats
        trip.occupancy_rate = trip.capacity
          ? (trip.booked_seats / trip.capacity) * 100
          : 0;
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

      // Fetch trips with current_stop_sequence from trips table
      const { data, error } = await supabase
        .from('trips')
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
          is_active,
          current_stop_sequence,
          current_stop_id,
          trip_progress_status,
          route:route_id(
            id,
            name,
            base_fare
          ),
          vessel:vessel_id(
            id,
            name,
            seating_capacity
          ),
          special_assistance_count:bookings(count)
        `
        )
        .eq('captain_id', user.id)
        .eq('travel_date', date)
        .order('departure_time');

      if (error) throw error;

      const trips: CaptainTrip[] = await Promise.all(
        (data || []).map(async trip => {
          const route = Array.isArray(trip.route) ? trip.route[0] : trip.route;
          const vessel = Array.isArray(trip.vessel)
            ? trip.vessel[0]
            : trip.vessel;

          // Get total stops for this route
          const { count: totalStops } = await supabase
            .from('route_stops')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('route_id', trip.route_id);

          return {
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
            is_active: trip.is_active,
            is_checkin_closed: ['departed', 'arrived', 'completed'].includes(
              trip.status
            ),
            current_stop_id: trip.current_stop_id,
            total_stops: totalStops || 0,
            // If trip is completed, show the final stop in progress
            current_stop_sequence:
              trip.status === 'completed' && totalStops
                ? totalStops
                : trip.current_stop_sequence || 1,
            trip_progress_status: trip.trip_progress_status,
            special_assistance_count: Array.isArray(
              trip.special_assistance_count
            )
              ? trip.special_assistance_count[0]?.count || 0
              : trip.special_assistance_count || 0,
            route_name: route?.name || 'Unknown Route',
            vessel_name: vessel?.name || 'Unknown Vessel',
            from_island_name: '', // Will be set from route stops
            to_island_name: '', // Will be set from route stops
            capacity: vessel?.seating_capacity || 0,
            base_fare: route?.base_fare || 0,
            occupancy_rate: vessel?.seating_capacity
              ? ((trip.booked_seats || 0) / vessel.seating_capacity) * 100
              : 0,
            revenue: 0, // Will be calculated from bookings
            can_close_checkin:
              trip.status === 'boarding' && (trip.booked_seats || 0) > 0,
          };
        })
      );

      // Fetch booking counts, checked-in passenger counts, and revenue for all trips in parallel
      await Promise.all(
        trips.map(async trip => {
          // Run all queries in parallel for this trip
          const [
            { data: allPassengers, error: allError },
            { data: checkedInData, error: checkedInError },
            { data: allBookings, error: bookingsError },
          ] = await Promise.all([
            // Count total active bookings (already filtered by view)
            supabase
              .from('captain_passengers_view')
              .select('id', { count: 'exact', head: false })
              .eq('trip_id', trip.id),
            // Count checked-in passengers
            supabase
              .from('captain_passengers_view')
              .select('id', { count: 'exact', head: false })
              .eq('trip_id', trip.id)
              .eq('check_in_status', true),
            // Fetch all bookings for revenue calculation (including cancelled with partial refunds)
            supabase
              .from('bookings')
              .select('id, total_fare, status')
              .eq('trip_id', trip.id),
          ]);

          if (allError) {
            console.error('Error fetching all passengers count:', allError);
            trip.booked_seats = 0;
          } else {
            trip.booked_seats = allPassengers?.length || 0;
          }

          if (checkedInError) {
            console.error('Error fetching checked-in count:', checkedInError);
            trip.checked_in_passengers = 0;
          } else {
            trip.checked_in_passengers = checkedInData?.length || 0;
          }

          // Calculate revenue from all bookings (including cancelled with partial refunds)
          if (bookingsError) {
            console.error(
              'Error fetching bookings for revenue:',
              bookingsError
            );
            trip.revenue = 0;
          } else {
            // Fetch cancellation details for all bookings
            const bookingIds = allBookings?.map(b => b.id) || [];
            const cancellationMap = await fetchCancellationDetails(bookingIds);

            // Calculate net revenue accounting for partial refunds
            const bookingsForRevenue: BookingForRevenue[] =
              allBookings?.map(booking => ({
                id: booking.id,
                status: booking.status,
                total_fare: booking.total_fare || 0,
              })) || [];

            trip.revenue = calculateTotalRevenue(
              bookingsForRevenue,
              cancellationMap
            );
          }

          // Recalculate occupancy rate with actual booked_seats
          trip.occupancy_rate = trip.capacity
            ? (trip.booked_seats / trip.capacity) * 100
            : 0;
        })
      );

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
        .in('booking_status', ['confirmed', 'checked_in', 'completed'])
        .order('seat_number');

      if (error) {
        console.error('Error fetching trip passengers:', error);
        throw error;
      }

      // Enrich with passenger_id_proof by querying passengers table
      const idProofMap: Record<string, string> = {};
      try {
        const passengerIds = (data || []).map((p: any) => p.id).filter(Boolean);
        if (passengerIds.length > 0) {
          const { data: idRows } = await supabase
            .from('passengers')
            .select('id, passenger_id_proof')
            .in('id', passengerIds);
          (idRows || []).forEach((row: any) => {
            if (row?.id) idProofMap[row.id] = row.passenger_id_proof || '';
          });
        }
      } catch (e) {
        console.warn('Unable to enrich passenger_id_proof:', e);
      }

      const passengers: CaptainPassenger[] = (data || []).map(
        (passenger: any) => ({
          id: passenger.id,
          booking_id: passenger.booking_id,
          booking_number: passenger.booking_number || '',
          passenger_name: passenger.passenger_name,
          passenger_contact_number: passenger.passenger_contact_number,
          passenger_id_proof: idProofMap[passenger.id] || '',
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

      // Get captain name from user profile or metadata
      let captainName = 'Unknown Captain';

      // First try to get from user metadata
      if (user.user_metadata?.full_name) {
        captainName = user.user_metadata.full_name;
      } else {
        // Try to get from user_profiles table
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (profileData?.full_name) {
            captainName = profileData.full_name;
          } else {
            // Fallback to email without domain
            captainName = user.email?.split('@')[0] || 'Unknown Captain';
          }
        } catch (profileError) {
          // Fallback to email without domain
          captainName = user.email?.split('@')[0] || 'Unknown Captain';
        }
      }

      const manifestData = {
        manifest_id: result.manifest_id,
        manifest_number: result.manifest_number,
        trip_id: data.trip_id,
        trip_date: currentTrip?.travel_date || '',
        route_name: currentTrip?.route_name || 'Unknown Route',
        vessel_name: currentTrip?.vessel_name || 'Unknown Vessel',
        departure_time: currentTrip?.departure_time || '',
        captain_name: captainName,
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

      // Enrich passengers with boarding/dropoff stops before sending
      manifestData.passengers = await enrichPassengerStops(
        manifestData.passengers
      );

      // Send email with passenger manifest
      try {
        const { emailService } = await import('@/utils/emailService');
        const emailResult = await emailService.sendPassengerManifest(
          result.manifest_id,
          manifestData,
          result.email_recipients || []
        );

        if (!emailResult.success) {
          // Don't fail the entire operation if email fails
        }
      } catch (emailError) {
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

  fetchTripById: async (tripId: string) => {
    try {
      set(state => ({
        ...state,
        loading: { ...state.loading, trips: true },
      }));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch the trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(
          `
          id,
          departure_time,
          arrival_time,
          travel_date,
          status,
          vessel_id,
          route_id,
          captain_id,
          available_seats,
          is_active,
          is_checkin_closed,
          current_stop_sequence,
          current_stop_id,
          trip_progress_status,
          vessels!inner(
            id,
            name,
            seating_capacity,
            vessel_type
          ),
          routes!inner(
            id,
            name,
            from_island_id,
            to_island_id,
            from_island:islands!routes_from_island_id_fkey(id, name),
            to_island:islands!routes_to_island_id_fkey(id, name)
          )
        `
        )
        .eq('id', tripId)
        .eq('captain_id', user.id)
        .single();

      if (tripError) throw tripError;
      if (!tripData) throw new Error('Trip not found');

      // Get total stops count
      const totalStops = await getTotalStopsForTrip(tripId);

      // Get passenger counts (use captain_passengers_view; special assistance lives on passengers)
      const { data: passengerRows, error: passengerError } = await supabase
        .from('captain_passengers_view')
        .select('id, check_in_status, special_assistance_request')
        .eq('trip_id', tripId);

      if (passengerError) {
        console.warn('Error fetching passengers:', passengerError);
      }

      const bookedSeats = passengerRows?.length || 0;
      const checkedInPassengers =
        passengerRows?.filter(p => p.check_in_status).length || 0;
      const specialAssistanceCount =
        passengerRows?.filter(
          p =>
            p.special_assistance_request &&
            p.special_assistance_request.trim() !== ''
        ).length || 0;

      // Map to CaptainTrip format
      const vessel = Array.isArray(tripData.vessels)
        ? tripData.vessels[0]
        : tripData.vessels;
      const route = Array.isArray(tripData.routes)
        ? tripData.routes[0]
        : tripData.routes;
      const fromIsland = route?.from_island?.[0] || route?.from_island;
      const toIsland = route?.to_island?.[0] || route?.to_island;

      const trip: CaptainTrip = {
        id: tripData.id,
        route_name: route?.name || 'Unknown Route',
        route_id: tripData.route_id,
        vessel_name: vessel?.name || 'Unknown Vessel',
        vessel_id: tripData.vessel_id,
        captain_id: tripData.captain_id,
        from_island_name: fromIsland?.name || 'Unknown',
        to_island_name: toIsland?.name || 'Unknown',
        departure_time: tripData.departure_time,
        arrival_time: tripData.arrival_time,
        travel_date: tripData.travel_date,
        status: tripData.status,
        capacity: vessel?.seating_capacity || 0,
        booked_seats: bookedSeats,
        checked_in_passengers: checkedInPassengers,
        available_seats: tripData.available_seats || 0,
        occupancy_rate: (bookedSeats / (vessel?.seating_capacity || 1)) * 100,
        revenue: 0,
        is_active: tripData.is_active ?? true,
        is_checkin_closed: tripData.is_checkin_closed || false,
        current_stop_id: tripData.current_stop_id,
        total_stops: totalStops,
        // If trip is completed, show the final stop in progress
        current_stop_sequence:
          tripData.status === 'completed' && totalStops
            ? totalStops
            : tripData.current_stop_sequence || 1,
        special_assistance_count: specialAssistanceCount,
      };

      // Update the trips array in store to include this trip
      set(state => {
        const existingIndex = state.trips.findIndex(t => t.id === tripId);
        const updatedTrips =
          existingIndex >= 0
            ? [
                ...state.trips.slice(0, existingIndex),
                trip,
                ...state.trips.slice(existingIndex + 1),
              ]
            : [...state.trips, trip];

        return {
          ...state,
          trips: updatedTrips,
          loading: { ...state.loading, trips: false },
          error: null,
        };
      });

      return trip;
    } catch (error: any) {
      console.error('Error fetching trip by ID:', error);
      set(state => ({
        ...state,
        loading: { ...state.loading, trips: false },
        error: error.message || 'Failed to load trip',
      }));
      return null;
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

      const today = getMaldivesTodayString();

      // Fetch today's active trips for the captain with vessel capacity
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('id, status, is_active, vessel:vessel_id(seating_capacity)')
        .eq('captain_id', user.id)
        .eq('travel_date', today)
        .eq('is_active', true);

      if (tripsError) throw tripsError;

      // Map trips with capacity
      const tripsWithCapacity = (tripsData || []).map(trip => {
        const vessel = Array.isArray(trip.vessel)
          ? trip.vessel[0]
          : trip.vessel;
        return {
          id: trip.id,
          status: trip.status,
          is_active: trip.is_active,
          capacity: vessel?.seating_capacity || 0,
        };
      });

      const tripIds = tripsWithCapacity.map(t => t.id);

      if (tripIds.length === 0) {
        // No trips today, return empty stats
        const stats: CaptainDashboardStats = {
          todayTrips: 0,
          totalPassengers: 0,
          checkedInPassengers: 0,
          completedTrips: 0,
          onTimePercentage: 100,
          totalRevenue: 0,
          averageOccupancy: 0,
        };
        set(state => ({
          ...state,
          dashboardStats: stats,
          loading: { ...state.loading, stats: false },
        }));
        return;
      }

      // Fetch ALL active passengers (confirmed, checked_in, completed only - view already filters)
      // This excludes cancelled and pending bookings
      const { data: allPassengers, error: allPassengersError } = await supabase
        .from('captain_passengers_view')
        .select('id, trip_id, booking_id, check_in_status')
        .in('trip_id', tripIds);

      if (allPassengersError) {
        console.error('Error fetching all passengers:', allPassengersError);
      }

      // Fetch checked-in passengers count
      const checkedInCount =
        allPassengers?.filter(p => p.check_in_status === true).length || 0;

      // Total passengers = all passengers in the view (already filtered to active bookings)
      const totalPassengers = allPassengers?.length || 0;

      // Fetch all bookings for revenue calculation (including cancelled with partial refunds)
      const { data: allBookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, total_fare, status')
        .in('trip_id', tripIds);

      if (bookingsError) {
        console.error('Error fetching bookings for revenue:', bookingsError);
      }

      // Calculate total revenue accounting for partial refunds from cancelled bookings
      let totalRevenue = 0;
      if (allBookingsData && allBookingsData.length > 0) {
        // Fetch cancellation details for all bookings
        const bookingIds = allBookingsData.map(b => b.id);
        const cancellationMap = await fetchCancellationDetails(bookingIds);

        // Calculate net revenue accounting for partial refunds
        const bookingsForRevenue: BookingForRevenue[] = allBookingsData.map(
          booking => ({
            id: booking.id,
            status: booking.status,
            total_fare: booking.total_fare || 0,
          })
        );

        totalRevenue = calculateTotalRevenue(
          bookingsForRevenue,
          cancellationMap
        );
      }

      // Calculate average occupancy by grouping passengers by trip
      const validTripsWithCapacity = tripsWithCapacity.filter(
        t => t.capacity && t.capacity > 0
      );
      let averageOccupancy = 0;

      if (
        validTripsWithCapacity.length > 0 &&
        allPassengers &&
        allPassengers.length > 0
      ) {
        // Group passengers by trip_id
        const passengersByTrip = new Map<string, number>();
        allPassengers.forEach(p => {
          const tripId = p.trip_id;
          const current = passengersByTrip.get(tripId) || 0;
          passengersByTrip.set(tripId, current + 1);
        });

        // Calculate occupancy for each trip and average them
        const occupancies: number[] = [];
        validTripsWithCapacity.forEach(trip => {
          const passengersOnTrip = passengersByTrip.get(trip.id) || 0;
          const capacity = trip.capacity || 1;
          const occupancy = (passengersOnTrip / capacity) * 100;
          occupancies.push(occupancy);
        });

        if (occupancies.length > 0) {
          averageOccupancy =
            occupancies.reduce((sum, occ) => sum + occ, 0) / occupancies.length;
        }
      } else if (validTripsWithCapacity.length > 0 && totalPassengers > 0) {
        // Fallback: calculate overall occupancy if grouping fails
        const totalCapacity = validTripsWithCapacity.reduce(
          (sum, trip) => sum + (trip.capacity || 0),
          0
        );

        if (totalCapacity > 0) {
          averageOccupancy = (totalPassengers / totalCapacity) * 100;
        }
      }

      // Count completed trips
      const completedTrips =
        tripsWithCapacity.filter(trip => trip.status === 'completed').length ||
        0;

      const stats: CaptainDashboardStats = {
        todayTrips: tripsWithCapacity.length || 0,
        totalPassengers,
        checkedInPassengers: checkedInCount,
        completedTrips,
        onTimePercentage: 100, // TODO: Calculate based on actual vs scheduled departure times
        totalRevenue,
        averageOccupancy,
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

  // Multi-stop trip management
  fetchTripStops: async (tripId: string): Promise<CaptainRouteStop[]> => {
    try {
      const stops = await getCaptainTripStops(tripId);
      return stops;
    } catch (error) {
      console.error('Error fetching trip stops:', error);
      set(state => ({
        ...state,
        error: 'Failed to fetch trip stops',
      }));
      return [];
    }
  },

  fetchPassengersForStop: async (
    tripId: string,
    stopId: string
  ): Promise<CaptainPassenger[]> => {
    try {
      const passengers = await getPassengersForStop(tripId, stopId);
      return passengers;
    } catch (error) {
      console.error('Error fetching passengers for stop:', error);
      set(state => ({
        ...state,
        error: 'Failed to fetch passengers for stop',
      }));
      return [];
    }
  },

  moveToNextStop: async (tripId: string): Promise<boolean> => {
    set(state => ({
      ...state,
      loading: { ...state.loading, trips: true },
      error: null,
    }));

    try {
      const success = await moveToNextStop(tripId);
      if (success) {
        // Refresh trips to get updated data
        await get().fetchTodayTrips();
      }
      return success;
    } catch (error) {
      console.error('Error moving to next stop:', error);
      set(state => ({
        ...state,
        error: 'Failed to move to next stop',
      }));
      return false;
    } finally {
      set(state => ({
        ...state,
        loading: { ...state.loading, trips: false },
      }));
    }
  },

  completeStopBoarding: async (
    stopId: string,
    captainId: string
  ): Promise<boolean> => {
    set(state => ({
      ...state,
      loading: { ...state.loading, passengers: true },
      error: null,
    }));

    try {
      const success = await completeStopBoarding(stopId, captainId);
      return success;
    } catch (error) {
      console.error('Error completing stop boarding:', error);
      set(state => ({
        ...state,
        error: 'Failed to complete stop boarding',
      }));
      return false;
    } finally {
      set(state => ({
        ...state,
        loading: { ...state.loading, passengers: false },
      }));
    }
  },

  processMultiStopCheckIn: async (
    bookingId: string,
    stopId: string,
    action: 'boarding' | 'dropoff',
    captainId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await processMultiStopCheckIn(
        bookingId,
        stopId,
        action,
        captainId
      );
      if (!result.success) {
        set(state => ({
          ...state,
          error: result.message,
        }));
      }
      return result;
    } catch (error) {
      console.error('Error processing multi-stop check-in:', error);
      const message = 'Failed to process check-in';
      set(state => ({
        ...state,
        error: message,
      }));
      return { success: false, message };
    }
  },

  // Enhanced multi-stop actions
  getTripWithStops: async (tripId: string) => {
    try {
      const { data: trip, error: tripError } = await supabase
        .from('captain_trip_progress_view')
        .select('*')
        .eq('trip_id', tripId)
        .single();

      if (tripError) throw tripError;

      // Get all route stops with progress
      const { data: routeStops, error: stopsError } = await supabase
        .from('stop_progress_details_view')
        .select('*')
        .eq('trip_id', tripId)
        .order('stop_sequence');

      if (stopsError) throw stopsError;

      return {
        ...trip,
        route_stops: routeStops || [],
      };
    } catch (error) {
      console.error('Error getting trip with stops:', error);
      return null;
    }
  },

  getCurrentStopPassengers: async (
    tripId: string,
    stopId: string,
    stopType: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('get_stop_passengers', {
        p_trip_id: tripId,
        p_stop_id: stopId,
        p_stop_type: stopType,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting current stop passengers:', error);
      return [];
    }
  },

  updateStopStatus: async (tripId: string, stopId: string, status: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('update_stop_status', {
        p_trip_id: tripId,
        p_stop_id: stopId,
        p_status: status,
        p_captain_id: user.id,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating stop status:', error);
      return false;
    }
  },

  moveToNextStopEnhanced: async (tripId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('move_to_next_stop', {
        p_trip_id: tripId,
        p_captain_id: user.id,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error moving to next stop:', error);
      return { success: false, message: 'Failed to move to next stop' };
    }
  },

  initializeTripProgress: async (tripId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('initialize_trip_stop_progress', {
        p_trip_id: tripId,
        p_captain_id: user.id,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error initializing trip progress:', error);
      return false;
    }
  },

  fetchSpecialAssistanceNotifications: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First, let's test with a simpler query to see if we get any data

      // Get future trips (next 7 days from TODAY) with special assistance
      const currentDateTime = new Date();
      const today = currentDateTime.toISOString().split('T')[0];
      const currentTime = currentDateTime.toTimeString().split(' ')[0]; // HH:MM:SS format

      // Always show next 7 days from today
      const endDateObj = new Date(today);
      endDateObj.setDate(endDateObj.getDate() + 7);
      const endDate = endDateObj.toISOString().split('T')[0];

      const query = supabase
        .from('captain_passengers_view')
        .select(
          `
          id,
          booking_id,
          trip_id,
          passenger_name,
          passenger_contact_number,
          seat_number,
          seat_id,
          special_assistance_request,
          booking_number,
          user_id,
          trips!inner(
            id,
            departure_time,
            travel_date,
            captain_id,
            status,
            route:route_id(
              name
            )
          )
        `
        )
        .eq('trips.captain_id', user.id)
        .not('special_assistance_request', 'is', null)
        .neq('special_assistance_request', '')
        .gte('trips.travel_date', today)
        .lte('trips.travel_date', endDate);

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);

        // Try a simpler fallback query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('captain_passengers_view')
          .select(
            'id, trip_id, passenger_name, seat_number, booking_number, special_assistance_request'
          )
          .not('special_assistance_request', 'is', null)
          .neq('special_assistance_request', '')
          .limit(10);

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw error; // Throw original error
        }

        return []; // Return empty array for now
      }

      // Filter out past trips: only filter by time if trip is TODAY
      const filteredData = (data || []).filter((row: any) => {
        const rowDate = row.trips?.travel_date;
        const departureTime = row.trips?.departure_time || '00:00:00';

        if (!rowDate) return false;

        // If trip is today, only show future times
        if (rowDate === today) {
          return departureTime >= currentTime;
        }

        // For future dates, show all trips regardless of time
        return true;
      });

      // Get contact numbers from user profiles for passengers without contact numbers
      const userIds = [
        ...new Set(
          (data || []).map((booking: any) => booking.user_id).filter(Boolean)
        ),
      ];
      let userProfiles: any = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, contact_number')
          .in('id', userIds);

        if (!profileError && profiles) {
          userProfiles = profiles.reduce((acc: any, profile: any) => {
            acc[profile.id] = profile.contact_number;
            return acc;
          }, {});
        }
      }

      // Group by trip
      const grouped = (filteredData || []).reduce((acc: any, booking: any) => {
        const tripId = booking.trip_id;
        if (!acc[tripId]) {
          acc[tripId] = {
            tripId,
            tripName: booking.trips?.route?.name || 'Unknown Trip',
            departureTime: booking.trips?.departure_time || 'Unknown Time',
            travelDate: booking.trips?.travel_date || 'Unknown Date',
            tripStatus: booking.trips?.status || 'unknown',
            assistanceType: 'Special Assistance Required',
            passengers: [],
          };
        }

        // Get contact number from passenger_contact_number or user profile
        let contactNumber = booking.passenger_contact_number;
        if (
          !contactNumber &&
          booking.user_id &&
          userProfiles[booking.user_id]
        ) {
          contactNumber = userProfiles[booking.user_id];
        }
        acc[tripId].passengers.push({
          name: booking.passenger_name,
          assistance: booking.special_assistance_request,
          seatNumber: booking.seat_number || 'Not assigned',
          bookingNumber: booking.booking_number || 'N/A',
          contactNumber: contactNumber || 'N/A',
        });
        return acc;
      }, {});

      // Sort by date first, then by status priority, then by time
      const sortedNotifications = Object.values(grouped).sort(
        (a: any, b: any) => {
          // First sort by date
          const dateA = new Date(a.travelDate).getTime();
          const dateB = new Date(b.travelDate).getTime();
          if (dateA !== dateB) {
            return dateB - dateA; // Most recent first
          }

          // Then by status priority (boarding > scheduled > departed > completed)
          const statusPriority: { [key: string]: number } = {
            boarding: 1,
            scheduled: 2,
            departed: 3,
            arrived: 4,
            completed: 5,
            cancelled: 6,
            delayed: 7,
          };
          const priorityA = statusPriority[a.tripStatus] || 8;
          const priorityB = statusPriority[b.tripStatus] || 8;
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // Finally by departure time
          const timeA = new Date(a.departureTime).getTime();
          const timeB = new Date(b.departureTime).getTime();
          return timeA - timeB;
        }
      );

      return sortedNotifications;
    } catch (error) {
      console.error('Error fetching special assistance notifications:', error);
      return [];
    }
  },

  sendManifest: async (tripId: string, stopId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate/close manifest on depart and get recipients + payload
      const { data: closeResult, error: closeError } = await supabase.rpc(
        'close_trip_checkin',
        {
          p_trip_id: tripId,
          p_captain_notes: null,
          p_weather_conditions: null,
          p_delay_reason: null,
          p_actual_departure_time: new Date().toISOString(),
        }
      );

      if (closeError) throw closeError;
      if (!closeResult?.success) {
        throw new Error(closeResult?.error || 'Failed to generate manifest');
      }

      // Build manifest data for email
      // Fetch current trip info for names
      const { data: tripInfo } = await supabase
        .from('captain_trip_progress_view')
        .select('route_name, vessel_name')
        .eq('trip_id', tripId)
        .single();

      // Determine captain name
      let captainName = 'Unknown Captain';
      if (user.user_metadata?.full_name) {
        captainName = user.user_metadata.full_name;
      } else {
        try {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          captainName =
            profileData?.full_name ||
            user.email?.split('@')[0] ||
            'Unknown Captain';
        } catch {
          captainName = user.email?.split('@')[0] || 'Unknown Captain';
        }
      }

      const routeName =
        tripInfo?.route_name || closeResult.route_name || 'Unknown Route';
      const vesselName =
        tripInfo?.vessel_name || closeResult.vessel_name || 'Unknown Vessel';

      const manifestData = {
        manifest_id: closeResult.manifest_id,
        manifest_number: closeResult.manifest_number,
        trip_id: tripId,
        trip_date: closeResult.trip_date || '',
        route_name: routeName,
        vessel_name: vesselName,
        departure_time: closeResult.departure_time || '',
        captain_name: captainName,
        total_passengers: closeResult.total_passengers,
        checked_in_passengers: closeResult.checked_in_passengers,
        no_show_passengers: closeResult.no_show_passengers,
        passengers: closeResult.manifest_data || [],
        captain_notes: null,
        weather_conditions: null,
        delay_reason: null,
        actual_departure_time: new Date().toISOString(),
      } as any;

      // Enrich passengers with boarding/dropoff stops before sending
      manifestData.passengers = await enrichPassengerStops(
        manifestData.passengers
      );

      // Send via Edge Function using configured recipients
      const recipients: string[] = closeResult.email_recipients || [];
      try {
        const { emailService } = await import('@/utils/emailService');
        const emailResult = await emailService.sendPassengerManifest(
          closeResult.manifest_id,
          manifestData,
          recipients
        );

        // Log activity regardless of success
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'send_manifest',
          entity_type: 'trip',
          entity_id: tripId,
          details: {
            trip_id: tripId,
            stop_id: stopId,
            sent_at: new Date().toISOString(),
            success: emailResult.success,
            recipients,
          },
        });
      } catch (emailError) {
        console.error('Error sending manifest email:', emailError);
      }

      // Mark manifest as sent for this stop
      await supabase
        .from('trip_stop_progress')
        .update({ manifest_sent_at: new Date().toISOString() })
        .eq('trip_id', tripId)
        .eq('stop_id', stopId);

      // Update local trip state with manifest_sent_at
      set(state => ({
        ...state,
        trips: state.trips.map(t =>
          t.id === tripId
            ? {
                ...t,
                manifest_sent_at: new Date().toISOString(),
                is_checkin_closed: true,
              }
            : t
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error sending manifest:', error);
      return false;
    }
  },

  processStopCheckIn: async (
    passengerId: string,
    action: 'boarding' | 'dropoff'
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the booking_id from the passenger
      const { data: passenger, error: passengerError } = await supabase
        .from('passengers')
        .select('booking_id')
        .eq('id', passengerId)
        .single();

      if (passengerError || !passenger) throw new Error('Passenger not found');

      // Update the booking check_in_status
      const { error } = await supabase
        .from('bookings')
        .update({
          check_in_status: true,
          checked_in_at: new Date().toISOString(),
          status: 'checked_in',
          updated_at: new Date().toISOString(),
        })
        .eq('id', passenger.booking_id);

      if (error) throw error;

      // Log the check-in
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: `passenger_${action}`,
        entity_type: 'passenger',
        entity_id: passengerId,
        details: { action, checked_in_at: new Date().toISOString() },
      });

      return true;
    } catch (error) {
      console.error('Error processing check-in:', error);
      return false;
    }
  },

  // Activate trip function
  activateTrip: async (tripId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          message: 'Not authenticated',
        };
      }

      const { data, error } = await supabase.rpc('activate_trip_by_captain', {
        p_trip_id: tripId,
        p_captain_id: user.id,
      });

      if (error) {
        console.error('Error activating trip:', error);
        return {
          success: false,
          message: error.message || 'Failed to activate trip',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          message: data?.message || 'Failed to activate trip',
        };
      }

      // Refresh trips after activation
      await get().fetchTodayTrips();

      return {
        success: true,
        message: data.message || 'Trip activated successfully',
      };
    } catch (error) {
      console.error('Error activating trip:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to activate trip',
      };
    }
  },
}));
