import { create } from 'zustand';
import { Booking } from '@/types/agent';
import { supabase } from '@/utils/supabase';
import { getActiveBookings, getInactiveBookings } from '@/utils/bookingUtils';
import { parseBookingQrCode } from '@/utils/qrCodeUtils';

/**
 * Validate required parameters
 * @param value - Value to validate
 * @param paramName - Parameter name for error messages
 * @throws {Error} If value is not provided
 */
const validateRequired = (value: any, paramName: string) => {
  if (!value) {
    throw new Error(`${paramName} is required`);
  }
};

/**
 * Standardized error handling for booking operations
 * @param error - The error object or message
 * @param defaultMessage - Default error message to use
 * @param set - Zustand set function for updating store state
 * @returns The error message string
 */
const handleError = (error: unknown, defaultMessage: string, set: any) => {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  console.error(defaultMessage, error);
  set({
    error: errorMessage,
    isLoading: false,
  });
  return errorMessage;
};

/**
 * Agent bookings store state and actions
 */
interface AgentBookingsState {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchBookings: (agentId: string) => Promise<void>;
  getBookingsByClient: (clientId: string, clients: any[]) => Booking[];
  createBooking: (agentId: string, bookingData: any) => Promise<string>;
  cancelBooking: (bookingId: string) => Promise<void>;
  updateBookingStatus: (
    bookingId: string,
    status: Booking['status']
  ) => Promise<void>;
  modifyBooking: (
    agentId: string,
    bookingId: string,
    modificationData: any
  ) => Promise<{ bookingId: string; returnBookingId: string | null }>;
  agentCancelBooking: (
    agentId: string,
    bookingId: string,
    cancellationData: {
      reason: string;
      refundPercentage?: number;
      refundMethod?: 'agent_credit' | 'original_payment' | 'bank_transfer';
      bankDetails?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
      };
      agentNotes?: string;
      overrideFee?: boolean;
    }
  ) => Promise<string>;
  updateBookingStatusWithHistory: (
    agentId: string,
    bookingId: string,
    status: string,
    notes?: string
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // QR Code utilities
  parseBookingQrCode: (qrCodeUrl: string) => any | null;
  getQrCodeDisplayData: (booking: Booking) => any | null;

  // Booking history and tracking
  getBookingModifications: (bookingId: string) => Promise<any[]>;
  getBookingCancellation: (bookingId: string) => Promise<any | null>;
  getBookingFullHistory: (bookingId: string) => Promise<any>;

  // Local booking utility methods
  getLocalActiveBookings: () => Booking[];
  getLocalInactiveBookings: () => Booking[];

  // Booking refresh utilities
  refreshBookingsData: (
    agentId: string,
    clientsFetcher?: () => Promise<any[]>,
    statsFetcher?: () => Promise<any>
  ) => Promise<void>;
  handleBookingCreated: (
    agentId: string,
    bookingId: string,
    returnBookingId?: string | null,
    clientsFetcher?: () => Promise<any[]>,
    statsFetcher?: () => Promise<any>
  ) => Promise<void>;

  // Internal helper methods
  getAgentBookings: (agentId: string) => Promise<Booking[]>;
}

