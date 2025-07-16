import { supabase } from './supabase';
import { Zone, ZoneFormData, ZoneActivityLog } from '@/types/content';

// Fetch all zones with statistics
export const fetchZones = async (): Promise<Zone[]> => {
    try {
        const { data, error } = await supabase
            .from('zones_stats_view')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            console.error('Error fetching zones:', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch zones:', error);
        throw error;
    }
};

// Fetch a single zone by ID
export const fetchZone = async (id: string): Promise<Zone | null> => {
    try {
        const { data, error } = await supabase
            .from('zones_stats_view')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Zone not found
            }
            console.error('Error fetching zone:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Failed to fetch zone:', error);
        throw error;
    }
};

// Create a new zone
export const createZone = async (zoneData: ZoneFormData): Promise<Zone> => {
    try {
        const { data, error } = await supabase
            .from('zones')
            .insert([zoneData])
            .select()
            .single();

        if (error) {
            console.error('Error creating zone:', error);
            throw error;
        }

        // Log the activity
        await logZoneActivity(data.id, 'created', null, zoneData);

        return data;
    } catch (error) {
        console.error('Failed to create zone:', error);
        throw error;
    }
};

// Update an existing zone
export const updateZone = async (id: string, updates: Partial<ZoneFormData>): Promise<Zone> => {
    try {
        // First get the current zone data for logging
        const { data: currentZone } = await supabase
            .from('zones')
            .select('*')
            .eq('id', id)
            .single();

        const { data, error } = await supabase
            .from('zones')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating zone:', error);
            throw error;
        }

        // Log the activity
        await logZoneActivity(id, 'updated', currentZone, updates);

        return data;
    } catch (error) {
        console.error('Failed to update zone:', error);
        throw error;
    }
};

// Delete a zone
export const deleteZone = async (id: string): Promise<void> => {
    try {
        // First get the zone data for logging
        const { data: zoneToDelete } = await supabase
            .from('zones')
            .select('*')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('zones')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting zone:', error);
            throw error;
        }

        // Log the activity
        if (zoneToDelete) {
            await logZoneActivity(id, 'deleted', zoneToDelete, null);
        }
    } catch (error) {
        console.error('Failed to delete zone:', error);
        throw error;
    }
};

// Toggle zone active status
export const toggleZoneStatus = async (id: string, isActive: boolean): Promise<Zone> => {
    try {
        const { data, error } = await supabase
            .from('zones')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error toggling zone status:', error);
            throw error;
        }

        // Log the activity
        await logZoneActivity(id, isActive ? 'activated' : 'deactivated', null, { is_active: isActive });

        return data;
    } catch (error) {
        console.error('Failed to toggle zone status:', error);
        throw error;
    }
};

// Get zone activity logs
export const getZoneActivityLogs = async (zoneId: string): Promise<ZoneActivityLog[]> => {
    try {
        const { data, error } = await supabase
            .from('zone_activity_logs')
            .select(`
        *,
        changed_by_user:user_profiles!zone_activity_logs_changed_by_fkey(full_name, email)
      `)
            .eq('zone_id', zoneId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching zone activity logs:', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Failed to fetch zone activity logs:', error);
        throw error;
    }
};

// Helper function to log zone activities
const logZoneActivity = async (
    zoneId: string,
    action: string,
    oldValues: any,
    newValues: any
): Promise<void> => {
    try {
        // Get current user ID from the session
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('No user found for activity logging');
            return;
        }

        await supabase
            .from('zone_activity_logs')
            .insert([{
                zone_id: zoneId,
                action,
                old_values: oldValues,
                new_values: newValues,
                changed_by: user.id,
            }]);
    } catch (error) {
        console.warn('Failed to log zone activity:', error);
        // Don't throw here as it's not critical
    }
};

// Reorder zones
export const reorderZones = async (zoneIds: string[]): Promise<void> => {
    try {
        const updates = zoneIds.map((id, index) => ({
            id,
            order_index: index,
        }));

        for (const update of updates) {
            await supabase
                .from('zones')
                .update({ order_index: update.order_index })
                .eq('id', update.id);
        }
    } catch (error) {
        console.error('Failed to reorder zones:', error);
        throw error;
    }
};

// Bulk operations
export const bulkUpdateZones = async (updates: { id: string; updates: Partial<ZoneFormData> }[]): Promise<void> => {
    try {
        for (const update of updates) {
            await updateZone(update.id, update.updates);
        }
    } catch (error) {
        console.error('Failed to bulk update zones:', error);
        throw error;
    }
};

export const bulkDeleteZones = async (ids: string[]): Promise<void> => {
    try {
        for (const id of ids) {
            await deleteZone(id);
        }
    } catch (error) {
        console.error('Failed to bulk delete zones:', error);
        throw error;
    }
};

// Export zones to CSV
export const exportZonesToCSV = async (): Promise<string> => {
    try {
        const zones = await fetchZones();

        const headers = [
            'ID', 'Name', 'Code', 'Description',
            'Active', 'Order', 'Total Islands', 'Active Islands',
            'Total Routes', 'Active Routes', 'Created At', 'Updated At'
        ];

        const rows = zones.map(zone => [
            zone.id,
            zone.name,
            zone.code,
            zone.description || '',
            zone.is_active ? 'Yes' : 'No',
            zone.order_index.toString(),
            (zone.total_islands || 0).toString(),
            (zone.active_islands || 0).toString(),
            (zone.total_routes || 0).toString(),
            (zone.active_routes || 0).toString(),
            new Date(zone.created_at).toLocaleDateString(),
            new Date(zone.updated_at).toLocaleDateString(),
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            .join('\n');
    } catch (error) {
        console.error('Failed to export zones:', error);
        throw error;
    }
};

// Check if zone name or code already exists
export const checkZoneExists = async (name: string, code: string, excludeId?: string): Promise<{ nameExists: boolean; codeExists: boolean }> => {
    try {
        let query = supabase
            .from('zones')
            .select('id, name, code');

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error checking zone existence:', error);
            throw error;
        }

        const nameExists = data?.some(zone => zone.name.toLowerCase() === name.toLowerCase()) || false;
        const codeExists = data?.some(zone => zone.code.toLowerCase() === code.toLowerCase()) || false;

        return { nameExists, codeExists };
    } catch (error) {
        console.error('Failed to check zone existence:', error);
        throw error;
    }
}; 