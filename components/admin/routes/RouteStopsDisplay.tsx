/**
 * Route Stops Display Component
 *
 * Read-only display of route stops with visual indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { MapPin, Clock, ArrowRight } from 'lucide-react-native';
import type { RouteStop } from '@/types/multiStopRoute';

interface RouteStopsDisplayProps {
  stops: RouteStop[];
  showTravelTimes?: boolean;
  showCompact?: boolean;
}

export default function RouteStopsDisplay({
  stops,
  showTravelTimes = true,
  showCompact = false,
}: RouteStopsDisplayProps) {
  if (stops.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No stops configured</Text>
      </View>
    );
  }

  const getStopTypeBadgeColor = (stopType: string) => {
    switch (stopType) {
      case 'pickup':
        return colors.success;
      case 'dropoff':
        return colors.info;
      case 'both':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStopTypeLabel = (stopType: string) => {
    switch (stopType) {
      case 'pickup':
        return 'Pickup';
      case 'dropoff':
        return 'Dropoff';
      case 'both':
        return 'Both';
      default:
        return stopType;
    }
  };

  if (showCompact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactStops}>
          {stops.map((stop, index) => (
            <React.Fragment key={stop.id}>
              <View style={styles.compactStop}>
                <View style={styles.compactStopNumber}>
                  <Text style={styles.compactStopNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.compactStopName}>{stop.island_name}</Text>
              </View>
              {index < stops.length - 1 && (
                <ArrowRight size={14} color={colors.textSecondary} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stops.map((stop, index) => (
        <View key={stop.id} style={styles.stopRow}>
          {/* Stop number */}
          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>{index + 1}</Text>
          </View>

          {/* Island info */}
          <View style={styles.stopInfo}>
            <View style={styles.stopHeader}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.stopName}>{stop.island_name}</Text>
            </View>

            <View style={styles.stopMeta}>
              {/* Stop type badge */}
              <View
                style={[
                  styles.stopTypeBadge,
                  {
                    backgroundColor: `${getStopTypeBadgeColor(stop.stop_type)}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stopTypeText,
                    { color: getStopTypeBadgeColor(stop.stop_type) },
                  ]}
                >
                  {getStopTypeLabel(stop.stop_type)}
                </Text>
              </View>

              {/* Travel time */}
              {showTravelTimes &&
                index > 0 &&
                stop.estimated_travel_time_from_previous && (
                  <View style={styles.travelTimeContainer}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={styles.travelTimeText}>
                      {stop.estimated_travel_time_from_previous}min from
                      previous
                    </Text>
                  </View>
                )}
            </View>

            {/* Notes */}
            {stop.notes && <Text style={styles.stopNotes}>{stop.notes}</Text>}
          </View>

          {/* Arrow to next stop */}
          {index < stops.length - 1 && (
            <View style={styles.arrowContainer}>
              <ArrowRight size={20} color={colors.textTertiary} />
            </View>
          )}
        </View>
      ))}

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {stops.length} stop{stops.length > 1 ? 's' : ''} •{' '}
          {
            stops.filter(
              s => s.stop_type === 'pickup' || s.stop_type === 'both'
            ).length
          }{' '}
          pickup •{' '}
          {
            stops.filter(
              s => s.stop_type === 'dropoff' || s.stop_type === 'both'
            ).length
          }{' '}
          dropoff
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  stopInfo: {
    flex: 1,
    gap: 8,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stopTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stopTypeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  travelTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  travelTimeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stopNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  arrowContainer: {
    paddingTop: 6,
  },
  summary: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  compactContainer: {
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  compactStops: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactStopNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStopNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  compactStopName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
});


