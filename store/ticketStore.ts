import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { TicketStoreState } from '@/types/booking';
import type { Booking, BookingStatus } from '@/types';
import type { ValidationResult } from '@/types/pages/booking';
import { normalizeTime } from '@/utils/dateUtils';
import {
  formatDateInMaldives,
  getMaldivesTodayString,
} from '@/utils/timezoneUtils';

interface TicketStoreActions {
  validateTicket: (bookingNumber: string) => Promise<ValidationResult>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

interface TicketStore extends TicketStoreState, TicketStoreActions {}

export const useTicketStore = create<TicketStore>((set, get) => ({
  // State
  isLoading: false,
  error: null,

  // Actions
  validateTicket: async (bookingNumber: string) => {
    const { setError, setLoading } = get();

    if (!bookingNumber?.trim()) {
      return {
        isValid: false,
        booking: null,
        message: 'Please enter a booking number',
      };
    }

    // Clean and format booking number
    const cleanBookingNumber = bookingNumber.trim().toUpperCase();

    setLoading(true);
    setError(null);

    try {
      // Get current user for ownership check
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      // STEP 1: Use the public validation function to get complete ticket details
      // This should work for ANY ticket regardless of ownership
      let ticketData: any = null;
      let isOwnBooking = false;

      try {
        const { data: validationData, error: validationError } =
          await supabase.rpc('validate_ticket_details', {
            p_booking_number: cleanBookingNumber,
          });

        if (!validationError && validationData && validationData.length > 0) {
          ticketData = validationData[0];
        } else {
          throw new Error('Validation function failed');
        }
      } catch (rpcError) {
        // FALLBACK: Try direct query with public access
        try {
          const { data: directData, error: directError } = await supabase
            .from('ticket_validation_view')
            .select('*, trip_id')
            .eq('booking_number', cleanBookingNumber)
            .single();

          if (!directError && directData) {
            ticketData = directData;
          } else {
            throw new Error('Direct query also failed');
          }
        } catch (viewError) {
          // LAST RESORT: Try basic booking lookup
          const { data: basicBooking, error: basicError } = await supabase
            .from('bookings')
            .select(
              'id, booking_number, status, check_in_status, user_id, agent_id, agent_client_id, total_fare, trip_id'
            )
            .eq('booking_number', cleanBookingNumber)
            .single();

          if (basicError || !basicBooking) {
            return {
              isValid: false,
              booking: null,
              message:
                'Ticket not found. This may be a fake or fraudulent ticket.',
            };
          }

          // For basic lookup, we have minimal data
          ticketData = {
            booking_id: basicBooking.id,
            booking_number: basicBooking.booking_number,
            status: basicBooking.status,
            check_in_status: basicBooking.check_in_status,
            total_fare: basicBooking.total_fare,
            user_id: basicBooking.user_id,
            agent_id: basicBooking.agent_id,
            agent_client_id: basicBooking.agent_client_id,
            trip_id: basicBooking.trip_id,
            // Default values when trip data is not available
            travel_date: getMaldivesTodayString(),
            departure_time: '00:00',
            from_island_name: 'Unknown',
            from_island_zone: 'A',
            to_island_name: 'Unknown',
            to_island_zone: 'A',
            base_fare: 0,
            vessel_name: 'Unknown Vessel',
          };
        }
      }

      if (!ticketData) {
        return {
          isValid: false,
          booking: null,
          message: 'Could not retrieve ticket information',
        };
      }

      // STEP 2: Check ownership and captain access
      if (currentUser) {
        // Check if current user is a captain - captains can see all booking details
        let isCaptain = false;
        try {
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (!profileError && userProfile?.role === 'captain') {
            isCaptain = true;
            isOwnBooking = true; // Allow captains to see full details
          }
        } catch (profileError) {
          // Continue with normal ownership checks
        }

        // Regular ownership checks
        if (!isCaptain) {
          if (ticketData.agent_id === currentUser.id) {
            isOwnBooking = true;
          } else if (
            !ticketData.agent_id &&
            ticketData.user_id === currentUser.id
          ) {
            isOwnBooking = true;
          } else if (ticketData.agent_client_id) {
            try {
              const { data: clientData, error: clientError } = await supabase
                .from('agent_clients')
                .select('client_id')
                .eq('id', ticketData.agent_client_id)
                .single();

              if (!clientError && clientData?.client_id === currentUser.id) {
                isOwnBooking = true;
              }
            } catch (clientCheckError) {
              // Client check failed, continue with false
            }
          }
        }
      }

      // STEP 3: Get additional sensitive data only for own bookings
      let qrCodeUrl = null;
      if (isOwnBooking) {
        try {
          const { data: ownBookingData, error: ownError } = await supabase
            .from('bookings')
            .select('qr_code_url')
            .eq('id', ticketData.booking_id)
            .single();

          if (!ownError && ownBookingData) {
            qrCodeUrl = ownBookingData.qr_code_url;
          }
        } catch (ownBookingError) {
          // Continue without QR code
        }
      }

      // STEP 4: Get passenger and seat information (only for own bookings)
      let passengers: any[] = [];
      let seats: any[] = [];

      if (isOwnBooking) {
        try {
          const { data: passengerData, error: passengerError } = await supabase
            .from('passengers')
            .select(
              `
                            passenger_name,
                            passenger_contact_number,
                            special_assistance_request,
                            seat:seat_id(
                                seat_number,
                                row_number,
                                is_window,
                                is_aisle
                            )
                        `
            )
            .eq('booking_id', ticketData.booking_id);

          if (!passengerError && passengerData) {
            passengers = passengerData.map((p: any) => ({
              id: '',
              fullName: p.passenger_name || 'Unknown',
              idNumber: p.passenger_contact_number || '',
              specialAssistance: p.special_assistance_request || '',
            }));

            seats = passengerData.map((p: any) => ({
              id: '',
              number: p.seat?.seat_number || 'N/A',
              rowNumber: p.seat?.row_number || 0,
              isWindow: p.seat?.is_window || false,
              isAisle: p.seat?.is_aisle || false,
              isAvailable: false,
              isSelected: false,
            }));
          }
        } catch (passengerError) {
          // Continue with empty arrays
        }
      } else {
        // For other users' tickets, show generic passenger/seat info
        passengers = [
          {
            id: '',
            fullName: 'Passenger',
            idNumber: '',
            specialAssistance: '',
          },
        ];
        seats = [
          {
            id: '',
            number: 'N/A',
            rowNumber: 0,
            isWindow: false,
            isAisle: false,
            isAvailable: false,
            isSelected: false,
          },
        ];
      }

      // STEP 5: Get client information based on booking type
      const bookingType: 'customer' | 'agent' = ticketData.agent_id
        ? 'agent'
        : 'customer';
      let clientName = 'Unknown';
      let clientEmail = '';
      let clientPhone = '';

      if (isOwnBooking) {
        // Get detailed client info for own bookings and captains
        if (bookingType === 'agent' && ticketData.agent_client_id) {
          try {
            const { data: clientData, error: clientError } = await supabase
              .from('agent_clients')
              .select(
                `
                                full_name,
                                email,
                                mobile_number,
                                client:client_id(
                                    full_name,
                                    email,
                                    mobile_number
                                )
                            `
              )
              .eq('id', ticketData.agent_client_id)
              .single();

            if (!clientError && clientData) {
              if (clientData.client) {
                const client = Array.isArray(clientData.client)
                  ? clientData.client[0]
                  : clientData.client;
                clientName = client?.full_name || 'Unknown Client';
                clientEmail = client?.email || '';
                clientPhone = client?.mobile_number || '';
              } else {
                clientName = clientData.full_name || 'Unknown Client';
                clientEmail = clientData.email || '';
                clientPhone = clientData.mobile_number || '';
              }
            }
          } catch (clientFetchError) {
            // Continue with default client name
          }
        } else if (bookingType === 'customer' && ticketData.user_id) {
          try {
            const { data: userProfile, error: userError } = await supabase
              .from('user_profiles')
              .select('full_name, email, mobile_number')
              .eq('id', ticketData.user_id)
              .single();

            if (!userError && userProfile) {
              clientName = userProfile.full_name || 'Unknown Customer';
              clientEmail = userProfile.email || '';
              clientPhone = userProfile.mobile_number || '';
            }
          } catch (userFetchError) {
            // Continue with default values
          }
        }
      } else {
        // For other users' tickets, show generic info
        clientName = bookingType === 'agent' ? 'Agent Client' : 'Customer';
      }

      // STEP 5.5: Get booking segment information (pickup/dropoff points)
      let boardingIslandName = ticketData.from_island_name || 'Unknown';
      let destinationIslandName = ticketData.to_island_name || 'Unknown';
      let boardingIslandZone = ticketData.from_island_zone || 'A';
      let destinationIslandZone = ticketData.to_island_zone || 'A';

      try {
        const { data: segmentData, error: segmentError } = await supabase
          .from('booking_segments')
          .select(
            `
            boarding_stop:route_stops!booking_segments_boarding_stop_id_fkey(
              islands(name, zone)
            ),
            destination_stop:route_stops!booking_segments_destination_stop_id_fkey(
              islands(name, zone)
            )
          `
          )
          .eq('booking_id', ticketData.booking_id)
          .single();

        if (!segmentError && segmentData) {
          // Get boarding stop island name
          const boardingStop: any = (segmentData as any).boarding_stop;
          if (boardingStop?.islands) {
            const island = Array.isArray(boardingStop.islands)
              ? boardingStop.islands[0]
              : boardingStop.islands;
            boardingIslandName = island?.name || boardingIslandName;
            boardingIslandZone = island?.zone || boardingIslandZone;
          }

          // Get destination stop island name
          const destinationStop: any = (segmentData as any).destination_stop;
          if (destinationStop?.islands) {
            const island = Array.isArray(destinationStop.islands)
              ? destinationStop.islands[0]
              : destinationStop.islands;
            destinationIslandName = island?.name || destinationIslandName;
            destinationIslandZone = island?.zone || destinationIslandZone;
          }
        }
      } catch (segmentFetchError) {
        // Continue with route from/to islands if segment fetch fails
        console.error('Error fetching booking segment:', segmentFetchError);
      }

      // STEP 5.6: ALWAYS fetch trip data directly to ensure we get the correct departure_time
      // This is critical because views/RPCs might return time in unexpected formats
      if (ticketData.trip_id) {
        try {
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select(
              `
              departure_time,
              travel_date,
              vessel_id,
              vessels!inner(
                name
              )
            `
            )
            .eq('id', ticketData.trip_id)
            .single();

          if (!tripError && tripData) {
            // ALWAYS update departure_time and travel_date from trip data
            // This ensures we get the raw database value, not a transformed one
            if (
              tripData.departure_time !== null &&
              tripData.departure_time !== undefined
            ) {
              ticketData.departure_time = tripData.departure_time;
            }

            if (tripData.travel_date) {
              ticketData.travel_date = tripData.travel_date;
            }

            // Update vessel name if missing
            const vessel = Array.isArray(tripData.vessels)
              ? tripData.vessels[0]
              : tripData.vessels;
            if (vessel?.name) {
              ticketData.vessel_name = vessel.name;
            }
          }
        } catch (tripFetchError) {
          // Continue with existing data if fetch fails
          console.error('Exception fetching trip data:', tripFetchError);
        }
      }

      // STEP 6: Create the booking object
      // Normalize departure_time to ensure consistent format
      const normalizedDepartureTime = normalizeTime(
        ticketData.departure_time || '00:00:00'
      );

      const booking: Booking = {
        id: ticketData.booking_id,
        bookingNumber: ticketData.booking_number,
        status: ticketData.status as BookingStatus,
        departureDate: ticketData.travel_date,
        departureTime: normalizedDepartureTime,
        tripType: 'one_way', // Default for validation
        route: {
          id: '',
          fromIsland: {
            id: '',
            name: boardingIslandName,
            zone: boardingIslandZone,
          },
          toIsland: {
            id: '',
            name: destinationIslandName,
            zone: destinationIslandZone,
          },
          baseFare: ticketData.base_fare || 0,
          duration: '2h',
        },
        passengers,
        seats,
        totalFare: ticketData.total_fare || 0,
        qrCodeUrl,
        checkInStatus: ticketData.check_in_status || false,
        vessel: {
          id: '',
          name: ticketData.vessel_name || 'Unknown Vessel',
        },
        createdAt: new Date().toISOString(),
        updatedAt: '',
        bookingType,
        clientName,
        clientEmail,
        clientPhone,
        agentId: ticketData.agent_id || null,
        isAgentBooking: bookingType === 'agent',
        tripId: ticketData.trip_id || null,
      };

      // STEP 7: Validate the booking for fraud detection
      const currentDate = new Date();
      const departureDate = new Date(ticketData.travel_date);

      // Check if we have a valid departure date
      const isValidDepartureDate =
        !isNaN(departureDate.getTime()) &&
        ticketData.travel_date &&
        ticketData.travel_date !== '';

      // Set both dates to start of day for accurate comparison
      const today = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      );
      const ticketDate = new Date(
        departureDate.getFullYear(),
        departureDate.getMonth(),
        departureDate.getDate()
      );

      const isValidStatus = ticketData.status === 'confirmed';
      const isCheckedIn = ticketData.check_in_status;

      let message = '';
      let isValid = false;

      if (!isValidStatus) {
        if (ticketData.status === 'cancelled') {
          message = `Ticket is CANCELLED`;
        } else {
          message = `Ticket is ${ticketData.status.toUpperCase()}`;
        }
        isValid = false;
      } else if (!isValidDepartureDate) {
        message = `Unable to verify travel date - ticket validation incomplete`;
        isValid = false;
      } else if (ticketDate < today) {
        message = `Ticket has expired (travel date was ${formatDateInMaldives(departureDate, 'short-date')})`;
        isValid = false;
      } else if (ticketDate.getTime() === today.getTime()) {
        if (isCheckedIn) {
          message = `Ticket already used for travel today`;
          isValid = false;
        } else {
          message = `Valid ticket for travel today (${formatDateInMaldives(departureDate, 'short-date')})`;
          isValid = true;
        }
      } else if (ticketDate > today) {
        if (isCheckedIn) {
          message = `Ticket already used for travel (future date: ${formatDateInMaldives(departureDate, 'short-date')})`;
          isValid = false;
        } else {
          message = `Valid ticket for travel on ${formatDateInMaldives(departureDate, 'short-date')}`;
          isValid = true;
        }
      } else {
        message = `Ticket status unclear`;
        isValid = false;
      }

      return {
        isValid,
        booking,
        message,
        isOwnBooking,
      };
    } catch (error) {
      setError('Failed to validate ticket');
      return {
        isValid: false,
        booking: null,
        message: 'Error validating ticket. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  },

  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));
