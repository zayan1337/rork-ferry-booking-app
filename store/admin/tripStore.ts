import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';
import {
  validateTripForm,
  searchTrips,
  filterTrips,
  sortTrips,
  calculateTripStats,
  generateTripsForSchedule,
  detectTripConflicts,
  validateTripGenerationRequest,
  type TripGenerationRequest,
} from '@/utils/admin/tripUtils';

type Trip = AdminManagement.Trip;
type TripFormData = AdminManagement.TripFormData;
type TripStats = AdminManagement.TripStats;
type TripFilters = AdminManagement.TripFilters;
type TripWithDetails = AdminManagement.TripWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type TripStoreState = AdminManagement.TripStoreState;
type TripStoreActions = AdminManagement.TripStoreActions;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const processTripData = (trip: any): Trip => ({
  id: trip.id,
  route_id: trip.route_id,
  vessel_id: trip.vessel_id,
  travel_date: trip.travel_date,
  departure_time: trip.departure_time,
  arrival_time: trip.arrival_time || undefined,
  estimated_duration: trip.duration || '60 minutes',
  status: trip.status || trip.computed_status || 'scheduled',
  delay_reason: trip.delay_reason || undefined,
  available_seats: trip.available_seats || 0,
  booked_seats: trip.booked_seats || 0,
  fare_multiplier: trip.fare_multiplier || 1.0,
  weather_conditions: trip.weather_conditions || undefined,
  captain_id: trip.captain_id || undefined,
  crew_ids: trip.crew_ids || undefined,
  notes: trip.notes || undefined,
  is_active: trip.is_active ?? true,
  created_at: trip.created_at,
  updated_at: trip.updated_at || trip.created_at,

  // Related data from the operations_trips_view
  route_name: trip.route_name,
  vessel_name: trip.vessel_name,
  from_island_name: trip.from_island_name,
  to_island_name: trip.to_island_name,
  capacity: trip.capacity || trip.seating_capacity,
  bookings: trip.bookings || trip.confirmed_bookings || 0,
  occupancy_rate: trip.occupancy_rate || 0,
  computed_status: trip.computed_status || trip.status || 'scheduled',
  base_fare: trip.base_fare || 0,
  confirmed_bookings: trip.confirmed_bookings || trip.bookings || 0,
  total_revenue: trip.trip_revenue || trip.total_revenue || 0,
});

const validateTripFormData = (
  data: Partial<TripFormData>
): ValidationResult => {
  return validateTripForm(data);
};

// ============================================================================
// TRIP STORE IMPLEMENTATION
// ============================================================================

interface TripStore extends TripStoreState, TripStoreActions {}

