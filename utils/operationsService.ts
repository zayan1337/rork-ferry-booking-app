import { supabase } from './supabase';
import {
  DatabaseIsland,
  OperationsRoute,
  OperationsTrip,
  OperationsVessel,
} from '@/types/database';

// Routes - using the updated operations_routes_view
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
      // New fields from database
      name: route.name,
      distance: route.distance,
      duration: route.duration,
      description: route.description,
      status: route.status || (route.is_active ? 'active' : 'inactive'),
      // Computed fields from view
      route_name: route.route_name,
      from_island_name: route.from_island_name,
      to_island_name: route.to_island_name,
      total_trips_30d: route.total_trips_30d || 0,
      total_bookings_30d: route.total_bookings_30d || 0,
      total_revenue_30d: route.total_revenue_30d || 0,
      average_occupancy_30d: route.avg_occupancy_30d || 0,
      cancellation_rate_30d: 0, // Will be calculated if needed
      // Backward compatibility fields
      origin: route.from_island_name || '',
      destination: route.to_island_name || '',
    }));
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

export const fetchRoute = async (
  id: string
): Promise<OperationsRoute | null> => {
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
      // New fields from database
      name: data.name,
      distance: data.distance,
      duration: data.duration,
      description: data.description,
      status: data.status || (data.is_active ? 'active' : 'inactive'),
      // Computed fields from view
      route_name: data.route_name,
      from_island_name: data.from_island_name,
      to_island_name: data.to_island_name,
      total_trips_30d: data.total_trips_30d || 0,
      total_bookings_30d: data.total_bookings_30d || 0,
      total_revenue_30d: data.total_revenue_30d || 0,
      average_occupancy_30d: data.avg_occupancy_30d || 0,
      cancellation_rate_30d: 0, // Will be calculated if needed
      // Backward compatibility fields
      origin: data.from_island_name || '',
      destination: data.to_island_name || '',
    };
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

export const createRoute = async (routeData: {
  name?: string;
  from_island_id: string;
  to_island_id: string;
  base_fare: number;
  distance?: string;
  duration?: string;
  description?: string;
  status?: string;
}): Promise<OperationsRoute | null> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .insert([
        {
          name: routeData.name,
          from_island_id: routeData.from_island_id,
          to_island_id: routeData.to_island_id,
          base_fare: routeData.base_fare,
          distance: routeData.distance,
          duration: routeData.duration,
          description: routeData.description,
          status: routeData.status || 'active',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch the complete route with computed fields
    return await fetchRoute(data.id);
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
};

export const updateRoute = async (
  id: string,
  updates: Partial<{
    name: string;
    from_island_id: string;
    to_island_id: string;
    base_fare: number;
    distance: string;
    duration: string;
    description: string;
    status: string;
    is_active: boolean;
  }>
): Promise<OperationsRoute | null> => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch the complete route with computed fields
    return await fetchRoute(data.id);
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
};

export const deleteRoute = async (id: string): Promise<boolean> => {
  try {
    // First check if route has any trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .eq('route_id', id)
      .limit(1);

    if (tripsError) throw tripsError;

    if (trips && trips.length > 0) {
      throw new Error(
        'Cannot delete route with existing trips. Please remove all trips first.'
      );
    }

    const { error } = await supabase.from('routes').delete().eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
};

// Trips - using the operations_trips_view
export const fetchTrips = async (): Promise<OperationsTrip[]> => {
  try {
    const { data, error } = await supabase
      .from('operations_trips_view')
      .select('*')
      .gte('travel_date', new Date().toISOString().split('T')[0])
      .order('travel_date', { ascending: true })
      .order('departure_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((trip: any) => {
      const confirmedBookings =
        typeof trip.confirmed_bookings !== 'undefined' &&
        trip.confirmed_bookings !== null
          ? Number(trip.confirmed_bookings)
          : Number(trip.bookings) || 0;

      return {
        id: trip.id,
        route_id: trip.route_id,
        travel_date: trip.travel_date,
        departure_time: trip.departure_time,
        arrival_time: trip.arrival_time || null,
        vessel_id: trip.vessel_id,
        available_seats: trip.available_seats,
        is_active: trip.is_active,
        created_at: trip.created_at,
        // Computed fields from view
        vessel_name: trip.vessel_name,
        route_name: trip.route_name,
        from_island_name: trip.from_island_name,
        to_island_name: trip.to_island_name,
        seating_capacity: trip.capacity,
        // Use booked_seats from view (excludes cancelled bookings - total_passengers)
        // NOT trip.bookings which is just the count of bookings
        booked_seats: Number(trip.booked_seats) || 0,
        bookings: confirmedBookings,
        capacity: trip.capacity,
        status: trip.computed_status,
        total_revenue: Number(trip.total_revenue) || 0,
        occupancy_rate: Number(trip.occupancy_rate) || 0,
        // Backward compatibility
        routeName: trip.route_name,
        vesselName: trip.vessel_name,
      };
    });
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

    const confirmedBookings =
      typeof data.confirmed_bookings !== 'undefined' &&
      data.confirmed_bookings !== null
        ? Number(data.confirmed_bookings)
        : Number(data.bookings) || 0;

    return {
      id: data.id,
      route_id: data.route_id,
      travel_date: data.travel_date,
      departure_time: data.departure_time,
      arrival_time: data.arrival_time || null,
      vessel_id: data.vessel_id,
      available_seats: data.available_seats,
      is_active: data.is_active,
      created_at: data.created_at,
      // Computed fields from view
      vessel_name: data.vessel_name,
      route_name: data.route_name,
      from_island_name: data.from_island_name,
      to_island_name: data.to_island_name,
      seating_capacity: data.capacity,
      // Use booked_seats from view (excludes cancelled bookings - total_passengers)
      // NOT data.bookings which is just the count of bookings
      booked_seats: Number(data.booked_seats) || 0,
      bookings: confirmedBookings,
      capacity: data.capacity,
      status: data.computed_status,
      total_revenue: Number(data.total_revenue) || 0,
      occupancy_rate: Number(data.occupancy_rate) || 0,
      // Backward compatibility
      routeName: data.route_name,
      vesselName: data.vessel_name,
    };
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
};

export const createTrip = async (tripData: {
  route_id: string;
  travel_date: string;
  departure_time: string;
  vessel_id: string;
  available_seats: number;
  captain_id?: string;
}): Promise<OperationsTrip | null> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          route_id: tripData.route_id,
          travel_date: tripData.travel_date,
          departure_time: tripData.departure_time,
          vessel_id: tripData.vessel_id,
          available_seats: tripData.available_seats,
          captain_id: tripData.captain_id || null,
          is_active: true,
          status: 'scheduled',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch the complete trip with computed fields
    return await fetchTrip(data.id);
  } catch (error) {
    console.error('Error creating trip:', error);
    throw error;
  }
};

