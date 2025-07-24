import { useCallback, useMemo } from 'react';
import { AdminManagement } from '@/types';
import {
    getAvailableZoneOrderPositions,
    validateZoneOrderIndex,
    getSuggestedZoneOrderIndex,
    validateZoneData,
    searchZones,
    filterZonesByStatus,
    sortZones,
    calculateZoneStats
} from '@/utils/zoneUtils';
import { useZoneStore } from '@/store';

type Zone = AdminManagement.Zone;
type ZoneFormData = AdminManagement.ZoneFormData;

interface UseZoneManagementReturn {
    // Data
    zones: Zone[];
    loading: boolean;

    // Computed data
    filteredZones: Zone[];
    sortedZones: Zone[];
    zoneStats: ReturnType<typeof calculateZoneStats>;

    // Actions
    // Zone CRUD
    loadZones: () => Promise<void>;
    getZone: (id: string) => Zone | undefined;
    createZone: (data: ZoneFormData) => Promise<void>;
    updateZone: (id: string, data: Partial<ZoneFormData>) => Promise<void>;
    deleteZone: (id: string) => Promise<void>;

    // Order Management Actions
    getAvailableZoneOrderOptions: () => { label: string; value: number }[];
    getSuggestedZoneOrder: () => number;
    validateZoneOrder: (orderIndex: number, excludeId?: string) => { isValid: boolean; error?: string };
    moveZone: (zoneId: string, newOrderIndex: number) => Promise<void>;
    reorderZones: (zoneOrders: { id: string; order_index: number }[]) => Promise<void>;

    // Validation
    validateZoneData: (data: Partial<ZoneFormData>) => { isValid: boolean; errors: Record<string, string> };

    // Search and Filter
    searchZones: (zones: Zone[], query: string) => Zone[];
    filterZonesByStatus: (zones: Zone[], isActive: boolean | null) => Zone[];
    sortZones: (zones: Zone[], sortBy: 'name' | 'code' | 'order_index' | 'created_at', order: 'asc' | 'desc') => Zone[];
}

