import { useCallback, useMemo } from 'react';
import { useIslandStore } from '@/store/admin/islandStore';
import { useZoneStore } from '@/store/admin/zoneStore';
import { AdminManagement } from '@/types';

type Island = AdminManagement.Island;
type IslandFormData = AdminManagement.IslandFormData;
type IslandStats = AdminManagement.IslandStats;
type IslandFilters = AdminManagement.IslandFilters;
type IslandWithDetails = AdminManagement.IslandWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type BaseManagementHook<T, F, S> = AdminManagement.BaseManagementHook<T, F, S>;

// ============================================================================
// ISLAND MANAGEMENT HOOK INTERFACE
// ============================================================================

export interface UseIslandManagementReturn
  extends BaseManagementHook<Island, IslandFormData, IslandStats> {
  // Island-specific data
  islands: Island[];
  currentIsland: Island | null;

  // Computed data with current filters and sort
  filteredIslands: Island[];
  sortedIslands: Island[];
  islandsByZone: Record<string, Island[]>;

  // Zone data for island management
  zones: any[]; // Zone type from zone store
  loadZones: () => Promise<void>;

  // Island-specific actions
  loadIslandsByZone: (zoneId: string) => Promise<Island[]>;
  getIslandsByZone: (zoneId: string) => Island[];

  // Enhanced getters
  getIslandWithDetails: (id: string) => IslandWithDetails | undefined;

  // Filter and sort state
  sortBy: 'name' | 'zone' | 'created_at' | 'zone_name';
  sortOrder: 'asc' | 'desc';
  setSortBy: (sortBy: 'name' | 'zone' | 'created_at' | 'zone_name') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Search and filter management
  searchQuery: string;
  filters: IslandFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<IslandFilters>) => void;
  clearFilters: () => void;
}

