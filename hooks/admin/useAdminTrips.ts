import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { AdminTrip, AdminTripFilters, AdminPagination } from '@/types/admin';

interface CreateTripData {
    route_id: string;
    travel_date: string;
    departure_time: string;
    vessel_id: string;
    is_active?: boolean;
}

interface UpdateTripData {
    route_id?: string;
    travel_date?: string;
    departure_time?: string;
    vessel_id?: string;
    is_active?: boolean;
}

interface BulkCreateTripsData {
    route_id: string;
    vessel_id: string;
    start_date: string;
    end_date: string;
    departure_times: string[];
    days_of_week: number[]; // 0 = Sunday, 1 = Monday, etc.
}

interface UseAdminTripsReturn {
    trips: AdminTrip[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    fetchTrips: (filters?: AdminTripFilters, page?: number, limit?: number) => Promise<void>;
    createTrip: (tripData: CreateTripData) => Promise<boolean>;
    createBulkTrips: (bulkData: BulkCreateTripsData) => Promise<{ success: number; failed: number }>;
    updateTrip: (tripId: string, updates: UpdateTripData) => Promise<boolean>;
    deleteTrip: (tripId: string) => Promise<boolean>;
    getTripDetails: (tripId: string) => Promise<AdminTrip | null>;
    refreshTrips: () => Promise<void>;
}

export const useAdminTrips = (): UseAdminTripsReturn => {
    const [trips, setTrips] = useState<AdminTrip[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<AdminPagination>({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0
    });
    const [currentFilters, setCurrentFilters] = useState<AdminTripFilters>({});

    const fetchTrips = useCallback(async (
        filters: AdminTripFilters = {},
        page = 1,
        limit = 20
    ) => {
        try {
            setLoading(true);
            setError(null);
            setCurrentFilters(filters);

            // Build the query with joined data
            let query = supabase
                .from('trips_with_available_seats')
                .select(`
          *,
          routes (
            base_fare,
            from_island:islands!routes_from_island_id_fkey (name),
            to_island:islands!routes_to_island_id_fkey (name)
          ),
          bookings:bookings!bookings_trip_id_fkey (
            id,
            total_fare,
            status
          )
        `, { count: 'exact' });

            // Apply filters
            if (filters.date_from) {
                query = query.gte('travel_date', filters.date_from);
            }

            if (filters.date_to) {
                query = query.lte('travel_date', filters.date_to);
            }

            if (filters.route_id) {
                query = query.eq('route_id', filters.route_id);
            }

            if (filters.vessel_id) {
                query = query.eq('vessel_id', filters.vessel_id);
            }

            if (filters.status && filters.status.length > 0) {
                // Map status to actual trip conditions
                const statusConditions = [];
                if (filters.status.includes('scheduled')) {
                    statusConditions.push('travel_date.gte.' + new Date().toISOString().split('T')[0]);
                }
                if (filters.status.includes('completed')) {
                    statusConditions.push('travel_date.lt.' + new Date().toISOString().split('T')[0]);
                }
                // Add more status conditions as needed
            }

            // Search functionality
            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                query = query.or(`
          vessel_name.ilike.${searchTerm},
          routes.from_island.name.ilike.${searchTerm},
          routes.to_island.name.ilike.${searchTerm}
        `);
            }

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            // Order by travel date and departure time
            query = query.order('travel_date', { ascending: false })
                .order('departure_time', { ascending: true });

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            // Transform data to AdminTrip format
            const transformedTrips: AdminTrip[] = (data || []).map(trip => {
                const bookings = trip.bookings || [];
                const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
                const revenue = confirmedBookings.reduce((sum: number, b: any) => sum + (b.total_fare || 0), 0);

                // Determine trip status
                let status: AdminTrip['status'] = 'scheduled';
                const tripDate = new Date(trip.travel_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (tripDate < today) {
                    status = 'completed';
                } else if (tripDate.toDateString() === today.toDateString()) {
                    status = 'in_progress';
                }

                return {
                    id: trip.id,
                    route_id: trip.route_id,
                    travel_date: trip.travel_date,
                    departure_time: trip.departure_time,
                    vessel_id: trip.vessel_id,
                    available_seats: trip.available_seats,
                    is_active: trip.is_active,
                    created_at: trip.created_at,
                    from_island_name: trip.routes?.from_island?.name || '',
                    to_island_name: trip.routes?.to_island?.name || '',
                    vessel_name: trip.vessel_name,
                    vessel_capacity: trip.seating_capacity,
                    bookings_count: bookings.length,
                    revenue,
                    status,
                    route_name: `${trip.routes?.from_island?.name} to ${trip.routes?.to_island?.name}`
                };
            });

            setTrips(transformedTrips);
            setPagination({
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit)
            });

        } catch (err) {
            console.error('Error fetching trips:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch trips');
        } finally {
            setLoading(false);
        }
    }, []);

    const createTrip = useCallback(async (tripData: CreateTripData): Promise<boolean> => {
        try {
            setError(null);

            // Check if trip already exists for this route, date, and time
            const { data: existingTrip } = await supabase
                .from('trips')
                .select('id')
                .eq('route_id', tripData.route_id)
                .eq('travel_date', tripData.travel_date)
                .eq('departure_time', tripData.departure_time)
                .single();

            if (existingTrip) {
                throw new Error('A trip already exists for this route, date, and time');
            }

            // Get vessel capacity for available_seats
            const { data: vessel } = await supabase
                .from('vessels')
                .select('seating_capacity')
                .eq('id', tripData.vessel_id)
                .single();

            if (!vessel) {
                throw new Error('Vessel not found');
            }

            const { data, error } = await supabase
                .from('trips')
                .insert([{
                    route_id: tripData.route_id,
                    travel_date: tripData.travel_date,
                    departure_time: tripData.departure_time,
                    vessel_id: tripData.vessel_id,
                    available_seats: vessel.seating_capacity,
                    is_active: tripData.is_active ?? true
                }])
                .select(`
          *,
          routes (
            from_island:islands!routes_from_island_id_fkey (name),
            to_island:islands!routes_to_island_id_fkey (name)
          ),
          vessels (name, seating_capacity)
        `)
                .single();

            if (error) throw error;

            // Add to local state
            const newTrip: AdminTrip = {
                id: data.id,
                route_id: data.route_id,
                travel_date: data.travel_date,
                departure_time: data.departure_time,
                vessel_id: data.vessel_id,
                available_seats: data.available_seats,
                is_active: data.is_active,
                created_at: data.created_at,
                from_island_name: data.routes?.from_island?.name || '',
                to_island_name: data.routes?.to_island?.name || '',
                vessel_name: data.vessels?.name || '',
                vessel_capacity: data.vessels?.seating_capacity || 0,
                bookings_count: 0,
                revenue: 0,
                status: 'scheduled',
                route_name: `${data.routes?.from_island?.name} to ${data.routes?.to_island?.name}`
            };

            setTrips(prev => [newTrip, ...prev]);
            setPagination(prev => ({
                ...prev,
                total: prev.total + 1,
                total_pages: Math.ceil((prev.total + 1) / prev.limit)
            }));

            return true;
        } catch (err) {
            console.error('Error creating trip:', err);
            setError(err instanceof Error ? err.message : 'Failed to create trip');
            return false;
        }
    }, []);

    const createBulkTrips = useCallback(async (bulkData: BulkCreateTripsData): Promise<{ success: number; failed: number }> => {
        try {
            setError(null);

            const startDate = new Date(bulkData.start_date);
            const endDate = new Date(bulkData.end_date);
            const tripsToCreate = [];

            // Get vessel capacity
            const { data: vessel } = await supabase
                .from('vessels')
                .select('seating_capacity')
                .eq('id', bulkData.vessel_id)
                .single();

            if (!vessel) {
                throw new Error('Vessel not found');
            }

            // Generate trips for each day in the range
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();

                // Check if this day is included
                if (bulkData.days_of_week.includes(dayOfWeek)) {
                    // Create trips for each departure time
                    for (const departureTime of bulkData.departure_times) {
                        tripsToCreate.push({
                            route_id: bulkData.route_id,
                            travel_date: date.toISOString().split('T')[0],
                            departure_time: departureTime,
                            vessel_id: bulkData.vessel_id,
                            available_seats: vessel.seating_capacity,
                            is_active: true
                        });
                    }
                }
            }

            let successCount = 0;
            let failedCount = 0;

            // Insert trips in batches to avoid conflicts
            for (const tripData of tripsToCreate) {
                try {
                    // Check if trip already exists
                    const { data: existingTrip } = await supabase
                        .from('trips')
                        .select('id')
                        .eq('route_id', tripData.route_id)
                        .eq('travel_date', tripData.travel_date)
                        .eq('departure_time', tripData.departure_time)
                        .single();

                    if (!existingTrip) {
                        const { error } = await supabase
                            .from('trips')
                            .insert([tripData]);

                        if (error) throw error;
                        successCount++;
                    } else {
                        failedCount++; // Trip already exists
                    }
                } catch (err) {
                    console.error('Error creating individual trip:', err);
                    failedCount++;
                }
            }

            // Refresh trips to show new data
            await refreshTrips();

            return { success: successCount, failed: failedCount };
        } catch (err) {
            console.error('Error creating bulk trips:', err);
            setError(err instanceof Error ? err.message : 'Failed to create bulk trips');
            return { success: 0, failed: 0 };
        }
    }, []);

