import { useCallback, useMemo } from 'react';
import { useRouteStore } from '@/store/admin/routeStore';
import { useIslandStore } from '@/store/admin/islandStore';
import { AdminManagement } from '@/types';

type Route = AdminManagement.Route;
type RouteFormData = AdminManagement.RouteFormData;
type RouteStats = AdminManagement.RouteStats;
type RouteFilters = AdminManagement.RouteFilters;
type RouteWithDetails = AdminManagement.RouteWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type BaseManagementHook<T, F, S> = AdminManagement.BaseManagementHook<T, F, S>;

// ============================================================================
// ROUTE MANAGEMENT HOOK INTERFACE
// ============================================================================

export interface UseRouteManagementReturn
  extends BaseManagementHook<Route, RouteFormData, RouteStats> {
  // Route-specific data
  routes: Route[];
  currentRoute: Route | null;

  // Computed data with current filters and sort
  filteredRoutes: Route[];
  sortedRoutes: Route[];
  routesByIsland: Record<string, Route[]>;

  // Island data for route management
  islands: any[]; // Island type from island store
  loadIslands: () => Promise<void>;

  // Route-specific actions
  loadRoutesByIsland: (islandId: string) => Promise<Route[]>;
  getRoutesByIsland: (islandId: string) => Route[];

  // Enhanced getters
  getRouteWithDetails: (id: string) => Promise<RouteWithDetails | null>;

  // Filter and sort state
  sortBy:
    | 'name'
    | 'base_fare'
    | 'created_at'
    | 'total_trips_30d'
    | 'total_revenue_30d'
    | 'average_occupancy_30d';
  sortOrder: 'asc' | 'desc';
  setSortBy: (
    sortBy:
      | 'name'
      | 'base_fare'
      | 'created_at'
      | 'total_trips_30d'
      | 'total_revenue_30d'
      | 'average_occupancy_30d'
  ) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Search and filter management
  searchQuery: string;
  filters: RouteFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<RouteFilters>) => void;
  clearFilters: () => void;

  // Performance helpers
  getPerformanceRating: (
    route: Route
  ) => 'excellent' | 'good' | 'fair' | 'poor';
  getPerformanceColor: (rating: string) => string;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
}

