import { Zone, ZoneFormData, ValidationError } from '@/types/content';

// Zone validation
export const validateZoneForm = (data: ZoneFormData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Name validation
    if (!data.name?.trim()) {
        errors.push({ field: 'name', message: 'Zone name is required' });
    } else if (data.name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Zone name must be at least 2 characters' });
    } else if (data.name.trim().length > 100) {
        errors.push({ field: 'name', message: 'Zone name must be less than 100 characters' });
    }

    // Code validation
    if (!data.code?.trim()) {
        errors.push({ field: 'code', message: 'Zone code is required' });
    } else if (data.code.trim().length < 2) {
        errors.push({ field: 'code', message: 'Zone code must be at least 2 characters' });
    } else if (data.code.trim().length > 10) {
        errors.push({ field: 'code', message: 'Zone code must be less than 10 characters' });
    } else if (!/^[A-Z0-9_-]+$/i.test(data.code.trim())) {
        errors.push({ field: 'code', message: 'Zone code can only contain letters, numbers, underscores, and hyphens' });
    }

    // Description validation
    if (data.description && data.description.length > 500) {
        errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
    }



    // Order index validation
    if (data.order_index < 0) {
        errors.push({ field: 'order_index', message: 'Order index must be 0 or greater' });
    }

    return errors;
};

// Zone formatting utilities
export const formatZoneName = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export const formatZoneCode = (code: string): string => {
    return code.toUpperCase().trim();
};

// Zone search and filtering
export const searchZones = (zones: Zone[], query: string): Zone[] => {
    if (!query.trim()) return zones;

    const lowerQuery = query.toLowerCase();
    return zones.filter(zone =>
        zone.name.toLowerCase().includes(lowerQuery) ||
        zone.code.toLowerCase().includes(lowerQuery) ||
        (zone.description && zone.description.toLowerCase().includes(lowerQuery))
    );
};

export const filterZonesByStatus = (zones: Zone[], isActive?: boolean | null): Zone[] => {
    if (isActive === undefined || isActive === null) return zones;
    return zones.filter(zone => zone.is_active === isActive);
};

export const sortZones = (
    zones: Zone[],
    sortBy: 'name' | 'code' | 'order_index' | 'created_at',
    sortOrder: 'asc' | 'desc'
): Zone[] => {
    return [...zones].sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];

        if (sortBy === 'created_at') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (sortBy === 'order_index') {
            aValue = Number(aValue);
            bValue = Number(bValue);
        } else {
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
};

// Zone statistics
export const calculateZoneStats = (zones: Zone[]) => {
    const total = zones.length;
    const active = zones.filter(zone => zone.is_active).length;
    const inactive = total - active;
    const withIslands = zones.filter(zone => (zone.total_islands || 0) > 0).length;

    return {
        total,
        active,
        inactive,
        withIslands,
        activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
        withIslandsPercentage: total > 0 ? Math.round((withIslands / total) * 100) : 0,
    };
};



// Zone comparison for changes
export const compareZones = (original: Zone, updated: ZoneFormData) => {
    const changes: Record<string, { from: any; to: any }> = {};

    if (original.name !== updated.name) {
        changes.name = { from: original.name, to: updated.name };
    }
    if (original.code !== updated.code) {
        changes.code = { from: original.code, to: updated.code };
    }
    if (original.description !== updated.description) {
        changes.description = { from: original.description, to: updated.description };
    }

    if (original.is_active !== updated.is_active) {
        changes.is_active = { from: original.is_active, to: updated.is_active };
    }
    if (original.order_index !== updated.order_index) {
        changes.order_index = { from: original.order_index, to: updated.order_index };
    }

    return changes;
};

// Zone export utilities
export const exportZonesToCSV = (zones: Zone[]): string => {
    const headers = ['ID', 'Name', 'Code', 'Description', 'Active', 'Order', 'Total Islands', 'Active Islands', 'Created At'];
    const rows = zones.map(zone => [
        zone.id,
        zone.name,
        zone.code,
        zone.description || '',
        zone.is_active ? 'Yes' : 'No',
        zone.order_index.toString(),
        (zone.total_islands || 0).toString(),
        (zone.active_islands || 0).toString(),
        new Date(zone.created_at).toLocaleDateString(),
    ]);

    return [headers, ...rows].map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
};

// Zone default data
export const createDefaultZoneFormData = (): ZoneFormData => ({
    name: '',
    code: '',
    description: '',

    is_active: true,
    order_index: 0,
});

// Zone form data conversion
export const zoneToFormData = (zone: Zone): ZoneFormData => ({
    name: zone.name,
    code: zone.code,
    description: zone.description || '',
    is_active: zone.is_active,
    order_index: zone.order_index,
});

