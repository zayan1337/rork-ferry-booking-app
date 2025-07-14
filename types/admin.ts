// Permission System Types
export type AdminPermission = {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
};

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  is_active: boolean;
  created_at: string;
};

// Enhanced User Types
export type User = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "agent" | "admin" | "captain";
  status: "active" | "inactive" | "suspended";
  mobile_number?: string;
  date_of_birth?: string;
  credit_balance?: number;
  credit_ceiling?: number;
  agent_discount?: number;
  free_tickets_remaining?: number;
  is_recently_active?: boolean;
  total_bookings?: number;
  total_spent?: number;
  last_booking_date?: string;
  permissions?: AdminPermission[];
  created_at: string;
};

// Enhanced Booking Types
export type Booking = {
  id: string;
  booking_number: string;
  routeId: string;
  routeName: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerMobile?: string;
  date: string;
  departureTime: string;
  status: "reserved" | "pending_payment" | "confirmed" | "checked_in" | "completed" | "cancelled";
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  passengers: number;
  totalAmount: number;
  agentId?: string;
  agentName?: string;
  vesselName?: string;
  paymentMethod?: string;
  qrCodeUrl?: string;
  checkInStatus?: boolean;
  created_at: string;
};

// Enhanced Route Types
export type Route = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  from_island_id: string;
  to_island_id: string;
  distance: string;
  duration: string;
  base_fare: number;
  status: "active" | "inactive";
  total_trips_30d?: number;
  total_bookings_30d?: number;
  total_revenue_30d?: number;
  average_occupancy_30d?: number;
  cancellation_rate_30d?: number;
};

// Enhanced Vessel Types
export type Vessel = {
  id: string;
  name: string;
  capacity: number;
  seating_capacity: number;
  status: "active" | "maintenance" | "inactive";
  total_trips_30d?: number;
  capacity_utilization_30d?: number;
  total_revenue_30d?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
};

// Enhanced Trip Types
export type Trip = {
  id: string;
  routeId: string;
  routeName: string;
  vesselId: string;
  vesselName: string;
  date: string;
  travel_date: string;
  departureTime: string;
  departure_time: string;
  arrivalTime?: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  bookings: number;
  capacity: number;
  available_seats: number;
  is_active: boolean;
  created_at: string;
};

// Financial Types
export type WalletTransaction = {
  id: string;
  wallet_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  transaction_type: "credit" | "debit" | "refund" | "payment";
  reference_id?: string;
  description?: string;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  balance: number;
  currency: string;
  is_active: boolean;
  transactions: WalletTransaction[];
  total_credits: number;
  total_debits: number;
  created_at: string;
  updated_at: string;
};

export type PaymentReport = {
  id: string;
  booking_id: string;
  booking_number: string;
  user_name: string;
  amount: number;
  payment_method: "gateway" | "wallet" | "bank_transfer" | "cash";
  status: "pending" | "completed" | "failed" | "refunded";
  receipt_number?: string;
  transaction_date: string;
  created_at: string;
};

// Communication Types
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: "system" | "booking" | "payment" | "maintenance" | "emergency";
  priority: "low" | "medium" | "high" | "critical";
  target_users: "all" | "customers" | "agents" | "admins";
  is_read: boolean;
  sent_by: string;
  sent_by_name: string;
  sent_count?: number;
  failed_count?: number;
  created_at: string;
  expires_at?: string;
};

export type BulkMessage = {
  id: string;
  title: string;
  message_content: string;
  trip_id?: string;
  travel_date?: string;
  from_island?: string;
  to_island?: string;
  target_criteria: {
    user_roles?: string[];
    route_ids?: string[];
    travel_dates?: string[];
    booking_statuses?: string[];
  };
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: "draft" | "sending" | "sent" | "failed";
  sent_by: string;
  sent_by_name: string;
  scheduled_at?: string;
  created_at: string;
};

// Passenger Management Types
export type Passenger = {
  id: string;
  booking_id: string;
  booking_number: string;
  seat_id: string;
  seat_number: string;
  passenger_name: string;
  passenger_contact_number: string;
  special_assistance_request?: string;
  check_in_status: boolean;
  trip_date: string;
  route_name: string;
  vessel_name: string;
  created_at: string;
};

export type PassengerManifest = {
  id: string;
  trip_id: string;
  route_name: string;
  vessel_name: string;
  travel_date: string;
  departure_time: string;
  actual_departure_time?: string;
  status: "in_progress" | "departed" | "completed";
  passenger_count: number;
  captain_confirmed: boolean;
  passengers: Passenger[];
  created_at: string;
  updated_at: string;
};

// Reports Types
export type Report = {
  id: string;
  report_type: "booking" | "financial" | "passenger" | "route_performance" | "vessel_utilization";
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  route_id?: string;
  vessel_id?: string;
  status: "generating" | "completed" | "failed";
  format: "pdf" | "excel" | "csv";
  report_url?: string;
  row_count: number;
  generated_by: string;
  generated_by_name: string;
  generated_at: string;
};

// Activity Tracking
export type ActivityLog = {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  ip_address?: string;
  created_at: string;
};

// Enhanced Dashboard Stats
export type DashboardStats = {
  dailyBookings: {
    count: number;
    revenue: number;
    change_percentage: number;
  };
  activeTrips: {
    count: number;
    in_progress: number;
    completed_today: number;
  };
  activeUsers: {
    total: number;
    customers: number;
    agents: number;
    online_now: number;
  };
  paymentStatus: {
    completed: number;
    pending: number;
    failed: number;
    total_value: number;
  };
  walletStats: {
    total_balance: number;
    active_wallets: number;
    total_transactions_today: number;
  };
  systemHealth: {
    status: "healthy" | "warning" | "critical";
    last_backup: string;
    database_size: string;
    active_sessions: number;
  };
};

// Enhanced Alert Types
export type Alert = {
  id: string;
  type: "schedule" | "payment" | "system" | "capacity" | "maintenance" | "security";
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "acknowledged" | "resolved";
  affected_systems?: string[];
  action_required?: string;
  assigned_to?: string;
  timestamp: string;
  resolved_at?: string;
  read: boolean;
};

// Tab Configuration with Permissions
export type AdminTab = {
  id: string;
  name: string;
  icon: string;
  route: string;
  permissions: string[];
  description: string;
  subTabs?: AdminSubTab[];
};

export type AdminSubTab = {
  id: string;
  name: string;
  route: string;
  permissions: string[];
  description: string;
};

// Permission Resources and Actions
export const PERMISSION_RESOURCES = {
  DASHBOARD: 'dashboard',
  BOOKINGS: 'bookings',
  ROUTES: 'routes',
  TRIPS: 'trips',
  VESSELS: 'vessels',
  USERS: 'users',
  AGENTS: 'agents',
  PASSENGERS: 'passengers',
  WALLETS: 'wallets',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  BULK_MESSAGES: 'bulk_messages',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  PERMISSIONS: 'permissions',
  ACTIVITY_LOGS: 'activity_logs'
} as const;

export const PERMISSION_ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  EXPORT: 'export',
  SEND: 'send',
  APPROVE: 'approve',
  CANCEL: 'cancel'
} as const;