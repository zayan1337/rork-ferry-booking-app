import { DatabaseIsland } from '@/types/database';
import { Zone } from '@/types/admin/management';

/**
 * Search islands by name or zone
 */
export const searchIslands = (islands: DatabaseIsland[], query: string): DatabaseIsland[] => {
    if (!query.trim()) return islands;

    const searchTerm = query.toLowerCase().trim();
    return islands.filter(island =>
        island.name.toLowerCase().includes(searchTerm) ||
        (island.zone && island.zone.toLowerCase().includes(searchTerm)) ||
        (island.zone_info?.name && island.zone_info.name.toLowerCase().includes(searchTerm)) ||
        (island.zone_info?.code && island.zone_info.code.toLowerCase().includes(searchTerm))
    );
};

/**
 * Filter islands by active status
 */
export const filterIslandsByStatus = (islands: DatabaseIsland[], isActive: boolean | null): DatabaseIsland[] => {
    if (isActive === null) return islands;
    return islands.filter(island => island.is_active === isActive);
};

/**
 * Filter islands by zone
 */
export const filterIslandsByZone = (islands: DatabaseIsland[], zoneId: string | null): DatabaseIsland[] => {
    if (!zoneId) return islands;
    return islands.filter(island => island.zone_id === zoneId);
};

/**
 * Sort islands by specified field and order
 */
export const sortIslands = (
    islands: DatabaseIsland[],
    sortBy: 'name' | 'zone' | 'created_at' | 'zone_name',
    sortOrder: 'asc' | 'desc'
): DatabaseIsland[] => {
    return [...islands].sort((a, b) => {
        let aValue: any = a[sortBy as keyof DatabaseIsland];
        let bValue: any = b[sortBy as keyof DatabaseIsland];

        // Handle special sorting cases
        if (sortBy === 'zone_name') {
            aValue = a.zone_info?.name || a.zone || '';
            bValue = b.zone_info?.name || b.zone || '';
        } else if (sortBy === 'created_at') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
};

/**
 * Get islands grouped by zone
 */
export const getIslandsByZone = (islands: DatabaseIsland[]): Record<string, DatabaseIsland[]> => {
    return islands.reduce((acc, island) => {
        const zoneKey = island.zone_info?.name || island.zone || 'Unknown Zone';
        if (!acc[zoneKey]) {
            acc[zoneKey] = [];
        }
        acc[zoneKey].push(island);
        return acc;
    }, {} as Record<string, DatabaseIsland[]>);
};

/**
 * Calculate comprehensive island statistics
 */
export const calculateIslandStats = (islands: DatabaseIsland[]) => {
    const total = islands.length;
    const active = islands.filter(island => island.is_active).length;
    const inactive = total - active;

    // Group by zone
    const zoneGroups = getIslandsByZone(islands);
    const totalZones = Object.keys(zoneGroups).length;

    // Zone with most islands
    const zoneWithMostIslands = Object.entries(zoneGroups).reduce(
        (max, [zoneName, zoneIslands]) =>
            zoneIslands.length > max.count ? { zone: zoneName, count: zoneIslands.length } : max,
        { zone: '', count: 0 }
    );

    // Recently added islands (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyAdded = islands.filter(island =>
        new Date(island.created_at) >= thirtyDaysAgo
    ).length;

    return {
        total,
        active,
        inactive,
        activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
        totalZones,
        averagePerZone: totalZones > 0 ? Math.round(total / totalZones) : 0,
        zoneWithMostIslands,
        recentlyAdded,
        zonesWithIslands: totalZones,
    };
};

/**
 * Get zone statistics for islands
 */
export const getZoneStatistics = (islands: DatabaseIsland[], zones: Zone[]) => {
    const zoneStats = zones.map(zone => {
        const zoneIslands = islands.filter(island => island.zone_id === zone.id);
        const activeIslands = zoneIslands.filter(island => island.is_active).length;

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            zoneCode: zone.code,
            totalIslands: zoneIslands.length,
            activeIslands,
            inactiveIslands: zoneIslands.length - activeIslands,
            activationRate: zoneIslands.length > 0 ? Math.round((activeIslands / zoneIslands.length) * 100) : 0,
        };
    });

    return zoneStats.sort((a, b) => b.totalIslands - a.totalIslands);
};

/**
 * Format island name for display
 */
export const formatIslandName = (name: string): string => {
    return name.trim();
};

/**
 * Get island zone display name
 */
export const getIslandZoneDisplay = (island: DatabaseIsland): string => {
    if (island.zone_info) {
        return `${island.zone_info.name} (${island.zone_info.code})`;
    }
    return island.zone || 'Unknown Zone';
};

/**
 * Get zone color based on zone name or ID
 */
export const getZoneColor = (zoneName: string, zones?: Zone[]): string => {
    if (!zones) {
        // Fallback colors based on zone name
        switch (zoneName.toLowerCase()) {
            case 'male':
            case 'malé':
                return '#2196F3'; // Primary blue
            case 'north':
                return '#03A9F4'; // Light blue
            case 'south':
                return '#FF9800'; // Orange
            case 'central':
                return '#4CAF50'; // Green
            default:
                return '#757575'; // Grey
        }
    }

    // Generate consistent color based on zone index
    const zoneIndex = zones.findIndex(zone =>
        zone.name.toLowerCase() === zoneName.toLowerCase() || zone.id === zoneName
    );

    const colors = ['#2196F3', '#03A9F4', '#4CAF50', '#FF9800', '#9C27B0', '#FF5722'];
    return colors[zoneIndex % colors.length] || '#757575';
};

/**
 * Validate island data
 */
export const validateIslandData = (data: Partial<DatabaseIsland>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
        errors.push('Island name is required');
    } else if (data.name.trim().length < 2) {
        errors.push('Island name must be at least 2 characters long');
    } else if (data.name.trim().length > 100) {
        errors.push('Island name must be less than 100 characters');
    }

    if (!data.zone_id && !data.zone) {
        errors.push('Zone information is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Check if island name is unique
 */
export const isIslandNameUnique = (name: string, islands: DatabaseIsland[], currentIslandId?: string): boolean => {
    const trimmedName = name.trim().toLowerCase();
    return !islands.some(island =>
        island.name.toLowerCase() === trimmedName && island.id !== currentIslandId
    );
};

/**
 * Get islands that can be used for routes (active islands)
 */
export const getAvailableIslandsForRoutes = (islands: DatabaseIsland[]): DatabaseIsland[] => {
    return islands.filter(island => island.is_active);
};

/**
 * Find islands by zone ID
 */
export const findIslandsByZoneId = (islands: DatabaseIsland[], zoneId: string): DatabaseIsland[] => {
    return islands.filter(island => island.zone_id === zoneId);
};

/**
 * Get island statistics for a specific zone
 */
export const getIslandStatsForZone = (islands: DatabaseIsland[], zoneId: string) => {
    const zoneIslands = findIslandsByZoneId(islands, zoneId);
    const activeIslands = zoneIslands.filter(island => island.is_active);

    return {
        total: zoneIslands.length,
        active: activeIslands.length,
        inactive: zoneIslands.length - activeIslands.length,
        activationRate: zoneIslands.length > 0 ? Math.round((activeIslands.length / zoneIslands.length) * 100) : 0,
    };
};

/**
 * Export island data for reporting
 */
export const exportIslandData = (islands: DatabaseIsland[]) => {
    return islands.map(island => ({
        name: island.name,
        zone: getIslandZoneDisplay(island),
        status: island.is_active ? 'Active' : 'Inactive',
        created: new Date(island.created_at).toLocaleDateString(),
        id: island.id,
    }));
}; 