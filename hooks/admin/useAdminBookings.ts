import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import {
    AdminBooking,
    AdminBookingFilters,
    AdminPagination,
    AdminListResponse
} from '@/types/admin';
import { useAdminBookingsStore } from '@/store/admin/adminBookingsStore';

interface UseAdminBookingsReturn {
    bookings: AdminBooking[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    fetchBookings: (filters?: AdminBookingFilters, page?: number, limit?: number) => Promise<void>;
    updateBookingStatus: (bookingId: string, status: AdminBooking['status']) => Promise<boolean>;
    deleteBooking: (bookingId: string) => Promise<boolean>;
    getBookingDetails: (bookingId: string) => Promise<AdminBooking | null>;
    refreshBookings: () => Promise<void>;
}

export const useAdminBookings = (): UseAdminBookingsReturn => {
    const {
        bookings,
        loading,
        error,
        pagination,
        filters: currentFilters,
        setBookings,
        setLoading,
        setError,
        setPagination,
        setFilters,
        updateBooking,
        removeBooking,
        clearState
    } = useAdminBookingsStore();

    const fetchBookings = useCallback(async (
        filters: AdminBookingFilters = {},
        page = 1,
        limit = 20
    ) => {
        try {
            setLoading(true);
            setError(null);
            setFilters(filters);

            // Build the main bookings query with all necessary joins
            let bookingsQuery = supabase
                .from('bookings')
                .select(`
                    id,
                    booking_number,
                    user_id,
                    trip_id,
                    is_round_trip,
                    return_booking_id,
                    status,
                    total_fare,
                    qr_code_url,
                    check_in_status,
                    agent_id,
                    agent_client_id,
                    payment_method_type,
                    round_trip_group_id,
                    created_at,
                    updated_at,
                    user_profiles!inner (
                        full_name,
                        email,
                        mobile_number
                    ),
                    trips!inner (
                        travel_date,
                        departure_time,
                        routes!inner (
                            from_island_id,
                            to_island_id,
                            from_islands:islands!routes_from_island_id_fkey (
                                name
                            ),
                            to_islands:islands!routes_to_island_id_fkey (
                                name
                            )
                        ),
                        vessels!inner (
                            name
                        )
                    ),
                    agent_profiles:user_profiles!bookings_agent_id_fkey (
                        full_name
                    )
                `, { count: 'exact' });

            // Apply filters
            if (filters.status && filters.status.length > 0) {
                bookingsQuery = bookingsQuery.in('status', filters.status);
            }

            if (filters.date_from) {
                bookingsQuery = bookingsQuery.gte('created_at', `${filters.date_from}T00:00:00Z`);
            }

            if (filters.date_to) {
                bookingsQuery = bookingsQuery.lte('created_at', `${filters.date_to}T23:59:59Z`);
            }

            if (filters.agent_id) {
                bookingsQuery = bookingsQuery.eq('agent_id', filters.agent_id);
            }

            if (filters.route_id) {
                bookingsQuery = bookingsQuery.eq('trips.route_id', filters.route_id);
            }

            // Search functionality
            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                bookingsQuery = bookingsQuery.or(`
                    booking_number.ilike.${searchTerm},
                    user_profiles.full_name.ilike.${searchTerm},
                    user_profiles.email.ilike.${searchTerm}
                `);
            }

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            bookingsQuery = bookingsQuery.range(from, to);

            // Order by creation date (newest first)
            bookingsQuery = bookingsQuery.order('created_at', { ascending: false });

            const { data: bookingsData, error: fetchError, count } = await bookingsQuery;

            if (fetchError) throw fetchError;

            // Get passenger counts for each booking
            const bookingIds = bookingsData?.map(b => b.id) || [];
            let passengerCounts: { [key: string]: number } = {};

            if (bookingIds.length > 0) {
                const { data: passengersData } = await supabase
                    .from('passengers')
                    .select('booking_id')
                    .in('booking_id', bookingIds);

                // Count passengers per booking
                passengerCounts = (passengersData || []).reduce((acc, passenger) => {
                    acc[passenger.booking_id] = (acc[passenger.booking_id] || 0) + 1;
                    return acc;
                }, {} as { [key: string]: number });
            }

            // Transform the data to match AdminBooking interface
            const transformedBookings: AdminBooking[] = (bookingsData || []).map((booking: any) => {
                const userProfile = Array.isArray(booking.user_profiles) ? booking.user_profiles[0] : booking.user_profiles;
                const trip = Array.isArray(booking.trips) ? booking.trips[0] : booking.trips;
                const route = trip && Array.isArray(trip.routes) ? trip.routes[0] : trip?.routes;
                const vessel = trip && Array.isArray(trip.vessels) ? trip.vessels[0] : trip?.vessels;
                const fromIsland = route && Array.isArray(route.from_islands) ? route.from_islands[0] : route?.from_islands;
                const toIsland = route && Array.isArray(route.to_islands) ? route.to_islands[0] : route?.to_islands;
                const agentProfile = Array.isArray(booking.agent_profiles) ? booking.agent_profiles[0] : booking.agent_profiles;

                return {
                    id: booking.id,
                    booking_number: booking.booking_number,
                    user_id: booking.user_id,
                    trip_id: booking.trip_id,
                    is_round_trip: booking.is_round_trip,
                    return_booking_id: booking.return_booking_id,
                    status: booking.status,
                    total_fare: booking.total_fare,
                    qr_code_url: booking.qr_code_url,
                    check_in_status: booking.check_in_status,
                    agent_id: booking.agent_id,
                    agent_client_id: booking.agent_client_id,
                    payment_method_type: booking.payment_method_type,
                    round_trip_group_id: booking.round_trip_group_id,
                    created_at: booking.created_at,
                    updated_at: booking.updated_at,
                    // Joined data
                    user_name: userProfile?.full_name || 'Unknown User',
                    user_email: userProfile?.email || '',
                    user_mobile: userProfile?.mobile_number || '',
                    trip_travel_date: trip?.travel_date || '',
                    trip_departure_time: trip?.departure_time || '',
                    vessel_name: vessel?.name || 'Unknown Vessel',
                    from_island_name: fromIsland?.name || 'Unknown',
                    to_island_name: toIsland?.name || 'Unknown',
                    trip_route_name: `${fromIsland?.name || 'Unknown'} to ${toIsland?.name || 'Unknown'}`,
                    agent_name: agentProfile?.full_name || '',
                    passenger_count: passengerCounts[booking.id] || 0
                };
            });

            setBookings(transformedBookings);
            setPagination({
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit)
            });

        } catch (err) {
            console.error('Error fetching bookings:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    }, [setBookings, setLoading, setError, setPagination, setFilters]);

    const updateBookingStatus = useCallback(async (
        bookingId: string,
        status: AdminBooking['status']
    ): Promise<boolean> => {
        try {
            setError(null);

            const { error } = await supabase
                .from('bookings')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;

            // Update local state
            updateBooking(bookingId, {
                status,
                updated_at: new Date().toISOString()
            });

            return true;
        } catch (err) {
            console.error('Error updating booking status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update booking status');
            return false;
        }
    }, [updateBooking, setError]);

    const deleteBooking = useCallback(async (bookingId: string): Promise<boolean> => {
        try {
            setError(null);

            // Check if booking can be deleted (only allow if status is 'reserved' or 'cancelled')
            const { data: booking } = await supabase
                .from('bookings')
                .select('status')
                .eq('id', bookingId)
                .single();

            if (!booking) {
                throw new Error('Booking not found');
            }

            if (!['reserved', 'cancelled'].includes(booking.status)) {
                throw new Error('Only reserved or cancelled bookings can be deleted');
            }

            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId);

            if (error) throw error;

            // Update local state
            removeBooking(bookingId);

            return true;
        } catch (err) {
            console.error('Error deleting booking:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete booking');
            return false;
        }
    }, [removeBooking, setError]);

    const getBookingDetails = useCallback(async (bookingId: string): Promise<AdminBooking | null> => {
        try {
            setError(null);

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_number,
                    user_id,
                    trip_id,
                    is_round_trip,
                    return_booking_id,
                    status,
                    total_fare,
                    qr_code_url,
                    check_in_status,
                    agent_id,
                    agent_client_id,
                    payment_method_type,
                    round_trip_group_id,
                    created_at,
                    updated_at,
                    user_profiles!inner (
                        full_name,
                        email,
                        mobile_number
                    ),
                    trips!inner (
                        travel_date,
                        departure_time,
                        routes!inner (
                            from_islands:islands!routes_from_island_id_fkey (
                                name
                            ),
                            to_islands:islands!routes_to_island_id_fkey (
                                name
                            )
                        ),
                        vessels!inner (
                            name
                        )
                    ),
                    agent_profiles:user_profiles!bookings_agent_id_fkey (
                        full_name
                    )
                `)
                .eq('id', bookingId)
                .single();

            if (error) throw error;
            if (!data) return null;

            // Get passenger count
            const { data: passengersData } = await supabase
                .from('passengers')
                .select('id')
                .eq('booking_id', bookingId);

            const userProfile = Array.isArray((data as any).user_profiles) ? (data as any).user_profiles[0] : (data as any).user_profiles;
            const trip = Array.isArray((data as any).trips) ? (data as any).trips[0] : (data as any).trips;
            const route = trip && Array.isArray(trip.routes) ? trip.routes[0] : trip?.routes;
            const vessel = trip && Array.isArray(trip.vessels) ? trip.vessels[0] : trip?.vessels;
            const fromIsland = route && Array.isArray(route.from_islands) ? route.from_islands[0] : route?.from_islands;
            const toIsland = route && Array.isArray(route.to_islands) ? route.to_islands[0] : route?.to_islands;
            const agentProfile = Array.isArray((data as any).agent_profiles) ? (data as any).agent_profiles[0] : (data as any).agent_profiles;

            const transformedBooking: AdminBooking = {
                id: data.id,
                booking_number: data.booking_number,
                user_id: data.user_id,
                trip_id: data.trip_id,
                is_round_trip: data.is_round_trip,
                return_booking_id: data.return_booking_id,
                status: data.status,
                total_fare: data.total_fare,
                qr_code_url: data.qr_code_url,
                check_in_status: data.check_in_status,
                agent_id: data.agent_id,
                agent_client_id: data.agent_client_id,
                payment_method_type: data.payment_method_type,
                round_trip_group_id: data.round_trip_group_id,
                created_at: data.created_at,
                updated_at: data.updated_at,
                // Joined data
                user_name: userProfile?.full_name || 'Unknown User',
                user_email: userProfile?.email || '',
                user_mobile: userProfile?.mobile_number || '',
                trip_travel_date: trip?.travel_date || '',
                trip_departure_time: trip?.departure_time || '',
                vessel_name: vessel?.name || 'Unknown Vessel',
                from_island_name: fromIsland?.name || 'Unknown',
                to_island_name: toIsland?.name || 'Unknown',
                trip_route_name: `${fromIsland?.name || 'Unknown'} to ${toIsland?.name || 'Unknown'}`,
                agent_name: agentProfile?.full_name || '',
                passenger_count: passengersData?.length || 0
            };

            return transformedBooking;

        } catch (err) {
            console.error('Error fetching booking details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch booking details');
            return null;
        }
    }, [setError]);

    const refreshBookings = useCallback(async () => {
        await fetchBookings(currentFilters, pagination.page, pagination.limit);
    }, [fetchBookings, currentFilters, pagination.page, pagination.limit]);

    return {
        bookings,
        loading,
        error,
        pagination,
        fetchBookings,
        updateBookingStatus,
        deleteBooking,
        getBookingDetails,
        refreshBookings
    };
}; 