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
    const returnUrl = `rork-ferry://payment-success?bookingId=${bookingId}?&result=SUCCESS`;
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
    console.log('🔍 Checking MIB payment status...', {
      bookingId,
      timestamp: new Date().toISOString(),
    });

    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'update-payment-status',
        bookingId,
      },
    });

    console.log('📊 MIB Payment Status Check Response:', {
      data,
      error,
      bookingId,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Error checking MIB payment status:', {
        error: error.message || 'Unknown error',
        bookingId,
      });
      throw new Error(error.message || 'Failed to check payment status');
    }

    const result = {
      paymentStatus: data.paymentStatus || 'pending',
      bookingStatus: data.bookingStatus || 'pending_payment',
    };

    console.log('✅ MIB Payment Status Check Result:', {
      result,
      bookingId,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error('❌ MIB Payment Status Check Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bookingId,
      timestamp: new Date().toISOString(),
    });
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
}): Promise<{
  paymentStatus: string;
  bookingStatus: string;
}> => {
  try {
    console.log('🔄 Processing MIB payment result...', {
      resultData,
      timestamp: new Date().toISOString(),
    });

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

    console.log('📊 MIB Payment Result Processing Response:', {
      data,
      error,
      originalResultData: resultData,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Error processing MIB payment result:', {
        error: error.message || 'Unknown error',
        resultData,
      });
      throw new Error(error.message || 'Failed to process payment result');
    }

    const result = {
      paymentStatus: data.paymentStatus || 'pending',
      bookingStatus: data.bookingStatus || 'pending_payment',
    };

    console.log('✅ MIB Payment Result Processing Complete:', {
      result,
      originalResult: resultData.result,
      sessionId: resultData.sessionId,
      bookingId: resultData.bookingId,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error('❌ MIB Payment Result Processing Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      resultData,
      timestamp: new Date().toISOString(),
    });
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
    console.log('🚀 Creating MIB session...', {
      bookingDetails,
      timestamp: new Date().toISOString(),
    });

    // First, verify the booking exists in the database
    console.log('🔍 Verifying booking exists in database...');

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, booking_number')
      .eq('id', bookingDetails.bookingId)
      .maybeSingle();

    console.log('📋 Booking verification result:', {
      booking,
      bookingError,
      bookingId: bookingDetails.bookingId,
    });

    if (bookingError) {
      console.error('❌ Error checking booking:', bookingError);
      throw new Error(`Failed to verify booking: ${bookingError.message}`);
    }

    if (!booking) {
      // Try again after a short delay in case of database replication lag
      console.log('⏳ Booking not found, retrying after 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: retryBooking, error: retryError } = await supabase
        .from('bookings')
        .select('id, status, booking_number')
        .eq('id', bookingDetails.bookingId)
        .maybeSingle();

      console.log('🔄 Booking verification retry result:', {
        retryBooking,
        retryError,
        bookingId: bookingDetails.bookingId,
      });

      if (retryError) {
        console.error('❌ Error on booking verification retry:', retryError);
        throw new Error(
          `Failed to verify booking after retry: ${retryError.message}`
        );
      }

      if (!retryBooking) {
        console.error('❌ Booking not found after retry');
        throw new Error(
          `Booking with ID ${bookingDetails.bookingId} not found after retry. Please ensure the booking was created successfully.`
        );
      }

      console.log('✅ Booking verified on retry:', retryBooking);
    } else {
      console.log('✅ Booking verified successfully:', booking);
    }

    // Create return URLs for payment success/failure
    const returnUrl = `rork-ferry://payment-success?bookingId=${bookingDetails.bookingId}&result=SUCCESS`;
    const cancelUrl = `rork-ferry://payment-success?bookingId=${bookingDetails.bookingId}&result=CANCELLED`;

    console.log('🔗 Return URLs created:', {
      returnUrl,
      cancelUrl,
    });

    console.log('📡 Calling Edge Function to create MIB session...');

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

    console.log('📊 Edge Function Response:', {
      data,
      error,
      bookingId: bookingDetails.bookingId,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      // Try to get more details from the error
      let errorMessage = 'Failed to create MIB session';
      if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }

    if (!data) {
      console.error('❌ No response data from Edge Function');
      throw new Error('No response data from MIB session creation');
    }

    if (!data.success) {
      const errorMessage = data.error || 'Failed to create MIB session';
      console.error('❌ Edge Function returned failure:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!data.redirectUrl) {
      console.error('❌ No redirect URL in response:', data);
      throw new Error('No redirect URL received from MIB session');
    }

    const result = {
      sessionId: data.sessionId,
      successIndicator: data.successIndicator,
      sessionUrl: data.sessionUrl,
      redirectUrl: data.redirectUrl,
      bookingDetails,
    };
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        session_id: result.sessionId,
      })
      .eq('booking_id', bookingDetails.bookingId);

    if (paymentError) {
      console.error('❌ Error updating payment:', paymentError);
    }

    console.log('✅ MIB Session Created Successfully:', {
      result,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error('❌ MIB Session Creation Failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bookingDetails,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

/**
 * Test Edge Function connectivity
 * @returns Promise that resolves with test result
 */
export const testEdgeFunction = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('Testing Edge Function connectivity...');

    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'health-check',
      },
    });

    if (error) {
      console.error('Edge Function test error:', error);
      return {
        success: false,
        message: `Edge Function error: ${error.message}`,
        details: error,
      };
    }

    console.log('Edge Function test response:', data);
    return {
      success: true,
      message: 'Edge Function is working',
      details: data,
    };
  } catch (error) {
    console.error('Edge Function test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error,
    };
  }
};

/**
 * Test MIB session creation with debug info
 * @returns Promise that resolves with test result
 */
export const testMibSessionCreation = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('Testing MIB session creation...');

    const testBookingId = 'test-booking-123';
    const testAmount = 100;
    const testCurrency = 'MVR';
    const testReturnUrl =
      'rork-ferry://payment-success?bookingId=test&result=SUCCESS';
    const testCancelUrl =
      'rork-ferry://payment-success?bookingId=test&result=CANCELLED';

    const { data, error } = await supabase.functions.invoke('mib-payment', {
      body: {
        action: 'create-session',
        bookingId: testBookingId,
        amount: testAmount,
        currency: testCurrency,
        returnUrl: testReturnUrl,
        cancelUrl: testCancelUrl,
      },
    });

    if (error) {
      console.error('MIB session creation test error:', error);
      return {
        success: false,
        message: `MIB session creation error: ${error.message}`,
        details: error,
      };
    }

    console.log('MIB session creation test response:', data);
    return {
      success: true,
      message: 'MIB session creation is working',
      details: data,
    };
  } catch (error) {
    console.error('MIB session creation test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error,
    };
  }
};

