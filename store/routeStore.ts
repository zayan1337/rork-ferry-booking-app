import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { RouteStoreState, TripStoreState, Trip } from '@/types/booking';
import type { Route } from '@/types';

interface RouteStoreActions {
  fetchRoutes: () => Promise<void>;
  fetchAvailableIslands: () => Promise<void>;
  fetchAvailableRoutes: () => Promise<void>;
  fetchRoutesWithTripsOnDate: (date: string) => Promise<Route[]>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

interface TripStoreActions {
  fetchTrips: (
    routeId: string,
    date: string,
    isReturn?: boolean
  ) => Promise<void>;
  getAvailableDatesForRoute: (routeId: string, daysAhead?: number) => Promise<string[]>;
  setTrip: (trip: Trip | null) => void;
  setReturnTrip: (trip: Trip | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

interface RouteStore extends RouteStoreState, RouteStoreActions {}
interface TripStore extends TripStoreState, TripStoreActions {}

export const useRouteStore = create<RouteStore>((set, get) => ({
  // State
  routes: [],
  availableIslands: [],
  availableRoutes: [],
  isLoading: false,
  error: null,

  // Actions
  fetchRoutes: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select(
          `
          id,
          base_fare,
          is_active,
          from_island:from_island_id(
            id,
            name,
            zone
          ),
          to_island:to_island_id(
            id,
            name,
            zone
          )
        `
        )
        .eq('is_active', true);

      if (routesError) throw routesError;

      const formattedRoutes: Route[] = routesData.map((route: any) => ({
        id: String(route.id || ''),
        fromIsland: {
          id: String(route.from_island?.id || ''),
          name: String(route.from_island?.name || ''),
          zone: String(route.from_island?.zone || 'A') as 'A' | 'B',
        },
        toIsland: {
          id: String(route.to_island?.id || ''),
          name: String(route.to_island?.name || ''),
          zone: String(route.to_island?.zone || 'A') as 'A' | 'B',
        },
        baseFare: Number(route.base_fare || 0),
        duration: '2h', // Default duration since column doesn't exist
      }));

      set({ routes: formattedRoutes });
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  },

  fetchAvailableIslands: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: islands, error } = await supabase
        .from('islands')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      set({ availableIslands: islands });
    } catch (error) {
      console.error('Error fetching islands:', error);
      setError('Failed to fetch islands');
    } finally {
      setLoading(false);
    }
  },

  fetchAvailableRoutes: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: routes, error } = await supabase
        .from('routes')
        .select(
          `
          id,
          base_fare,
          is_active,
          from_island:from_island_id(
            id,
            name,
            zone
          ),
          to_island:to_island_id(
            id,
            name,
            zone
          )
        `
        )
        .eq('is_active', true);

      if (error) throw error;

      const formattedRoutes = routes.map((route: any) => ({
        id: String(route.id || ''),
        fromIsland: {
          id: String(route.from_island?.id || ''),
          name: String(route.from_island?.name || ''),
          zone: String(route.from_island?.zone || 'A') as 'A' | 'B',
        },
        toIsland: {
          id: String(route.to_island?.id || ''),
          name: String(route.to_island?.name || ''),
          zone: String(route.to_island?.zone || 'A') as 'A' | 'B',
        },
        baseFare: Number(route.base_fare || 0),
        duration: '2h', // Default duration
      }));

      set({ availableRoutes: formattedRoutes });
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  },

  fetchRoutesWithTripsOnDate: async (date: string) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      // Get all route IDs that have trips on the specified date
      const { data: tripsOnDate, error: tripsError } = await supabase
        .from('trips')
        .select('route_id')
        .eq('travel_date', date)
        .eq('is_active', true);

      if (tripsError) throw tripsError;

      // Get unique route IDs
      const routeIds = [...new Set(tripsOnDate.map((t: any) => t.route_id))];

      if (routeIds.length === 0) {
        set({ availableRoutes: [] });
        return [];
      }

      // Fetch route details for routes that have trips on this date
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select(
          `
          id,
          base_fare,
          is_active,
          from_island:from_island_id(
            id,
            name,
            zone
          ),
          to_island:to_island_id(
            id,
            name,
            zone
          )
        `
        )
        .in('id', routeIds)
        .eq('is_active', true);

      if (routesError) throw routesError;

      const formattedRoutes = routes.map((route: any) => ({
        id: String(route.id || ''),
        fromIsland: {
          id: String(route.from_island?.id || ''),
          name: String(route.from_island?.name || ''),
          zone: String(route.from_island?.zone || 'A') as 'A' | 'B',
        },
        toIsland: {
          id: String(route.to_island?.id || ''),
          name: String(route.to_island?.name || ''),
          zone: String(route.to_island?.zone || 'A') as 'A' | 'B',
        },
        baseFare: Number(route.base_fare || 0),
        duration: '2h',
      }));

      set({ availableRoutes: formattedRoutes });
      return formattedRoutes;
    } catch (error) {
      console.error('Error fetching routes with trips on date:', error);
      setError('Failed to fetch available routes');
      return [];
    } finally {
      setLoading(false);
    }
  },

  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

