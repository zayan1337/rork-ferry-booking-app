/**
 * Multi-Stop Check-In Utilities
 *
 * Utilities for validating and processing check-ins on multi-stop trips
 */

import { supabase } from './supabase';
import { validateCheckInAtStop } from './multiStopTripUtils';

/**
 * Enhanced check-in validation for multi-stop trips
 */
export async function validateCheckIn(
  bookingId: string,
  bookingNumber: string
): Promise<{
  isValid: boolean;
  canCheckIn: boolean;
  message: string;
  requiresStopValidation: boolean;
  currentStopId?: string;
  expectedStopId?: string;
  stopValidation?: { allowed: boolean; message: string };
}> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        trip_id,
        status,
        check_in_status,
        trips!inner(
          id,
          is_multi_stop,
          current_stop_id,
          travel_date,
          departure_time
        )
      `
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        isValid: false,
        canCheckIn: false,
        message: 'Booking not found',
        requiresStopValidation: false,
      };
    }

    // Basic validation
    if (booking.status !== 'confirmed') {
      return {
        isValid: false,
        canCheckIn: false,
        message: `Booking status is ${booking.status}. Only confirmed bookings can be checked in.`,
        requiresStopValidation: false,
      };
    }

    if (booking.check_in_status) {
      return {
        isValid: true,
        canCheckIn: false,
        message: 'Already checked in',
        requiresStopValidation: false,
      };
    }

    const trip = (booking as any).trips;

    // If not a multi-stop trip, use regular validation
    if (!trip.is_multi_stop) {
      return {
        isValid: true,
        canCheckIn: true,
        message: 'Regular trip - check-in allowed',
        requiresStopValidation: false,
      };
    }

    // Multi-stop trip - validate stop
    const stopValidation = await validateCheckInAtStop(
      bookingId,
      trip.current_stop_id
    );

    return {
      isValid: true,
      canCheckIn: stopValidation.allowed,
      message: stopValidation.message,
      requiresStopValidation: true,
      currentStopId: trip.current_stop_id,
      stopValidation,
    };
  } catch (error) {
    console.error('Error validating check-in:', error);
    return {
      isValid: false,
      canCheckIn: false,
      message: 'Validation error occurred',
      requiresStopValidation: false,
    };
  }
}

/**
 * Process check-in with stop validation
 */
export async function processCheckInWithStopValidation(
  bookingId: string,
  captainId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get booking number for validation
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_number')
      .eq('id', bookingId)
      .single();

    if (!booking) {
      return { success: false, message: 'Booking not found' };
    }

    // Validate check-in
    const validation = await validateCheckIn(bookingId, booking.booking_number);

    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }

    if (!validation.canCheckIn) {
      return { success: false, message: validation.message };
    }

    // Process check-in
    const checkInTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'checked_in',
        check_in_status: true,
        checked_in_at: checkInTime,
        checked_in_by: captainId,
      })
      .eq('id', bookingId);

    if (updateError) {
      return {
        success: false,
        message: `Check-in failed: ${updateError.message}`,
      };
    }

    // Create check-in log
    try {
      const { data: passengerCount } = await supabase
        .from('passengers')
        .select('id', { count: 'exact' })
        .eq('booking_id', bookingId);

      await supabase.from('check_in_logs').insert({
        booking_id: bookingId,
        captain_id: captainId,
        check_in_time: checkInTime,
        passenger_count: passengerCount?.length || 0,
        notes: validation.requiresStopValidation
          ? `Multi-stop check-in at stop ${validation.currentStopId}`
          : 'Regular check-in',
      });
    } catch (logError) {
      // Log creation is optional, don't fail check-in if this fails
      console.error('Failed to create check-in log:', logError);
    }

    return {
      success: true,
      message: validation.requiresStopValidation
        ? `Checked in successfully at ${validation.stopValidation?.message}`
        : 'Checked in successfully',
    };
  } catch (error) {
    console.error('Error processing check-in:', error);
    return { success: false, message: 'Failed to process check-in' };
  }
}

/**
 * Get check-in eligibility with detailed stop info
 */
export async function getCheckInEligibility(bookingNumber: string): Promise<{
  eligible: boolean;
  message: string;
  bookingId?: string;
  isMultiStop: boolean;
  currentStopName?: string;
  expectedStopName?: string;
}> {
  try {
    // Find booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        status,
        check_in_status,
        trip_id,
        trips!inner(
          id,
          is_multi_stop,
          current_stop_id
        )
      `
      )
      .eq('booking_number', bookingNumber.toUpperCase())
      .single();

    if (error || !booking) {
      return {
        eligible: false,
        message: 'Booking not found',
        isMultiStop: false,
      };
    }

    const trip = (booking as any).trips;

    // Check if multi-stop
    if (!trip.is_multi_stop) {
      return {
        eligible: booking.status === 'confirmed' && !booking.check_in_status,
        message: booking.check_in_status
          ? 'Already checked in'
          : booking.status === 'confirmed'
            ? 'Eligible for check-in'
            : `Booking status: ${booking.status}`,
        bookingId: booking.id,
        isMultiStop: false,
      };
    }

    // Multi-stop validation
    const stopValidation = await validateCheckInAtStop(
      booking.id,
      trip.current_stop_id
    );

    // Get stop names
    const { data: currentStopData } = await supabase
      .from('trip_stops_view')
      .select('island_name')
      .eq('id', trip.current_stop_id)
      .single();

    const { data: bookingStops } = await supabase
      .from('booking_stops')
      .select(
        `
        boarding_stop:trip_stops!booking_stops_boarding_stop_id_fkey(
          island_name
        )
      `
      )
      .eq('booking_id', booking.id)
      .single();

    return {
      eligible:
        stopValidation.allowed &&
        booking.status === 'confirmed' &&
        !booking.check_in_status,
      message: stopValidation.message,
      bookingId: booking.id,
      isMultiStop: true,
      currentStopName: currentStopData?.island_name,
      expectedStopName: (bookingStops as any)?.boarding_stop?.island_name,
    };
  } catch (error) {
    console.error('Error getting check-in eligibility:', error);
    return {
      eligible: false,
      message: 'Error checking eligibility',
      isMultiStop: false,
    };
  }
}
