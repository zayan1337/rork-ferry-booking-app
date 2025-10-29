/**
 * Multi-Stop Selector Component
 *
 * Component for selecting and managing stops on multi-stop routes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Clock, Users, CheckCircle } from 'lucide-react-native';

import { CaptainRouteStop } from '@/types/captain';
import Colors from '@/constants/colors';

interface MultiStopSelectorProps {
  stops: CaptainRouteStop[];
  selectedStopId: string | null;
  onStopSelect: (stopId: string) => void;
  loading?: boolean;
}

export default function MultiStopSelector({
  stops,
  selectedStopId,
  onStopSelect,
  loading = false,
}: MultiStopSelectorProps) {
  const [selectedStop, setSelectedStop] = useState<string | null>(
    selectedStopId
  );

  useEffect(() => {
    setSelectedStop(selectedStopId);
  }, [selectedStopId]);

  const handleStopPress = (stopId: string) => {
    setSelectedStop(stopId);
    onStopSelect(stopId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Loading stops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Stops</Text>

      <View style={styles.stopsContainer}>
        {stops.map((stop, index) => (
          <Pressable
            key={stop.id}
            style={[
              styles.stopCard,
              selectedStop === stop.id && styles.selectedStopCard,
            ]}
            onPress={() => handleStopPress(stop.id)}
          >
            <View style={styles.stopIndicator}>
              <View
                style={[
                  styles.stopDot,
                  {
                    backgroundColor: stop.is_current_stop
                      ? Colors.primary
                      : stop.is_completed
                        ? Colors.success
                        : selectedStop === stop.id
                          ? Colors.primary
                          : Colors.border,
                  },
                ]}
              />
              {index < stops.length - 1 && (
                <View
                  style={[
                    styles.stopLine,
                    {
                      backgroundColor: stop.is_completed
                        ? Colors.success
                        : Colors.border,
                    },
                  ]}
                />
              )}
            </View>

            <View style={styles.stopInfo}>
              <View style={styles.stopHeader}>
                <Text
                  style={[
                    styles.stopName,
                    {
                      color: stop.is_current_stop
                        ? Colors.primary
                        : stop.is_completed
                          ? Colors.success
                          : Colors.text,
                    },
                  ]}
                >
                  {stop.island.name}
                </Text>
                <Text style={styles.stopSequence}>
                  Stop {stop.stop_sequence}
                </Text>
              </View>

              <View style={styles.stopDetails}>
                <View style={styles.detailItem}>
                  <Users size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    Boarding: {stop.boarding_passengers?.length || 0}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Users size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    Dropoff: {stop.dropoff_passengers?.length || 0}
                  </Text>
                </View>
              </View>

              {stop.is_current_stop && (
                <View style={styles.currentStopBadge}>
                  <Clock size={12} color={Colors.primary} />
                  <Text style={styles.currentStopText}>Current Stop</Text>
                </View>
              )}

              {stop.is_completed && (
                <View style={styles.completedBadge}>
                  <CheckCircle size={12} color={Colors.success} />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  stopsContainer: {
    gap: 12,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedStopCard: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  stopIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stopDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  stopLine: {
    width: 2,
    height: 24,
    marginTop: 4,
  },
  stopInfo: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stopSequence: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  stopDetails: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  currentStopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  currentStopText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginLeft: 4,
  },
});
