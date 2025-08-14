import { AdminManagement } from '@/types';

type Island = AdminManagement.Island;
type IslandFormData = AdminManagement.IslandFormData;
type IslandStats = AdminManagement.IslandStats;
type IslandFilters = AdminManagement.IslandFilters;
type ValidationResult = AdminManagement.ValidationResult;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateIslandForm = (
  data: Partial<IslandFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  // Name validation
  if (data.name !== undefined) {
    if (!data.name?.trim()) {
      errors.name = 'Island name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Island name must be at least 2 characters';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Island name must be less than 100 characters';
    }
  }

  // Zone validation - either zone_id or legacy zone field
  if (data.zone_id === undefined && data.zone === undefined) {
    errors.zone = 'Zone is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// SEARCH AND FILTER FUNCTIONS
// ============================================================================

export const searchIslands = (islands: Island[], query: string): Island[] => {
  if (!query.trim()) return islands;

  const searchTerm = query.toLowerCase().trim();
  return islands.filter(
    island =>
      island.name.toLowerCase().includes(searchTerm) ||
      (island.zone && island.zone.toLowerCase().includes(searchTerm)) ||
      (island.zone_info?.name &&
        island.zone_info.name.toLowerCase().includes(searchTerm)) ||
      (island.zone_info?.code &&
        island.zone_info.code.toLowerCase().includes(searchTerm)) ||
      (island.zone_name && island.zone_name.toLowerCase().includes(searchTerm))
  );
};

export const filterIslands = (
  islands: Island[],
  filters: IslandFilters
): Island[] => {
  return islands.filter(island => {
    // Active status filter
    if (
      filters.is_active !== undefined &&
      island.is_active !== filters.is_active
    ) {
      return false;
    }

    // Zone filter (supports both zone_id and legacy zone)
    if (filters.zone_id && island.zone_id !== filters.zone_id) {
      return false;
    }

    if (filters.zone && island.zone !== filters.zone) {
      return false;
    }

    // Has routes filter
    if (filters.has_routes !== undefined) {
      const hasRoutes = (island.total_routes || 0) > 0;
      if (hasRoutes !== filters.has_routes) {
        return false;
      }
    }

    // Date filters
    if (
      filters.created_after &&
      new Date(island.created_at) < new Date(filters.created_after)
    ) {
      return false;
    }

    if (
      filters.created_before &&
      new Date(island.created_at) > new Date(filters.created_before)
    ) {
      return false;
    }

    return true;
  });
};

export const filterIslandsByStatus = (
  islands: Island[],
  isActive: boolean | null
): Island[] => {
  if (isActive === null) return islands;
  return islands.filter(island => island.is_active === isActive);
};

export const filterIslandsByZone = (
  islands: Island[],
  zoneFilter: string | null
): Island[] => {
  if (!zoneFilter) return islands;
  return islands.filter(
    island =>
      island.zone_id === zoneFilter ||
      island.zone === zoneFilter ||
      island.zone_info?.id === zoneFilter
  );
};

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

export const sortIslands = (
  islands: Island[],
  sortBy: 'name' | 'zone' | 'created_at' | 'zone_name',
  sortOrder: 'asc' | 'desc'
): Island[] => {
  return [...islands].sort((a, b) => {
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
        aValue = (
          a.zone_info?.name ||
          a.zone_name ||
          a.zone ||
          ''
        ).toLowerCase();
        bValue = (
          b.zone_info?.name ||
          b.zone_name ||
          b.zone ||
          ''
        ).toLowerCase();
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

export const calculateIslandStats = (islands: Island[]): IslandStats => {
  const total = islands.length;
  const active = islands.filter(island => island.is_active).length;
  const inactive = total - active;

  // Group by zone for statistics
  const byZone: Record<string, number> = {};
  let totalRoutes = 0;
  let activeRoutes = 0;
  let totalTrips30d = 0;
  let totalRevenue30d = 0;

  islands.forEach(island => {
    const zoneName =
      island.zone_info?.name ||
      island.zone_name ||
      island.zone ||
      'Unknown Zone';
    byZone[zoneName] = (byZone[zoneName] || 0) + 1;

    // Aggregate route statistics
    totalRoutes += island.total_routes || 0;
    activeRoutes += island.active_routes || 0;
    totalTrips30d += island.total_trips_30d || 0;
    totalRevenue30d += island.total_revenue_30d || 0;
  });

  // Calculate recently updated (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyUpdated = islands.filter(
    island => island.updated_at && new Date(island.updated_at) > sevenDaysAgo
  ).length;

  // Find top zone by island count
  const topZoneByIslands = Object.entries(byZone).reduce(
    (max, [zone, count]) => (count > max.count ? { zone, count } : max),
    { zone: '', count: 0 }
  );

  return {
    total,
    active,
    inactive,
    byZone,
    totalRoutes,
    activeRoutes,
    recentlyUpdated,
    avgRoutesPerIsland: total > 0 ? totalRoutes / total : 0,
    topZoneByIslands,
    totalTrips30d,
    totalRevenue30d,
  };
};

export const getZoneStatistics = (
  islands: Island[],
  zones: any[]
): Array<{
  zone: string;
  zoneId: string;
  totalIslands: number;
  activeIslands: number;
  totalRoutes: number;
  activeRoutes: number;
}> => {
  const zoneStats = new Map();

  // Initialize with all zones
  zones.forEach(zone => {
    zoneStats.set(zone.id, {
      zone: zone.name,
      zoneId: zone.id,
      totalIslands: 0,
      activeIslands: 0,
      totalRoutes: 0,
      activeRoutes: 0,
    });
  });

  // Aggregate island statistics by zone
  islands.forEach(island => {
    const zoneId = island.zone_id || island.zone_info?.id;
    if (zoneId && zoneStats.has(zoneId)) {
      const stats = zoneStats.get(zoneId);
      stats.totalIslands++;
      if (island.is_active) stats.activeIslands++;
      stats.totalRoutes += island.total_routes || 0;
      stats.activeRoutes += island.active_routes || 0;
    }
  });

  return Array.from(zoneStats.values());
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getIslandsByZone = (
  islands: Island[]
): Record<string, Island[]> => {
  return islands.reduce(
    (acc, island) => {
      const zoneKey =
        island.zone_info?.name ||
        island.zone_name ||
        island.zone ||
        'Unknown Zone';
      if (!acc[zoneKey]) {
        acc[zoneKey] = [];
      }
      acc[zoneKey].push(island);
      return acc;
    },
    {} as Record<string, Island[]>
  );
};

export const formatIslandName = (name: string): string => {
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const getIslandDisplayName = (island: Island): string => {
  return island.name;
};

export const getIslandZoneDisplayName = (island: Island): string => {
  return (
    island.zone_info?.name || island.zone_name || island.zone || 'Unknown Zone'
  );
};

// ============================================================================
// FORM HELPERS
// ============================================================================

export const createEmptyIslandForm = (): IslandFormData => ({
  name: '',
  zone_id: '',
  zone: '',
  is_active: true,
});

export const islandToFormData = (island: Island): IslandFormData => ({
  name: island.name,
  zone_id: island.zone_id || '',
  zone: island.zone || '',
  is_active: island.is_active,
});

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

export const compareIslands = (a: Island, b: Island): boolean => {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.zone_id === b.zone_id &&
    a.zone === b.zone &&
    a.is_active === b.is_active
  );
};

export const getIslandChanges = (
  original: Island,
  updated: Partial<IslandFormData>
): Partial<IslandFormData> => {
  const changes: Partial<IslandFormData> = {};

  if (updated.name !== undefined && updated.name !== original.name) {
    changes.name = updated.name;
  }

  if (updated.zone_id !== undefined && updated.zone_id !== original.zone_id) {
    changes.zone_id = updated.zone_id;
  }

  if (updated.zone !== undefined && updated.zone !== original.zone) {
    changes.zone = updated.zone;
  }

  if (
    updated.is_active !== undefined &&
    updated.is_active !== original.is_active
  ) {
    changes.is_active = updated.is_active;
  }

  return changes;
};