export const updateTrip = async (
  id: string,
  updates: Partial<{
    route_id: string;
    travel_date: string;
    departure_time: string;
    vessel_id: string;
    available_seats: number;
    is_active: boolean;
    status: string;
    captain_id: string;
  }>
): Promise<OperationsTrip | null> => {
  try {
    // Filter out undefined values and convert empty strings to null for UUID fields
    const cleanedUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        if (value === undefined) return acc;

        // Convert empty strings to null for UUID fields
        if (
          (key === 'captain_id' || key === 'route_id' || key === 'vessel_id') &&
          value === ''
        ) {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as any
    );

    const { data, error } = await supabase
      .from('trips')
      .update(cleanedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch the complete trip with computed fields
    return await fetchTrip(data.id);
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  try {
    // First check if trip has any bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('trip_id', id)
      .limit(1);

    if (bookingsError) throw bookingsError;

    if (bookings && bookings.length > 0) {
      throw new Error('Cannot delete trip with existing bookings.');
    }

    const { error } = await supabase.from('trips').delete().eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

// Vessels - using the operations_vessels_view
export const fetchVessels = async (): Promise<OperationsVessel[]> => {
  try {
    const { data, error } = await supabase
      .from('operations_vessels_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((vessel: any) => ({
      id: vessel.id,
      name: vessel.name,
      make: vessel.make,
      model: vessel.model,
      registration_number: vessel.registration_number,
      seating_capacity: vessel.seating_capacity,
      is_active: vessel.is_active,
      created_at: vessel.created_at,
      status: vessel.status,
      // Performance metrics
      total_trips_30d: vessel.total_trips_30d || 0,
      total_bookings_30d: vessel.total_bookings_30d || 0,
      total_passengers_30d: vessel.total_passengers_30d || 0,
      total_revenue_30d: vessel.total_revenue_30d || 0,
      capacity_utilization_30d: vessel.capacity_utilization_30d || 0,
      avg_passengers_per_trip: vessel.avg_passengers_per_trip || 0,
      days_in_service_30d: vessel.days_in_service_30d || 0,
    }));
  } catch (error) {
    console.error('Error fetching vessels:', error);
    return [];
  }
};

export const fetchVessel = async (
  id: string
): Promise<OperationsVessel | null> => {
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
      name: data.name,
      make: data.make,
      model: data.model,
      registration_number: data.registration_number,
      seating_capacity: data.seating_capacity,
      is_active: data.is_active,
      created_at: data.created_at,
      status: data.status,
      // Performance metrics
      total_trips_30d: data.total_trips_30d || 0,
      total_bookings_30d: data.total_bookings_30d || 0,
      total_passengers_30d: data.total_passengers_30d || 0,
      total_revenue_30d: data.total_revenue_30d || 0,
      capacity_utilization_30d: data.capacity_utilization_30d || 0,
      avg_passengers_per_trip: data.avg_passengers_per_trip || 0,
      days_in_service_30d: data.days_in_service_30d || 0,
    };
  } catch (error) {
    console.error('Error fetching vessel:', error);
    return null;
  }
};

