import { useCallback, useMemo } from 'react';
import { useVesselStore } from '@/store/admin/vesselStore';
import { AdminManagement } from '@/types';

type Vessel = AdminManagement.Vessel;
type VesselFormData = AdminManagement.VesselFormData;
type VesselStats = AdminManagement.VesselStats;
type VesselFilters = AdminManagement.VesselFilters;
type VesselWithDetails = AdminManagement.VesselWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type BaseManagementHook<T, F, S> = AdminManagement.BaseManagementHook<T, F, S>;

// ============================================================================
// VESSEL MANAGEMENT HOOK INTERFACE
// ============================================================================

export interface UseVesselManagementReturn
  extends BaseManagementHook<Vessel, VesselFormData, VesselStats> {
  // Vessel-specific data
  vessels: Vessel[];
  currentVessel: Vessel | null;

  // Computed data with current filters and sort
  filteredVessels: Vessel[];
  sortedVessels: Vessel[];
  vesselsByStatus: Record<string, Vessel[]>;

  // Vessel-specific actions
  loadVesselsByStatus: (status: string) => Promise<Vessel[]>;
  getVesselsByStatus: (status: string) => Vessel[];

  // Enhanced getters
  getVesselWithDetails: (id: string) => Promise<VesselWithDetails | null>;

  // Filter and sort state
  sortBy:
    | 'name'
    | 'seating_capacity'
    | 'created_at'
    | 'total_trips_30d'
    | 'total_revenue_30d'
    | 'capacity_utilization_30d';
  sortOrder: 'asc' | 'desc';
  setSortBy: (
    sortBy:
      | 'name'
      | 'seating_capacity'
      | 'created_at'
      | 'total_trips_30d'
      | 'total_revenue_30d'
      | 'capacity_utilization_30d'
  ) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Search and filter management
  searchQuery: string;
  filters: VesselFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<VesselFilters>) => void;
  clearFilters: () => void;

  // Performance helpers
  getUtilizationRating: (
    vessel: Vessel
  ) => 'excellent' | 'good' | 'fair' | 'poor';
  getUtilizationColor: (rating: string) => string;
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;

  // Override getById to be async
  fetchById: (id: string) => Promise<Vessel | null>;
}