export const useAgentBookingsStore = create<AgentBookingsState>((set, get) => ({
  bookings: [],
  isLoading: false,
  error: null,

  /**
   * Get agent bookings from database with comprehensive details
   * @param agentId - Agent ID to fetch bookings for
   * @returns Array of bookings with full details
   */
  getAgentBookings: async (agentId: string) => {
    try {
      validateRequired(agentId, 'Agent ID');

      // Get ALL bookings for this agent with comprehensive trip, route, vessel, and passenger details
      const { data: allAgentBookings, error: allBookingsError } = await supabase
        .from('bookings')
        .select(
          `
                    id,
                    booking_number,
                    user_id,
                    agent_client_id,
                    total_fare,
                    status,
                    created_at,
                    updated_at,
                    payment_method_type,
                    is_round_trip,
                    return_booking_id,
                    qr_code_url,
                    check_in_status,
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
                    passengers(
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
                    agent_clients(
                        id,
                        full_name,
                        email,
                        mobile_number,
                        client_id
                    ),
                    user_profiles(
                        id,
                        full_name,
                        email,
                        mobile_number
                    )
                `
        )
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (allBookingsError) {
        console.error('Error fetching all agent bookings:', allBookingsError);
        throw allBookingsError;
      }

      const allBookings = (allAgentBookings || []).map((booking: any) => {
        // Extract route and trip information
        const route = booking.trip?.route
          ? {
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
            }
          : null;

        // Extract vessel information
        const vessel = booking.trip?.vessel
          ? {
              id: booking.trip.vessel.id,
              name: booking.trip.vessel.name,
            }
          : null;

        // Extract passengers and seats
        const passengers =
          booking.passengers?.map((passenger: any) => ({
            id: passenger.id,
            fullName: passenger.passenger_name,
            contactNumber: passenger.passenger_contact_number,
            specialAssistance: passenger.special_assistance_request,
            seat: passenger.seat
              ? {
                  id: passenger.seat.id,
                  number: passenger.seat.seat_number,
                  rowNumber: passenger.seat.row_number,
                  isWindow: passenger.seat.is_window,
                  isAisle: passenger.seat.is_aisle,
                }
              : null,
          })) || [];

        // Get payment information
        const payment = booking.payments?.[0]
          ? {
              method: booking.payments[0].payment_method,
              status: booking.payments[0].status,
            }
          : null;

        // Determine client information based on booking type
        let clientInfo = {
          clientId: '',
          clientName: 'Unknown Client',
          clientEmail: '',
          clientPhone: '',
          hasAccount: false,
          userId: undefined as string | undefined,
          agentClientId: undefined as string | undefined,
        };

        if (booking.user_id && !booking.agent_client_id) {
          // Booking for client WITH account (user_profiles only)
          clientInfo = {
            clientId: booking.user_id,
            clientName: booking.user_profiles?.full_name || 'Unknown Client',
            clientEmail: booking.user_profiles?.email || '',
            clientPhone: booking.user_profiles?.mobile_number || '',
            hasAccount: true,
            userId: booking.user_id,
            agentClientId: undefined,
          };
        } else if (booking.agent_client_id) {
          // Booking for client WITHOUT account or WITH account via agent_clients
          const hasAccount = !!booking.agent_clients?.client_id;
          clientInfo = {
            clientId: booking.agent_client_id,
            clientName:
              booking.agent_clients?.full_name ||
              booking.agent_clients?.email ||
              'Unknown Client',
            clientEmail: booking.agent_clients?.email || '',
            clientPhone: booking.agent_clients?.mobile_number || '',
            hasAccount,
            userId: hasAccount ? booking.agent_clients?.client_id : undefined,
            agentClientId: booking.agent_client_id,
          };
        }

        // Calculate commission based on fare difference
        const discountedFare = Number(booking.total_fare || 0);
        const originalFare =
          route && passengers.length > 0
            ? passengers.length * (route.baseFare || 0)
            : discountedFare;
        const commission =
          originalFare > discountedFare ? originalFare - discountedFare : 0;

        // Build the comprehensive booking object
        return {
          id: booking.id,
          bookingNumber: booking.booking_number,
          clientId: clientInfo.clientId,
          clientName: clientInfo.clientName,
          clientEmail: clientInfo.clientEmail,
          clientPhone: clientInfo.clientPhone,
          origin: route?.fromIsland?.name || 'Unknown Origin',
          destination: route?.toIsland?.name || 'Unknown Destination',
          departureDate: booking.trip?.travel_date || booking.created_at,
          departureTime: booking.trip?.departure_time || '',
          returnDate: undefined, // Handle return trips separately if needed
          passengerCount: passengers.length,
          passengers,
          vessel,
          route,
          seats: passengers
            .map((passenger: any) => passenger.seat)
            .filter(Boolean),
          totalAmount: originalFare,
          discountedAmount: discountedFare,
          status: booking.status as Booking['status'],
          bookingDate: booking.created_at,
          updatedAt: booking.updated_at,
          paymentMethod: (booking.payment_method_type ||
            'gateway') as Booking['paymentMethod'],
          payment,
          commission,
          userId: clientInfo.userId,
          agentClientId: clientInfo.agentClientId,
          clientHasAccount: clientInfo.hasAccount,
          isRoundTrip: booking.is_round_trip || false,
          returnBookingId: booking.return_booking_id,
          qrCodeUrl: booking.qr_code_url,
          checkInStatus: booking.check_in_status,
          tripType: booking.is_round_trip
            ? ('round_trip' as const)
            : ('one_way' as const),
        };
      });

      return allBookings;
    } catch (error) {
      console.error('Error fetching agent bookings:', error);
      throw error;
    }
  },

  // Main store actions
  fetchBookings: async (agentId: string) => {
    try {
      if (!agentId) return;

      set({ isLoading: true, error: null });

      const bookings = await get().getAgentBookings(agentId);
      set({ bookings, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to fetch bookings',
        isLoading: false,
      });
    }
  },

  getBookingsByClient: (clientId: string, clients: any[]) => {
    const { bookings } = get();

    // Find the client to determine if they have an account
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      return [];
    }

    // Filter bookings based on client type
    const filtered = bookings.filter(booking => {
      if (client.hasAccount) {
        // For clients with accounts, match by userId
        const match1 = booking.userId === clientId;
        const match2 = booking.clientId === clientId;
        return match1 || match2;
      } else {
        // For clients without accounts, match by agentClientId
        // The booking's agentClientId should match the client's agentClientId (agent_clients.id)
        const match1 = booking.agentClientId === client.agentClientId;
        // Also check if booking's clientId matches (this should be the same as agentClientId for clients without accounts)
        const match2 = booking.clientId === client.agentClientId;
        // Final fallback: direct ID match
        const match3 = booking.agentClientId === clientId;
        return match1 || match2 || match3;
      }
    });

    return filtered;
  },

  createBooking: async (agentId: string, bookingData: any) => {
    try {
      if (!agentId) throw new Error('Agent ID required');

      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          agent_id: agentId,
          user_id: bookingData.clientId,
          trip_id: bookingData.tripId,
          total_fare: bookingData.totalAmount,
          payment_method_type: bookingData.paymentMethod,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Refresh bookings after creating new one
      await get().fetchBookings(agentId);

      set({ isLoading: false });
      return data.id;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to create booking',
        isLoading: false,
      });
      throw error;
    }
  },

  cancelBooking: async (bookingId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to cancel booking',
        isLoading: false,
      });
      throw error;
    }
  },

  updateBookingStatus: async (bookingId: string, status: Booking['status']) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update booking status',
        isLoading: false,
      });
      throw error;
    }
  },

  modifyBooking: async (
    agentId: string,
    bookingId: string,
    modificationData: any
  ) => {
    try {
      if (!agentId) throw new Error('Agent ID required');

      set({ isLoading: true, error: null });

      // Get agent data for credit balance
      const { data: agent, error: agentError } = await supabase
        .from('user_profiles')
        .select('id, credit_balance')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Get current booking data
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select(
          `
                    *,
                    trip:trip_id(*),
                    passengers(*),
                    seat_reservations(*),
                    payments(*)
                `
        )
        .eq('id', bookingId)
        .single();

      if (fetchError || !currentBooking) {
        throw new Error('Booking not found');
      }

      // Create new booking for modification (keeping old booking for history)
      const newBookingData = {
        user_id: currentBooking.user_id,
        trip_id: modificationData.newTripId || currentBooking.trip_id,
        is_round_trip: currentBooking.is_round_trip,
        status: 'confirmed',
        total_fare:
          currentBooking.total_fare + (modificationData.fareDifference || 0),
        agent_id: agentId,
        payment_method_type: currentBooking.payment_method_type,
        agent_client_id: currentBooking.agent_client_id,
      };

      // Insert new booking
      const { data: newBooking, error: newBookingError } = await supabase
        .from('bookings')
        .insert(newBookingData)
        .select('*')
        .single();

      if (newBookingError || !newBooking) {
        throw new Error('Failed to create modified booking');
      }

      // Wait a moment to ensure booking_number is generated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch the booking again to ensure we have the booking_number
      const { data: refreshedBooking, error: refreshError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', newBooking.id)
        .single();

      if (refreshError || !refreshedBooking?.booking_number) {
        console.error(
          'Failed to fetch booking with booking_number:',
          refreshError
        );
        throw new Error('Booking created but booking number not generated');
      }

      // Generate QR code URL using the booking number
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${refreshedBooking.booking_number}`)}`;

      // Update the new booking with QR code URL
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', newBooking.id);

      if (qrUpdateError) {
        console.error(
          'Failed to update QR code URL for modified booking:',
          qrUpdateError
        );
        throw new Error('Failed to generate QR code for modified booking');
      }

      // Verify QR code was saved
      const { data: verifyBooking, error: verifyError } = await supabase
        .from('bookings')
        .select('qr_code_url')
        .eq('id', newBooking.id)
        .single();

      if (verifyError || !verifyBooking?.qr_code_url) {
        console.error('QR code verification failed:', verifyError);
        throw new Error('QR code was not saved properly');
      }

      // Handle credit transaction for fare difference if using agent credit
      if (
        modificationData.fareDifference &&
        modificationData.fareDifference !== 0 &&
        modificationData.paymentMethod === 'agent_credit'
      ) {
        const transactionAmount = modificationData.fareDifference;
        const transactionType = transactionAmount > 0 ? 'deduction' : 'refill';
        const newBalance = agent.credit_balance - transactionAmount; // Debit reduces balance, credit increases it

        // Create credit transaction record
        const creditTransaction = {
          agent_id: agent.id,
          amount: Math.abs(transactionAmount),
          transaction_type: transactionType,
          booking_id: newBooking.id,
          description: `Booking modification ${transactionType}: ${modificationData.modificationReason || 'Booking modification'}`,
          balance_after: newBalance,
        };

        const { error: transactionError } = await supabase
          .from('agent_credit_transactions')
          .insert(creditTransaction);

        if (transactionError) {
          console.warn(
            'Failed to create credit transaction:',
            transactionError
          );
        }

        // Update agent credit balance
        const { error: balanceUpdateError } = await supabase
          .from('user_profiles')
          .update({
            credit_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id);

        if (balanceUpdateError) {
          console.warn(
            'Failed to update agent credit balance:',
            balanceUpdateError
          );
        }
      }

      // Create new payment record for modified booking if fare difference exists
      if (
        modificationData.fareDifference &&
        modificationData.fareDifference !== 0
      ) {
        const paymentAmount = Math.abs(modificationData.fareDifference);
        // Map to valid payment_method enum values
        const paymentMethod =
          modificationData.paymentMethod === 'agent_credit'
            ? 'wallet'
            : modificationData.paymentMethod === 'bank_transfer'
              ? 'bank_transfer'
              : 'wallet';

        const paymentStatus =
          modificationData.fareDifference > 0 ? 'completed' : 'refunded';

        const paymentData = {
          booking_id: newBooking.id,
          payment_method: paymentMethod,
          amount: paymentAmount,
          currency: 'MVR',
          status: paymentStatus,
          transaction_date: new Date().toISOString(),
        };

        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentData);

        if (paymentError) {
          console.warn(
            'Failed to create payment record for modified booking:',
            paymentError
          );
        }
      }

      // Update original payment status if needed
      if (currentBooking.payments && currentBooking.payments.length > 0) {
        const { error: originalPaymentUpdateError } = await supabase
          .from('payments')
          .update({
            status: 'modified',
            updated_at: new Date().toISOString(),
          })
          .eq('booking_id', bookingId);

        if (originalPaymentUpdateError) {
          console.warn(
            'Failed to update original payment status:',
            originalPaymentUpdateError
          );
        }
      }

      // Update old booking status to 'modified'
      await supabase
        .from('bookings')
        .update({
          status: 'modified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Insert modification record into modifications table
      const modificationRecord = {
        old_booking_id: bookingId,
        new_booking_id: newBooking.id,
        modification_reason:
          modificationData.modificationReason || 'Booking modification',
        fare_difference: modificationData.fareDifference || 0,
        requires_additional_payment: (modificationData.fareDifference || 0) > 0,
        refund_details:
          modificationData.fareDifference < 0
            ? {
                refund_amount: Math.abs(modificationData.fareDifference),
                refund_method: modificationData.paymentMethod,
                bank_details:
                  modificationData.paymentMethod === 'bank_transfer'
                    ? modificationData.bankAccountDetails
                    : null,
              }
            : null,
        payment_details:
          modificationData.fareDifference > 0
            ? {
                payment_amount: modificationData.fareDifference,
                payment_method: modificationData.paymentMethod,
                bank_details:
                  modificationData.paymentMethod === 'bank_transfer'
                    ? modificationData.bankAccountDetails
                    : null,
              }
            : null,
      };

      const { error: modificationError } = await supabase
        .from('modifications')
        .insert(modificationRecord);

      if (modificationError) {
        console.error(
          'Failed to create modification record:',
          modificationError
        );
        // Don't throw error - booking was created successfully
      } else {
        console.log('Modification record created successfully');
      }

      // Handle additional modification logic (passengers, seats, etc.)
      // Copy passengers from original booking to new booking
      if (currentBooking.passengers && currentBooking.passengers.length > 0) {
        const passengerInserts = currentBooking.passengers.map(
          (passenger: any) => ({
            booking_id: newBooking.id,
            seat_id: passenger.seat_id, // This might need to be updated based on new seat selection
            passenger_name: passenger.passenger_name,
            passenger_contact_number: passenger.passenger_contact_number,
            special_assistance_request: passenger.special_assistance_request,
          })
        );

        const { error: passengersError } = await supabase
          .from('passengers')
          .insert(passengerInserts);

        if (passengersError) {
          console.error(
            'Failed to copy passengers to modified booking:',
            passengersError
          );
          // Don't throw error - booking was created successfully
        }
      }

      // Handle seat reservations if new seats were selected
      if (
        modificationData.selectedSeats &&
        modificationData.selectedSeats.length > 0
      ) {
        // Release old seat reservations
        await supabase
          .from('seat_reservations')
          .update({
            is_available: true,
            booking_id: null,
            is_reserved: false,
          })
          .eq('booking_id', bookingId);

        // Create new seat reservations
        const seatReservations = modificationData.selectedSeats.map(
          (seat: any) => ({
            trip_id: modificationData.newTripId || currentBooking.trip_id,
            seat_id: seat.id,
            booking_id: newBooking.id,
            is_available: false,
            is_reserved: false,
          })
        );

        const { error: seatError } = await supabase
          .from('seat_reservations')
          .upsert(seatReservations, { onConflict: 'trip_id,seat_id' });

        if (seatError) {
          console.error(
            'Failed to create seat reservations for modified booking:',
            seatError
          );
          // Don't throw error - booking was created successfully
        }
      }

      // Handle return trip modification for round-trip bookings
      let returnBookingId = null;
      if (currentBooking.is_round_trip && modificationData.newReturnTripId) {
        const returnBookingData = {
          user_id: currentBooking.user_id,
          trip_id: modificationData.newReturnTripId,
          is_round_trip: true,
          status: 'confirmed',
          total_fare: currentBooking.total_fare, // Assume same fare for return trip
          agent_id: agentId,
          payment_method_type: currentBooking.payment_method_type,
          agent_client_id: currentBooking.agent_client_id,
        };

        // Create return booking
        const { data: returnBooking, error: returnBookingError } =
          await supabase
            .from('bookings')
            .insert(returnBookingData)
            .select('*')
            .single();

        if (returnBookingError) {
          console.error(
            'Failed to create modified return booking:',
            returnBookingError
          );
        } else {
          returnBookingId = returnBooking.id;

          // Wait a moment to ensure booking_number is generated
          await new Promise(resolve => setTimeout(resolve, 100));

          // Fetch the return booking again to ensure we have the booking_number
          const { data: refreshedReturnBooking, error: returnRefreshError } =
            await supabase
              .from('bookings')
              .select('*')
              .eq('id', returnBooking.id)
              .single();

          if (returnRefreshError || !refreshedReturnBooking?.booking_number) {
            console.error(
              'Failed to fetch return booking with booking_number:',
              returnRefreshError
            );
          } else {
            // Generate QR code URL for return booking
            const returnQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${refreshedReturnBooking.booking_number}`)}`;

            // Update return booking with QR code URL
            const { error: returnQrUpdateError } = await supabase
              .from('bookings')
              .update({ qr_code_url: returnQrCodeUrl })
              .eq('id', returnBooking.id);

            if (returnQrUpdateError) {
              console.error(
                'Failed to update return QR code URL for modified booking:',
                returnQrUpdateError
              );
            } else {
              // Verify return QR code was saved
              const { data: verifyReturnBooking, error: verifyReturnError } =
                await supabase
                  .from('bookings')
                  .select('qr_code_url')
                  .eq('id', returnBooking.id)
                  .single();

              if (verifyReturnError || !verifyReturnBooking?.qr_code_url) {
                console.error(
                  'Return QR code verification failed:',
                  verifyReturnError
                );
              } else {
                console.log(
                  'Return QR code successfully saved for modified booking:',
                  returnBooking.id
                );
              }
            }
          }

          // Copy passengers to return booking
          if (
            currentBooking.passengers &&
            currentBooking.passengers.length > 0
          ) {
            const returnPassengerInserts = currentBooking.passengers.map(
              (passenger: any) => ({
                booking_id: returnBooking.id,
                seat_id:
                  modificationData.returnSelectedSeats?.[
                    currentBooking.passengers.indexOf(passenger)
                  ]?.id || passenger.seat_id,
                passenger_name: passenger.passenger_name,
                passenger_contact_number: passenger.passenger_contact_number,
                special_assistance_request:
                  passenger.special_assistance_request,
              })
            );

            const { error: returnPassengersError } = await supabase
              .from('passengers')
              .insert(returnPassengerInserts);

            if (returnPassengersError) {
              console.error(
                'Failed to copy passengers to modified return booking:',
                returnPassengersError
              );
            }
          }

          // Handle return seat reservations
          if (
            modificationData.returnSelectedSeats &&
            modificationData.returnSelectedSeats.length > 0
          ) {
            const returnSeatReservations =
              modificationData.returnSelectedSeats.map((seat: any) => ({
                trip_id: modificationData.newReturnTripId,
                seat_id: seat.id,
                booking_id: returnBooking.id,
                is_available: false,
                is_reserved: false,
              }));

            const { error: returnSeatError } = await supabase
              .from('seat_reservations')
              .upsert(returnSeatReservations, {
                onConflict: 'trip_id,seat_id',
              });

            if (returnSeatError) {
              console.error(
                'Failed to create return seat reservations for modified booking:',
                returnSeatError
              );
            }
          }
        }
      }

      set({ isLoading: false });
      return { bookingId: newBooking.id, returnBookingId };
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to modify booking',
        isLoading: false,
      });
      throw error;
    }
  },

  agentCancelBooking: async (
    agentId: string,
    bookingId: string,
    cancellationData: {
      reason: string;
      refundPercentage?: number;
      refundMethod?: 'agent_credit' | 'original_payment' | 'bank_transfer';
      bankDetails?: {
        accountNumber: string;
        accountName: string;
        bankName: string;
      };
      agentNotes?: string;
      overrideFee?: boolean;
    }
  ) => {
    try {
      if (!agentId) throw new Error('Agent ID required');

      set({ isLoading: true, error: null });

      // Get agent data for credit balance
      const { data: agent, error: agentError } = await supabase
        .from('user_profiles')
        .select('id, credit_balance')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Get current booking data
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select(
          `
                    *,
                    trip:trip_id(*),
                    passengers(*),
                    payments(*)
                `
        )
        .eq('id', bookingId)
        .single();

      if (fetchError || !currentBooking) {
        throw new Error('Booking not found');
      }

      // Calculate refund and cancellation fee
      const refundPercentage = cancellationData.refundPercentage || 50; // Default 50% refund
      const refundAmount = (currentBooking.total_fare * refundPercentage) / 100;
      const cancellationFee = currentBooking.total_fare - refundAmount;

      // Generate unique cancellation number
      const cancellationNumber = `C${Date.now().toString().slice(-7)}`;

      // Update booking status to cancelled
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingUpdateError) throw bookingUpdateError;

      // Release seat reservations
      await supabase
        .from('seat_reservations')
        .update({
          is_available: true,
          booking_id: null,
          is_reserved: false,
          reservation_expiry: null,
        })
        .eq('booking_id', bookingId);

      // Handle agent credit transaction for refund
      if (
        cancellationData.refundMethod === 'agent_credit' &&
        refundAmount > 0
      ) {
        const newBalance = agent.credit_balance + refundAmount;

        // Create credit transaction record
        const creditTransaction = {
          agent_id: agent.id,
          amount: refundAmount,
          transaction_type: 'refill' as const,
          booking_id: bookingId,
          description: `Booking cancellation refund: ${cancellationData.reason}`,
          balance_after: newBalance,
        };

        const { error: transactionError } = await supabase
          .from('agent_credit_transactions')
          .insert(creditTransaction);

        if (transactionError) {
          console.warn(
            'Failed to create credit transaction:',
            transactionError
          );
        }

        // Update agent credit balance
        const { error: balanceUpdateError } = await supabase
          .from('user_profiles')
          .update({
            credit_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id);

        if (balanceUpdateError) {
          console.warn(
            'Failed to update agent credit balance:',
            balanceUpdateError
          );
        }
      }

      // Update payment status if needed
      if (currentBooking.payments && currentBooking.payments.length > 0) {
        const newPaymentStatus =
          refundAmount > 0
            ? refundAmount === currentBooking.total_fare
              ? 'refunded'
              : 'partially_refunded'
            : 'cancelled';

        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            status: newPaymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('booking_id', bookingId);

        if (paymentUpdateError) {
          console.warn('Failed to update payment status:', paymentUpdateError);
        }
      }

      // Create refund payment record if refund amount > 0
      if (refundAmount > 0) {
        // Map to valid payment_method enum values
        const refundPaymentMethod =
          cancellationData.refundMethod === 'agent_credit'
            ? 'wallet'
            : cancellationData.refundMethod === 'bank_transfer'
              ? 'bank_transfer'
              : 'wallet';

        const refundPaymentData = {
          booking_id: bookingId,
          payment_method: refundPaymentMethod,
          amount: -refundAmount, // Negative amount to indicate refund
          currency: 'MVR',
          status: 'refunded',
          transaction_date: new Date().toISOString(),
        };

        const { error: refundPaymentError } = await supabase
          .from('payments')
          .insert(refundPaymentData);

        if (refundPaymentError) {
          console.warn(
            'Failed to create refund payment record:',
            refundPaymentError
          );
        }
      }

      // Create cancellation record
      const cancellationRecord = {
        booking_id: bookingId,
        cancellation_number: cancellationNumber,
        cancellation_reason: cancellationData.reason,
        cancellation_fee: cancellationFee,
        refund_amount: refundAmount,
        refund_bank_account_number:
          cancellationData.bankDetails?.accountNumber || null,
        refund_bank_account_name:
          cancellationData.bankDetails?.accountName || null,
        refund_bank_name: cancellationData.bankDetails?.bankName || null,
        status: 'pending',
        refund_processing_date:
          cancellationData.refundMethod === 'agent_credit'
            ? new Date().toISOString()
            : null,
      };

      await supabase.from('cancellations').insert(cancellationRecord);

      set({ isLoading: false });
      return cancellationNumber;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to cancel booking',
        isLoading: false,
      });
      throw error;
    }
  },

  updateBookingStatusWithHistory: async (
    agentId: string,
    bookingId: string,
    status: string,
    notes?: string
  ) => {
    try {
      if (!agentId) throw new Error('Agent ID required');

      set({ isLoading: true, error: null });

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update booking status',
        isLoading: false,
      });
      throw error;
    }
  },

  // QR Code utilities
  parseBookingQrCode: (qrCodeUrl: string) => {
    return parseBookingQrCode(qrCodeUrl);
  },

  getQrCodeDisplayData: (booking: Booking) => {
    try {
      if (!booking.qrCodeUrl) return null;

      const qrData = get().parseBookingQrCode(booking.qrCodeUrl);
      if (!qrData) return null;

      return {
        bookingNumber: qrData.bookingNumber || booking.bookingNumber,
        tripType: qrData.type || booking.tripType,
        route: qrData.route || `${booking.origin} → ${booking.destination}`,
        departureDate: qrData.departureDate || booking.departureDate,
        departureTime: qrData.departureTime || booking.departureTime,
        passengers: qrData.passengers || booking.passengerCount,
        seats: Array.isArray(qrData.seats) ? qrData.seats.join(', ') : 'N/A',
        clientName: qrData.clientName || booking.clientName,
        agentName: qrData.agentName || 'Unknown Agent',
        totalFare: qrData.totalFare || booking.totalAmount,
        timestamp: qrData.timestamp || booking.bookingDate,
        isAgentBooking: qrData.type?.includes('agent-booking') || false,
        isReturnTrip: qrData.type === 'agent-booking-return' || false,
      };
    } catch (error) {
      console.error('Error extracting QR code display data:', error);
      return null;
    }
  },

  // Booking history and tracking
  getBookingModifications: async (bookingId: string) => {
    try {
      const { data: modifications, error } = await supabase
        .from('modifications')
        .select(
          `
                    id,
                    old_booking_id,
                    new_booking_id,
                    modification_reason,
                    fare_difference,
                    requires_additional_payment,
                    refund_details,
                    payment_details,
                    created_at,
                    old_booking:old_booking_id(booking_number, status),
                    new_booking:new_booking_id(booking_number, status)
                `
        )
        .or(`old_booking_id.eq.${bookingId},new_booking_id.eq.${bookingId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return modifications || [];
    } catch (error) {
      console.error('Error fetching booking modifications:', error);
      return [];
    }
  },

  getBookingCancellation: async (bookingId: string) => {
    try {
      const { data: cancellation, error } = await supabase
        .from('cancellations')
        .select(
          `
                    id,
                    booking_id,
                    cancellation_number,
                    cancellation_reason,
                    cancellation_fee,
                    refund_amount,
                    refund_bank_account_number,
                    refund_bank_account_name,
                    refund_bank_name,
                    refund_processing_date,
                    status,
                    created_at,
                    updated_at
                `
        )
        .eq('booking_id', bookingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return cancellation;
    } catch (error) {
      console.error('Error fetching booking cancellation:', error);
      return null;
    }
  },

  getBookingFullHistory: async (bookingId: string) => {
    try {
      const [modifications, cancellation] = await Promise.all([
        get().getBookingModifications(bookingId),
        get().getBookingCancellation(bookingId),
      ]);

      return {
        modifications,
        cancellation,
        creditTransactions: [], // This would need to be populated from credit store
      };
    } catch (error) {
      console.error('Error fetching booking full history:', error);
      return {
        modifications: [],
        cancellation: null,
        creditTransactions: [],
      };
    }
  },

  // Local booking utility methods
  getLocalActiveBookings: () => {
    const { bookings } = get();
    return getActiveBookings(bookings);
  },

  getLocalInactiveBookings: () => {
    const { bookings } = get();
    return getInactiveBookings(bookings);
  },

  // Booking refresh utilities
  refreshBookingsData: async (
    agentId: string,
    clientsFetcher?: () => Promise<any[]>,
    statsFetcher?: () => Promise<any>
  ) => {
    try {
      if (!agentId) return;

      set({ isLoading: true, error: null });

      // Fetch fresh bookings
      const bookings = await get().getAgentBookings(agentId);

      set({
        bookings,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error refreshing bookings data:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to refresh bookings',
        isLoading: false,
      });
    }
  },

  handleBookingCreated: async (
    agentId: string,
    bookingId: string,
    returnBookingId?: string | null,
    clientsFetcher?: () => Promise<any[]>,
    statsFetcher?: () => Promise<any>
  ) => {
    if (bookingId === 'refresh') {
      // Special case for refresh trigger
      await get().refreshBookingsData(agentId, clientsFetcher, statsFetcher);
    } else {
      // Normal booking creation - refresh all data
      await get().refreshBookingsData(agentId, clientsFetcher, statsFetcher);
    }
  },

  clearError: () => set({ error: null }),

  reset: () => {
    set({
      bookings: [],
      isLoading: false,
      error: null,
    });
  },
}));
