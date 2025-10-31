import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
// MIB Configuration
const MIB_BASE_URL =
  Deno.env.get('MIB_PROD_API_URL') || 'https://mib.gateway.mastercard.com';
const MERCHANT_ID = Deno.env.get('MIB_PROD_MERCHANT_ID') || 'CRYSTALTRF';
const MIB_USER_ID = Deno.env.get('MIB_USER_ID') || MERCHANT_ID;
const MIB_PASSWORD =
  Deno.env.get('MIB_PROD_PASSWORD') || '214f7fa58106dd724c9104bdb77590d3';
// Build correct Basic Auth header
const AUTH_HEADER = 'Basic ' + btoa(`merchant.${MIB_USER_ID}:${MIB_PASSWORD}`);
const API_VERSION = Deno.env.get('MIB_PROD_API_VERSION') || 100;
const merchantName =
  Deno.env.get('MIB_MERCHANT_NAME') || 'Crystal Transfer Vaavu';
serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    // Use service role key for database operations to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
        Deno.env.get('SUPABASE_ANON_KEY') ??
        ''
    );
    const requestBody = await req.json();
    const {
      action,
      bookingId,
      amount,
      currency = 'MVR',
      returnUrl,
      cancelUrl,
    } = requestBody;
    switch (action) {
      case 'health-check':
        return new Response(
          JSON.stringify({
            status: 'ok',
            message: 'MIB Payment Edge Function is running',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      case 'create-session':
        return await createMibSession(
          supabase,
          bookingId,
          amount,
          currency,
          returnUrl,
          cancelUrl
        );
      case 'update-payment-status':
        return await updatePaymentStatus(supabase, bookingId);
      case 'process-payment-result':
        return await processPaymentResult(supabase, requestBody);
      case 'process-refund':
        return await processRefund(
          supabase,
          requestBody.bookingId,
          requestBody.refundAmount,
          requestBody.currency || 'MVR'
        );
      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid action',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
// Create a basic session (Step 1: Establish a Session)
async function createMibSession(
  supabase,
  bookingId,
  amount,
  currency,
  returnUrl,
  cancelUrl
) {
  try {
    let orderId = '';
    let orderDescription = '';
    let paymentType = 'booking'; // Default type

    // First, try to find if this is a regular booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_number, status, trip_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (booking) {
      // This is a regular ferry booking
      paymentType = 'booking';
      orderId = booking.booking_number || `order-${bookingId}-${Date.now()}`;

      // Try to get route description
      try {
        const { data: trip } = await supabase
          .from('trips')
          .select('id, route_id')
          .eq('id', booking.trip_id)
          .maybeSingle();

        if (trip) {
          const { data: route } = await supabase
            .from('routes_simple_view')
            .select('id, from_island_name, to_island_name, route_display_name')
            .eq('id', trip.route_id)
            .maybeSingle();

          if (route) {
            orderDescription = `Ferry booking from ${route.from_island_name} to ${route.to_island_name}`;
          } else {
            orderDescription = 'Ferry booking';
          }
        } else {
          orderDescription = 'Ferry booking';
        }
      } catch (routeError) {
        orderDescription = 'Ferry booking';
      }
    } else {
      // Not a booking, check if it's a credit top-up
      const { data: creditTransaction } = await supabase
        .from('agent_credit_transactions')
        .select('id, agent_id, amount')
        .eq('id', bookingId)
        .maybeSingle();

      if (creditTransaction) {
        paymentType = 'credit';
        orderId = `CREDIT-${bookingId.slice(0, 20)}`;
        orderDescription = 'Agent Credit Top-up';
      } else {
        // Check if it's a wallet transaction
        const { data: walletTransaction } = await supabase
          .from('wallet_transactions')
          .select('id, wallet_id, amount')
          .eq('id', bookingId)
          .maybeSingle();

        if (walletTransaction) {
          paymentType = 'wallet';
          orderId = `WALLET-${bookingId.slice(0, 19)}`;
          orderDescription = 'Wallet Recharge';
        } else {
          // Unknown transaction type - use generic
          paymentType = 'generic';
          orderId = `PAY-${bookingId.slice(0, 22)}`;
          orderDescription = `Payment for ${merchantName}`;
        }
      }
    }
    // Create MIB session using INITIATE_CHECKOUT operation
    const sessionRequest = {
      apiOperation: 'INITIATE_CHECKOUT',
      checkoutMode: 'WEBSITE',
      interaction: {
        operation: 'PURCHASE',
        merchant: {
          name: merchantName,
          url: returnUrl,
        },
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
      },
      order: {
        amount: amount.toFixed(2),
        currency: currency,
        id: orderId,
        description: orderDescription,
      },
    };
    const sessionResponse = await fetch(
      `${MIB_BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: AUTH_HEADER,
        },
        body: JSON.stringify(sessionRequest),
      }
    );
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      throw new Error(
        `Failed to create MIB session: ${sessionResponse.status} - ${errorText}`
      );
    }
    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.session?.id;
    const successIndicator = sessionData.successIndicator;
    if (!sessionId) {
      throw new Error('No session ID returned from MIB API');
    }

    // Update records based on payment type
    if (paymentType === 'booking') {
      // Update booking with MIB session ID and success indicator
      await supabase
        .from('bookings')
        .update({
          payment_method_type: 'mib',
          status: 'pending_payment',
        })
        .eq('id', bookingId);

      // Create or update payment record with session ID
      await supabase.from('payments').upsert(
        {
          booking_id: bookingId,
          payment_method: 'mib',
          amount: amount,
          currency: currency,
          status: 'pending',
          session_id: sessionId,
        },
        {
          onConflict: 'booking_id,payment_method',
        }
      );
    } else if (paymentType === 'credit') {
      // Update credit transaction with session ID in description
      await supabase
        .from('agent_credit_transactions')
        .update({
          description: `Credit top-up via MIB Payment (Session: ${sessionId})`,
        })
        .eq('id', bookingId);
    } else if (paymentType === 'wallet') {
      // For wallet transactions, we can't add session ID to the limited fields
      // Transaction tracking will be done via the transaction ID itself
    }
    // Note: For credit and wallet, we don't create payment records in the payments table
    // as that table is specifically for booking payments
    // The SDK will handle the redirect, but we still need the base URL for return handling
    const responseData = {
      success: true,
      sessionId: sessionId,
      successIndicator: successIndicator,
      sessionUrl: sessionData.session?.url || null,
      // Keep redirectUrl for fallback scenarios
      redirectUrl:
        sessionData.redirectUrl ||
        `${MIB_BASE_URL}/checkout/pay/${sessionId}?checkoutVersion=1.0.0`,
      orderId: orderId,
      // Include session data for SDK configuration
      session: {
        id: sessionId,
        url: sessionData.session?.url,
      },
    };
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
async function updatePaymentStatus(supabase, bookingId) {
  try {
    // Get the latest payment for this booking
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .single();
    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }
    // Query MIB for payment status using session ID
    const sessionIdToUse = payment.session_id || payment.receipt_number;
    if (!sessionIdToUse) {
      throw new Error('No session ID found in payment record');
    }
    const statusResponse = await fetch(
      `${MIB_BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/session/${sessionIdToUse}`,
      {
        method: 'GET',
        headers: {
          Authorization: AUTH_HEADER,
        },
      }
    );
    if (!statusResponse.ok) {
      throw new Error(`Failed to get payment status: ${statusResponse.status}`);
    }
    const statusData = await statusResponse.json();
    const paymentStatus = statusData.result || 'pending';
    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status:
          paymentStatus === 'SUCCESS'
            ? 'completed'
            : paymentStatus === 'FAILURE'
              ? 'failed'
              : 'pending',
        transaction_date: new Date().toISOString(),
      })
      .eq('id', payment.id);
    if (paymentUpdateError) {
      // Payment update failed
    }
    // Update booking status based on payment result
    if (paymentStatus === 'SUCCESS') {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
        })
        .eq('id', bookingId);
      if (bookingUpdateError) {
        console.warn(
          'Failed to update booking status to confirmed:',
          bookingUpdateError
        );
        // Don't throw error - payment was successful, booking status can be fixed later
      }
    } else if (paymentStatus === 'FAILURE') {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
        })
        .eq('id', bookingId);
      if (bookingUpdateError) {
        console.warn(
          'Failed to update booking status to cancelled:',
          bookingUpdateError
        );
        // Don't throw error - payment failed, booking status can be fixed later
      }
    }
    const finalResponse = {
      success: true,
      paymentStatus:
        paymentStatus === 'SUCCESS'
          ? 'completed'
          : paymentStatus === 'FAILURE'
            ? 'failed'
            : 'pending',
      bookingStatus:
        paymentStatus === 'SUCCESS'
          ? 'confirmed'
          : paymentStatus === 'FAILURE'
            ? 'cancelled'
            : 'pending_payment',
    };
    return new Response(JSON.stringify(finalResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentStatus: 'pending',
      bookingStatus: 'pending_payment',
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
async function processPaymentResult(supabase, resultData) {
  try {
    const { sessionId, result, transactionId, bookingId } = resultData;
    // Validate required parameters
    if (!result) {
      throw new Error('Payment result is required');
    }
    if (!sessionId && !bookingId) {
      throw new Error('Either sessionId or bookingId is required');
    }
    // Find payment by session ID or booking ID
    let payment = null;
    let paymentError = null;
    if (bookingId) {
      // Try to find payment by booking ID first (most reliable method)
      const { data: bookingPayment, error: bookingPaymentError } =
        await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('payment_method', 'mib')
          .order('created_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to avoid errors when no record found
      if (bookingPayment) {
        payment = bookingPayment;
      } else if (bookingPaymentError) {
        paymentError = bookingPaymentError;
      }
    }
    // If not found by booking ID, try by session ID
    if (!payment && sessionId) {
      const { data: sessionPayment, error: sessionPaymentError } =
        await supabase
          .from('payments')
          .select('*')
          .eq('session_id', sessionId)
          .eq('payment_method', 'mib')
          .maybeSingle();
      if (sessionPayment) {
        payment = sessionPayment;
      } else if (sessionPaymentError) {
        paymentError = sessionPaymentError;
      }
    }
    if (!payment) {
      // If we have a booking ID but no payment record, we can still update the booking
      if (
        bookingId &&
        (result === 'SUCCESS' || result === 'FAILURE' || result === 'CANCELLED')
      ) {
        let bookingStatus = 'pending_payment';
        let paymentStatus = 'pending';
        if (result === 'SUCCESS') {
          bookingStatus = 'confirmed';
          paymentStatus = 'completed';
        } else if (result === 'FAILURE' || result === 'CANCELLED') {
          bookingStatus = 'cancelled';
          paymentStatus = result === 'CANCELLED' ? 'cancelled' : 'failed';
        }
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            status: bookingStatus,
          })
          .eq('id', bookingId);
        if (bookingUpdateError) {
          // Booking update failed
        }
        const finalResponse = {
          success: true,
          paymentStatus: paymentStatus,
          bookingStatus: bookingStatus,
          bookingId: bookingId,
          sessionId: sessionId,
          note: 'Updated booking directly (no payment record found)',
        };
        return new Response(JSON.stringify(finalResponse), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
      throw new Error(
        'Payment record not found and cannot update booking directly'
      );
    }
    // Update payment record based on gateway response
    const paymentStatus =
      result === 'SUCCESS'
        ? 'completed'
        : result === 'FAILURE'
          ? 'failed'
          : result === 'CANCELLED'
            ? 'cancelled'
            : 'pending';
    const { data: paymentUpdateData, error: paymentUpdateError } =
      await supabase
        .from('payments')
        .update({
          status: paymentStatus,
          transaction_date: new Date().toISOString(),
          // Store transaction ID in receipt_number if available, keep session_id as is
          ...(transactionId &&
            transactionId.length <= 20 && {
              receipt_number: transactionId,
            }),
        })
        .eq('id', payment.id)
        .select('*');
    if (paymentUpdateError) {
      // Payment update failed
    }
    // Update booking status based on gateway response
    let bookingStatus = 'pending_payment';
    if (result === 'SUCCESS') {
      bookingStatus = 'confirmed';
      const { data: bookingUpdateData, error: bookingUpdateError } =
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
          })
          .eq('id', payment.booking_id)
          .select('id, status, booking_number');
      if (bookingUpdateError) {
        console.warn(
          'Failed to update booking status to confirmed in processPaymentResult:',
          bookingUpdateError
        );
        // Don't throw error - payment was successful, booking status can be fixed later
      }
    } else if (result === 'FAILURE' || result === 'CANCELLED') {
      bookingStatus = 'cancelled';
      const { data: bookingUpdateData, error: bookingUpdateError } =
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
          })
          .eq('id', payment.booking_id)
          .select('id, status, booking_number');
      if (bookingUpdateError) {
        console.warn(
          'Failed to update booking status to cancelled in processPaymentResult:',
          bookingUpdateError
        );
        // Don't throw error - payment failed, booking status can be fixed later
      }
    }
    const finalResponse = {
      success: true,
      paymentStatus,
      bookingStatus,
      bookingId: payment.booking_id,
      sessionId: sessionId,
    };
    return new Response(JSON.stringify(finalResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentStatus: 'pending',
      bookingStatus: 'pending_payment',
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * Process refund for a cancelled booking
 * @param supabase - Supabase client
 * @param bookingId - Booking ID
 * @param refundAmount - Amount to refund
 * @param currency - Currency code
 */
async function processRefund(supabase, bookingId, refundAmount, currency) {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_number, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error('[REFUND] Booking lookup error:', bookingError);
      throw new Error(`Database error: ${bookingError.message}`);
    }

    if (!booking) {
      console.error(`[REFUND] Booking not found: ${bookingId}`);
      throw new Error(`Booking with ID ${bookingId} not found`);
    }

    console.log(
      `[REFUND] Booking found - Status: ${booking.status}, Number: ${booking.booking_number}`
    );

    // Get the original payment record - check all MIB payments first
    console.log('[REFUND] Looking for payment records...');
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .order('created_at', { ascending: false });

    if (allPaymentsError) {
      console.error('[REFUND] Payment lookup error:', allPaymentsError);
      throw new Error(`Payment lookup error: ${allPaymentsError.message}`);
    }

    console.log(
      `[REFUND] Found ${allPayments?.length || 0} MIB payment(s) for this booking`
    );
    if (allPayments && allPayments.length > 0) {
      console.log(
        '[REFUND] Payment statuses:',
        allPayments.map(p => p.status)
      );
    }

    // Try to find completed payment first, then fall back to other statuses
    let payment = allPayments?.find(p => p.status === 'completed');

    if (!payment && allPayments && allPayments.length > 0) {
      // If no completed payment, try to use the most recent payment
      payment = allPayments[0];
      console.warn(
        `[REFUND] No completed payment found, using most recent payment with status: ${payment.status}`
      );
    }

    if (!payment) {
      console.error('[REFUND] No MIB payment found for this booking');
      throw new Error(
        'No MIB payment found for this booking. Cannot process refund. Please ensure the booking was paid via MIB.'
      );
    }

    console.log(
      `[REFUND] Using payment - ID: ${payment.id}, Status: ${payment.status}, Session: ${payment.session_id}, Receipt: ${payment.receipt_number}`
    );

    // Get transaction ID (either from receipt_number or session_id)
    const transactionId = payment.receipt_number || 28 + i;
    if (!transactionId) {
      console.error('[REFUND] No transaction ID found in payment record');
      throw new Error(
        'No transaction ID found in payment record. Receipt number and session ID are both missing.'
      );
    }

    // Prepare the order ID
    const orderId = booking.booking_number || `order-${bookingId}`;

    console.log(
      `[REFUND] Preparing MIB API call - Order: ${orderId}, Transaction: ${transactionId}`
    );

    // Generate a unique refund transaction ID (use timestamp to make it unique)
    const refundTransactionId = `refund-${Date.now()}`;

    // Call MIB Refund API
    const refundRequest = {
      apiOperation: 'REFUND',
      transaction: {
        amount: refundAmount.toFixed(2),
        currency: currency,
      },
    };

    console.log('[REFUND] Calling MIB Refund API...');
    console.log('[REFUND] Request:', JSON.stringify(refundRequest, null, 2));

    const refundResponse = await fetch(
      `${MIB_BASE_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${transactionId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: AUTH_HEADER,
        },
        body: JSON.stringify(refundRequest),
      }
    );

    console.log(`[REFUND] MIB API Response Status: ${refundResponse.status}`);

    if (!refundResponse.ok) {
      const errorText = await refundResponse.text();
      console.error('[REFUND] MIB API Error Response:', errorText);
      throw new Error(
        `MIB Refund API failed: ${refundResponse.status} - ${errorText}`
      );
    }

    const refundData = await refundResponse.json();
    console.log(
      '[REFUND] MIB API Success Response:',
      JSON.stringify(refundData, null, 2)
    );

    // Check if refund was successful
    const refundResult = refundData.result || refundData.response?.gatewayCode;
    const refundSuccessful =
      refundResult === 'SUCCESS' ||
      refundData.transaction?.result === 'SUCCESS' ||
      refundData.result === 'SUCCESS';

    console.log(
      `[REFUND] Refund result: ${refundSuccessful ? 'SUCCESS' : 'FAILED'} (${refundResult})`
    );

    // Update payment status to reflect refund
    const newPaymentStatus = refundSuccessful
      ? 'partially_refunded'
      : 'refund_failed';

    console.log(`[REFUND] Updating payment status to: ${newPaymentStatus}`);
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      console.warn(
        '[REFUND] Failed to update payment status:',
        paymentUpdateError
      );
      // Non-critical - continue processing
    }

    // Update cancellation record with refund status
    console.log('[REFUND] Updating cancellation record...');
    const { error: cancellationUpdateError } = await supabase
      .from('cancellations')
      .update({
        status: refundSuccessful ? 'completed' : 'failed',
        refund_processed_at: new Date().toISOString(),
        refund_transaction_id:
          refundData.transaction?.id || refundTransactionId,
      })
      .eq('booking_id', bookingId)
      .eq('status', 'pending');

    if (cancellationUpdateError) {
      console.warn(
        '[REFUND] Failed to update cancellation record:',
        cancellationUpdateError
      );
      // Non-critical - continue processing
    }

    const responseData = {
      success: refundSuccessful,
      refundStatus: refundSuccessful ? 'completed' : 'failed',
      refundAmount: refundAmount,
      currency: currency,
      transactionId: refundData.transaction?.id || refundTransactionId,
      orderId: orderId,
      message: refundSuccessful
        ? 'Refund processed successfully'
        : 'Refund processing failed',
      gatewayResponse: {
        result: refundResult,
        responseCode: refundData.response?.gatewayCode,
      },
    };

    console.log('[REFUND] Process completed successfully');
    return new Response(JSON.stringify(responseData), {
      status: refundSuccessful ? 200 : 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[REFUND] Error during refund processing:', error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined,
      refundStatus: 'failed',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
