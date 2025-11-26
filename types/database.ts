// Database types matching Supabase schema
export interface DatabaseRoute {
  id: string;
  from_island_id: string;
  to_island_id: string;
  base_fare: number;
  is_active: boolean;
  created_at: string;
}

export interface DatabaseTrip {
  id: string;
  route_id: string;
  travel_date: string;
  departure_time: string;
  vessel_id: string;
  available_seats: number;
  is_active: boolean;
  created_at: string;
}

export interface DatabaseVessel {
  id: string;
  name: string;
  make?: string;
  model?: string;
  registration_number?: string;
  seating_capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface DatabaseIsland {
  id: string;
  name: string;
  zone: string; // Legacy field - for backward compatibility
  zone_id?: string; // New field - references zones table
  is_active: boolean;
  created_at: string;
  zone_info?: {
    id: string;
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
  } | null;
}

export interface DatabaseBooking {
  id: string;
  booking_number: string;
  user_id: string;
  trip_id: string;
  is_round_trip: boolean;
  return_booking_id?: string;
  status:
    | 'reserved'
    | 'pending_payment'
    | 'confirmed'
    | 'checked_in'
    | 'completed'
    | 'cancelled';
  total_fare: number;
  qr_code_url?: string;
  check_in_status: boolean;
  created_at: string;
  updated_at: string;
  agent_id?: string;
  payment_method_type?: string;
  agent_client_id?: string;
  round_trip_group_id?: string;
}

// View types based on the database views provided
export interface RoutePerformanceView {
  id: string;
  route_name: string;
  from_island_id: string;
  to_island_id: string;
  base_fare: number;
  is_active: boolean;
  created_at: string;
  from_island_name: string;
  to_island_name: string;
  total_trips_30d: number;
  total_bookings_30d: number;
  confirmed_bookings_30d: number;
  total_revenue_30d: number;
  average_occupancy_30d: number;
  cancellation_rate_30d: number;
  average_fare_30d: number;
}

export interface VesselUtilizationView {
  id: string;
  name: string;
  seating_capacity: number;
  is_active: boolean;
  created_at: string;
  total_trips_30d: number;
  total_bookings_30d: number;
  total_passengers_30d: number;
  total_revenue_30d: number;
  capacity_utilization_30d: number;
  avg_passengers_per_trip: number;
  days_in_service_30d: number;
}

export interface TripsWithAvailableSeats {
  id: string;
  route_id: string;
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  is_active: boolean;
  created_at: string;
  vessel_name: string;
  seating_capacity: number;
  available_seats: number;
}

// Admin dashboard views
export interface AdminBookingsView {
  id: string;
  booking_number: string;
  user_id: string;
  trip_id: string;
  is_round_trip: boolean;
  return_booking_id?: string;
  status: string;
  total_fare: number;
  qr_code_url?: string;
  check_in_status: boolean;
  agent_id?: string;
  agent_client_id?: string;
  payment_method_type?: string;
  round_trip_group_id?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_mobile?: string;
  trip_travel_date: string;
  trip_departure_time: string;
  trip_base_fare: number;
  vessel_name: string;
  vessel_capacity: number;
  route_name: string;
  from_island_name: string;
  to_island_name: string;
  agent_name?: string;
  agent_email?: string;
  passenger_count: number;
  payment_status?: string;
  payment_amount?: number;
  payment_method?: string;
}

export interface AdminUsersView {
  id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  date_of_birth: string;
  role: 'customer' | 'agent' | 'admin' | 'captain' | 'staff';
  is_active: boolean;
  created_at: string;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  total_spent: number;
  last_booking_date?: string;
  agent_bookings: number;
  agent_revenue: number;
  is_recently_active: boolean;
}

// Enhanced types with computed data for admin operations
export interface OperationsRoute extends DatabaseRoute {
  route_name: string;
  from_island_name: string;
  to_island_name: string;
  total_trips_30d?: number;
  total_bookings_30d?: number;
  total_revenue_30d?: number;
  average_occupancy_30d?: number;
  cancellation_rate_30d?: number;
  status: 'active' | 'inactive';
  description?: string;
  // Computed fields for display
  name?: string;
  origin?: string;
  destination?: string;
  distance?: string;
  duration?: string;
}

export interface OperationsTrip extends DatabaseTrip {
  vessel_name: string;
  route_name: string;
  from_island_name: string;
  to_island_name: string;
  seating_capacity: number;
  booked_seats: number;
  bookings: number;
  confirmed_bookings?: number;
  capacity: number;
  arrival_time: string;
  total_revenue?: number;
  occupancy_rate?: number;
  // Computed fields for display
  routeName?: string;
  vesselName?: string;
  status:
    | 'scheduled'
    | 'boarding'
    | 'departed'
    | 'arrived'
    | 'cancelled'
    | 'delayed'
    | 'in-progress'
    | 'completed';
}

export interface OperationsVessel extends DatabaseVessel {
  total_trips_30d?: number;
  total_bookings_30d?: number;
  total_passengers_30d?: number;
  total_revenue_30d?: number;
  capacity_utilization_30d?: number;
  avg_passengers_per_trip?: number;
  days_in_service_30d?: number;
  status: 'active' | 'maintenance' | 'inactive';
}

// FAQ Database Types
export interface DBFaqCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface DBFaq {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
  category?: DBFaqCategory;
}

// Enhanced FAQ types for management
export interface DatabaseFAQCategory extends DBFaqCategory {
  description?: string;
  order_index: number;
  is_active: boolean;
  faq_count?: number;
  active_faq_count?: number;
  last_updated?: string;
}

export interface DatabaseFAQ extends DBFaq {
  is_active: boolean;
  order_index: number;
  created_by?: string;
  updated_by?: string;
  category?: DatabaseFAQCategory;
}

// FAQ views for management interface
export interface FAQManagementView extends DatabaseFAQ {
  category_name: string;
  category_order: number;
  is_category_active: boolean;
}

export interface FAQCategoryManagementView extends DatabaseFAQCategory {
  total_faqs: number;
  active_faqs: number;
  recent_updates: number;
}
