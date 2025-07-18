import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';

type Island = AdminManagement.Island;
type IslandFormData = AdminManagement.IslandFormData;
type IslandWithDetails = AdminManagement.IslandWithDetails;

// ============================================================================
// ISLAND SERVICE - CONSISTENT DATA OPERATIONS
// ============================================================================

/**
 * Fetch all islands with zone information and statistics
 */
export const fetchIslands = async (): Promise<Island[]> => {
    try {
        const { data, error } = await supabase
            .from('islands_with_zones')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching islands:', error);
            throw error;
        }

        return (data || []).map(processIslandData);
    } catch (error) {
        console.error('Failed to fetch islands:', error);
        throw error;
    }
};

/**
 * Fetch a single island by ID with detailed information
 */
export const fetchIsland = async (id: string): Promise<Island | null> => {
    try {
        const { data, error } = await supabase
            .from('islands_with_zones')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            console.error('Error fetching island:', error);
            throw error;
        }

        return data ? processIslandData(data) : null;
    } catch (error) {
        console.error('Failed to fetch island:', error);
        throw error;
    }
};

/**
 * Fetch islands by zone ID
 */
export const fetchIslandsByZone = async (zoneId: string): Promise<Island[]> => {
    try {
        const { data, error } = await supabase
            .from('islands_with_zones')
            .select('*')
            .eq('zone_id', zoneId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching islands by zone:', error);
            throw error;
        }

        return (data || []).map(processIslandData);
    } catch (error) {
        console.error('Failed to fetch islands by zone:', error);
        throw error;
    }
};

/**
 * Fetch island with detailed statistics
 */
export const fetchIslandDetails = async (id: string): Promise<IslandWithDetails | null> => {
    try {
        // First get the basic island data
        const island = await fetchIsland(id);
        if (!island) return null;

        // Then fetch additional route statistics
        const { data: routeStats, error: routeError } = await supabase
            .from('routes')
            .select('id, is_active')
            .or(`from_island_id.eq.${id},to_island_id.eq.${id}`);

        if (routeError) {
            console.warn('Error fetching route statistics:', routeError);
        }

        const routeCount = routeStats ? routeStats.length : 0;

        return {
            ...island,
            zone_info: island.zone_info || {
                id: '',
                name: island.zone,
                code: '',
                description: '',
                is_active: true,
            },
            route_count: routeCount,
        } as IslandWithDetails;
    } catch (error) {
        console.error('Failed to fetch island details:', error);
        throw error;
    }
};

/**
 * Create a new island
 */
export const createIsland = async (islandData: IslandFormData): Promise<Island> => {
    try {
        const { data, error } = await supabase
            .from('islands')
            .insert([{
                name: islandData.name.trim(),
                zone_id: islandData.zone_id,
                zone: islandData.zone || islandData.name, // Backward compatibility
                is_active: islandData.is_active,
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating island:', error);
            throw error;
        }

        return processIslandData(data);
    } catch (error) {
        console.error('Failed to create island:', error);
        throw error;
    }
};

/**
 * Update an existing island
 */
export const updateIsland = async (id: string, updates: Partial<IslandFormData>): Promise<Island> => {
    try {
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name.trim();
        if (updates.zone_id !== undefined) updateData.zone_id = updates.zone_id;
        if (updates.zone !== undefined) updateData.zone = updates.zone;
        if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

        const { data, error } = await supabase
            .from('islands')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating island:', error);
            throw error;
        }

        return processIslandData(data);
    } catch (error) {
        console.error('Failed to update island:', error);
        throw error;
    }
};

/**
 * Delete an island
 */
export const deleteIsland = async (id: string): Promise<void> => {
    try {
        // Check if island has routes
        const { data: routes, error: routeCheckError } = await supabase
            .from('routes')
            .select('id')
            .or(`from_island_id.eq.${id},to_island_id.eq.${id}`)
            .limit(1);

        if (routeCheckError) {
            console.error('Error checking island routes:', routeCheckError);
            throw routeCheckError;
        }

        if (routes && routes.length > 0) {
            throw new Error('Cannot delete island that has routes. Please delete the routes first.');
        }

        const { error } = await supabase
            .from('islands')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting island:', error);
            throw error;
        }
    } catch (error) {
        console.error('Failed to delete island:', error);
        throw error;
    }
};

/**
 * Bulk update islands
 */
