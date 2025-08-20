import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';

type Zone = AdminManagement.Zone;
type ZoneFormData = AdminManagement.ZoneFormData;
type ZoneStats = AdminManagement.ZoneStats;
type ZoneFilters = AdminManagement.ZoneFilters;
type ZoneWithDetails = AdminManagement.ZoneWithDetails;
type ZoneActivityLog = AdminManagement.ZoneActivityLog;
type LoadingStates = AdminManagement.LoadingStates;
type ValidationResult = AdminManagement.ValidationResult;
type BaseStoreState<T> = AdminManagement.BaseStoreState<T>;
type FilterableStoreState<T, F> = AdminManagement.FilterableStoreState<T, F>;
type StatsStoreState<S> = AdminManagement.StatsStoreState<S>;
type OrderableStoreState<T> = AdminManagement.OrderableStoreState<T>;
type BaseCrudActions<T, F> = AdminManagement.BaseCrudActions<T, F>;
type OrderableActions = AdminManagement.OrderableActions;
type SearchableActions<T> = AdminManagement.SearchableActions<T>;

// ============================================================================
// ZONE STORE INTERFACES
// ============================================================================

interface ZoneStoreState
  extends BaseStoreState<Zone>,
    FilterableStoreState<Zone, ZoneFilters>,
    StatsStoreState<ZoneStats>,
    OrderableStoreState<Zone> {
  // Additional zone-specific state
  activityLogs: ZoneActivityLog[];
}

interface ZoneStoreActions
  extends BaseCrudActions<Zone, ZoneFormData>,
    OrderableActions,
    SearchableActions<Zone> {
  // Zone-specific actions
  fetchZoneDetails: (id: string) => Promise<ZoneWithDetails | null>;
  fetchZoneActivityLogs: (zoneId: string) => Promise<ZoneActivityLog[]>;

  // Order management (zone-specific implementation)
  moveZone: (zoneId: string, newOrderIndex: number) => Promise<void>;
  reorderZones: (
    zoneOrders: { id: string; order_index: number }[]
  ) => Promise<void>;

  // Filter actions
  setFilters: (filters: Partial<ZoneFilters>) => void;

  // Statistics
  calculateStats: () => void;

  // Utility
  getZoneById: (id: string) => Zone | undefined;
  getZoneByCode: (code: string) => Zone | undefined;
  validateZoneData: (data: Partial<ZoneFormData>) => ValidationResult;

  // Activity logs
  addActivityLog: (log: Omit<ZoneActivityLog, 'id' | 'created_at'>) => void;
}

type ZoneStore = ZoneStoreState & ZoneStoreActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ZoneStoreState = {
  data: [],
  currentItem: null,
  loading: {
    zones: false,
    singleZone: false,
    creating: false,
    updating: false,
    deleting: false,
    reordering: false,
    activityLogs: false,
  },
  error: null,
  searchQuery: '',
  filters: {},
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    totalIslands: 0,
    activeIslands: 0,
    totalRoutes: 0,
    activeRoutes: 0,
    avgIslandsPerZone: 0,
    avgRoutesPerZone: 0,
  },
  sortBy: 'order_index',
  sortOrder: 'asc',
  activityLogs: [],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const processZoneData = (zone: any): Zone => ({
  id: zone.id,
  name: zone.name,
  code: zone.code,
  description: zone.description || '',
  is_active: zone.is_active ?? true,
  order_index: zone.order_index || 0,
  created_at: zone.created_at,
  updated_at: zone.updated_at,
  // Include statistics from zones_stats_view
  total_islands: zone.total_islands || 0,
  active_islands: zone.active_islands || 0,
  total_routes: zone.total_routes || 0,
  active_routes: zone.active_routes || 0,
});

