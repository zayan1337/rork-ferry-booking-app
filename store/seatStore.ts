import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { SeatStoreState } from '@/types/booking';
import type { Seat } from '@/types';
import {
  getTripSeatStatus,
  tempReserveSeat,
  releaseTempSeatReservation,
  subscribeToSeatUpdates,
  unsubscribeFromSeatUpdates,
  convertToSeatType,
  cleanupUserTempReservations,
} from '../utils/realtimeSeatReservation';

interface SeatStoreActions {
  fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
  refreshAvailableSeatsSilently: (
    tripId: string,
    isReturn?: boolean
  ) => Promise<void>;
  fetchSeats: (vesselId: string) => Promise<void>;
  fetchSeatsWithReservations: (
    tripId: string,
    isReturn?: boolean
  ) => Promise<void>;
  toggleSeatSelection: (
    seat: Seat,
    isReturn?: boolean,
    tripIdOverride?: string
  ) => Promise<void>;
  ensureSeatReservations: (tripId: string) => Promise<void>;
  initializeAllSeatReservations: () => Promise<void>;
  subscribeSeatUpdates: (tripId: string, isReturn?: boolean) => void;
  unsubscribeSeatUpdates: (tripId: string) => void;
  cleanupAllSeatSubscriptions: () => void;
  createSeatReservationsForTrip: (tripId: string) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  // New real-time seat reservation actions
  tempReserveSeat: (tripId: string, seatId: string) => Promise<boolean>;
  releaseTempReservation: (tripId: string, seatId: string) => Promise<boolean>;
  fetchRealtimeSeatStatus: (
    tripId: string,
    isReturn?: boolean
  ) => Promise<void>;
  cleanupUserReservations: (tripId: string) => Promise<void>;
}

interface SeatStore extends SeatStoreState, SeatStoreActions {}

