import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';

type Island = AdminManagement.Island;
type IslandFormData = AdminManagement.IslandFormData;
type IslandStats = AdminManagement.IslandStats;
type IslandFilters = AdminManagement.IslandFilters;
type IslandWithDetails = AdminManagement.IslandWithDetails;
type LoadingStates = AdminManagement.LoadingStates;
type ValidationResult = AdminManagement.ValidationResult;
type BaseStoreState<T> = AdminManagement.BaseStoreState<T>;
type FilterableStoreState<T, F> = AdminManagement.FilterableStoreState<T, F>;
type StatsStoreState<S> = AdminManagement.StatsStoreState<S>;
type BaseCrudActions<T, F> = AdminManagement.BaseCrudActions<T, F>;
type SearchableActions<T> = AdminManagement.SearchableActions<T>;

// ============================================================================
// ISLAND STORE INTERFACES
// ============================================================================

interface IslandStoreState
  extends
    BaseStoreState<Island>,
    FilterableStoreState<Island, IslandFilters>,
    StatsStoreState<IslandStats> {
  // Computed data
  filteredIslands: Island[];
  sortedIslands: Island[];

  // Sort configuration
  sortBy: 'name' | 'zone' | 'created_at' | 'zone_name';
  sortOrder: 'asc' | 'desc';
}

interface IslandStoreActions
  extends BaseCrudActions<Island, IslandFormData>, SearchableActions<Island> {
  // Island-specific actions
  fetchIslandsByZone: (zoneId: string) => Promise<Island[]>;

  // Computed data actions
  getFilteredIslands: () => Island[];
  getSortedIslands: (items: Island[]) => Island[];

  // Sort actions
  setSortBy: (sortBy: 'name' | 'zone' | 'created_at' | 'zone_name') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Filter actions
  setFilters: (filters: Partial<IslandFilters>) => void;

  // Statistics
  calculateStats: () => void;

  // Utility
  getIslandById: (id: string) => Island | undefined;
  getIslandsByZone: (zoneId: string) => Island[];
  validateIslandData: (data: Partial<IslandFormData>) => ValidationResult;
}

type IslandStore = IslandStoreState & IslandStoreActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: IslandStoreState = {
  data: [],
  currentItem: null,
  loading: {
    islands: false,
    singleIsland: false,
    creating: false,
    updating: false,
    deleting: false,
  },
  error: null,
  searchQuery: '',
  filters: {},
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    byZone: {},
    totalRoutes: 0,
    activeRoutes: 0,
    recentlyUpdated: 0,
  },
  filteredIslands: [],
  sortedIslands: [],
  sortBy: 'name',
  sortOrder: 'asc',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const processIslandData = (island: any): Island => ({
  id: island.id,
  name: island.name,
  zone: island.zone || island.old_zone_text || '',
  zone_id: island.zone_id,
  is_active: island.is_active ?? true,
  created_at: island.created_at,
  updated_at: island.updated_at,
  // Include zone information for compatibility with existing components
  zone_info: island.zone_id
    ? {
        id: island.zone_id,
        name: island.zone_name || '',
        code: island.zone_code || '',
        description: island.zone_description || '',
        is_active: island.zone_is_active ?? true,
      }
    : null,
  // Additional fields for compatibility
  zone_name: island.zone_name || island.zone || '',
});

