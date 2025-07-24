import { supabase } from './supabase';
import { Zone, ZoneFormData, ZoneActivityLog } from '@/types/admin/management';

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

        // Activity logging is handled automatically by database triggers
        return data;
    } catch (error) {
        console.error('Failed to create zone:', error);
        throw error;
    }
};

// Update an existing zone
export const updateZone = async (id: string, updates: Partial<ZoneFormData>): Promise<Zone> => {
    try {
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

        // Activity logging is handled automatically by database triggers
        return data;
    } catch (error) {
        console.error('Failed to update zone:', error);
        throw error;
    }
};

// Delete a zone
export const deleteZone = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('zones')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting zone:', error);
            throw error;
        }

        // Activity logging is handled automatically by database triggers
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

        // Activity logging is handled automatically by database triggers
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
        user:user_profiles!zone_activity_logs_user_id_fkey(full_name, email)
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

// Reorder zones
export const reorderZones = async (zoneUpdates: { id: string; order_index: number }[]): Promise<void> => {
    try {
        const { error } = await supabase.rpc('reorder_zones', {
            zone_updates: zoneUpdates
        });

        if (error) {
            console.error('Error reordering zones:', error);
            throw error;
        }
    } catch (error) {
        console.error('Failed to reorder zones:', error);
        throw error;
    }
};

// Bulk update zones
export const bulkUpdateZones = async (zoneUpdates: { id: string; updates: Partial<ZoneFormData> }[]): Promise<void> => {
    try {
        // Process updates one by one to maintain data integrity
        for (const { id, updates } of zoneUpdates) {
            await updateZone(id, updates);
        }
    } catch (error) {
        console.error('Failed to bulk update zones:', error);
        throw error;
    }
};

// Bulk delete zones
export const bulkDeleteZones = async (zoneIds: string[]): Promise<void> => {
    try {
        const { error } = await supabase
            .from('zones')
            .delete()
            .in('id', zoneIds);

        if (error) {
            console.error('Error bulk deleting zones:', error);
            throw error;
        }
    } catch (error) {
        console.error('Failed to bulk delete zones:', error);
        throw error;
    }
};

// Import zones from CSV
export const importZonesFromCSV = async (csvData: string): Promise<{ success: number; errors: string[] }> => {
    try {
        const lines = csvData.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const dataLines = lines.slice(1);

        const results = { success: 0, errors: [] as string[] };

        for (let i = 0; i < dataLines.length; i++) {
            try {
                const values = dataLines[i].split(',').map(v => v.replace(/"/g, '').trim());
                const zoneData: ZoneFormData = {
                    name: values[headers.indexOf('name')] || values[headers.indexOf('Name')] || '',
                    code: values[headers.indexOf('code')] || values[headers.indexOf('Code')] || '',
                    description: values[headers.indexOf('description')] || values[headers.indexOf('Description')] || '',
                    is_active: (values[headers.indexOf('is_active')] || values[headers.indexOf('Active')] || 'true').toLowerCase() === 'true',
                    order_index: parseInt(values[headers.indexOf('order_index')] || values[headers.indexOf('Order')] || '0') || 0,
                };

                await createZone(zoneData);
                results.success++;
            } catch (error) {
                results.errors.push(`Line ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return results;
    } catch (error) {
        console.error('Failed to import zones:', error);
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