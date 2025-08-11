import { useCallback, useMemo } from 'react';
import { useTripStore } from '@/store/admin/tripStore';
import { useRouteStore } from '@/store/admin/routeStore';
import { useVesselStore } from '@/store/admin/vesselStore';
import { AdminManagement } from '@/types';
import {
    getTripPerformanceRating,
    getTripPerformanceColor,
    formatCurrency,
    formatPercentage,
    getOccupancyLevel,
    getStatusColor,
} from '@/utils/admin/tripUtils';

type Trip = AdminManagement.Trip;
type TripFormData = AdminManagement.TripFormData;
type TripStats = AdminManagement.TripStats;
type TripFilters = AdminManagement.TripFilters;
type TripWithDetails = AdminManagement.TripWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type UseTripManagementReturn = AdminManagement.UseTripManagementReturn & {
    generateTripsFromSchedule: (request: any) => Promise<any>;
    previewTripGeneration: (request: any) => any;
};

// ============================================================================
// TRIP MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useTripManagement = (
    // Optional parameters for pre-filtering
    initialSearchQuery: string = '',
    initialFilters: TripFilters = {},
    initialSortBy: 'travel_date' | 'departure_time' | 'status' | 'available_seats' | 'booked_seats' | 'created_at' | 'fare_multiplier' = 'travel_date',
    initialSortOrder: 'asc' | 'desc' = 'desc'
): UseTripManagementReturn => {

    // ========================================================================
    // STORE ACCESS
    // ========================================================================

    const tripStore = useTripStore();
    const routeStore = useRouteStore();
    const vesselStore = useVesselStore();

    const {
        data: trips,
        currentItem: currentTrip,
        loading,
        error,
        stats,
        filteredTrips: storeFilteredTrips,
        sortedTrips: storeSortedTrips,
        tripsByStatus: storeTripsByStatus,
        tripsByRoute: storeTripsByRoute,
        tripsByVessel: storeTripsByVessel,
        sortBy,
        sortOrder,
        searchQuery,
        filters,
        routes,
        vessels,
        // Actions
        fetchAll,
        fetchById,
        create,
        update,
        delete: deleteTrip,
        fetchTripDetails,
        fetchTripsByStatus,
        fetchTripsByRoute,
        fetchTripsByVessel,
        fetchTripsByDate,
        setSearchQuery,
        setFilters,
        clearFilters,
        setSortBy,
        setSortOrder,
        getTripById,
        getTripsByStatus,
        getTripsByRoute,
        getTripsByVessel,
        validateTripData,
        checkTripConflicts,
        refreshAll,
        searchItems,
        filterItems,
        sortItems,
        generateTripsFromSchedule,
        previewTripGeneration,
    } = tripStore;

    // ========================================================================
    // COMPUTED DATA
    // ========================================================================

    const filteredTrips = useMemo(() => {
        return storeFilteredTrips || [];
    }, [storeFilteredTrips]);

    const sortedTrips = useMemo(() => {
        return storeSortedTrips || [];
    }, [storeSortedTrips]);

    const tripsByStatus = useMemo(() => {
        return storeTripsByStatus || {};
    }, [storeTripsByStatus]);

    const tripsByRoute = useMemo(() => {
        return storeTripsByRoute || {};
    }, [storeTripsByRoute]);

    const tripsByVessel = useMemo(() => {
        return storeTripsByVessel || {};
    }, [storeTripsByVessel]);

    // ========================================================================
    // ACTIONS
    // ========================================================================

    const loadAll = useCallback(async () => {
        await fetchAll();
    }, [fetchAll]);

    const getById = useCallback((id: string) => {
        return getTripById(id);
    }, [getTripById]);

    const createTrip = useCallback(async (data: TripFormData) => {
        await create(data);
    }, [create]);

    const updateTrip = useCallback(async (id: string, data: Partial<TripFormData>) => {
        await update(id, data);
    }, [update]);

    const remove = useCallback(async (id: string) => {
        await deleteTrip(id);
    }, [deleteTrip]);

    const refresh = useCallback(async () => {
        await refreshAll();
    }, [refreshAll]);

    const loadRoutes = useCallback(async () => {
        await routeStore.fetchAll();
    }, [routeStore]);

    const loadVessels = useCallback(async () => {
        await vesselStore.fetchAll();
    }, [vesselStore]);

    const loadTripsByStatus = useCallback(async (status: string) => {
        return await fetchTripsByStatus(status);
    }, [fetchTripsByStatus]);

    const loadTripsByRoute = useCallback(async (routeId: string) => {
        return await fetchTripsByRoute(routeId);
    }, [fetchTripsByRoute]);

    const loadTripsByVessel = useCallback(async (vesselId: string) => {
        return await fetchTripsByVessel(vesselId);
    }, [fetchTripsByVessel]);

    const loadTripsByDate = useCallback(async (date: string) => {
        return await fetchTripsByDate(date);
    }, [fetchTripsByDate]);

    const getTripWithDetails = useCallback(async (id: string) => {
        return await fetchTripDetails(id);
    }, [fetchTripDetails]);

    const validateData = useCallback((data: Partial<TripFormData>) => {
        return validateTripData(data);
    }, [validateTripData]);

    // ========================================================================
    // PERFORMANCE HELPERS
    // ========================================================================

    const getPerformanceRating = useCallback((trip: Trip) => {
        return getTripPerformanceRating(trip);
    }, []);

    const getPerformanceColor = useCallback((rating: string) => {
        return getTripPerformanceColor(rating);
    }, []);

    const formatCurrencyAmount = useCallback((amount: number) => {
        return formatCurrency(amount);
    }, []);

    const formatPercentageValue = useCallback((value: number) => {
        return formatPercentage(value);
    }, []);

    const getOccupancyLevelForTrip = useCallback((trip: Trip) => {
        return getOccupancyLevel(trip);
    }, []);

    const getStatusColorForTrip = useCallback((status: string) => {
        return getStatusColor(status);
    }, []);

    // ========================================================================
    // RETURN OBJECT
    // ========================================================================

    return {
        // Data
        items: trips,
        currentItem: currentTrip,
        loading,
        error,
        stats,

        // Trip-specific data
        trips,
        currentTrip,

        // Computed data
        filteredItems: filteredTrips,
        sortedItems: sortedTrips,
        filteredTrips,
        sortedTrips,
        tripsByStatus,
        tripsByRoute,
        tripsByVessel,

        // Related data
        routes,
        vessels,

        // Search and filter state
        searchQuery,
        filters,

        // Actions
        loadAll,
        getById,
        create: createTrip,
        update: updateTrip,
        remove,
        refresh,
        generateTripsFromSchedule,
        previewTripGeneration,

        // Trip-specific actions
        loadRoutes,
        loadVessels,
        loadTripsByStatus,
        loadTripsByRoute,
        loadTripsByVessel,
        loadTripsByDate,
        getTripWithDetails,

        // Search and filter
        setSearchQuery,
        setFilters,
        clearFilters,

        // Sort state
        sortBy,
        sortOrder,
        setSortBy,
        setSortOrder,

        // Validation
        validateData,

        // Performance helpers
        getPerformanceRating,
        getPerformanceColor,
        formatCurrency: formatCurrencyAmount,
        formatPercentage: formatPercentageValue,
        getOccupancyLevel: getOccupancyLevelForTrip,
        getStatusColor: getStatusColorForTrip
    };
}; 