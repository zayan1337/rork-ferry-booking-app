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
    // Get basic booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_number, status, trip_id')
      .eq('id', bookingId)
      .maybeSingle();
    if (bookingError) {
      throw new Error(`Database error: ${bookingError.message}`);
    }
    if (!booking) {
      throw new Error(
        `Booking with ID ${bookingId} not found. Please ensure the booking was created successfully.`
      );
    }
    // Try to get route description, but don't fail if it doesn't work
    let routeDescription = 'Ferry booking';
    try {
      // Get trip details
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, route_id')
        .eq('id', booking.trip_id)
        .maybeSingle();
      if (!tripError && trip) {
        // Get route details using the routes_simple_view
        const { data: route, error: routeError } = await supabase
          .from('routes_simple_view')
          .select('id, from_island_name, to_island_name, route_display_name')
          .eq('id', trip.route_id)
          .maybeSingle();
        if (!routeError && route) {
          routeDescription = `Ferry booking from ${route.from_island_name} to ${route.to_island_name}`;
        }
      }
    } catch (routeError) {
      // Route lookup failed - use default description
    }
    // Generate unique order ID
    const orderId =
      booking.booking_number || `order-${bookingId}-${Date.now()}`;
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
        description: routeDescription,
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
    // Update booking with MIB session ID and success indicator
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_method_type: 'mib',
        status: 'pending_payment',
      })
      .eq('id', bookingId);
    if (updateError) {
      // Booking update error - non-critical
    }
    // Create or update payment record with session ID
    const { error: paymentError } = await supabase.from('payments').upsert(
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
    if (paymentError) {
      // Payment record error - non-critical
    }
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
