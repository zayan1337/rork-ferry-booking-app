import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAgentBookingFormStore } from '@/store/agent/agentBookingFormStore';
import Colors from '@/constants/colors';
import { useAlertContext } from '@/components/AlertProvider';
import SegmentTripCard from '@/components/booking/SegmentTripCard';
import { getTripsForSegment } from '@/utils/segmentBookingUtils';
import { AGENT_TRIP_TYPES } from '@/constants/agent';
import {
  isTripBookable,
  isTripStatusBookable,
  validateTripForBooking,
} from '@/utils/bookingUtils';
import { AGENT_BOOKING_BUFFER_MINUTES } from '@/constants/agent';
import type { Trip } from '@/types/operations';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

const normalizeTripData = (tripData: any): Trip => {
  const now = new Date().toISOString();
  return {
    id: tripData.trip_id,
    route_id: tripData.route_id,
    vessel_id: tripData.vessel_id,
    travel_date: tripData.travel_date,
    departure_time: tripData.departure_time,
    arrival_time: tripData.arrival_time || null,
    estimated_duration:
      tripData.estimated_duration ||
      tripData.estimated_travel_time ||
      tripData.duration ||
      '',
    status: tripData.status || 'scheduled',
    available_seats: Number(tripData.available_seats ?? 0),
    booked_seats: Number(tripData.booked_seats ?? 0),
    fare_multiplier: Number(tripData.fare_multiplier ?? 1),
    delay_reason: tripData.delay_reason,
    weather_conditions: tripData.weather_conditions,
    notes: tripData.notes,
    created_at: tripData.created_at || now,
    updated_at: tripData.updated_at || now,
    is_active: tripData.is_active,
  };
};

