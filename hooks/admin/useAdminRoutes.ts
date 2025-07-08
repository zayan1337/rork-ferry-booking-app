import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { AdminRoute, AdminIsland, AdminPagination } from '@/types/admin';
import { useAdminRoutesStore } from '@/store/admin/adminRoutesStore';

interface RouteFilters {
    status?: boolean;
    from_island_id?: string;
    to_island_id?: string;
    search?: string;
}

interface CreateRouteData {
    from_island_id: string;
    to_island_id: string;
    base_fare: number;
    is_active?: boolean;
}

interface UpdateRouteData {
    from_island_id?: string;
    to_island_id?: string;
    base_fare?: number;
    is_active?: boolean;
}

interface UseAdminRoutesReturn {
    routes: AdminRoute[];
    islands: AdminIsland[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    fetchRoutes: (filters?: RouteFilters, page?: number, limit?: number) => Promise<void>;
    fetchIslands: () => Promise<void>;
    createRoute: (routeData: CreateRouteData) => Promise<boolean>;
    updateRoute: (routeId: string, updates: UpdateRouteData) => Promise<boolean>;
    deleteRoute: (routeId: string) => Promise<boolean>;
    getRouteDetails: (routeId: string) => Promise<AdminRoute | null>;
    refreshRoutes: () => Promise<void>;
}

export const useAdminRoutes = (): UseAdminRoutesReturn => {
    const {
        routes,
        islands,
        loading,
        error,
        pagination,
        filters: currentFilters,
        setRoutes,
        setIslands,
        setLoading,
        setError,
        setPagination,
        setFilters,
        updateRoute: updateRouteInStore,
        removeRoute,
        addRoute,
        clearState
    } = useAdminRoutesStore();

    const fetchIslands = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('islands')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            
            const transformedIslands: AdminIsland[] = (data || []).map(island => ({
                id: island.id,
                name: island.name,
                zone: island.zone,
                is_active: island.is_active,
                created_at: island.created_at
            }));
            
            setIslands(transformedIslands);
        } catch (err) {
            console.error('Error fetching islands:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch islands');
        }
    }, [setIslands, setError]);

    const fetchRoutes = useCallback(async (
        filters: RouteFilters = {},
        page = 1,
        limit = 20
    ) => {
        try {
            setLoading(true);
            setError(null);
            setFilters(filters);

            // Build the query with joined island data
            let query = supabase
                .from('routes')
                .select(`
                    *,
                    from_island:islands!routes_from_island_id_fkey (
                        name,
                        zone
                    ),
                    to_island:islands!routes_to_island_id_fkey (
                        name,
                        zone
                    )
                `, { count: 'exact' });

            // Apply filters
            if (filters.status !== undefined) {
                query = query.eq('is_active', filters.status);
            }

            if (filters.from_island_id) {
                query = query.eq('from_island_id', filters.from_island_id);
            }

            if (filters.to_island_id) {
                query = query.eq('to_island_id', filters.to_island_id);
            }

            // Search functionality - search in island names
            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                // Get islands that match the search term first
                const { data: matchingIslands } = await supabase
                    .from('islands')
                    .select('id')
                    .ilike('name', searchTerm);

                if (matchingIslands && matchingIslands.length > 0) {
                    const islandIds = matchingIslands.map(island => island.id);
                    query = query.or(`from_island_id.in.(${islandIds.join(',')}),to_island_id.in.(${islandIds.join(',')})`);
                } else {
                    // No matching islands found, return empty result
                    setRoutes([]);
                    setPagination({ page, limit, total: 0, total_pages: 0 });
                    setLoading(false);
                    return;
                }
            }

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            // Order by creation date (newest first)
            query = query.order('created_at', { ascending: false });

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            // Transform data to include computed fields
            const transformedRoutes: AdminRoute[] = (data || []).map((route: any) => {
                const fromIsland = Array.isArray(route.from_island) ? route.from_island[0] : route.from_island;
                const toIsland = Array.isArray(route.to_island) ? route.to_island[0] : route.to_island;
                
                return {
                    id: route.id,
                    from_island_id: route.from_island_id,
                    to_island_id: route.to_island_id,
                    base_fare: route.base_fare,
                    is_active: route.is_active,
                    created_at: route.created_at,
                    from_island_name: fromIsland?.name || '',
                    to_island_name: toIsland?.name || '',
                    from_island_zone: fromIsland?.zone || 'A',
                    to_island_zone: toIsland?.zone || 'A',
                    route_name: `${fromIsland?.name || 'Unknown'} to ${toIsland?.name || 'Unknown'}`,
                    distance: calculateDistance(fromIsland?.name, toIsland?.name),
                    duration: calculateDuration(fromIsland?.name, toIsland?.name)
                };
            });

            setRoutes(transformedRoutes);
            setPagination({
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit)
            });

        } catch (err) {
            console.error('Error fetching routes:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch routes');
        } finally {
            setLoading(false);
        }
    }, [setRoutes, setLoading, setError, setPagination, setFilters]);

    const createRoute = useCallback(async (routeData: CreateRouteData): Promise<boolean> => {
        try {
            setError(null);

            // Validate that from and to islands are different
            if (routeData.from_island_id === routeData.to_island_id) {
                throw new Error('From and to islands must be different');
            }

            // Check if route already exists (in either direction)
            const { data: existingRoutes } = await supabase
                .from('routes')
                .select('id')
                .or(`
                    and(from_island_id.eq.${routeData.from_island_id},to_island_id.eq.${routeData.to_island_id}),
                    and(from_island_id.eq.${routeData.to_island_id},to_island_id.eq.${routeData.from_island_id})
                `);

            if (existingRoutes && existingRoutes.length > 0) {
                throw new Error('A route between these islands already exists');
            }

            const { data, error } = await supabase
                .from('routes')
                .insert([{
                    from_island_id: routeData.from_island_id,
                    to_island_id: routeData.to_island_id,
                    base_fare: routeData.base_fare,
                    is_active: routeData.is_active ?? true
                }])
                .select(`
                    *,
                    from_island:islands!routes_from_island_id_fkey (name, zone),
                    to_island:islands!routes_to_island_id_fkey (name, zone)
                `)
                .single();

            if (error) throw error;

            // Transform and add to local state
            const fromIsland = Array.isArray(data.from_island) ? data.from_island[0] : data.from_island;
            const toIsland = Array.isArray(data.to_island) ? data.to_island[0] : data.to_island;
            
            const newRoute: AdminRoute = {
                id: data.id,
                from_island_id: data.from_island_id,
                to_island_id: data.to_island_id,
                base_fare: data.base_fare,
                is_active: data.is_active,
                created_at: data.created_at,
                from_island_name: fromIsland?.name || '',
                to_island_name: toIsland?.name || '',
                from_island_zone: fromIsland?.zone || 'A',
                to_island_zone: toIsland?.zone || 'A',
                route_name: `${fromIsland?.name || 'Unknown'} to ${toIsland?.name || 'Unknown'}`,
                distance: calculateDistance(fromIsland?.name, toIsland?.name),
                duration: calculateDuration(fromIsland?.name, toIsland?.name)
            };

            addRoute(newRoute);

            return true;
        } catch (err) {
            console.error('Error creating route:', err);
            setError(err instanceof Error ? err.message : 'Failed to create route');
            return false;
        }
    }, [addRoute, setError]);

    const updateRoute = useCallback(async (
        routeId: string,
        updates: UpdateRouteData
    ): Promise<boolean> => {
        try {
            setError(null);

            // Validate that from and to islands are different if both are being updated
            if (updates.from_island_id && updates.to_island_id && 
                updates.from_island_id === updates.to_island_id) {
                throw new Error('From and to islands must be different');
            }

            const { error } = await supabase
                .from('routes')
                .update(updates)
                .eq('id', routeId);

            if (error) throw error;

            // Get updated island names if island IDs were changed
            let updatedRoute: Partial<AdminRoute> = { ...updates };
            
            if (updates.from_island_id || updates.to_island_id) {
                const islandIds = [updates.from_island_id, updates.to_island_id].filter(Boolean);
                const { data: islandsData } = await supabase
                    .from('islands')
                    .select('id, name, zone')
                    .in('id', islandIds);

                const islandsMap = (islandsData || []).reduce((acc, island) => {
                    acc[island.id] = island;
                    return acc;
                }, {} as { [key: string]: any });

                if (updates.from_island_id) {
                    const fromIsland = islandsMap[updates.from_island_id];
                    updatedRoute.from_island_name = fromIsland?.name || '';
                    updatedRoute.from_island_zone = fromIsland?.zone || 'A';
                }

                if (updates.to_island_id) {
                    const toIsland = islandsMap[updates.to_island_id];
                    updatedRoute.to_island_name = toIsland?.name || '';
                    updatedRoute.to_island_zone = toIsland?.zone || 'A';
                }

                // Update computed fields
                const currentRoute = routes.find(r => r.id === routeId);
                const fromName = updatedRoute.from_island_name || currentRoute?.from_island_name || '';
                const toName = updatedRoute.to_island_name || currentRoute?.to_island_name || '';
                
                updatedRoute.route_name = `${fromName} to ${toName}`;
                updatedRoute.distance = calculateDistance(fromName, toName);
                updatedRoute.duration = calculateDuration(fromName, toName);
            }

            // Update local state
            updateRouteInStore(routeId, updatedRoute);

            return true;
        } catch (err) {
            console.error('Error updating route:', err);
            setError(err instanceof Error ? err.message : 'Failed to update route');
            return false;
        }
    }, [routes, updateRouteInStore, setError]);

    const deleteRoute = useCallback(async (routeId: string): Promise<boolean> => {
        try {
            setError(null);

            // Check if route has any active trips
            const { data: activeTrips } = await supabase
                .from('trips')
                .select('id')
                .eq('route_id', routeId)
                .eq('is_active', true)
                .gte('travel_date', new Date().toISOString().split('T')[0])
                .limit(1);

            if (activeTrips && activeTrips.length > 0) {
                throw new Error('Cannot delete route with active trips. Please deactivate the route instead.');
            }

            // Instead of deleting, deactivate the route
            const { error } = await supabase
                .from('routes')
                .update({ is_active: false })
                .eq('id', routeId);

            if (error) throw error;

            // Update local state
            updateRouteInStore(routeId, { is_active: false });

            return true;
        } catch (err) {
            console.error('Error deleting route:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete route');
            return false;
        }
    }, [updateRouteInStore, setError]);

    const getRouteDetails = useCallback(async (routeId: string): Promise<AdminRoute | null> => {
        try {
            setError(null);

            const { data, error } = await supabase
                .from('routes')
                .select(`
                    *,
                    from_island:islands!routes_from_island_id_fkey (name, zone),
                    to_island:islands!routes_to_island_id_fkey (name, zone)
                `)
                .eq('id', routeId)
                .single();

            if (error) throw error;
            if (!data) return null;

            const fromIsland = Array.isArray(data.from_island) ? data.from_island[0] : data.from_island;
            const toIsland = Array.isArray(data.to_island) ? data.to_island[0] : data.to_island;

            const routeDetails: AdminRoute = {
                id: data.id,
                from_island_id: data.from_island_id,
                to_island_id: data.to_island_id,
                base_fare: data.base_fare,
                is_active: data.is_active,
                created_at: data.created_at,
                from_island_name: fromIsland?.name || '',
                to_island_name: toIsland?.name || '',
                from_island_zone: fromIsland?.zone || 'A',
                to_island_zone: toIsland?.zone || 'A',
                route_name: `${fromIsland?.name || 'Unknown'} to ${toIsland?.name || 'Unknown'}`,
                distance: calculateDistance(fromIsland?.name, toIsland?.name),
                duration: calculateDuration(fromIsland?.name, toIsland?.name)
            };

            return routeDetails;
        } catch (err) {
            console.error('Error fetching route details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch route details');
            return null;
        }
    }, [setError]);

    const refreshRoutes = useCallback(async () => {
        await fetchRoutes(currentFilters, pagination.page, pagination.limit);
    }, [fetchRoutes, currentFilters, pagination.page, pagination.limit]);

    return {
        routes,
        islands,
        loading,
        error,
        pagination,
        fetchRoutes,
        fetchIslands,
        createRoute,
        updateRoute,
        deleteRoute,
        getRouteDetails,
        refreshRoutes
    };
};

