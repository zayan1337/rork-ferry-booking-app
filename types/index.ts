// ============================================================================
// MANAGEMENT TYPES - Consistent types for admin management
// ============================================================================
// Import admin management types to avoid conflicts with legacy types
import * as AdminManagement from './admin/management';
export { AdminManagement };

// ============================================================================
// LEGACY USER TYPES
// ============================================================================
export type User = {
  id: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  username: string;
};

export interface Island {
  id: string;
  name: string;
  zone: 'A' | 'B'; // Legacy field - will be removed after migration
  zone_id?: string; // New field - references zones table
}

export interface Route {
  id: string;
  fromIsland: Island;
  toIsland: Island;
  baseFare: number;
  duration?: string; // Optional since it's not in DB
  routeStops?: {
    id: string;
    stopSequence: number;
    island: Island;
  }[];
}

export interface Seat {
  id: string;
  number: string;
  rowNumber: number;
  isWindow: boolean;
  isAisle: boolean;
  isRowAisle?: boolean;
  isAvailable: boolean;
  isSelected?: boolean;
  // Enhanced seat properties
  seatType?: 'standard' | 'premium' | 'crew' | 'disabled';
  seatClass?: 'economy' | 'business' | 'first';
  isDisabled?: boolean;
  isPremium?: boolean;
  priceMultiplier?: number;
  positionX?: number;
  positionY?: number;
  // Real-time reservation properties
  isConfirmed?: boolean;
  isTempReserved?: boolean;
  tempReservedBy?: string;
  tempExpiry?: string;
  isCurrentUserReservation?: boolean;
}

export interface Passenger {
  id?: string;
  fullName: string;
  idNumber?: string;
  phoneNumber?: string;
  specialAssistance?: string;
}

export type BookingStatus =
  | 'reserved'
  | 'pending_payment'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'modified'
  | 'cancelled';

export type PaymentMethod =
  | 'bank_transfer'
  | 'bml'
  | 'mib'
  | 'ooredoo_m_faisa'
  | 'fahipay'
  | 'wallet';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type Booking = {
  id: string;
  bookingNumber: string;
  tripType: 'one_way' | 'round_trip';
  departureDate: string;
  departureTime: string;
  returnDate?: string;
  returnTime?: string;
  route: Route;
  returnRoute?: Route;
  seats: Seat[];
  returnSeats?: Seat[];
  passengers: Passenger[];
  totalFare: number;
  status: BookingStatus;
  qrCodeUrl?: string;
  checkInStatus: boolean;
  createdAt: string;
  updatedAt: string;
  vessel: {
    id: string;
    name: string;
    model?: string;
    registrationNumber?: string;
  };
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
  };
  bookingType?: 'customer' | 'agent';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  agentId?: string | null;
  isAgentBooking?: boolean;
  tripId?: string | null;
  isModification?: boolean;
  originalBookingId?: string | null;
  returnBookingId?: string | null;
  roundTripGroupId?: string | null;
  displayFare?: number;
};

// Base exports without conflicts
export * from './store';
export * from './customer';
export * from './components';

// Admin types with explicit re-exports to avoid conflicts
export type {
  Trip as AdminTrip,
  Vessel as AdminVessel,
  Route as AdminRoute,
  User as AdminUser,
  Booking as AdminBooking,
  DashboardStats,
  ActivityLog,
  WalletTransaction,
} from './admin';

// Auth types with explicit re-exports to avoid conflicts
export type {
  UserProfile as AuthUserProfile,
  UserRole as AuthUserRole,
} from './auth';

// Agent types
export * from './agent';

// Booking types with explicit re-exports to avoid conflicts
export type { Trip as BookingTrip, Vessel as BookingVessel } from './booking';

// Settings types with explicit re-exports to avoid conflicts - only export what exists
export type {
  Permission as SettingsPermission,
  SystemSettings as SettingsSystemSettings,
  SettingsStats,
  SettingsActions,
} from './settings';

// Operations types with aliases for conflicting names - only export what exists
export type {
  Trip as OperationsTrip,
  Vessel as OperationsVessel,
  Route as OperationsRoute,
  RouteFormData,
  VesselFormData,
  TripFormData,
  RouteValidationErrors,
  VesselValidationErrors,
  TripValidationErrors,
  RouteStats,
  VesselStats,
  TripStats,
} from './operations';

// Export the Route status type as RouteStatus
export type RouteStatus = 'active' | 'inactive' | 'maintenance';

// User management types with aliases for conflicting names - only export what exists
export type {
  UserProfile as UserManagementProfile,
  UserRole as UserManagementRole,
  Permission as UserManagementPermission,
  UserFormData,
  UserValidationErrors,
  UserStats,
  UserActivity as UserManagementActivity,
  UserSession,
} from './userManagement';

// New dashboard, bookings, and operations types
export * from './admin/dashboard';

// Content management types
export * from './content';

// Terms and Conditions types - explicit re-export to avoid conflicts
export type { TermsAndConditions as Terms, TermsStore } from './terms';

// Multi-Stop Trip types - explicit exports to avoid conflicts
export type {
  MultiStopTrip,
  TripStop,
  TripStopFormData,
  MultiStopTripFormData,
  StopType,
  StopStatus,
  StopOption,
  MultiStopBooking,
  BookingStops,
  StopFare,
  AvailableSegment,
  SegmentSelection,
  StopValidationResult,
  SegmentValidationResult,
  StopPassengerInfo,
  CaptainTripProgress,
  StopStatistics,
  MultiStopTripStatistics,
} from './multiStopTrip';

export type {
  MultiStopRoute,
  RouteStop,
  RouteStopFormData,
  MultiStopRouteFormData,
  RouteSegmentFare,
  TripFareOverride,
  RouteSegmentFareFormData,
  TripFareOverrideFormData,
  RouteSegment,
  AvailableRouteSegment,
  RouteWithStopsResponse,
  RouteSegmentFaresResponse,
  FareMatrix,
  RouteStopValidation,
  FareCalculationOptions,
  CalculatedSegmentFare,
  TripWithRouteStops,
  BookingSegmentInfo,
} from './multiStopRoute';
