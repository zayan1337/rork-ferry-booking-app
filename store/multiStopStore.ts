/**
 * Multi-Stop Trip Store
 *
 * Zustand store for managing multi-stop trip state and operations
 */

import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { getMaldivesTodayString } from '@/utils/timezoneUtils';
import type {
  MultiStopTrip,
  TripStop,
  SegmentSelection,
  MultiStopStoreState,
  MultiStopStoreActions,
  StopStatus,
} from '@/types/multiStopTrip';
import {
  getTripStops,
  getAvailableSegments,
  getMultiStopTrip,
  getMultiStopTripsForDate,
  completeStopBoarding,
  moveToNextStop as moveToNextStopUtil,
  createTripStops,
  updateTripStop as updateTripStopUtil,
  deleteTripStop as deleteTripStopUtil,
  reorderTripStops,
} from '@/utils/multiStopTripUtils';
import {
  generateStopFares,
  generateCustomStopFares,
} from '@/utils/multiStopFareUtils';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MultiStopStoreState = {
  multiStopTrips: [],
  selectedTrip: null,
  tripStops: new Map(),
  availableSegments: [],
  selectedSegment: null,
  isLoading: false,
  isLoadingStops: false,
  isLoadingSegments: false,
  error: null,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useMultiStopStore = create<
  MultiStopStoreState & MultiStopStoreActions
>((set, get) => ({
  ...initialState,

  // ========================================================================
  // FETCH OPERATIONS
  // ========================================================================

  fetchMultiStopTrips: async (date?: string) => {
    set({ isLoading: true, error: null });

    try {
      const targetDate = date || getMaldivesTodayString();
      const trips = await getMultiStopTripsForDate(targetDate);

      set({ multiStopTrips: trips });
    } catch (error) {
      console.error('Error fetching multi-stop trips:', error);
      set({ error: 'Failed to fetch multi-stop trips' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTripStops: async (tripId: string) => {
    set({ isLoadingStops: true, error: null });

    try {
      const stops = await getTripStops(tripId);

      // Update the map
      set(state => ({
        tripStops: new Map(state.tripStops).set(tripId, stops),
      }));

      return stops;
    } catch (error) {
      console.error('Error fetching trip stops:', error);
      set({ error: 'Failed to fetch trip stops' });
      return [];
    } finally {
      set({ isLoadingStops: false });
    }
  },

  fetchAvailableSegments: async (tripId: string) => {
    set({ isLoadingSegments: true, error: null });

    try {
      const segments = await getAvailableSegments(tripId);
      set({ availableSegments: segments });
      return segments;
    } catch (error) {
      console.error('Error fetching available segments:', error);
      set({ error: 'Failed to fetch available segments' });
      return [];
    } finally {
      set({ isLoadingSegments: false });
    }
  },

  fetchStopFares: async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('stop_fares')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stop fares:', error);
      return [];
    }
  },

  // ========================================================================
  // SELECTION OPERATIONS
  // ========================================================================

  selectTrip: (trip: MultiStopTrip | null) => {
    set({ selectedTrip: trip, availableSegments: [], selectedSegment: null });

    if (trip) {
      // Auto-fetch segments for selected trip
      get().fetchAvailableSegments(trip.id);
      get().fetchTripStops(trip.id);
    }
  },

  selectSegment: (segment: SegmentSelection | null) => {
    set({ selectedSegment: segment });
  },

  // ========================================================================
  // CAPTAIN OPERATIONS
  // ========================================================================

  completeBoarding: async (stopId: string, captainId: string) => {
    try {
      const success = await completeStopBoarding(stopId, captainId);

      if (success) {
        // Refresh stops for the current trip
        const { selectedTrip } = get();
        if (selectedTrip) {
          await get().fetchTripStops(selectedTrip.id);
        }
      }

      return success;
    } catch (error) {
      console.error('Error completing boarding:', error);
      set({ error: 'Failed to complete boarding' });
      return false;
    }
  },

  moveToNextStop: async (tripId: string) => {
    try {
      const success = await moveToNextStopUtil(tripId);

      if (success) {
        // Refresh trip data
        const trip = await getMultiStopTrip(tripId);
        if (trip) {
          set({ selectedTrip: trip });
          await get().fetchTripStops(tripId);
        }
      }

      return success;
    } catch (error) {
      console.error('Error moving to next stop:', error);
      set({ error: 'Failed to move to next stop' });
      return false;
    }
  },

  updateStopStatus: async (stopId: string, status: StopStatus) => {
    try {
      const success = await updateTripStopUtil(stopId, { status });

      if (success) {
        // Refresh stops
        const { selectedTrip } = get();
        if (selectedTrip) {
          await get().fetchTripStops(selectedTrip.id);
        }
      }

      return success;
    } catch (error) {
      console.error('Error updating stop status:', error);
      set({ error: 'Failed to update stop status' });
      return false;
    }
  },

  // ========================================================================
  // ADMIN OPERATIONS
  // ========================================================================

  createMultiStopTrip: async (formData: any) => {
    set({ isLoading: true, error: null });

    try {
      // 1. Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          route_id: null, // Multi-stop trips don't have a single route
          vessel_id: formData.vessel_id,
          travel_date: formData.travel_date,
          departure_time: formData.departure_time,
          arrival_time: formData.arrival_time,
          is_multi_stop: true,
          is_active: true,
          status: 'scheduled',
          fare_multiplier: formData.fare_multiplier || 1.0,
          captain_id: formData.captain_id,
          notes: formData.notes,
          available_seats: 0, // Will be calculated
        })
        .select()
        .single();

      if (tripError) throw tripError;
      if (!trip) throw new Error('Failed to create trip');

      // 2. Create stops
      const createdStops = await createTripStops(trip.id, formData.stops);

      // 3. Generate fare matrix (custom or auto)
      let fareSuccess = false;

      if (formData.customFareMatrix && formData.customFareMatrix.size > 0) {
        // Use custom fares - need to map indices to stop IDs
        const customFaresByStopId = new Map<string, number>();

        formData.customFareMatrix.forEach((fare: number, key: string) => {
          const [fromIndex, toIndex] = key.split('-').map(Number);
          const fromStopId = createdStops[fromIndex]?.id;
          const toStopId = createdStops[toIndex]?.id;

          if (fromStopId && toStopId) {
            customFaresByStopId.set(`${fromStopId}-${toStopId}`, fare);
          }
        });

        fareSuccess = await generateCustomStopFares(
          trip.id,
          customFaresByStopId
        );
      } else {
        // Fallback to auto-generate based on base fare
        fareSuccess = await generateStopFares(
          trip.id,
          createdStops,
          formData.base_fare_per_stop || 50
        );
      }

      if (!fareSuccess) {
        throw new Error('Failed to generate fares');
      }

      // 4. Set initial current stop
      const firstStop = createdStops.find(s => s.stop_sequence === 1);
      if (firstStop) {
        await supabase
          .from('trips')
          .update({
            current_stop_id: firstStop.id,
            current_stop_sequence: 1,
          })
          .eq('id', trip.id);
      }

      // 5. Calculate available seats based on vessel capacity
      const { data: vessel } = await supabase
        .from('vessels')
        .select('seating_capacity')
        .eq('id', formData.vessel_id)
        .single();

      if (vessel) {
        await supabase
          .from('trips')
          .update({ available_seats: vessel.seating_capacity })
          .eq('id', trip.id);
      }

      set({ isLoading: false });
      return trip.id;
    } catch (error) {
      console.error('Error creating multi-stop trip:', error);
      set({ error: 'Failed to create multi-stop trip', isLoading: false });
      throw error;
    }
  },

  updateTripStop: async (stopId: string, data: Partial<TripStop>) => {
    try {
      const success = await updateTripStopUtil(stopId, data);

      if (success) {
        // Refresh stops
        const { selectedTrip } = get();
        if (selectedTrip) {
          await get().fetchTripStops(selectedTrip.id);
        }
      }

      return success;
    } catch (error) {
      console.error('Error updating trip stop:', error);
      set({ error: 'Failed to update trip stop' });
      return false;
    }
  },

  deleteTripStop: async (stopId: string) => {
    try {
      const success = await deleteTripStopUtil(stopId);

      if (success) {
        // Refresh stops
        const { selectedTrip } = get();
        if (selectedTrip) {
          await get().fetchTripStops(selectedTrip.id);
        }
      }

      return success;
    } catch (error) {
      console.error('Error deleting trip stop:', error);
      set({ error: 'Failed to delete trip stop' });
      return false;
    }
  },

  reorderStops: async (tripId: string, stopIds: string[]) => {
    try {
      const success = await reorderTripStops(tripId, stopIds);

      if (success) {
        await get().fetchTripStops(tripId);
      }

      return success;
    } catch (error) {
      console.error('Error reordering stops:', error);
      set({ error: 'Failed to reorder stops' });
      return false;
    }
  },

  generateStopFares: async (tripId: string, baseFare: number) => {
    try {
      const stops = await getTripStops(tripId);
      const success = await generateStopFares(tripId, stops, baseFare);
      return success;
    } catch (error) {
      console.error('Error generating stop fares:', error);
      set({ error: 'Failed to generate stop fares' });
      return false;
    }
  },

  // ========================================================================
  // UTILITY OPERATIONS
  // ========================================================================

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

// ============================================================================
// EXPORT
// ============================================================================

export default useMultiStopStore;
