// Base Operations Types
export interface Island {
    id: string;
    name: string;
    zone: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    created_at: string;
    updated_at: string;
}

export interface Route {
    id: string;
    name: string;
    origin: string;
    destination: string;
    from_island_id: string;
    to_island_id: string;
    from_island?: Island;
    to_island?: Island;
    distance: string;
    duration: string;
    base_fare: number;
    status: "active" | "inactive" | "maintenance";
    description?: string;
    created_at: string;
    updated_at: string;

    // Statistics (optional for display)
    total_trips_30d?: number;
    total_bookings_30d?: number;
    total_revenue_30d?: number;
    average_occupancy_30d?: number;
    cancellation_rate_30d?: number;
    popularity_score?: number;
}

export interface Vessel {
    id: string;
    name: string;
    registration_number: string;
    capacity: number;
    seating_capacity: number;
    crew_capacity: number;
    status: "active" | "maintenance" | "inactive" | "decommissioned";
    vessel_type: "ferry" | "speedboat" | "catamaran";
    manufacturer?: string;
    year_built?: number;
    last_maintenance?: string;
    next_maintenance?: string;
    specifications?: {
        length: number;
        width: number;
        engine_type: string;
        max_speed: number;
        fuel_capacity: number;
    };
    current_location?: {
        latitude: number;
        longitude: number;
        last_updated: string;
    };
    created_at: string;
    updated_at: string;

    // Statistics (optional for display)
    total_trips_30d?: number;
    capacity_utilization_30d?: number;
    total_revenue_30d?: number;
    maintenance_cost_30d?: number;
    fuel_consumption_30d?: number;
    average_rating?: number;
}

export interface Trip {
    id: string;
    route_id: string;
    vessel_id: string;
    travel_date: string;
    departure_time: string;
    arrival_time?: string;
    estimated_duration: string;
    status: "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
    delay_reason?: string;
    available_seats: number;
    booked_seats: number;
    fare_multiplier: number;
    weather_conditions?: string;
    captain_id?: string;
    crew_ids?: string[];
    notes?: string;
    created_at: string;
    updated_at: string;

    // Related data (for display)
    route?: Route;
    vessel?: Vessel;
    routeName?: string;
    vesselName?: string;
    bookings?: number;
    capacity?: number;
    is_active?: boolean;
}

export interface Schedule {
    id: string;
    route_id: string;
    vessel_id: string;
    days_of_week: number[]; // 0-6 (Sunday-Saturday)
    departure_time: string;
    is_active: boolean;
    valid_from: string;
    valid_until?: string;
    fare_multiplier: number;
    created_at: string;
    updated_at: string;

    // Related data
    route?: Route;
    vessel?: Vessel;
}

// Form Data Types
export interface RouteFormData {
    name: string;
    from_island_id: string;
    to_island_id: string;
    distance: string;
    duration: string;
    base_fare: number;
    description?: string;
    status: "active" | "inactive";
}

export interface VesselFormData {
    name: string;
    registration_number: string;
    capacity: number;
    seating_capacity: number;
    crew_capacity: number;
    vessel_type: "ferry" | "speedboat" | "catamaran";
    manufacturer?: string;
    year_built?: number;
    status: "active" | "maintenance" | "inactive";
    specifications?: {
        length: number;
        width: number;
        engine_type: string;
        max_speed: number;
        fuel_capacity: number;
    };
}

export interface TripFormData {
    route_id: string;
    vessel_id: string;
    travel_date: string;
    departure_time: string;
    arrival_time?: string;
    fare_multiplier: number;
    notes?: string;
    weather_conditions?: string;
    captain_id?: string;
    crew_ids?: string[];
}

export interface ScheduleFormData {
    route_id: string;
    vessel_id: string;
    days_of_week: number[];
    departure_time: string;
    valid_from: string;
    valid_until?: string;
    fare_multiplier: number;
}

// Validation Types
export interface RouteValidationErrors {
    name?: string;
    from_island_id?: string;
    to_island_id?: string;
    distance?: string;
    duration?: string;
    base_fare?: string;
    general?: string;
}

