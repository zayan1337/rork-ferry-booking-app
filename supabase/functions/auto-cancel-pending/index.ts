// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const PAYMENT_TIMEOUT_MINUTES = 10;
const BLOCKED_TRIP_STATUSES = ['cancelled', 'completed', 'departed', 'arrived'];

const createSupabaseClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      ''
  );

/**
 * Calculate expiry time for a booking based on smart logic:
 * - If booking created > 10 min before departure → expire 10 min after creation
 * - If booking created within 10 min of departure → expire at departure
 */
const calculateExpiryTime = (
  bookingCreatedAt: Date,
  tripDeparture: Date
): Date => {
  const bufferMs = PAYMENT_TIMEOUT_MINUTES * 60 * 1000;
  const timeUntilDeparture =
    tripDeparture.getTime() - bookingCreatedAt.getTime();

  if (timeUntilDeparture > bufferMs) {
    // Booking created > 10 min before departure → expire 10 min after creation
    return new Date(bookingCreatedAt.getTime() + bufferMs);
  } else {
    // Booking created within 10 min of departure → expire at departure
    return tripDeparture;
  }
};

/**
 * Combine travel date and departure time into a single Date object
 */
const combineTripDateTime = (
  travelDate: string,
  departureTime: string
): Date => {
  const date = new Date(travelDate);
  const timeParts = departureTime.split(':');
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);

  return combined;
};

const releaseSeatReservations = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  bookingId: string
) => {
  // Release regular seat reservations
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
  if (seatError) throw seatError;

  // Also release segment reservations for multi-stop trips
  const { error: segmentError } = await supabase
    .from('seat_segment_reservations')
    .delete()
    .eq('booking_id', bookingId);
  if (segmentError) {
    console.warn(
      `Failed to release segment reservations for booking ${bookingId}:`,
      segmentError
    );
    // Don't throw - segment reservations are optional
  }
};

const cancelBookingRecord = async (
  supabase: ReturnType<typeof createSupabaseClient>,
  bookingId: string
) => {
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  if (bookingError) throw bookingError;

  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId);
  if (paymentError) throw paymentError;

  await releaseSeatReservations(supabase, bookingId);

  const cancellationNumber =
    Math.floor(Math.random() * 9000000000) + 1000000000;

  const { error: cancellationError } = await supabase
    .from('cancellations')
    .insert({
      booking_id: bookingId,
      cancellation_number: cancellationNumber.toString(),
      cancellation_reason: 'Payment session expired',
      cancellation_fee: 0,
      refund_amount: 0,
      status: 'completed',
    });
  if (cancellationError) {
    console.warn(
      'Failed to create cancellation record for booking',
      bookingId,
      cancellationError
    );
  }
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    // Handle GET requests for cron jobs (no body needed)
    let bookingId: string | undefined;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      bookingId = (body as { bookingId?: string }).bookingId;
    }

    const now = new Date();
    let targetBookings: Array<{ id: string; reason: string }> = [];

    // Fetch pending bookings with trip details
    let bookingsQuery = supabase
      .from('bookings')
      .select('id, created_at, status, trip_id')
      .eq('status', 'pending_payment');

    if (bookingId) {
      bookingsQuery = bookingsQuery.eq('id', bookingId);
    }

    const { data: bookings, error: fetchError } = await bookingsQuery;
    if (fetchError) throw fetchError;

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          cancelled: [],
          message: 'No pending bookings found.',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Fetch trip details for all unique trip_ids
    const tripIds = [...new Set(bookings.map(b => b.trip_id))];
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, travel_date, departure_time, status')
      .in('id', tripIds);

    if (tripsError) throw tripsError;

    // Create a map of trip_id -> trip for quick lookup
    const tripMap = new Map(trips?.map(t => [t.id, t]) || []);

    // Check each booking for expiry or trip status issues
    for (const booking of bookings) {
      const trip = tripMap.get(booking.trip_id);
      if (!trip) {
        console.warn(`Trip not found for booking ${booking.id}`);
        continue;
      }

      // Check if trip status is blocked
      if (BLOCKED_TRIP_STATUSES.includes(trip.status)) {
        targetBookings.push({
          id: booking.id,
          reason: `Trip status is ${trip.status}`,
        });
        continue;
      }

      // Calculate expiry time using smart logic
      const bookingCreatedAt = new Date(booking.created_at);
      const tripDeparture = combineTripDateTime(
        trip.travel_date,
        trip.departure_time
      );
      const expiryTime = calculateExpiryTime(bookingCreatedAt, tripDeparture);

      // Check if booking has expired
      if (now >= expiryTime) {
        targetBookings.push({
          id: booking.id,
          reason: `Payment window expired (${expiryTime.toISOString()})`,
        });
      }
    }

    // Cancel all target bookings
    const cancelled: string[] = [];
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const target of targetBookings) {
      try {
        await cancelBookingRecord(supabase, target.id);
        cancelled.push(target.id);
        console.log(`Cancelled booking ${target.id}: ${target.reason}`);
      } catch (error) {
        console.error(`Failed to cancel booking ${target.id}:`, error);
        errors.push({
          bookingId: target.id,
          error: error?.message || 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelled,
        errors: errors.length > 0 ? errors : undefined,
        message:
          cancelled.length === 0
            ? 'No pending bookings exceeded the payment window.'
            : `Cancelled ${cancelled.length} pending booking(s).`,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('auto-cancel-pending error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unexpected error',
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
