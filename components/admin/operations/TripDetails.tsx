import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Trip } from '@/types/operations';
import { formatCurrency } from '@/utils/currencyUtils';
import Button from '@/components/admin/Button';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  Clock,
  Ship,
  Users,
  DollarSign,
  Calendar,
  Navigation,
  Edit,
  X,
  AlertTriangle,
  Route,
  BarChart3,
  Target,
} from 'lucide-react-native';

interface TripDetailsProps {
  trip: Trip;
  onEdit?: () => void;
  onCancel?: () => void;
  onViewPassengers?: () => void;
  onViewBookings?: () => void;
  showActions?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

// Utility functions (inline implementations)
const formatTripTime = (time: string) => {
  if (!time) return '';
  try {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return time;
  }
};

const formatTripDuration = (departureTime: string, arrivalTime?: string) => {
  if (!arrivalTime) return 'N/A';
  try {
    const start = new Date(`1970-01-01T${departureTime}`);
    const end = new Date(`1970-01-01T${arrivalTime}`);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } catch {
    return 'N/A';
  }
};

const calculateOccupancy = (booked: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((booked / total) * 100);
};

const getTripStatus = (
  travelDate: string,
  departureTime: string,
  arrivalTime?: string
) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);

  if (travelDate < today) return 'completed';
  if (travelDate > today) return 'scheduled';

  // Same day
  if (currentTime < departureTime) return 'scheduled';
  if (arrivalTime && currentTime > arrivalTime) return 'completed';
  return 'in_progress';
};

export default function TripDetails({
  trip,
  onEdit,
  onCancel,
  onViewPassengers,
  onViewBookings,
  showActions = true,
}: TripDetailsProps) {
  const isTablet = screenWidth >= 768;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Trip',
      `Are you sure you want to cancel "${trip.routeName}"? This action cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: onCancel,
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return colors.warning;
      case 'boarding':
      case 'departed':
        return colors.primary;
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
    if (occupancy >= 70) return colors.warning;
    return colors.success;
  };

  const occupancyPercentage = calculateOccupancy(
    trip.booked_seats || 0,
    trip.available_seats || 0
  );
  const currentStatus = getTripStatus(
    trip.travel_date,
    trip.departure_time,
    trip.arrival_time
  );

  // Calculate revenue based on booked seats and fare
  const baseRoute = trip.route;
  const estimatedRevenue =
    (trip.booked_seats || 0) *
    (baseRoute?.base_fare || 0) *
    (trip.fare_multiplier || 1);

  const stats = [
    {
      title: 'Bookings',
      value: `${trip.booked_seats || 0}/${trip.available_seats || 0}`,
      subtitle: 'Passengers',
      icon: <Users size={20} color={colors.primary} />,
      trend: occupancyPercentage > 50 ? 'up' : 'neutral',
    },
    {
      title: 'Occupancy',
      value: `${occupancyPercentage.toFixed(1)}%`,
      subtitle: 'Capacity used',
      icon: <Target size={20} color={getOccupancyColor(occupancyPercentage)} />,
      trend: occupancyPercentage > 70 ? 'up' : 'neutral',
    },
    {
      title: 'Revenue',
      value: formatCurrency(estimatedRevenue),
      subtitle: 'Estimated earnings',
      icon: <DollarSign size={20} color={colors.success} />,
      trend: estimatedRevenue > 0 ? 'up' : 'neutral',
    },
    {
      title: 'Duration',
      value:
        trip.estimated_duration ||
        formatTripDuration(trip.departure_time, trip.arrival_time),
      subtitle: 'Travel time',
      icon: <Clock size={20} color={colors.primary} />,
      trend: 'neutral',
    },
  ];

  const canCancel =
    trip.status === 'scheduled' && new Date(trip.travel_date) > new Date();

  // Map trip status to StatusBadge compatible status
  const getCompatibleStatus = (
    status: string
  ):
    | 'confirmed'
    | 'pending'
    | 'cancelled'
    | 'completed'
    | 'paid'
    | 'refunded'
    | 'failed'
    | 'active'
    | 'inactive'
    | 'suspended'
    | 'maintenance'
    | 'scheduled'
    | 'in-progress' => {
    switch (status) {
      case 'scheduled':
        return 'scheduled';
      case 'boarding':
      case 'departed':
        return 'in-progress';
      case 'arrived':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'delayed':
        return 'pending';
      default:
        return 'pending';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{trip.routeName || trip.route?.name}</Text>
          <Text style={styles.subtitle}>
            {trip.route?.origin} → {trip.route?.destination}
          </Text>
          <View style={styles.statusContainer}>
            <StatusBadge status={getCompatibleStatus(trip.status)} />
            <Text style={styles.tripId}>Trip #{trip.id}</Text>
          </View>
        </View>
        {showActions && (
          <View style={styles.headerActions}>
            {onEdit && (
              <Pressable style={styles.iconButton} onPress={onEdit}>
                <Edit size={20} color={colors.primary} />
              </Pressable>
            )}
            {canCancel && onCancel && (
              <Pressable style={styles.iconButton} onPress={handleCancel}>
                <X size={20} color={colors.danger} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            trend={stat.trend as 'up' | 'down' | 'neutral'}
          />
        ))}
      </View>

      {/* Trip Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Calendar size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {new Date(trip.travel_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Clock size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Departure</Text>
              <Text style={styles.infoValue}>
                {formatTripTime(trip.departure_time)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Navigation size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Arrival</Text>
              <Text style={styles.infoValue}>
                {trip.arrival_time ? formatTripTime(trip.arrival_time) : 'TBD'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Ship size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Vessel</Text>
              <Text style={styles.infoValue}>
                {trip.vesselName || trip.vessel?.name}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Route size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Route</Text>
              <Text style={styles.infoValue}>
                {trip.routeName || trip.route?.name}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <DollarSign size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fare Multiplier</Text>
              <Text style={styles.infoValue}>{trip.fare_multiplier || 1}x</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notes Section */}
      {trip.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        </View>
      )}

      {/* Weather Conditions */}
      {trip.weather_conditions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather Conditions</Text>
          <View style={styles.weatherContainer}>
            <Text style={styles.weatherText}>{trip.weather_conditions}</Text>
          </View>
        </View>
      )}

      {/* Delay Information */}
      {trip.delay_reason && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delay Information</Text>
          <View style={styles.delayContainer}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={styles.delayText}>{trip.delay_reason}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionContainer}>
          {onViewPassengers && (
            <Button
              title='View Passengers'
              variant='outline'
              onPress={onViewPassengers}
              icon={<Users size={18} color={colors.primary} />}
            />
          )}
          {onViewBookings && (
            <Button
              title='View Bookings'
              variant='outline'
              onPress={onViewBookings}
              icon={<BarChart3 size={18} color={colors.primary} />}
            />
          )}
          {onEdit && (
            <Button
              title='Edit Trip'
              variant='primary'
              onPress={onEdit}
              icon={<Edit size={18} color='#FFFFFF' />}
            />
          )}
        </View>
      )}

      {/* Warnings */}
      {trip.status === 'cancelled' && (
        <View style={styles.warningContainer}>
          <AlertTriangle size={16} color={colors.danger} />
          <Text style={styles.warningText}>
            This trip has been cancelled. No further bookings are allowed.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weatherContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  weatherText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.danger}10`,
    borderWidth: 1,
    borderColor: `${colors.danger}30`,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: colors.danger,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  delayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.warning}10`,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
    borderRadius: 8,
    padding: 12,
  },
  delayText: {
    fontSize: 14,
    color: colors.warning,
    flex: 1,
  },
});
