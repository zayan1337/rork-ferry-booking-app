import { create } from "zustand";
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
    fetchTodaySchedule,
    createRoute,
    createTrip,
    createVessel,
    updateRoute,
    updateTrip,
    updateVessel,
    deleteRoute,
    deleteTrip,
    deleteVessel,
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
    fetchTodaySchedule: () => Promise<void>;

    // CRUD operations
    addRoute: (routeData: { from_island_id: string; to_island_id: string; base_fare: number }) => Promise<boolean>;
    updateRouteData: (id: string, updates: Partial<OperationsRoute>) => Promise<boolean>;
    removeRoute: (id: string) => Promise<boolean>;

    addTrip: (tripData: { route_id: string; travel_date: string; departure_time: string; vessel_id: string; available_seats: number }) => Promise<boolean>;
    updateTripData: (id: string, updates: Partial<OperationsTrip>) => Promise<boolean>;
    removeTrip: (id: string) => Promise<boolean>;

    addVessel: (vesselData: { name: string; seating_capacity: number }) => Promise<boolean>;
    updateVesselData: (id: string, updates: Partial<OperationsVessel>) => Promise<boolean>;
    removeVessel: (id: string) => Promise<boolean>;

    // Utility
    refreshAll: () => Promise<void>;
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
            set((state) => {
                const today = new Date().toISOString().split('T')[0];
                const todayTrips = trips.filter(t => t.travel_date === today).length;
                return {
                    trips,
                    loading: { ...state.loading, trips: false },
                    stats: {
                        ...state.stats,
                        todayTrips,
                    }
                };
            });
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
            const todaySchedule = await fetchTodaySchedule();
            set((state) => ({
                todaySchedule,
                loading: { ...state.loading, schedule: false },
            }));
        } catch (error) {
            console.error('Error in fetchTodaySchedule:', error);
            set((state) => ({ loading: { ...state.loading, schedule: false } }));
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
            const success = await updateRoute(id, updates);
            if (success) {
                await get().fetchRoutes(); // Refresh the list
            }
            return success;
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
            const success = await updateTrip(id, updates);
            if (success) {
                await get().fetchTrips(); // Refresh the list
            }
            return success;
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
            const success = await updateVessel(id, updates);
            if (success) {
                await get().fetchVessels(); // Refresh the list
            }
            return success;
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

    // Utility
    refreshAll: async () => {
        const { fetchRoutes, fetchTrips, fetchVessels, fetchIslands, fetchTodaySchedule } = get();
        await Promise.all([
            fetchRoutes(),
            fetchTrips(),
            fetchVessels(),
            fetchIslands(),
            fetchTodaySchedule(),
        ]);
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
        },
    }),
})); 