export const useSeatStore = create<SeatStore>((set, get) => ({
  // State
  availableSeats: [],
  availableReturnSeats: [],
  seats: [],
  seatSubscriptions: new Map(),
  isLoading: false,
  error: null,

  // Actions
  fetchAvailableSeats: async (tripId: string, isReturn = false) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      await get().fetchRealtimeSeatStatus(tripId, isReturn);
    } catch (error: any) {
      console.error('Error fetching available seats:', error);
      setError('Failed to fetch seats. Please try again.');
    } finally {
      setLoading(false);
    }
  },

  refreshAvailableSeatsSilently: async (tripId: string, isReturn = false) => {
    try {
      await get().fetchRealtimeSeatStatus(tripId, isReturn);
    } catch (error: any) {
      console.error('Error refreshing available seats:', error);
      throw error;
    }
  },

  // New real-time seat status fetching
  fetchRealtimeSeatStatus: async (tripId: string, isReturn = false) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Get real-time seat status (includes safe cleanup)
      const realtimeSeatStatus = await getTripSeatStatus(tripId);

      // Check if we got valid seat data
      if (!realtimeSeatStatus || realtimeSeatStatus.length === 0) {
        await get().fetchSeatsWithReservations(tripId, isReturn);
        return;
      }

      // Convert to Seat type with current user context
      const seats: Seat[] = realtimeSeatStatus.map(status =>
        convertToSeatType(status, currentUserId)
      );

      // Update state
      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: seats,
      }));
    } catch (error: any) {
      console.error('Error fetching realtime seat status:', error);

      // Use fallback method for any error
      try {
        await get().fetchSeatsWithReservations(tripId, isReturn);
      } catch (fallbackError) {
        console.error('Fallback seat fetching also failed:', fallbackError);
        throw error; // Re-throw original error
      }
    }
  },

  fetchSeats: async (vesselId: string) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: seats, error } = await supabase
        .from('seats')
        .select(
          `
          id,
          vessel_id,
          seat_number,
          row_number,
          is_window,
          is_aisle,
          seat_type,
          seat_class,
          is_disabled,
          is_premium,
          price_multiplier,
          position_x,
          position_y
        `
        )
        .eq('vessel_id', vesselId)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });

      if (error) throw error;

      const processedSeats: Seat[] = (seats || []).map(seat => ({
        id: seat.id,
        number: seat.seat_number,
        rowNumber: seat.row_number,
        isWindow: seat.is_window,
        isAisle: seat.is_aisle,
        isAvailable: true, // Default for vessel seats
        isSelected: false,
        seatType: seat.seat_type || 'standard',
        seatClass: seat.seat_class || 'economy',
        isDisabled: seat.is_disabled || false,
        isPremium: seat.is_premium || false,
        priceMultiplier: seat.price_multiplier || 1.0,
        positionX: seat.position_x || seat.row_number || 1,
        positionY: seat.position_y || 1,
      }));

      set({ seats: processedSeats });
    } catch (error: any) {
      console.error('Error fetching seats:', error);
      setError('Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  },

  // Fallback seat fetching method that matches the original data structure
  fetchSeatsWithReservations: async (tripId: string, isReturn = false) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // First, get the trip details to find the vessel
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Get all seats for this vessel
      const { data: allVesselSeats, error: seatsError } = await supabase
        .from('seats')
        .select('*')
        .eq('vessel_id', tripData.vessel_id)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });

      if (seatsError) throw seatsError;

      if (!allVesselSeats || allVesselSeats.length === 0) {
        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: [],
        }));
        return;
      }

      // Get seat reservations for this trip
      const { data: seatReservations, error: reservationsError } =
        await supabase
          .from('seat_reservations')
          .select(
            `
            id,
            trip_id,
            seat_id,
            is_available,
            is_reserved,
            booking_id,
            user_id,
            temp_reservation_expiry,
            is_admin_blocked
          `
          )
          .eq('trip_id', tripId);

      if (reservationsError) throw reservationsError;

      // Create a map of seat reservations for quick lookup
      const reservationMap = new Map();
      (seatReservations || []).forEach(reservation => {
        reservationMap.set(reservation.seat_id, reservation);
      });

      // Process all vessel seats and match with reservations
      const allSeats: Seat[] = allVesselSeats.map(vesselSeat => {
        const reservation = reservationMap.get(vesselSeat.id);

        let isAvailable = true;
        let isTempReserved = false;
        let isCurrentUserReservation = false;

        if (reservation) {
          // FIRST: Check if admin blocked - always unavailable to customers
          if (reservation.is_admin_blocked) {
            isAvailable = false;
          }
          // SECOND: Check if seat is confirmed (has booking_id)
          else if (reservation.booking_id) {
            isAvailable = false;
          }
          // THIRD: Check if seat is temporarily reserved and not expired
          else if (reservation.temp_reservation_expiry) {
            const expiryTime = new Date(reservation.temp_reservation_expiry);
            const currentTime = new Date();

            if (currentTime < expiryTime) {
              isTempReserved = true;
              isCurrentUserReservation = reservation.user_id === currentUserId;
              // Available to current user if they reserved it, unavailable to others
              isAvailable = isCurrentUserReservation;
            } else {
              // Expired reservation, seat is available
              isAvailable = reservation.is_available !== false;
            }
          } else {
            // Check is_available flag (legacy support)
            isAvailable = reservation.is_available !== false;
          }
        }

        return {
          id: vesselSeat.id,
          number: String(vesselSeat.seat_number || ''),
          rowNumber: Number(vesselSeat.row_number || 0),
          isWindow: Boolean(vesselSeat.is_window),
          isAisle: Boolean(vesselSeat.is_aisle),
          isRowAisle: Boolean(vesselSeat.is_row_aisle),
          isAvailable,
          isSelected: false,
          seatType: vesselSeat.seat_type || 'standard',
          seatClass: vesselSeat.seat_class || 'economy',
          isDisabled: vesselSeat.is_disabled || false,
          isPremium: vesselSeat.is_premium || false,
          priceMultiplier: vesselSeat.price_multiplier || 1.0,
          positionX: vesselSeat.position_x || vesselSeat.row_number || 1,
          positionY: vesselSeat.position_y || 1,
          // Real-time reservation properties
          isConfirmed: Boolean(reservation?.booking_id),
          isTempReserved,
          tempReservedBy: reservation?.user_id,
          tempExpiry: reservation?.temp_reservation_expiry,
          isCurrentUserReservation,
        };
      });

      // Update state with all seats
      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats,
      }));
    } catch (error: any) {
      console.error('Error in fallback seat fetching:', error);
      throw error;
    }
  },

  toggleSeatSelection: async (
    seat: Seat,
    isReturn: boolean = false,
    tripIdOverride?: string
  ): Promise<void> => {
    try {
      const state = get();
      const seatsArray = isReturn
        ? state.availableReturnSeats
        : state.availableSeats;

      // Find the seat in the current seats array
      const seatIndex = seatsArray.findIndex(s => s.id === seat.id);
      if (seatIndex === -1) {
        console.error('Seat not found in available seats');
        throw new Error('Seat not found');
      }

      const currentSeat = seatsArray[seatIndex];

      let bookingState: any = null;
      let useBookingStore: any = null;
      let tripId = tripIdOverride;

      if (!tripIdOverride) {
        const bookingModule = await import('./bookingStore');
        useBookingStore = bookingModule.useBookingStore;
        bookingState = useBookingStore.getState();
        tripId = isReturn
          ? bookingState.currentBooking.returnTrip?.id
          : bookingState.currentBooking.trip?.id;
      }

      if (!tripId) {
        console.error('No trip ID available for seat reservation');
        throw new Error('No trip selected');
      }

      const syncBookingStoreSelection = (selectedSeats: Seat[]) => {
        if (!useBookingStore || !bookingState) {
          return;
        }

        const currentBooking = bookingState.currentBooking;
        const updatedBooking = {
          ...currentBooking,
          [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: selectedSeats,
        };

        // Update passengers array to match departure seat count (primary seats)
        if (!isReturn) {
          const newPassengers = selectedSeats.map(
            (_, index) =>
              currentBooking.passengers[index] || {
                fullName: '',
                idNumber: '',
                specialAssistance: '',
              }
          );
          updatedBooking.passengers = newPassengers;
        }

        useBookingStore.setState({ currentBooking: updatedBooking });
        useBookingStore.getState().calculateTotalFare();
      };

      // Step 1: Refresh seat status to get latest data
      await get().fetchRealtimeSeatStatus(tripId, isReturn);

      // Get updated seat data after refresh
      const updatedState = get();
      const updatedSeatsArray = isReturn
        ? updatedState.availableReturnSeats
        : updatedState.availableSeats;

      const updatedSeat = updatedSeatsArray.find(s => s.id === seat.id);
      if (!updatedSeat) {
        throw new Error('Seat no longer exists');
      }

      // Step 2: Check if seat is currently selected by this user
      if (updatedSeat.isSelected || updatedSeat.isCurrentUserReservation) {
        // Release the temporary reservation
        const released = await get().releaseTempReservation(tripId, seat.id);

        if (released) {
          // Refresh seat status after release
          await get().fetchRealtimeSeatStatus(tripId, isReturn);

          // Update booking store
          const finalState = get();
          const finalSeatsArray = isReturn
            ? finalState.availableReturnSeats
            : finalState.availableSeats;

          const selectedSeats = finalSeatsArray.filter(s => s.isSelected);
          syncBookingStoreSelection(selectedSeats);
        } else {
          throw new Error('Failed to release seat reservation');
        }
      } else {
        // Step 3: Check if seat is available for selection
        if (!updatedSeat.isAvailable) {
          if (
            updatedSeat.isTempReserved &&
            !updatedSeat.isCurrentUserReservation
          ) {
            throw new Error(
              'This seat is temporarily reserved by another user'
            );
          } else if (updatedSeat.isConfirmed) {
            throw new Error('This seat is already booked');
          } else {
            throw new Error('This seat is not available');
          }
        }

        // Step 4: Try to temporarily reserve the seat
        const reserved = await get().tempReserveSeat(tripId, seat.id);

        if (reserved) {
          // Refresh seat status after reservation
          await get().fetchRealtimeSeatStatus(tripId, isReturn);

          // Update booking store
          const finalState = get();
          const finalSeatsArray = isReturn
            ? finalState.availableReturnSeats
            : finalState.availableSeats;

          const selectedSeats = finalSeatsArray.filter(
            s => s.isSelected || s.isCurrentUserReservation
          );
          syncBookingStoreSelection(selectedSeats);
        } else {
          // Refresh seat status to show current state
          await get().fetchRealtimeSeatStatus(tripId, isReturn);
          throw new Error(
            'Unable to reserve this seat. It may have been taken by another user.'
          );
        }
      }
    } catch (error: any) {
      console.error('Error toggling seat selection:', error);
      set({
        error: error.message || 'Failed to select seat. Please try again.',
      });
      throw error;
    }
  },

  // Real-time seat reservation methods
  tempReserveSeat: async (tripId: string, seatId: string): Promise<boolean> => {
    try {
      const result = await tempReserveSeat(tripId, seatId, 10); // 10 minute expiry

      if (!result.success) {
        set({ error: result.message });
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error in tempReserveSeat:', error);

      // Fallback: Try direct database update as a simple reservation
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          set({ error: 'User not authenticated' });
          return false;
        }

        // Simple fallback: Just mark the seat as reserved in seat_reservations
        const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

        const { error: insertError } = await supabase
          .from('seat_reservations')
          .upsert({
            trip_id: tripId,
            seat_id: seatId,
            user_id: user.id,
            session_id: `fallback_${Date.now()}`,
            temp_reservation_expiry: expiryTime,
            is_available: false,
            is_reserved: true,
            last_activity: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Fallback reservation failed:', insertError);
          set({ error: 'Failed to reserve seat' });
          return false;
        }

        return true;
      } catch (fallbackError) {
        console.error('Fallback reservation also failed:', fallbackError);
        set({ error: 'Failed to reserve seat' });
        return false;
      }
    }
  },

  releaseTempReservation: async (
    tripId: string,
    seatId: string
  ): Promise<boolean> => {
    try {
      const result = await releaseTempSeatReservation(tripId, seatId);
      if (!result.success) {
        console.warn('Failed to release seat reservation:', result.message);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Error in releaseTempReservation:', error);

      // Fallback: Try direct database update
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return false;
        }

        // Simple fallback: Clear the reservation if it belongs to this user
        const { error: updateError } = await supabase
          .from('seat_reservations')
          .update({
            user_id: null,
            session_id: null,
            temp_reservation_expiry: null,
            is_available: true,
            is_reserved: false,
            last_activity: new Date().toISOString(),
          })
          .eq('trip_id', tripId)
          .eq('seat_id', seatId)
          .eq('user_id', user.id)
          .is('booking_id', null); // Only release temporary reservations, not confirmed bookings

        if (updateError) {
          console.error('Fallback release failed:', updateError);
          return false;
        }

        return true;
      } catch (fallbackError) {
        console.error('Fallback release also failed:', fallbackError);
        return false;
      }
    }
  },

  cleanupUserReservations: async (tripId: string): Promise<void> => {
    try {
      await cleanupUserTempReservations(tripId);
    } catch (error: any) {
      console.error('Error cleaning up user reservations:', error);
    }
  },

  // Legacy methods for backward compatibility
  ensureSeatReservations: async (tripId: string) => {
    // This is now handled by the database functions
  },

  initializeAllSeatReservations: async () => {
    // This is now handled by the database functions
  },

  createSeatReservationsForTrip: async (tripId: string) => {
    // This is now handled by the database functions
  },

  // Real-time subscription methods
  subscribeSeatUpdates: (tripId: string, isReturn?: boolean) => {
    const subscriptionKey = `${tripId}_${isReturn ? 'return' : 'departure'}`;

    // Check if already subscribed
    const existingSubscription = get().seatSubscriptions.get(subscriptionKey);
    if (existingSubscription) {
      return;
    }

    const subscription = subscribeToSeatUpdates(tripId, async payload => {
      try {
        // Refresh seat status when changes occur
        await get().fetchRealtimeSeatStatus(tripId, isReturn);
      } catch (error) {
        console.error('Error handling seat update:', error);
      }
    });

    set(state => {
      const newSubscriptions = new Map(state.seatSubscriptions);
      newSubscriptions.set(subscriptionKey, subscription);
      return { seatSubscriptions: newSubscriptions };
    });
  },

  unsubscribeSeatUpdates: (tripId: string) => {
    const departureKey = `${tripId}_departure`;
    const returnKey = `${tripId}_return`;

    set(state => {
      const newSubscriptions = new Map(state.seatSubscriptions);

      const departureSubscription = newSubscriptions.get(departureKey);
      if (departureSubscription) {
        unsubscribeFromSeatUpdates(departureSubscription);
        newSubscriptions.delete(departureKey);
      }

      const returnSubscription = newSubscriptions.get(returnKey);
      if (returnSubscription) {
        unsubscribeFromSeatUpdates(returnSubscription);
        newSubscriptions.delete(returnKey);
      }

      return { seatSubscriptions: newSubscriptions };
    });
  },

  cleanupAllSeatSubscriptions: () => {
    set(state => {
      state.seatSubscriptions.forEach(subscription => {
        unsubscribeFromSeatUpdates(subscription);
      });

      return { seatSubscriptions: new Map() };
    });
  },

  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));
