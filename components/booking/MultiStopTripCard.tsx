/**
 * Multi-Stop Trip Card Component
 *
 * Displays a multi-stop trip with all its stops
 * Used in customer booking flow to show available multi-stop trips
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ship, MapPin, Clock, Users } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import type { MultiStopTrip } from '@/types/multiStopTrip';
import { formatStopSequence } from '@/utils/multiStopTripUtils';

interface MultiStopTripCardProps {
  trip: MultiStopTrip;
  onPress: () => void;
  selected?: boolean;
}

export default function MultiStopTripCard({
  trip,
  onPress,
  selected = false,
}: MultiStopTripCardProps) {
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  return (
    <Pressable onPress={onPress}>
      <Card
        variant={selected ? 'elevated' : 'outlined'}
        style={[styles.card, selected && styles.cardSelected]}
      >
        {/* Multi-Stop Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Multi-Stop Journey</Text>
        </View>

        {/* Trip Header */}
        <View style={styles.header}>
          <View style={styles.vesselInfo}>
            <Ship size={18} color={Colors.primary} />
            <Text style={styles.vesselName}>{trip.vessel_name}</Text>
          </View>
          <View style={styles.timeInfo}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.departureTime}>
              {formatTime(trip.departure_time)}
            </Text>
          </View>
        </View>

        {/* Stops Preview */}
        <View style={styles.stopsContainer}>
          <View style={styles.stopsHeader}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.stopsLabel}>Route:</Text>
          </View>
          <Text style={styles.stopsRoute}>
            {formatStopSequence(trip.stops)}
          </Text>
          <Text style={styles.stopsCount}>
            {trip.stops.length} stops along this journey
          </Text>
        </View>

        {/* Trip Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Users size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {trip.available_seats || trip.seating_capacity} seats available
            </Text>
          </View>
        </View>

        {/* Selection Indicator */}
        {selected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    position: 'relative',
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 100, // Space for badge
  },
  vesselInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vesselName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  departureTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stopsContainer: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  stopsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  stopsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stopsRoute: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  stopsCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  selectedIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});


