import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';

type Trip = AdminManagement.Trip;
type TripFormData = AdminManagement.TripFormData;
type TripStats = AdminManagement.TripStats;
type TripFilters = AdminManagement.TripFilters;
type TripWithDetails = AdminManagement.TripWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type TripStoreState = AdminManagement.TripStoreState;
type TripStoreActions = AdminManagement.TripStoreActions;

// ============================================================================
// TRIP STORE IMPLEMENTATION
// ============================================================================

interface TripStore extends TripStoreState, TripStoreActions { }

export const useTripStore = create<TripStore>((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Base state
    data: [],
    currentItem: null,
    loading: {},
    error: null,
    searchQuery: '',

    // Filters and stats
    filters: {},
    stats: {
        total: 0,
        active: 0,
        inactive: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        delayed: 0,
        averageOccupancy: 0,
        totalRevenue: 0,
        todayTrips: 0,
        onTimePerformance: 0,
        avgFare: 0,
        totalBookings: 0,
        totalPassengers: 0,
    },

    // Related data
    routes: [],
    vessels: [],

    // Computed data
    filteredTrips: [],
    sortedTrips: [],
    tripsByStatus: {},
    tripsByRoute: {},
    tripsByVessel: {},

    // Sort configuration
    sortBy: 'travel_date',
    sortOrder: 'desc',

    // ========================================================================
    // ACTIONS
    // ========================================================================

    // Data fetching
    fetchAll: async () => {
        set({ loading: { ...get().loading, data: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .order('travel_date', { ascending: false });

            if (error) throw error;

            const trips = data || [];
            set({ data: trips });
            get().calculateComputedData();
        } catch (error) {
            console.error('Error fetching trips:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to fetch trips' });
        } finally {
            set({ loading: { ...get().loading, data: false } });
        }
    },

    fetchById: async (id: string) => {
        set({ loading: { ...get().loading, current: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            set({ currentItem: data });
            return data;
        } catch (error) {
            console.error('Error fetching trip:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to fetch trip' });
            return null;
        } finally {
            set({ loading: { ...get().loading, current: false } });
        }
    },

    // CRUD operations
    create: async (tripData: TripFormData) => {
        set({ loading: { ...get().loading, create: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('trips')
                .insert([tripData])
                .select()
                .single();

            if (error) throw error;

            // Refresh the data
            await get().fetchAll();
            return data;
        } catch (error) {
            console.error('Error creating trip:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to create trip' });
            throw error;
        } finally {
            set({ loading: { ...get().loading, create: false } });
        }
    },

    update: async (id: string, updates: Partial<TripFormData>) => {
        set({ loading: { ...get().loading, update: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('trips')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Update local state
            const updatedData = get().data.map(trip =>
                trip.id === id ? { ...trip, ...data } : trip
            );
            set({ data: updatedData });

            // Update current item if it's the one being updated
            if (get().currentItem?.id === id) {
                set({ currentItem: { ...get().currentItem, ...data } });
            }

            get().calculateComputedData();
            return data;
        } catch (error) {
            console.error('Error updating trip:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to update trip' });
            throw error;
        } finally {
            set({ loading: { ...get().loading, update: false } });
        }
    },

    delete: async (id: string) => {
        set({ loading: { ...get().loading, delete: true }, error: null });

        try {
            const { error } = await supabase
                .from('trips')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            const updatedData = get().data.filter(trip => trip.id !== id);
            set({ data: updatedData });

            // Clear current item if it's the one being deleted
            if (get().currentItem?.id === id) {
                set({ currentItem: null });
            }

            get().calculateComputedData();
        } catch (error) {
            console.error('Error deleting trip:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to delete trip' });
            throw error;
        } finally {
            set({ loading: { ...get().loading, delete: false } });
        }
    },

    // Trip-specific actions
    fetchTripDetails: async (id: string) => {
        try {
            const trip = await get().fetchById(id);
            if (!trip) return null;

            // Fetch related data
            const [routeData, vesselData] = await Promise.all([
                supabase.from('routes').select('*').eq('id', trip.route_id).single(),
                supabase.from('vessels').select('*').eq('id', trip.vessel_id).single()
            ]);

            const tripWithDetails: TripWithDetails = {
                ...trip,
                route_details: routeData.data ? {
                    route_name: routeData.data.name,
                    from_island_name: routeData.data.from_island_name || '',
                    to_island_name: routeData.data.to_island_name || '',
                    base_fare: routeData.data.base_fare,
                    distance: routeData.data.distance || '',
                    duration: routeData.data.duration || ''
                } : undefined,
                vessel_details: vesselData.data ? {
                    vessel_name: vesselData.data.name,
                    seating_capacity: vesselData.data.seating_capacity,
                    vessel_type: vesselData.data.vessel_type || 'passenger',
                    status: vesselData.data.status
                } : undefined
            };

            return tripWithDetails;
        } catch (error) {
            console.error('Error fetching trip details:', error);
            return null;
        }
    },

    fetchTripsByStatus: async (status: string) => {
        try {
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .eq('computed_status', status)
                .order('travel_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching trips by status:', error);
            return [];
        }
    },

    fetchTripsByRoute: async (routeId: string) => {
        try {
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .eq('route_id', routeId)
                .order('travel_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching trips by route:', error);
            return [];
        }
    },

    fetchTripsByVessel: async (vesselId: string) => {
        try {
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .eq('vessel_id', vesselId)
                .order('travel_date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching trips by vessel:', error);
            return [];
        }
    },

    fetchTripsByDate: async (date: string) => {
        try {
            const { data, error } = await supabase
                .from('operations_trips_view')
                .select('*')
                .eq('travel_date', date)
                .order('departure_time', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching trips by date:', error);
            return [];
        }
    },

    // Trip management
    updateTripStatus: async (tripId: string, status: Trip['status'], reason?: string) => {
        const updates: any = { status };
        if (reason) updates.delay_reason = reason;

        await get().update(tripId, updates);
    },

    cancelTrip: async (tripId: string, reason: string) => {
        await get().update(tripId, {
            status: 'cancelled',
            delay_reason: reason
        });
    },

    delayTrip: async (tripId: string, delayMinutes: number, reason: string) => {
        const trip = get().data.find(t => t.id === tripId);
        if (!trip) throw new Error('Trip not found');

        // Calculate new departure time
        const departureTime = new Date(`2000-01-01T${trip.departure_time}`);
        departureTime.setMinutes(departureTime.getMinutes() + delayMinutes);
        const newDepartureTime = departureTime.toTimeString().slice(0, 5);

        await get().update(tripId, {
            departure_time: newDepartureTime,
            status: 'delayed',
            delay_reason: reason
        });
    },

    rescheduleTrip: async (tripId: string, newDate: string, newTime: string) => {
        await get().update(tripId, {
            travel_date: newDate,
            departure_time: newTime,
            status: 'scheduled'
        });
    },

    // Bulk operations
    bulkUpdateStatus: async (tripIds: string[], status: Trip['status']) => {
        set({ loading: { ...get().loading, bulk: true } });

        try {
            const { error } = await supabase
                .from('trips')
                .update({ status })
                .in('id', tripIds);

            if (error) throw error;

            // Refresh data
            await get().fetchAll();
        } catch (error) {
            console.error('Error bulk updating trips:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to bulk update trips' });
        } finally {
            set({ loading: { ...get().loading, bulk: false } });
        }
    },

    bulkCancel: async (tripIds: string[], reason: string) => {
        set({ loading: { ...get().loading, bulk: true } });

        try {
            const { error } = await supabase
                .from('trips')
                .update({
                    status: 'cancelled',
                    delay_reason: reason
                })
                .in('id', tripIds);

            if (error) throw error;

            // Refresh data
            await get().fetchAll();
        } catch (error) {
            console.error('Error bulk cancelling trips:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to bulk cancel trips' });
        } finally {
            set({ loading: { ...get().loading, bulk: false } });
        }
    },

    bulkReschedule: async (tripIds: string[], newDate: string, newTime: string) => {
        set({ loading: { ...get().loading, bulk: true } });

        try {
            const { error } = await supabase
                .from('trips')
                .update({
                    travel_date: newDate,
                    departure_time: newTime,
                    status: 'scheduled'
                })
                .in('id', tripIds);

            if (error) throw error;

            // Refresh data
            await get().fetchAll();
        } catch (error) {
            console.error('Error bulk rescheduling trips:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to bulk reschedule trips' });
        } finally {
            set({ loading: { ...get().loading, bulk: false } });
        }
    },

    // Trip generation
    generateTripsForRoute: async (routeId: string, startDate: string, endDate: string, schedule: any) => {
        // This would implement trip generation logic based on schedule
        // For now, return empty array
        return [];
    },

    generateTripsForDate: async (date: string, routes?: string[]) => {
        // This would implement trip generation logic for a specific date
        // For now, return empty array
        return [];
    },

    // Utility functions
    getTripById: (id: string) => {
        return get().data.find(trip => trip.id === id);
    },

    getTripsByStatus: (status: string) => {
        return get().data.filter(trip => trip.status === status);
    },

    getTripsByRoute: (routeId: string) => {
        return get().data.filter(trip => trip.route_id === routeId);
    },

    getTripsByVessel: (vesselId: string) => {
        return get().data.filter(trip => trip.vessel_id === vesselId);
    },

    validateTripData: (data: Partial<TripFormData>): ValidationResult => {
        const errors: Record<string, string> = {};

        if (!data.route_id) errors.route_id = 'Route is required';
        if (!data.vessel_id) errors.vessel_id = 'Vessel is required';
        if (!data.travel_date) errors.travel_date = 'Travel date is required';
        if (!data.departure_time) errors.departure_time = 'Departure time is required';
        if (data.fare_multiplier && data.fare_multiplier <= 0) {
            errors.fare_multiplier = 'Fare multiplier must be greater than 0';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    checkTripConflicts: (tripData: TripFormData, excludeId?: string) => {
        const existingTrips = get().data.filter(trip =>
            trip.id !== excludeId &&
            trip.vessel_id === tripData.vessel_id &&
            trip.travel_date === tripData.travel_date &&
            trip.departure_time === tripData.departure_time &&
            trip.status !== 'cancelled'
        );

        return {
            hasConflict: existingTrips.length > 0,
            conflictingTrip: existingTrips[0]
        };
    },

    // State management
    setCurrentItem: (item) => set({ currentItem: item }),
    clearError: () => set({ error: null }),
    setError: (error) => set({ error }),

    // Search and filter
    setSearchQuery: (query) => set({ searchQuery: query }),
    clearFilters: () => set({ filters: {} }),

    // Sort actions
    setSortBy: (sortBy) => set({ sortBy }),
    setSortOrder: (order) => set({ sortOrder: order }),

    // Filter actions
    setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

    // Search and filter utilities
    searchItems: (items, query) => {
        if (!query.trim()) return items;
        const searchTerm = query.toLowerCase();
        return items.filter(trip =>
            trip.route_name?.toLowerCase().includes(searchTerm) ||
            trip.vessel_name?.toLowerCase().includes(searchTerm) ||
            trip.travel_date.includes(searchTerm) ||
            trip.departure_time.includes(searchTerm) ||
            trip.status.toLowerCase().includes(searchTerm)
        );
    },

    filterItems: (items, filters) => {
        return items.filter(trip => {
            if (filters.status && filters.status !== 'all' && trip.status !== filters.status) {
                return false;
            }
            if (filters.route_id && trip.route_id !== filters.route_id) {
                return false;
            }
            if (filters.vessel_id && trip.vessel_id !== filters.vessel_id) {
                return false;
            }
            if (filters.date_range) {
                const tripDate = new Date(trip.travel_date);
                const fromDate = new Date(filters.date_range.from);
                const toDate = new Date(filters.date_range.to);
                if (tripDate < fromDate || tripDate > toDate) {
                    return false;
                }
            }
            return true;
        });
    },

    sortItems: (items, sortBy, order) => {
        return [...items].sort((a, b) => {
            let aValue: any = (a as any)[sortBy];
            let bValue: any = (b as any)[sortBy];

            if (sortBy === 'travel_date' || sortBy === 'departure_time') {
                aValue = new Date(`${a.travel_date} ${a.departure_time}`);
                bValue = new Date(`${b.travel_date} ${b.departure_time}`);
            }

            if (aValue < bValue) return order === 'asc' ? -1 : 1;
            if (aValue > bValue) return order === 'asc' ? 1 : -1;
            return 0;
        });
    },

    // Statistics calculation
    calculateStats: () => {
        const trips = get().data;
        const today = new Date().toISOString().split('T')[0];

        const stats: TripStats = {
            total: trips.length,
            active: trips.filter(t => t.is_active).length,
            inactive: trips.filter(t => !t.is_active).length,
            scheduled: trips.filter(t => t.status === 'scheduled').length,
            inProgress: trips.filter(t => ['boarding', 'departed'].includes(t.status)).length,
            completed: trips.filter(t => t.status === 'arrived').length,
            cancelled: trips.filter(t => t.status === 'cancelled').length,
            delayed: trips.filter(t => t.status === 'delayed').length,
            todayTrips: trips.filter(t => t.travel_date === today).length,
            averageOccupancy: trips.length > 0 ?
                trips.reduce((sum, trip) => sum + (trip.occupancy_rate || 0), 0) / trips.length : 0,
            totalRevenue: trips.reduce((sum, trip) => {
                const baseFare = trip.base_fare || 0;
                const fareMultiplier = trip.fare_multiplier || 1;
                const bookings = trip.confirmed_bookings || 0;
                return sum + (bookings * baseFare * fareMultiplier);
            }, 0),
            onTimePerformance: trips.length > 0 ?
                (trips.filter(t => t.status !== 'delayed' && t.status !== 'cancelled').length / trips.length) * 100 : 0,
            avgFare: trips.length > 0 ?
                trips.reduce((sum, trip) => sum + (trip.base_fare || 0), 0) / trips.length : 0,
            totalBookings: trips.reduce((sum, trip) => sum + (trip.confirmed_bookings || 0), 0),
            totalPassengers: trips.reduce((sum, trip) => sum + (trip.booked_seats || 0), 0),
        };

        set({ stats });
    },

    // Computed data calculation
    calculateComputedData: () => {
        const { data, searchQuery, filters, sortBy, sortOrder } = get();

        // Apply search
        let filtered = get().searchItems(data, searchQuery);

        // Apply filters
        filtered = get().filterItems(filtered, filters);

        // Apply sorting
        const sorted = get().sortItems(filtered, sortBy, sortOrder);

        // Group by status
        const tripsByStatus: Record<string, Trip[]> = {};
        data.forEach(trip => {
            const status = trip.status;
            if (!tripsByStatus[status]) tripsByStatus[status] = [];
            tripsByStatus[status].push(trip);
        });

        // Group by route
        const tripsByRoute: Record<string, Trip[]> = {};
        data.forEach(trip => {
            const routeId = trip.route_id;
            if (!tripsByRoute[routeId]) tripsByRoute[routeId] = [];
            tripsByRoute[routeId].push(trip);
        });

        // Group by vessel
        const tripsByVessel: Record<string, Trip[]> = {};
        data.forEach(trip => {
            const vesselId = trip.vessel_id;
            if (!tripsByVessel[vesselId]) tripsByVessel[vesselId] = [];
            tripsByVessel[vesselId].push(trip);
        });

        set({
            filteredTrips: filtered,
            sortedTrips: sorted,
            tripsByStatus,
            tripsByRoute,
            tripsByVessel
        });

        // Calculate stats
        get().calculateStats();
    },

    // Utility
    refreshAll: async () => {
        await get().fetchAll();
    },

    resetStore: () => {
        set({
            data: [],
            currentItem: null,
            loading: {},
            error: null,
            searchQuery: '',
            filters: {},
            stats: {
                total: 0,
                active: 0,
                inactive: 0,
                scheduled: 0,
                inProgress: 0,
                completed: 0,
                cancelled: 0,
                delayed: 0,
                averageOccupancy: 0,
                totalRevenue: 0,
                todayTrips: 0,
                onTimePerformance: 0,
                avgFare: 0,
                totalBookings: 0,
                totalPassengers: 0,
            },
            filteredTrips: [],
            sortedTrips: [],
            tripsByStatus: {},
            tripsByRoute: {},
            tripsByVessel: {},
            routes: [],
            vessels: []
        });
    }
})); 