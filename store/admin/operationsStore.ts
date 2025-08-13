import { create } from "zustand";
import { supabase } from "@/utils/supabase";
import {
    OperationsRoute,
    OperationsTrip,
    OperationsVessel,
    DatabaseIsland
} from "@/types/database";
import {
    fetchRoutes,
    fetchRoute,
    fetchTrips,
    fetchTrip,
    fetchVessels,
    fetchVessel,
    fetchIslands,
    fetchIsland,
    fetchTodaySchedule,
    createRoute,
    createTrip,
    createVessel,
    createIsland,
    updateRoute,
    updateTrip,
    updateVessel,
    updateIsland,
    deleteRoute,
    deleteTrip,
    deleteVessel,
    deleteIsland,
} from "@/utils/operationsService";

interface LoadingState {
    routes: boolean;
    trips: boolean;
    vessels: boolean;
    islands: boolean;
    schedule: boolean;
}

interface SearchQueries {
    routes: string;
    trips: string;
    vessels: string;
    islands: string;
}

interface OperationsStats {
    activeRoutes: number;
    totalRoutes: number;
    activeVessels: number;
    totalVessels: number;
    todayTrips: number;
    totalCapacity: number;
}

interface OperationsStore {
    // Data
    routes: OperationsRoute[];
    trips: OperationsTrip[];
    vessels: OperationsVessel[];
    islands: DatabaseIsland[];
    todaySchedule: OperationsTrip[];

    // Loading states
    loading: LoadingState;

    // Search queries
    searchQueries: SearchQueries;

    // Computed stats
    stats: OperationsStats;

    // Actions
    setLoading: (key: keyof LoadingState, value: boolean) => void;
    setSearchQuery: (key: keyof SearchQueries, query: string) => void;

    // Data fetching
    fetchRoutes: () => Promise<void>;
    fetchRoute: (id: string) => Promise<OperationsRoute | null>;
    fetchTrips: () => Promise<void>;
    fetchTrip: (id: string) => Promise<OperationsTrip | null>;
    fetchVessels: () => Promise<void>;
    fetchVessel: (id: string) => Promise<OperationsVessel | null>;
    fetchIslands: () => Promise<void>;
    fetchIsland: (id: string) => Promise<DatabaseIsland | null>;
    fetchTodaySchedule: () => Promise<void>;

    // CRUD operations
    addRoute: (routeData: {
        name?: string;
        from_island_id: string;
        to_island_id: string;
        base_fare: number;
        distance?: string;
        duration?: string;
        description?: string;
        status?: string;
    }) => Promise<boolean>;
    updateRouteData: (id: string, updates: Partial<{
        name: string;
        from_island_id: string;
        to_island_id: string;
        base_fare: number;
        distance: string;
        duration: string;
        description: string;
        status: string;
        is_active: boolean;
    }>) => Promise<boolean>;
    removeRoute: (id: string) => Promise<boolean>;

    addTrip: (tripData: { route_id: string; travel_date: string; departure_time: string; vessel_id: string; available_seats: number }) => Promise<boolean>;
    updateTripData: (id: string, updates: Partial<{
        route_id: string;
        travel_date: string;
        departure_time: string;
        vessel_id: string;
        available_seats: number;
        is_active: boolean;
        status: string;
    }>) => Promise<boolean>;
    removeTrip: (id: string) => Promise<boolean>;

    addVessel: (vesselData: { name: string; seating_capacity: number }) => Promise<boolean>;
    updateVesselData: (id: string, updates: Partial<{
        name: string;
        seating_capacity: number;
        is_active: boolean;
        status: string;
    }>) => Promise<boolean>;
    removeVessel: (id: string) => Promise<boolean>;

    addIsland: (islandData: { name: string; zone_id?: string; zone?: string; is_active?: boolean }) => Promise<boolean>;
    updateIslandData: (id: string, updates: Partial<{
        name: string;
        zone_id: string;
        zone: string;
        is_active: boolean;
    }>) => Promise<boolean>;
    removeIsland: (id: string) => Promise<boolean>;

    // Utility
    refreshAll: () => Promise<void>;
    calculateBasicStats: () => Promise<void>;
    clearData: () => void;
}

