import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { AdminVessel, AdminPagination } from '@/types/admin';
import { useAdminVesselsStore } from '@/store/admin/adminVesselsStore';

interface VesselFilters {
    status?: boolean;
    search?: string;
}

interface CreateVesselData {
    name: string;
    seating_capacity: number;
    is_active?: boolean;
}

interface UpdateVesselData {
    name?: string;
    seating_capacity?: number;
    is_active?: boolean;
}

interface UseAdminVesselsReturn {
    vessels: AdminVessel[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    fetchVessels: (filters?: VesselFilters, page?: number, limit?: number) => Promise<void>;
    createVessel: (vesselData: CreateVesselData) => Promise<boolean>;
    updateVessel: (vesselId: string, updates: UpdateVesselData) => Promise<boolean>;
    deleteVessel: (vesselId: string) => Promise<boolean>;
    getVesselDetails: (vesselId: string) => Promise<AdminVessel | null>;
    refreshVessels: () => Promise<void>;
}

export const useAdminVessels = (): UseAdminVesselsReturn => {
    const {
        vessels,
        loading,
        error,
        pagination,
        filters: currentFilters,
        setVessels,
        setLoading,
        setError,
        setPagination,
        setFilters,
        updateVessel: updateVesselInStore,
        removeVessel,
        addVessel,
        clearState
    } = useAdminVesselsStore();

    const fetchVessels = useCallback(async (
        filters: VesselFilters = {},
        page = 1,
        limit = 20
    ) => {
        try {
            setLoading(true);
            setError(null);
            setFilters(filters);

            // Build the base query
            let query = supabase
                .from('vessels')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters.status !== undefined) {
                query = query.eq('is_active', filters.status);
            }

            // Search functionality
            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                query = query.ilike('name', searchTerm);
            }

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            // Order by creation date (newest first)
            query = query.order('created_at', { ascending: false });

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            // Get additional statistics for each vessel
            const vesselIds = (data || []).map(v => v.id);
            let tripsCount: { [key: string]: number } = {};
            let bookingsCount: { [key: string]: number } = {};

            if (vesselIds.length > 0) {
                // Get current trips count (active trips)
                const { data: tripsData } = await supabase
                    .from('trips')
                    .select('vessel_id')
                    .in('vessel_id', vesselIds)
                    .eq('is_active', true)
                    .gte('travel_date', new Date().toISOString().split('T')[0]);

                tripsCount = (tripsData || []).reduce((acc, trip) => {
                    acc[trip.vessel_id] = (acc[trip.vessel_id] || 0) + 1;
                    return acc;
                }, {} as { [key: string]: number });

                // Get total bookings count
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select('trip_id, trips!inner(vessel_id)')
                    .in('trips.vessel_id', vesselIds);

                bookingsCount = (bookingsData || []).reduce((acc, booking: any) => {
                    const vesselId = booking.trips?.vessel_id;
                    if (vesselId) {
                        acc[vesselId] = (acc[vesselId] || 0) + 1;
                    }
                    return acc;
                }, {} as { [key: string]: number });
            }

            // Transform data to include statistics
            const transformedVessels: AdminVessel[] = (data || []).map(vessel => ({
                id: vessel.id,
                name: vessel.name,
                seating_capacity: vessel.seating_capacity,
                is_active: vessel.is_active,
                created_at: vessel.created_at,
                current_trips_count: tripsCount[vessel.id] || 0,
                total_bookings: bookingsCount[vessel.id] || 0
            }));

            setVessels(transformedVessels);
            setPagination({
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit)
            });

        } catch (err) {
            console.error('Error fetching vessels:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch vessels');
        } finally {
            setLoading(false);
        }
    }, [setVessels, setLoading, setError, setPagination, setFilters]);

    const createVessel = useCallback(async (vesselData: CreateVesselData): Promise<boolean> => {
        try {
            setError(null);

            const { data, error } = await supabase
                .from('vessels')
                .insert([{
                    name: vesselData.name,
                    seating_capacity: vesselData.seating_capacity,
                    is_active: vesselData.is_active ?? true
                }])
                .select()
                .single();

            if (error) throw error;

            // Create seats for the vessel
            const seats = [];
            for (let i = 1; i <= vesselData.seating_capacity; i++) {
                const row = Math.ceil(i / 4); // Assuming 4 seats per row
                const seatInRow = ((i - 1) % 4) + 1;
                const seatNumber = `${row}${String.fromCharCode(64 + seatInRow)}`; // 1A, 1B, 1C, 1D, etc.

                seats.push({
                    vessel_id: data.id,
                    seat_number: seatNumber,
                    row_number: row,
                    is_window: seatInRow === 1 || seatInRow === 4,
                    is_aisle: seatInRow === 2 || seatInRow === 3
                });
            }

            const { error: seatsError } = await supabase
                .from('seats')
                .insert(seats);

            if (seatsError) {
                console.error('Error creating seats:', seatsError);
                // Note: We don't throw here as the vessel was created successfully
            }

            // Add to local state
            const newVessel: AdminVessel = {
                id: data.id,
                name: data.name,
                seating_capacity: data.seating_capacity,
                is_active: data.is_active,
                created_at: data.created_at,
                current_trips_count: 0,
                total_bookings: 0
            };

            addVessel(newVessel);

            return true;
        } catch (err) {
            console.error('Error creating vessel:', err);
            setError(err instanceof Error ? err.message : 'Failed to create vessel');
            return false;
        }
    }, [addVessel, setError]);

    const updateVessel = useCallback(async (
        vesselId: string,
        updates: UpdateVesselData
    ): Promise<boolean> => {
        try {
            setError(null);

            const { error } = await supabase
                .from('vessels')
                .update(updates)
                .eq('id', vesselId);

            if (error) throw error;

            // Update local state
            updateVesselInStore(vesselId, updates);

            return true;
        } catch (err) {
            console.error('Error updating vessel:', err);
            setError(err instanceof Error ? err.message : 'Failed to update vessel');
            return false;
        }
    }, [updateVesselInStore, setError]);

    const deleteVessel = useCallback(async (vesselId: string): Promise<boolean> => {
        try {
            setError(null);

            // Check if vessel has any active trips
            const { data: activeTrips } = await supabase
                .from('trips')
                .select('id')
                .eq('vessel_id', vesselId)
                .eq('is_active', true)
                .gte('travel_date', new Date().toISOString().split('T')[0])
                .limit(1);

            if (activeTrips && activeTrips.length > 0) {
                throw new Error('Cannot delete vessel with active trips. Please deactivate or reassign trips first.');
            }

            // Instead of deleting, we'll deactivate the vessel
            const { error } = await supabase
                .from('vessels')
                .update({ is_active: false })
                .eq('id', vesselId);

            if (error) throw error;

            // Update local state
            updateVesselInStore(vesselId, { is_active: false });

            return true;
        } catch (err) {
            console.error('Error deleting vessel:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete vessel');
            return false;
        }
    }, [updateVesselInStore, setError]);

    const getVesselDetails = useCallback(async (vesselId: string): Promise<AdminVessel | null> => {
        try {
            setError(null);

            const { data, error } = await supabase
                .from('vessels')
                .select('*')
                .eq('id', vesselId)
                .single();

            if (error) throw error;
            if (!data) return null;

            // Get additional statistics
            const [tripsResult, bookingsResult] = await Promise.all([
                supabase
                    .from('trips')
                    .select('id', { count: 'exact' })
                    .eq('vessel_id', vesselId)
                    .eq('is_active', true)
                    .gte('travel_date', new Date().toISOString().split('T')[0]),

                supabase
                    .from('bookings')
                    .select('id, trips!inner(vessel_id)', { count: 'exact' })
                    .eq('trips.vessel_id', vesselId)
            ]);

            const vesselDetails: AdminVessel = {
                id: data.id,
                name: data.name,
                seating_capacity: data.seating_capacity,
                is_active: data.is_active,
                created_at: data.created_at,
                current_trips_count: tripsResult.count || 0,
                total_bookings: bookingsResult.count || 0
            };

            return vesselDetails;
        } catch (err) {
            console.error('Error fetching vessel details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch vessel details');
            return null;
        }
    }, [setError]);

    const refreshVessels = useCallback(async () => {
        await fetchVessels(currentFilters, pagination.page, pagination.limit);
    }, [fetchVessels, currentFilters, pagination.page, pagination.limit]);

    return {
        vessels,
        loading,
        error,
        pagination,
        fetchVessels,
        createVessel,
        updateVessel,
        deleteVessel,
        getVesselDetails,
        refreshVessels
    };
}; 