const validateIslandFormData = (
  data: Partial<IslandFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Island name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Island name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Island name must be less than 100 characters';
  }

  if (!data.zone_id && !data.zone?.trim()) {
    errors.zone = 'Zone is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useIslandStore = create<IslandStore>((set, get) => ({
  ...initialState,

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  fetchAll: async () => {
    set(state => ({
      loading: { ...state.loading, islands: true },
      error: null,
    }));

    try {
      // Use the same query structure as existing operationsService
      const { data: islands, error } = await supabase
        .from('islands')
        .select(
          `
                    *,
                    zones (
                        id,
                        name,
                        code,
                        description,
                        is_active
                    )
                `
        )
        .order('name', { ascending: true });

      if (error) throw error;

      // Transform data to include zone_info like existing implementation
      const processedIslands = (islands || [])
        .map(island => ({
          ...island,
          zone_info: island.zones || null,
        }))
        .map(processIslandData);

      set(state => ({
        data: processedIslands,
        loading: { ...state.loading, islands: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error fetching islands:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to fetch islands',
        loading: { ...state.loading, islands: false },
      }));
    }
  },

  fetchById: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, singleIsland: true },
      error: null,
    }));

    try {
      // Use the same query structure as existing operationsService
      const { data: island, error } = await supabase
        .from('islands')
        .select(
          `
                    *,
                    zones (
                        id,
                        name,
                        code,
                        description,
                        is_active
                    )
                `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      if (island) {
        // Transform data to include zone_info like existing implementation
        const islandWithZoneInfo = {
          ...island,
          zone_info: island.zones || null,
        };
        const processedIsland = processIslandData(islandWithZoneInfo);

        set(state => ({
          currentItem: processedIsland,
          loading: { ...state.loading, singleIsland: false },
        }));

        return processedIsland;
      }

      set(state => ({
        currentItem: null,
        loading: { ...state.loading, singleIsland: false },
      }));
      return null;
    } catch (error) {
      console.error('Error fetching island:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to fetch island',
        loading: { ...state.loading, singleIsland: false },
      }));
      return null;
    }
  },

  fetchIslandsByZone: async (zoneId: string) => {
    try {
      const { data: islands, error } = await supabase
        .from('islands')
        .select(
          `
                    *,
                    zones (
                        id,
                        name,
                        code,
                        description,
                        is_active
                    )
                `
        )
        .eq('zone_id', zoneId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (islands || [])
        .map(island => ({
          ...island,
          zone_info: island.zones || null,
        }))
        .map(processIslandData);
    } catch (error) {
      console.error('Error fetching islands by zone:', error);
      throw error;
    }
  },

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  create: async (data: IslandFormData) => {
    set(state => ({
      loading: { ...state.loading, creating: true },
      error: null,
    }));

    try {
      const validation = get().validateIslandData(data);
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      const { data: newIsland, error } = await supabase
        .from('islands')
        .insert([
          {
            name: data.name.trim(),
            zone_id: data.zone_id,
            zone: data.zone || data.name, // Backward compatibility
            is_active: data.is_active,
          },
        ])
        .select(
          `
                    *,
                    zones (
                        id,
                        name,
                        code,
                        description,
                        is_active
                    )
                `
        )
        .single();

      if (error) throw error;

      const islandWithZoneInfo = {
        ...newIsland,
        zone_info: newIsland.zones || null,
      };
      const processedIsland = processIslandData(islandWithZoneInfo);

      set(state => ({
        data: [processedIsland, ...state.data],
        loading: { ...state.loading, creating: false },
      }));

      get().calculateStats();
      return processedIsland;
    } catch (error) {
      console.error('Error creating island:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create island';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, creating: false },
      }));
      throw new Error(errorMessage);
    }
  },

  update: async (id: string, data: Partial<IslandFormData>) => {
    set(state => ({
      loading: { ...state.loading, updating: true },
      error: null,
    }));

    try {
      if (data.name !== undefined || data.zone_id !== undefined) {
        const validation = get().validateIslandData(data);
        if (!validation.isValid) {
          throw new Error(Object.values(validation.errors)[0]);
        }
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.zone_id !== undefined) updateData.zone_id = data.zone_id;
      if (data.zone !== undefined) updateData.zone = data.zone;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { data: updatedIsland, error } = await supabase
        .from('islands')
        .update(updateData)
        .eq('id', id)
        .select(
          `
                    *,
                    zones (
                        id,
                        name,
                        code,
                        description,
                        is_active
                    )
                `
        )
        .single();

      if (error) throw error;

      const islandWithZoneInfo = {
        ...updatedIsland,
        zone_info: updatedIsland.zones || null,
      };
      const processedIsland = processIslandData(islandWithZoneInfo);

      set(state => ({
        data: state.data.map(island =>
          island.id === id ? processedIsland : island
        ),
        currentItem:
          state.currentItem?.id === id ? processedIsland : state.currentItem,
        loading: { ...state.loading, updating: false },
      }));

      get().calculateStats();
      return processedIsland;
    } catch (error) {
      console.error('Error updating island:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update island';
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
      // ADD MISSING BUSINESS LOGIC: Check if island is used in any routes (like existing implementation)
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select('id')
        .or(`from_island_id.eq.${id},to_island_id.eq.${id}`)
        .limit(1);

      if (routesError) throw routesError;

      if (routes && routes.length > 0) {
        throw new Error('Cannot delete island that is used in routes.');
      }

      const { error } = await supabase.from('islands').delete().eq('id', id);

      if (error) throw error;

      set(state => ({
        data: state.data.filter(island => island.id !== id),
        currentItem: state.currentItem?.id === id ? null : state.currentItem,
        loading: { ...state.loading, deleting: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error deleting island:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete island';
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

  setCurrentItem: (item: Island | null) => {
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

  setFilters: (filters: Partial<IslandFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {}, searchQuery: '' });
  },

  setSortBy: (sortBy: 'name' | 'zone' | 'created_at' | 'zone_name') => {
    set({ sortBy });
  },

  setSortOrder: (order: 'asc' | 'desc') => {
    set({ sortOrder: order });
  },

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  getFilteredIslands: () => {
    const { data, searchQuery, filters } = get();
    let filtered = data;

    // Apply search
    if (searchQuery.trim()) {
      filtered = get().searchItems(filtered, searchQuery);
    }

    // Apply filters
    if (filters.is_active !== undefined && filters.is_active !== null) {
      filtered = filtered.filter(
        island => island.is_active === filters.is_active
      );
    }

    if (filters.zone_id) {
      filtered = filtered.filter(island => island.zone_id === filters.zone_id);
    }

    return filtered;
  },

  getSortedIslands: (items: Island[]) => {
    const { sortBy, sortOrder } = get();
    return get().sortItems(items, sortBy, sortOrder);
  },

  // ========================================================================
  // SEARCH AND FILTER ACTIONS
  // ========================================================================

  searchItems: (items: Island[], query: string) => {
    if (!query.trim()) return items;

    const searchTerm = query.toLowerCase().trim();
    return items.filter(
      island =>
        island.name.toLowerCase().includes(searchTerm) ||
        (island.zone && island.zone.toLowerCase().includes(searchTerm)) ||
        (island.zone_info?.name &&
          island.zone_info.name.toLowerCase().includes(searchTerm)) ||
        (island.zone_info?.code &&
          island.zone_info.code.toLowerCase().includes(searchTerm))
    );
  },

  filterItems: (items: Island[], filters: IslandFilters) => {
    let filtered = items;

    if (filters.is_active !== undefined && filters.is_active !== null) {
      filtered = filtered.filter(
        island => island.is_active === filters.is_active
      );
    }

    if (filters.zone_id) {
      filtered = filtered.filter(island => island.zone_id === filters.zone_id);
    }

    return filtered;
  },

  sortItems: (items: Island[], sortBy: string, order: 'asc' | 'desc') => {
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'zone':
          aValue = (a.zone_info?.name || a.zone || '').toLowerCase();
          bValue = (b.zone_info?.name || b.zone || '').toLowerCase();
          break;
        case 'zone_name':
          aValue = (a.zone_info?.name || '').toLowerCase();
          bValue = (b.zone_info?.name || '').toLowerCase();
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

    const stats: IslandStats = {
      total: data.length,
      active: data.filter(island => island.is_active).length,
      inactive: data.filter(island => !island.is_active).length,
      byZone: {},
      totalRoutes: 0,
      activeRoutes: 0,
      recentlyUpdated: 0,
    };

    // Calculate by zone
    data.forEach(island => {
      const zoneName = island.zone_info?.name || island.zone || 'Unknown';
      stats.byZone[zoneName] = (stats.byZone[zoneName] || 0) + 1;

      if (island.total_routes) {
        stats.totalRoutes += island.total_routes;
      }
      if (island.active_routes) {
        stats.activeRoutes += island.active_routes;
      }
    });

    // Calculate recently updated (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    stats.recentlyUpdated = data.filter(
      island => new Date(island.updated_at) > sevenDaysAgo
    ).length;

    set({ stats });
  },

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  getIslandById: (id: string) => {
    return get().data.find(island => island.id === id);
  },

  getIslandsByZone: (zoneId: string) => {
    return get().data.filter(island => island.zone_id === zoneId);
  },

  validateIslandData: (data: Partial<IslandFormData>) => {
    return validateIslandFormData(data);
  },

  refreshAll: async () => {
    await get().fetchAll();
  },

  resetStore: () => {
    set(initialState);
  },
}));

// Export the store for use in components and hooks
export type IslandStoreType = typeof useIslandStore;
export default useIslandStore;
