/**
 * Admin Multi-Stop Trip Card Component
 *
 * Displays a multi-stop trip in the admin trip list
 * Shows all stops, status, and management actions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Ship,
  MapPin,
  Clock,
  Users,
  Edit,
  Trash2,
  Eye,
  Navigation,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import type { MultiStopTrip } from '@/types/multiStopTrip';
import { formatStopSequence } from '@/utils/multiStopTripUtils';

interface MultiStopTripCardProps {
  trip: MultiStopTrip;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MultiStopTripCard({
  trip,
  onView,
  onEdit,
  onDelete,
}: MultiStopTripCardProps) {
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return Colors.primary;
      case 'boarding':
        return Colors.warning;
      case 'departed':
        return Colors.primary;
      case 'completed':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const completedStops = trip.stops.filter(
    s => s.status === 'completed'
  ).length;
  const progressPercent = trip.total_stops
    ? (completedStops / trip.total_stops) * 100
    : 0;

  return (
    <Card style={styles.card}>
      {/* Multi-Stop Badge */}
      <View style={styles.badge}>
        <Navigation size={12} color='white' />
        <Text style={styles.badgeText}>Multi-Stop</Text>
      </View>

      {/* Trip Header */}
      <View style={styles.header}>
        <View style={styles.tripInfo}>
          <View style={styles.titleRow}>
            <Ship size={18} color={Colors.primary} />
            <Text style={styles.vesselName}>{trip.vessel_name}</Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Text style={styles.date}>{formatDate(trip.travel_date)}</Text>
            <View style={styles.timeBadge}>
              <Clock size={12} color={Colors.textSecondary} />
              <Text style={styles.time}>{formatTime(trip.departure_time)}</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(trip.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(trip.status) }]}
          >
            {trip.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stops Route */}
      <View style={styles.routeSection}>
        <View style={styles.routeHeader}>
          <MapPin size={14} color={Colors.textSecondary} />
          <Text style={styles.routeLabel}>Journey Route:</Text>
        </View>
        <Text style={styles.routeText}>{formatStopSequence(trip.stops)}</Text>
        <Text style={styles.stopCount}>
          {trip.stops.length} stops • {completedStops} completed
        </Text>
      </View>

      {/* Progress Bar */}
      {trip.status === 'boarding' || trip.status === 'departed' ? (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            Stop {trip.current_stop_sequence || 1} of {trip.total_stops}
          </Text>
        </View>
      ) : null}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Users size={14} color={Colors.textSecondary} />
          <Text style={styles.statText}>
            {trip.available_seats || trip.seating_capacity} seats
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Capacity:</Text>
          <Text style={styles.statValue}>{trip.seating_capacity}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title='View'
          onPress={onView}
          variant='outline'
          icon={<Eye size={16} color={Colors.primary} />}
          style={styles.actionButton}
        />
        <Button
          title='Edit'
          onPress={onEdit}
          variant='outline'
          icon={<Edit size={16} color={Colors.primary} />}
          style={styles.actionButton}
        />
        <Button
          title='Delete'
          onPress={onDelete}
          variant='outline'
          icon={<Trash2 size={16} color={Colors.error} />}
          style={[styles.actionButton, styles.deleteActionButton]}
        />
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
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    marginBottom: 12,
    paddingRight: 100, // Space for badge
  },
  tripInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  vesselName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeSection: {
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  routeText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  stopCount: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
  },
  deleteActionButton: {
    borderColor: Colors.error,
  },
});