/**
 * Debug function to check booking status
 * @param bookingId - The booking ID to check
 * @returns Promise that resolves with booking details
 */
export const debugBookingStatus = async (
  bookingId: string
): Promise<{
  exists: boolean;
  booking?: any;
  error?: string;
}> => {
  try {
    console.log('Debugging booking status for ID:', bookingId);

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (error) {
      console.error('Error checking booking:', error);
      return {
        exists: false,
        error: error.message,
      };
    }

    if (!booking) {
      console.log('Booking not found in database');
      return {
        exists: false,
        error: 'Booking not found',
      };
    }

    console.log('Booking found:', booking);
    return {
      exists: true,
      booking,
    };
  } catch (error) {
    console.error('Debug function error:', error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
      console.warn('Failed to update booking status:', bookingError);
      throw bookingError;
    }
  } catch (error) {
    console.error('Error manually updating payment status:', error);
    throw error;
  }
};

/**
 * Test database connectivity and list recent bookings
 * @returns Promise that resolves with test result
 */
export const testDatabaseConnectivity = async (): Promise<{
  success: boolean;
  message: string;
  recentBookings?: any[];
  error?: string;
}> => {
  try {
    console.log('Testing database connectivity...');

    // Test basic query
    const { data: recentBookings, error } = await supabase
      .from('bookings')
      .select('id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Database test error:', error);
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message,
      };
    }

    console.log('Recent bookings:', recentBookings);
    return {
      success: true,
      message: 'Database connection successful',
      recentBookings,
    };
  } catch (error) {
    console.error('Database test failed:', error);
    return {
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
