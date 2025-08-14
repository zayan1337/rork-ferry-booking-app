// Re-export Route and Trip from operations for compatibility
export { Route, Trip } from './operations';

export interface Agent {
  id: string;
  name: string;
  email: string;
  agentId: string;
  creditCeiling: number;
  creditBalance: number;
  discountRate: number;
  freeTicketsAllocation: number;
  freeTicketsRemaining: number;
}

export interface AgentStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalCommission: number;
  uniqueClients: number;
}

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  agentId: string;
  creditCeiling: number;
  creditBalance: number;
  discountRate: number;
  freeTicketsAllocation: number;
  freeTicketsRemaining: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalCommission: number;
  uniqueClients: number;
}

export interface AgentClient {
  id?: string; // Optional for new clients
  name: string;
  email: string;
  phone: string;
  idNumber?: string;
  hasAccount: boolean;
  userProfileId?: string; // If client has an account
  agentClientId?: string; // The agent_clients record ID
  bookingsCount?: number;
}

export interface AgentCurrentBooking {
  // Trip details
  tripType: 'one_way' | 'round_trip';
  route: any | null;
  returnRoute: any | null;
  trip: any | null;
  returnTrip: any | null;
  departureDate: string | null;
  returnDate: string | null;

  // Client details
  client: AgentClient | null;

  // Passengers and seats
  passengers: any[];
  selectedSeats: any[];
  returnSelectedSeats: any[];

  // Pricing
  totalFare: number;
  discountedFare: number;
  discountRate: number;

  // Payment
  paymentMethod: 'credit' | 'gateway' | 'free';
}

export interface AgentBookingState {
  // Current booking data
  currentBooking: AgentCurrentBooking;
  currentStep: number;

  // Available data
  availableSeats: any[];
  availableReturnSeats: any[];

  // Client search functionality
  clientSearchResults: AgentClient[];
  isSearchingClients: boolean;
  clientSearchQuery: string;

  // State flags
  isLoading: boolean;
  error: string | null;

  // Agent info
  agent: Agent | null;

  // Callback for when booking is created
  onBookingCreated?: (
    bookingId: string,
    returnBookingId?: string | null
  ) => Promise<void>;
}

export interface AgentState {
  agent: Agent | null;
  stats: AgentStats;
  bookings: Booking[];
  clients: Client[];
  creditTransactions: CreditTransaction[];
  translations: Record<string, string>;
  currentLanguage: string;
  textDirection: 'ltr' | 'rtl';
  isLoading: boolean;
  error: string | null;
}

export interface Booking {
  id: string;
  bookingNumber?: string;
  clientId: string; // This can be user_profiles.id OR agent_clients.id
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime?: string;
  returnDate?: string;
  passengerCount: number;
  passengers?: {
    id: string;
    fullName: string;
    contactNumber: string;
    specialAssistance?: string;
    seat?: {
      id: string;
      number: string;
      rowNumber: number;
      isWindow: boolean;
      isAisle: boolean;
    } | null;
  }[];
  vessel?: {
    id: string;
    name: string;
  } | null;
  route?: {
    id: string;
    fromIsland: {
      id: string;
      name: string;
      zone: string;
    };
    toIsland: {
      id: string;
      name: string;
      zone: string;
    };
    baseFare: number;
  } | null;
  seats?: {
    id: string;
    number: string;
    rowNumber: number;
    isWindow: boolean;
    isAisle: boolean;
  }[];
  totalAmount: number;
  discountedAmount: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending' | 'modified';
  bookingDate: string;
  updatedAt?: string;
  paymentMethod: 'credit' | 'gateway' | 'free';
  payment?: {
    method: string;
    status: string;
  } | null;
  commission: number;
  userId?: string; // user_profiles.id for clients with accounts
  agentClientId?: string; // agent_clients.id for clients without accounts
  clientHasAccount?: boolean; // Whether this booking is for a client with account
  isRoundTrip?: boolean;
  returnBookingId?: string | null;
  qrCodeUrl?: string | null;
  checkInStatus?: string | null;
  tripType?: 'one_way' | 'round_trip';
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  bookingsCount: number;
  hasAccount?: boolean; // Whether the client has a user account
  agentClientId?: string; // The agent_clients record ID
}

export interface CreditTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'refill' | 'deduction';
  bookingId?: string;
  bookingNumber?: string;
  description?: string;
  balance: number;
}

// Dashboard related types
export interface AgentDashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalCommission: number;
  uniqueClients: number;
}

export interface AgentDashboardData {
  agent: Agent | null;
  stats: AgentDashboardStats | null;
  bookings: Booking[];
  localStats: AgentDashboardStats | null;
}

// Credit related types
export interface CreditTransaction {
  id: string;
  type: 'refill' | 'deduction';
  amount: number;
  description?: string;
  createdAt: string;
  bookingId?: string;
}

export interface CreditSummary {
  creditBalance: number;
  creditCeiling: number;
  creditUtilization: number;
  isLowCredit: boolean;
  totalCreditAdded: number;
  totalCreditUsed: number;
}

// Client related types
export interface ClientSearchStats {
  totalClients: number;
  filteredClients: number;
  averageBookings: number;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
}

// Profile related types
export interface AgentProfileData {
  agent: Agent | null;
  isLoading: boolean;
  error: string | null;
}

// Loading states
export interface AgentLoadingStates {
  isInitializing: boolean;
  isLoadingStats: boolean;
  isLoadingBookings: boolean;
  isLoadingClients: boolean;
  isLoadingCredit: boolean;
  isLoadingProfile: boolean;
}

// Error states
export interface AgentErrorStates {
  statsError: string | null;
  bookingsError: string | null;
  clientsError: string | null;
  creditError: string | null;
  profileError: string | null;
}

// Refresh control
export interface RefreshControlState {
  isRefreshing: boolean;
  lastRefresh: Date | null;
}

// Tab navigation types
export type AgentTabParamList = {
  index: undefined;
  bookings: undefined;
  clients: undefined;
  credit: undefined;
  profile: undefined;
};

// Agent action types
export type AgentActionType =
  | 'view_booking'
  | 'modify_booking'
  | 'cancel_booking'
  | 'create_booking'
  | 'view_client'
  | 'add_client'
  | 'request_credit';

// Form validation
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Agent display options
export interface AgentDisplayOptions {
  showCommission: boolean;
  showDiscount: boolean;
  showCreditBalance: boolean;
  compactView: boolean;
}
