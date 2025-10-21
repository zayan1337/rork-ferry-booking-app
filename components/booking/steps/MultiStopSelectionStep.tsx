/**
 * Multi-Stop Selection Step Component
 *
 * Step in the booking flow for selecting segments on multi-stop trips
 * This is an alternative to the regular route selection for multi-stop journeys
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
import { Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import MultiStopTripCard from '@/components/booking/MultiStopTripCard';
import SegmentSelector from '@/components/booking/SegmentSelector';
import type {
  MultiStopTrip,
  AvailableSegment,
  SegmentSelection,
} from '@/types/multiStopTrip';
import { useMultiStopStore } from '@/store/multiStopStore';
import { getMultiStopTripsForDate } from '@/utils/multiStopTripUtils';

interface MultiStopSelectionStepProps {
  travelDate: string;
  onSegmentSelected: (selection: SegmentSelection) => void;
  onBack: () => void;
  error?: string;
}

export default function MultiStopSelectionStep({
  travelDate,
  onSegmentSelected,
  onBack,
  error: externalError,
}: MultiStopSelectionStepProps) {
  const [availableTrips, setAvailableTrips] = useState<MultiStopTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<MultiStopTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    availableSegments,
    selectedSegment,
    fetchAvailableSegments,
    selectSegment,
    isLoadingSegments,
  } = useMultiStopStore();

  // Fetch multi-stop trips for the selected date
  useEffect(() => {
    if (travelDate) {
      loadMultiStopTrips();
    }
  }, [travelDate]);

  const loadMultiStopTrips = async () => {
    setLoading(true);
    setLocalError(null);

    try {
      const trips = await getMultiStopTripsForDate(travelDate);
      setAvailableTrips(trips);

      if (trips.length === 0) {
        setLocalError('No multi-stop trips available for this date');
      }
    } catch (error) {
      console.error('Error loading multi-stop trips:', error);
      setLocalError('Failed to load multi-stop trips');
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelect = async (trip: MultiStopTrip) => {
    setSelectedTrip(trip);
    setLocalError(null);

    // Fetch available segments for this trip
    await fetchAvailableSegments(trip.id);
  };

  const handleSegmentSelect = (segment: AvailableSegment) => {
    // Create segment selection
    const selection: SegmentSelection = {
      trip_id: selectedTrip!.id,
      boarding_stop: segment.from_stop,
      destination_stop: segment.to_stop,
      fare: segment.fare,
      passenger_count: 1, // Will be updated later
      total_fare: segment.fare, // Will be calculated with passenger count
    };

    selectSegment(selection);
  };

  const handleConfirmSegment = () => {
    if (!selectedSegment) {
      Alert.alert('Error', 'Please select a segment');
      return;
    }

    onSegmentSelected(selectedSegment);
  };

  const handleBackToTrips = () => {
    setSelectedTrip(null);
    selectSegment(null);
  };

  const displayError = externalError || localError;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Info Banner */}
      <Card variant='outlined' style={styles.infoBanner}>
        <View style={styles.infoHeader}>
          <Info size={20} color={Colors.primary} />
          <Text style={styles.infoTitle}>Multi-Stop Journey</Text>
        </View>
        <Text style={styles.infoText}>
          This journey makes multiple stops. Select where you want to board and
          where you want to get off. Fare is calculated based on your segment.
        </Text>
      </Card>

      {/* Error Display */}
      {displayError && (
        <Card variant='outlined' style={styles.errorCard}>
          <Text style={styles.errorText}>{displayError}</Text>
        </Card>
      )}

      {/* Step 1: Trip Selection */}
      {!selectedTrip && (
        <View>
          <Text style={styles.stepTitle}>Select Multi-Stop Trip</Text>

          {loading ? (
            <Card variant='outlined' style={styles.loadingCard}>
              <ActivityIndicator size='large' color={Colors.primary} />
              <Text style={styles.loadingText}>Loading trips...</Text>
            </Card>
          ) : availableTrips.length > 0 ? (
            <View style={styles.tripsContainer}>
              {availableTrips.map(trip => (
                <MultiStopTripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => handleTripSelect(trip)}
                  selected={selectedTrip?.id === trip.id}
                />
              ))}
            </View>
          ) : (
            <Card variant='outlined' style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No Multi-Stop Trips Available
              </Text>
              <Text style={styles.emptyText}>
                There are no multi-stop trips scheduled for {travelDate}. Please
                try a different date or book a regular trip.
              </Text>
            </Card>
          )}
        </View>
      )}

      {/* Step 2: Segment Selection */}
      {selectedTrip && (
        <View>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Select Your Segment</Text>
            <Button
              title='Change Trip'
              onPress={handleBackToTrips}
              variant='outline'
              style={styles.backButton}
            />
          </View>

          <SegmentSelector
            trip={selectedTrip}
            availableSegments={availableSegments}
            selectedSegment={
              selectedSegment
                ? {
                    from_stop: selectedSegment.boarding_stop,
                    to_stop: selectedSegment.destination_stop,
                    fare: selectedSegment.fare,
                    available: true,
                  }
                : null
            }
            onSegmentSelect={handleSegmentSelect}
            isLoading={isLoadingSegments}
          />

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <Button
              title='Back'
              onPress={onBack}
              variant='outline'
              style={styles.navButton}
            />
            <Button
              title='Continue'
              onPress={handleConfirmSegment}
              disabled={!selectedSegment}
              style={styles.navButton}
            />
          </View>
        </View>
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  infoBanner: {
    padding: 12,
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '30',
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  errorCard: {
    padding: 12,
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    minWidth: 100,
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
  tripsContainer: {
    gap: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  navButton: {
    flex: 1,
  },
});