export const useOperationsStore = create<OperationsStore>((set, get) => ({
    // Initial state
    routes: [],
    trips: [],
    vessels: [],
    islands: [],
    todaySchedule: [],

    loading: {
        routes: false,
        trips: false,
        vessels: false,
        islands: false,
        schedule: false,
    },

    searchQueries: {
        routes: "",
        trips: "",
        vessels: "",
        islands: "",
    },

    stats: {
        activeRoutes: 0,
        totalRoutes: 0,
        activeVessels: 0,
        totalVessels: 0,
        todayTrips: 0,
        totalCapacity: 0,
    },

    // Actions
    setLoading: (key, value) => set((state) => ({
        loading: { ...state.loading, [key]: value }
    })),

    setSearchQuery: (key, query) => set((state) => ({
        searchQueries: { ...state.searchQueries, [key]: query }
    })),

    // Data fetching
    fetchRoutes: async () => {
        set((state) => ({ loading: { ...state.loading, routes: true } }));
        try {
            const routes = await fetchRoutes();
            set((state) => {
                const activeRoutes = routes.filter(r => r.status === "active").length;
                return {
                    routes,
                    loading: { ...state.loading, routes: false },
                    stats: {
                        ...state.stats,
                        activeRoutes,
                        totalRoutes: routes.length,
                    }
                };
            });
        } catch (error) {
            console.error('Error in fetchRoutes:', error);
            set((state) => ({ loading: { ...state.loading, routes: false } }));
        }
    },

    fetchRoute: async (id: string) => {
        const route = await fetchRoute(id);
        return route;
    },

    fetchTrips: async () => {
        set((state) => ({ loading: { ...state.loading, trips: true } }));
        try {
            const trips = await fetchTrips();
            
            // Fetch accurate today's trips count from new database view
            let todayTrips = 0;
            try {
                const { data: statsData, error: statsError } = await supabase
                    .from('enhanced_operations_stats_view')
                    .select('today_trips')
                    .single();
                
                if (!statsError && statsData) {
                    todayTrips = statsData.today_trips || 0;
                } else {
                    // Fallback to manual calculation
                    const today = new Date().toISOString().split('T')[0];
                    todayTrips = trips.filter(t => t.travel_date === today).length;
                }
            } catch (err) {
                const today = new Date().toISOString().split('T')[0];
                todayTrips = trips.filter(t => t.travel_date === today).length;
            }
            
            set((state) => ({
                trips,
                loading: { ...state.loading, trips: false },
                stats: {
                    ...state.stats,
                    todayTrips,
                }
            }));
        } catch (error) {
            console.error('Error in fetchTrips:', error);
            set((state) => ({ loading: { ...state.loading, trips: false } }));
        }
    },

    fetchTrip: async (id: string) => {
        const trip = await fetchTrip(id);
        return trip;
    },

    fetchVessels: async () => {
        set((state) => ({ loading: { ...state.loading, vessels: true } }));
        try {
            const vessels = await fetchVessels();
            set((state) => {
                const activeVessels = vessels.filter(v => v.status === "active").length;
                const totalCapacity = vessels.reduce((sum, v) => sum + v.seating_capacity, 0);
                return {
                    vessels,
                    loading: { ...state.loading, vessels: false },
                    stats: {
                        ...state.stats,
                        activeVessels,
                        totalVessels: vessels.length,
                        totalCapacity,
                    }
                };
            });
        } catch (error) {
            console.error('Error in fetchVessels:', error);
            set((state) => ({ loading: { ...state.loading, vessels: false } }));
        }
    },

    fetchVessel: async (id: string) => {
        const vessel = await fetchVessel(id);
        return vessel;
    },

    fetchIslands: async () => {
        set((state) => ({ loading: { ...state.loading, islands: true } }));
        try {
            const islands = await fetchIslands();
            set((state) => ({
                islands,
                loading: { ...state.loading, islands: false },
            }));
        } catch (error) {
            console.error('Error in fetchIslands:', error);
            set((state) => ({ loading: { ...state.loading, islands: false } }));
        }
    },

    fetchTodaySchedule: async () => {
        set((state) => ({ loading: { ...state.loading, schedule: true } }));
        try {
            // Use operations_trips_view for today's data (includes travel_date)
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .eq('travel_date', today)
                .eq('is_active', true)
                .order('departure_time', { ascending: true });
            
            if (error) throw error;
            
            const todaySchedule = data || [];
            set((state) => ({
                todaySchedule,
                loading: { ...state.loading, schedule: false },
            }));
        } catch (error) {
            console.error('Error in fetchTodaySchedule:', error);
            // Fallback to regular trips query if view doesn't exist
            try {
                const today = new Date().toISOString().split('T')[0];
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('operations_trips_view')
                    .select('*')
                    .eq('travel_date', today)
                    .order('departure_time', { ascending: true });
                
                if (!fallbackError) {
                    set((state) => ({
                        todaySchedule: fallbackData || [],
                        loading: { ...state.loading, schedule: false },
                    }));
                } else {
                    throw fallbackError;
                }
            } catch (fallbackError) {
                console.error('Fallback fetchTodaySchedule also failed:', fallbackError);
                set((state) => ({ loading: { ...state.loading, schedule: false } }));
            }
        }
    },

    // CRUD operations
    addRoute: async (routeData) => {
        try {
            const newRoute = await createRoute(routeData);
            if (newRoute) {
                await get().fetchRoutes(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding route:', error);
            return false;
        }
    },

    updateRouteData: async (id, updates) => {
        try {
            const result = await updateRoute(id, updates);
            if (result) {
                await get().fetchRoutes(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating route:', error);
            return false;
        }
    },

    removeRoute: async (id) => {
        try {
            const success = await deleteRoute(id);
            if (success) {
                await get().fetchRoutes(); // Refresh the list
            }
            return success;
        } catch (error) {
            console.error('Error deleting route:', error);
            return false;
        }
    },

    addTrip: async (tripData) => {
        try {
            const newTrip = await createTrip(tripData);
            if (newTrip) {
                await get().fetchTrips(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding trip:', error);
            return false;
        }
    },

    updateTripData: async (id, updates) => {
        try {
            const result = await updateTrip(id, updates);
            if (result) {
                await get().fetchTrips(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating trip:', error);
            return false;
        }
    },

    removeTrip: async (id) => {
        try {
            const success = await deleteTrip(id);
            if (success) {
                await get().fetchTrips(); // Refresh the list
            }
            return success;
        } catch (error) {
            console.error('Error deleting trip:', error);
            return false;
        }
    },

    addVessel: async (vesselData) => {
        try {
            const newVessel = await createVessel(vesselData);
            if (newVessel) {
                await get().fetchVessels(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding vessel:', error);
            return false;
        }
    },

    updateVesselData: async (id, updates) => {
        try {
            const result = await updateVessel(id, updates);
            if (result) {
                await get().fetchVessels(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating vessel:', error);
            return false;
        }
    },

    removeVessel: async (id) => {
        try {
            const success = await deleteVessel(id);
            if (success) {
                await get().fetchVessels(); // Refresh the list
            }
            return success;
        } catch (error) {
            console.error('Error deleting vessel:', error);
            return false;
        }
    },

    fetchIsland: async (id: string) => {
        const island = await fetchIsland(id);
        return island;
    },

    addIsland: async (islandData) => {
        try {
            const newIsland = await createIsland(islandData);
            if (newIsland) {
                await get().fetchIslands(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding island:', error);
            return false;
        }
    },

    updateIslandData: async (id, updates) => {
        try {
            const result = await updateIsland(id, updates);
            if (result) {
                await get().fetchIslands(); // Refresh the list
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating island:', error);
            return false;
        }
    },

    removeIsland: async (id) => {
        try {
            const success = await deleteIsland(id);
            if (success) {
                await get().fetchIslands(); // Refresh the list
            }
            return success;
        } catch (error) {
            console.error('Error deleting island:', error);
            return false;
        }
    },

    // Utility
    refreshAll: async () => {
        const { fetchRoutes, fetchTrips, fetchVessels, fetchIslands, fetchTodaySchedule } = get();
        
        // Fetch enhanced stats for accurate data
        try {
            const { data: enhancedStats, error: statsError } = await supabase
                .from('enhanced_operations_stats_view')
                .select('*')
                .single();
            
            if (!statsError && enhancedStats) {
                set((state) => ({
                    stats: {
                        activeRoutes: enhancedStats.active_routes || 0,
                        totalRoutes: enhancedStats.total_routes || 0,
                        activeVessels: enhancedStats.active_vessels || 0,
                        totalVessels: enhancedStats.total_vessels || 0,
                        todayTrips: enhancedStats.today_trips || 0,
                        totalCapacity: enhancedStats.today_total_capacity || 0,
                    }
                }));
            } else {
                console.warn('OperationsStore: Enhanced stats not available:', statsError);
                // Fallback to basic stats calculation
                await get().calculateBasicStats();
            }
        } catch (error) {
            console.error('OperationsStore: Error fetching enhanced stats:', error);
            await get().calculateBasicStats();
        }
        
        await Promise.all([
            fetchRoutes(),
            fetchTrips(),
            fetchVessels(),
            fetchIslands(),
            fetchTodaySchedule(),
        ]);
    },

    calculateBasicStats: async () => {
        try {
            const { routes, trips, vessels } = get();
            
            // Calculate basic stats from loaded data
            const activeRoutes = routes.filter(r => r.is_active).length;
            const totalRoutes = routes.length;
            const activeVessels = vessels.filter(v => v.is_active).length;
            const totalVessels = vessels.length;
            
            // Today's trips
            const today = new Date().toISOString().split('T')[0];
            const todayTrips = trips.filter(t => 
                t.travel_date === today && t.is_active
            ).length;
            
            // Calculate total capacity for today
            const todayTripIds = trips
                .filter(t => t.travel_date === today && t.is_active)
                .map(t => t.vessel_id);
            const todayVessels = vessels.filter(v => todayTripIds.includes(v.id));
            const totalCapacity = todayVessels.reduce((sum, v) => sum + (v.seating_capacity || 0), 0);
            
            
            set((state) => ({
                stats: {
                    activeRoutes,
                    totalRoutes,
                    activeVessels,
                    totalVessels,
                    todayTrips,
                    totalCapacity,
                }
            }));
        } catch (error) {
            console.error('OperationsStore: Error calculating basic stats:', error);
        }
    },

    clearData: () => set({
        routes: [],
        trips: [],
        vessels: [],
        islands: [],
        todaySchedule: [],
        searchQueries: {
            routes: "",
            trips: "",
            vessels: "",
            islands: "",
        },
    }),
})); 