export default function AgentTripSelectionStep() {
  const { showError, showWarning } = useAlertContext();
  const {
    currentBooking,
    setTrip,
    setReturnTrip,
    setBoardingStop,
    setDestinationStop,
    setReturnBoardingStop,
    setReturnDestinationStop,
    setSegmentFare,
    setReturnSegmentFare,
    setRoute,
    setReturnRoute,
  } = useAgentBookingFormStore();

  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [returnAvailableTrips, setReturnAvailableTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    // Clear previous trips immediately when route changes
    setAvailableTrips([]);
    setReturnAvailableTrips([]);

    try {
      // Load departure trips
      if (
        currentBooking.boardingIslandId &&
        currentBooking.destinationIslandId &&
        currentBooking.departureDate
      ) {
        const trips = await getTripsForSegment(
          currentBooking.boardingIslandId,
          currentBooking.destinationIslandId,
          currentBooking.departureDate
        );
        // Filter trips: must be scheduled status and bookable (buffer minutes)
        const bookableTrips = trips.filter((trip: any) => {
          // Check status first
          if (!isTripStatusBookable(trip.status)) {
            return false;
          }
          // Check if trip is bookable based on time (buffer minutes)
          return isTripBookable(
            trip.travel_date,
            trip.departure_time,
            AGENT_BOOKING_BUFFER_MINUTES
          );
        });
        setAvailableTrips(bookableTrips);
      } else {
        // Clear trips if required data is missing
        setAvailableTrips([]);
      }

      // Load return trips if round trip
      if (
        currentBooking.tripType === AGENT_TRIP_TYPES.ROUND_TRIP &&
        currentBooking.returnBoardingIslandId &&
        currentBooking.returnDestinationIslandId &&
        currentBooking.returnDate
      ) {
        const returnTrips = await getTripsForSegment(
          currentBooking.returnBoardingIslandId,
          currentBooking.returnDestinationIslandId,
          currentBooking.returnDate
        );
        // Filter return trips: must be scheduled status and bookable (buffer minutes)
        const bookableReturnTrips = returnTrips.filter((trip: any) => {
          // Check status first
          if (!isTripStatusBookable(trip.status)) {
            return false;
          }
          // Check if trip is bookable based on time (buffer minutes)
          return isTripBookable(
            trip.travel_date,
            trip.departure_time,
            AGENT_BOOKING_BUFFER_MINUTES
          );
        });
        setReturnAvailableTrips(bookableReturnTrips);
      } else {
        // Clear return trips if not round trip or data is missing
        setReturnAvailableTrips([]);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      showError('Error', 'Failed to load trips');
      // Clear trips on error
      setAvailableTrips([]);
      setReturnAvailableTrips([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentBooking.boardingIslandId,
    currentBooking.destinationIslandId,
    currentBooking.departureDate,
    currentBooking.returnBoardingIslandId,
    currentBooking.returnDestinationIslandId,
    currentBooking.returnDate,
    currentBooking.tripType,
    showError,
  ]);

  // Re-fetch trips when booking data changes (route, date, etc.)
  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleTripSelect = (tripData: any) => {
    // Comprehensive validation
    const validation = validateTripForBooking(
      {
        travel_date: tripData.travel_date,
        departure_time: tripData.departure_time,
        status: tripData.status,
      },
      AGENT_BOOKING_BUFFER_MINUTES
    );

    if (!validation.isValid) {
      showWarning(
        'Trip Unavailable',
        validation.error || 'This trip cannot be booked.'
      );
      return;
    }

    // Create route object
    const route = {
      id: tripData.route_id,
      fromIsland: {
        id: currentBooking.boardingIslandId!,
        name: currentBooking.boardingIslandName!,
        zone: 'A' as const,
      },
      toIsland: {
        id: currentBooking.destinationIslandId!,
        name: currentBooking.destinationIslandName!,
        zone: 'A' as const,
      },
      baseFare: tripData.segment_fare,
      base_fare: tripData.segment_fare, // Also include snake_case for compatibility
    };
    setRoute(route);

    // Set stops
    setBoardingStop({
      id: tripData.boarding_stop_id,
      route_id: tripData.route_id,
      island_id: currentBooking.boardingIslandId!,
      island_name: currentBooking.boardingIslandName!,
      stop_sequence: tripData.boarding_stop_sequence,
      stop_type: 'pickup' as const,
      estimated_travel_time_from_previous: null,
      notes: null,
      created_at: '',
      updated_at: '',
    });

    setDestinationStop({
      id: tripData.destination_stop_id,
      route_id: tripData.route_id,
      island_id: currentBooking.destinationIslandId!,
      island_name: currentBooking.destinationIslandName!,
      stop_sequence: tripData.destination_stop_sequence,
      stop_type: 'dropoff' as const,
      estimated_travel_time_from_previous: null,
      notes: null,
      created_at: '',
      updated_at: '',
    });

    setSegmentFare(tripData.segment_fare);

    // Create trip object
    const trip = normalizeTripData(tripData);
    setTrip(trip);
  };

  const handleReturnTripSelect = (tripData: any) => {
    // Comprehensive validation
    const validation = validateTripForBooking(
      {
        travel_date: tripData.travel_date,
        departure_time: tripData.departure_time,
        status: tripData.status,
      },
      AGENT_BOOKING_BUFFER_MINUTES
    );

    if (!validation.isValid) {
      showWarning(
        'Trip Unavailable',
        validation.error || 'This trip cannot be booked.'
      );
      return;
    }

    // Create return route object
    const route = {
      id: tripData.route_id,
      fromIsland: {
        id: currentBooking.returnBoardingIslandId!,
        name: currentBooking.returnBoardingIslandName!,
        zone: 'A' as const,
      },
      toIsland: {
        id: currentBooking.returnDestinationIslandId!,
        name: currentBooking.returnDestinationIslandName!,
        zone: 'A' as const,
      },
      baseFare: tripData.segment_fare,
      base_fare: tripData.segment_fare, // Also include snake_case for compatibility
    };
    setReturnRoute(route);

    // Set return stops
    setReturnBoardingStop({
      id: tripData.boarding_stop_id,
      route_id: tripData.route_id,
      island_id: currentBooking.returnBoardingIslandId!,
      island_name: currentBooking.returnBoardingIslandName!,
      stop_sequence: tripData.boarding_stop_sequence,
      stop_type: 'pickup' as const,
      estimated_travel_time_from_previous: null,
      notes: null,
      created_at: '',
      updated_at: '',
    });

    setReturnDestinationStop({
      id: tripData.destination_stop_id,
      route_id: tripData.route_id,
      island_id: currentBooking.returnDestinationIslandId!,
      island_name: currentBooking.returnDestinationIslandName!,
      stop_sequence: tripData.destination_stop_sequence,
      stop_type: 'dropoff' as const,
      estimated_travel_time_from_previous: null,
      notes: null,
      created_at: '',
      updated_at: '',
    });

    setReturnSegmentFare(tripData.segment_fare);

    // Create return trip object
    const trip = normalizeTripData(tripData);
    setReturnTrip(trip);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Finding available trips...</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.stepTitle}>Select Your Trip</Text>

      {availableTrips.length > 0 ? (
        <View style={styles.tripsList}>
          {availableTrips.map(trip => (
            <SegmentTripCard
              key={trip.trip_id}
              trip={trip}
              selected={currentBooking.trip?.id === trip.trip_id}
              onPress={() => handleTripSelect(trip)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.noTripsContainer}>
          <Text style={styles.noTripsTitle}>No Trips Available</Text>
          <Text style={styles.noTripsText}>
            No trips available for this route on{' '}
            {currentBooking.departureDate &&
              formatDateInMaldives(currentBooking.departureDate, 'short-date')}
            .{'\n\n'}
            Please try selecting a different date or route.
          </Text>
        </View>
      )}

      {/* Return Trips (if round trip) */}
      {currentBooking.tripType === AGENT_TRIP_TYPES.ROUND_TRIP && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>
            Return: {currentBooking.returnBoardingIslandName} →{' '}
            {currentBooking.returnDestinationIslandName}
          </Text>

          {returnAvailableTrips.length > 0 ? (
            <View style={styles.tripsList}>
              {returnAvailableTrips.map(trip => (
                <SegmentTripCard
                  key={trip.trip_id}
                  trip={trip}
                  selected={currentBooking.returnTrip?.id === trip.trip_id}
                  onPress={() => handleReturnTripSelect(trip)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.noTripsContainer}>
              <Text style={styles.noTripsTitle}>No Return Trips Available</Text>
              <Text style={styles.noTripsText}>
                No return trips available for this route on{' '}
                {currentBooking.returnDate &&
                  formatDateInMaldives(currentBooking.returnDate, 'short-date')}
                .{'\n\n'}
                Please try selecting a different date or route.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  tripsList: {
    gap: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  noTripsContainer: {
    padding: 24,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  noTripsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  noTripsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
});