// Zone duplicate checking
export const isDuplicateZoneName = (zones: Zone[], name: string, excludeId?: string): boolean => {
    return zones.some(zone =>
        zone.id !== excludeId &&
        zone.name.toLowerCase() === name.toLowerCase()
    );
};

export const isDuplicateZoneCode = (zones: Zone[], code: string, excludeId?: string): boolean => {
    return zones.some(zone =>
        zone.id !== excludeId &&
        zone.code.toLowerCase() === code.toLowerCase()
    );
};

// Zone activity log formatting
export const formatZoneActivity = (activity: any) => {
    const actions: Record<string, string> = {
        'created': 'Zone created',
        'updated': 'Zone updated',
        'activated': 'Zone activated',
        'deactivated': 'Zone deactivated',
        'deleted': 'Zone deleted',
    };

    return {
        ...activity,
        actionLabel: actions[activity.action] || activity.action,
        timeAgo: formatTimeAgo(activity.created_at),
    };
};

const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
};

/**
 * Get next order index for zone
 */
export const getNextZoneOrderIndex = (zones: Zone[]): number => {
    if (zones.length === 0) return 0;

    const maxOrder = Math.max(...zones.map(zone => zone.order_index));
    return maxOrder + 1;
};

/**
 * Get available order positions for zones
 */
export const getAvailableZoneOrderPositions = (zones: Zone[]): { label: string; value: number }[] => {
    const positions = [];

    // Sort zones by their current order
    const sortedZones = [...zones].sort((a, b) => a.order_index - b.order_index);

    // Add "First position" option
    positions.push({
        label: "1. First position",
        value: 0
    });

    // Add positions after each existing zone
    sortedZones.forEach((zone, index) => {
        positions.push({
            label: `${index + 2}. After "${zone.name}"`,
            value: index + 1
        });
    });

    return positions;
};

/**
 * Validate order index for zone
 */
export const validateZoneOrderIndex = (
    orderIndex: number,
    zones: Zone[],
    excludeId?: string
): { isValid: boolean; error?: string } => {
    if (orderIndex < 0) {
        return { isValid: false, error: 'Order index must be 0 or greater' };
    }

    const filteredZones = excludeId
        ? zones.filter(zone => zone.id !== excludeId)
        : zones;

    const maxOrder = filteredZones.length > 0
        ? Math.max(...filteredZones.map(zone => zone.order_index))
        : -1;

    if (orderIndex > maxOrder + 1) {
        return { isValid: false, error: `Order index cannot be greater than ${maxOrder + 2}` };
    }

    return { isValid: true };
};

/**
 * Get suggested order index for new zone
 */
export const getSuggestedZoneOrderIndex = (zones: Zone[]): number => {
    return getNextZoneOrderIndex(zones);
};

/**
 * Reorder zones locally (for optimistic updates)
 */
export const reorderZonesLocally = (
    zones: Zone[],
    movedZoneId: string,
    newOrderIndex: number
): Zone[] => {
    const movedZone = zones.find(zone => zone.id === movedZoneId);
    if (!movedZone) return zones;

    const otherZones = zones.filter(zone => zone.id !== movedZoneId);

    // Adjust order indices for other zones
    const adjustedZones = otherZones.map(zone => {
        if (zone.order_index >= newOrderIndex) {
            return { ...zone, order_index: zone.order_index + 1 };
        }
        return zone;
    });

    // Add the moved zone with new order index
    const updatedZones = [
        ...adjustedZones,
        { ...movedZone, order_index: newOrderIndex }
    ];

    return updatedZones.sort((a, b) => a.order_index - b.order_index);
};

/**
 * Validate zone data for creation/update
 */
export const validateZoneData = (data: Partial<{ name: string; code: string; order_index: number }>): {
    isValid: boolean;
    errors: Record<string, string>;
} => {
    const errors: Record<string, string> = {};

    if (data.name !== undefined) {
        if (!data.name.trim()) {
            errors.name = 'Zone name is required';
        } else if (data.name.trim().length < 2) {
            errors.name = 'Zone name must be at least 2 characters long';
        } else if (data.name.trim().length > 100) {
            errors.name = 'Zone name must be less than 100 characters';
        }
    }

    if (data.code !== undefined) {
        if (!data.code.trim()) {
            errors.code = 'Zone code is required';
        } else if (data.code.trim().length < 2) {
            errors.code = 'Zone code must be at least 2 characters long';
        } else if (data.code.trim().length > 10) {
            errors.code = 'Zone code must be less than 10 characters';
        }
    }

    if (data.order_index !== undefined && data.order_index < 0) {
        errors.order_index = 'Order index must be 0 or greater';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}; 