export const createVessel = async (vesselData: {
  name: string;
  seating_capacity: number;
}): Promise<OperationsVessel | null> => {
  try {
    const { data, error } = await supabase
      .from('vessels')
      .insert([
        {
          name: vesselData.name,
          seating_capacity: vesselData.seating_capacity,
          is_active: true,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch the complete vessel with computed fields
    return await fetchVessel(data.id);
  } catch (error) {
    console.error('Error creating vessel:', error);
    throw error;
  }
};

export const updateVessel = async (
  id: string,
  updates: Partial<{
    name: string;
    seating_capacity: number;
    is_active: boolean;
    status: string;
  }>
): Promise<OperationsVessel | null> => {
  try {
    const { data, error } = await supabase
      .from('vessels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    // Fetch the complete vessel with computed fields
    return await fetchVessel(data.id);
  } catch (error) {
    console.error('Error updating vessel:', error);
    throw error;
  }
};

export const deleteVessel = async (id: string): Promise<boolean> => {
  try {
    // First check if vessel has any trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .eq('vessel_id', id)
      .limit(1);

    if (tripsError) throw tripsError;

    if (trips && trips.length > 0) {
      throw new Error('Cannot delete vessel with existing trips.');
    }

    const { error } = await supabase.from('vessels').delete().eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting vessel:', error);
    throw error;
  }
};

// Islands - using the islands table with zone information
export const fetchIslands = async (): Promise<DatabaseIsland[]> => {
  try {
    const { data, error } = await supabase
      .from('islands')
      .select(
        `
                *,
                zones (
                    id,
                    name,
                    code,
                    description,
                    is_active
                )
            `
      )
      .order('name', { ascending: true });

    if (error) throw error;

    // Transform the data to include zone information directly
    return (data || []).map(island => ({
      ...island,
      zone_info: island.zones || null,
    }));
  } catch (error) {
    console.error('Error fetching islands:', error);
    return [];
  }
};

export const fetchIsland = async (
  id: string
): Promise<DatabaseIsland | null> => {
  try {
    const { data, error } = await supabase
      .from('islands')
      .select(
        `
                *,
                zones (
                    id,
                    name,
                    code,
                    description,
                    is_active
                )
            `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    // Transform the data to include zone information directly
    return data
      ? {
          ...data,
          zone_info: data.zones || null,
        }
      : null;
  } catch (error) {
    console.error('Error fetching island:', error);
    return null;
  }
};

export const createIsland = async (islandData: {
  name: string;
  zone_id?: string;
  zone?: string; // Keep for backward compatibility
  is_active?: boolean;
}): Promise<DatabaseIsland | null> => {
  try {
    const { data, error } = await supabase
      .from('islands')
      .insert([
        {
          name: islandData.name,
          zone_id: islandData.zone_id,
          zone: islandData.zone || islandData.name, // Fallback for backward compatibility
          is_active: islandData.is_active ?? true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating island:', error);
    throw error;
  }
};

export const updateIsland = async (
  id: string,
  updates: Partial<{
    name: string;
    zone_id: string;
    zone: string; // Keep for backward compatibility
    is_active: boolean;
  }>
): Promise<DatabaseIsland | null> => {
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
    // First check if island is used in any routes
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select('id')
      .or(`from_island_id.eq.${id},to_island_id.eq.${id}`)
      .limit(1);

    if (routesError) throw routesError;

    if (routes && routes.length > 0) {
      throw new Error('Cannot delete island that is used in routes.');
    }

    const { error } = await supabase.from('islands').delete().eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting island:', error);
    throw error;
  }
};

// Today's schedule
export const fetchTodaySchedule = async (): Promise<OperationsTrip[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('operations_trips_view')
      .select('*')
      .eq('travel_date', today)
      .eq('is_active', true)
      .order('departure_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((trip: any) => ({
      id: trip.id,
      route_id: trip.route_id,
      travel_date: trip.travel_date,
      departure_time: trip.departure_time,
      arrival_time: trip.arrival_time || null,
      vessel_id: trip.vessel_id,
      available_seats: trip.available_seats,
      is_active: trip.is_active,
      created_at: trip.created_at,
      // Computed fields from view
      vessel_name: trip.vessel_name,
      route_name: trip.route_name,
      from_island_name: trip.from_island_name,
      to_island_name: trip.to_island_name,
      seating_capacity: trip.capacity,
      booked_seats: trip.bookings || 0,
      bookings: trip.bookings || 0,
      capacity: trip.capacity,
      status: trip.computed_status,
      // Backward compatibility
      routeName: trip.route_name,
      vesselName: trip.vessel_name,
    }));
  } catch (error) {
    console.error('Error fetching today schedule:', error);
    return [];
  }
};
