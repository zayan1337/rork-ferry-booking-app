import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useBookingStore } from '@/store';
import Colors from '@/constants/colors';
import SegmentTripCard from '@/components/booking/SegmentTripCard';
import { getTripsForSegment } from '@/utils/segmentBookingUtils';
import { TRIP_TYPES } from '@/constants/customer';
import {
  isTripBookable,
  getTripUnavailableMessage,
} from '@/utils/bookingUtils';

export default function TripSelectionStep() {
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
  } = useBookingStore();

  const [availableTrips, setAvailableTrips] = useState<any[]>([]);
  const [returnAvailableTrips, setReturnAvailableTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
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
        setAvailableTrips(trips);
      }

      // Load return trips if round trip
      if (
        currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
        currentBooking.returnBoardingIslandId &&
        currentBooking.returnDestinationIslandId &&
        currentBooking.returnDate
      ) {
        const returnTrips = await getTripsForSegment(
          currentBooking.returnBoardingIslandId,
          currentBooking.returnDestinationIslandId,
          currentBooking.returnDate
        );
        setReturnAvailableTrips(returnTrips);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelect = (tripData: any) => {
    // Validate trip hasn't departed
    if (!isTripBookable(tripData.travel_date, tripData.departure_time)) {
      Alert.alert(
        'Trip Unavailable',
        getTripUnavailableMessage(tripData.travel_date, tripData.departure_time)
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
    const trip = {
      id: tripData.trip_id,
      route_id: tripData.route_id,
      travel_date: tripData.travel_date,
      departure_time: tripData.departure_time,
      vessel_id: tripData.vessel_id,
      vessel_name: tripData.vessel_name,
      available_seats: tripData.available_seats,
      is_active: tripData.is_active,
      base_fare: tripData.segment_fare,
      fare_multiplier: 1.0,
    };
    setTrip(trip);
  };

  const handleReturnTripSelect = (tripData: any) => {
    // Validate trip hasn't departed
    if (!isTripBookable(tripData.travel_date, tripData.departure_time)) {
      Alert.alert(
        'Trip Unavailable',
        getTripUnavailableMessage(tripData.travel_date, tripData.departure_time)
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
    const trip = {
      id: tripData.trip_id,
      route_id: tripData.route_id,
      travel_date: tripData.travel_date,
      departure_time: tripData.departure_time,
      vessel_id: tripData.vessel_id,
      vessel_name: tripData.vessel_name,
      available_seats: tripData.available_seats,
      is_active: tripData.is_active,
      base_fare: tripData.segment_fare,
      fare_multiplier: 1.0,
    };
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
              new Date(currentBooking.departureDate).toLocaleDateString()}
            .{'\n\n'}
            Please try selecting a different date or route.
          </Text>
        </View>
      )}

      {/* Return Trips (if round trip) */}
      {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
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
                  new Date(currentBooking.returnDate).toLocaleDateString()}
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
