import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { TicketStoreState } from '@/types/booking';
import type { Booking, Route, BookingStatus } from '@/types';

interface TicketStoreActions {
    validateTicket: (bookingNumber: string) => Promise<{ isValid: boolean; booking: Booking | null; message: string }>;
    setError: (error: string | null) => void;
    setLoading: (isLoading: boolean) => void;
}

interface TicketStore extends TicketStoreState, TicketStoreActions { }

export const useTicketStore = create<TicketStore>((set, get) => ({
    // State
    isLoading: false,
    error: null,

    // Actions
    validateTicket: async (bookingNumber: string) => {
        const { setError, setLoading } = get();
        setLoading(true);
        setError(null);

        try {
            // Query the database for the booking
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          id,
          booking_number,
          status,
          total_fare,
          qr_code_url,
          check_in_status,
          trip:trip_id(
            travel_date,
            departure_time,
            route:route_id(
              from_island:from_island_id(
                name,
                zone
              ),
              to_island:to_island_id(
                name,
                zone
              ),
              base_fare
            ),
            vessel:vessel_id(
              name
            )
          ),
          passengers(
            passenger_name,
            passenger_contact_number,
            special_assistance_request,
            seat:seat_id(
              seat_number,
              row_number,
              is_window,
              is_aisle
            )
          )
        `)
                .eq('booking_number', bookingNumber)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return {
                        isValid: false,
                        booking: null,
                        message: "Booking not found"
                    };
                }
                throw error;
            }

            // Handle the data safely
            const dbBooking = data as any;

            if (!dbBooking || !dbBooking.trip || !dbBooking.trip.route) {
                return {
                    isValid: false,
                    booking: null,
                    message: "Invalid booking data"
                };
            }

            // Transform database result to our Booking interface
            const booking: Booking = {
                id: dbBooking.id,
                bookingNumber: dbBooking.booking_number,
                status: dbBooking.status as BookingStatus,
                departureDate: dbBooking.trip.travel_date,
                departureTime: dbBooking.trip.departure_time,
                tripType: 'one_way', // Default, could be enhanced
                route: {
                    id: '',
                    fromIsland: {
                        id: '',
                        name: dbBooking.trip.route.from_island.name,
                        zone: dbBooking.trip.route.from_island.zone
                    },
                    toIsland: {
                        id: '',
                        name: dbBooking.trip.route.to_island.name,
                        zone: dbBooking.trip.route.to_island.zone
                    },
                    baseFare: dbBooking.trip.route.base_fare,
                    duration: '2h'
                },
                passengers: (dbBooking.passengers || []).map((p: any) => ({
                    id: '',
                    fullName: p.passenger_name,
                    idNumber: p.passenger_contact_number,
                    specialAssistance: p.special_assistance_request
                })),
                seats: (dbBooking.passengers || []).map((p: any) => ({
                    id: '',
                    number: p.seat.seat_number,
                    rowNumber: p.seat.row_number,
                    isWindow: p.seat.is_window,
                    isAisle: p.seat.is_aisle,
                    isAvailable: false,
                    isSelected: false
                })),
                totalFare: dbBooking.total_fare,
                qrCodeUrl: dbBooking.qr_code_url,
                checkInStatus: dbBooking.check_in_status,
                vessel: {
                    id: '',
                    name: dbBooking.trip.vessel.name
                },
                createdAt: '',
                updatedAt: ''
            };

            // Validate the booking
            const currentDate = new Date();
            const departureDate = new Date(dbBooking.trip.travel_date);
            const isValidDate = departureDate >= new Date(currentDate.setHours(0, 0, 0, 0));
            const isValidStatus = dbBooking.status === 'confirmed';

            let message = '';
            let isValid = false;

            if (!isValidStatus) {
                message = `Ticket is ${dbBooking.status}`;
                isValid = false;
            } else if (!isValidDate) {
                message = "Ticket has expired";
                isValid = false;
            } else {
                // Check if it's for today or future
                const today = new Date().toDateString();
                const tripDate = departureDate.toDateString();

                if (tripDate === today) {
                    message = "Ticket is valid for travel today";
                    isValid = true;
                } else if (departureDate > new Date()) {
                    message = `Ticket is valid for travel on ${departureDate.toLocaleDateString()}`;
                    isValid = true;
                } else {
                    message = "Ticket has expired";
                    isValid = false;
                }
            }

            return {
                isValid,
                booking,
                message
            };

        } catch (error) {
            console.error('Error validating booking:', error);
            setError('Failed to validate ticket');
            return {
                isValid: false,
                booking: null,
                message: "Error validating ticket. Please try again."
            };
        } finally {
            setLoading(false);
        }
    },

    setError: (error: string | null) => set({ error }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
})); 