const validateZoneFormData = (
  data: Partial<ZoneFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Zone name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Zone name must be at least 2 characters';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Zone name must be less than 100 characters';
  }

  if (!data.code?.trim()) {
    errors.code = 'Zone code is required';
  } else if (data.code.trim().length < 1) {
    errors.code = 'Zone code must be at least 1 character';
  } else if (data.code.trim().length > 10) {
    errors.code = 'Zone code must be less than 10 characters';
  } else if (!/^[A-Z0-9_-]+$/i.test(data.code.trim())) {
    errors.code =
      'Zone code can only contain letters, numbers, underscores, and hyphens';
  }

  if (data.order_index !== undefined && data.order_index < 0) {
    errors.order_index = 'Order index must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useZoneStore = create<ZoneStore>((set, get) => ({
  ...initialState,

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  fetchAll: async () => {
    set(state => ({
      loading: { ...state.loading, zones: true },
      error: null,
    }));

    try {
      // Use zones_stats_view like existing zoneService
      const { data: zones, error } = await supabase
        .from('zones_stats_view')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;

      const processedZones = (zones || []).map(processZoneData);

      set(state => ({
        data: processedZones,
        loading: { ...state.loading, zones: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error fetching zones:', error);
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to fetch zones',
        loading: { ...state.loading, zones: false },
      }));
    }
  },

  fetchById: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, singleZone: true },
      error: null,
    }));

    try {
      // Use zones_stats_view like existing zoneService
      const { data: zone, error } = await supabase
        .from('zones_stats_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set(state => ({
            currentItem: null,
            loading: { ...state.loading, singleZone: false },
          }));
          return null;
        }
        throw error;
      }

      if (zone) {
        const processedZone = processZoneData(zone);
        set(state => ({
          currentItem: processedZone,
          loading: { ...state.loading, singleZone: false },
        }));
        return processedZone;
      }

      set(state => ({
        currentItem: null,
        loading: { ...state.loading, singleZone: false },
      }));
      return null;
    } catch (error) {
      console.error('Error fetching zone:', error);
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to fetch zone',
        loading: { ...state.loading, singleZone: false },
      }));
      return null;
    }
  },

  fetchZoneDetails: async (id: string) => {
    try {
      // Use zone_detailed_stats_view for comprehensive details
      const { data: zone, error } = await supabase
        .from('zone_detailed_stats_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return zone as ZoneWithDetails;
    } catch (error) {
      console.error('Error fetching zone details:', error);
      throw error;
    }
  },

  fetchZoneActivityLogs: async (zoneId: string) => {
    try {
      const { data: logs, error } = await supabase
        .from('zone_activity_logs')
        .select('*')
        .eq('zone_id', zoneId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const activityLogs = (logs || []) as ZoneActivityLog[];

      set(state => ({
        activityLogs,
      }));

      return activityLogs;
    } catch (error) {
      console.error('Error fetching zone activity logs:', error);
      throw error;
    }
  },

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  create: async (data: ZoneFormData) => {
    set(state => ({
      loading: { ...state.loading, creating: true },
      error: null,
    }));

    try {
      const validation = get().validateZoneData(data);
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors)[0]);
      }

      // Create in zones table, activity logging handled by triggers
      const { data: newZone, error } = await supabase
        .from('zones')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      // Fetch from zones_stats_view to get statistics
      const { data: zoneWithStats, error: statsError } = await supabase
        .from('zones_stats_view')
        .select('*')
        .eq('id', newZone.id)
        .single();

      if (statsError) throw statsError;

      const processedZone = processZoneData(zoneWithStats);

      set(state => ({
        data: [processedZone, ...state.data].sort(
          (a, b) => a.order_index - b.order_index
        ),
        loading: { ...state.loading, creating: false },
      }));

      get().calculateStats();
      return processedZone;
    } catch (error) {
      console.error('Error creating zone:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create zone';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, creating: false },
      }));
      throw new Error(errorMessage);
    }
  },

  update: async (id: string, data: Partial<ZoneFormData>) => {
    set(state => ({
      loading: { ...state.loading, updating: true },
      error: null,
    }));

    try {
      if (Object.keys(data).length > 0) {
        const validation = get().validateZoneData(data);
        if (!validation.isValid) {
          throw new Error(Object.values(validation.errors)[0]);
        }
      }

      // Update in zones table, activity logging handled by triggers
      const { data: updatedZone, error } = await supabase
        .from('zones')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Fetch from zones_stats_view to get updated statistics
      const { data: zoneWithStats, error: statsError } = await supabase
        .from('zones_stats_view')
        .select('*')
        .eq('id', id)
        .single();

      if (statsError) throw statsError;

      const processedZone = processZoneData(zoneWithStats);

      set(state => ({
        data: state.data
          .map(zone => (zone.id === id ? processedZone : zone))
          .sort((a, b) => a.order_index - b.order_index),
        currentItem:
          state.currentItem?.id === id ? processedZone : state.currentItem,
        loading: { ...state.loading, updating: false },
      }));

      get().calculateStats();
      return processedZone;
    } catch (error) {
      console.error('Error updating zone:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update zone';
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
      // ADD MISSING BUSINESS LOGIC: Check if zone has islands before deletion
      const { data: islands, error: islandsError } = await supabase
        .from('islands')
        .select('id')
        .eq('zone_id', id)
        .limit(1);

      if (islandsError) throw islandsError;

      if (islands && islands.length > 0) {
        throw new Error(
          'Cannot delete zone that contains islands. Please move or delete all islands first.'
        );
      }

      // Delete from zones table, activity logging and cleanup handled by triggers
      const { error } = await supabase.from('zones').delete().eq('id', id);

      if (error) throw error;

      set(state => ({
        data: state.data.filter(zone => zone.id !== id),
        currentItem: state.currentItem?.id === id ? null : state.currentItem,
        loading: { ...state.loading, deleting: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error deleting zone:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete zone';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, deleting: false },
      }));
      throw new Error(errorMessage);
    }
  },

  // ========================================================================
  // ORDER MANAGEMENT
  // ========================================================================

  getAvailableOrderOptions: () => {
    const zones = get().data;
    const options = [];

    // Add positions 0 through length
    for (let i = 0; i <= zones.length; i++) {
      options.push({
        label:
          i === 0
            ? 'Beginning'
            : i === zones.length
              ? 'End'
              : `Position ${i + 1}`,
        value: i,
      });
    }

    return options;
  },

  getSuggestedOrder: (excludeId?: string) => {
    const zones = get().data.filter(zone => zone.id !== excludeId);
    return zones.length;
  },

  validateOrder: (orderIndex: number, excludeId?: string) => {
    const zones = get().data.filter(zone => zone.id !== excludeId);

    if (orderIndex < 0) {
      return {
        isValid: false,
        errors: { order_index: 'Order index must be non-negative' },
      };
    }

    if (orderIndex > zones.length) {
      return {
        isValid: false,
        errors: { order_index: 'Order index is too high' },
      };
    }

    return { isValid: true, errors: {} as Record<string, string> };
  },

  reorder: async (items: { id: string; order_index: number }[]) => {
    await get().reorderZones(items);
  },

  moveZone: async (zoneId: string, newOrderIndex: number) => {
    const validation = get().validateOrder(newOrderIndex, zoneId);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    await get().update(zoneId, { order_index: newOrderIndex });
    await get().fetchAll(); // Refresh to get updated order
  },

  reorderZones: async (zoneOrders: { id: string; order_index: number }[]) => {
    set(state => ({
      loading: { ...state.loading, reordering: true },
      error: null,
    }));

    try {
      // Validate all order indices
      for (const zoneOrder of zoneOrders) {
        const validation = get().validateOrder(
          zoneOrder.order_index,
          zoneOrder.id
        );
        if (!validation.isValid) {
          throw new Error(
            `Invalid order for zone: ${Object.values(validation.errors)[0]}`
          );
        }
      }

      // Update all zones
      const updatePromises = zoneOrders.map(zoneOrder =>
        supabase
          .from('zones')
          .update({ order_index: zoneOrder.order_index })
          .eq('id', zoneOrder.id)
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }

      set(state => ({
        loading: { ...state.loading, reordering: false },
      }));

      await get().fetchAll(); // Refresh to get updated order
    } catch (error) {
      console.error('Error reordering zones:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reorder zones';
      set(state => ({
        error: errorMessage,
        loading: { ...state.loading, reordering: false },
      }));
      throw new Error(errorMessage);
    }
  },

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  setCurrentItem: (item: Zone | null) => {
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

  setFilters: (filters: Partial<ZoneFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {}, searchQuery: '' });
  },

  // ========================================================================
  // SEARCH AND FILTER ACTIONS
  // ========================================================================

  searchItems: (items: Zone[], query: string) => {
    if (!query.trim()) return items;

    const searchTerm = query.toLowerCase().trim();
    return items.filter(
      zone =>
        zone.name.toLowerCase().includes(searchTerm) ||
        zone.code.toLowerCase().includes(searchTerm) ||
        (zone.description &&
          zone.description.toLowerCase().includes(searchTerm))
    );
  },

  filterItems: (items: Zone[], filters: ZoneFilters) => {
    let filtered = items;

    if (filters.is_active !== undefined && filters.is_active !== null) {
      filtered = filtered.filter(zone => zone.is_active === filters.is_active);
    }

    return filtered;
  },

  sortItems: (items: Zone[], sortBy: string, order: 'asc' | 'desc') => {
    return [...items].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'order_index':
          aValue = a.order_index;
          bValue = b.order_index;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.order_index;
          bValue = b.order_index;
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

    const stats: ZoneStats = {
      total: data.length,
      active: data.filter(zone => zone.is_active).length,
      inactive: data.filter(zone => !zone.is_active).length,
      totalIslands: 0,
      activeIslands: 0,
      totalRoutes: 0,
      activeRoutes: 0,
      avgIslandsPerZone: 0,
      avgRoutesPerZone: 0,
    };

    // Calculate totals
    data.forEach(zone => {
      if (zone.total_islands) {
        stats.totalIslands += zone.total_islands;
      }
      if (zone.active_islands) {
        stats.activeIslands += zone.active_islands;
      }
      if (zone.total_routes) {
        stats.totalRoutes += zone.total_routes;
      }
      if (zone.active_routes) {
        stats.activeRoutes += zone.active_routes;
      }
    });

    // Calculate averages
    if (data.length > 0) {
      stats.avgIslandsPerZone =
        Math.round((stats.totalIslands / data.length) * 100) / 100;
      stats.avgRoutesPerZone =
        Math.round((stats.totalRoutes / data.length) * 100) / 100;
    }

    set({ stats });
  },

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  getZoneById: (id: string) => {
    return get().data.find(zone => zone.id === id);
  },

  getZoneByCode: (code: string) => {
    return get().data.find(
      zone => zone.code.toLowerCase() === code.toLowerCase()
    );
  },

  validateZoneData: (data: Partial<ZoneFormData>) => {
    return validateZoneFormData(data);
  },

  addActivityLog: (log: Omit<ZoneActivityLog, 'id' | 'created_at'>) => {
    const newLog: ZoneActivityLog = {
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
export type ZoneStoreType = typeof useZoneStore;
export default useZoneStore;
