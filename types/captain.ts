// Captain-specific types for ferry booking system

export interface CaptainTrip {
  id: string;
  route_id: string;
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  arrival_time?: string;
  status:
    | 'scheduled'
    | 'boarding'
    | 'departed'
    | 'arrived'
    | 'cancelled'
    | 'delayed'
    | 'completed';
  available_seats: number;
  booked_seats: number;
  checked_in_passengers: number;
  captain_id?: string;
  is_checkin_closed: boolean;
  checkin_closed_at?: string;
  checkin_closed_by?: string;
  manifest_generated_at?: string;
  manifest_sent_at?: string;

  // Related data
  route_name?: string;
  vessel_name?: string;
  from_island_name?: string;
  to_island_name?: string;
  capacity?: number;
  base_fare?: number;
  captain_name?: string;

  // Computed fields
  occupancy_rate?: number;
  revenue?: number;
  can_close_checkin?: boolean;
}

export interface CaptainPassenger {
  id: string;
  booking_id: string;
  booking_number: string;
  passenger_name: string;
  passenger_contact_number: string;
  seat_number: string;
  seat_id: string;
  check_in_status: boolean;
  checked_in_at?: string;
  special_assistance_request?: string;
  trip_id: string;
  trip_date: string;

  // Booking details
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  booking_status: 'confirmed' | 'checked_in' | 'cancelled' | 'pending';
}

export interface CaptainDashboardStats {
  todayTrips: number;
  totalPassengers: number;
  checkedInPassengers: number;
  completedTrips: number;
  onTimePercentage: number;
  totalRevenue: number;
  averageOccupancy: number;
}

export interface PassengerManifest {
  trip_id: string;
  trip_date: string;
  route_name: string;
  vessel_name: string;
  departure_time: string;
  captain_name: string;
  total_passengers: number;
  checked_in_passengers: number;
  passengers: CaptainPassenger[];
  generated_at: string;
  closed_by: string;
}

export interface CaptainProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  mobile_number?: string;
  license_number?: string;
  license_expiry?: string;
  years_experience?: number;
  current_vessel_id?: string;
  current_vessel_name?: string;
  status: 'active' | 'inactive' | 'on_leave';
  role?: string;
  created_at: string;
  total_trips?: number;
  completed_trips?: number;
  total_passengers?: number;
  total_revenue?: number;
  avg_occupancy_rate?: number;
  safety_rating?: number;
}

// Form data types
export interface CloseCheckinData {
  trip_id: string;
  captain_notes?: string;
  weather_conditions?: string;
  delay_reason?: string;
  actual_departure_time?: string;
}

// Store state types
export interface CaptainStoreState {
  // Data
  trips: CaptainTrip[];
  passengers: CaptainPassenger[];
  dashboardStats: CaptainDashboardStats | null;
  profile: CaptainProfile | null;

  // UI State
  loading: {
    trips: boolean;
    passengers: boolean;
    stats: boolean;
    profile: boolean;
    closeCheckin: boolean;
  };

  // Filters and search
  searchQuery: string;
  dateFilter: string;
  statusFilter: string;

  error: string | null;
}

export interface CaptainStoreActions {
  // Trip management
  fetchTodayTrips: () => Promise<void>;
  fetchTripsByDate: (date: string) => Promise<void>;
  fetchTripPassengers: (tripId: string) => Promise<CaptainPassenger[]>;
  closeCheckin: (data: CloseCheckinData) => Promise<boolean>;
  updateTripStatus: (
    tripId: string,
    status: CaptainTrip['status']
  ) => Promise<boolean>;

  // Dashboard
  fetchDashboardStats: () => Promise<void>;
  refreshDashboard: () => Promise<void>;

  // Profile
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<CaptainProfile>) => Promise<boolean>;

  // Utility
  setSearchQuery: (query: string) => void;
  setDateFilter: (date: string) => void;
  setStatusFilter: (status: string) => void;
  clearError: () => void;
  reset: () => void;
}

export type CaptainStore = CaptainStoreState & CaptainStoreActions;

// API response types
export interface CaptainTripsResponse {
  trips: CaptainTrip[];
  total: number;
  stats: {
    scheduled: number;
    boarding: number;
    departed: number;
    completed: number;
  };
}

export interface CaptainPassengersResponse {
  passengers: CaptainPassenger[];
  summary: {
    total: number;
    checked_in: number;
    pending: number;
  };
}
