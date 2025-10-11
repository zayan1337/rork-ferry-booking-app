import { supabase } from './supabase';

/**
 * Handle payment timeout by cancelling booking and releasing seats
 */
export async function handlePaymentTimeout(
  bookingId: string,
  reason: string = 'Payment timeout'
): Promise<void> {
  try {
    // Get user ID before cancelling to clean up temp reservations
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    // Update booking status to cancelled
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('[TIMEOUT] Failed to cancel booking:', bookingError);
      throw bookingError;
    }

    // Release permanent seat reservations (with booking_id)
    const { error: seatError } = await supabase
      .from('seat_reservations')
      .update({
        is_available: true,
        booking_id: null,
        is_reserved: false,
        reservation_expiry: null,
        user_id: null,
        session_id: null,
        temp_reservation_expiry: null,
        last_activity: new Date().toISOString(),
      })
      .eq('booking_id', bookingId);

    if (seatError) {
      console.error('[TIMEOUT] Failed to release seats:', seatError);
      throw seatError;
    }

    // ALSO release any temporary reservations for this user (without booking_id)
    if (userId) {
      const { error: tempSeatError } = await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          user_id: null,
          session_id: null,
          temp_reservation_expiry: null,
          is_reserved: false,
          last_activity: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .is('booking_id', null);

      if (tempSeatError) {
        console.warn(
          '[TIMEOUT] Failed to release temporary reservations:',
          tempSeatError
        );
      }
    }

    // Update payment status to expired
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib');

    if (paymentError) {
      console.error('[TIMEOUT] Failed to update payment status:', paymentError);
    }
  } catch (error) {
    console.error('[TIMEOUT] Error handling payment timeout:', error);
    throw error;
  }
}

/**
 * Check if a payment has timed out based on creation time
 */
export async function isPaymentTimedOut(
  bookingId: string,
  timeoutMinutes: number = 15
): Promise<boolean> {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('created_at, status')
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !payment) {
      return false;
    }

    // Already completed or failed
    if (payment.status === 'completed' || payment.status === 'failed') {
      return false;
    }

    const createdAt = new Date(payment.created_at);
    const now = new Date();
    const minutesElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    return minutesElapsed > timeoutMinutes;
  } catch (error) {
    console.error('Error checking payment timeout:', error);
    return false;
  }
}
