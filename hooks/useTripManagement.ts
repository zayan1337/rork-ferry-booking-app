import { useCallback, useMemo } from 'react';
import { useTripStore } from '@/store/admin/tripStore';
import { useRouteStore } from '@/store/admin/routeStore';
import { useVesselStore } from '@/store/admin/vesselStore';
import { AdminManagement } from '@/types';

type Trip = AdminManagement.Trip;
type TripFormData = AdminManagement.TripFormData;
type TripStats = AdminManagement.TripStats;
type TripFilters = AdminManagement.TripFilters;
type TripWithDetails = AdminManagement.TripWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type UseTripManagementReturn = AdminManagement.UseTripManagementReturn;

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

    const getPerformanceRating = useCallback((trip: Trip): 'excellent' | 'good' | 'fair' | 'poor' => {
        const occupancy = trip.occupancy_rate || 0;
        const isOnTime = trip.status !== 'delayed' && trip.status !== 'cancelled';

        if (occupancy >= 80 && isOnTime) return 'excellent';
        if (occupancy >= 60 && isOnTime) return 'good';
        if (occupancy >= 40 || isOnTime) return 'fair';
        return 'poor';
    }, []);

    const getPerformanceColor = useCallback((rating: string) => {
        const colors = {
            excellent: '#10B981', // green
            good: '#3B82F6',      // blue
            fair: '#F59E0B',      // yellow
            poor: '#EF4444'       // red
        };
        return colors[rating as keyof typeof colors] || '#6B7280';
    }, []);

    const formatCurrency = useCallback((amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }, []);

    const formatPercentage = useCallback((value: number) => {
        return `${Math.round(value)}%`;
    }, []);

    const getOccupancyLevel = useCallback((trip: Trip): 'low' | 'medium' | 'high' | 'full' => {
        const occupancy = trip.occupancy_rate || 0;
        if (occupancy >= 100) return 'full';
        if (occupancy >= 80) return 'high';
        if (occupancy >= 50) return 'medium';
        return 'low';
    }, []);

    const getStatusColor = useCallback((status: string) => {
        const colors = {
            scheduled: '#3B82F6', // blue
            boarding: '#F59E0B',  // yellow
            departed: '#10B981',  // green
            arrived: '#059669',   // dark green
            cancelled: '#EF4444', // red
            delayed: '#F59E0B'    // yellow
        };
        return colors[status as keyof typeof colors] || '#6B7280';
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
        formatCurrency,
        formatPercentage,
        getOccupancyLevel,
        getStatusColor
    };
}; 