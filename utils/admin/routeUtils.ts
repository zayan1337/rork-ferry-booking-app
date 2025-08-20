import { AdminManagement } from '@/types';

type Route = AdminManagement.Route;
type RouteFormData = AdminManagement.RouteFormData;
type RouteStats = AdminManagement.RouteStats;
type RouteFilters = AdminManagement.RouteFilters;
type ValidationResult = AdminManagement.ValidationResult;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateRouteForm = (
  data: Partial<RouteFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  // Name validation
  if (data.name !== undefined) {
    if (!data.name?.trim()) {
      errors.name = 'Route name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Route name must be at least 2 characters';
    } else if (data.name.trim().length > 200) {
      errors.name = 'Route name must be less than 200 characters';
    }
  }

  // Island validation
  if (data.from_island_id === undefined || !data.from_island_id?.trim()) {
    errors.from_island_id = 'Origin island is required';
  }

  if (data.to_island_id === undefined || !data.to_island_id?.trim()) {
    errors.to_island_id = 'Destination island is required';
  }

  if (
    data.from_island_id &&
    data.to_island_id &&
    data.from_island_id === data.to_island_id
  ) {
    errors.route = 'Origin and destination cannot be the same island';
  }

  // Fare validation
  if (data.base_fare !== undefined) {
    if (data.base_fare < 0) {
      errors.base_fare = 'Base fare must be positive';
    } else if (data.base_fare > 10000) {
      errors.base_fare = 'Base fare seems too high (maximum 10,000 MVR)';
    }
  }

  // Optional fields validation
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
// SEARCH AND FILTER FUNCTIONS
// ============================================================================

export const searchRoutes = (routes: Route[], query: string): Route[] => {
  if (!query.trim()) return routes;

  const searchTerm = query.toLowerCase().trim();
  return routes.filter(
    route =>
      route.name.toLowerCase().includes(searchTerm) ||
      (route.from_island_name &&
        route.from_island_name.toLowerCase().includes(searchTerm)) ||
      (route.to_island_name &&
        route.to_island_name.toLowerCase().includes(searchTerm)) ||
      (route.origin && route.origin.toLowerCase().includes(searchTerm)) ||
      (route.destination &&
        route.destination.toLowerCase().includes(searchTerm)) ||
      (route.description &&
        route.description.toLowerCase().includes(searchTerm))
  );
};

export const filterRoutes = (
  routes: Route[],
  filters: RouteFilters
): Route[] => {
  return routes.filter(route => {
    // Status filter
    if (filters.status && route.status !== filters.status) {
      return false;
    }

    // Active status filter
    if (
      filters.is_active !== undefined &&
      route.is_active !== filters.is_active
    ) {
      return false;
    }

    // Island filters
    if (
      filters.from_island_id &&
      route.from_island_id !== filters.from_island_id
    ) {
      return false;
    }

    if (filters.to_island_id && route.to_island_id !== filters.to_island_id) {
      return false;
    }

    // Fare filters
    if (filters.min_fare !== undefined && route.base_fare < filters.min_fare) {
      return false;
    }

    if (filters.max_fare !== undefined && route.base_fare > filters.max_fare) {
      return false;
    }

    // Trip availability filter
    if (filters.has_trips !== undefined) {
      const hasTrips = route.total_trips_30d > 0;
      if (hasTrips !== filters.has_trips) {
        return false;
      }
    }

    // Performance rating filter
    if (filters.performance_rating !== undefined) {
      const onTimePerf = route.on_time_performance_30d || 0;
      let rating: string;

      if (onTimePerf >= 95) rating = 'excellent';
      else if (onTimePerf >= 85) rating = 'good';
      else if (onTimePerf >= 70) rating = 'fair';
      else rating = 'poor';

      if (rating !== filters.performance_rating) {
        return false;
      }
    }

    // Date filters
    if (
      filters.created_after &&
      new Date(route.created_at) < new Date(filters.created_after)
    ) {
      return false;
    }

    if (
      filters.created_before &&
      new Date(route.created_at) > new Date(filters.created_before)
    ) {
      return false;
    }

    return true;
  });
};

export const filterRoutesByStatus = (
  routes: Route[],
  status: string | null
): Route[] => {
  if (!status || status === 'all') return routes;
  return routes.filter(route => route.status === status);
};

export const filterRoutesByIsland = (
  routes: Route[],
  islandId: string | null
): Route[] => {
  if (!islandId) return routes;
  return routes.filter(
    route =>
      route.from_island_id === islandId || route.to_island_id === islandId
  );
};

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

export const sortRoutes = (
  routes: Route[],
  sortBy:
    | 'name'
    | 'base_fare'
    | 'created_at'
    | 'total_trips_30d'
    | 'total_revenue_30d'
    | 'average_occupancy_30d',
  sortOrder: 'asc' | 'desc'
): Route[] => {
  return [...routes].sort((a, b) => {
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

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

export const calculateRouteStats = (routes: Route[]): RouteStats => {
  const total = routes.length;
  const active = routes.filter(
    route => route.status === 'active' || route.is_active
  ).length;
  const inactive = total - active;

  let totalTrips30d = 0;
  let totalBookings30d = 0;
  let totalRevenue30d = 0;
  let totalOccupancy = 0;
  let routesWithOccupancy = 0;
  let totalOnTime = 0;
  let routesWithOnTime = 0;
  let totalCancellation = 0;
  let routesWithCancellation = 0;
  let totalPopularity = 0;
  let routesWithPopularity = 0;

  // Calculate aggregations
  routes.forEach(route => {
    totalTrips30d += route.total_trips_30d;
    totalBookings30d += route.total_bookings_30d;
    totalRevenue30d += route.total_revenue_30d;

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
  const avgFare =
    total > 0
      ? routes.reduce((sum, route) => sum + route.base_fare, 0) / total
      : 0;
  const avgOccupancy =
    routesWithOccupancy > 0 ? totalOccupancy / routesWithOccupancy : 0;
  const onTimePerformance =
    routesWithOnTime > 0 ? totalOnTime / routesWithOnTime : 0;
  const cancellationRate =
    routesWithCancellation > 0 ? totalCancellation / routesWithCancellation : 0;
  const popularityScore =
    routesWithPopularity > 0 ? totalPopularity / routesWithPopularity : 0;

  // Find top performers
  let topRouteByRevenue: { route: string; revenue: number } | undefined;
  let topRouteByTrips: { route: string; trips: number } | undefined;
  let topRouteByOccupancy: { route: string; occupancy: number } | undefined;

  if (total > 0) {
    const topRevenue = routes.reduce((max, route) =>
      route.total_revenue_30d > max.total_revenue_30d ? route : max
    );
    topRouteByRevenue = {
      route: topRevenue.name,
      revenue: topRevenue.total_revenue_30d,
    };

    const topTrips = routes.reduce((max, route) =>
      route.total_trips_30d > max.total_trips_30d ? route : max
    );
    topRouteByTrips = { route: topTrips.name, trips: topTrips.total_trips_30d };

    const topOccupancy = routes.reduce((max, route) =>
      route.average_occupancy_30d > max.average_occupancy_30d ? route : max
    );
    topRouteByOccupancy = {
      route: topOccupancy.name,
      occupancy: topOccupancy.average_occupancy_30d,
    };
  }

  return {
    total,
    active,
    inactive,
    totalTrips30d,
    totalBookings30d,
    totalRevenue30d,
    avgOccupancy,
    avgFare,
    onTimePerformance,
    cancellationRate,
    popularityScore,
    topRouteByRevenue,
    topRouteByTrips,
    topRouteByOccupancy,
  };
};

export const getRoutePerformanceRating = (
  route: Route
): 'excellent' | 'good' | 'fair' | 'poor' => {
  const onTimePerf = route.on_time_performance_30d || 0;

  if (onTimePerf >= 95) return 'excellent';
  if (onTimePerf >= 85) return 'good';
  if (onTimePerf >= 70) return 'fair';
  return 'poor';
};

export const getRoutePerformanceColor = (rating: string): string => {
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
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getRoutesByIsland = (
  routes: Route[],
  islandId: string
): Route[] => {
  return routes.filter(
    route =>
      route.from_island_id === islandId || route.to_island_id === islandId
  );
};

export const formatRouteName = (route: Route): string => {
  const from = route.from_island_name || route.origin || 'Unknown';
  const to = route.to_island_name || route.destination || 'Unknown';
  return route.name || `${from} → ${to}`;
};

export const formatRouteDirection = (route: Route): string => {
  const from = route.from_island_name || route.origin || 'Unknown';
  const to = route.to_island_name || route.destination || 'Unknown';
  return `${from} → ${to}`;
};

export const formatCurrency = (amount: number): string => {
  return `MVR ${amount.toLocaleString()}`;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDistance = (distance?: string): string => {
  if (!distance) return 'N/A';
  return distance.includes('km') ? distance : `${distance} km`;
};

export const formatDuration = (duration?: string): string => {
  if (!duration) return 'N/A';
  return duration.includes('min') || duration.includes('hour')
    ? duration
    : `${duration} min`;
};

// ============================================================================
// FORM HELPERS
// ============================================================================

export const createEmptyRouteForm = (): RouteFormData => ({
  name: '',
  from_island_id: '',
  to_island_id: '',
  base_fare: 0,
  distance: '',
  duration: '',
  description: '',
  status: 'active',
  is_active: true,
});

export const routeToFormData = (route: Route): RouteFormData => ({
  name: route.name,
  from_island_id: route.from_island_id,
  to_island_id: route.to_island_id,
  base_fare: route.base_fare,
  distance: route.distance || '',
  duration: route.duration || '',
  description: route.description || '',
  status: route.status,
  is_active: route.is_active,
});

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

export const compareRoutes = (a: Route, b: Route): boolean => {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.from_island_id === b.from_island_id &&
    a.to_island_id === b.to_island_id &&
    a.base_fare === b.base_fare &&
    a.distance === b.distance &&
    a.duration === b.duration &&
    a.description === b.description &&
    a.status === b.status &&
    a.is_active === b.is_active
  );
};

export const getRouteChanges = (
  original: Route,
  updated: Partial<RouteFormData>
): Partial<RouteFormData> => {
  const changes: Partial<RouteFormData> = {};

  if (updated.name !== undefined && updated.name !== original.name) {
    changes.name = updated.name;
  }

  if (
    updated.from_island_id !== undefined &&
    updated.from_island_id !== original.from_island_id
  ) {
    changes.from_island_id = updated.from_island_id;
  }

  if (
    updated.to_island_id !== undefined &&
    updated.to_island_id !== original.to_island_id
  ) {
    changes.to_island_id = updated.to_island_id;
  }

  if (
    updated.base_fare !== undefined &&
    updated.base_fare !== original.base_fare
  ) {
    changes.base_fare = updated.base_fare;
  }

  if (
    updated.distance !== undefined &&
    updated.distance !== original.distance
  ) {
    changes.distance = updated.distance;
  }

  if (
    updated.duration !== undefined &&
    updated.duration !== original.duration
  ) {
    changes.duration = updated.duration;
  }

  if (
    updated.description !== undefined &&
    updated.description !== original.description
  ) {
    changes.description = updated.description;
  }

  if (updated.status !== undefined && updated.status !== original.status) {
    changes.status = updated.status;
  }

  if (
    updated.is_active !== undefined &&
    updated.is_active !== original.is_active
  ) {
    changes.is_active = updated.is_active;
  }

  return changes;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const isRouteNameUnique = (
  name: string,
  routes: Route[],
  currentRouteId?: string
): boolean => {
  const trimmedName = name.trim().toLowerCase();
  return !routes.some(
    route =>
      route.name.toLowerCase() === trimmedName && route.id !== currentRouteId
  );
};

export const isDuplicateRoute = (
  fromIslandId: string,
  toIslandId: string,
  routes: Route[],
  currentRouteId?: string
): boolean => {
  return routes.some(
    route =>
      route.from_island_id === fromIslandId &&
      route.to_island_id === toIslandId &&
      route.id !== currentRouteId
  );
};

export const getActiveRoutesForIsland = (
  routes: Route[],
  islandId: string
): Route[] => {
  return routes.filter(
    route =>
      (route.from_island_id === islandId || route.to_island_id === islandId) &&
      (route.status === 'active' || route.is_active)
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export const exportRouteData = (routes: Route[]) => {
  return routes.map(route => ({
    name: route.name,
    from: route.from_island_name || route.origin || 'Unknown',
    to: route.to_island_name || route.destination || 'Unknown',
    fare: formatCurrency(route.base_fare),
    distance: formatDistance(route.distance),
    duration: formatDuration(route.duration),
    status: route.status,
    trips_30d: route.total_trips_30d,
    revenue_30d: formatCurrency(route.total_revenue_30d),
    occupancy: formatPercentage(route.average_occupancy_30d),
    created: new Date(route.created_at).toLocaleDateString(),
    id: route.id,
  }));
};

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

export const getRouteRevenueGrowth = (routes: Route[]): number => {
  // This would need historical data - placeholder implementation
  return 0;
};

export const getRoutePopularityTrend = (
  routes: Route[]
): 'up' | 'down' | 'stable' => {
  // This would need trend analysis - placeholder implementation
  return 'stable';
};

export const getRouteCapacityUtilization = (routes: Route[]): number => {
  const totalRoutes = routes.length;
  const routesWithGoodOccupancy = routes.filter(
    route => route.average_occupancy_30d >= 70
  ).length;

  return totalRoutes > 0 ? (routesWithGoodOccupancy / totalRoutes) * 100 : 0;
};
