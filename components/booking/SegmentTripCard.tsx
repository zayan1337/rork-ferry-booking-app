/**
 * Segment Trip Card Component
 *
 * Displays a trip card specifically for segment-based booking
 * Shows the full route with highlighted boarding and destination stops
 * Used in customer booking flow for multi-stop segment selection
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Clock, Users, Navigation, Check } from 'lucide-react-native';
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
  const totalStops = trip.total_stops || 0;

  return (
    <Pressable onPress={onPress}>
      <Card
        variant={selected ? 'elevated' : 'outlined'}
        style={
          selected ? { ...styles.card, ...styles.cardSelected } : styles.card
        }
      >
        {/* Compact Horizontal Layout */}
        <View style={styles.container}>
          {/* Left Section: Time */}
          <View style={styles.leftSection}>
            <Clock size={16} color={Colors.primary} />
            <Text style={styles.time}>
              {formatTimeAMPM(trip.departure_time)}
            </Text>
          </View>

          {/* Middle Section: Route and Details */}
          <View style={styles.middleSection}>
            {/* Vessel Name */}
            <Text style={styles.vesselName}>{trip.vessel_name}</Text>

            {/* Route Info */}
            <View style={styles.routeInfo}>
              <Text style={styles.stopNameCompact}>
                {trip.boarding_island_name}
              </Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.stopNameCompact}>
                {trip.destination_island_name}
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Users size={12} color={Colors.primary} />
                <Text style={styles.quickStatText}>{availableSeats}</Text>
              </View>
              <Text style={styles.separator}>•</Text>
              <View style={styles.quickStat}>
                <Navigation size={12} color={Colors.primary} />
                <Text style={styles.quickStatText}>{totalStops} stops</Text>
              </View>
            </View>
          </View>

          {/* Right Section: Price and Selection */}
          <View style={styles.rightSection}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Per Seat</Text>
              <Text style={styles.price}>{formatFare(perSeatFare)}</Text>
            </View>
            {selected && (
              <View style={styles.selectedIndicator}>
                <Check size={18} color={Colors.primary} />
              </View>
            )}
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
    marginBottom: 10,
    position: 'relative',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.highlight,
  },

  // Compact Horizontal Layout
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  vesselName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
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
    marginTop: 4,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  separator: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  priceBox: {
    backgroundColor: Colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
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
  selectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
});
