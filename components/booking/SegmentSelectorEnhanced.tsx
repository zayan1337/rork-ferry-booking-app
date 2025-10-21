/**
 * Enhanced Segment Selector Component
 *
 * Allows passengers to select their boarding and destination stops
 * for multi-stop route bookings
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import {
  MapPin,
  Navigation,
  DollarSign,
  Info,
  Check,
} from 'lucide-react-native';
import type { RouteStop } from '@/types/multiStopRoute';
import { getEffectiveSegmentFare } from '@/utils/segmentUtils';
import { formatCurrency } from '@/utils/currencyUtils';

interface SegmentSelectorProps {
  tripId: string;
  routeStops: RouteStop[];
  onSegmentSelect: (
    boardingStop: RouteStop,
    destinationStop: RouteStop,
    fare: number
  ) => void;
  selectedBoardingStopId?: string;
  selectedDestinationStopId?: string;
}

export default function SegmentSelectorEnhanced({
  tripId,
  routeStops,
  onSegmentSelect,
  selectedBoardingStopId,
  selectedDestinationStopId,
}: SegmentSelectorProps) {
  const [boardingStop, setBoardingStop] = useState<RouteStop | null>(null);
  const [destinationStop, setDestinationStop] = useState<RouteStop | null>(
    null
  );
  const [segmentFare, setSegmentFare] = useState<number>(0);
  const [loadingFare, setLoadingFare] = useState(false);

  // Filter stops for boarding (pickup or both)
  const boardingStops = routeStops.filter(
    stop => stop.stop_type === 'pickup' || stop.stop_type === 'both'
  );

  // Filter stops for destination (dropoff or both, and after boarding)
  const destinationStops = routeStops.filter(
    stop =>
      (stop.stop_type === 'dropoff' || stop.stop_type === 'both') &&
      (!boardingStop || stop.stop_sequence > boardingStop.stop_sequence)
  );

  // Load fare when both stops are selected
  useEffect(() => {
    const loadFare = async () => {
      if (boardingStop && destinationStop) {
        setLoadingFare(true);
        try {
          const fare = await getEffectiveSegmentFare(
            tripId,
            boardingStop.id,
            destinationStop.id
          );
          setSegmentFare(fare);
          onSegmentSelect(boardingStop, destinationStop, fare);
        } catch (error) {
          console.error('Error loading segment fare:', error);
          setSegmentFare(0);
        } finally {
          setLoadingFare(false);
        }
      }
    };

    loadFare();
  }, [boardingStop, destinationStop, tripId]);

  const handleBoardingSelect = (stop: RouteStop) => {
    setBoardingStop(stop);
    // Reset destination if it's before or same as new boarding stop
    if (
      destinationStop &&
      destinationStop.stop_sequence <= stop.stop_sequence
    ) {
      setDestinationStop(null);
    }
  };

  const handleDestinationSelect = (stop: RouteStop) => {
    setDestinationStop(stop);
  };

  const calculateSegmentCount = () => {
    if (!boardingStop || !destinationStop) return 0;
    return destinationStop.stop_sequence - boardingStop.stop_sequence;
  };

  const segmentCount = calculateSegmentCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Navigation size={20} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Select Your Journey</Text>
          <Text style={styles.subtitle}>
            Choose where you'll board and where you'll exit
          </Text>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Info size={16} color={colors.info} />
        <Text style={styles.infoText}>
          Select your boarding point first, then your destination. Fare is
          calculated based on the number of segments traveled.
        </Text>
      </View>

      {/* Boarding Stop Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MapPin size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Boarding Point</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.stopsRow}>
            {boardingStops.map((stop, index) => (
              <Pressable
                key={stop.id}
                style={[
                  styles.stopCard,
                  boardingStop?.id === stop.id && styles.stopCardSelected,
                ]}
                onPress={() => handleBoardingSelect(stop)}
              >
                <View style={styles.stopSequence}>
                  <Text style={styles.stopSequenceText}>
                    {stop.stop_sequence}
                  </Text>
                </View>
                <Text style={styles.stopName}>{stop.island_name}</Text>
                {stop.zone && <Text style={styles.stopZone}>{stop.zone}</Text>}
                {boardingStop?.id === stop.id && (
                  <View style={styles.selectedIndicator}>
                    <Check size={14} color={colors.white} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Destination Stop Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Navigation size={18} color={colors.success} />
          <Text style={styles.sectionTitle}>Destination</Text>
        </View>

        {!boardingStop ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Please select a boarding point first
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.stopsRow}>
              {destinationStops.map((stop, index) => (
                <Pressable
                  key={stop.id}
                  style={[
                    styles.stopCard,
                    destinationStop?.id === stop.id && styles.stopCardSelected,
                  ]}
                  onPress={() => handleDestinationSelect(stop)}
                >
                  <View style={styles.stopSequence}>
                    <Text style={styles.stopSequenceText}>
                      {stop.stop_sequence}
                    </Text>
                  </View>
                  <Text style={styles.stopName}>{stop.island_name}</Text>
                  {stop.zone && (
                    <Text style={styles.stopZone}>{stop.zone}</Text>
                  )}
                  {destinationStop?.id === stop.id && (
                    <View style={styles.selectedIndicator}>
                      <Check size={14} color={colors.white} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Journey Summary */}
      {boardingStop && destinationStop && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <DollarSign size={20} color={colors.primary} />
            <Text style={styles.summaryTitle}>Journey Summary</Text>
          </View>

          <View style={styles.summaryContent}>
            <View style={styles.summaryRoute}>
              <View style={styles.summaryStop}>
                <Text style={styles.summaryStopNumber}>
                  {boardingStop.stop_sequence}
                </Text>
                <Text style={styles.summaryStopName}>
                  {boardingStop.island_name}
                </Text>
              </View>

              <View style={styles.summaryArrow}>
                <Text style={styles.summaryArrowText}>→</Text>
                <Text style={styles.summarySegmentCount}>
                  {segmentCount} segment{segmentCount !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.summaryStop}>
                <Text style={styles.summaryStopNumber}>
                  {destinationStop.stop_sequence}
                </Text>
                <Text style={styles.summaryStopName}>
                  {destinationStop.island_name}
                </Text>
              </View>
            </View>

            <View style={styles.summaryFare}>
              <Text style={styles.fareLabel}>Fare per Passenger:</Text>
              {loadingFare ? (
                <Text style={styles.fareValue}>Calculating...</Text>
              ) : (
                <Text style={styles.fareValue}>
                  {formatCurrency(segmentFare, 'MVR')}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.info,
    lineHeight: 16,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stopsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stopCard: {
    width: 120,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 8,
  },
  stopCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  stopSequence: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSequenceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  stopZone: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: `${colors.success}10`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryContent: {
    gap: 16,
  },
  summaryRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStop: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStopNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  summaryStopName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  summaryArrow: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  summaryArrowText: {
    fontSize: 24,
    color: colors.primary,
    marginBottom: 4,
  },
  summarySegmentCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryFare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
  },
  fareLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  fareValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
});