export const useTripStore = create<TripStore>((set, get) => ({
  // State
  trips: [],
  returnTrips: [],
  isLoading: false,
  error: null,

  // Actions
  fetchTrips: async (routeId: string, date: string, isReturn = false) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      // Fetch trips with vessel information and fare data
      const { data: trips, error } = await supabase
        .from('trips')
        .select(
          `
                    id,
                    route_id,
                    travel_date,
                    departure_time,
                    vessel_id,
                    is_active,
                    fare_multiplier,
                    routes!inner(
                        base_fare
                    ),
                    vessels!inner(
                        id,
                        name,
                        seating_capacity
                    )
                `
        )
        .eq('route_id', routeId)
        .eq('travel_date', date)
        .eq('is_active', true)
        .order('departure_time');

      if (error) throw error;

      // Calculate available seats for each trip
      const tripsWithAvailableSeats = await Promise.all(
        trips.map(async (trip: any) => {
          // Get seat reservations for this trip
          const { data: seatReservations, error: reservationsError } =
            await supabase
              .from('seat_reservations')
              .select(
                'is_available, booking_id, is_reserved, reservation_expiry'
              )
              .eq('trip_id', trip.id);

          if (reservationsError) {
            console.error(
              'Error fetching seat reservations for trip:',
              trip.id,
              reservationsError
            );
            return {
              id: String(trip.id || ''),
              route_id: String(trip.route_id || ''),
              travel_date: String(trip.travel_date || ''),
              departure_time: String(trip.departure_time || ''),
              available_seats: Number(trip.vessels.seating_capacity || 0),
              vessel_name: String(trip.vessels.name || 'Unknown'),
              vessel_id: String(trip.vessel_id || ''),
              seating_capacity: Number(trip.vessels.seating_capacity || 0),
              is_active: true,
              base_fare: Number(trip.routes?.base_fare || 0), // Kept for backwards compatibility
              fare_multiplier: Number(trip.fare_multiplier || 1.0),
              route: {
                base_fare: Number(trip.routes?.base_fare || 0), // Nested for consistency
              },
            };
          }

          // If no seat reservations exist, create them for this trip
          if (!seatReservations || seatReservations.length === 0) {
            // Get all seats for this vessel
            const { data: vesselSeats, error: vesselSeatsError } =
              await supabase
                .from('seats')
                .select('id')
                .eq('vessel_id', trip.vessel_id);

            if (!vesselSeatsError && vesselSeats && vesselSeats.length > 0) {
              // Create seat reservations for all seats
              const seatReservationsToCreate = vesselSeats.map((seat: any) => ({
                trip_id: trip.id,
                seat_id: seat.id,
                is_available: true,
                is_reserved: false,
              }));

              const { error: createError } = await supabase
                .from('seat_reservations')
                .upsert(seatReservationsToCreate, {
                  onConflict: 'trip_id,seat_id',
                  ignoreDuplicates: true,
                });

              if (createError) {
                console.error(
                  'Error creating seat reservations for trip:',
                  trip.id,
                  createError
                );
              } else {
                // Return vessel capacity as available seats since all seats are now available
                return {
                  id: String(trip.id || ''),
                  route_id: String(trip.route_id || ''),
                  travel_date: String(trip.travel_date || ''),
                  departure_time: String(trip.departure_time || ''),
                  available_seats: Number(trip.vessels.seating_capacity || 0),
                  vessel_name: String(trip.vessels.name || 'Unknown'),
                  vessel_id: String(trip.vessel_id || ''),
                  seating_capacity: Number(trip.vessels.seating_capacity || 0),
                  is_active: true,
                  base_fare: Number(trip.routes?.base_fare || 0), // Kept for backwards compatibility
                  fare_multiplier: Number(trip.fare_multiplier || 1.0),
                  route: {
                    base_fare: Number(trip.routes?.base_fare || 0), // Nested for consistency
                  },
                };
              }
            }
          }

          // Calculate available seats from existing reservations
          const currentTime = new Date();
          const availableSeats =
            seatReservations?.filter((reservation: any) => {
              // Seat is available if:
              // 1. is_available is true AND
              // 2. No booking_id (not booked) AND
              // 3. Either not reserved OR reservation has expired
              return (
                reservation.is_available &&
                !reservation.booking_id &&
                (!reservation.is_reserved ||
                  (reservation.reservation_expiry &&
                    currentTime > new Date(reservation.reservation_expiry)))
              );
            }).length || 0;

          return {
            id: String(trip.id || ''),
            route_id: String(trip.route_id || ''),
            travel_date: String(trip.travel_date || ''),
            departure_time: String(trip.departure_time || ''),
            available_seats: availableSeats,
            vessel_name: String(trip.vessels.name || 'Unknown'),
            vessel_id: String(trip.vessel_id || ''),
            seating_capacity: Number(trip.vessels.seating_capacity || 0),
            is_active: true,
            base_fare: Number(trip.routes?.base_fare || 0), // Kept for backwards compatibility
            fare_multiplier: Number(trip.fare_multiplier || 1.0),
            route: {
              base_fare: Number(trip.routes?.base_fare || 0), // Nested for consistency
            },
          };
        })
      );

      set(state => ({
        [isReturn ? 'returnTrips' : 'trips']: tripsWithAvailableSeats,
      }));
    } catch (error) {
      console.error('Error fetching trips:', error);
      setError('Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  },

  getAvailableDatesForRoute: async (routeId: string, daysAhead: number = 30) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);

      // Get all trips for this route in the date range
      const { data: trips, error } = await supabase
        .from('trips')
        .select('travel_date')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .gte('travel_date', today.toISOString().split('T')[0])
        .lte('travel_date', futureDate.toISOString().split('T')[0])
        .order('travel_date');

      if (error) {
        console.error('Error fetching available dates:', error);
        return [];
      }

      // Get unique dates
      const uniqueDates = [...new Set(trips.map((t: any) => t.travel_date))];
      return uniqueDates;
    } catch (error) {
      console.error('Error in getAvailableDatesForRoute:', error);
      return [];
    }
  },

  setTrip: (trip: Trip | null) => {
    // This will be used by the booking store to update its state
    // Implementation depends on how you want to sync between stores
  },

  setReturnTrip: (trip: Trip | null) => {
    // This will be used by the booking store to update its state
    // Implementation depends on how you want to sync between stores
  },

  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));
