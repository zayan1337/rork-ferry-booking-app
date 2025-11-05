/**
 * Multi-Stop Trip Details Component
 *
 * Enhanced trip details for multi-stop journeys
 * Shows stop-by-stop navigation and passenger management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Navigation, AlertCircle, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import MultiStopProgress from './MultiStopProgress';
import StopPassengerList from './StopPassengerList';
import type {
  MultiStopTrip,
  TripStop,
  StopPassengerInfo,
} from '@/types/multiStopTrip';
import { getStopPassengerInfo } from '@/utils/multiStopTripUtils';
import { useMultiStopStore } from '@/store/multiStopStore';
import { CaptainRouteStop } from '@/types/captain';

// Convert TripStop[] to CaptainRouteStop[]
function convertTripStopsToCaptainRouteStops(
  tripStops: TripStop[]
): CaptainRouteStop[] {
  return tripStops.map(stop => ({
    id: stop.id,
    stop_id: stop.id, // Required field
    stop_sequence: stop.stop_sequence,
    island: {
      id: stop.island_id,
      name: stop.island_name,
      zone: stop.zone || '',
    },
    is_current_stop: stop.status === 'active',
    is_completed: stop.status === 'completed',
    boarding_passengers: [],
    dropoff_passengers: [],
  }));
}

interface MultiStopTripDetailsProps {
  trip: MultiStopTrip;
  captainId: string;
  onRefresh: () => void;
}

export default function MultiStopTripDetails({
  trip,
  captainId,
  onRefresh,
}: MultiStopTripDetailsProps) {
  const [currentStop, setCurrentStop] = useState<TripStop | null>(null);
  const [boardingInfo, setBoardingInfo] = useState<StopPassengerInfo | null>(
    null
  );
  const [dropoffInfo, setDropoffInfo] = useState<StopPassengerInfo | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const { completeBoarding, moveToNextStop } = useMultiStopStore();

  // Load current stop details
  useEffect(() => {
    if (trip.current_stop_id) {
      loadCurrentStop();
    } else if (trip.stops.length > 0) {
      // If no current stop set, use first stop
      setCurrentStop(trip.stops[0]);
    }
  }, [trip.current_stop_id, trip.stops]);

  // Load passengers for current stop
  useEffect(() => {
    if (currentStop) {
      loadStopPassengers();
    }
  }, [currentStop?.id]);

  const loadCurrentStop = () => {
    const stop = trip.stops.find(s => s.id === trip.current_stop_id);
    setCurrentStop(stop || null);
  };

  const loadStopPassengers = async () => {
    if (!currentStop) return;

    setLoading(true);
    try {
      const info = await getStopPassengerInfo(trip.id, currentStop.id);
      setBoardingInfo(info.boarding);
      setDropoffInfo(info.dropoff);
    } catch (error) {
      console.error('Error loading stop passengers:', error);
      Alert.alert('Error', 'Failed to load passenger information');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBoarding = async () => {
    if (!currentStop) return;

    const boardingCount = boardingInfo?.total_count || 0;
    const dropoffCount = dropoffInfo?.total_count || 0;
    const boardingCheckedIn = boardingInfo?.checked_in_count || 0;
    const dropoffProcessed = dropoffInfo?.checked_in_count || 0;

    Alert.alert(
      'Complete Boarding',
      `Complete boarding at ${currentStop.island_name}?\n\n` +
        `Boarding: ${boardingCheckedIn}/${boardingCount}\n` +
        `Dropping Off: ${dropoffProcessed}/${dropoffCount}\n\n` +
        `This will move to the next stop.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete & Depart',
          style: 'destructive',
          onPress: async () => {
            const success = await completeBoarding(currentStop.id, captainId);

            if (success) {
              // Move to next stop
              const nextSuccess = await moveToNextStop(trip.id);

              if (nextSuccess) {
                Alert.alert(
                  'Success',
                  `Departed from ${currentStop.island_name}`,
                  [{ text: 'OK', onPress: onRefresh }]
                );
              }
            } else {
              Alert.alert('Error', 'Failed to complete boarding');
            }
          },
        },
      ]
    );
  };

  const handleCheckInPassenger = (passengerId: string, bookingId: string) => {
    // TODO: Implement direct passenger check-in
    Alert.alert('Check In', 'Use the QR scanner to check in passengers', [
      { text: 'OK' },
    ]);
  };

  if (!currentStop) {
    return (
      <Card style={styles.errorCard}>
        <AlertCircle size={24} color={Colors.error} />
        <Text style={styles.errorText}>
          No current stop information available
        </Text>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Trip Progress */}
      <MultiStopProgress
        stops={convertTripStopsToCaptainRouteStops(trip.stops || [])}
        currentStopSequence={trip.current_stop_sequence}
        totalStops={trip.total_stops}
        showPassengerCounts={true}
      />

      {/* Current Stop Info */}
      <Card style={styles.currentStopCard}>
        <View style={styles.currentStopHeader}>
          <View style={styles.currentStopIcon}>
            <Navigation size={24} color='white' />
          </View>
          <View style={styles.currentStopInfo}>
            <Text style={styles.currentStopLabel}>Currently At</Text>
            <Text style={styles.currentStopName}>
              {currentStop.island_name}
            </Text>
            <Text style={styles.currentStopMeta}>
              Stop {currentStop.stop_sequence} of {trip.stops.length} •{' '}
              {currentStop.stop_type}
            </Text>
          </View>
        </View>

        {currentStop.estimated_departure_time && (
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Estimated Departure:</Text>
            <Text style={styles.timeValue}>
              {currentStop.estimated_departure_time}
            </Text>
          </View>
        )}
      </Card>

      {/* Loading State */}
      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size='large' color={Colors.primary} />
          <Text style={styles.loadingText}>Loading passengers...</Text>
        </Card>
      ) : (
        <>
          {/* Boarding Passengers */}
          {boardingInfo && (
            <StopPassengerList
              passengerInfo={boardingInfo}
              onCheckIn={handleCheckInPassenger}
              showActions={true}
            />
          )}

          {/* Dropping Off Passengers */}
          {dropoffInfo && dropoffInfo.total_count > 0 && (
            <StopPassengerList
              passengerInfo={dropoffInfo}
              showActions={false}
            />
          )}

          {/* Action Button */}
          {trip.status === 'boarding' && !currentStop.boarding_completed && (
            <Card style={styles.actionCard}>
              <Button
                title={`Complete Boarding & Depart from ${currentStop.island_name}`}
                onPress={handleCompleteBoarding}
                icon={<Navigation size={18} color='white' />}
              />

              <Text style={styles.actionHint}>
                This will mark boarding as complete and move to the next stop
              </Text>
            </Card>
          )}

          {currentStop.boarding_completed && (
            <Card style={styles.completedCard}>
              <CheckCircle size={24} color={Colors.success} />
              <Text style={styles.completedText}>
                Boarding completed at this stop
              </Text>
              <Text style={styles.completedTime}>
                {currentStop.boarding_completed_at &&
                  new Date(
                    currentStop.boarding_completed_at
                  ).toLocaleTimeString()}
              </Text>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currentStopCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  currentStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentStopIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentStopInfo: {
    flex: 1,
  },
  currentStopLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  currentStopName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  currentStopMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingCard: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionCard: {
    padding: 16,
    marginBottom: 16,
  },
  actionHint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completedCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
    marginBottom: 16,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 8,
  },
  completedTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 8,
    textAlign: 'center',
  },
});
