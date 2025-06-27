import { Booking } from '@/types/agent';

/**
 * Check if a booking is expired based on its departure date
 * @param booking - The booking object to check
 * @returns true if the booking's departure date has passed, false otherwise
 */
export const isBookingExpired = (booking: Booking | any): boolean => {
    if (!booking.departureDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

    const departureDate = new Date(booking.departureDate);
    departureDate.setHours(0, 0, 0, 0); // Set to start of day

    return departureDate < today;
};

/**
 * Check if a booking is considered active (confirmed/pending and not expired)
 * @param booking - The booking object to check
 * @returns true if the booking is active, false otherwise
 */
export const isBookingActive = (booking: Booking | any): boolean => {
    const activeStatuses = ['confirmed', 'pending'];
    return activeStatuses.includes(booking.status) && !isBookingExpired(booking);
};

/**
 * Check if a booking is considered inactive (cancelled, modified, or expired)
 * @param booking - The booking object to check
 * @returns true if the booking is inactive, false otherwise
 */
export const isBookingInactive = (booking: Booking | any): boolean => {
    const inactiveStatuses = ['cancelled', 'modified'];
    return inactiveStatuses.includes(booking.status) || isBookingExpired(booking);
};

/**
 * Filter bookings to get only active ones
 * @param bookings - Array of bookings to filter
 * @returns Array of active bookings
 */
export const getActiveBookings = (bookings: Booking[] | any[]): (Booking | any)[] => {
    return bookings.filter(isBookingActive);
};

/**
 * Filter bookings to get only inactive ones
 * @param bookings - Array of bookings to filter
 * @returns Array of inactive bookings
 */
export const getInactiveBookings = (bookings: Booking[] | any[]): (Booking | any)[] => {
    return bookings.filter(isBookingInactive);
}; 