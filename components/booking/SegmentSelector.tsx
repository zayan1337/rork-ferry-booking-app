/**
 * Segment Selector Component
 *
 * Allows customers to select boarding and destination stops
 * for multi-stop trips
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Navigation, DollarSign } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Dropdown from '@/components/Dropdown';
import type {
  AvailableSegment,
  StopOption,
  MultiStopTrip,
} from '@/types/multiStopTrip';

interface SegmentSelectorProps {
  trip: MultiStopTrip;
  availableSegments: AvailableSegment[];
  selectedSegment: AvailableSegment | null;
  onSegmentSelect: (segment: AvailableSegment) => void;
  isLoading?: boolean;
  error?: string;
}

export default function SegmentSelector({
  trip,
  availableSegments,
  selectedSegment,
  onSegmentSelect,
  isLoading = false,
  error,
}: SegmentSelectorProps) {
  const [selectedBoarding, setSelectedBoarding] = useState<StopOption | null>(
    null
  );
  const [selectedDestination, setSelectedDestination] =
    useState<StopOption | null>(null);
  const [destinationOptions, setDestinationOptions] = useState<StopOption[]>(
    []
  );

  // Get unique boarding stops
  const boardingStops = Array.from(
    new Map(
      availableSegments.map(seg => [seg.from_stop.stop_id, seg.from_stop])
    ).values()
  );

  // Update destination options when boarding stop changes
  useEffect(() => {
    if (selectedBoarding) {
      const destinations = availableSegments
        .filter(seg => seg.from_stop.stop_id === selectedBoarding.stop_id)
        .map(seg => seg.to_stop);

      setDestinationOptions(destinations);

      // Reset destination if it's not valid for new boarding stop
      if (selectedDestination) {
        const isValidDestination = destinations.some(
          d => d.stop_id === selectedDestination.stop_id
        );
        if (!isValidDestination) {
          setSelectedDestination(null);
        }
      }
    } else {
      setDestinationOptions([]);
      setSelectedDestination(null);
    }
  }, [selectedBoarding, availableSegments]);

  // Update selected segment when both stops are selected
  useEffect(() => {
    if (selectedBoarding && selectedDestination) {
      const segment = availableSegments.find(
        seg =>
          seg.from_stop.stop_id === selectedBoarding.stop_id &&
          seg.to_stop.stop_id === selectedDestination.stop_id
      );

      if (segment) {
        onSegmentSelect(segment);
      }
    }
  }, [
    selectedBoarding,
    selectedDestination,
    availableSegments,
    onSegmentSelect,
  ]);

  // Sync with external selection
  useEffect(() => {
    if (selectedSegment) {
      setSelectedBoarding(selectedSegment.from_stop);
      setSelectedDestination(selectedSegment.to_stop);
    }
  }, [selectedSegment]);

  const formatStopOption = (stop: StopOption) => {
    return `Stop ${stop.stop_sequence}: ${stop.island_name}${stop.estimated_time ? ` (${stop.estimated_time})` : ''}`;
  };

  if (isLoading) {
    return (
      <Card variant='outlined' style={styles.loadingCard}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Loading segments...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant='outlined' style={styles.errorCard}>
        <Text style={styles.errorText}>{error}</Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Trip Route Overview */}
      <Card variant='outlined' style={styles.routeCard}>
        <View style={styles.routeHeader}>
          <Navigation size={20} color={Colors.primary} />
          <Text style={styles.routeTitle}>Multi-Stop Journey</Text>
        </View>

        <View style={styles.stopsTimeline}>
          {trip.stops.map((stop, index) => (
            <View key={stop.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <View
                  style={[
                    styles.dotInner,
                    (selectedBoarding?.stop_id === stop.id ||
                      selectedDestination?.stop_id === stop.id) &&
                      styles.dotActive,
                  ]}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.stopName}>{stop.island_name}</Text>
                <Text style={styles.stopMeta}>
                  Stop {stop.stop_sequence} • {stop.stop_type}
                </Text>
                {stop.estimated_arrival_time && (
                  <Text style={styles.stopTime}>
                    Arr: {stop.estimated_arrival_time}
                  </Text>
                )}
                {stop.estimated_departure_time && (
                  <Text style={styles.stopTime}>
                    Dep: {stop.estimated_departure_time}
                  </Text>
                )}
              </View>
              {index < trip.stops.length - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* Segment Selection */}
      <Card variant='elevated' style={styles.selectionCard}>
        <Text style={styles.selectionTitle}>Select Your Journey Segment</Text>

        <View style={styles.selectionInputs}>
          {/* Boarding Stop */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.labelText}>Boarding At</Text>
            </View>
            <Dropdown
              items={boardingStops.map(stop => ({
                label: formatStopOption(stop),
                value: stop.stop_id,
              }))}
              value={selectedBoarding?.stop_id || ''}
              onChange={stopId => {
                const stop = boardingStops.find(s => s.stop_id === stopId);
                setSelectedBoarding(stop || null);
              }}
              placeholder='Select boarding stop'
              searchable
              required
            />
          </View>

          {/* Destination Stop */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <MapPin size={16} color={Colors.error} />
              <Text style={styles.labelText}>Destination</Text>
            </View>
            <Dropdown
              items={destinationOptions.map(stop => ({
                label: formatStopOption(stop),
                value: stop.stop_id,
              }))}
              value={selectedDestination?.stop_id || ''}
              onChange={stopId => {
                const stop = destinationOptions.find(s => s.stop_id === stopId);
                setSelectedDestination(stop || null);
              }}
              placeholder={
                selectedBoarding
                  ? 'Select destination stop'
                  : 'Select boarding stop first'
              }
              searchable
              required
              disabled={!selectedBoarding}
            />
          </View>
        </View>

        {/* Fare Display */}
        {selectedSegment && (
          <View style={styles.fareDisplay}>
            <View style={styles.fareIcon}>
              <DollarSign size={20} color={Colors.success} />
            </View>
            <View style={styles.fareInfo}>
              <Text style={styles.fareLabel}>Segment Fare</Text>
              <Text style={styles.fareValue}>
                MVR {selectedSegment.fare.toFixed(2)}
              </Text>
              <Text style={styles.fareDetail}>
                {selectedSegment.from_stop.island_name} →{' '}
                {selectedSegment.to_stop.island_name}
                {selectedSegment.distance &&
                  ` (${selectedSegment.distance} stops)`}
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* Available Segments Quick Selection */}
      {!selectedSegment && availableSegments.length > 0 && (
        <Card variant='outlined' style={styles.quickSelectCard}>
          <Text style={styles.quickSelectTitle}>Popular Routes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickSelectScroll}
          >
            {availableSegments.slice(0, 5).map((segment, index) => (
              <Pressable
                key={`${segment.from_stop.stop_id}-${segment.to_stop.stop_id}`}
                style={styles.quickSelectItem}
                onPress={() => {
                  setSelectedBoarding(segment.from_stop);
                  setSelectedDestination(segment.to_stop);
                }}
              >
                <Text style={styles.quickSelectRoute}>
                  {segment.from_stop.island_name}
                </Text>
                <Text style={styles.quickSelectArrow}>→</Text>
                <Text style={styles.quickSelectRoute}>
                  {segment.to_stop.island_name}
                </Text>
                <Text style={styles.quickSelectFare}>
                  MVR {segment.fare.toFixed(2)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 16,
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
  errorCard: {
    padding: 16,
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  // Route Overview
  routeCard: {
    padding: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  stopsTimeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: 32,
    paddingBottom: 16,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  timelineLine: {
    position: 'absolute',
    left: 9,
    top: 22,
    width: 2,
    height: '100%',
    backgroundColor: Colors.border,
  },
  timelineContent: {
    gap: 2,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  stopMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  stopTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // Selection Card
  selectionCard: {
    padding: 16,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  selectionInputs: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  // Fare Display
  fareDisplay: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.success + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fareInfo: {
    flex: 1,
  },
  fareLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  fareValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 2,
  },
  fareDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Quick Select
  quickSelectCard: {
    padding: 12,
  },
  quickSelectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  quickSelectScroll: {
    gap: 12,
    paddingHorizontal: 4,
  },
  quickSelectItem: {
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 140,
    alignItems: 'center',
  },
  quickSelectRoute: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  quickSelectArrow: {
    fontSize: 16,
    color: Colors.primary,
    marginVertical: 4,
  },
  quickSelectFare: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
});