export const useTripStore = create<TripStore>((set, get) => ({
  // ========================================================================
  // STATE
  // ========================================================================

  // Base state
  data: [],
  currentItem: null,
  loading: {},
  error: null,
  searchQuery: '',

  // Filters and stats
  filters: {},
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    delayed: 0,
    averageOccupancy: 0,
    totalRevenue: 0,
    todayTrips: 0,
    onTimePerformance: 0,
    avgFare: 0,
    totalBookings: 0,
    totalPassengers: 0,
  },

  // Related data
  routes: [],
  vessels: [],

  // Computed data
  filteredTrips: [],
  sortedTrips: [],
  tripsByStatus: {},
  tripsByRoute: {},
  tripsByVessel: {},

  // Sort configuration
  sortBy: 'travel_date',
  sortOrder: 'desc',

  // ========================================================================
  // ACTIONS
  // ========================================================================

  // Data fetching
  fetchAll: async () => {
    set({ loading: { ...get().loading, data: true }, error: null });

    try {
      // Fetch from operations_trips_view which has all the necessary data pre-calculated
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .order('departure_time', { ascending: false });

      if (error) throw error;

      // Process the data from the view
      const trips = (data || []).map(item => {
        return processTripData({
          ...item,
          // Map view fields to expected trip fields
          confirmed_bookings: item.confirmed_bookings || item.bookings,
          seating_capacity: item.capacity,
          // Keep computed values from the view
          computed_status: item.computed_status,
          occupancy_rate: item.occupancy_rate,
        });
      });

      set({ data: trips });
      get().calculateComputedData();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch trips',
      });
    } finally {
      set({ loading: { ...get().loading, data: false } });
    }
  },

  fetchById: async (id: string) => {
    set({ loading: { ...get().loading, current: true }, error: null });

    try {
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const processedTrip = processTripData({
        ...data,
        confirmed_bookings: data.confirmed_bookings || data.bookings,
        seating_capacity: data.capacity,
        computed_status: data.computed_status,
        occupancy_rate: data.occupancy_rate,
      });

      set({ currentItem: processedTrip });
      return processedTrip;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch trip',
      });
      return null;
    } finally {
      set({ loading: { ...get().loading, current: false } });
    }
  },

  // CRUD operations
  create: async (tripData: TripFormData) => {
    set({ loading: { ...get().loading, create: true }, error: null });

    try {
      // Get vessel capacity if not provided
      let availableSeats = tripData.available_seats;
      if (!availableSeats) {
        let vessels = get().vessels || [];
        if (vessels.length === 0) {
          const { data: vesselData } = await supabase
            .from('operations_vessels_view')
            .select('*')
            .eq('is_active', true);

          if (vesselData) {
            const processedVessels = vesselData.map((vessel: any) => ({
              ...vessel,
              created_at: vessel.created_at || new Date().toISOString(),
              updated_at: vessel.updated_at || new Date().toISOString(),
            }));
            vessels = processedVessels;
            set({ vessels });
          }
        }

        const selectedVessel = vessels.find(v => v.id === tripData.vessel_id);
        availableSeats = selectedVessel?.seating_capacity || 50;
      }

      // Only include fields that exist in the database
      const dbTripData = {
        route_id: tripData.route_id,
        vessel_id: tripData.vessel_id,
        travel_date: tripData.travel_date,
        departure_time: tripData.departure_time,
        available_seats: availableSeats,
        fare_multiplier: tripData.fare_multiplier,
        status: tripData.status || 'scheduled',
        is_active: tripData.is_active,
        booked_seats: 0, // Default for new trips
      };

      const { data, error } = await supabase
        .from('trips')
        .insert([dbTripData])
        .select()
        .single();

      if (error) throw error;

      // Refresh the data
      await get().fetchAll();
      return data;
    } catch (error) {
      console.error('Error creating trip:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create trip',
      });
      throw error;
    } finally {
      set({ loading: { ...get().loading, create: false } });
    }
  },

  update: async (id: string, updates: Partial<TripFormData>) => {
    set({ loading: { ...get().loading, update: true }, error: null });

    try {
      // Only include fields that exist in the database
      const dbUpdates: any = {};

      if (updates.route_id !== undefined) dbUpdates.route_id = updates.route_id;
      if (updates.vessel_id !== undefined)
        dbUpdates.vessel_id = updates.vessel_id;
      if (updates.travel_date !== undefined)
        dbUpdates.travel_date = updates.travel_date;
      if (updates.departure_time !== undefined)
        dbUpdates.departure_time = updates.departure_time;
      if (updates.available_seats !== undefined)
        dbUpdates.available_seats = updates.available_seats;
      if (updates.fare_multiplier !== undefined)
        dbUpdates.fare_multiplier = updates.fare_multiplier;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.is_active !== undefined)
        dbUpdates.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const updatedData = get().data.map(trip =>
        trip.id === id ? { ...trip, ...data } : trip
      );
      set({ data: updatedData });

      // Update current item if it's the one being updated
      if (get().currentItem?.id === id) {
        set({ currentItem: { ...get().currentItem, ...data } });
      }

      get().calculateComputedData();
      return data;
    } catch (error) {
      console.error('Error updating trip:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update trip',
      });
      throw error;
    } finally {
      set({ loading: { ...get().loading, update: false } });
    }
  },

  delete: async (id: string) => {
    set({ loading: { ...get().loading, delete: true }, error: null });

    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);

      if (error) throw error;

      // Update local state
      const updatedData = get().data.filter(trip => trip.id !== id);
      set({ data: updatedData });

      // Clear current item if it's the one being deleted
      if (get().currentItem?.id === id) {
        set({ currentItem: null });
      }

      get().calculateComputedData();
    } catch (error) {
      console.error('Error deleting trip:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete trip',
      });
      throw error;
    } finally {
      set({ loading: { ...get().loading, delete: false } });
    }
  },

  // Trip-specific actions
  fetchTripDetails: async (id: string) => {
    try {
      const trip = await get().fetchById(id);
      if (!trip) return null;

      // Fetch related data
      const [routeData, vesselData] = await Promise.all([
        supabase.from('routes').select('*').eq('id', trip.route_id).single(),
        supabase.from('vessels').select('*').eq('id', trip.vessel_id).single(),
      ]);

      const tripWithDetails: TripWithDetails = {
        ...trip,
        route_details: routeData.data
          ? {
              route_name: routeData.data.name,
              from_island_name: routeData.data.from_island_name || '',
              to_island_name: routeData.data.to_island_name || '',
              base_fare: routeData.data.base_fare,
              distance: routeData.data.distance || '',
              duration: routeData.data.duration || '',
            }
          : undefined,
        vessel_details: vesselData.data
          ? {
              vessel_name: vesselData.data.name,
              seating_capacity: vesselData.data.seating_capacity,
              vessel_type: vesselData.data.vessel_type || 'passenger',
              status: vesselData.data.status,
            }
          : undefined,
      };

      return tripWithDetails;
    } catch (error) {
      console.error('Error fetching trip details:', error);
      return null;
    }
  },

  fetchTripsByStatus: async (status: string) => {
    try {
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq('computed_status', status)
        .order('travel_date', { ascending: false })
        .limit(10000); // Ensure all trips of this status are fetched

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trips by status:', error);
      return [];
    }
  },

  fetchTripsByRoute: async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq('route_id', routeId)
        .order('travel_date', { ascending: false })
        .limit(10000); // Ensure all trips for this route are fetched

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trips by route:', error);
      return [];
    }
  },

  fetchTripsByVessel: async (vesselId: string) => {
    try {
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq('vessel_id', vesselId)
        .order('travel_date', { ascending: false })
        .limit(10000); // Ensure all trips for this vessel are fetched

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trips by vessel:', error);
      return [];
    }
  },

  fetchTripsByDate: async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq('travel_date', date)
        .order('departure_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trips by date:', error);
      return [];
    }
  },

  // Trip management
  updateTripStatus: async (
    tripId: string,
    status: Trip['status'],
    reason?: string
  ) => {
    const updates: any = { status };
    if (reason) updates.delay_reason = reason;

    await get().update(tripId, updates);
  },

  cancelTrip: async (tripId: string, reason: string) => {
    await get().update(tripId, {
      status: 'cancelled',
      delay_reason: reason,
    });
  },

  delayTrip: async (tripId: string, delayMinutes: number, reason: string) => {
    const trip = get().data.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found');

    // Calculate new departure time
    const departureTime = new Date(`2000-01-01T${trip.departure_time}`);
    departureTime.setMinutes(departureTime.getMinutes() + delayMinutes);
    const newDepartureTime = departureTime.toTimeString().slice(0, 5);

    await get().update(tripId, {
      departure_time: newDepartureTime,
      status: 'delayed',
      delay_reason: reason,
    });
  },

  rescheduleTrip: async (tripId: string, newDate: string, newTime: string) => {
    await get().update(tripId, {
      travel_date: newDate,
      departure_time: newTime,
      status: 'scheduled',
    });
  },

  // Bulk operations
  bulkUpdateStatus: async (tripIds: string[], status: Trip['status']) => {
    set({ loading: { ...get().loading, bulk: true } });

    try {
      const { error } = await supabase
        .from('trips')
        .update({ status })
        .in('id', tripIds);

      if (error) throw error;

      // Refresh data
      await get().fetchAll();
    } catch (error) {
      console.error('Error bulk updating trips:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to bulk update trips',
      });
    } finally {
      set({ loading: { ...get().loading, bulk: false } });
    }
  },

  bulkCancel: async (tripIds: string[], reason: string) => {
    set({ loading: { ...get().loading, bulk: true } });

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'cancelled',
          delay_reason: reason,
        })
        .in('id', tripIds);

      if (error) throw error;

      // Refresh data
      await get().fetchAll();
    } catch (error) {
      console.error('Error bulk cancelling trips:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to bulk cancel trips',
      });
    } finally {
      set({ loading: { ...get().loading, bulk: false } });
    }
  },

  bulkReschedule: async (
    tripIds: string[],
    newDate: string,
    newTime: string
  ) => {
    set({ loading: { ...get().loading, bulk: true } });

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          travel_date: newDate,
          departure_time: newTime,
          status: 'scheduled',
        })
        .in('id', tripIds);

      if (error) throw error;

      // Refresh data
      await get().fetchAll();
    } catch (error) {
      console.error('Error bulk rescheduling trips:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to bulk reschedule trips',
      });
    } finally {
      set({ loading: { ...get().loading, bulk: false } });
    }
  },

  // Trip generation
  generateTripsForRoute: async (
    routeId: string,
    startDate: string,
    endDate: string,
    schedule: any
  ) => {
    // This would implement trip generation logic based on schedule
    // For now, return empty array
    return [];
  },

  generateTripsForDate: async (date: string, routes?: string[]) => {
    // This would implement trip generation logic for a specific date
    // For now, return empty array
    return [];
  },

  // Bulk trip generation
  generateTripsFromSchedule: async (request: TripGenerationRequest) => {
    set({ loading: { ...get().loading, create: true }, error: null });

    try {
      // Validate the request
      const validation = validateTripGenerationRequest(request);
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Get vessel capacity from vessels data
      let vessels = get().vessels || [];

      // If vessels not loaded, fetch them
      if (vessels.length === 0) {
        const { data: vesselData } = await supabase
          .from('operations_vessels_view')
          .select('*')
          .eq('is_active', true);

        if (vesselData) {
          const processedVessels = vesselData.map((vessel: any) => ({
            ...vessel,
            created_at: vessel.created_at || new Date().toISOString(),
            updated_at: vessel.updated_at || new Date().toISOString(),
          }));
          vessels = processedVessels;
          set({ vessels });
        }
      }

      const selectedVessel = vessels.find(v => v.id === request.vessel_id);
      if (!selectedVessel) {
        throw new Error('Selected vessel not found or is inactive');
      }

      // Create enhanced request with actual vessel capacity
      const enhancedRequest = {
        ...request,
        vessel_capacity: selectedVessel.seating_capacity,
      };

      // Generate trips
      const generatedTrips = generateTripsForSchedule(enhancedRequest);

      if (generatedTrips.length === 0) {
        throw new Error(
          'No trips were generated. Please check your date range and selected days.'
        );
      }

      // Check for conflicts with existing trips
      const existingTrips = get().data;
      const { conflicts, safeTrips } = detectTripConflicts(
        generatedTrips,
        existingTrips
      );

      if (conflicts.length > 0) {
        console.warn(`Found ${conflicts.length} conflicting trips`);
        const conflictDetails = conflicts
          .map(c => `${c.trip.travel_date} at ${c.trip.departure_time}`)
          .join(', ');

        if (safeTrips.length === 0) {
          throw new Error(
            `All ${conflicts.length} generated trips conflict with existing trips on: ${conflictDetails}`
          );
        }
      }

      // Insert safe trips into database
      if (safeTrips.length > 0) {
        // Validate each trip before insertion - only include fields that exist in database
        const validatedTrips = safeTrips.map(trip => ({
          route_id: trip.route_id,
          vessel_id: trip.vessel_id,
          travel_date: trip.travel_date,
          departure_time: trip.departure_time,
          available_seats: trip.available_seats,
          fare_multiplier: trip.fare_multiplier,
          status: trip.status,
          is_active: trip.is_active,
          booked_seats: 0, // Default to 0 for new trips
        }));

        const { data, error } = await supabase
          .from('trips')
          .insert(validatedTrips)
          .select();

        if (error) {
          console.error('Database insertion error:', error);
          throw new Error(`Failed to create trips: ${error.message}`);
        }

        // Process and add to store
        const processedTrips = (data || []).map(processTripData);
        const currentData = get().data;
        set({ data: [...currentData, ...processedTrips] });

        // Recalculate computed data
        get().calculateComputedData();

        return {
          success: true,
          generated: safeTrips.length,
          conflicts: conflicts.length,
          trips: processedTrips,
          message:
            conflicts.length > 0
              ? `Successfully created ${safeTrips.length} trips. ${conflicts.length} trips were skipped due to conflicts.`
              : `Successfully created ${safeTrips.length} trips.`,
        };
      }

      return {
        success: true,
        generated: 0,
        conflicts: conflicts.length,
        trips: [],
        message: 'No trips were created due to conflicts with existing trips.',
      };
    } catch (error) {
      console.error('Error generating trips:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate trips';
      set({ error: errorMessage });
      return {
        success: false,
        generated: 0,
        conflicts: 0,
        trips: [],
        error: errorMessage,
      };
    } finally {
      set({ loading: { ...get().loading, create: false } });
    }
  },

  // Preview trip generation without saving
  previewTripGeneration: (request: TripGenerationRequest) => {
    const validation = validateTripGenerationRequest(request);
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors,
        generatedTrips: [],
        conflicts: [],
        safeTrips: [],
      };
    }

    // Get vessel capacity from vessels data
    const vessels = get().vessels || [];

    // If vessels not loaded, we'll use a default capacity for preview
    // (in a real implementation, you might want to fetch vessels here too)
    const selectedVessel = vessels.find(v => v.id === request.vessel_id);

    // Create enhanced request with actual vessel capacity
    const enhancedRequest = {
      ...request,
      vessel_capacity: selectedVessel?.seating_capacity || 50,
    };

    const generatedTrips = generateTripsForSchedule(enhancedRequest);
    const existingTrips = get().data;
    const { conflicts, safeTrips } = detectTripConflicts(
      generatedTrips,
      existingTrips
    );

    return {
      isValid: true,
      errors: {},
      generatedTrips,
      conflicts,
      safeTrips,
      summary: {
        totalGenerated: generatedTrips.length,
        conflicting: conflicts.length,
        canCreate: safeTrips.length,
      },
    };
  },

  // Utility functions
  getTripById: (id: string) => {
    return get().data.find(trip => trip.id === id);
  },

  getTripsByStatus: (status: string) => {
    return get().data.filter(trip => trip.status === status);
  },

  getTripsByRoute: (routeId: string) => {
    return get().data.filter(trip => trip.route_id === routeId);
  },

  getTripsByVessel: (vesselId: string) => {
    return get().data.filter(trip => trip.vessel_id === vesselId);
  },

  validateTripData: (data: Partial<TripFormData>): ValidationResult => {
    const errors: Record<string, string> = {};

    if (!data.route_id) errors.route_id = 'Route is required';
    if (!data.vessel_id) errors.vessel_id = 'Vessel is required';
    if (!data.travel_date) errors.travel_date = 'Travel date is required';
    if (!data.departure_time)
      errors.departure_time = 'Departure time is required';
    if (data.fare_multiplier && data.fare_multiplier <= 0) {
      errors.fare_multiplier = 'Fare multiplier must be greater than 0';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  checkTripConflicts: (tripData: TripFormData, excludeId?: string) => {
    const existingTrips = get().data.filter(
      trip =>
        trip.id !== excludeId &&
        trip.vessel_id === tripData.vessel_id &&
        trip.travel_date === tripData.travel_date &&
        trip.departure_time === tripData.departure_time &&
        trip.status !== 'cancelled'
    );

    return {
      hasConflict: existingTrips.length > 0,
      conflictingTrip: existingTrips[0],
    };
  },

  // State management
  setCurrentItem: item => set({ currentItem: item }),
  clearError: () => set({ error: null }),
  setError: error => set({ error }),

  // Search and filter
  setSearchQuery: query => set({ searchQuery: query }),
  clearFilters: () => set({ filters: {} }),

  // Sort actions
  setSortBy: sortBy => set({ sortBy }),
  setSortOrder: order => set({ sortOrder: order }),

  // Filter actions
  setFilters: filters => set({ filters: { ...get().filters, ...filters } }),

  // Search and filter utilities
  searchItems: (items, query) => {
    return searchTrips(items, query);
  },

  filterItems: (items, filters) => {
    return filterTrips(items, filters);
  },

  sortItems: (items: Trip[], sortBy: any, order: 'asc' | 'desc') => {
    return sortTrips(items, sortBy as any, order);
  },

  // Statistics calculation
  calculateStats: () => {
    const trips = get().data;
    const stats = calculateTripStats(trips);
    set({ stats });
  },

  // Computed data calculation
  calculateComputedData: () => {
    const { data, searchQuery, filters, sortBy, sortOrder } = get();

    // Apply search
    let filtered = get().searchItems(data, searchQuery);

    // Apply filters
    filtered = get().filterItems(filtered, filters);

    // Apply sorting
    const sorted = get().sortItems(filtered, sortBy, sortOrder);

    // Group by status
    const tripsByStatus: Record<string, Trip[]> = {};
    data.forEach(trip => {
      const status = trip.status;
      if (!tripsByStatus[status]) tripsByStatus[status] = [];
      tripsByStatus[status].push(trip);
    });

    // Group by route
    const tripsByRoute: Record<string, Trip[]> = {};
    data.forEach(trip => {
      const routeId = trip.route_id;
      if (!tripsByRoute[routeId]) tripsByRoute[routeId] = [];
      tripsByRoute[routeId].push(trip);
    });

    // Group by vessel
    const tripsByVessel: Record<string, Trip[]> = {};
    data.forEach(trip => {
      const vesselId = trip.vessel_id;
      if (!tripsByVessel[vesselId]) tripsByVessel[vesselId] = [];
      tripsByVessel[vesselId].push(trip);
    });

    set({
      filteredTrips: filtered,
      sortedTrips: sorted,
      tripsByStatus,
      tripsByRoute,
      tripsByVessel,
    });

    // Calculate stats
    get().calculateStats();
  },

  // Trip-specific data fetching
  fetchTripPassengers: async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('passengers')
        .select(
          `
                    id,
                    passenger_name,
                    passenger_contact_number,
                    special_assistance_request,
                    booking_id,
                    seat_id,
                    bookings!inner (
                        id,
                        booking_number,
                        status,
                        trip_id,
                        user_profiles (
                            email,
                            mobile_number
                        )
                    ),
                    seats (
                        seat_number
                    )
                `
        )
        .eq('bookings.trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trip passengers:', error);
      return [];
    }
  },

  fetchTripBookings: async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
                    id,
                    booking_number,
                    status,
                    total_fare,
                    payment_method_type,
                    created_at,
                    user_profiles (
                        full_name,
                        email,
                        mobile_number,
                        role
                    ),
                    passengers (
                        id,
                        passenger_name
                    )
                `
        )
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trip bookings:', error);
      return [];
    }
  },

  // Utility
  refreshAll: async () => {
    await get().fetchAll();
  },

  resetStore: () => {
    set({
      data: [],
      currentItem: null,
      loading: {},
      error: null,
      searchQuery: '',
      filters: {},
      stats: {
        total: 0,
        active: 0,
        inactive: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        delayed: 0,
        averageOccupancy: 0,
        totalRevenue: 0,
        todayTrips: 0,
        onTimePerformance: 0,
        avgFare: 0,
        totalBookings: 0,
        totalPassengers: 0,
      },
      filteredTrips: [],
      sortedTrips: [],
      tripsByStatus: {},
      tripsByRoute: {},
      tripsByVessel: {},
      routes: [],
      vessels: [],
    });
  },
}));
