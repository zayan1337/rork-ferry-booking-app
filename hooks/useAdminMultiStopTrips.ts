/**
 * Admin Multi-Stop Trips Hook
 *
 * Hook for managing multi-stop trips in admin interface
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useMultiStopStore } from '@/store/multiStopStore';
import type { MultiStopTrip } from '@/types/multiStopTrip';
import {
  getMultiStopTrip,
  getMultiStopTripsForDate,
} from '@/utils/multiStopTripUtils';

export const useAdminMultiStopTrips = () => {
  const [multiStopTrips, setMultiStopTrips] = useState<MultiStopTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const multiStopStore = useMultiStopStore();

  // Fetch all multi-stop trips (optionally filtered by date)
  const fetchMultiStopTrips = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);

    try {
      if (date) {
        const trips = await getMultiStopTripsForDate(date);
        setMultiStopTrips(trips);
      } else {
        // Fetch all multi-stop trips
        const { data, error: fetchError } = await supabase
          .from('multi_stop_trips_view')
          .select('*')
          .order('travel_date', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        const trips = (data || []).map(trip => ({
          id: trip.trip_id,
          travel_date: trip.travel_date,
          departure_time: trip.departure_time,
          status: trip.status,
          is_multi_stop: trip.is_multi_stop,
          current_stop_sequence: trip.current_stop_sequence,
          current_stop_id: trip.current_stop_id,
          vessel_name: trip.vessel_name,
          seating_capacity: trip.seating_capacity,
          stops: trip.stops || [],
          total_stops: trip.stops?.length || 0,
          completed_stops:
            trip.stops?.filter((s: any) => s.status === 'completed').length ||
            0,
          route_id: '',
          vessel_id: '',
          available_seats: 0,
          is_active: true,
          // Add missing properties
          estimated_duration: trip.estimated_duration || '0h',
          booked_seats: trip.booked_seats || 0,
          fare_multiplier: trip.fare_multiplier || 1.0,
          created_at: trip.created_at || new Date().toISOString(),
          updated_at: trip.updated_at || new Date().toISOString(),
        })) as MultiStopTrip[];

        setMultiStopTrips(trips);
      }
    } catch (error) {
      console.error('Error fetching multi-stop trips:', error);
      setError('Failed to fetch multi-stop trips');
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a multi-stop trip
  const deleteTrip = useCallback(
    async (tripId: string): Promise<boolean> => {
      try {
        // Check if trip has bookings
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('trip_id', tripId)
          .in('status', ['confirmed', 'checked_in']);

        if (bookingsError) throw bookingsError;

        if (bookings && bookings.length > 0) {
          throw new Error('Cannot delete trip with confirmed bookings');
        }

        // Delete trip (cascades to stops and fares)
        const { error: deleteError } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripId);

        if (deleteError) throw deleteError;

        // Refresh list
        await fetchMultiStopTrips();

        return true;
      } catch (error: any) {
        console.error('Error deleting trip:', error);
        setError(error.message || 'Failed to delete trip');
        return false;
      }
    },
    [fetchMultiStopTrips]
  );

  // Get trip details
  const getTripDetails = useCallback(
    async (tripId: string): Promise<MultiStopTrip | null> => {
      try {
        return await getMultiStopTrip(tripId);
      } catch (error) {
        console.error('Error getting trip details:', error);
        return null;
      }
    },
    []
  );

  // Update trip status
  const updateTripStatus = useCallback(
    async (tripId: string, status: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('trips')
          .update({ status })
          .eq('id', tripId);

        if (error) throw error;

        await fetchMultiStopTrips();
        return true;
      } catch (error) {
        console.error('Error updating trip status:', error);
        setError('Failed to update trip status');
        return false;
      }
    },
    [fetchMultiStopTrips]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    multiStopTrips,
    loading,
    error,
    fetchMultiStopTrips,
    deleteTrip,
    getTripDetails,
    updateTripStatus,
    clearError,
    createMultiStopTrip: multiStopStore.createMultiStopTrip,
  };
};
