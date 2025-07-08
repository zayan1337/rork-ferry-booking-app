import { create } from 'zustand';
import { AdminTrip, AdminTripFilters } from '@/types/admin';

interface BulkTripCreation {
    route_id: string;
    vessel_id: string;
    start_date: string;
    end_date: string;
    departure_times: string[];
    days_of_week: number[];
    base_fare: number;
}

interface AdminTripsState {
    // Data
    trips: AdminTrip[];
    selectedTrip: AdminTrip | null;

    // UI State
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isBulkCreating: boolean;
    error: string | null;

    // Filters & Pagination
    filters: AdminTripFilters;
    totalCount: number;
    currentPage: number;

    // Actions
    setTrips: (trips: AdminTrip[]) => void;
    setSelectedTrip: (trip: AdminTrip | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    addTrip: (trip: AdminTrip) => void;
    updateTripInStore: (id: string, updates: Partial<AdminTrip>) => void;
    removeTripFromStore: (id: string) => void;

    // Utility actions
    setFilters: (filters: Partial<AdminTripFilters>) => void;
    setCurrentPage: (page: number) => void;
    clearSelectedTrip: () => void;
    clearError: () => void;
    reset: () => void;
}

const initialFilters: AdminTripFilters = {
    search: '',
    route_id: undefined,
    vessel_id: undefined,
    status: undefined,
    date_from: undefined,
    date_to: undefined,
};

export const useAdminTripsStore = create<AdminTripsState>((set, get) => ({
    // Initial state
    trips: [],
    selectedTrip: null,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isBulkCreating: false,
    error: null,
    filters: initialFilters,
    totalCount: 0,
    currentPage: 1,

    // Actions
    setTrips: (trips) => set({ trips }),

    setSelectedTrip: (trip) => set({ selectedTrip: trip }),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    addTrip: (trip) => set(state => ({
        trips: [trip, ...state.trips],
        totalCount: state.totalCount + 1,
    })),

    updateTripInStore: (id, updates) => set(state => ({
        trips: state.trips.map(trip =>
            trip.id === id ? { ...trip, ...updates } : trip
        ),
        selectedTrip: state.selectedTrip?.id === id
            ? { ...state.selectedTrip, ...updates }
            : state.selectedTrip,
    })),

    removeTripFromStore: (id) => set(state => ({
        trips: state.trips.filter(trip => trip.id !== id),
        selectedTrip: state.selectedTrip?.id === id ? null : state.selectedTrip,
        totalCount: Math.max(0, state.totalCount - 1),
    })),

    // Utility actions
    setFilters: (newFilters) => {
        set(state => ({
            filters: { ...state.filters, ...newFilters },
            currentPage: 1, // Reset to first page when filters change
        }));
    },

    setCurrentPage: (page) => {
        set({ currentPage: page });
    },

    clearSelectedTrip: () => {
        set({ selectedTrip: null });
    },

    clearError: () => {
        set({ error: null });
    },

    reset: () => {
        set({
            trips: [],
            selectedTrip: null,
            isLoading: false,
            isCreating: false,
            isUpdating: false,
            isDeleting: false,
            isBulkCreating: false,
            error: null,
            filters: initialFilters,
            totalCount: 0,
            currentPage: 1,
        });
    },
})); 