// Helper functions for calculating distance and duration
function calculateDistance(fromIsland?: string, toIsland?: string): string {
    // This is a simplified calculation - in a real app you'd use actual coordinates
    if (!fromIsland || !toIsland) return '';
    
    // Mock distances based on common routes
    const distances: { [key: string]: string } = {
        'Male to Hulhumale': '7 km',
        'Hulhumale to Male': '7 km',
        'Male to Velana': '2 km',
        'Velana to Male': '2 km',
        'Hulhumale to Velana': '5 km',
        'Velana to Hulhumale': '5 km'
    };
    
    const routeKey = `${fromIsland} to ${toIsland}`;
    return distances[routeKey] || '~15 km';
}

function calculateDuration(fromIsland?: string, toIsland?: string): string {
    // This is a simplified calculation - in a real app you'd use actual travel times
    if (!fromIsland || !toIsland) return '';
    
    // Mock durations based on common routes
    const durations: { [key: string]: string } = {
        'Male to Hulhumale': '20 min',
        'Hulhumale to Male': '20 min',
        'Male to Velana': '10 min',
        'Velana to Male': '10 min',
        'Hulhumale to Velana': '15 min',
        'Velana to Hulhumale': '15 min'
    };
    
    const routeKey = `${fromIsland} to ${toIsland}`;
    return durations[routeKey] || '~30 min';
} 