// ============================================================================
// ROUTE MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useRouteManagement = (
  // Optional parameters for pre-filtering
  initialSearchQuery: string = '',
  initialFilters: RouteFilters = {},
  initialSortBy:
    | 'name'
    | 'base_fare'
    | 'created_at'
    | 'total_trips_30d'
    | 'total_revenue_30d'
    | 'average_occupancy_30d' = 'name',
  initialSortOrder: 'asc' | 'desc' = 'asc'
): UseRouteManagementReturn => {
  // ========================================================================
  // STORE ACCESS
  // ========================================================================

  const routeStore = useRouteStore();
  const islandStore = useIslandStore();

  const {
    data: routes,
    currentItem: currentRoute,
    loading,
    error,
    stats,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    fetchAll,
    fetchById,
    create,
    update,
    delete: deleteRoute,
    fetchRouteDetails,
    fetchRoutesByIsland,
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    getRouteById,
    getRoutesByIsland,
    validateRouteData,
    refreshAll,
    searchItems,
    filterItems,
    sortItems,
  } = routeStore;

  const { data: islands, fetchAll: fetchIslands } = islandStore;

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  // Apply current search and filters
  const filteredRoutes = useMemo(() => {
    let filtered = routes;

    // Apply search
    if (searchQuery.trim()) {
      filtered = searchItems(filtered, searchQuery);
    }

    // Apply filters
    filtered = filterItems(filtered, filters);

    return filtered;
  }, [routes, searchQuery, filters, searchItems, filterItems]);

  // Apply current sort
  const sortedRoutes = useMemo(() => {
    return sortItems(filteredRoutes, sortBy, sortOrder);
  }, [filteredRoutes, sortBy, sortOrder, sortItems]);

  // Group routes by island
  const routesByIsland = useMemo(() => {
    const grouped: Record<string, Route[]> = {};

    routes.forEach(route => {
      // Group by origin island
      if (!grouped[route.from_island_id]) {
        grouped[route.from_island_id] = [];
      }
      grouped[route.from_island_id].push(route);

      // Group by destination island (if different)
      if (route.to_island_id !== route.from_island_id) {
        if (!grouped[route.to_island_id]) {
          grouped[route.to_island_id] = [];
        }
        if (!grouped[route.to_island_id].some(r => r.id === route.id)) {
          grouped[route.to_island_id].push(route);
        }
      }
    });

    return grouped;
  }, [routes]);

  // ========================================================================
  // ACTIONS
  // ========================================================================

  const loadAll = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const getById = useCallback(
    (id: string) => {
      return getRouteById(id);
    },
    [getRouteById]
  );

  const createRoute = useCallback(
    async (data: RouteFormData) => {
      try {
        await create(data);
      } catch (error) {
        throw error;
      }
    },
    [create]
  );

  const updateRoute = useCallback(
    async (id: string, data: Partial<RouteFormData>) => {
      try {
        await update(id, data);
      } catch (error) {
        throw error;
      }
    },
    [update]
  );

  const removeRoute = useCallback(
    async (id: string) => {
      try {
        await deleteRoute(id);
      } catch (error) {
        throw error;
      }
    },
    [deleteRoute]
  );

  const refresh = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const loadIslands = useCallback(async () => {
    if (!islands || islands.length === 0) {
      await fetchIslands();
    }
  }, [islands, fetchIslands]);

  const loadRoutesByIsland = useCallback(
    async (islandId: string) => {
      return await fetchRoutesByIsland(islandId);
    },
    [fetchRoutesByIsland]
  );

  const getRouteWithDetails = useCallback(
    async (id: string) => {
      return await fetchRouteDetails(id);
    },
    [fetchRouteDetails]
  );

  const validateData = useCallback(
    (data: Partial<RouteFormData>) => {
      return validateRouteData(data);
    },
    [validateRouteData]
  );

  // ========================================================================
  // PERFORMANCE HELPERS
  // ========================================================================

  const getPerformanceRating = useCallback(
    (route: Route): 'excellent' | 'good' | 'fair' | 'poor' => {
      const onTimePerf = route.on_time_performance_30d || 0;

      if (onTimePerf >= 95) return 'excellent';
      if (onTimePerf >= 85) return 'good';
      if (onTimePerf >= 70) return 'fair';
      return 'poor';
    },
    []
  );

  const getPerformanceColor = useCallback((rating: string): string => {
    switch (rating) {
      case 'excellent':
        return '#10B981'; // Green
      case 'good':
        return '#3B82F6'; // Blue
      case 'fair':
        return '#F59E0B'; // Yellow
      case 'poor':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return `MVR ${amount.toLocaleString()}`;
  }, []);

  const formatPercentage = useCallback((value: number): string => {
    return `${value.toFixed(1)}%`;
  }, []);

  // ========================================================================
  // RETURN INTERFACE
  // ========================================================================

  return {
    // Data
    items: routes,
    routes,
    currentItem: currentRoute,
    currentRoute,
    loading,
    error,
    stats,

    // Computed data
    filteredItems: filteredRoutes,
    filteredRoutes,
    sortedItems: sortedRoutes,
    sortedRoutes,
    routesByIsland,

    // Islands data
    islands,
    loadIslands,

    // Actions
    loadAll,
    getById,
    create: createRoute,
    update: updateRoute,
    remove: removeRoute,
    refresh,

    // Route-specific actions
    loadRoutesByIsland,
    getRoutesByIsland,
    getRouteWithDetails,

    // Search and filter
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    clearFilters,

    // Sort
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
  };
};

// Export for use in components
export default useRouteManagement;
