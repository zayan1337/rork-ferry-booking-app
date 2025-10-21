/**
 * Multi-Stop Booking Hook
 *
 * Custom hook that integrates multi-stop trip functionality
 * with the existing booking flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useMultiStopStore } from '@/store/multiStopStore';
import { supabase } from '@/utils/supabase';
import type {
  MultiStopTrip,
  AvailableSegment,
  SegmentSelection,
} from '@/types/multiStopTrip';
import {
  getMultiStopTripsForDate,
  validateSegment,
} from '@/utils/multiStopTripUtils';

export const useMultiStopBooking = () => {
  const [isMultiStopMode, setIsMultiStopMode] = useState(false);
  const [multiStopTrips, setMultiStopTrips] = useState<MultiStopTrip[]>([]);
  const [selectedMultiStopTrip, setSelectedMultiStopTrip] =
    useState<MultiStopTrip | null>(null);
  const [loadingMultiStop, setLoadingMultiStop] = useState(false);

  const bookingStore = useBookingStore();
  const multiStopStore = useMultiStopStore();

  // Fetch multi-stop trips for a date
  const fetchMultiStopTripsForDate = useCallback(async (date: string) => {
    setLoadingMultiStop(true);
    try {
      const trips = await getMultiStopTripsForDate(date);
      setMultiStopTrips(trips);
      return trips;
    } catch (error) {
      console.error('Error fetching multi-stop trips:', error);
      return [];
    } finally {
      setLoadingMultiStop(false);
    }
  }, []);

  // Select a multi-stop trip
  const selectMultiStopTrip = useCallback(
    async (trip: MultiStopTrip) => {
      setSelectedMultiStopTrip(trip);
      setIsMultiStopMode(true);

      // Fetch available segments
      await multiStopStore.fetchAvailableSegments(trip.id);
    },
    [multiStopStore]
  );

  // Clear multi-stop selection
  const clearMultiStopSelection = useCallback(() => {
    setSelectedMultiStopTrip(null);
    setIsMultiStopMode(false);
    multiStopStore.selectSegment(null);
  }, [multiStopStore]);

  // Create booking with segment selection
  const createMultiStopBooking = useCallback(
    async (
      segmentSelection: SegmentSelection,
      passengers: any[],
      paymentMethod: string
    ): Promise<any> => {
      try {
        // Validate segment
        const validation = await validateSegment(
          segmentSelection.trip_id,
          segmentSelection.boarding_stop.stop_id,
          segmentSelection.destination_stop.stop_id,
          passengers.length
        );

        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('User authentication required');
        }

        // Create booking
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            trip_id: segmentSelection.trip_id,
            total_fare: segmentSelection.total_fare,
            status: 'pending_payment',
            payment_method_type: paymentMethod,
            is_round_trip: false, // Multi-stop bookings are always one-way
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Create booking stops entry
        const { error: stopsError } = await supabase
          .from('booking_stops')
          .insert({
            booking_id: booking.id,
            boarding_stop_id: segmentSelection.boarding_stop.stop_id,
            destination_stop_id: segmentSelection.destination_stop.stop_id,
            fare_amount: segmentSelection.total_fare,
          });

        if (stopsError) throw stopsError;

        // Create passengers (similar to regular booking)
        const passengersToInsert = passengers.map((passenger, index) => ({
          booking_id: booking.id,
          passenger_name: passenger.fullName,
          passenger_contact_number: passenger.idNumber || passenger.fullName,
          seat_id: passenger.seat_id,
          special_assistance_request: passenger.specialAssistance,
        }));

        const { error: passengersError } = await supabase
          .from('passengers')
          .insert(passengersToInsert);

        if (passengersError) throw passengersError;

        // Generate QR code
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${booking.booking_number}`)}`;

        await supabase
          .from('bookings')
          .update({ qr_code_url: qrCodeUrl })
          .eq('id', booking.id);

        return {
          bookingId: booking.id,
          booking_number: booking.booking_number,
          returnBookingId: null,
        };
      } catch (error) {
        console.error('Error creating multi-stop booking:', error);
        throw error;
      }
    },
    []
  );

  return {
    // State
    isMultiStopMode,
    multiStopTrips,
    selectedMultiStopTrip,
    loadingMultiStop,
    availableSegments: multiStopStore.availableSegments,
    selectedSegment: multiStopStore.selectedSegment,

    // Actions
    setIsMultiStopMode,
    fetchMultiStopTripsForDate,
    selectMultiStopTrip,
    clearMultiStopSelection,
    createMultiStopBooking,
    selectSegment: multiStopStore.selectSegment,
  };
};


