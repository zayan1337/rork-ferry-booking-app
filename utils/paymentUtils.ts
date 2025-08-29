import { Alert } from 'react-native';
import { supabase } from './supabase';
import type { PaymentMethod } from '@/types/pages/booking';

/**
 * Process payment based on the selected method
 * @param paymentMethod - Selected payment method
 * @param amount - Payment amount
 * @param bookingId - Booking ID for reference
 * @returns Promise that resolves when payment processing is complete
 */
export const processPayment = async (
  paymentMethod: PaymentMethod,
  amount: number,
  bookingId: string
): Promise<void> => {
  try {
    switch (paymentMethod) {
      case 'mib':
        return await processMibPayment(amount, bookingId);

      case 'wallet':
      case 'bml':
      case 'ooredoo_m_faisa':
      case 'fahipay':
        return new Promise(resolve => {
          Alert.alert(
            'Payment Processing',
            'Please complete the payment using the selected payment method.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(),
              },
              {
                text: 'Pay Now',
                onPress: () => {
                  // Here you would integrate with actual payment gateway
                  Alert.alert(
                    'Payment Successful',
                    `Payment of MVR ${amount.toFixed(2)} has been processed successfully.`,
                    [{ text: 'OK', onPress: () => resolve() }]
                  );
                },
              },
            ]
          );
        });

      case 'bank_transfer':
        return new Promise(resolve => {
          Alert.alert(
            'Bank Transfer',
            'Please transfer the amount to our bank account. Details will be provided via SMS/Email.',
            [{ text: 'OK', onPress: () => resolve() }]
          );
        });

      default:
        throw new Error(`Unknown payment method: ${paymentMethod}`);
    }
  } catch (error) {
    throw new Error('Failed to process payment. Please try again.');
  }
};

/**
 * Process MIB payment using Supabase Edge Function
 * @param amount - Payment amount
 * @param bookingId - Booking ID
 * @returns Promise that resolves when payment is complete
 */
export const processMibPayment = async (
  amount: number,
  bookingId: string
): Promise<void> => {
  try {
    // Get current user for return URLs
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create return URLs for payment success/failure
    const returnUrl = `rork-ferry://payment-success?bookingId=${bookingId}&result=SUCCESS`;
    const cancelUrl = `rork-ferry://payment-success?bookingId=${bookingId}&result=CANCELLED`;

    // Call Supabase Edge Function to create MIB session
    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'create-session',
        bookingId,
        amount,
        currency: 'MVR',
        returnUrl,
        cancelUrl,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to initiate MIB payment');
    }

    if (!data?.success) {
      throw new Error('Failed to create MIB payment session');
    }

    // Return the payment URL for WebView processing
    // The actual payment processing will be handled by the WebView component
    return Promise.resolve();
  } catch (error) {
    throw error;
  }
};

/**
 * Initiate MIB payment and return payment URL
 * @param amount - Payment amount
 * @param bookingId - Booking ID
 * @returns Promise that resolves with payment URL
 */
