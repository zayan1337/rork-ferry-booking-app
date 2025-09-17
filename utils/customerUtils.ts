import type {
  SupabaseSeat,
  DateOption,
  CustomerBookingFormErrors,
} from '@/types/customer';
import type { Seat } from '@/types';
import { DATE_GENERATION } from '@/constants/customer';

/**
 * Transform Supabase seats data to match our app's Seat interface
 */
export const transformSeatsData = (seatsData: SupabaseSeat[]): Seat[] => {
  return seatsData.map(seat => ({
    id: seat.id,
    number: seat.seat_number,
    rowNumber: seat.row_number,
    isWindow: seat.is_window,
    isAisle: seat.is_aisle,
    isRowAisle: seat.is_row_aisle || false,
    isAvailable: Math.random() > 0.3, // Temporarily keeping random availability until we implement real availability
    isSelected: false,
  }));
};

/**
 * Generate date options for the next N days
 */
export const generateDateOptions = (
  daysAhead: number = DATE_GENERATION.DAYS_AHEAD
): DateOption[] => {
  const dates: DateOption[] = [];
  const today = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const isToday = i === 0;
    const isTomorrow = i === 1;

    dates.push({
      dateString: date.toISOString().split('T')[0],
      day: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
      year: date.getFullYear(),
      dayName: date.toLocaleString('default', { weekday: 'short' }),
      isToday,
      isTomorrow,
    });
  }

  return dates;
};

/**
 * Format date for display
 */
export const formatDisplayDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date for profile display
 */
export const formatProfileDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Get user initials for avatar
 */
export const getUserInitials = (fullName?: string): string => {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
};

/**
 * Create empty booking form errors object
 */
export const createEmptyFormErrors = (): CustomerBookingFormErrors => ({
  tripType: '',
  departureDate: '',
  returnDate: '',
  route: '',
  returnRoute: '',
  seats: '',
  passengers: '',
  paymentMethod: '',
  terms: '',
  trip: '',
  returnTrip: '',
  pricingNotice: '',
});

/**
 * Check if form field has error
 */
export const hasFieldError = (
  errors: CustomerBookingFormErrors,
  field: keyof CustomerBookingFormErrors
): boolean => {
  return errors[field] !== '';
};

/**
 * Clear specific form error
 */
export const clearFieldError = (
  errors: CustomerBookingFormErrors,
  field: keyof CustomerBookingFormErrors
): CustomerBookingFormErrors => {
  return {
    ...errors,
    [field]: '',
  };
};

/**
 * Get unique island names from routes
 */
export const getUniqueIslandNames = (
  routes: any[],
  type: 'from' | 'to' = 'from'
): string[] => {
  const islandKey = type === 'from' ? 'fromIsland' : 'toIsland';
  return [...new Set(routes.map(route => route[islandKey].name))];
};

/**
 * Filter routes by departure island
 */
export const filterRoutesByDepartureIsland = (
  routes: any[],
  departureIsland: string
): any[] => {
  return routes.filter(route => route.fromIsland.name === departureIsland);
};

/**
 * Format time string (12-hour AM/PM format)
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';

  // Handle both "HH:mm:ss" and "HH:mm" formats
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1] || '00';

  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes} ${period}`;
};

/**
 * Create route label for dropdown
 */
export const createRouteLabel = (route: any): string => {
  return `${route.fromIsland.name} → ${route.toIsland.name}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if all contact form fields are filled
 */
export const isContactFormValid = (
  name: string,
  email: string,
  message: string
): boolean => {
  return (
    name.trim() !== '' &&
    email.trim() !== '' &&
    message.trim() !== '' &&
    isValidEmail(email)
  );
};
