import { supabase } from './supabase';
import {
    DatabaseRoute,
    DatabaseTrip,
    DatabaseVessel,
    DatabaseIsland,
    OperationsRoute,
    OperationsTrip,
    OperationsVessel,
} from '@/types/database';

// Routes - using the new operations_routes_view
export const fetchRoutes = async (): Promise<OperationsRoute[]> => {
    try {
        const { data, error } = await supabase
            .from('operations_routes_view')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((route: any) => ({
            id: route.id,
            from_island_id: route.from_island_id,
            to_island_id: route.to_island_id,
            base_fare: route.base_fare,
            is_active: route.is_active,
            created_at: route.created_at,
            route_name: route.route_name,
            from_island_name: route.from_island_name,
            to_island_name: route.to_island_name,
            total_trips_30d: route.total_trips_30d || 0,
            total_bookings_30d: route.total_bookings_30d || 0,
            total_revenue_30d: route.total_revenue_30d || 0,
            average_occupancy_30d: route.average_occupancy_30d || 0,
            cancellation_rate_30d: route.cancellation_rate_30d || 0,
            status: route.is_active ? 'active' : 'inactive',
            // Computed fields for display compatibility - use correct field names
            name: route.route_name || '',
            origin: route.from_island_name || '',
            destination: route.to_island_name || '',
            distance: route.distance || `${30 + (route.id?.slice(-2) || '00').charCodeAt(0) % 20} km`,
            duration: route.duration || `${60 + (route.id?.slice(-2) || '00').charCodeAt(1) % 30} min`,
        }));
    } catch (error) {
        console.error('Error fetching routes:', error);
        return [];
    }
};

export const fetchRoute = async (id: string): Promise<OperationsRoute | null> => {
    try {
        const { data, error } = await supabase
            .from('operations_routes_view')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            from_island_id: data.from_island_id,
            to_island_id: data.to_island_id,
            base_fare: data.base_fare,
            is_active: data.is_active,
            created_at: data.created_at,
            route_name: data.route_name,
            from_island_name: data.from_island_name,
            to_island_name: data.to_island_name,
            total_trips_30d: data.total_trips_30d || 0,
            total_bookings_30d: data.total_bookings_30d || 0,
            total_revenue_30d: data.total_revenue_30d || 0,
            average_occupancy_30d: data.average_occupancy_30d || 0,
            cancellation_rate_30d: data.cancellation_rate_30d || 0,
            status: data.is_active ? 'active' : 'inactive',
            // Computed fields for display compatibility - use correct field names
            name: data.route_name || '',
            origin: data.from_island_name || '',
            destination: data.to_island_name || '',
            distance: data.distance || `${30 + (data.id?.slice(-2) || '00').charCodeAt(0) % 20} km`,
            duration: data.duration || `${60 + (data.id?.slice(-2) || '00').charCodeAt(1) % 30} min`,
        };
    } catch (error) {
        console.error('Error fetching route:', error);
        return null;
    }
};

// Trips - using the new operations_trips_view
export const fetchTrips = async (): Promise<OperationsTrip[]> => {
    try {
        const { data, error } = await supabase
            .from('operations_trips_view')
            .select('*')
            .eq('is_active', true)
            .gte('travel_date', new Date().toISOString().split('T')[0])
            .order('travel_date', { ascending: true })
            .order('departure_time', { ascending: true });

        if (error) throw error;

        return (data || []).map((trip: any) => ({
            id: trip.id,
            route_id: trip.route_id,
            travel_date: trip.travel_date,
            departure_time: trip.departure_time,
            vessel_id: trip.vessel_id,
            available_seats: trip.available_seats || 0,
            is_active: trip.is_active,
            created_at: trip.created_at,
            vessel_name: trip.vessel_name || '',
            route_name: trip.route_name || '',
            from_island_name: trip.from_island_name || '',
            to_island_name: trip.to_island_name || '',
            seating_capacity: trip.capacity || trip.seating_capacity || 0,
            booked_seats: trip.bookings || trip.booked_seats || 0,
            bookings: trip.bookings || 0,
            capacity: trip.capacity || trip.seating_capacity || 0,
            routeName: trip.route_name || '',
            vesselName: trip.vessel_name || '',
            status: trip.computed_status || 'scheduled', // Note: using computed_status from the view
        }));
    } catch (error) {
        console.error('Error fetching trips:', error);
        return [];
    }
};

export const fetchTrip = async (id: string): Promise<OperationsTrip | null> => {
    try {
        const { data, error } = await supabase
            .from('operations_trips_view')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            route_id: data.route_id,
            travel_date: data.travel_date,
            departure_time: data.departure_time,
            vessel_id: data.vessel_id,
            available_seats: data.available_seats || 0,
            is_active: data.is_active,
            created_at: data.created_at,
            vessel_name: data.vessel_name || '',
            route_name: data.route_name || '',
            from_island_name: data.from_island_name || '',
            to_island_name: data.to_island_name || '',
            seating_capacity: data.capacity || data.seating_capacity || 0,
            booked_seats: data.bookings || data.booked_seats || 0,
            bookings: data.bookings || 0,
            capacity: data.capacity || data.seating_capacity || 0,
            routeName: data.route_name || '',
            vesselName: data.vessel_name || '',
            status: data.computed_status || 'scheduled', // Note: using computed_status from the view
        };
    } catch (error) {
        console.error('Error fetching trip:', error);
        return null;
    }
};