    const updateTrip = useCallback(async (
        tripId: string,
        updates: UpdateTripData
    ): Promise<boolean> => {
        try {
            setError(null);

            const { error } = await supabase
                .from('trips')
                .update(updates)
                .eq('id', tripId);

            if (error) throw error;

            // Update local state
            setTrips(prev => prev.map(trip =>
                trip.id === tripId ? { ...trip, ...updates } : trip
            ));

            return true;
        } catch (err) {
            console.error('Error updating trip:', err);
            setError(err instanceof Error ? err.message : 'Failed to update trip');
            return false;
        }
    }, []);

    const deleteTrip = useCallback(async (tripId: string): Promise<boolean> => {
        try {
            setError(null);

            // Check if trip has any bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select('id')
                .eq('trip_id', tripId)
                .limit(1);

            if (bookings && bookings.length > 0) {
                throw new Error('Cannot delete trip with existing bookings');
            }

            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', tripId);

            if (error) throw error;

            // Update local state
            setTrips(prev => prev.filter(trip => trip.id !== tripId));
            setPagination(prev => ({
                ...prev,
                total: prev.total - 1,
                total_pages: Math.ceil((prev.total - 1) / prev.limit)
            }));

            return true;
        } catch (err) {
            console.error('Error deleting trip:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete trip');
            return false;
        }
    }, []);

