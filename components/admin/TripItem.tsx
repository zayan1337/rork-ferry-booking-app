import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  Activity,
  Users,
  ChevronRight,
  Calendar,
  TrendingUp,
  Anchor,
} from 'lucide-react-native';

// Components
import StatusBadge from '@/components/admin/StatusBadge';

type TripStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'arrived'
  | 'cancelled'
  | 'delayed';

interface TripItemProps {
  trip: {
    id: string;
    travel_date: string;
    departure_time: string;
    arrival_time?: string;
    status: TripStatus;
    route_name?: string;
    vessel_name?: string;
    from_island_name?: string;
    to_island_name?: string;
    available_seats: number;
    booked_seats: number;
    capacity?: number;
    occupancy_rate?: number;
    fare_multiplier: number;
    base_fare?: number;
    confirmed_bookings?: number;
    total_revenue?: number;
    is_active?: boolean;
    delay_reason?: string;
    weather_conditions?: string;
  };
  onPress: (tripId: string) => void;
  showStats?: boolean;
}

export default function TripItem({
  trip,
  onPress,
  showStats = true,
}: TripItemProps) {
  const getStatusVariant = (status: TripStatus) => {
    switch (status) {
      case 'scheduled':
        return 'default';
      case 'boarding':
        return 'warning';
      case 'departed':
        return 'success';
      case 'arrived':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'delayed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case 'scheduled':
        return colors.primary;
      case 'boarding':
        return colors.warning;
      case 'departed':
        return colors.success;
      case 'arrived':
        return colors.success;
      case 'cancelled':
        return colors.danger;
      case 'delayed':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return colors.danger;
    if (occupancy >= 70) return colors.success;
    if (occupancy >= 50) return colors.warning;
    return colors.textSecondary;
  };

  const getOccupancyLevel = (occupancy: number) => {
    if (occupancy >= 90) return 'Full';
    if (occupancy >= 70) return 'High';
    if (occupancy >= 50) return 'Medium';
    return 'Low';
  };

  const formatTime = (time: string) => {
    try {
      return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    } catch {
      return date;
    }
  };

  const formatCurrency = (amount: number) => {
    return `MVR ${amount.toLocaleString()}`;
  };

  const routeDisplay =
    trip.route_name ||
    `${trip.from_island_name || 'Unknown'} → ${
      trip.to_island_name || 'Unknown'
    }`;

  const occupancyRate =
    trip.occupancy_rate ||
    (trip.capacity ? (trip.booked_seats / trip.capacity) * 100 : 0);

  const totalFare = (trip.base_fare || 0) * trip.fare_multiplier;
  const estimatedRevenue =
    totalFare * (trip.confirmed_bookings || trip.booked_seats);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(trip.id)}
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.routeInfo}>
            <Navigation size={16} color={colors.primary} />
            <Text style={styles.routeName} numberOfLines={1}>
              {routeDisplay}
            </Text>
          </View>
          <View style={styles.dateTimeInfo}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.dateText}>{formatDate(trip.travel_date)}</Text>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.timeText}>
              {formatTime(trip.departure_time)}
            </Text>
            {trip.arrival_time && (
              <>
                <Text style={styles.arrow}>→</Text>
                <Text style={styles.timeText}>
                  {formatTime(trip.arrival_time)}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(trip.status) },
              ]}
            >
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>
      </View>

      {/* Vessel and Details */}
      <View style={styles.detailsSection}>
        <View style={styles.vesselInfo}>
          <Anchor size={14} color={colors.textSecondary} />
          <Text style={styles.vesselName} numberOfLines={1}>
            {trip.vessel_name || 'Unknown Vessel'}
          </Text>
          {trip.fare_multiplier !== 1.0 && (
            <View style={styles.fareMultiplier}>
              <Text style={styles.fareMultiplierText}>
                {trip.fare_multiplier}x
              </Text>
            </View>
          )}
        </View>

        {/* Delay/Weather Info */}
        {(trip.delay_reason || trip.weather_conditions) && (
          <View style={styles.alertsSection}>
            {trip.delay_reason && (
              <Text style={styles.delayText} numberOfLines={1}>
                Delay: {trip.delay_reason}
              </Text>
            )}
            {trip.weather_conditions && (
              <Text style={styles.weatherText} numberOfLines={1}>
                Weather: {trip.weather_conditions}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Stats Section */}
      {showStats && (
        <View style={styles.statsSection}>
          {/* Occupancy Stats */}
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Users size={14} color={getOccupancyColor(occupancyRate)} />
              <Text style={styles.statLabel}>Seats</Text>
              <Text style={styles.statValue}>
                {trip.booked_seats}/{trip.available_seats}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Activity size={14} color={getOccupancyColor(occupancyRate)} />
              <Text style={styles.statLabel}>Occupancy</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: getOccupancyColor(occupancyRate) },
                ]}
              >
                {Math.round(occupancyRate)}%
              </Text>
            </View>

            {totalFare > 0 && (
              <View style={styles.statItem}>
                <DollarSign size={14} color={colors.success} />
                <Text style={styles.statLabel}>Fare</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(totalFare)}
                </Text>
              </View>
            )}

            {estimatedRevenue > 0 && (
              <View style={styles.statItem}>
                <TrendingUp size={14} color={colors.success} />
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {formatCurrency(estimatedRevenue)}
                </Text>
              </View>
            )}
          </View>

          {/* Occupancy Level Indicator */}
          <View style={styles.occupancyBar}>
            <View style={styles.occupancyBarTrack}>
              <View
                style={[
                  styles.occupancyBarFill,
                  {
                    width: `${Math.min(occupancyRate, 100)}%`,
                    backgroundColor: getOccupancyColor(occupancyRate),
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.occupancyLevel,
                { color: getOccupancyColor(occupancyRate) },
              ]}
            >
              {getOccupancyLevel(occupancyRate)}
            </Text>
          </View>
        </View>
      )}

      {/* Status indicator border */}
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(trip.status) },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 12,
    color: colors.textTertiary,
    marginHorizontal: 2,
  },
  detailsSection: {
    marginBottom: 12,
  },
  vesselInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  vesselName: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  fareMultiplier: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fareMultiplierText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  alertsSection: {
    gap: 4,
  },
  delayText: {
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },
  weatherText: {
    fontSize: 12,
    color: colors.info,
    fontStyle: 'italic',
  },
  statsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  occupancyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  occupancyBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  occupancyLevel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  statusIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  statusBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