export const useZoneManagement = (
    searchQuery: string = '',
    filterActive: boolean | null = null,
    sortBy: 'name' | 'code' | 'order_index' | 'created_at' = 'order_index',
    sortOrder: 'asc' | 'desc' = 'asc'
): UseZoneManagementReturn => {
    const {
        data: zones,
        loading,
        fetchAll: fetchZones,
        create: addZone,
        update: updateZoneStore,
        delete: deleteZoneStore,
        getZoneById: getZoneFromStore
    } = useZoneStore();

    // Computed data
    const filteredZones = useMemo(() => {
        let filtered = zones || [];

        // Apply search
        if (searchQuery.trim()) {
            filtered = searchZones(filtered, searchQuery);
        }

        // Apply status filter
        if (filterActive !== null) {
            filtered = filterZonesByStatus(filtered, filterActive);
        }

        return filtered;
    }, [zones, searchQuery, filterActive]);

    const sortedZones = useMemo(() => {
        return sortZones(filteredZones, sortBy, sortOrder);
    }, [filteredZones, sortBy, sortOrder]);

    const zoneStats = useMemo(() => {
        return calculateZoneStats(zones || []);
    }, [zones]);

    // Zone CRUD Actions
    const loadZones = useCallback(async () => {
        try {
            await fetchZones();
        } catch (error) {
            console.error('Error loading zones:', error);
            throw error;
        }
    }, [fetchZones]);

    const getZone = useCallback((id: string) => {
        return getZoneFromStore(id);
    }, [getZoneFromStore]);

    const createZone = useCallback(async (data: ZoneFormData) => {
        try {
            // Validate data before creating
            const validation = validateZoneData(data);
            if (!validation.isValid) {
                throw new Error(Object.values(validation.errors)[0]);
            }

            const enhancedData = {
                ...data,
                name: data.name.trim(),
                code: data.code.trim().toUpperCase(),
                description: data.description?.trim(),
                order_index: data.order_index || getSuggestedZoneOrderIndex(zones || []),
            };

            await addZone(enhancedData);
        } catch (error) {
            console.error('Error creating zone:', error);
            throw error;
        }
    }, [addZone, zones]);

    const updateZone = useCallback(async (id: string, data: Partial<ZoneFormData>) => {
        try {
            // Validate data if provided
            if (data.name !== undefined || data.code !== undefined) {
                const validation = validateZoneData(data);
                if (!validation.isValid) {
                    throw new Error(Object.values(validation.errors)[0]);
                }
            }

            // Clean string fields
            const cleanedData = { ...data };
            if (cleanedData.name) cleanedData.name = cleanedData.name.trim();
            if (cleanedData.code) cleanedData.code = cleanedData.code.trim().toUpperCase();
            if (cleanedData.description) cleanedData.description = cleanedData.description.trim();

            await updateZoneStore(id, cleanedData);
        } catch (error) {
            console.error('Error updating zone:', error);
            throw error;
        }
    }, [updateZoneStore]);

    const deleteZone = useCallback(async (id: string) => {
        try {
            await deleteZoneStore(id);
        } catch (error) {
            console.error('Error deleting zone:', error);
            throw error;
        }
    }, [deleteZoneStore]);

    // Order Management Methods
    const getAvailableZoneOrderOptions = useCallback(() => {
        return getAvailableZoneOrderPositions(zones || []);
    }, [zones]);

    const getSuggestedZoneOrder = useCallback(() => {
        return getSuggestedZoneOrderIndex(zones || []);
    }, [zones]);

    const validateZoneOrder = useCallback((orderIndex: number, excludeId?: string) => {
        return validateZoneOrderIndex(orderIndex, zones || [], excludeId);
    }, [zones]);

    const moveZone = useCallback(async (zoneId: string, newOrderIndex: number) => {
        try {
            const validation = validateZoneOrder(newOrderIndex, zoneId);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            await updateZone(zoneId, { order_index: newOrderIndex });
            await loadZones(); // Refresh to get updated order
        } catch (error) {
            console.error('Error moving zone:', error);
            throw error;
        }
    }, [updateZone, loadZones, validateZoneOrder]);

    const reorderZones = useCallback(async (zoneOrders: { id: string; order_index: number }[]) => {
        try {
            // Validate all order indices
            for (const zoneOrder of zoneOrders) {
                const validation = validateZoneOrder(zoneOrder.order_index, zoneOrder.id);
                if (!validation.isValid) {
                    throw new Error(`Invalid order for zone: ${validation.error}`);
                }
            }

            // Update all zones
            const updatePromises = zoneOrders.map(zoneOrder =>
                updateZone(zoneOrder.id, { order_index: zoneOrder.order_index })
            );

            await Promise.all(updatePromises);
            await loadZones(); // Refresh to get updated order
        } catch (error) {
            console.error('Error reordering zones:', error);
            throw error;
        }
    }, [updateZone, loadZones, validateZoneOrder]);

    // Validation
    const validateZoneDataCallback = useCallback((data: Partial<ZoneFormData>) => {
        return validateZoneData(data);
    }, []);

    // Search and Filter Actions (exposed for external use)
    const searchZonesCallback = useCallback((zones: Zone[], query: string) => {
        return searchZones(zones, query);
    }, []);

    const filterZonesByStatusCallback = useCallback((zones: Zone[], isActive: boolean | null) => {
        return filterZonesByStatus(zones, isActive);
    }, []);

    const sortZonesCallback = useCallback((zones: Zone[], sortBy: 'name' | 'code' | 'order_index' | 'created_at', order: 'asc' | 'desc') => {
        return sortZones(zones, sortBy, order);
    }, []);

    return {
        // Data
        zones: zones || [],
        loading: loading?.zones || false,

        // Computed data
        filteredZones,
        sortedZones,
        zoneStats,

        // Zone CRUD Actions
        loadZones,
        getZone,
        createZone,
        updateZone,
        deleteZone,

        // Order Management Actions
        getAvailableZoneOrderOptions,
        getSuggestedZoneOrder,
        validateZoneOrder,
        moveZone,
        reorderZones,

        // Validation
        validateZoneData: validateZoneDataCallback,

        // Search and Filter Actions
        searchZones: searchZonesCallback,
        filterZonesByStatus: filterZonesByStatusCallback,
        sortZones: sortZonesCallback,
    };
}; 