// Vessels - using the new operations_vessels_view
export const fetchVessels = async (): Promise<OperationsVessel[]> => {
    try {
        const { data, error } = await supabase
            .from('operations_vessels_view')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((vessel: any) => ({
            id: vessel.id,
            name: vessel.name || '',
            seating_capacity: vessel.seating_capacity || 0,
            is_active: vessel.is_active,
            created_at: vessel.created_at,
            total_trips_30d: vessel.total_trips_30d || 0,
            total_bookings_30d: vessel.total_bookings_30d || 0,
            total_passengers_30d: vessel.total_passengers_30d || 0,
            total_revenue_30d: vessel.total_revenue_30d || 0,
            capacity_utilization_30d: vessel.capacity_utilization_30d || 0,
            avg_passengers_per_trip: vessel.avg_passengers_per_trip || 0,
            days_in_service_30d: vessel.days_in_service_30d || 0,
            status: vessel.status || (vessel.is_active ? 'active' : 'inactive'),
        }));
    } catch (error) {
        console.error('Error fetching vessels:', error);
        return [];
    }
};

export const fetchVessel = async (id: string): Promise<OperationsVessel | null> => {
    try {
        const { data, error } = await supabase
            .from('operations_vessels_view')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            name: data.name || '',
            seating_capacity: data.seating_capacity || 0,
            is_active: data.is_active,
            created_at: data.created_at,
            total_trips_30d: data.total_trips_30d || 0,
            total_bookings_30d: data.total_bookings_30d || 0,
            total_passengers_30d: data.total_passengers_30d || 0,
            total_revenue_30d: data.total_revenue_30d || 0,
            capacity_utilization_30d: data.capacity_utilization_30d || 0,
            avg_passengers_per_trip: data.avg_passengers_per_trip || 0,
            days_in_service_30d: data.days_in_service_30d || 0,
            status: data.status || (data.is_active ? 'active' : 'inactive'),
        };
    } catch (error) {
        console.error('Error fetching vessel:', error);
        return null;
    }
};

// Islands
export const fetchIslands = async (): Promise<DatabaseIsland[]> => {
    try {
        const { data, error } = await supabase
            .from('islands')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching islands:', error);
        return [];
    }
};

export const fetchIsland = async (id: string): Promise<DatabaseIsland | null> => {
    try {
        const { data, error } = await supabase
            .from('islands')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching island:', error);
        return null;
    }
};

export const createIsland = async (islandData: { name: string; zone: string; is_active?: boolean }): Promise<DatabaseIsland | null> => {
    try {
        const { data, error } = await supabase
            .from('islands')
            .insert([{
                name: islandData.name,
                zone: islandData.zone,
                is_active: islandData.is_active ?? true
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating island:', error);
        throw error;
    }
};

export const updateIsland = async (id: string, updates: Partial<DatabaseIsland>): Promise<DatabaseIsland | null> => {
    try {
        const { data, error } = await supabase
            .from('islands')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating island:', error);
        throw error;
    }
};

export const deleteIsland = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('islands')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting island:', error);
        throw error;
    }
};

// Today's schedule using the new view
export const fetchTodaySchedule = async (): Promise<OperationsTrip[]> => {
    try {
        const { data, error } = await supabase
            .from('today_schedule_view')
            .select('*')
            .limit(10);

        if (error) throw error;

        return (data || []).map((trip: any) => ({
            id: trip.id,
            route_id: trip.route_id,
            travel_date: trip.travel_date,
            departure_time: trip.departure_time,
            vessel_id: trip.vessel_id,
            available_seats: trip.available_seats || 0,
            is_active: trip.is_active,
            created_at: trip.created_at,
            vessel_name: trip.vessel_name || '',
            route_name: trip.route_name || '',
            from_island_name: trip.from_island_name || '',
            to_island_name: trip.to_island_name || '',
            seating_capacity: trip.capacity || trip.seating_capacity || 0,
            booked_seats: trip.bookings || trip.booked_seats || 0,
            bookings: trip.bookings || 0,
            capacity: trip.capacity || trip.seating_capacity || 0,
            routeName: trip.route_name || '',
            vesselName: trip.vessel_name || '',
            status: trip.status || 'scheduled',
        }));
    } catch (error) {
        console.error('Error fetching today\'s schedule:', error);
        return [];
    }
};

// Create operations
export const createRoute = async (routeData: {
    from_island_id: string;
    to_island_id: string;
    base_fare: number;
}): Promise<DatabaseRoute | null> => {
    try {
        const { data, error } = await supabase
            .from('routes')
            .insert(routeData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating route:', error);
        return null;
    }
};

export const createTrip = async (tripData: {
    route_id: string;
    travel_date: string;
    departure_time: string;
    vessel_id: string;
    available_seats: number;
}): Promise<DatabaseTrip | null> => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .insert(tripData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating trip:', error);
        return null;
    }
};

export const createVessel = async (vesselData: {
    name: string;
    seating_capacity: number;
}): Promise<DatabaseVessel | null> => {
    try {
        const { data, error } = await supabase
            .from('vessels')
            .insert(vesselData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating vessel:', error);
        return null;
    }
};

// Update operations
export const updateRoute = async (
    id: string,
    updates: Partial<DatabaseRoute>
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('routes')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating route:', error);
        return false;
    }
};

export const updateTrip = async (
    id: string,
    updates: Partial<DatabaseTrip>
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('trips')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating trip:', error);
        return false;
    }
};

export const updateVessel = async (
    id: string,
    updates: Partial<DatabaseVessel>
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('vessels')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating vessel:', error);
        return false;
    }
};

// Delete operations
export const deleteRoute = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('routes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting route:', error);
        return false;
    }
};

export const deleteTrip = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting trip:', error);
        return false;
    }
};

export const deleteVessel = async (id: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('vessels')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting vessel:', error);
        return false;
    }
}; 