import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { RouteStoreState, TripStoreState, Trip } from '@/types/booking';
import type { Route, Island } from '@/types';

interface RouteStoreActions {
    fetchRoutes: () => Promise<void>;
    fetchAvailableIslands: () => Promise<void>;
    fetchAvailableRoutes: () => Promise<void>;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

interface TripStoreActions {
    fetchTrips: (routeId: string, date: string, isReturn?: boolean) => Promise<void>;
    setTrip: (trip: Trip | null) => void;
    setReturnTrip: (trip: Trip | null) => void;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

interface RouteStore extends RouteStoreState, RouteStoreActions { }
interface TripStore extends TripStoreState, TripStoreActions { }

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
                .select(`
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
        `)
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
                .select(`
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
        `)
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
                duration: '2h' // Default duration
            }));

            set({ availableRoutes: formattedRoutes });
        } catch (error) {
            console.error('Error fetching routes:', error);
            setError('Failed to fetch routes');
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
            const { data: trips, error } = await supabase
                .from('trips_with_available_seats')
                .select(`
          id,
          route_id,
          travel_date,
          departure_time,
          available_seats,
          vessel_name,
          seating_capacity
        `)
                .eq('route_id', routeId)
                .eq('travel_date', date)
                .eq('is_active', true)
                .order('departure_time');

            if (error) throw error;

            const formattedTrips = trips.map((trip: any) => ({
                id: String(trip.id || ''),
                route_id: String(trip.route_id || ''),
                travel_date: String(trip.travel_date || ''),
                departure_time: String(trip.departure_time || ''),
                available_seats: Number(trip.available_seats || 0),
                vessel_name: String(trip.vessel_name || 'Unknown'),
                seating_capacity: Number(trip.seating_capacity || 0),
                is_active: true
            }));

            set(state => ({
                [isReturn ? 'returnTrips' : 'trips']: formattedTrips
            }));
        } catch (error) {
            console.error('Error fetching trips:', error);
            setError('Failed to fetch trips');
        } finally {
            setLoading(false);
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