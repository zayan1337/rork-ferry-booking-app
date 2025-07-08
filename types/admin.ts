export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  date_of_birth: string;
  role: 'customer' | 'agent' | 'admin';
  is_active: boolean;
  is_super_admin: boolean;
  accepted_terms: boolean;
  agent_discount?: number;
  credit_ceiling?: number;
  credit_balance?: number;
  free_tickets_allocation?: number;
  free_tickets_remaining?: number;
  preferred_language?: string;
  text_direction?: string;
  created_at: string;
  updated_at: string;
  // Admin view specific fields
  total_bookings?: number;
  confirmed_bookings?: number;
  cancelled_bookings?: number;
  total_spent?: number;
  last_booking_date?: string;
  agent_bookings?: number;
  agent_revenue?: number;
  is_recently_active?: boolean;
}

export interface AdminBooking {
  id: string;
  booking_number: string;
  user_id: string;
  trip_id: string;
  is_round_trip: boolean;
  return_booking_id?: string;
  status: 'reserved' | 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  total_fare: number;
  qr_code_url?: string;
  check_in_status: boolean;
  agent_id?: string;
  agent_client_id?: string;
  payment_method_type?: string;
  round_trip_group_id?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  user_email?: string;
  user_mobile?: string;
  trip_route_name?: string;
  trip_travel_date?: string;
  trip_departure_time?: string;
  vessel_name?: string;
  from_island_name?: string;
  to_island_name?: string;
  agent_name?: string;
  passenger_count?: number;
}

export interface AdminRoute {
  id: string;
  from_island_id: string;
  to_island_id: string;
  base_fare: number;
  is_active: boolean;
  created_at: string;
  // Joined data
  from_island_name: string;
  to_island_name: string;
  from_island_zone: 'A' | 'B';
  to_island_zone: 'A' | 'B';
  route_name?: string;
  distance?: string;
  duration?: string;
}

export interface AdminVessel {
  id: string;
  name: string;
  seating_capacity: number;
  is_active: boolean;
  created_at: string;
  // Additional data
  current_trips_count?: number;
  total_bookings?: number;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AdminTrip {
  id: string;
  route_id: string;
  travel_date: string;
  departure_time: string;
  vessel_id: string;
  available_seats: number;
  is_active: boolean;
  created_at: string;
  // Joined data
  route_name?: string;
  from_island_name: string;
  to_island_name: string;
  vessel_name: string;
  vessel_capacity: number;
  bookings_count?: number;
  revenue?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface AdminIsland {
  id: string;
  name: string;
  zone: 'A' | 'B';
  is_active: boolean;
  created_at: string;
}

export interface AdminPayment {
  id: string;
  booking_id: string;
  payment_method: 'bank_transfer' | 'mvr_account' | 'agent_credit' | 'card' | 'cash';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  receipt_number?: string;
  transfer_slip_image?: string;
  transaction_date?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  booking_number?: string;
  user_name?: string;
}

export interface AdminCancellation {
  id: string;
  booking_id: string;
  cancellation_number: string;
  cancellation_reason: string;
  cancellation_fee: number;
  refund_amount: number;
  refund_bank_account_number?: string;
  refund_bank_account_name?: string;
  refund_bank_name?: string;
  refund_processing_date?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Joined data
  booking_number?: string;
  user_name?: string;
}

export interface AdminAlert {
  id: string;
  type: 'schedule' | 'payment' | 'system' | 'capacity' | 'vessel' | 'booking';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  user_id?: string;
  booking_id?: string;
  trip_id?: string;
  created_at: string;
  // Additional computed fields
  time_ago?: string;
  action_required?: boolean;
}

export interface AdminDashboardStats {
  overview: {
    total_bookings: number;
    daily_bookings: number;
    daily_revenue: number;
    weekly_revenue: number;
    monthly_revenue: number;
    active_trips: number;
    total_users: number;
    active_agents: number;
    active_vessels: number;
  };
  booking_stats: {
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
    check_in_rate: number;
  };
  payment_stats: {
    completed: number;
    pending: number;
    failed: number;
    total_pending_amount: number;
  };
  user_stats: {
    new_users_today: number;
    new_users_week: number;
    active_customers: number;
    active_agents: number;
  };
  vessel_stats: {
    active: number;
    maintenance: number;
    inactive: number;
    utilization_rate: number;
  };
  recent_activity: AdminAlert[];
}

export interface AdminActivityLog {
  id: string;
  user_id?: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  // Joined data
  user_name?: string;
  user_role?: string;
}

export interface AdminReport {
  id: string;
  report_type: 'bookings' | 'revenue' | 'passengers' | 'vessels' | 'agents';
  start_date: string;
  end_date: string;
  route_id?: string;
  status?: string;
  format: 'pdf' | 'excel' | 'csv';
  report_url: string;
  row_count: number;
  generated_by: string;
  generated_at: string;
  // Joined data
  generated_by_name?: string;
  route_name?: string;
}

// Filter and search interfaces
export interface AdminBookingFilters {
  status?: string[];
  date_from?: string;
  date_to?: string;
  route_id?: string;
  agent_id?: string;
  payment_status?: string[];
  search?: string;
}

export interface AdminUserFilters {
  role?: string[];
  status?: boolean;
  search?: string;
  created_from?: string;
  created_to?: string;
}

export interface AdminTripFilters {
  date_from?: string;
  date_to?: string;
  route_id?: string;
  vessel_id?: string;
  status?: string[];
  search?: string;
}

export interface AdminRouteFilters {
  status?: boolean;
  from_island_id?: string;
  to_island_id?: string;
  search?: string;
}

export interface AdminVesselFilters {
  status?: boolean;
  search?: string;
  created_from?: string;
  created_to?: string;
}

// Pagination interface
export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// API Response interfaces
export interface AdminApiResponse<T> {
  data: T;
  pagination?: AdminPagination;
  success: boolean;
  message?: string;
}

export interface AdminListResponse<T> extends AdminApiResponse<T[]> {
  pagination: AdminPagination;
}

// Legacy types for backward compatibility (deprecated)
export type User = AdminUser;
export type Booking = AdminBooking;
export type Route = AdminRoute;
export type Vessel = AdminVessel;
export type Trip = AdminTrip;
export type Alert = AdminAlert;
export type DashboardStats = AdminDashboardStats;