    const getTripDetails = useCallback(async (tripId: string): Promise<AdminTrip | null> => {
        try {
            setError(null);

            const { data, error } = await supabase
                .from('trips')
                .select(`
          *,
          routes (
            base_fare,
            from_island:islands!routes_from_island_id_fkey (name, zone),
            to_island:islands!routes_to_island_id_fkey (name, zone)
          ),
          vessels (name, seating_capacity),
          bookings (
            id,
            booking_number,
            status,
            total_fare,
            user_profiles (full_name, email)
          )
        `)
                .eq('id', tripId)
                .single();

            if (error) throw error;
            if (!data) return null;

            const bookings = data.bookings || [];
            const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');
            const revenue = confirmedBookings.reduce((sum: number, b: any) => sum + (b.total_fare || 0), 0);

            const trip: AdminTrip = {
                id: data.id,
                route_id: data.route_id,
                travel_date: data.travel_date,
                departure_time: data.departure_time,
                vessel_id: data.vessel_id,
                available_seats: data.available_seats,
                is_active: data.is_active,
                created_at: data.created_at,
                from_island_name: data.routes?.from_island?.name || '',
                to_island_name: data.routes?.to_island?.name || '',
                vessel_name: data.vessels?.name || '',
                vessel_capacity: data.vessels?.seating_capacity || 0,
                bookings_count: bookings.length,
                revenue,
                status: 'scheduled', // Compute based on date/time
                route_name: `${data.routes?.from_island?.name} to ${data.routes?.to_island?.name}`
            };

            return trip;
        } catch (err) {
            console.error('Error fetching trip details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch trip details');
            return null;
        }
    }, []);

    const refreshTrips = useCallback(async () => {
        await fetchTrips(currentFilters, pagination.page, pagination.limit);
    }, [fetchTrips, currentFilters, pagination.page, pagination.limit]);

    return {
        trips,
        loading,
        error,
        pagination,
        fetchTrips,
        createTrip,
        createBulkTrips,
        updateTrip,
        deleteTrip,
        getTripDetails,
        refreshTrips
    };
}; 