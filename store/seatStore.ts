import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import type { SeatStoreState } from '@/types/booking';
import type { Seat } from '@/types';

interface SeatStoreActions {
  fetchAvailableSeats: (tripId: string, isReturn?: boolean) => Promise<void>;
  refreshAvailableSeatsSilently: (tripId: string, isReturn?: boolean) => Promise<void>;
  fetchSeats: (vesselId: string) => Promise<void>;
  toggleSeatSelection: (seat: Seat, isReturn?: boolean) => Promise<void>;
  ensureSeatReservations: (tripId: string) => Promise<void>;
  initializeAllSeatReservations: () => Promise<void>;
  subscribeSeatUpdates: (tripId: string, isReturn?: boolean) => void;
  unsubscribeSeatUpdates: (tripId: string) => void;
  cleanupAllSeatSubscriptions: () => void;
  createSeatReservationsForTrip: (tripId: string) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

interface SeatStore extends SeatStoreState, SeatStoreActions { }

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
      await get().refreshAvailableSeatsSilently(tripId, isReturn);
    } catch (error: any) {
      console.error('Error fetching available seats:', error);
      setError('Failed to fetch seats. Please try again.');
    } finally {
      setLoading(false);
    }
  },

  refreshAvailableSeatsSilently: async (tripId: string, isReturn = false) => {
    try {
      // First, get the trip details to find the vessel
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Get vessel layout data to understand aisle positions
      const { data: vesselLayout, error: layoutError } = await supabase
        .from('seat_layouts')
        .select('layout_data')
        .eq('vessel_id', tripData.vessel_id)
        .eq('is_active', true)
        .single();

      let layoutConfig = null;
      if (!layoutError && vesselLayout?.layout_data) {
        layoutConfig = vesselLayout.layout_data;
      }

      // Get all seats for this vessel with enhanced properties
      const { data: allVesselSeats, error: seatsError } = await supabase
        .from('seats')
        .select(`
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
        `)
        .eq('vessel_id', tripData.vessel_id)
        .order('row_number', { ascending: true })
        .order('seat_number', { ascending: true });

      if (seatsError) throw seatsError;

      if (!allVesselSeats || allVesselSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: []
        }));
        return;
      }

      // Ensure seat reservations exist for this trip
      await get().createSeatReservationsForTrip(tripId);

      // Get seat reservations with seat details for this trip
      let { data: seatReservations, error } = await supabase
        .from('seat_reservations')
        .select(`
          id,
          trip_id,
          seat_id,
          is_available,
          is_reserved,
          booking_id,
          reservation_expiry,
          seat:seat_id(
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
          )
        `)
        .eq('trip_id', tripId)
        .order('seat(row_number)', { ascending: true })
        .order('seat(seat_number)', { ascending: true });

      if (error) throw error;

      // If still no seat reservations, create a fallback using all vessel seats
      if (!seatReservations || seatReservations.length === 0) {
        console.warn(`No seat reservations found for trip ${tripId}, using vessel seats as fallback`);

        // Determine if seat is actually an aisle based on layout config
        const fallbackSeats: Seat[] = allVesselSeats.map(seat => {
          let isAisle = seat.is_aisle;
          if (layoutConfig && layoutConfig.aisles) {
            isAisle = layoutConfig.aisles.includes(seat.position_x);
          }

          return {
            id: seat.id,
            number: seat.seat_number,
            rowNumber: seat.row_number,
            isWindow: seat.is_window,
            isAisle: isAisle,
            isAvailable: true,
            isSelected: false,
            // Enhanced properties
            seatType: seat.seat_type || 'standard',
            seatClass: seat.seat_class || 'economy',
            isDisabled: seat.is_disabled || false,
            isPremium: seat.is_premium || false,
            priceMultiplier: seat.price_multiplier || 1.0,
            positionX: seat.position_x,
            positionY: seat.position_y
          };
        });

        set(state => ({
          [isReturn ? 'availableReturnSeats' : 'availableSeats']: fallbackSeats
        }));
        return;
      }

      // Create a map of seat reservations for quick lookup
      const reservationMap = new Map();
      seatReservations.forEach(reservation => {
        if (reservation.seat && typeof reservation.seat === 'object' && 'id' in reservation.seat) {
          reservationMap.set((reservation.seat as any).id, reservation);
        }
      });

      // Process all vessel seats and match with reservations
      const allSeats: Seat[] = allVesselSeats.map(vesselSeat => {
        const reservation = reservationMap.get(vesselSeat.id);

        let isAvailable = true;

        if (reservation) {
          isAvailable = reservation.is_available && !reservation.booking_id;

          // Handle temporary reservations
          if (reservation.is_reserved && reservation.reservation_expiry) {
            const expiryTime = new Date(reservation.reservation_expiry);
            const currentTime = new Date();

            if (currentTime > expiryTime) {
              isAvailable = reservation.is_available && !reservation.booking_id;

              // Clean up expired reservation
              supabase
                .from('seat_reservations')
                .update({
                  is_reserved: false,
                  reservation_expiry: null
                })
                .eq('id', reservation.id)
                .then(({ error }) => {
                  if (error) console.error('Error cleaning up expired reservation:', error);
                });
            } else {
              isAvailable = false;
            }
          }
        }

        // Determine if seat is actually an aisle based on layout config
        let isAisle = vesselSeat.is_aisle;
        if (layoutConfig && layoutConfig.aisles) {
          isAisle = layoutConfig.aisles.includes(vesselSeat.position_x);
        }

        const seat: Seat = {
          id: vesselSeat.id,
          number: vesselSeat.seat_number,
          rowNumber: vesselSeat.row_number,
          isWindow: vesselSeat.is_window,
          isAisle: isAisle,
          isAvailable: isAvailable,
          isSelected: false,
          // Enhanced properties
          seatType: vesselSeat.seat_type || 'standard',
          seatClass: vesselSeat.seat_class || 'economy',
          isDisabled: vesselSeat.is_disabled || false,
          isPremium: vesselSeat.is_premium || false,
          priceMultiplier: vesselSeat.price_multiplier || 1.0,
          positionX: vesselSeat.position_x,
          positionY: vesselSeat.position_y
        };

        return seat;
      });

      // Update state with all seats
      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: allSeats
      }));

    } catch (error: any) {
      console.error('Error refreshing available seats silently:', error);
    }
  },

  fetchSeats: async (vesselId: string) => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: seatsData, error } = await supabase
        .from('seats')
        .select(`
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
        `)
        .eq('vessel_id', vesselId)
        .order('row_number')
        .order('seat_number');

      if (error) throw error;

      // Get vessel layout data to understand aisle positions
      const { data: vesselLayout, error: layoutError } = await supabase
        .from('seat_layouts')
        .select('layout_data')
        .eq('vessel_id', vesselId)
        .eq('is_active', true)
        .single();

      let layoutConfig = null;
      if (!layoutError && vesselLayout?.layout_data) {
        layoutConfig = vesselLayout.layout_data;
      }

      const formattedSeats: Seat[] = seatsData.map(seat => {
        // Determine if seat is actually an aisle based on layout config
        let isAisle = seat.is_aisle;
        if (layoutConfig && layoutConfig.aisles) {
          isAisle = layoutConfig.aisles.includes(seat.position_x);
        }

        return {
          id: seat.id,
          number: seat.seat_number,
          rowNumber: seat.row_number,
          isWindow: seat.is_window,
          isAisle: isAisle,
          isAvailable: true,
          isSelected: false,
          // Enhanced properties
          seatType: seat.seat_type || 'standard',
          seatClass: seat.seat_class || 'economy',
          isDisabled: seat.is_disabled || false,
          isPremium: seat.is_premium || false,
          priceMultiplier: seat.price_multiplier || 1.0,
          positionX: seat.position_x,
          positionY: seat.position_y
        };
      });

      set({ seats: formattedSeats });
    } catch (error) {
      console.error('Error fetching seats:', error);
      setError('Failed to fetch seats');
    } finally {
      setLoading(false);
    }
  },

  toggleSeatSelection: async (seat: Seat, isReturn: boolean = false): Promise<void> => {
    try {
      const state = get();
      const seatsArray = isReturn ? state.availableReturnSeats : state.availableSeats;

      // Find the seat in the current seats array
      const seatIndex = seatsArray.findIndex(s => s.id === seat.id);
      if (seatIndex === -1) {
        console.error('Seat not found in available seats');
        return;
      }

      const currentSeat = seatsArray[seatIndex];

      // Check if seat is available for selection
      if (!currentSeat.isAvailable && !currentSeat.isSelected) {
        console.warn('Seat is not available for selection');
        return;
      }

      // Toggle the seat selection
      const updatedSeats = [...seatsArray];
      updatedSeats[seatIndex] = {
        ...currentSeat,
        isSelected: !currentSeat.isSelected
      };

      // Update the seats in the store
      set(state => ({
        [isReturn ? 'availableReturnSeats' : 'availableSeats']: updatedSeats
      }));

      // Get the selected seats
      const selectedSeats = updatedSeats.filter(s => s.isSelected);

      // Import the booking store dynamically to avoid circular dependencies
      const { useBookingStore } = await import('./bookingStore');
      const bookingStore = useBookingStore.getState();

      // Update the booking store with selected seats
      const currentBooking = bookingStore.currentBooking;
      const updatedBooking = {
        ...currentBooking,
        [isReturn ? 'returnSelectedSeats' : 'selectedSeats']: selectedSeats
      };

      // Update passengers array to match departure seat count (primary seats)
      const departureSeatsCount = isReturn ? currentBooking.selectedSeats.length : selectedSeats.length;
      const currentPassengers = currentBooking.passengers;
      const newPassengers = [];

      // Create passenger entries for each departure seat
      for (let i = 0; i < departureSeatsCount; i++) {
        newPassengers.push({
          fullName: currentPassengers[i]?.fullName || '',
          idNumber: currentPassengers[i]?.idNumber || '',
          specialAssistance: currentPassengers[i]?.specialAssistance || '',
        });
      }

      // Update the booking store
      useBookingStore.setState({
        currentBooking: {
          ...updatedBooking,
          passengers: newPassengers
        }
      });

      // Recalculate total fare
      useBookingStore.getState().calculateTotalFare();

    } catch (error) {
      console.error('Error toggling seat selection:', error);
      set({ error: 'Failed to select seat. Please try again.' });
    }
  },

  ensureSeatReservations: async (tripId: string) => {
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Error fetching trip data:', tripError);
        return;
      }

      const { data: allSeats, error: seatsError } = await supabase
        .from('seats')
        .select('id')
        .eq('vessel_id', tripData.vessel_id);

      if (seatsError) {
        console.error('Error fetching seats:', seatsError);
        return;
      }

      if (!allSeats || allSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        return;
      }

      const { data: existingReservations, error: existingError } = await supabase
        .from('seat_reservations')
        .select('seat_id')
        .eq('trip_id', tripId);

      if (existingError) {
        console.error('Error checking existing reservations:', existingError);
        return;
      }

      const existingSeatIds = new Set(existingReservations?.map(r => r.seat_id) || []);
      const missingSeats = allSeats.filter(seat => !existingSeatIds.has(seat.id));

      if (missingSeats.length === 0) {
        return;
      }

      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < missingSeats.length; i += BATCH_SIZE) {
        const batch = missingSeats.slice(i, i + BATCH_SIZE);
        const seatReservationsToCreate = batch.map(seat => ({
          trip_id: tripId,
          seat_id: seat.id,
          is_available: true,
          is_reserved: false,
          booking_id: null
        }));

        try {
          // Use upsert instead of insert to handle potential duplicates gracefully
          const { error: insertError } = await supabase
            .from('seat_reservations')
            .upsert(seatReservationsToCreate, {
              onConflict: 'trip_id,seat_id',
              ignoreDuplicates: true
            });

          if (insertError) {
            console.error(`Error upserting batch ${i / BATCH_SIZE + 1}:`, insertError);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error(`Exception upserting batch ${i / BATCH_SIZE + 1}:`, batchError);
          errorCount += batch.length;
        }

        if (i + BATCH_SIZE < missingSeats.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error: any) {
      console.error('Error creating seat reservations:', error);
    }
  },

  initializeAllSeatReservations: async () => {
    const { setError, setLoading } = get();
    setLoading(true);
    setError(null);

    try {
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, vessel_id')
        .eq('is_active', true);

      if (tripsError) throw tripsError;

      const BATCH_SIZE = 10;
      for (let i = 0; i < trips.length; i += BATCH_SIZE) {
        const batch = trips.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (trip) => {
          try {
            const { data: allSeats, error: seatsError } = await supabase
              .from('seats')
              .select('id')
              .eq('vessel_id', trip.vessel_id);

            if (seatsError) throw seatsError;

            const { data: existingReservations, error: reservationError } = await supabase
              .from('seat_reservations')
              .select('seat_id')
              .eq('trip_id', trip.id);

            if (reservationError) throw reservationError;

            const existingSeatIds = new Set(existingReservations.map(r => r.seat_id));
            const missingSeats = allSeats
              .filter(seat => !existingSeatIds.has(seat.id))
              .map(seat => ({
                trip_id: trip.id,
                seat_id: seat.id,
                is_available: true,
                is_reserved: false,
                booking_id: null
              }));

            if (missingSeats.length > 0) {
              const { error: insertError } = await supabase
                .from('seat_reservations')
                .upsert(missingSeats, {
                  onConflict: 'trip_id,seat_id',
                  ignoreDuplicates: true
                });

              if (insertError) {
                console.error(`Error creating seat reservations for trip ${trip.id}:`, insertError);
              }
            }
          } catch (error) {
            console.error(`Error processing trip ${trip.id}:`, error);
          }
        }));

        if (i + BATCH_SIZE < trips.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error) {
      console.error('Error initializing all seat reservations:', error);
      setError('Failed to initialize seat reservations');
      throw error;
    } finally {
      setLoading(false);
    }
  },

  subscribeSeatUpdates: (tripId: string, isReturn?: boolean) => {
    const subscriptionKey = `${tripId}-${isReturn ? 'return' : 'departure'}`;

    // Unsubscribe if already subscribed
    get().unsubscribeSeatUpdates(tripId);

    const subscription = supabase
      .channel(`seat_reservations:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_reservations',
          filter: `trip_id=eq.${tripId}`
        },
        async (payload) => {
          try {
            await get().refreshAvailableSeatsSilently(tripId, isReturn);
          } catch (error) {
            console.error('Error updating seats from subscription:', error);
          }
        }
      )
      .subscribe();

    // Store the subscription
    set(state => {
      const newSubscriptions = new Map(state.seatSubscriptions);
      newSubscriptions.set(subscriptionKey, subscription);
      return { seatSubscriptions: newSubscriptions };
    });
  },

  unsubscribeSeatUpdates: (tripId: string) => {
    const departureKey = `${tripId}-departure`;
    const returnKey = `${tripId}-return`;

    set(state => {
      const newSubscriptions = new Map(state.seatSubscriptions);

      const departureSub = newSubscriptions.get(departureKey);
      if (departureSub) {
        supabase.removeChannel(departureSub);
        newSubscriptions.delete(departureKey);
      }

      const returnSub = newSubscriptions.get(returnKey);
      if (returnSub) {
        supabase.removeChannel(returnSub);
        newSubscriptions.delete(returnKey);
      }

      return { seatSubscriptions: newSubscriptions };
    });
  },

  cleanupAllSeatSubscriptions: () => {
    set(state => {
      state.seatSubscriptions.forEach((subscription, key) => {
        supabase.removeChannel(subscription);
      });

      return { seatSubscriptions: new Map() };
    });
  },

  createSeatReservationsForTrip: async (tripId: string) => {
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('vessel_id')
        .eq('id', tripId)
        .single();

      if (tripError) {
        console.error('Error fetching trip data:', tripError);
        return;
      }

      const { data: allSeats, error: seatsError } = await supabase
        .from('seats')
        .select('id')
        .eq('vessel_id', tripData.vessel_id);

      if (seatsError) {
        console.error('Error fetching seats:', seatsError);
        return;
      }

      if (!allSeats || allSeats.length === 0) {
        console.warn(`No seats found for vessel ${tripData.vessel_id}`);
        return;
      }

      const { data: existingReservations, error: existingError } = await supabase
        .from('seat_reservations')
        .select('seat_id')
        .eq('trip_id', tripId);

      if (existingError) {
        console.error('Error checking existing reservations:', existingError);
        return;
      }

      const existingSeatIds = new Set(existingReservations?.map(r => r.seat_id) || []);
      const missingSeats = allSeats.filter(seat => !existingSeatIds.has(seat.id));

      if (missingSeats.length === 0) {
        return;
      }

      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < missingSeats.length; i += BATCH_SIZE) {
        const batch = missingSeats.slice(i, i + BATCH_SIZE);
        const seatReservationsToCreate = batch.map(seat => ({
          trip_id: tripId,
          seat_id: seat.id,
          is_available: true,
          is_reserved: false,
          booking_id: null
        }));

        try {
          // Use upsert instead of insert to handle potential duplicates gracefully
          const { error: insertError } = await supabase
            .from('seat_reservations')
            .upsert(seatReservationsToCreate, {
              onConflict: 'trip_id,seat_id',
              ignoreDuplicates: true
            });

          if (insertError) {
            console.error(`Error upserting batch ${i / BATCH_SIZE + 1}:`, insertError);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error(`Exception upserting batch ${i / BATCH_SIZE + 1}:`, batchError);
          errorCount += batch.length;
        }

        if (i + BATCH_SIZE < missingSeats.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error: any) {
      console.error('Error creating seat reservations:', error);
    }
  },

  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
})); 