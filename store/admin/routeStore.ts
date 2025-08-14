import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';

type Route = AdminManagement.Route;
type RouteFormData = AdminManagement.RouteFormData;
type RouteStats = AdminManagement.RouteStats;
type RouteFilters = AdminManagement.RouteFilters;
type RouteWithDetails = AdminManagement.RouteWithDetails;
type RouteActivityLog = AdminManagement.RouteActivityLog;
type LoadingStates = AdminManagement.LoadingStates;
type ValidationResult = AdminManagement.ValidationResult;
type BaseStoreState<T> = AdminManagement.BaseStoreState<T>;
type FilterableStoreState<T, F> = AdminManagement.FilterableStoreState<T, F>;
type StatsStoreState<S> = AdminManagement.StatsStoreState<S>;
type BaseCrudActions<T, F> = AdminManagement.BaseCrudActions<T, F>;
type SearchableActions<T> = AdminManagement.SearchableActions<T>;

// ============================================================================
// ROUTE STORE INTERFACES
// ============================================================================

interface RouteStoreState
  extends BaseStoreState<Route>,
    FilterableStoreState<Route, RouteFilters>,
    StatsStoreState<RouteStats> {
  // Computed data
  filteredRoutes: Route[];
  sortedRoutes: Route[];

  // Sort configuration
  sortBy:
    | 'name'
    | 'base_fare'
    | 'created_at'
    | 'total_trips_30d'
    | 'total_revenue_30d'
    | 'average_occupancy_30d';
  sortOrder: 'asc' | 'desc';

  // Activity logs
  activityLogs: RouteActivityLog[];
}

interface RouteStoreActions
  extends BaseCrudActions<Route, RouteFormData>,
    SearchableActions<Route> {
  // Route-specific actions
  fetchRouteDetails: (id: string) => Promise<RouteWithDetails | null>;
  fetchRouteActivityLogs: (routeId: string) => Promise<RouteActivityLog[]>;
  fetchRoutesByIsland: (islandId: string) => Promise<Route[]>;

  // Computed data actions
  getFilteredRoutes: () => Route[];
  getSortedRoutes: (items: Route[]) => Route[];

  // Sort actions
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

  // Filter actions
  setFilters: (filters: Partial<RouteFilters>) => void;

  // Statistics
  calculateStats: () => void;

  // Utility
  getRouteById: (id: string) => Route | undefined;
  getRoutesByIsland: (islandId: string) => Route[];
  validateRouteData: (data: Partial<RouteFormData>) => ValidationResult;

  // Activity logs
  addActivityLog: (log: Omit<RouteActivityLog, 'id' | 'created_at'>) => void;
}

type RouteStore = RouteStoreState & RouteStoreActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: RouteStoreState = {
  data: [],
  currentItem: null,
  loading: {
    routes: false,
    singleRoute: false,
    creating: false,
    updating: false,
    deleting: false,
    activityLogs: false,
  },
  error: null,
  searchQuery: '',
  filters: {},
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    totalTrips30d: 0,
    totalBookings30d: 0,
    totalRevenue30d: 0,
    avgOccupancy: 0,
    avgFare: 0,
    onTimePerformance: 0,
    cancellationRate: 0,
    popularityScore: 0,
  },
  filteredRoutes: [],
  sortedRoutes: [],
  sortBy: 'name',
  sortOrder: 'asc',
  activityLogs: [],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const processRouteData = (route: any): Route => ({
  id: route.id,
  name: route.name,
  from_island_id: route.from_island_id,
  to_island_id: route.to_island_id,
  base_fare: route.base_fare,
  distance: route.distance,
  duration: route.duration,
  description: route.description,
  status: route.status || (route.is_active ? 'active' : 'inactive'),
  is_active: route.is_active ?? route.status === 'active',
  created_at: route.created_at,
  updated_at: route.updated_at,

  // Island information
  from_island_name: route.from_island_name || route.origin,
  to_island_name: route.to_island_name || route.destination,
  origin: route.from_island_name || route.origin,
  destination: route.to_island_name || route.destination,

  // Statistics
  total_trips_30d: route.total_trips_30d || 0,
  total_bookings_30d: route.total_bookings_30d || 0,
  total_revenue_30d: route.total_revenue_30d || 0,
  average_occupancy_30d: route.average_occupancy_30d || 0,
  cancellation_rate_30d: route.cancellation_rate_30d || 0,
  popularity_score: route.popularity_score || 0,
  trips_today: route.trips_today,
  trips_7d: route.trips_7d,
  bookings_today: route.bookings_today,
  bookings_7d: route.bookings_7d,
  revenue_today: route.revenue_today,
  revenue_7d: route.revenue_7d,
  on_time_performance_30d: route.on_time_performance_30d,
  avg_delay_minutes_30d: route.avg_delay_minutes_30d,
});

