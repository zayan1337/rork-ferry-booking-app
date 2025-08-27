import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// MIB Configuration
const MIB_BASE_URL =
  Deno.env.get('MIB_TEST_API_URL') ||
  'https://test-mib.mtf.gateway.mastercard.com/api/rest/version/100';
const MERCHANT_ID = Deno.env.get('MIB_TEST_MERCHANT_ID') || 'TESTCRYSTALTRL';
const AUTH_HEADER =
  Deno.env.get('MIB_TEST_AUTH_HEADER') ||
  'Basic bWVyY2hhbnQuVEVTVENSWVNUQUxUUkw6ZjAzYTlkZjY3OGU1OGU0MmNiYWM4YjJlNTg4MjgyNzc=';
const merchantName = Deno.env.get('MIB_TEST_MERCHANT_NAME') || 'Ferry Booking';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role key for database operations to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
        Deno.env.get('SUPABASE_ANON_KEY') ??
        ''
    );

    console.log('🔧 Supabase client initialized:', {
      hasUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      usingServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    });

    const requestBody = await req.json();
    console.log('MIB Payment Edge Function called with:', requestBody);

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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      case 'test-database':
        return await testDatabase(supabase);

      case 'test-mib-api':
        return await testMibApi();
      //  case 'create-session':
      //     return await createSession();

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

      case 'verify-payment':
        return await verifyPaymentWithMib(supabase, requestBody);

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Create a basic session (Step 1: Establish a Session)
async function createSession() {
  try {
    const sessionRequest = {
      session: {
        authenticationLimit: 25,
      },
    };

    const sessionResponse = await fetch(
      `${MIB_BASE_URL}/merchant/${MERCHANT_ID}/session`,
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
      console.error('MPGS Session API Error:', errorText);
      throw new Error(
        `Failed to create session: ${sessionResponse.status} ${sessionResponse.statusText}`
      );
    }

    const sessionData = await sessionResponse.json();
    console.log('Session created successfully:', sessionData.session.id);

    return new Response(JSON.stringify(sessionData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
async function createMibSession(
  supabase: any,
  bookingId: string,
  amount: number,
  currency: string,
  returnUrl: string,
  cancelUrl: string
) {
  try {
    console.log('🚀 MIB Session Creation Started:', {
      bookingId,
      amount,
      currency,
      returnUrl,
      cancelUrl,
      timestamp: new Date().toISOString(),
    });

    // Get basic booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_number, status, trip_id')
      .eq('id', bookingId)
      .maybeSingle();

    console.log('📋 Booking lookup result:', {
      booking,
      bookingError,
      bookingId,
    });

    if (bookingError) {
      console.error('❌ Database error fetching booking:', bookingError);
      throw new Error(`Database error: ${bookingError.message}`);
    }

    if (!booking) {
      console.error('❌ Booking not found:', { bookingId });
      throw new Error(
        `Booking with ID ${bookingId} not found. Please ensure the booking was created successfully.`
      );
    }

    console.log('✅ Booking found successfully:', {
      bookingNumber: booking.booking_number,
      status: booking.status,
      tripId: booking.trip_id,
    });

    // Try to get route description, but don't fail if it doesn't work
    let routeDescription = 'Ferry booking';
    try {
      console.log('🔍 Fetching route description for trip:', booking.trip_id);

      // Get trip details
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, route_id')
        .eq('id', booking.trip_id)
        .maybeSingle();

      console.log('🚢 Trip lookup result:', {
        trip,
        tripError,
        tripId: booking.trip_id,
      });

      if (!tripError && trip) {
        // Get route details using the routes_simple_view
        const { data: route, error: routeError } = await supabase
          .from('routes_simple_view')
          .select('id, from_island_name, to_island_name, route_display_name')
          .eq('id', trip.route_id)
          .maybeSingle();

        console.log('🗺️ Route lookup result:', {
          route,
          routeError,
          routeId: trip.route_id,
        });

        if (!routeError && route) {
          routeDescription = `Ferry booking from ${route.from_island_name} to ${route.to_island_name}`;
          console.log('✅ Route description created:', routeDescription);
        } else {
          console.log(
            '⚠️ Could not fetch route details, using default description'
          );
        }
      } else {
        console.log(
          '⚠️ Could not fetch trip details, using default description'
        );
      }
    } catch (routeError) {
      console.log('⚠️ Route lookup failed (non-critical):', routeError);
    }

    // Generate unique order ID
    const orderId =
      booking.booking_number || `order-${bookingId}-${Date.now()}`;

    console.log('🆔 Order ID generated:', orderId);

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
        amount: amount.toFixed(2), // Ensure proper decimal format
        currency: currency,
        id: orderId,
        description: routeDescription,
      },
    };

    console.log('📤 MIB Session Request:', {
      sessionRequest,
      apiUrl: `${MIB_BASE_URL}/merchant/${MERCHANT_ID}/session`,
      merchantId: MERCHANT_ID,
      timestamp: new Date().toISOString(),
    });

    const sessionResponse = await fetch(
      `${MIB_BASE_URL}/merchant/${MERCHANT_ID}/session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: AUTH_HEADER,
        },
        body: JSON.stringify(sessionRequest),
      }
    );

    console.log('📥 MIB API Response Status:', {
      status: sessionResponse.status,
      statusText: sessionResponse.statusText,
      ok: sessionResponse.ok,
      headers: Object.fromEntries(sessionResponse.headers.entries()),
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ MIB API Error Response:', {
        status: sessionResponse.status,
        statusText: sessionResponse.statusText,
        errorText: errorText,
        requestBody: JSON.stringify(sessionRequest, null, 2),
        timestamp: new Date().toISOString(),
      });
      throw new Error(
        `Failed to create MIB session: ${sessionResponse.status} - ${errorText}`
      );
    }

    const sessionData = await sessionResponse.json();

    console.log('📊 MIB Session Response Data:', {
      sessionData,
      hasSessionId: !!sessionData.session?.id,
      hasSuccessIndicator: !!sessionData.successIndicator,
      timestamp: new Date().toISOString(),
    });

    const sessionId = sessionData.session?.id;
    const successIndicator = sessionData.successIndicator;

    console.log('🔑 Session details extracted:', {
      sessionId,
      successIndicator,
      hasSessionId: !!sessionId,
      hasSuccessIndicator: !!successIndicator,
    });

    if (!sessionId) {
      console.error('❌ No session ID returned from MIB API');
      throw new Error('No session ID returned from MIB API');
    }

    console.log('💾 Updating booking with MIB session details...');

    // Update booking with MIB session ID and success indicator
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_method_type: 'mib',
        status: 'pending_payment',
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('⚠️ Booking update error (non-critical):', updateError);
    } else {
      console.log('✅ Booking updated successfully');
    }

    console.log('💳 Creating/updating payment record...');

    // Create or update payment record with success indicator
    const { error: paymentError } = await supabase.from('payments').upsert(
      {
        booking_id: bookingId,
        payment_method: 'mib',
        amount: amount,
        currency: currency,
        status: 'pending',
        receipt_number: sessionId,
        // Store success indicator for later verification
        transaction_reference: successIndicator || null,
      },
      {
        onConflict: 'booking_id,payment_method',
      }
    );

    if (paymentError) {
      console.error('⚠️ Payment record error (non-critical):', paymentError);
    } else {
      console.log('✅ Payment record created/updated successfully');
    }

    // The SDK will handle the redirect, but we still need the base URL for return handling
    const baseUrl = 'https://test-mib.mtf.gateway.mastercard.com';

    const responseData = {
      success: true,
      sessionId: sessionId,
      successIndicator: successIndicator,
      sessionUrl: sessionData.session?.url || null,
      // Keep redirectUrl for fallback scenarios
      redirectUrl:
        sessionData.redirectUrl ||
        `${baseUrl}/checkout/pay/${sessionId}?checkoutVersion=1.0.0`,
      orderId: orderId,
      // Include session data for SDK configuration
      session: {
        id: sessionId,
        url: sessionData.session?.url,
      },
    };

    console.log('📤 Final MIB Session Response:', {
      responseData,
      bookingId,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ MIB Session Creation Completed Successfully');

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MIB Session Creation Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bookingId,
      amount,
      currency,
    });

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function updatePaymentStatus(supabase: any, bookingId: string) {
  try {
    console.log('🔄 Payment Status Update Started:', {
      bookingId,
      timestamp: new Date().toISOString(),
    });

    // Get the latest payment for this booking
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('💳 Payment record lookup:', {
      payment,
      paymentError,
      bookingId,
    });

    if (paymentError || !payment) {
      console.error('❌ Payment record not found:', paymentError);
      throw new Error('Payment record not found');
    }

    console.log('🔍 Querying MIB for payment status...', {
      sessionId: payment.receipt_number,
      apiUrl: `${MIB_BASE_URL}/merchant/${MERCHANT_ID}/session/${payment.receipt_number}`,
    });

    // Query MIB for payment status using session ID
    const statusResponse = await fetch(
      `${MIB_BASE_URL}/merchant/${MERCHANT_ID}/session/${payment.receipt_number}`,
      {
        method: 'GET',
        headers: {
          Authorization: AUTH_HEADER,
        },
      }
    );

    console.log('📥 MIB Status Response:', {
      status: statusResponse.status,
      statusText: statusResponse.statusText,
      ok: statusResponse.ok,
    });

    if (!statusResponse.ok) {
      console.error('❌ Failed to get payment status from MIB:', {
        status: statusResponse.status,
        statusText: statusResponse.statusText,
      });
      throw new Error(`Failed to get payment status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    const paymentStatus = statusData.result || 'pending';

    console.log('📊 MIB Payment Status Data:', {
      statusData,
      paymentStatus,
      sessionId: payment.receipt_number,
    });

    console.log('💾 Updating payment record...', {
      newStatus:
        paymentStatus === 'SUCCESS'
          ? 'completed'
          : paymentStatus === 'FAILURE'
            ? 'failed'
            : 'pending',
      paymentId: payment.id,
    });

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
      console.error('❌ Failed to update payment:', paymentUpdateError);
    } else {
      console.log('✅ Payment record updated successfully');
    }

    // Update booking status (avoid trigger function calls)
    if (paymentStatus === 'SUCCESS') {
      console.log('✅ Payment SUCCESS - updating booking to confirmed');

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.error(
          '❌ Failed to update booking to confirmed:',
          bookingUpdateError
        );
      } else {
        console.log('✅ Booking status updated to confirmed');
      }
    } else if (paymentStatus === 'FAILURE') {
      console.log('💥 Payment FAILURE - updating booking to cancelled');

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.error(
          '❌ Failed to update booking to cancelled:',
          bookingUpdateError
        );
      } else {
        console.log('✅ Booking status updated to cancelled');
      }
    } else {
      console.log('⏳ Payment still pending - no booking status change');
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

    console.log('📤 Payment Status Update Response:', {
      finalResponse,
      bookingId,
      originalMibStatus: paymentStatus,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Payment Status Update Completed Successfully');

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Payment status update error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      bookingId,
      timestamp: new Date().toISOString(),
    });

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentStatus: 'pending',
      bookingStatus: 'pending_payment',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function processPaymentResult(supabase: any, resultData: any) {
  try {
    console.log('🔄 Processing Payment Result Started:', {
      resultData,
      timestamp: new Date().toISOString(),
    });

    const { sessionId, result, transactionId, bookingId } = resultData;

    // Find payment by session ID or booking ID
    let payment = null;
    let paymentError = null;

    console.log('🔍 Looking for payment record...', {
      bookingId,
      sessionId,
      hasBookingId: !!bookingId,
      hasSessionId: !!sessionId,
    });

    if (bookingId) {
      // Try to find payment by booking ID first (most reliable method)
      const { data: bookingPayment, error: bookingPaymentError } =
        await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('payment_method', 'mib')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to avoid errors when no record found

      console.log('💳 Payment lookup by booking ID:', {
        bookingPayment,
        bookingPaymentError,
        bookingId,
      });

      if (bookingPayment) {
        payment = bookingPayment;
        console.log('✅ Payment found by booking ID');
      } else if (bookingPaymentError) {
        console.log(
          '⚠️ Error looking up payment by booking ID:',
          bookingPaymentError
        );
        paymentError = bookingPaymentError;
      } else {
        console.log('❌ No payment found by booking ID');
      }
    }

    // If not found by booking ID, try by session ID
    if (!payment && sessionId) {
      const { data: sessionPayment, error: sessionPaymentError } =
        await supabase
          .from('payments')
          .select('*')
          .eq('receipt_number', sessionId)
          .eq('payment_method', 'mib')
          .maybeSingle();

      console.log('💳 Payment lookup by session ID:', {
        sessionPayment,
        sessionPaymentError,
        sessionId,
      });

      if (sessionPayment) {
        payment = sessionPayment;
        console.log('✅ Payment found by session ID');
      } else if (sessionPaymentError) {
        console.log(
          '⚠️ Error looking up payment by session ID:',
          sessionPaymentError
        );
        paymentError = sessionPaymentError;
      } else {
        console.log(
          '❌ No payment found by session ID, will proceed with booking ID only'
        );
      }
    }

    if (!payment) {
      console.error('❌ Payment record not found:', {
        paymentError,
        bookingId,
        sessionId,
      });

      // If we have a booking ID but no payment record, we can still update the booking
      if (
        bookingId &&
        (result === 'SUCCESS' || result === 'FAILURE' || result === 'CANCELLED')
      ) {
        console.log(
          `🔄 No payment record found, but we have booking ID and ${result} result - updating booking directly`
        );

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
          .update({ status: bookingStatus })
          .eq('id', bookingId);

        if (bookingUpdateError) {
          console.error(
            '❌ Failed to update booking directly:',
            bookingUpdateError
          );
        } else {
          console.log(`✅ Booking updated directly to ${bookingStatus}`);
        }

        const finalResponse = {
          success: true,
          paymentStatus: paymentStatus,
          bookingStatus: bookingStatus,
          bookingId: bookingId,
          sessionId: sessionId,
          note: 'Updated booking directly (no payment record found)',
        };

        console.log('📤 Direct Booking Update Response:', {
          finalResponse,
          originalResult: result,
          timestamp: new Date().toISOString(),
        });

        return new Response(JSON.stringify(finalResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(
        'Payment record not found and cannot update booking directly'
      );
    }

    console.log('✅ Payment record found:', {
      paymentId: payment.id,
      bookingId: payment.booking_id,
      currentStatus: payment.status,
      paymentMethod: payment.payment_method,
      amount: payment.amount,
      receiptNumber: payment.receipt_number,
    });

    // Test if we can read the booking record
    console.log('🔍 Testing booking record access...');
    const { data: testBooking, error: testBookingError } = await supabase
      .from('bookings')
      .select('id, status, booking_number, user_id')
      .eq('id', payment.booking_id)
      .single();

    console.log('📋 Booking record test:', {
      testBooking,
      testBookingError,
      bookingId: payment.booking_id,
    });

    // Update payment record based on gateway response
    const paymentStatus =
      result === 'SUCCESS'
        ? 'completed'
        : result === 'FAILURE'
          ? 'failed'
          : result === 'CANCELLED'
            ? 'cancelled'
            : 'pending';

    console.log('💾 Updating payment record...', {
      paymentId: payment.id,
      newStatus: paymentStatus,
      result,
    });

    const { data: paymentUpdateData, error: paymentUpdateError } =
      await supabase
        .from('payments')
        .update({
          status: paymentStatus,
          transaction_date: new Date().toISOString(),
          receipt_number: transactionId || sessionId,
        })
        .eq('id', payment.id)
        .select('*');

    if (paymentUpdateError) {
      console.error('❌ Failed to update payment:', {
        error: paymentUpdateError,
        paymentId: payment.id,
        newStatus: paymentStatus,
        transactionId: transactionId,
        sessionId: sessionId,
      });
    } else {
      console.log('✅ Payment record updated successfully:', {
        paymentUpdateData,
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus: paymentStatus,
      });
    }

    // Update booking status based on gateway response
    let bookingStatus = 'pending_payment';

    if (result === 'SUCCESS') {
      bookingStatus = 'confirmed';
      console.log('✅ Payment SUCCESS - updating booking to confirmed');

      const { data: bookingUpdateData, error: bookingUpdateError } =
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', payment.booking_id)
          .select('id, status, booking_number');

      if (bookingUpdateError) {
        console.error('❌ Failed to update booking to confirmed:', {
          error: bookingUpdateError,
          bookingId: payment.booking_id,
          paymentId: payment.id,
        });
      } else {
        console.log('✅ Booking status updated to confirmed:', {
          bookingUpdateData,
          bookingId: payment.booking_id,
          oldBookingStatus: 'pending_payment',
          newBookingStatus: 'confirmed',
        });
      }
    } else if (result === 'FAILURE' || result === 'CANCELLED') {
      bookingStatus = 'cancelled';
      console.log(`💥 Payment ${result} - updating booking to cancelled`);

      const { data: bookingUpdateData, error: bookingUpdateError } =
        await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', payment.booking_id)
          .select('id, status, booking_number');

      if (bookingUpdateError) {
        console.error('❌ Failed to update booking to cancelled:', {
          error: bookingUpdateError,
          bookingId: payment.booking_id,
          paymentId: payment.id,
          result: result,
        });
      } else {
        console.log('✅ Booking status updated to cancelled:', {
          bookingUpdateData,
          bookingId: payment.booking_id,
          oldBookingStatus: 'pending_payment',
          newBookingStatus: 'cancelled',
          result: result,
        });
      }
    } else {
      console.log('⏳ Payment still pending - no booking status change');
    }

    // Verify the updates by reading back the records
    console.log('🔍 Verifying database updates...');

    const { data: verifyPayment, error: verifyPaymentError } = await supabase
      .from('payments')
      .select('id, status, transaction_date')
      .eq('id', payment.id)
      .single();

    const { data: verifyBooking, error: verifyBookingError } = await supabase
      .from('bookings')
      .select('id, status, booking_number')
      .eq('id', payment.booking_id)
      .single();

    console.log('📊 Database Verification Results:', {
      verifyPayment,
      verifyPaymentError,
      verifyBooking,
      verifyBookingError,
      expectedPaymentStatus: paymentStatus,
      expectedBookingStatus: bookingStatus,
    });

    const finalResponse = {
      success: true,
      paymentStatus,
      bookingStatus,
      bookingId: payment.booking_id,
      sessionId: sessionId,
      // Include verification data for debugging
      verification: {
        actualPaymentStatus: verifyPayment?.status,
        actualBookingStatus: verifyBooking?.status,
        paymentVerified: verifyPayment?.status === paymentStatus,
        bookingVerified: verifyBooking?.status === bookingStatus,
      },
    };

    console.log('📤 Payment Result Processing Response:', {
      finalResponse,
      originalResult: result,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Payment Result Processing Completed Successfully');

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Payment result processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      resultData,
      timestamp: new Date().toISOString(),
    });

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      paymentStatus: 'pending',
      bookingStatus: 'pending_payment',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function testDatabase(supabase: any) {
  try {
    // Test basic query
    const { data: testData, error: testError } = await supabase
      .from('bookings')
      .select('id, booking_number')
      .limit(1);

    if (testError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database connectivity failed',
          details: testError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test routes_simple_view
    const { data: routesData, error: routesError } = await supabase
      .from('routes_simple_view')
      .select('id, from_island_name, to_island_name')
      .limit(1);

    if (routesError) {
      console.warn('Routes view test failed:', routesError);
    } else {
      console.log(
        'Routes view test successful, found routes:',
        routesData?.length || 0
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database connectivity test passed',
        bookingsCount: testData?.length || 0,
        routesCount: routesData?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function testMibApi() {
  try {
    // Test a simple GET request to the MIB API
    const testResponse = await fetch(
      `${MIB_BASE_URL}/merchant/${MERCHANT_ID}`,
      {
        method: 'GET',
        headers: {
          Authorization: AUTH_HEADER,
        },
      }
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();

      return new Response(
        JSON.stringify({
          success: false,
          error: 'MIB API connectivity failed',
          status: testResponse.status,
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const testData = await testResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MIB API connectivity test passed',
        response: testData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'MIB API test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function verifyPaymentWithMib(supabase: any, requestBody: any) {
  try {
    const { sessionId, resultIndicator, bookingId } = requestBody;

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    // Query MIB API to get the actual transaction status
    const statusResponse = await fetch(
      `${MIB_BASE_URL}/merchant/${MERCHANT_ID}/session/${sessionId}`,
      {
        method: 'GET',
        headers: {
          Authorization: AUTH_HEADER,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to verify payment status: ${statusResponse.status}`
      );
    }

    const statusData = await statusResponse.json();

    // Check if the result indicator matches what we stored
    const storedSuccessIndicator = payment.transaction_reference;
    const isValidPayment =
      statusData.successIndicator === storedSuccessIndicator;

    // Determine payment status based on MIB response
    let paymentStatus = 'pending';
    let bookingStatus = 'pending_payment';

    if (statusData.result === 'SUCCESS' && isValidPayment) {
      paymentStatus = 'completed';
      bookingStatus = 'confirmed';
    } else if (statusData.result === 'FAILURE') {
      paymentStatus = 'failed';
      bookingStatus = 'cancelled';
    } else if (statusData.result === 'CANCELLED') {
      paymentStatus = 'cancelled';
      bookingStatus = 'cancelled';
    }

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        transaction_date: new Date().toISOString(),
        // Store additional transaction details
        transaction_reference:
          statusData.successIndicator || storedSuccessIndicator,
      })
      .eq('id', payment.id);

    // Update booking status
    await supabase
      .from('bookings')
      .update({ status: bookingStatus })
      .eq('id', bookingId);

    return new Response(
      JSON.stringify({
        success: true,
        paymentStatus,
        bookingStatus,
        isValidPayment,
        mibResult: statusData.result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
}
