import { AdminManagement } from '@/types';

type Zone = AdminManagement.Zone;
type ZoneFormData = AdminManagement.ZoneFormData;
type ZoneStats = AdminManagement.ZoneStats;
type ZoneFilters = AdminManagement.ZoneFilters;
type ZoneWithDetails = AdminManagement.ZoneWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type BaseUtilityFunctions<T> = AdminManagement.BaseUtilityFunctions<T>;
type OrderableUtilityFunctions<T> = AdminManagement.OrderableUtilityFunctions<T>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateZoneData = (data: Partial<ZoneFormData>): ValidationResult => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!data.name?.trim()) {
        errors.name = 'Zone name is required';
    } else if (data.name.trim().length < 2) {
        errors.name = 'Zone name must be at least 2 characters';
    } else if (data.name.trim().length > 100) {
        errors.name = 'Zone name must be less than 100 characters';
    } else if (!/^[a-zA-Z0-9\s\-_.]+$/.test(data.name.trim())) {
        errors.name = 'Zone name contains invalid characters';
    }

    // Code validation
    if (!data.code?.trim()) {
        errors.code = 'Zone code is required';
    } else if (data.code.trim().length < 1) {
        errors.code = 'Zone code must be at least 1 character';
    } else if (data.code.trim().length > 10) {
        errors.code = 'Zone code must be less than 10 characters';
    } else if (!/^[A-Z0-9_-]+$/i.test(data.code.trim())) {
        errors.code = 'Zone code can only contain letters, numbers, underscores, and hyphens';
    }

    // Description validation (optional)
    if (data.description && data.description.trim().length > 500) {
        errors.description = 'Description must be less than 500 characters';
    }

    // Order index validation
    if (data.order_index !== undefined && data.order_index < 0) {
        errors.order_index = 'Order index must be a positive number';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

export const validateZoneFormData = validateZoneData; // Alias for consistency

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

export const searchZones = (zones: Zone[], query: string): Zone[] => {
    if (!query.trim()) return zones;

    const searchTerm = query.toLowerCase().trim();
    return zones.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm) ||
        zone.code.toLowerCase().includes(searchTerm) ||
        (zone.description && zone.description.toLowerCase().includes(searchTerm))
    );
};

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

export const filterZonesByStatus = (zones: Zone[], isActive: boolean | null): Zone[] => {
    if (isActive === null) return zones;
    return zones.filter(zone => zone.is_active === isActive);
};

export const filterZonesByCode = (zones: Zone[], codePattern: string | null): Zone[] => {
    if (!codePattern) return zones;
    const pattern = codePattern.toLowerCase();
    return zones.filter(zone => zone.code.toLowerCase().includes(pattern));
};

export const filterZones = (zones: Zone[], filters: ZoneFilters): Zone[] => {
    let filtered = zones;

    if (filters.is_active !== undefined && filters.is_active !== null) {
        filtered = filterZonesByStatus(filtered, filters.is_active);
    }

    if (filters.search) {
        filtered = searchZones(filtered, filters.search);
    }

    return filtered;
};

// ============================================================================
// SORT FUNCTIONS
// ============================================================================

