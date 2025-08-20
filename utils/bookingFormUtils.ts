import type { Route, Trip, AgentClient } from '@/types/agent';

/**
 * Booking form step configuration
 */
export const BOOKING_STEPS = [
  { id: 1, label: 'Route', description: 'Select route and dates' },
  { id: 2, label: 'Trip', description: 'Choose departure and return trips' },
  { id: 3, label: 'Client', description: 'Select or add client' },
  { id: 4, label: 'Seats', description: 'Select seats' },
  { id: 5, label: 'Details', description: 'Passenger information' },
  { id: 6, label: 'Payment', description: 'Payment and confirmation' },
] as const;

/**
 * Trip type options for booking
 */
export const TRIP_TYPE_OPTIONS = [
  { value: 'one_way', label: 'One Way' },
  { value: 'round_trip', label: 'Round Trip' },
] as const;

/**
 * Payment method options for agent bookings
 */
export const AGENT_PAYMENT_OPTIONS = [
  { label: '💳 Agent Credit', value: 'credit' },
  { label: '🌐 Payment Gateway', value: 'gateway' },
  { label: '🎫 Free Ticket', value: 'free' },
] as const;

/**
 * Format route options for dropdown
 */
export const formatRouteOptions = (routes: Route[] = []) => {
  return routes.map(route => ({
    label: `${route.from_island?.name || 'Unknown'} → ${route.to_island?.name || 'Unknown'}`,
    value: route.id,
  }));
};

/**
 * Format trip options for dropdown
 */
export const formatTripOptions = (trips: Trip[] = []) => {
  return trips.map(trip => {
    // Handle both nested vessel object and flat vessel_name string
    const vesselName =
      trip.vessel?.name ||
      (trip as any).vessel_name ||
      trip.vesselName ||
      'Unknown';
    return {
      label: `${String(trip.departure_time || '').slice(0, 5)} - ${vesselName} (${String(trip.available_seats || 0)} seats)`,
      value: trip.id,
    };
  });
};

/**
 * Validate booking step data
 */
export const validateBookingStep = (
  step: number,
  data: any
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 1: // Route & Date
      if (!data.tripType) {
        errors.tripType = 'Please select a trip type';
      }
      if (!data.departureDate) {
        errors.departureDate = 'Please select a departure date';
      }
      if (data.tripType === 'round_trip' && !data.returnDate) {
        errors.returnDate = 'Please select a return date';
      }
      if (!data.route) {
        errors.route = 'Please select a departure route';
      }
      if (data.tripType === 'round_trip' && !data.returnRoute) {
        errors.returnRoute = 'Please select a return route';
      }
      break;

    case 2: // Trip Selection
      if (!data.trip) {
        errors.trip = 'Please select a departure trip';
      }
      if (data.tripType === 'round_trip' && !data.returnTrip) {
        errors.returnTrip = 'Please select a return trip';
      }
      break;

    case 3: // Client Info
      if (!data.client) {
        if (data.showAddNewClientForm) {
          if (!data.clientForm?.name?.trim()) {
            errors.client = 'Please enter client name';
          } else if (!data.clientForm?.email?.trim()) {
            errors.client = 'Please enter client email';
          } else if (!data.clientForm?.phone?.trim()) {
            errors.client = 'Please enter client phone';
          }
        } else {
          errors.client = 'Please select an existing client or add a new one';
        }
      }
      break;

    case 4: // Seat Selection
      if (!data.selectedSeats || data.selectedSeats.length === 0) {
        errors.seats = 'Please select at least one seat';
      }
      if (
        data.tripType === 'round_trip' &&
        (!data.returnSelectedSeats || data.returnSelectedSeats.length === 0)
      ) {
        errors.seats = 'Please select at least one return seat';
      }
      if (
        data.tripType === 'round_trip' &&
        data.selectedSeats?.length !== data.returnSelectedSeats?.length
      ) {
        errors.seats = 'Number of departure and return seats must match';
      }
      break;

    case 5: // Passenger Details
      const incompletePassenger = data.passengers?.find(
        (p: any) => !p.fullName?.trim()
      );
      if (incompletePassenger) {
        errors.passengers = 'Please enter details for all passengers';
      }
      break;

    case 6: // Payment
      if (!data.paymentMethod) {
        errors.paymentMethod = 'Please select a payment method';
      }
      if (!data.termsAccepted) {
        errors.terms = 'You must accept the terms and conditions';
      }
      break;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Check if client search query is valid email format
 */
export const isValidEmailFormat = (query: string): boolean => {
  return query.includes('@') && query.includes('.');
};

/**
 * Check if client search query is valid phone format
 */
export const isValidPhoneFormat = (query: string): boolean => {
  return /^\d+$/.test(query) && query.length >= 7;
};

/**
 * Pre-fill client form from search query
 */
export const prefillClientFormFromQuery = (query: string) => {
  const form = {
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  };

  if (isValidEmailFormat(query)) {
    form.email = query;
  } else if (isValidPhoneFormat(query)) {
    form.phone = query;
  }

  return form;
};

/**
 * Create agent client object from form data
 */
export const createAgentClientFromForm = (
  formData: any
): Omit<AgentClient, 'id'> => {
  return {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    hasAccount: false,
    userProfileId: undefined,
  };
};

/**
 * Format booking summary for display
 */
export const formatBookingSummary = (booking: any) => {
  return {
    client: booking.client?.name || 'N/A',
    tripType: booking.tripType === 'one_way' ? 'One Way' : 'Round Trip',
    route: `${booking.route?.fromIsland?.name || 'N/A'} → ${booking.route?.toIsland?.name || 'N/A'}`,
    returnRoute: booking.returnRoute
      ? `${booking.returnRoute.fromIsland?.name || 'N/A'} → ${booking.returnRoute.toIsland?.name || 'N/A'}`
      : null,
    departureDate: booking.departureDate
      ? new Date(booking.departureDate).toLocaleDateString()
      : 'N/A',
    returnDate: booking.returnDate
      ? new Date(booking.returnDate).toLocaleDateString()
      : null,
    passengers: booking.passengers?.length || 0,
    seats:
      booking.selectedSeats
        ?.map((seat: any) => String(seat.number || ''))
        .join(', ') || 'None',
    returnSeats:
      booking.returnSelectedSeats
        ?.map((seat: any) => String(seat.number || ''))
        .join(', ') || 'None',
    totalAmount: booking.discountedFare || booking.totalFare || 0,
  };
};

/**
 * Generate success message for booking creation
 */
export const generateBookingSuccessMessage = (
  result: any,
  tripType: string
) => {
  let message = `Your ${tripType === 'round_trip' ? 'round trip' : 'one way'} booking has been confirmed with QR codes generated.`;

  if (typeof result === 'string') {
    // Legacy single booking ID
    message += `\n\nBooking ID: ${result}`;
  } else if (result && typeof result === 'object') {
    // New format with departure and return booking IDs
    const bookingResult = result as {
      bookingId: string;
      returnBookingId?: string;
    };
    message += `\n\nDeparture Booking ID: ${bookingResult.bookingId}`;
    if (bookingResult.returnBookingId) {
      message += `\nReturn Booking ID: ${bookingResult.returnBookingId}`;
    }
  }

  return message;
};