export interface VesselValidationErrors {
    name?: string;
    registration_number?: string;
    capacity?: string;
    seating_capacity?: string;
    crew_capacity?: string;
    vessel_type?: string;
    year_built?: string;
    specifications?: {
        length?: string;
        width?: string;
        engine_type?: string;
        max_speed?: string;
        fuel_capacity?: string;
    };
    general?: string;
}

export interface TripValidationErrors {
    route_id?: string;
    vessel_id?: string;
    travel_date?: string;
    departure_time?: string;
    arrival_time?: string;
    fare_multiplier?: string;
    general?: string;
}

export interface ScheduleValidationErrors {
    route_id?: string;
    vessel_id?: string;
    days_of_week?: string;
    departure_time?: string;
    valid_from?: string;
    valid_until?: string;
    fare_multiplier?: string;
    general?: string;
}

// Filter and Search Types
export interface RouteFilters {
    status?: "all" | "active" | "inactive" | "maintenance";
    from_island_id?: string;
    to_island_id?: string;
    fare_range?: {
        min: number;
        max: number;
    };
    distance_range?: {
        min: number;
        max: number;
    };
}

export interface VesselFilters {
    status?: "all" | "active" | "maintenance" | "inactive" | "decommissioned";
    vessel_type?: "all" | "ferry" | "speedboat" | "catamaran";
    capacity_range?: {
        min: number;
        max: number;
    };
    year_range?: {
        min: number;
        max: number;
    };
}

export interface TripFilters {
    status?: "all" | "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
    route_id?: string;
    vessel_id?: string;
    date_range?: {
        from: string;
        to: string;
    };
    departure_time_range?: {
        from: string;
        to: string;
    };
}

export interface ScheduleFilters {
    route_id?: string;
    vessel_id?: string;
    is_active?: boolean;
    days_of_week?: number[];
}

// Sort Types
export type RouteSortField = "name" | "origin" | "destination" | "base_fare" | "distance" | "created_at" | "total_trips_30d" | "total_revenue_30d";
export type VesselSortField = "name" | "capacity" | "seating_capacity" | "vessel_type" | "year_built" | "created_at" | "total_trips_30d" | "capacity_utilization_30d";
export type TripSortField = "travel_date" | "departure_time" | "status" | "available_seats" | "booked_seats" | "created_at";
export type ScheduleSortField = "departure_time" | "valid_from" | "created_at";

export interface SortConfig {
    field: RouteSortField | VesselSortField | TripSortField | ScheduleSortField;
    direction: "asc" | "desc";
}

// Operations Statistics Types
export interface RouteStats {
    total_routes: number;
    active_routes: number;
    inactive_routes: number;
    maintenance_routes: number;
    most_popular_route: Route | null;
    highest_revenue_route: Route | null;
    average_fare: number;
    total_distance: number;
}

export interface VesselStats {
    total_vessels: number;
    active_vessels: number;
    maintenance_vessels: number;
    inactive_vessels: number;
    total_capacity: number;
    average_utilization: number;
    newest_vessel: Vessel | null;
    oldest_vessel: Vessel | null;
}

export interface TripStats {
    total_trips: number;
    scheduled_trips: number;
    completed_trips: number;
    cancelled_trips: number;
    delayed_trips: number;
    average_occupancy: number;
    on_time_performance: number;
    total_passengers: number;
}

export interface OperationsOverview {
    route_stats: RouteStats;
    vessel_stats: VesselStats;
    trip_stats: TripStats;
    daily_schedule: Trip[];
    upcoming_maintenance: Vessel[];
    recent_activity: {
        type: "route" | "vessel" | "trip" | "schedule";
        action: "created" | "updated" | "deleted";
        entity_name: string;
        timestamp: string;
        user_name: string;
    }[];
}

// Action Types
export interface OperationsAction {
    id: string;
    type: "create" | "update" | "delete" | "bulk_update";
    resource: "route" | "vessel" | "trip" | "schedule";
    description: string;
    timestamp: string;
    user_id: string;
    user_name: string;
    details?: any;
}

// All types are already exported individually above 