const validateRouteFormData = (
  data: Partial<RouteFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Route name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Route name must be at least 2 characters';
  } else if (data.name.trim().length > 200) {
    errors.name = 'Route name must be less than 200 characters';
  }

  if (!data.from_island_id?.trim()) {
    errors.from_island_id = 'Origin island is required';
  }

  if (!data.to_island_id?.trim()) {
    errors.to_island_id = 'Destination island is required';
  }

  if (
    data.from_island_id &&
    data.to_island_id &&
    data.from_island_id === data.to_island_id
  ) {
    errors.route = 'Origin and destination cannot be the same island';
  }

  if (data.base_fare !== undefined) {
    if (data.base_fare < 0) {
      errors.base_fare = 'Base fare must be positive';
    } else if (data.base_fare > 10000) {
      errors.base_fare = 'Base fare seems too high';
    }
  }

  if (data.distance && data.distance.length > 50) {
    errors.distance = 'Distance must be less than 50 characters';
  }

  if (data.duration && data.duration.length > 50) {
    errors.duration = 'Duration must be less than 50 characters';
  }

  if (data.description && data.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useRouteStore = create<RouteStore>((set, get) => ({
  ...initialState,

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  fetchAll: async () => {
    set(state => ({
      loading: { ...state.loading, routes: true },
      error: null,
    }));

    try {
      // Use the same query structure as existing operationsService
      const { data: routes, error } = await supabase
        .from('routes_stats_view')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const processedRoutes = (routes || []).map(processRouteData);

      set(state => ({
        data: processedRoutes,
        loading: { ...state.loading, routes: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error fetching routes:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to fetch routes',
        loading: { ...state.loading, routes: false },
      }));
    }
  },

  fetchById: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, singleRoute: true },
      error: null,
    }));

    try {
      const { data: route, error } = await supabase
        .from('routes_stats_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set(state => ({
            currentItem: null,
            loading: { ...state.loading, singleRoute: false },
          }));
          return null;
        }
        throw error;
      }

      if (route) {
        const processedRoute = processRouteData(route);
        set(state => ({
          currentItem: processedRoute,
          loading: { ...state.loading, singleRoute: false },
        }));
        return processedRoute;
      }

      set(state => ({
        currentItem: null,
        loading: { ...state.loading, singleRoute: false },
      }));
      return null;
    } catch (error) {
      console.error('Error fetching route:', error);
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to fetch route',
        loading: { ...state.loading, singleRoute: false },
      }));
      return null;
    }
  },

  fetchRouteDetails: async (id: string) => {
    try {
      // Use route_detailed_stats_view for comprehensive details
      const { data: route, error } = await supabase
        .from('route_detailed_stats_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return route as RouteWithDetails;
    } catch (error) {
      console.error('Error fetching route details:', error);
      throw error;
    }
  },

  fetchRouteActivityLogs: async (routeId: string) => {
    try {
      const { data: logs, error } = await supabase
        .from('route_activity_logs')
        .select('*')
        .eq('route_id', routeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const activityLogs = (logs || []) as RouteActivityLog[];

      set(state => ({
        activityLogs,
      }));

      return activityLogs;
    } catch (error) {
      console.error('Error fetching route activity logs:', error);
      throw error;
    }
  },

  fetchRoutesByIsland: async (islandId: string) => {
    try {
      const { data: routes, error } = await supabase
        .from('routes_stats_view')
        .select('*')
        .or(`from_island_id.eq.${islandId},to_island_id.eq.${islandId}`)
        .order('name', { ascending: true });

      if (error) throw error;

      return (routes || []).map(processRouteData);
    } catch (error) {
      console.error('Error fetching routes by island:', error);
      throw error;
    }
  },

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  create: async (data: RouteFormData) => {
    set(state => ({
      loading: { ...state.loading, creating: true },
      error: null,
    }));

    try {
      const validation = get().validateRouteData(data);
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Check for existing route with same island combination
      const { data: existingRoute, error: checkError } = await supabase
        .from('routes')
        .select('id, name')
        .eq('from_island_id', data.from_island_id)
        .eq('to_island_id', data.to_island_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRoute) {
        throw new Error(
          `A route already exists between these islands. Route ID: ${existingRoute.id}`
        );
      }

      const { data: newRoute, error } = await supabase
        .from('routes')
        .insert([
          {
            name: data.name.trim(),
            from_island_id: data.from_island_id,
            to_island_id: data.to_island_id,
            base_fare: data.base_fare,
            distance: data.distance?.trim(),
            duration: data.duration?.trim(),
            description: data.description?.trim(),
            status: data.status,
            is_active: data.is_active,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      // Fetch from routes_stats_view to get statistics
      const { data: routeWithStats, error: statsError } = await supabase
        .from('routes_stats_view')
        .select('*')
        .eq('id', newRoute.id)
        .single();

      if (statsError) throw statsError;

      const processedRoute = processRouteData(routeWithStats);

      set(state => ({
        data: [processedRoute, ...state.data],
        loading: { ...state.loading, creating: false },
      }));

      get().calculateStats();
      return processedRoute;
    } catch (error) {
      console.error('Error creating route:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create route';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, creating: false },
      }));
      throw new Error(errorMessage);
    }
  },

  update: async (id: string, data: Partial<RouteFormData>) => {
    set(state => ({
      loading: { ...state.loading, updating: true },
      error: null,
    }));

    try {
      if (Object.keys(data).length > 0) {
        const validation = get().validateRouteData(data);
        if (!validation.isValid) {
          throw new Error(Object.values(validation.errors)[0]);
        }
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.from_island_id !== undefined)
        updateData.from_island_id = data.from_island_id;
      if (data.to_island_id !== undefined)
        updateData.to_island_id = data.to_island_id;
      if (data.base_fare !== undefined) updateData.base_fare = data.base_fare;
      if (data.distance !== undefined)
        updateData.distance = data.distance?.trim();
      if (data.duration !== undefined)
        updateData.duration = data.duration?.trim();
      if (data.description !== undefined)
        updateData.description = data.description?.trim();
      if (data.status !== undefined) updateData.status = data.status;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { data: updatedRoute, error } = await supabase
        .from('routes')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Fetch from routes_stats_view to get updated statistics
      const { data: routeWithStats, error: statsError } = await supabase
        .from('routes_stats_view')
        .select('*')
        .eq('id', id)
        .single();

      if (statsError) throw statsError;

      const processedRoute = processRouteData(routeWithStats);

      set(state => ({
        data: state.data.map(route =>
          route.id === id ? processedRoute : route
        ),
        currentItem:
          state.currentItem?.id === id ? processedRoute : state.currentItem,
        loading: { ...state.loading, updating: false },
      }));

      get().calculateStats();
      return processedRoute;
    } catch (error) {
      console.error('Error updating route:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update route';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, updating: false },
      }));
      throw new Error(errorMessage);
    }
  },

  delete: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, deleting: true },
      error: null,
    }));

    try {
      // Check if route has active trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id')
        .eq('route_id', id)
        .gt('travel_date', new Date().toISOString().split('T')[0])
        .limit(1);

      if (tripsError) throw tripsError;

      if (trips && trips.length > 0) {
        throw new Error(
          'Cannot delete route with scheduled trips. Please cancel or reschedule all future trips first.'
        );
      }

      const { error } = await supabase.from('routes').delete().eq('id', id);

      if (error) throw error;

      set(state => ({
        data: state.data.filter(route => route.id !== id),
        currentItem: state.currentItem?.id === id ? null : state.currentItem,
        loading: { ...state.loading, deleting: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error deleting route:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete route';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, deleting: false },
      }));
      throw new Error(errorMessage);
    }
  },

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  setCurrentItem: (item: Route | null) => {
    set({ currentItem: item });
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setFilters: (filters: Partial<RouteFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {}, searchQuery: '' });
  },

  setSortBy: (
    sortBy:
      | 'name'
      | 'base_fare'
      | 'created_at'
      | 'total_trips_30d'
      | 'total_revenue_30d'
      | 'average_occupancy_30d'
  ) => {
    set({ sortBy });
  },

  setSortOrder: (order: 'asc' | 'desc') => {
    set({ sortOrder: order });
  },

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  getFilteredRoutes: () => {
    const { data, searchQuery, filters } = get();
    let filtered = data;

    // Apply search
    if (searchQuery.trim()) {
      filtered = get().searchItems(filtered, searchQuery);
    }

    // Apply filters
    if (filters.status && filters.status !== undefined) {
      filtered = filtered.filter(route => route.status === filters.status);
    }

    if (filters.is_active !== undefined) {
      filtered = filtered.filter(
        route => route.is_active === filters.is_active
      );
    }

    if (filters.from_island_id) {
      filtered = filtered.filter(
        route => route.from_island_id === filters.from_island_id
      );
    }

    if (filters.to_island_id) {
      filtered = filtered.filter(
        route => route.to_island_id === filters.to_island_id
      );
    }

    if (filters.min_fare !== undefined) {
      filtered = filtered.filter(route => route.base_fare >= filters.min_fare!);
    }

    if (filters.max_fare !== undefined) {
      filtered = filtered.filter(route => route.base_fare <= filters.max_fare!);
    }

    if (filters.has_trips !== undefined) {
      const hasTrips = filters.has_trips;
      filtered = filtered.filter(route =>
        hasTrips ? route.total_trips_30d > 0 : route.total_trips_30d === 0
      );
    }

    return filtered;
  },

  getSortedRoutes: (items: Route[]) => {
    const { sortBy, sortOrder } = get();
    return get().sortItems(items, sortBy, sortOrder);
  },

  // ========================================================================
  // SEARCH AND FILTER ACTIONS
  // ========================================================================

  searchItems: (items: Route[], query: string) => {
    if (!query.trim()) return items;

    const searchTerm = query.toLowerCase().trim();
    return items.filter(
      route =>
        route.name.toLowerCase().includes(searchTerm) ||
        (route.from_island_name &&
          route.from_island_name.toLowerCase().includes(searchTerm)) ||
        (route.to_island_name &&
          route.to_island_name.toLowerCase().includes(searchTerm)) ||
        (route.description &&
          route.description.toLowerCase().includes(searchTerm))
    );
  },

  filterItems: (items: Route[], filters: RouteFilters) => {
    let filtered = items;

    if (filters.status && filters.status !== undefined) {
      filtered = filtered.filter(route => route.status === filters.status);
    }

    if (filters.is_active !== undefined) {
      filtered = filtered.filter(
        route => route.is_active === filters.is_active
      );
    }

    if (filters.from_island_id) {
      filtered = filtered.filter(
        route => route.from_island_id === filters.from_island_id
      );
    }

    if (filters.to_island_id) {
      filtered = filtered.filter(
        route => route.to_island_id === filters.to_island_id
      );
    }

    if (filters.min_fare !== undefined) {
      filtered = filtered.filter(route => route.base_fare >= filters.min_fare!);
    }

    if (filters.max_fare !== undefined) {
      filtered = filtered.filter(route => route.base_fare <= filters.max_fare!);
    }

    return filtered;
  },

  sortItems: (items: Route[], sortBy: string, order: 'asc' | 'desc') => {
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'base_fare':
          aValue = a.base_fare;
          bValue = b.base_fare;
          break;
        case 'total_trips_30d':
          aValue = a.total_trips_30d;
          bValue = b.total_trips_30d;
          break;
        case 'total_revenue_30d':
          aValue = a.total_revenue_30d;
          bValue = b.total_revenue_30d;
          break;
        case 'average_occupancy_30d':
          aValue = a.average_occupancy_30d;
          bValue = b.average_occupancy_30d;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // ========================================================================
  // STATISTICS
  // ========================================================================

  calculateStats: () => {
    const { data } = get();

    const stats: RouteStats = {
      total: data.length,
      active: data.filter(route => route.status === 'active' || route.is_active)
        .length,
      inactive: data.filter(
        route => route.status === 'inactive' || !route.is_active
      ).length,
      totalTrips30d: 0,
      totalBookings30d: 0,
      totalRevenue30d: 0,
      avgOccupancy: 0,
      avgFare: 0,
      onTimePerformance: 0,
      cancellationRate: 0,
      popularityScore: 0,
    };

    // Calculate aggregations
    let totalOccupancy = 0;
    let routesWithOccupancy = 0;
    let totalOnTime = 0;
    let routesWithOnTime = 0;
    let totalCancellation = 0;
    let routesWithCancellation = 0;
    let totalPopularity = 0;
    let routesWithPopularity = 0;

    data.forEach(route => {
      stats.totalTrips30d += route.total_trips_30d;
      stats.totalBookings30d += route.total_bookings_30d;
      stats.totalRevenue30d += route.total_revenue_30d;

      if (route.average_occupancy_30d > 0) {
        totalOccupancy += route.average_occupancy_30d;
        routesWithOccupancy++;
      }

      if (
        route.on_time_performance_30d !== undefined &&
        route.on_time_performance_30d > 0
      ) {
        totalOnTime += route.on_time_performance_30d;
        routesWithOnTime++;
      }

      if (route.cancellation_rate_30d > 0) {
        totalCancellation += route.cancellation_rate_30d;
        routesWithCancellation++;
      }

      if (route.popularity_score > 0) {
        totalPopularity += route.popularity_score;
        routesWithPopularity++;
      }
    });

    // Calculate averages
    stats.avgFare =
      data.length > 0
        ? data.reduce((sum, route) => sum + route.base_fare, 0) / data.length
        : 0;
    stats.avgOccupancy =
      routesWithOccupancy > 0 ? totalOccupancy / routesWithOccupancy : 0;
    stats.onTimePerformance =
      routesWithOnTime > 0 ? totalOnTime / routesWithOnTime : 0;
    stats.cancellationRate =
      routesWithCancellation > 0
        ? totalCancellation / routesWithCancellation
        : 0;
    stats.popularityScore =
      routesWithPopularity > 0 ? totalPopularity / routesWithPopularity : 0;

    // Find top performers
    if (data.length > 0) {
      const topRevenue = data.reduce((max, route) =>
        route.total_revenue_30d > max.total_revenue_30d ? route : max
      );
      stats.topRouteByRevenue = {
        route: topRevenue.name,
        revenue: topRevenue.total_revenue_30d,
      };

      const topTrips = data.reduce((max, route) =>
        route.total_trips_30d > max.total_trips_30d ? route : max
      );
      stats.topRouteByTrips = {
        route: topTrips.name,
        trips: topTrips.total_trips_30d,
      };

      const topOccupancy = data.reduce((max, route) =>
        route.average_occupancy_30d > max.average_occupancy_30d ? route : max
      );
      stats.topRouteByOccupancy = {
        route: topOccupancy.name,
        occupancy: topOccupancy.average_occupancy_30d,
      };
    }

    set({ stats });
  },

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  getRouteById: (id: string) => {
    return get().data.find(route => route.id === id);
  },

  getRoutesByIsland: (islandId: string) => {
    return get().data.filter(
      route =>
        route.from_island_id === islandId || route.to_island_id === islandId
    );
  },

  validateRouteData: (data: Partial<RouteFormData>) => {
    return validateRouteFormData(data);
  },

  addActivityLog: (log: Omit<RouteActivityLog, 'id' | 'created_at'>) => {
    const newLog: RouteActivityLog = {
      ...log,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    set(state => ({
      activityLogs: [newLog, ...state.activityLogs].slice(0, 50), // Keep last 50 logs
    }));
  },

  refreshAll: async () => {
    await get().fetchAll();
  },

  resetStore: () => {
    set(initialState);
  },
}));

// Export the store for use in components and hooks
export type RouteStoreType = typeof useRouteStore;
export default useRouteStore;