export const sortZones = (
    zones: Zone[],
    sortBy: 'name' | 'code' | 'order_index' | 'created_at',
    order: 'asc' | 'desc'
): Zone[] => {
    return [...zones].sort((a, b) => {
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
};

// ============================================================================
// ORDER MANAGEMENT FUNCTIONS
// ============================================================================

export const getAvailableZoneOrderPositions = (zones: Zone[]): { label: string; value: number }[] => {
    const options = [];

    // Add positions 0 through length
    for (let i = 0; i <= zones.length; i++) {
        options.push({
            label: i === 0 ? 'Beginning' : i === zones.length ? 'End' : `Position ${i + 1}`,
            value: i
        });
    }

    return options;
};

export const getSuggestedZoneOrderIndex = (zones: Zone[]): number => {
    return zones.length;
};

export const validateZoneOrderIndex = (
    orderIndex: number,
    zones: Zone[],
    excludeId?: string
): ValidationResult => {
    const filteredZones = zones.filter(zone => zone.id !== excludeId);

    if (orderIndex < 0) {
        return {
            isValid: false,
            errors: { order_index: 'Order index must be non-negative' }
        };
    }

    if (orderIndex > filteredZones.length) {
        return {
            isValid: false,
            errors: { order_index: 'Order index is too high' }
        };
    }

    return { isValid: true, errors: {} };
};

export const getNextZoneOrderIndex = (zones: Zone[], contextId?: string): number => {
    return getSuggestedZoneOrderIndex(zones.filter(zone => zone.id !== contextId));
};

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

export const calculateZoneStats = (zones: Zone[]): ZoneStats => {
    const stats: ZoneStats = {
        total: zones.length,
        active: zones.filter(zone => zone.is_active).length,
        inactive: zones.filter(zone => !zone.is_active).length,
        totalIslands: 0,
        activeIslands: 0,
        totalRoutes: 0,
        activeRoutes: 0,
        avgIslandsPerZone: 0,
        avgRoutesPerZone: 0,
    };

    // Calculate totals and averages
    zones.forEach(zone => {
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
    if (zones.length > 0) {
        stats.avgIslandsPerZone = Math.round((stats.totalIslands / zones.length) * 100) / 100;
        stats.avgRoutesPerZone = Math.round((stats.totalRoutes / zones.length) * 100) / 100;
    }

    return stats;
};

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

export const enrichZoneWithDetails = (zone: Zone): ZoneWithDetails => {
    return {
        ...zone,
        island_count: zone.total_islands || 0,
        route_count: zone.total_routes || 0,
    } as ZoneWithDetails;
};

export const getZoneDisplayName = (zone: Zone): string => {
    return zone.name;
};

export const getZoneCodeDisplayName = (zone: Zone): string => {
    return zone.code;
};

export const getZoneFullDisplayName = (zone: Zone): string => {
    return `${zone.name} (${zone.code})`;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const findZoneById = (zones: Zone[], id: string): Zone | undefined => {
    return zones.find(zone => zone.id === id);
};

export const findZoneByCode = (zones: Zone[], code: string): Zone | undefined => {
    return zones.find(zone =>
        zone.code.toLowerCase() === code.toLowerCase()
    );
};

export const findZoneByName = (zones: Zone[], name: string): Zone | undefined => {
    return zones.find(zone =>
        zone.name.toLowerCase() === name.toLowerCase()
    );
};

export const getActiveZones = (zones: Zone[]): Zone[] => {
    return zones.filter(zone => zone.is_active);
};

export const getInactiveZones = (zones: Zone[]): Zone[] => {
    return zones.filter(zone => !zone.is_active);
};

export const getZonesByOrderRange = (zones: Zone[], minOrder: number, maxOrder: number): Zone[] => {
    return zones.filter(zone => zone.order_index >= minOrder && zone.order_index <= maxOrder);
};

// ============================================================================
// FORM HELPERS
// ============================================================================

export const prepareZoneFormData = (zone?: Zone): ZoneFormData => {
    if (!zone) {
        return {
            name: '',
            code: '',
            description: '',
            is_active: true,
            order_index: 0,
        };
    }

    return {
        name: zone.name,
        code: zone.code,
        description: zone.description || '',
        is_active: zone.is_active,
        order_index: zone.order_index,
    };
};

export const cleanZoneFormData = (data: ZoneFormData): ZoneFormData => {
    return {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || '',
        is_active: data.is_active,
        order_index: data.order_index,
    };
};

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

export const compareZones = (a: Zone, b: Zone): boolean => {
    return (
        a.name === b.name &&
        a.code === b.code &&
        a.description === b.description &&
        a.is_active === b.is_active &&
        a.order_index === b.order_index
    );
};

export const hasZoneChanged = (original: Zone, updated: Partial<ZoneFormData>): boolean => {
    return (
        (updated.name !== undefined && original.name !== updated.name) ||
        (updated.code !== undefined && original.code !== updated.code) ||
        (updated.description !== undefined && original.description !== updated.description) ||
        (updated.is_active !== undefined && original.is_active !== updated.is_active) ||
        (updated.order_index !== undefined && original.order_index !== updated.order_index)
    );
};

// ============================================================================
// BUSINESS LOGIC FUNCTIONS
// ============================================================================

export const canDeleteZone = (zone: Zone): { canDelete: boolean; reason?: string } => {
    if (zone.total_islands && zone.total_islands > 0) {
        return {
            canDelete: false,
            reason: `Cannot delete zone with ${zone.total_islands} island(s). Please move or delete the islands first.`
        };
    }

    return { canDelete: true };
};

export const getZoneUsageInfo = (zone: Zone): {
    islandCount: number;
    routeCount: number;
    isInUse: boolean;
} => {
    const islandCount = zone.total_islands || 0;
    const routeCount = zone.total_routes || 0;

    return {
        islandCount,
        routeCount,
        isInUse: islandCount > 0 || routeCount > 0,
    };
};

// ============================================================================
// EXPORT UTILITIES FOLLOWING BASE PATTERN
// ============================================================================

export const zoneUtilities: OrderableUtilityFunctions<Zone> = {
    search: searchZones,
    filterByStatus: filterZonesByStatus,
    sort: sortZones,
    calculateStats: calculateZoneStats,
    validateData: validateZoneData,
    getAvailableOrderPositions: getAvailableZoneOrderPositions,
    getSuggestedOrderIndex: getSuggestedZoneOrderIndex,
    validateOrderIndex: validateZoneOrderIndex,
    getNextOrderIndex: getNextZoneOrderIndex,
};

// ============================================================================
// DROPDOWN/SELECT OPTIONS
// ============================================================================

export const getZoneOptions = (zones: Zone[]) => {
    return zones
        .filter(zone => zone.is_active)
        .sort((a, b) => a.order_index - b.order_index)
        .map(zone => ({
            label: getZoneFullDisplayName(zone),
            value: zone.id,
            code: zone.code,
            name: zone.name,
        }));
};

export const getZoneSelectOptions = (zones: Zone[], includeInactive: boolean = false) => {
    const filteredZones = includeInactive ? zones : zones.filter(zone => zone.is_active);

    return filteredZones
        .sort((a, b) => a.order_index - b.order_index)
        .map(zone => ({
            label: zone.name,
            value: zone.id,
            code: zone.code,
            disabled: !zone.is_active,
        }));
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    // Validation
    validateZoneData,
    validateZoneFormData,

    // Search and filter
    searchZones,
    filterZonesByStatus,
    filterZonesByCode,
    filterZones,

    // Sort
    sortZones,

    // Order management
    getAvailableZoneOrderPositions,
    getSuggestedZoneOrderIndex,
    validateZoneOrderIndex,
    getNextZoneOrderIndex,

    // Statistics
    calculateZoneStats,

    // Data transformation
    enrichZoneWithDetails,
    getZoneDisplayName,
    getZoneCodeDisplayName,
    getZoneFullDisplayName,

    // Utilities
    findZoneById,
    findZoneByCode,
    findZoneByName,
    getActiveZones,
    getInactiveZones,
    getZonesByOrderRange,

    // Form helpers
    prepareZoneFormData,
    cleanZoneFormData,

    // Comparison
    compareZones,
    hasZoneChanged,

    // Business logic
    canDeleteZone,
    getZoneUsageInfo,

    // Options
    getZoneOptions,
    getZoneSelectOptions,

    // Utilities object
    zoneUtilities,
}; 