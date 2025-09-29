// Quick booking types
export interface QuickBookingState {
  selectedFromIsland: string;
  selectedToIsland: string;
  selectedDate: string;
  errorMessage: string;
}

// Date option for date picker
export interface DateOption {
  dateString: string;
  day: number;
  month: string;
  year: number;
  dayName: string;
  isToday: boolean;
  isTomorrow: boolean;
}

// Modal state types
export interface ModalStates {
  showFromModal: boolean;
  showToModal: boolean;
  showDateModal: boolean;
}

// Form validation errors
export interface CustomerBookingFormErrors {
  tripType: string;
  departureDate: string;
  returnDate: string;
  route: string;
  returnRoute: string;
  seats: string;
  passengers: string;
  paymentMethod: string;
  terms: string;
  trip: string;
  returnTrip: string;
  pricingNotice: string;
}

// Supabase seat data type
export interface SupabaseSeat {
  id: string;
  vessel_id: string;
  seat_number: string;
  row_number: number;
  is_window: boolean;
  is_aisle: boolean;
  is_row_aisle?: boolean;
  created_at: string;
}

// Booking step validation
export interface StepValidation {
  step: number;
  isValid: boolean;
  errors: CustomerBookingFormErrors;
}

// Profile settings
export interface ProfileSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// Support FAQ
export interface CustomerFAQ {
  question: string;
  answer: string;
}

// Contact form state
export interface ContactFormState {
  contactName: string;
  contactEmail: string;
  contactMessage: string;
  isSubmitting: boolean;
}

// Vessel tracking types
export interface VesselTrackingInfo {
  id: string;
  name: string;
  registration_number: string;
  vessel_type: string;
  status: 'active' | 'maintenance' | 'inactive';
  captain_name?: string;
  seating_capacity: number;
  is_active: boolean;
}
