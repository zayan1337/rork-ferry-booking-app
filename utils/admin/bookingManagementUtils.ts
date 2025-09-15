import { AdminBooking, BookingStatus } from '@/types/admin/management';

/**
 * Formats booking status for display
 */
export const formatBookingStatus = (status: BookingStatus): string => {
  switch (status) {
    case 'reserved':
      return 'Reserved';
    case 'pending_payment':
      return 'Pending Payment';
    case 'confirmed':
      return 'Confirmed';
    case 'checked_in':
      return 'Checked In';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return (
        (status as string).charAt(0).toUpperCase() + (status as string).slice(1)
      );
  }
};

/**
 * Gets booking status color
 */
export const getBookingStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return '#10B981'; // green
    case 'reserved':
      return '#F59E0B'; // yellow
    case 'pending_payment':
      return '#3B82F6'; // blue
    case 'checked_in':
      return '#8B5CF6'; // purple
    case 'cancelled':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

/**
 * Gets booking status icon
 */
export const getBookingStatusIcon = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed':
      return '✅';
    case 'completed':
      return '🎉';
    case 'reserved':
      return '⏳';
    case 'pending_payment':
      return '💳';
    case 'checked_in':
      return '📋';
    case 'cancelled':
      return '❌';
    default:
      return '📋';
  }
};

/**
 * Formats payment status for display
 */
export const formatPaymentStatus = (status?: string): string => {
  switch (status) {
    case 'completed':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : 'Unknown';
  }
};

/**
 * Gets payment status color
 */
export const getPaymentStatusColor = (status?: string): string => {
  switch (status) {
    case 'completed':
      return '#10B981'; // green
    case 'pending':
      return '#F59E0B'; // yellow
    case 'failed':
      return '#EF4444'; // red
    case 'refunded':
      return '#3B82F6'; // blue
    default:
      return '#6B7280'; // gray
  }
};

/**
 * Formats currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MVR',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats date for display
 */
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formats date and time for display
 */
export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats time for display
 */
export const formatTime = (time: string): string => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Calculates booking duration in days
 */
export const calculateBookingDuration = (
  startDate: string,
  endDate?: string
): number => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Checks if booking is expired
 */
export const isBookingExpired = (booking: AdminBooking): boolean => {
  if (!booking.trip_travel_date) return false;
  const travelDate = new Date(booking.trip_travel_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return travelDate < today;
};

/**
 * Checks if booking is active
 */
export const isBookingActive = (booking: AdminBooking): boolean => {
  const activeStatuses: BookingStatus[] = [
    'reserved',
    'pending_payment',
    'confirmed',
    'checked_in',
  ];
  return activeStatuses.includes(booking.status) && !isBookingExpired(booking);
};

/**
 * Gets booking priority for sorting
 */
export const getBookingPriority = (booking: AdminBooking): number => {
  const priorityMap: Record<BookingStatus, number> = {
    pending_payment: 1,
    reserved: 2,
    confirmed: 3,
    checked_in: 4,
    completed: 5,
    cancelled: 6,
  };
  return priorityMap[booking.status] || 7;
};

/**
 * Formats route name for display
 */
export const formatRouteName = (
  fromIsland?: string,
  toIsland?: string
): string => {
  if (!fromIsland && !toIsland) return 'Unknown Route';
  if (!fromIsland) return `To ${toIsland}`;
  if (!toIsland) return `From ${fromIsland}`;
  return `${fromIsland} → ${toIsland}`;
};

/**
 * Formats passenger count for display
 */
export const formatPassengerCount = (count: number): string => {
  if (count === 1) return '1 Passenger';
  return `${count} Passengers`;
};

/**
 * Formats booking number for display
 */
export const formatBookingNumber = (bookingNumber: string): string => {
  return `#${bookingNumber}`;
};

/**
 * Validates booking data
 */
export const validateBookingData = (
  booking: Partial<AdminBooking>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!booking.user_id) errors.push('User is required');
  if (!booking.trip_id) errors.push('Trip is required');
  if (!booking.total_fare || booking.total_fare <= 0)
    errors.push('Valid total fare is required');
  if (!booking.status) errors.push('Status is required');

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sorts bookings by priority and date
 */
export const sortBookingsByPriority = (
  bookings: AdminBooking[]
): AdminBooking[] => {
  return [...bookings].sort((a, b) => {
    const priorityA = getBookingPriority(a);
    const priorityB = getBookingPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

/**
 * Filters bookings by status
 */
export const filterBookingsByStatus = (
  bookings: AdminBooking[],
  status: BookingStatus | 'all'
): AdminBooking[] => {
  if (status === 'all') return bookings;
  return bookings.filter(booking => booking.status === status);
};

/**
 * Searches bookings by query
 */
export const searchBookings = (
  bookings: AdminBooking[],
  query: string
): AdminBooking[] => {
  if (!query.trim()) return bookings;

  const searchTerm = query.toLowerCase();
  return bookings.filter(
    booking =>
      booking.booking_number?.toLowerCase().includes(searchTerm) ||
      booking.user_name?.toLowerCase().includes(searchTerm) ||
      booking.user_email?.toLowerCase().includes(searchTerm) ||
      booking.route_name?.toLowerCase().includes(searchTerm) ||
      booking.agent_name?.toLowerCase().includes(searchTerm)
  );
};
