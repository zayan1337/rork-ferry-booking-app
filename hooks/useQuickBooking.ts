import { useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import type { QuickBookingState } from '@/types/customer';
import { useBookingStore } from '@/store';
import { BOOKING_STEPS } from '@/constants/customer';
import {
  getTripsForSegment,
  findRoutesServingSegment,
} from '@/utils/segmentBookingUtils';
import { supabase } from '@/utils/supabase';

export const useQuickBooking = () => {
  const [quickBookingState, setQuickBookingState] = useState<QuickBookingState>(
    {
      selectedFromIsland: '',
      selectedToIsland: '',
      selectedDate: '',
      errorMessage: '',
    }
  );
  const [isLoading, setIsLoading] = useState(false);

  const { setQuickBookingData, setCurrentStep } = useBookingStore();

  const updateField = useCallback(
    (field: keyof Omit<QuickBookingState, 'errorMessage'>, value: string) => {
      setQuickBookingState(prev => ({
        ...prev,
        [field]: value,
        errorMessage: '', // Clear error when user makes changes
        // Clear destination if departure changes
        ...(field === 'selectedFromIsland' && prev.selectedFromIsland !== value
          ? { selectedToIsland: '' }
          : {}),
      }));
    },
    []
  );

  const setError = useCallback((error: string) => {
    setQuickBookingState(prev => ({
      ...prev,
      errorMessage: error,
    }));
  }, []);

  const clearError = useCallback(() => {
    setQuickBookingState(prev => ({
      ...prev,
      errorMessage: '',
    }));
  }, []);

  const resetForm = useCallback(() => {
    setQuickBookingState({
      selectedFromIsland: '',
      selectedToIsland: '',
      selectedDate: '',
      errorMessage: '',
    });
  }, []);

  const validateAndStartBooking = useCallback(async (): Promise<boolean> => {
    const { selectedFromIsland, selectedToIsland, selectedDate } =
      quickBookingState;

    // Clear any previous error
    setQuickBookingState(prev => ({ ...prev, errorMessage: '' }));

    // Validate that all fields are selected and show specific error messages
    if (!selectedFromIsland) {
      setQuickBookingState(prev => ({
        ...prev,
        errorMessage: 'Please select a departure island',
      }));
      return false;
    }

    if (!selectedToIsland) {
      setQuickBookingState(prev => ({
        ...prev,
        errorMessage: 'Please select a destination island',
      }));
      return false;
    }

    if (!selectedDate) {
      setQuickBookingState(prev => ({
        ...prev,
        errorMessage: 'Please select a travel date',
      }));
      return false;
    }

    setIsLoading(true);
    try {
      // Get island IDs from island names with zone information
      const { data: fromIsland, error: fromError } = await supabase
        .from('islands')
        .select('id, name, zone, zones(code)')
        .eq('name', selectedFromIsland)
        .eq('is_active', true)
        .single();

      const { data: toIsland, error: toError } = await supabase
        .from('islands')
        .select('id, name, zone, zones(code)')
        .eq('name', selectedToIsland)
        .eq('is_active', true)
        .single();

      if (fromError || !fromIsland) {
        setQuickBookingState(prev => ({
          ...prev,
          errorMessage: `Could not find departure island: ${selectedFromIsland}`,
        }));
        return false;
      }

      if (toError || !toIsland) {
        setQuickBookingState(prev => ({
          ...prev,
          errorMessage: `Could not find destination island: ${selectedToIsland}`,
        }));
        return false;
      }

      // Check if trips exist for this segment on the selected date
      // This is the same approach used in the booking page
      const trips = await getTripsForSegment(
        fromIsland.id,
        toIsland.id,
        selectedDate
      );

      // Filter out trips that have already departed
      const currentTime = new Date();
      const futureTrips = trips.filter(trip => {
        const tripDateTime = new Date(
          `${trip.travel_date}T${trip.departure_time}`
        );
        return tripDateTime > currentTime;
      });

      if (futureTrips.length === 0) {
        setQuickBookingState(prev => ({
          ...prev,
          errorMessage: `No ferry trips available from ${selectedFromIsland} to ${selectedToIsland} on ${new Date(selectedDate).toLocaleDateString()}. Please select a different date or destination.`,
        }));
        return false;
      }

      // Get route information for the segment
      const routeSegments = await findRoutesServingSegment(
        fromIsland.id,
        toIsland.id
      );

      if (routeSegments.length === 0) {
        setQuickBookingState(prev => ({
          ...prev,
          errorMessage: `No ferry route available from ${selectedFromIsland} to ${selectedToIsland}. Please select a different destination.`,
        }));
        return false;
      }

      // Use the first route segment to create a Route object
      const firstRouteSegment = routeSegments[0];
      // Get zone code, using zone_info if available, otherwise fallback to zone field
      const fromZone =
        (fromIsland.zones as any)?.code || fromIsland.zone || 'A';
      const toZone = (toIsland.zones as any)?.code || toIsland.zone || 'A';

      const matchingRoute = {
        id: firstRouteSegment.route_id,
        fromIsland: {
          id: fromIsland.id,
          name: fromIsland.name,
          zone: fromZone as 'A' | 'B',
        },
        toIsland: {
          id: toIsland.id,
          name: toIsland.name,
          zone: toZone as 'A' | 'B',
        },
        baseFare: firstRouteSegment.base_fare,
        duration: '2h', // Default duration
      };

      // Use the new function to set quick booking data
      setQuickBookingData(matchingRoute, selectedDate);

      // Set current step to TRIP_SELECTION (skip the island/date step)
      setCurrentStep(BOOKING_STEPS.TRIP_SELECTION);

      // Small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to the booking page
      router.push('/book');
      return true;
    } catch (error) {
      setQuickBookingState(prev => ({
        ...prev,
        errorMessage:
          'An error occurred while setting up your booking. Please try again.',
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [quickBookingState, setQuickBookingData, setCurrentStep]);

  return useMemo(
    () => ({
      quickBookingState,
      updateField,
      setError,
      clearError,
      resetForm,
      validateAndStartBooking,
      isLoading,
    }),
    [
      quickBookingState,
      updateField,
      setError,
      clearError,
      resetForm,
      validateAndStartBooking,
      isLoading,
    ]
  );
};
