/**
 * Multi-Stop Progress Component
 *
 * Component for displaying progress through multi-stop routes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Clock, Users } from 'lucide-react-native';

import { CaptainRouteStop } from '@/types/captain';
import Colors from '@/constants/colors';
import Card from '@/components/Card';

interface MultiStopProgressProps {
  stops: CaptainRouteStop[];
  currentStopSequence?: number;
  totalStops?: number;
  showPassengerCounts?: boolean;
}

export default function MultiStopProgress({
  stops,
  currentStopSequence,
  totalStops,
  showPassengerCounts = true,
}: MultiStopProgressProps) {
  const completedStops = stops.filter(stop => stop.is_completed).length;
  const progressPercentage = totalStops
    ? (completedStops / totalStops) * 100
    : 0;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Route Progress</Text>
          {currentStopSequence && totalStops && (
            <Text style={styles.subtitle}>
              Stop {currentStopSequence} of {totalStops}
            </Text>
          )}
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progressPercentage}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {completedStops} of {totalStops || stops.length} stops completed
        </Text>
      </View>

      {/* Stops Timeline */}
      <View style={styles.timeline}>
        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.timelineItem}>
            <View style={styles.timelineIndicator}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: stop.is_current_stop
                      ? Colors.primary
                      : stop.is_completed
                        ? Colors.success
                        : Colors.border,
                  },
                ]}
              />
              {index < stops.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor: stop.is_completed
                        ? Colors.success
                        : Colors.border,
                    },
                  ]}
                />
              )}
            </View>

            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text
                  style={[
                    styles.timelineName,
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
                <Text style={styles.timelineSequence}>
                  Stop {stop.stop_sequence}
                </Text>
              </View>

              {showPassengerCounts && (
                <View style={styles.timelineDetails}>
                  <View style={styles.passengerCount}>
                    <Users size={12} color={Colors.textSecondary} />
                    <Text style={styles.passengerText}>
                      Boarding: {stop.boarding_passengers?.length || 0}
                    </Text>
                  </View>
                  <View style={styles.passengerCount}>
                    <Users size={12} color={Colors.textSecondary} />
                    <Text style={styles.passengerText}>
                      Dropoff: {stop.dropoff_passengers?.length || 0}
                    </Text>
                  </View>
                </View>
              )}

              {stop.is_current_stop && (
                <View style={styles.currentStopIndicator}>
                  <Clock size={12} color={Colors.primary} />
                  <Text style={styles.currentStopText}>Current Stop</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.card,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  timelineLine: {
    width: 2,
    height: 24,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timelineSequence: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  timelineDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  passengerCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  currentStopIndicator: {
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
});