export const initiateMibPayment = async (
  amount: number,
  bookingId: string
): Promise<{ paymentUrl: string; sessionId: string }> => {
  try {
    // Get current user for return URLs
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create return URLs for payment success/failure
    const returnUrl = `rork-ferry://payment-success?bookingId=${bookingId}&result=SUCCESS`;
    const cancelUrl = `rork-ferry://payment-success?bookingId=${bookingId}&result=CANCELLED`;

    // Call Supabase Edge Function to create MIB session
    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'create-session',
        bookingId,
        amount,
        currency: 'MVR',
        returnUrl,
        cancelUrl,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to initiate MIB payment');
    }

    if (!data?.success) {
      throw new Error('Failed to create MIB payment session');
    }

    return {
      paymentUrl: data.redirectUrl || data.sessionUrl,
      sessionId: data.sessionId,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Open MIB payment page
 * @param paymentUrl - MIB payment URL
 */
export const openMibPaymentPage = async (paymentUrl: string): Promise<void> => {
  // This function is now handled by the MibPaymentWebView component
  // The WebView component will handle the payment flow
  // The actual payment page opening is handled by the WebView component
  // This function is kept for backward compatibility
};

/**
 * Cancel MIB payment
 * @param bookingId - Booking ID
 */
export const cancelMibPayment = async (bookingId: string): Promise<void> => {
  try {
    // Update booking status to cancelled
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib');
  } catch (error) {}
};

/**
 * Check MIB payment status
 * @param bookingId - Booking ID
 * @returns Payment status
 */
export const checkMibPaymentStatus = async (
  bookingId: string
): Promise<{
  paymentStatus: string;
  bookingStatus: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'update-payment-status',
        bookingId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to check payment status');
    }

    const result = {
      paymentStatus: data.paymentStatus || 'pending',
      bookingStatus: data.bookingStatus || 'pending_payment',
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Process MIB payment result from return URL
 * @param resultData - Payment result data
 * @returns Payment result
 */
export const processMibPaymentResult = async (resultData: {
  sessionId: string;
  result: string;
  resultIndicator?: string;
  bookingId?: string;
  transactionId?: string;
}): Promise<{
  paymentStatus: string;
  bookingStatus: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'process-payment-result',
        sessionId: resultData.sessionId,
        result: resultData.result,
        resultIndicator: resultData.resultIndicator,
        bookingId: resultData.bookingId,
        transactionId: resultData.transactionId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to process payment result');
    }

    const result = {
      paymentStatus: data.paymentStatus || 'pending',
      bookingStatus: data.bookingStatus || 'pending_payment',
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Calculate fare difference between old and new booking
 * @param currentFare - Current booking fare
 * @param newFare - New booking fare
 * @returns Fare difference (positive means additional payment needed)
 */
export const calculateFareDifference = (
  currentFare: number,
  newFare: number
): number => {
  return newFare - currentFare;
};

/**
 * Calculate refund amount for booking cancellation
 * @param totalFare - Total fare paid for the booking
 * @returns Refund amount (may include cancellation fees)
 */
export const calculateRefundAmount = (totalFare: number): number => {
  // Simple refund calculation - can be enhanced with cancellation policies
  return totalFare * 0.5; // 50% refund (50% cancellation fee)
};

/**
 * Format currency amount
 * @param amount - Amount to format
 * @param currency - Currency code (default: MVR)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'MVR'
): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

/**
 * Format payment method name for display
 * @param method - Payment method
 * @returns Formatted payment method name
 */
export const formatPaymentMethod = (method: PaymentMethod): string => {
  return method
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Create MIB session with booking details
 * @param bookingDetails - Complete booking details
 * @returns Promise that resolves with session data
 */
export const createMibSession = async (bookingDetails: {
  bookingId: string;
  amount: number;
  currency: string;
  bookingNumber: string;
  route: string;
  travelDate: string;
  passengerCount: number;
}): Promise<{
  sessionId: string;
  successIndicator?: string;
  sessionUrl: string;
  redirectUrl: string;
  bookingDetails: any;
}> => {
  try {
    // First, verify the booking exists in the database

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, booking_number')
      .eq('id', bookingDetails.bookingId)
      .maybeSingle();

    if (bookingError) {
      throw new Error(`Failed to verify booking: ${bookingError.message}`);
    }

    if (!booking) {
      // Try again after a short delay in case of database replication lag
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: retryBooking, error: retryError } = await supabase
        .from('bookings')
        .select('id, status, booking_number')
        .eq('id', bookingDetails.bookingId)
        .maybeSingle();

      if (retryError) {
        throw new Error(
          `Failed to verify booking after retry: ${retryError.message}`
        );
      }

      if (!retryBooking) {
        throw new Error(
          `Booking with ID ${bookingDetails.bookingId} not found after retry. Please ensure the booking was created successfully.`
        );
      }
    }

    // Create return URLs for payment success/failure
    const returnUrl = `rork-ferry://payment-success?bookingId=${bookingDetails.bookingId}&result=SUCCESS`;
    const cancelUrl = `rork-ferry://payment-success?bookingId=${bookingDetails.bookingId}&result=CANCELLED`;

    // Call Supabase Edge Function to create MIB session
    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'create-session',
        bookingId: bookingDetails.bookingId,
        amount: bookingDetails.amount,
        currency: bookingDetails.currency,
        returnUrl,
        cancelUrl,
      },
    });

    if (error) {
      const errorMessage = error.message || 'Failed to create MIB session';
      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error('No response data from MIB session creation');
    }

    if (!data.success) {
      const errorMessage = data.error || 'Failed to create MIB session';
      throw new Error(errorMessage);
    }

    if (!data.redirectUrl) {
      throw new Error('No redirect URL received from MIB session');
    }

    const result = {
      sessionId: data.sessionId,
      successIndicator: data.successIndicator,
      sessionUrl: data.sessionUrl,
      redirectUrl: data.redirectUrl,
      bookingDetails,
    };
    // Update payment record with session ID if not already set
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        session_id: result.sessionId,
      })
      .eq('booking_id', bookingDetails.bookingId)
      .is('session_id', null); // Only update if session_id is not already set

    if (paymentError) {
      // Payment update failed - non-critical
    }

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Manually update payment status to completed (fallback method)
 * @param bookingId - The booking ID to update
 * @returns Promise that resolves when update is complete
 */
export const manuallyUpdatePaymentStatus = async (
  bookingId: string
): Promise<void> => {
  try {
    // Update payment record to completed
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_date: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib');

    if (paymentError) {
      console.warn('Failed to update payment status:', paymentError);
    }

    // Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (
      bookingError &&
      !bookingError.message?.includes(
        'trigger functions can only be called as triggers'
      )
    ) {
      throw bookingError;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Release seats for a booking by making them available again
 * @param bookingId - The booking ID to release seats for
 */
export const releaseSeatReservations = async (
  bookingId: string
): Promise<void> => {
  try {
    // Release seat reservations back to available status
    const { error: seatReleaseError } = await supabase
      .from('seat_reservations')
      .update({
        is_available: true,
        booking_id: null,
        is_reserved: false,
        reservation_expiry: null,
      })
      .eq('booking_id', bookingId);

    if (seatReleaseError) {
      console.error('Error releasing seat reservations:', seatReleaseError);
      throw new Error(
        `Failed to release seat reservations: ${seatReleaseError.message}`
      );
    }

    console.log(
      `Successfully released seat reservations for booking ${bookingId}`
    );
  } catch (error) {
    console.error('Error in releaseSeatReservations:', error);
    throw error;
  }
};

/**
 * Cancel booking and release seats on payment failure
 * @param bookingId - The booking ID to cancel
 * @param reason - Reason for cancellation (default: payment failure)
 */
export const cancelBookingOnPaymentFailure = async (
  bookingId: string,
  reason: string = 'Payment failed'
): Promise<void> => {
  try {
    // 1. Update booking status to cancelled
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingUpdateError) {
      console.error('Error updating booking status:', bookingUpdateError);
      throw new Error(
        `Failed to update booking status: ${bookingUpdateError.message}`
      );
    }

    // 2. Release seat reservations
    await releaseSeatReservations(bookingId);

    // 3. Create cancellation record
    const cancellationNumber =
      Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number

    const { error: cancellationError } = await supabase
      .from('cancellations')
      .insert({
        booking_id: bookingId,
        cancellation_number: cancellationNumber.toString(),
        cancellation_reason: reason,
        cancellation_fee: 0, // No fee for payment failures
        refund_amount: 0, // No refund needed since payment failed
        status: 'completed', // Mark as completed since no refund processing needed
      });

    if (cancellationError) {
      console.warn(
        'Error creating cancellation record (non-critical):',
        cancellationError
      );
    }

    // 4. Update payment status to failed (if payment exists)
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib');

    if (paymentUpdateError) {
      console.warn(
        'Error updating payment status (non-critical):',
        paymentUpdateError
      );
    }

    console.log(
      `Successfully cancelled booking ${bookingId} due to: ${reason}`
    );
  } catch (error) {
    console.error('Error in cancelBookingOnPaymentFailure:', error);
    throw error;
  }
};

/**
 * Cancel booking and release seats when payment is cancelled by user
 * @param bookingId - The booking ID to cancel
 * @param reason - Reason for cancellation (default: payment cancelled)
 */
export const cancelBookingOnPaymentCancellation = async (
  bookingId: string,
  reason: string = 'Payment cancelled by user'
): Promise<void> => {
  try {
    // First check if payment was actually made
    const { data: payment, error: paymentCheckError } = await supabase
      .from('payments')
      .select('status, amount')
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .single();

    // 1. Update booking status to cancelled
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (bookingUpdateError) {
      console.error('Error updating booking status:', bookingUpdateError);
      throw new Error(
        `Failed to update booking status: ${bookingUpdateError.message}`
      );
    }

    // 2. Release seat reservations
    await releaseSeatReservations(bookingId);

    // 3. Create cancellation record
    const cancellationNumber =
      Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number

    // Determine refund amount based on payment status
    const refundAmount =
      payment && payment.status === 'completed' ? payment.amount : 0;
    const cancellationFee = 0; // No fee for payment cancellations

    const { error: cancellationError } = await supabase
      .from('cancellations')
      .insert({
        booking_id: bookingId,
        cancellation_number: cancellationNumber.toString(),
        cancellation_reason: reason,
        cancellation_fee: cancellationFee,
        refund_amount: refundAmount,
        status: refundAmount > 0 ? 'pending' : 'completed', // Pending if refund needed
      });

    if (cancellationError) {
      console.warn(
        'Error creating cancellation record (non-critical):',
        cancellationError
      );
    }

    // 4. Update payment status to cancelled
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib');

    if (paymentUpdateError) {
      console.warn(
        'Error updating payment status (non-critical):',
        paymentUpdateError
      );
    }

    console.log(
      `Successfully cancelled booking ${bookingId} due to: ${reason}`
    );
  } catch (error) {
    console.error('Error in cancelBookingOnPaymentCancellation:', error);
    throw error;
  }
};