export const bulkUpdateIslands = async (updates: { id: string; data: Partial<IslandFormData> }[]): Promise<Island[]> => {
    try {
        const updatePromises = updates.map(update => updateIsland(update.id, update.data));
        return await Promise.all(updatePromises);
    } catch (error) {
        console.error('Failed to bulk update islands:', error);
        throw error;
    }
};

/**
 * Bulk delete islands
 */
export const bulkDeleteIslands = async (ids: string[]): Promise<void> => {
    try {
        // Check if any islands have routes
        const { data: routes, error: routeCheckError } = await supabase
            .from('routes')
            .select('id, from_island_id, to_island_id')
            .or(ids.map(id => `from_island_id.eq.${id},to_island_id.eq.${id}`).join(','));

        if (routeCheckError) {
            console.error('Error checking island routes:', routeCheckError);
            throw routeCheckError;
        }

        if (routes && routes.length > 0) {
            const routeIslandIds = new Set([
                ...routes.map(r => r.from_island_id),
                ...routes.map(r => r.to_island_id)
            ]);
            const conflictingIds = ids.filter(id => routeIslandIds.has(id));

            if (conflictingIds.length > 0) {
                throw new Error(`Cannot delete islands that have routes. Islands with routes: ${conflictingIds.join(', ')}`);
            }
        }

        const { error } = await supabase
            .from('islands')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Error bulk deleting islands:', error);
            throw error;
        }
    } catch (error) {
        console.error('Failed to bulk delete islands:', error);
        throw error;
    }
};

/**
 * Check if an island name already exists
 */
export const checkIslandNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
    try {
        let query = supabase
            .from('islands')
            .select('id')
            .ilike('name', name)
            .limit(1);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error checking island name:', error);
            throw error;
        }

        return data && data.length > 0;
    } catch (error) {
        console.error('Failed to check island name:', error);
        throw error;
    }
};

/**
 * Get island usage statistics
 */
export const getIslandUsageStats = async (id: string): Promise<{
    routeCount: number;
    activeRouteCount: number;
    tripCount: number;
    bookingCount: number;
    canDelete: boolean;
    usageDetails: string[];
}> => {
    try {
        // Get route statistics
        const { data: routes, error: routeError } = await supabase
            .from('routes')
            .select('id, is_active')
            .or(`from_island_id.eq.${id},to_island_id.eq.${id}`);

        if (routeError) {
            console.error('Error fetching route stats:', routeError);
            throw routeError;
        }

        const routeCount = routes ? routes.length : 0;
        const activeRouteCount = routes ? routes.filter(r => r.is_active).length : 0;

        // Get trip and booking statistics (simplified for now)
        const tripCount = 0; // Would need to join through routes to trips
        const bookingCount = 0; // Would need to join through routes to trips to bookings

        const usageDetails = [];
        if (routeCount > 0) {
            usageDetails.push(`${routeCount} route${routeCount > 1 ? 's' : ''} (${activeRouteCount} active)`);
        }

        return {
            routeCount,
            activeRouteCount,
            tripCount,
            bookingCount,
            canDelete: routeCount === 0,
            usageDetails,
        };
    } catch (error) {
        console.error('Failed to get island usage stats:', error);
        throw error;
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Process raw island data from database
 */
const processIslandData = (island: any): Island => ({
    id: island.id,
    name: island.name,
    zone: island.zone || island.old_zone_text || '',
    zone_id: island.zone_id,
    is_active: island.is_active ?? true,
    created_at: island.created_at,
    updated_at: island.updated_at || island.created_at,
    zone_info: island.zone_id ? {
        id: island.zone_id,
        name: island.zone_name || island.zone || '',
        code: island.zone_code || '',
        description: island.zone_description || '',
        is_active: island.zone_is_active ?? true,
    } : null,
    // Statistics (these would come from enhanced views)
    total_routes: island.total_routes || 0,
    active_routes: island.active_routes || 0,
    total_trips_30d: island.total_trips_30d || 0,
    total_bookings_30d: island.total_bookings_30d || 0,
    total_revenue_30d: island.total_revenue_30d || 0,
});

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    fetchIslands,
    fetchIsland,
    fetchIslandsByZone,
    fetchIslandDetails,
    createIsland,
    updateIsland,
    deleteIsland,
    bulkUpdateIslands,
    bulkDeleteIslands,
    checkIslandNameExists,
    getIslandUsageStats,
}; 