// ============================================================================
// ISLAND MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useIslandManagement = (
  // Optional parameters for pre-filtering
  initialSearchQuery: string = '',
  initialFilters: IslandFilters = {},
  initialSortBy: 'name' | 'zone' | 'created_at' | 'zone_name' = 'name',
  initialSortOrder: 'asc' | 'desc' = 'asc'
): UseIslandManagementReturn => {
  // ========================================================================
  // STORE ACCESS
  // ========================================================================

  const islandStore = useIslandStore();
  const zoneStore = useZoneStore();

  const {
    data: islands,
    currentItem: currentIsland,
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
    delete: deleteIsland,
    fetchIslandsByZone,
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    getIslandById,
    getIslandsByZone,
    validateIslandData,
    refreshAll,
    searchItems,
    filterItems,
    sortItems,
  } = islandStore;

  const { data: zones, fetchAll: fetchZones } = zoneStore;

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  // Set initial filters and sort if provided
  useMemo(() => {
    if (initialSearchQuery && searchQuery !== initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
    if (sortBy !== initialSortBy) {
      setSortBy(initialSortBy);
    }
    if (sortOrder !== initialSortOrder) {
      setSortOrder(initialSortOrder);
    }
  }, []);

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  const filteredIslands = useMemo(() => {
    let result = islands;

    // Apply search
    if (searchQuery.trim()) {
      result = searchItems(result, searchQuery);
    }

    // Apply filters
    result = filterItems(result, filters);

    return result;
  }, [islands, searchQuery, filters, searchItems, filterItems]);

  const sortedIslands = useMemo(() => {
    return sortItems(filteredIslands, sortBy, sortOrder);
  }, [filteredIslands, sortBy, sortOrder, sortItems]);

  const islandsByZone = useMemo(() => {
    const grouped: Record<string, Island[]> = {};

    islands.forEach(island => {
      const zoneKey = island.zone_info?.name || island.zone || 'Unassigned';
      if (!grouped[zoneKey]) {
        grouped[zoneKey] = [];
      }
      grouped[zoneKey].push(island);
    });

    return grouped;
  }, [islands]);

  // ========================================================================
  // ENHANCED DATA ACCESS
  // ========================================================================

  const getIslandWithDetails = useCallback(
    (id: string): IslandWithDetails | undefined => {
      const island = getIslandById(id);
      if (!island) return undefined;

      return {
        ...island,
        zone_info: island.zone_info || {
          id: '',
          name: island.zone,
          code: '',
          description: '',
          is_active: true,
        },
        route_count: island.total_routes || 0,
      } as IslandWithDetails;
    },
    [getIslandById]
  );

  // ========================================================================
  // DATA LOADING ACTIONS
  // ========================================================================

  const loadAll = useCallback(async () => {
    try {
      await fetchAll();
    } catch (error) {
      console.error('Error loading islands:', error);
      throw error;
    }
  }, [fetchAll]);

  const getById = useCallback(
    (id: string) => {
      return getIslandById(id);
    },
    [getIslandById]
  );

  const loadIslandsByZone = useCallback(
    async (zoneId: string) => {
      try {
        return await fetchIslandsByZone(zoneId);
      } catch (error) {
        console.error('Error loading islands by zone:', error);
        throw error;
      }
    },
    [fetchIslandsByZone]
  );

  const loadZones = useCallback(async () => {
    try {
      await fetchZones();
    } catch (error) {
      console.error('Error loading zones:', error);
      throw error;
    }
  }, [fetchZones]);

  // ========================================================================
  // CRUD ACTIONS
  // ========================================================================

  const createIsland = useCallback(
    async (data: IslandFormData) => {
      try {
        const validation = validateIslandData(data);
        if (!validation.isValid) {
          throw new Error(Object.values(validation.errors)[0]);
        }

        const enhancedData = {
          ...data,
          name: data.name.trim(),
          zone: data.zone?.trim() || data.name, // Backward compatibility
        };

        await create(enhancedData);
      } catch (error) {
        console.error('Error creating island:', error);
        throw error;
      }
    },
    [create, validateIslandData]
  );

  const updateIsland = useCallback(
    async (id: string, data: Partial<IslandFormData>) => {
      try {
        if (data.name !== undefined) {
          const validation = validateIslandData({ ...data, name: data.name });
          if (!validation.isValid) {
            throw new Error(Object.values(validation.errors)[0]);
          }
        }

        // Clean string fields
        const cleanedData = { ...data };
        if (cleanedData.name) cleanedData.name = cleanedData.name.trim();
        if (cleanedData.zone) cleanedData.zone = cleanedData.zone.trim();

        await update(id, cleanedData);
      } catch (error) {
        console.error('Error updating island:', error);
        throw error;
      }
    },
    [update, validateIslandData]
  );

  const removeIsland = useCallback(
    async (id: string) => {
      try {
        await deleteIsland(id);
      } catch (error) {
        console.error('Error deleting island:', error);
        throw error;
      }
    },
    [deleteIsland]
  );

  const refresh = useCallback(async () => {
    try {
      await refreshAll();
    } catch (error) {
      console.error('Error refreshing islands:', error);
      throw error;
    }
  }, [refreshAll]);

  // ========================================================================
  // VALIDATION
  // ========================================================================

  const validateData = useCallback(
    (data: Partial<IslandFormData>) => {
      return validateIslandData(data);
    },
    [validateIslandData]
  );

  // ========================================================================
  // FILTER AND SEARCH HELPERS
  // ========================================================================

  const handleSetFilters = useCallback(
    (newFilters: Partial<IslandFilters>) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleSetSearchQuery = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  // ========================================================================
  // RETURN HOOK INTERFACE
  // ========================================================================

  return {
    // Data
    items: islands,
    islands,
    currentItem: currentIsland,
    currentIsland,
    loading,
    error,
    stats,

    // Computed data
    filteredItems: filteredIslands,
    filteredIslands,
    sortedItems: sortedIslands,
    sortedIslands,
    islandsByZone,

    // Zone data
    zones,
    loadZones,

    // Actions
    loadAll,
    getById,
    create: createIsland,
    update: updateIsland,
    remove: removeIsland,
    refresh,

    // Island-specific actions
    loadIslandsByZone,
    getIslandsByZone,
    getIslandWithDetails,

    // Sort and filter state
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,

    // Search and filter
    searchQuery,
    filters,
    setSearchQuery: handleSetSearchQuery,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,

    // Validation
    validateData,
  };
};

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for island management with zone filtering
 */
export const useIslandsByZone = (zoneId: string) => {
  const {
    islands,
    loading,
    error,
    loadIslandsByZone,
    getIslandsByZone,
    refresh,
  } = useIslandManagement();

  const islandsInZone = useMemo(() => {
    return getIslandsByZone(zoneId);
  }, [getIslandsByZone, zoneId, islands]);

  const loadIslands = useCallback(async () => {
    try {
      await loadIslandsByZone(zoneId);
    } catch (error) {
      console.error('Error loading islands for zone:', error);
      throw error;
    }
  }, [loadIslandsByZone, zoneId]);

  return {
    islands: islandsInZone,
    loading: loading.islands,
    error,
    loadIslands,
    refresh,
  };
};

/**
 * Hook for island statistics
 */
export const useIslandStats = () => {
  const { stats, refresh } = useIslandManagement();

  return {
    stats,
    refresh,
  };
};

/**
 * Hook for a single island with details
 */
export const useIslandDetails = (id: string) => {
  const islandStore = useIslandStore();
  const { currentIsland, loading, error, getIslandWithDetails } =
    useIslandManagement();

  const islandWithDetails = useMemo(() => {
    return getIslandWithDetails(id);
  }, [getIslandWithDetails, id]);

  const loadIsland = useCallback(async () => {
    try {
      await islandStore.fetchById(id);
    } catch (error) {
      console.error('Error loading island details:', error);
      throw error;
    }
  }, [islandStore, id]);

  return {
    island: currentIsland,
    islandWithDetails,
    loading: loading.singleIsland,
    error,
    loadIsland,
  };
};

export default useIslandManagement;
