/**
 * Segment Trip Card Component
 *
 * Displays a trip card specifically for segment-based booking
 * Shows the full route with highlighted boarding and destination stops
 * Used in customer booking flow for multi-stop segment selection
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Clock, Users, Ship, Route } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import { formatTimeAMPM } from '@/utils/dateUtils';
import type { TripWithSegment } from '@/types/booking';

interface SegmentTripCardProps {
  trip: TripWithSegment;
  onPress: () => void;
  selected?: boolean;
}

export default function SegmentTripCard({
  trip,
  onPress,
  selected = false,
}: SegmentTripCardProps) {
  // Format fare
  const formatFare = (fare: number) => {
    return `MVR ${fare.toFixed(2)}`;
  };

  // Calculate per-seat fare
  const perSeatFare = trip.segment_fare;

  const availableSeats =
    trip.available_seats_for_segment || trip.available_seats || 0;
  const totalSeats = trip.seating_capacity || 0;

  return (
    <Pressable onPress={onPress}>
      <Card
        variant={selected ? 'elevated' : 'outlined'}
        style={
          selected ? { ...styles.card, ...styles.cardSelected } : styles.card
        }
      >
        <View style={styles.row}>
          <View style={styles.infoSection}>
            <View style={styles.titleRow}>
              <Ship size={13} color={Colors.primary} />
              <Text style={styles.vesselName}>{trip.vessel_name}</Text>
            </View>
            <View style={styles.routeInfo}>
              <Route size={13} color={Colors.primary} />
              <Text style={styles.stopNameCompact}>
                {trip.boarding_island_name}
              </Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.stopNameCompact}>
                {trip.destination_island_name}
              </Text>
            </View>
            <View style={styles.quickStats}>
              <Users size={11} color={Colors.primary} />
              <Text style={styles.quickStatText}>
                {availableSeats} / {totalSeats} seats
              </Text>
            </View>
          </View>

          <View style={styles.badgeColumn}>
            <View style={styles.timeBadge}>
              <Clock size={13} color={Colors.primary} />
              <Text style={styles.time}>
                {formatTimeAMPM(trip.departure_time)}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceLabel}>Per Seat</Text>
              <Text style={styles.price}>{formatFare(perSeatFare)}</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.highlight,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoSection: {
    flex: 1,
    gap: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vesselName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopNameCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  arrow: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  priceBadge: {
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.highlight,
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});
