/**
 * Multi-Stop Progress Component
 *
 * Shows captain the progress through stops on a multi-stop trip
 * Displays current stop, completed stops, and remaining stops
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Circle, Navigation } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import type { MultiStopTrip, TripStop } from '@/types/multiStopTrip';

interface MultiStopProgressProps {
  trip: MultiStopTrip;
  currentStop: TripStop | null;
}

export default function MultiStopProgress({
  trip,
  currentStop,
}: MultiStopProgressProps) {
  const getStopStatus = (stop: TripStop) => {
    if (stop.status === 'completed') return 'completed';
    if (stop.id === currentStop?.id) return 'current';
    if (stop.stop_sequence < (currentStop?.stop_sequence || 0))
      return 'completed';
    return 'pending';
  };

  const getStopColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'current':
        return Colors.primary;
      default:
        return Colors.border;
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Navigation size={20} color={Colors.primary} />
        <Text style={styles.title}>Journey Progress</Text>
      </View>

      <View style={styles.progressInfo}>
        <View style={styles.progressItem}>
          <Text style={styles.progressValue}>{trip.completed_stops || 0}</Text>
          <Text style={styles.progressLabel}>Completed</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={[styles.progressValue, { color: Colors.primary }]}>
            {currentStop?.stop_sequence || 1}
          </Text>
          <Text style={styles.progressLabel}>Current</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressValue}>{trip.total_stops || 0}</Text>
          <Text style={styles.progressLabel}>Total Stops</Text>
        </View>
      </View>

      <View style={styles.stopsContainer}>
        {trip.stops.map((stop, index) => {
          const status = getStopStatus(stop);
          const color = getStopColor(status);

          return (
            <View key={stop.id} style={styles.stopItem}>
              <View style={styles.stopIndicator}>
                {status === 'completed' ? (
                  <CheckCircle size={24} color={color} />
                ) : status === 'current' ? (
                  <View style={[styles.currentStopDot, { borderColor: color }]}>
                    <View
                      style={[
                        styles.currentStopDotInner,
                        { backgroundColor: color },
                      ]}
                    />
                  </View>
                ) : (
                  <Circle size={24} color={color} />
                )}
              </View>

              <View style={styles.stopContent}>
                <View style={styles.stopHeader}>
                  <Text style={[styles.stopNumber, { color }]}>
                    Stop {stop.stop_sequence}
                  </Text>
                  {status === 'current' && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>CURRENT</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.stopName}>{stop.island_name}</Text>

                <View style={styles.stopDetails}>
                  <Text style={styles.stopType}>{stop.stop_type}</Text>
                  {stop.estimated_arrival_time && (
                    <Text style={styles.stopTime}>
                      ETA: {stop.estimated_arrival_time}
                    </Text>
                  )}
                </View>

                {status === 'current' && (
                  <View style={styles.passengerCounts}>
                    {stop.passengers_boarding !== undefined &&
                      stop.passengers_boarding > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countText}>
                            ↑ {stop.passengers_boarding} boarding
                          </Text>
                        </View>
                      )}
                    {stop.passengers_dropping !== undefined &&
                      stop.passengers_dropping > 0 && (
                        <View
                          style={[styles.countBadge, styles.countBadgeDropoff]}
                        >
                          <Text style={styles.countText}>
                            ↓ {stop.passengers_dropping} dropping
                          </Text>
                        </View>
                      )}
                  </View>
                )}
              </View>

              {index < trip.stops.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    status === 'completed' && styles.connectorCompleted,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  stopsContainer: {
    paddingLeft: 8,
  },
  stopItem: {
    position: 'relative',
    paddingLeft: 40,
    paddingBottom: 20,
  },
  stopIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  currentStopDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentStopDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopContent: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stopNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  stopDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  stopType: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  stopTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  passengerCounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  countBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeDropoff: {
    backgroundColor: Colors.warning + '20',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  connector: {
    position: 'absolute',
    left: 11,
    top: 28,
    width: 2,
    height: '100%',
    backgroundColor: Colors.border,
  },
  connectorCompleted: {
    backgroundColor: Colors.success,
  },
});
