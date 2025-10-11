import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, orderId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get payment record with booking details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(
        `
        *,
        bookings!inner(
          id,
          booking_number,
          status
        )
      `
      )
      .eq('booking_id', bookingId)
      .eq('payment_method', 'mib')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error('Payment query error:', paymentError);
      throw new Error(`Payment query failed: ${paymentError.message}`);
    }

    if (!payment) {
      console.warn('Payment record not found for booking:', bookingId);

      // Check if booking exists and get its status
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status, booking_number')
        .eq('id', bookingId)
        .maybeSingle();

      if (!booking) {
        throw new Error('Booking not found');
      }

      // If booking is already cancelled, return cancelled status
      if (booking.status === 'cancelled') {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'cancelled',
            paymentStatus: 'cancelled',
            bookingStatus: 'cancelled',
            bookingId: bookingId,
            message: 'Payment was cancelled',
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // If no payment record exists but booking is pending, return pending
      return new Response(
        JSON.stringify({
          success: true,
          status: 'pending',
          paymentStatus: 'pending',
          bookingStatus: booking.status,
          bookingId: bookingId,
          message: 'Payment record not found, booking is still pending payment',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get MIB credentials
    const merchantId =
      Deno.env.get('MIB_PROD_MERCHANT_ID') ||
      Deno.env.get('MIB_USER_ID') ||
      'CRYSTALTRF';
    const apiPassword =
      Deno.env.get('MIB_PROD_PASSWORD') || '214f7fa58106dd724c9104bdb77590d3';
    const baseUrl =
      Deno.env.get('MIB_PROD_API_URL') || 'https://mib.gateway.mastercard.com';
    const apiVersion = Deno.env.get('MIB_PROD_API_VERSION') || '100';

    // Use provided orderId or booking number
    const orderIdToUse = orderId || payment.bookings.booking_number;
    const orderEndpoint = `${baseUrl}/api/rest/version/${apiVersion}/merchant/${merchantId}/order/${orderIdToUse}`;

    // Query MIB API for order status
    const authString = btoa(`merchant.${merchantId}:${apiPassword}`);
    const response = await fetch(orderEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MIB API error response:', errorText);

      // Handle case where order doesn't exist in MIB (common for cancelled payments)
      if (response.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          if (
            errorData?.error?.cause === 'INVALID_REQUEST' &&
            errorData?.error?.explanation?.includes('Unable to find order')
          ) {
            // Order doesn't exist - payment was likely cancelled before completion
            // Check booking status to return appropriate status
            const { data: booking } = await supabase
              .from('bookings')
              .select('status')
              .eq('id', bookingId)
              .single();

            const bookingStatus = booking?.status || 'cancelled';
            const isCancelled = bookingStatus === 'cancelled';

            return new Response(
              JSON.stringify({
                success: true,
                status: isCancelled ? 'cancelled' : 'pending',
                paymentStatus: isCancelled ? 'cancelled' : 'pending',
                bookingStatus: bookingStatus,
                bookingId: bookingId,
                message: isCancelled
                  ? 'Payment was cancelled before completion'
                  : 'Order not found in payment gateway - payment may have been cancelled',
                timestamp: new Date().toISOString(),
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            );
          }
        } catch (parseError) {
          // If we can't parse the error, fall through to generic error
        }
      }

      throw new Error(`MIB API error: ${response.status} - ${errorText}`);
    }

    const orderData = await response.json();

    // Map MIB status to our status
    let status = 'pending';
    const result = orderData.result;

    if (result === 'SUCCESS') {
      status = 'completed';
    } else if (result === 'FAILURE' || result === 'ERROR') {
      status = 'failed';
    }

    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: status,
        transaction_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      console.error('Failed to update payment status:', paymentUpdateError);
    }

    // Update booking status based on payment result
    if (status === 'completed') {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.warn('Failed to update booking status:', bookingUpdateError);
      }
    } else if (status === 'failed') {
      // Get the booking's user_id to clean up temp reservations
      const { data: booking } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('id', bookingId)
        .single();

      // Update booking to cancelled
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.warn('Failed to cancel booking:', bookingUpdateError);
      }

      // Release permanent seat reservations (with booking_id)
      const { error: seatReleaseError } = await supabase
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

      if (seatReleaseError) {
        console.warn('Failed to release permanent seats:', seatReleaseError);
      }

      // ALSO release any temporary reservations for this user
      if (booking?.user_id) {
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
          .eq('user_id', booking.user_id)
          .is('booking_id', null);

        if (tempSeatError) {
          console.warn('Failed to release temporary seats:', tempSeatError);
        }
      }
    }

    // Determine booking status based on payment status
    let bookingStatus = 'pending_payment';
    if (status === 'completed') {
      bookingStatus = 'confirmed';
    } else if (status === 'failed') {
      bookingStatus = 'cancelled';
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: status,
        bookingStatus: bookingStatus,
        orderId: orderIdToUse,
        bookingId: bookingId,
        mibResponse: orderData,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment status check error:', error);
    const errorMessage = error?.message ?? 'Unknown error occurred';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
