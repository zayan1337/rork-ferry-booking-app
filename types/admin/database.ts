// Database View Types for Admin Dashboard

// admin_dashboard_stats materialized view
export interface AdminDashboardStats {
  today_bookings: number;
  today_confirmed: number;
  today_revenue: number;
  bookings_30d: number;
  active_users_30d: number;
  revenue_30d: number;
  total_bookings: number;
  total_users: number;
  total_revenue: number;
  pending_payment_count: number;
  confirmed_count: number;
  cancelled_count: number;
  reserved_count: number;
  checked_in_count: number;
  completed_count: number;
  calculated_at: string;
}

// admin_operations_overview view
export interface AdminOperationsOverview {
  active_routes: number;
  total_routes: number;
  active_vessels: number;
  total_vessels: number;
  today_trips: number;
  departed_trips_today: number;
  today_total_capacity: number;
  today_passengers: number;
  avg_occupancy_7d: number;
}

// admin_user_analytics view
export interface AdminUserAnalytics {
  role: 'admin' | 'agent' | 'customer' | 'captain';
  total_count: number;
  active_count: number;
  new_users_30d: number;
  new_users_7d: number;
  avg_bookings_per_user: number;
  avg_spent_per_user: number;
  recently_active: number;
  avg_agent_credit_balance?: number;
  avg_agent_revenue?: number;
}

// admin_bookings_view
export interface AdminBookingView {
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
  user_name: string;
  user_email: string;
  user_mobile: string;
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
  payment_status: string;
  payment_amount: number;
  payment_method?: string;
}

// activity_logs_with_users view
export interface ActivityLogWithUser {
  id: string;
  user_id?: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  session_id?: string;
  user_agent?: string;
  user_name: string;
  user_email?: string;
  user_role?: string;
}

// admin_notifications table
export interface AdminNotification {
  id: string;
  recipient_id?: string;
  recipient_role?: string;
  title: string;
  message: string;
  notification_type: string;
  priority: number;
  is_read: boolean;
  is_system: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  expires_at?: string;
  read_at?: string;
  created_at: string;
}

// operations_trips_view
export interface OperationsTripView {
  id: string;
  route_id: string;
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  arrival_time?: string;
  available_seats: number;
  is_active: boolean;
  status?: string;
  fare_multiplier?: number;
  created_at: string;
  updated_at?: string;
  route_name: string;
  base_fare: number;
  distance?: string;
  duration?: string;
  route_is_active: boolean;
  from_island_name: string;
  to_island_name: string;
  vessel_name: string;
  capacity: number;
  vessel_type?: string;
  vessel_is_active: boolean;
  bookings: number;
  booked_seats: number;
  confirmed_bookings: number;
  trip_revenue: number;
  computed_status: string;
  occupancy_rate: number;
}

// Enhanced dashboard stats combining multiple views
export interface EnhancedDashboardStats {
  dashboard: AdminDashboardStats;
  operations: AdminOperationsOverview;
  userAnalytics: AdminUserAnalytics[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    last_backup: string;
    database_size: string;
    active_sessions: number;
  };
}
