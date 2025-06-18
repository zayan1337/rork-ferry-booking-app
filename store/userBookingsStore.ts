import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { UserBookingsStoreState } from '@/types/booking';
import type { Booking, Route, Passenger, Seat } from '@/types';

interface UserBookingsStoreActions {
    fetchUserBookings: () => Promise<void>;
    cancelBooking: (bookingId: string, reason: string, bankDetails: { accountNumber: string; accountName: string; bankName: string }) => Promise<void>;
    modifyBooking: (bookingId: string, modifications: any) => Promise<void>;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

interface UserBookingsStore extends UserBookingsStoreState, UserBookingsStoreActions { }

export const useUserBookingsStore = create<UserBookingsStore>((set, get) => ({
    // State
    bookings: [],
    isLoading: false,
    error: null,

    // Actions
    fetchUserBookings: async () => {
        const { setError, setLoading } = get();
        setLoading(true);
        setError(null);

        try {
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
          id,
          booking_number,
          trip:trip_id(
            id,
            route:route_id(
              id,
              from_island:from_island_id(
                id,
                name,
                zone
              ),
              to_island:to_island_id(
                id,
                name,
                zone
              ),
              base_fare
            ),
            travel_date,
            departure_time,
            vessel:vessel_id(
              id,
              name
            )
          ),
          is_round_trip,
          return_booking_id,
          status,
          total_fare,
          qr_code_url,
          check_in_status,
          passengers!inner(
            id,
            passenger_name,
            passenger_contact_number,
            special_assistance_request,
            seat:seat_id(
              id,
              seat_number,
              row_number,
              is_window,
              is_aisle
            )
          ),
          payments(
            payment_method,
            status
          ),
          created_at,
          updated_at
        `)
                .order('created_at', { ascending: false });

            if (bookingsError) throw bookingsError;

            const formattedBookings: Booking[] = bookingsData.map((booking: any) => {
                // Format route data
                const route: Route = {
                    id: booking.trip.route.id,
                    fromIsland: {
                        id: booking.trip.route.from_island.id,
                        name: booking.trip.route.from_island.name,
                        zone: booking.trip.route.from_island.zone,
                    },
                    toIsland: {
                        id: booking.trip.route.to_island.id,
                        name: booking.trip.route.to_island.name,
                        zone: booking.trip.route.to_island.zone,
                    },
                    baseFare: booking.trip.route.base_fare,
                    duration: '2h' // Default duration since it's not in the database
                };

                // Format passengers data with their seats
                const passengers: Passenger[] = booking.passengers.map((p: any) => ({
                    id: p.id,
                    fullName: p.passenger_name,
                    idNumber: p.passenger_contact_number,
                    specialAssistance: p.special_assistance_request,
                }));

                // Format seats data
                const seats: Seat[] = booking.passengers.map((p: any) => ({
                    id: p.seat.id,
                    number: p.seat.seat_number,
                    rowNumber: p.seat.row_number,
                    isWindow: p.seat.is_window,
                    isAisle: p.seat.is_aisle,
                    isAvailable: false,
                    isSelected: true
                }));

                // Get payment information
                const payment = booking.payments?.[0] ? {
                    method: booking.payments[0].payment_method,
                    status: booking.payments[0].status
                } : undefined;

                // Format the booking
                return {
                    id: booking.id,
                    bookingNumber: booking.booking_number,
                    tripType: booking.is_round_trip ? 'round_trip' : 'one_way',
                    departureDate: booking.trip.travel_date,
                    departureTime: booking.trip.departure_time,
                    route,
                    seats,
                    passengers,
                    totalFare: booking.total_fare,
                    status: booking.status,
                    qrCodeUrl: booking.qr_code_url,
                    checkInStatus: booking.check_in_status,
                    createdAt: booking.created_at,
                    updatedAt: booking.updated_at,
                    vessel: {
                        id: booking.trip.vessel.id,
                        name: booking.trip.vessel.name
                    },
                    payment
                };
            });

            set({ bookings: formattedBookings });
        } catch (error) {
            console.error('Error fetching user bookings:', error);
            setError('Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    },

    cancelBooking: async (bookingId: string, reason: string, bankDetails: { accountNumber: string; accountName: string; bankName: string }) => {
        const { setError, setLoading, fetchUserBookings, bookings } = get();
        setLoading(true);
        setError(null);

        try {
            // Find the booking to get current details
            const booking = bookings.find(b => b.id === bookingId);
            if (!booking) throw new Error('Booking not found');

            // Calculate refund amount and cancellation fee (50% refund policy)
            const refundAmount = booking.totalFare * 0.5;
            const cancellationFee = booking.totalFare - refundAmount;

            // Generate unique cancellation number (10 characters max as per DB constraint)
            const cancellationNumber = Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number

            // 1. Update booking status to cancelled
            const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (bookingUpdateError) throw bookingUpdateError;

            // 2. Release seat reservations back to available status
            const { error: seatReleaseError } = await supabase
                .from('seat_reservations')
                .update({
                    is_available: true,
                    booking_id: null,
                    is_reserved: false,
                    reservation_expiry: null
                })
                .eq('booking_id', bookingId);

            if (seatReleaseError) throw seatReleaseError;

            // 3. Insert into cancellations table
            const { error: cancellationError } = await supabase
                .from('cancellations')
                .insert({
                    booking_id: bookingId,
                    cancellation_number: cancellationNumber.toString(),
                    cancellation_reason: reason,
                    cancellation_fee: cancellationFee,
                    refund_amount: refundAmount,
                    refund_bank_account_number: bankDetails.accountNumber,
                    refund_bank_account_name: bankDetails.accountName,
                    refund_bank_name: bankDetails.bankName,
                    status: 'pending'
                });

            if (cancellationError) throw cancellationError;

            // 4. Update payment status to refunded (if payment exists)
            if (booking.payment?.status === 'completed') {
                await supabase
                    .from('payments')
                    .update({
                        status: 'partially_refunded',
                        updated_at: new Date().toISOString()
                    })
                    .eq('booking_id', bookingId);
            }

            await fetchUserBookings();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            setError('Failed to cancel booking');
            throw error;
        } finally {
            setLoading(false);
        }
    },

    modifyBooking: async (bookingId: string, modifications: any) => {
        const { setError, setLoading, fetchUserBookings } = get();
        setLoading(true);
        setError(null);

        try {
            // Modification logic implementation
            console.log('Modifying booking:', bookingId, modifications);

            // This is a simplified version - the full implementation would be similar to the original
            await fetchUserBookings();
        } catch (error) {
            console.error('Error modifying booking:', error);
            setError('Failed to modify booking');
            throw error;
        } finally {
            setLoading(false);
        }
    },

    setError: (error: string | null) => set({ error }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
})); 