// ============================================================================
// VESSEL MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useVesselManagement = (
  // Optional parameters for pre-filtering
  initialSearchQuery: string = '',
  initialFilters: VesselFilters = {},
  initialSortBy:
    | 'name'
    | 'seating_capacity'
    | 'created_at'
    | 'total_trips_30d'
    | 'total_revenue_30d'
    | 'capacity_utilization_30d' = 'name',
  initialSortOrder: 'asc' | 'desc' = 'asc'
): UseVesselManagementReturn => {
  const vesselStore = useVesselStore();

  // Destructure the store state and actions
  const {
    data: vessels,
    currentItem: currentVessel,
    loading,
    error,
    stats,
    filteredVessels: storeFilteredVessels,
    sortedVessels: storeSortedVessels,
    vesselsByStatus: storeVesselsByStatus,
    sortBy,
    sortOrder,
    searchQuery,
    filters,
    // Actions
    fetchAll,
    fetchById,
    create,
    update,
    delete: deleteVessel,
    fetchVesselDetails,
    fetchVesselsByStatus,
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    getVesselById,
    getVesselsByStatus,
    validateVesselData,
    refreshAll,
    searchItems,
    filterItems,
    sortItems,
  } = vesselStore;

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  // Apply current search and filters
  const filteredVessels = useMemo(() => {
    let filtered = vessels || [];

    // Apply search
    if (searchQuery.trim()) {
      filtered = searchItems(filtered, searchQuery);
    }

    // Apply filters
    filtered = filterItems(filtered, filters);

    return filtered || [];
  }, [vessels, searchQuery, filters, searchItems, filterItems]);

  // Apply current sort
  const sortedVessels = useMemo(() => {
    return sortItems(filteredVessels || [], sortBy, sortOrder);
  }, [filteredVessels, sortBy, sortOrder, sortItems]);

  // Group vessels by status
  const vesselsByStatus = useMemo(() => {
    const grouped: Record<string, Vessel[]> = {};

    if (vessels && Array.isArray(vessels)) {
      vessels.forEach((vessel: Vessel) => {
        if (vessel) {
          const status = vessel.status || 'active';
          if (!grouped[status]) {
            grouped[status] = [];
          }
          grouped[status].push(vessel);
        }
      });
    }

    return grouped;
  }, [vessels]);

  // ========================================================================
  // ACTIONS
  // ========================================================================

  const loadAll = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  const getById = useCallback(
    (id: string) => {
      return getVesselById(id);
    },
    [getVesselById]
  );

  const createVessel = useCallback(
    async (data: VesselFormData) => {
      try {
        await create(data);
      } catch (error) {
        throw error;
      }
    },
    [create]
  );

  const updateVessel = useCallback(
    async (id: string, data: Partial<VesselFormData>) => {
      try {
        await update(id, data);
      } catch (error) {
        throw error;
      }
    },
    [update]
  );

  const removeVessel = useCallback(
    async (id: string) => {
      try {
        await deleteVessel(id);
      } catch (error) {
        throw error;
      }
    },
    [deleteVessel]
  );

  const refresh = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const loadVesselsByStatus = useCallback(
    async (status: string) => {
      return await fetchVesselsByStatus(status);
    },
    [fetchVesselsByStatus]
  );

  const getVesselWithDetails = useCallback(
    async (id: string) => {
      return await fetchVesselDetails(id);
    },
    [fetchVesselDetails]
  );

  const validateData = useCallback(
    (data: Partial<VesselFormData>) => {
      return validateVesselData(data);
    },
    [validateVesselData]
  );

  // ========================================================================
  // PERFORMANCE HELPERS
  // ========================================================================

  const getUtilizationRating = useCallback(
    (vessel: Vessel): 'excellent' | 'good' | 'fair' | 'poor' => {
      const utilization = vessel.capacity_utilization_30d || 0;

      if (utilization >= 80) return 'excellent';
      if (utilization >= 60) return 'good';
      if (utilization >= 40) return 'fair';
      return 'poor';
    },
    []
  );

  const getUtilizationColor = useCallback((rating: string): string => {
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
    items: vessels,
    currentItem: currentVessel,
    loading,
    error,
    stats,

    // Computed data
    filteredItems: storeFilteredVessels,
    sortedItems: storeSortedVessels,
    vesselsByStatus: storeVesselsByStatus,
    filteredVessels: storeFilteredVessels,
    sortedVessels: storeSortedVessels,

    // Actions
    loadAll: fetchAll,
    fetchById,
    getById: (id: string) => getVesselById(id),
    create: async (data: VesselFormData) => {
      await create(data);
    },
    update: async (id: string, data: Partial<VesselFormData>) => {
      await update(id, data);
    },
    remove: async (id: string) => {
      await deleteVessel(id);
    },
    refresh: refreshAll,

    // Search and filter
    setSearchQuery,
    setFilters,
    clearFilters,

    // Validation
    validateData: validateVesselData,

    // Vessel-specific data
    vessels,
    currentVessel,

    // Vessel-specific actions
    loadVesselsByStatus: fetchVesselsByStatus,
    getVesselsByStatus,

    // Enhanced getters
    getVesselWithDetails: fetchVesselDetails,

    // Filter and sort state
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,

    // Search and filter management
    searchQuery,
    filters,

    // Performance helpers
    getUtilizationRating: (vessel: Vessel) => {
      const utilization = vessel.capacity_utilization_30d || 0;
      if (utilization >= 80) return 'excellent';
      if (utilization >= 60) return 'good';
      if (utilization >= 40) return 'fair';
      return 'poor';
    },
    getUtilizationColor: (rating: string) => {
      switch (rating) {
        case 'excellent':
          return '#10b981';
        case 'good':
          return '#3b82f6';
        case 'fair':
          return '#f59e0b';
        case 'poor':
          return '#ef4444';
        default:
          return '#6b7280';
      }
    },
    formatCurrency: (amount: number) => `MVR ${amount.toFixed(2)}`,
    formatPercentage: (value: number) => `${(value * 100).toFixed(1)}%`,
  };
};

// Export for use in components
export default useVesselManagement;
