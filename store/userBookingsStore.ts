import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { UserBookingsStoreState } from '@/types/booking';
import type { Booking, Route, Passenger, Seat } from '@/types';

interface UserBookingsStoreActions {
  fetchUserBookings: () => Promise<void>;
  cancelBooking: (
    bookingId: string,
    reason: string,
    bankDetails: {
      accountNumber: string;
      accountName: string;
      bankName: string;
    }
  ) => Promise<void>;
  modifyBooking: (
    bookingId: string,
    modifications: any
  ) => Promise<{
    newBookingId: string;
    newBookingNumber: string;
    originalBookingId: string;
  }>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

interface UserBookingsStore
  extends UserBookingsStoreState,
    UserBookingsStoreActions {}

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
      // Get current authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }

      if (!user?.id) {
        throw new Error('No authenticated user found');
      }

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(
          `
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
              name,
              model,
              registration_number
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
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const formattedBookings: Booking[] = (bookingsData || []).map(
        (booking: any) => {
          // Validate required booking data
          if (!booking?.trip?.route) {
            throw new Error(
              'Invalid booking data: missing trip or route information'
            );
          }

          // Format route data with null checks
          const route: Route = {
            id: booking.trip.route.id,
            fromIsland: {
              id: booking.trip.route.from_island?.id || '',
              name: booking.trip.route.from_island?.name || 'Unknown',
              zone: booking.trip.route.from_island?.zone || '',
            },
            toIsland: {
              id: booking.trip.route.to_island?.id || '',
              name: booking.trip.route.to_island?.name || 'Unknown',
              zone: booking.trip.route.to_island?.zone || '',
            },
            baseFare: booking.trip.route.base_fare || 0,
            duration: '2h', // Default duration since it's not in the database
          };

          // Format passengers data with their seats (with null checks)
          const passengers: Passenger[] = (booking.passengers || []).map(
            (p: any) => ({
              id: p?.id || '',
              fullName: p?.passenger_name || '',
              idNumber: p?.passenger_contact_number || '',
              specialAssistance: p?.special_assistance_request || '',
            })
          );

          // Format seats data (with null checks)
          const seats: Seat[] = (booking.passengers || [])
            .filter((p: any) => p?.seat) // Only include passengers with valid seat data
            .map((p: any) => ({
              id: p.seat?.id || '',
              number: p.seat?.seat_number || '',
              rowNumber: p.seat?.row_number || 0,
              isWindow: p.seat?.is_window || false,
              isAisle: p.seat?.is_aisle || false,
              isAvailable: false,
              isSelected: true,
            }));

          // Get payment information
          const payment = booking.payments?.[0]
            ? {
                method: booking.payments[0].payment_method,
                status: booking.payments[0].status,
              }
            : undefined;

          // Format the booking (with null checks)
          return {
            id: booking?.id || '',
            bookingNumber: booking?.booking_number || '',
            tripType: booking?.is_round_trip ? 'round_trip' : 'one_way',
            departureDate: booking?.trip?.travel_date || '',
            departureTime: booking?.trip?.departure_time || '',
            route,
            seats,
            passengers,
            totalFare: booking?.total_fare || 0,
            status: booking?.status || 'pending',
            qrCodeUrl: booking?.qr_code_url || '',
            checkInStatus: booking?.check_in_status || false,
            createdAt: booking?.created_at || '',
            updatedAt: booking?.updated_at || '',
            vessel: {
              id: booking?.trip?.vessel?.id || '',
              name: booking?.trip?.vessel?.name || 'Unknown Vessel',
              model: booking?.trip?.vessel?.model || '',
              registrationNumber:
                booking?.trip?.vessel?.registration_number || '',
            },
            payment,
          };
        }
      );

      set({ bookings: formattedBookings });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  },

  cancelBooking: async (
    bookingId: string,
    reason: string,
    bankDetails: {
      accountNumber: string;
      accountName: string;
      bankName: string;
    }
  ) => {
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
      const cancellationNumber =
        Math.floor(Math.random() * 9000000000) + 1000000000; // 10-digit number

      // 1. Update booking status to cancelled
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
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
          reservation_expiry: null,
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
          status: 'pending',
        });

      if (cancellationError) throw cancellationError;

      // 4. Process refund through MIB if payment was made via MIB
      if (
        booking.payment?.status === 'completed' &&
        booking.payment?.method === 'mib'
      ) {
        try {
          console.log(
            `[CANCEL] Initiating MIB refund for booking ${bookingId}, amount: ${refundAmount}`
          );

          // Call MIB refund API through edge function
          const { data: refundData, error: refundError } =
            await supabase.functions.invoke('mib-payment', {
              body: {
                action: 'process-refund',
                bookingId,
                refundAmount,
                currency: 'MVR',
              },
            });

          if (refundError) {
            console.error('[CANCEL] Refund API error:', refundError);
            console.error(
              '[CANCEL] Error status:',
              refundError.context?.status
            );
            console.error(
              '[CANCEL] Error statusText:',
              refundError.context?.statusText
            );

            // The actual error message is likely in the response body
            // Since we got a 500 error, the edge function should have returned error details
            console.error(
              '[CANCEL] Check Supabase Edge Function logs for detailed error'
            );
            console.error(
              '[CANCEL] Project ref:',
              refundError.context?.headers?.map?.['sb-project-ref']
            );
            console.error(
              '[CANCEL] Request ID:',
              refundError.context?.headers?.map?.['sb-request-id']
            );

            // Don't throw - continue with cancellation even if refund fails
            // Admin can manually process refund later
          }

          if (refundData) {
            console.log(
              '[CANCEL] Refund API response:',
              JSON.stringify(refundData, null, 2)
            );
          } else if (!refundError) {
            console.warn(
              '[CANCEL] No refund data and no error - unexpected state'
            );
          }

          if (!refundData?.success) {
            console.warn(
              '[CANCEL] Refund processing failed:',
              refundData?.error || 'Unknown error'
            );
            // Update cancellation status to indicate refund failure
            await supabase
              .from('cancellations')
              .update({
                status: 'refund_failed',
              })
              .eq('booking_id', bookingId);
          } else {
            console.log('[CANCEL] Refund processed successfully');
          }
        } catch (refundException) {
          console.error(
            '[CANCEL] Exception during refund processing:',
            refundException
          );
          // Continue - cancellation is complete, refund can be handled manually
        }
      } else if (booking.payment?.status === 'completed') {
        console.log(
          `[CANCEL] Non-MIB payment method: ${booking.payment?.method}, updating payment status only`
        );
        // For non-MIB payments, just update payment status
        await supabase
          .from('payments')
          .update({
            status: 'partially_refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('booking_id', bookingId);
      } else {
        console.log(
          `[CANCEL] Payment status is not completed: ${booking.payment?.status}, skipping refund processing`
        );
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
    const { setError, setLoading, fetchUserBookings, bookings } = get();
    setLoading(true);
    setError(null);
    let refundStatus: string | null = null; // Track refund status for user feedback

    try {
      // Find the original booking
      const originalBooking = bookings.find(b => b.id === bookingId);
      if (!originalBooking) throw new Error('Original booking not found');

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      // 1. Create new booking with modified details (let DB auto-generate booking_number)
      const { data: newBookingData, error: newBookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          trip_id: modifications.newTripId,
          is_round_trip: false,
          total_fare: originalBooking.totalFare + modifications.fareDifference,
          status:
            modifications.fareDifference > 0 ? 'pending_payment' : 'confirmed',
          check_in_status: false,
        })
        .select()
        .single();

      if (newBookingError) throw newBookingError;

      // 2. Generate QR code URL using the booking number (simplified for modifications)
      // Note: Full booking details will be available after fetching updated bookings
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${newBookingData.booking_number}`)}`;

      // 3. Update the booking with the QR code URL
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', newBookingData.id);

      if (qrUpdateError) throw qrUpdateError;

      // 4. DO NOT release original seat reservations yet - only after successful payment
      // The original seat reservations will be released by completeModificationAfterPayment()
      // when payment is successful

      // 5. Update seat reservations for new booking
      // IMPORTANT: Clear temporary reservation fields to prevent "seat unavailable" issues
      for (const seat of modifications.selectedSeats) {
        const { error: seatUpdateError } = await supabase
          .from('seat_reservations')
          .update({
            booking_id: newBookingData.id,
            is_available: false,
            is_reserved: true,
            // Clear temporary reservation fields
            user_id: null,
            session_id: null,
            temp_reservation_expiry: null,
            last_activity: new Date().toISOString(),
          })
          .eq('trip_id', modifications.newTripId)
          .eq('seat_id', seat.id);

        if (seatUpdateError) throw seatUpdateError;
      }

      // 6. Create passengers for new booking
      const passengers = originalBooking.passengers.map(
        (passenger: any, index: number) => ({
          booking_id: newBookingData.id,
          passenger_name: passenger.fullName,
          passenger_contact_number: passenger.idNumber,
          special_assistance_request: passenger.specialAssistance,
          seat_id: modifications.selectedSeats[index]?.id,
        })
      );

      const { error: passengersError } = await supabase
        .from('passengers')
        .insert(passengers);

      if (passengersError) throw passengersError;

      // 7. Handle payment information
      if (modifications.fareDifference > 0) {
        // Additional payment required - create pending payment
        await supabase.from('payments').insert({
          booking_id: newBookingData.id,
          amount: modifications.fareDifference,
          payment_method: modifications.paymentMethod || 'gateway',
          status: 'pending',
        });
      } else if (modifications.fareDifference === 0) {
        // No fare difference - copy original payment but mark as completed for new booking
        if (originalBooking.payment) {
          await supabase.from('payments').insert({
            booking_id: newBookingData.id,
            amount: originalBooking.totalFare,
            payment_method: originalBooking.payment.method,
            status: 'completed',
          });
        }
      } else {
        // Refund case - create payment record and process refund
        if (originalBooking.payment) {
          await supabase.from('payments').insert({
            booking_id: newBookingData.id,
            amount: originalBooking.totalFare + modifications.fareDifference,
            payment_method: originalBooking.payment.method,
            status: 'completed',
          });
        }

        // Update new booking status to confirmed since refund will be processed separately
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
          })
          .eq('id', newBookingData.id);

        // Process MIB refund if original payment was via MIB
        if (
          originalBooking.payment?.status === 'completed' &&
          originalBooking.payment?.method === 'mib'
        ) {
          try {
            const refundAmount = Math.abs(modifications.fareDifference);
            console.log(
              `[MODIFY] Initiating MIB refund for original booking ${bookingId}, amount: ${refundAmount}`
            );

            // Verify that payment record has necessary transaction info
            const { data: paymentRecord, error: paymentCheckError } =
              await supabase
                .from('payments')
                .select(
                  'id, booking_id, payment_method, status, receipt_number, session_id'
                )
                .eq('booking_id', bookingId)
                .eq('payment_method', 'mib')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (paymentCheckError) {
              console.error(
                '[MODIFY] Failed to verify payment record:',
                paymentCheckError
              );
              throw new Error(
                `Payment verification failed: ${paymentCheckError.message}`
              );
            }

            if (!paymentRecord) {
              console.warn(
                '[MODIFY] No completed MIB payment found for this booking'
              );
              refundStatus = 'pending_manual';
              // Update modification record to indicate manual refund needed
              await supabase
                .from('modifications')
                .update({
                  refund_details: {
                    amount: refundAmount,
                    payment_method: originalBooking.payment.method,
                    bank_account_details: modifications.bankAccountDetails,
                    status: 'pending_manual',
                    note: 'No completed MIB payment record found - requires manual processing',
                  },
                })
                .eq('new_booking_id', newBookingData.id);
              // Don't return early - continue with modification
              // } else if (
              //   !paymentRecord.receipt_number &&
              //   !paymentRecord.session_id
              // ) {
              //   console.warn('[MODIFY] Payment record missing transaction ID');
              //   refundStatus = 'pending_manual';
              //   // Update modification record to indicate manual refund needed
              //   await supabase
              //     .from('modifications')
              //     .update({
              //       refund_details: {
              //         amount: refundAmount,
              //         payment_method: originalBooking.payment.method,
              //         bank_account_details: modifications.bankAccountDetails,
              //         status: 'pending_manual',
              //         note: 'Payment record missing transaction ID - requires manual processing',
              //       },
              //     })
              //     .eq('new_booking_id', newBookingData.id);
              // Don't return early - continue with modification
            } else {
              console.log(
                `[MODIFY] Payment record verified - Receipt: ${paymentRecord.receipt_number}, Session: ${paymentRecord.session_id}`
              );

              // Call MIB refund API through edge function
              // IMPORTANT: Use original booking ID so the edge function uses the correct booking_number as order ID
              const { data: refundData, error: refundError } =
                await supabase.functions.invoke('mib-payment', {
                  body: {
                    action: 'process-refund',
                    bookingId: bookingId, // Use ORIGINAL booking ID for refund
                    refundAmount,
                    currency: 'MVR',
                  },
                });

              if (refundError) {
                console.error('[MODIFY] Refund API error:', refundError);
                console.error(
                  '[MODIFY] Error details:',
                  JSON.stringify(refundError, null, 2)
                );
                refundStatus = 'failed';
                // Update modification record to indicate refund failure
                await supabase
                  .from('modifications')
                  .update({
                    refund_details: {
                      amount: refundAmount,
                      payment_method: originalBooking.payment.method,
                      bank_account_details: modifications.bankAccountDetails,
                      status: 'failed',
                      error: refundError.message || 'Refund API call failed',
                    },
                  })
                  .eq('new_booking_id', newBookingData.id);
                // Don't throw - continue with modification even if refund fails
                // Admin can manually process refund later
              } else {
                if (refundData) {
                  console.log(
                    '[MODIFY] Refund API response:',
                    JSON.stringify(refundData, null, 2)
                  );
                }

                if (!refundData?.success) {
                  console.warn(
                    '[MODIFY] Refund processing failed:',
                    refundData?.error || 'Unknown error'
                  );
                  refundStatus = 'failed';
                  // Update modification record to indicate refund failure
                  await supabase
                    .from('modifications')
                    .update({
                      refund_details: {
                        amount: refundAmount,
                        payment_method: originalBooking.payment.method,
                        bank_account_details: modifications.bankAccountDetails,
                        status: 'failed',
                        error: refundData?.error || 'Unknown error',
                      },
                    })
                    .eq('new_booking_id', newBookingData.id);
                } else {
                  console.log('[MODIFY] Refund processed successfully');
                  refundStatus = 'completed';
                  // Update modification record to indicate refund success
                  await supabase
                    .from('modifications')
                    .update({
                      refund_details: {
                        amount: refundAmount,
                        payment_method: originalBooking.payment.method,
                        bank_account_details: modifications.bankAccountDetails,
                        status: 'completed',
                        processed_at: new Date().toISOString(),
                        transaction_id: refundData?.transactionId,
                      },
                    })
                    .eq('new_booking_id', newBookingData.id);
                }
              }
            }
          } catch (refundException) {
            console.error(
              '[MODIFY] Exception during refund processing:',
              refundException
            );
            console.error(
              '[MODIFY] Exception stack:',
              refundException instanceof Error ? refundException.stack : 'N/A'
            );
            refundStatus = 'failed';
            // Update modification record to indicate exception
            try {
              await supabase
                .from('modifications')
                .update({
                  refund_details: {
                    amount: Math.abs(modifications.fareDifference),
                    payment_method:
                      originalBooking.payment?.method || 'unknown',
                    bank_account_details: modifications.bankAccountDetails,
                    status: 'failed',
                    error:
                      refundException instanceof Error
                        ? refundException.message
                        : 'Unknown exception',
                  },
                })
                .eq('new_booking_id', newBookingData.id);
            } catch (updateError) {
              console.error(
                '[MODIFY] Failed to update modification record:',
                updateError
              );
            }
            // Continue - modification is complete, refund can be handled manually
          }
        }
      }

      // 8. DO NOT update original booking status yet - only after successful payment
      // The original booking status will be updated by completeModificationAfterPayment()
      // when payment is successful

      // 9. Insert modification record (track status via booking status instead)
      const { error: modificationError } = await supabase
        .from('modifications')
        .insert({
          old_booking_id: bookingId,
          new_booking_id: newBookingData.id,
          modification_reason: modifications.modificationReason,
          fare_difference: modifications.fareDifference,
          requires_additional_payment: modifications.fareDifference > 0,
          payment_details:
            modifications.fareDifference > 0
              ? {
                  amount: modifications.fareDifference,
                  payment_method: modifications.paymentMethod,
                  status: 'pending',
                }
              : {
                  amount: 0,
                  payment_method: 'none',
                  status: 'completed',
                },
          refund_details:
            modifications.fareDifference < 0
              ? {
                  amount: Math.abs(modifications.fareDifference),
                  payment_method: modifications.paymentMethod,
                  bank_account_details: modifications.bankAccountDetails,
                  status: 'pending',
                }
              : null,
        });

      if (modificationError) throw modificationError;

      // If no additional payment is required, complete the modification immediately
      if (modifications.fareDifference <= 0) {
        // Update original booking status to modified since no payment is needed
        const { error: originalBookingError } = await supabase
          .from('bookings')
          .update({
            status: 'modified',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);

        if (originalBookingError) {
          console.error(
            'Failed to update original booking status:',
            originalBookingError
          );
        }

        // Update new booking status to confirmed
        const { error: newBookingStatusError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', newBookingData.id);

        if (newBookingStatusError) {
          console.error(
            'Failed to update new booking status:',
            newBookingStatusError
          );
        }

        // IMPORTANT: Release old seat reservations from the original booking
        console.log(
          '[MODIFY] Releasing seats from original booking:',
          bookingId
        );
        const { error: originalSeatReleaseError } = await supabase
          .from('seat_reservations')
          .update({
            is_available: true,
            booking_id: null,
            is_reserved: false,
            reservation_expiry: null,
            // Clear temporary reservation fields
            user_id: null,
            session_id: null,
            temp_reservation_expiry: null,
            last_activity: new Date().toISOString(),
          })
          .eq('booking_id', bookingId);

        if (originalSeatReleaseError) {
          console.error(
            '[MODIFY] Error releasing original seat reservations:',
            originalSeatReleaseError
          );
          // Don't throw - modification is complete, seat release can be handled manually
        } else {
          console.log(
            '[MODIFY] Successfully released seats from original booking'
          );
        }
      }

      await fetchUserBookings();

      // Return the new booking information for MIB payment processing
      return {
        newBookingId: newBookingData.id,
        newBookingNumber: newBookingData.booking_number,
        originalBookingId: bookingId,
        refundStatus: refundStatus, // Include refund status for user feedback
      };
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
