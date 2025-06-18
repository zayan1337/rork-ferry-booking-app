import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { PaymentMethod } from '@/types';

interface BookingOperationsStoreState {
    isLoading: boolean;
    error: string | null;
}

interface BookingOperationsStoreActions {
    confirmBooking: (currentBooking: any, paymentMethod: string) => Promise<any>;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

interface BookingOperationsStore extends BookingOperationsStoreState, BookingOperationsStoreActions { }

export const useBookingOperationsStore = create<BookingOperationsStore>((set, get) => ({
    // State
    isLoading: false,
    error: null,

    // Actions
    confirmBooking: async (currentBooking: any, paymentMethod: string) => {
        const { setError, setLoading } = get();
        setLoading(true);
        setError(null);

        try {
            // Validate required data
            if (!currentBooking.trip?.id) {
                throw new Error('No trip selected');
            }

            if (!currentBooking.selectedSeats.length) {
                throw new Error('No seats selected');
            }

            // For round trips, validate return trip data
            if (currentBooking.tripType === 'round_trip') {
                if (!currentBooking.returnTrip?.id) {
                    throw new Error('No return trip selected');
                }
                if (!currentBooking.returnSelectedSeats.length) {
                    throw new Error('No return seats selected');
                }
                if (currentBooking.selectedSeats.length !== currentBooking.returnSelectedSeats.length) {
                    throw new Error('Number of departure and return seats must match');
                }
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user?.id) {
                throw new Error('User not authenticated');
            }

            // Calculate fare for departure trip
            const departureFare = currentBooking.route?.baseFare
                ? currentBooking.selectedSeats.length * currentBooking.route.baseFare
                : 0;

            // Create the departure booking
            const { data: departureBooking, error: departureBookingError } = await supabase
                .from('bookings')
                .insert({
                    trip_id: currentBooking.trip.id,
                    total_fare: departureFare,
                    is_round_trip: currentBooking.tripType === 'round_trip',
                    status: 'pending_payment',
                    user_id: user.id,
                    check_in_status: false
                })
                .select()
                .single();

            if (departureBookingError) throw departureBookingError;

            // Generate QR code data for departure
            const departureQrCodeData = JSON.stringify({
                bookingNumber: departureBooking.booking_number,
                bookingId: departureBooking.id,
                tripId: currentBooking.trip.id,
                departureDate: currentBooking.trip.travel_date || currentBooking.departureDate,
                departureTime: currentBooking.trip.departure_time,
                passengers: currentBooking.passengers.length,
                seats: currentBooking.selectedSeats.map((seat: any) => seat.number),
                totalFare: departureFare,
                timestamp: new Date().toISOString()
            });

            // Update departure booking with QR code data
            await supabase
                .from('bookings')
                .update({ qr_code_url: departureQrCodeData })
                .eq('id', departureBooking.id);

            // Create payment record for departure
            await supabase
                .from('payments')
                .insert({
                    booking_id: departureBooking.id,
                    payment_method: paymentMethod as PaymentMethod,
                    amount: departureFare,
                    status: 'pending'
                });

            // Create passengers for departure
            const departurePassengerInserts = currentBooking.passengers.map((passenger: any, index: number) => ({
                booking_id: departureBooking.id,
                seat_id: currentBooking.selectedSeats[index].id,
                passenger_name: passenger.fullName,
                passenger_contact_number: passenger.idNumber || '',
                special_assistance_request: passenger.specialAssistance || ''
            }));

            await supabase
                .from('passengers')
                .insert(departurePassengerInserts);

            // Update seat reservations for departure
            await supabase
                .from('seat_reservations')
                .update({
                    is_available: false,
                    booking_id: departureBooking.id,
                    is_reserved: false,
                    reservation_expiry: null
                })
                .eq('trip_id', currentBooking.trip.id)
                .in('seat_id', currentBooking.selectedSeats.map((seat: any) => seat.id));

            let returnBooking = null;

            // Handle return trip for round trip bookings
            if (currentBooking.tripType === 'round_trip' && currentBooking.returnTrip) {
                // Calculate fare for return trip
                const returnFare = currentBooking.returnRoute?.baseFare
                    ? currentBooking.returnSelectedSeats.length * currentBooking.returnRoute.baseFare
                    : 0;

                // Create the return booking
                const { data: returnBookingData, error: returnBookingError } = await supabase
                    .from('bookings')
                    .insert({
                        trip_id: currentBooking.returnTrip.id,
                        total_fare: returnFare,
                        is_round_trip: true,
                        status: 'pending_payment',
                        user_id: user.id,
                        check_in_status: false
                    })
                    .select()
                    .single();

                if (returnBookingError) throw returnBookingError;
                returnBooking = returnBookingData;

                // Generate QR code data for return
                const returnQrCodeData = JSON.stringify({
                    bookingNumber: returnBooking.booking_number,
                    bookingId: returnBooking.id,
                    tripId: currentBooking.returnTrip.id,
                    departureDate: currentBooking.returnTrip.travel_date || currentBooking.returnDate,
                    departureTime: currentBooking.returnTrip.departure_time,
                    passengers: currentBooking.passengers.length,
                    seats: currentBooking.returnSelectedSeats.map((seat: any) => seat.number),
                    totalFare: returnFare,
                    timestamp: new Date().toISOString()
                });

                // Update return booking with QR code data
                await supabase
                    .from('bookings')
                    .update({ qr_code_url: returnQrCodeData })
                    .eq('id', returnBooking.id);

                // Create payment record for return
                await supabase
                    .from('payments')
                    .insert({
                        booking_id: returnBooking.id,
                        payment_method: paymentMethod as PaymentMethod,
                        amount: returnFare,
                        status: 'pending'
                    });

                // Create passengers for return
                const returnPassengerInserts = currentBooking.passengers.map((passenger: any, index: number) => ({
                    booking_id: returnBooking.id,
                    seat_id: currentBooking.returnSelectedSeats[index].id,
                    passenger_name: passenger.fullName,
                    passenger_contact_number: passenger.idNumber || '',
                    special_assistance_request: passenger.specialAssistance || ''
                }));

                await supabase
                    .from('passengers')
                    .insert(returnPassengerInserts);

                // Update seat reservations for return
                await supabase
                    .from('seat_reservations')
                    .update({
                        is_available: false,
                        booking_id: returnBooking.id,
                        is_reserved: false,
                        reservation_expiry: null
                    })
                    .eq('trip_id', currentBooking.returnTrip.id)
                    .in('seat_id', currentBooking.returnSelectedSeats.map((seat: any) => seat.id));
            }

            // Return the departure booking (main booking) with return booking info if applicable
            return {
                ...departureBooking,
                returnBooking: returnBooking
            };

        } catch (error) {
            console.error('Error confirming booking:', error);
            setError('Failed to confirm booking. Please try again.');
            throw error;
        } finally {
            setLoading(false);
        }
    },

    setError: (error: string | null) => set({ error }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
})); 