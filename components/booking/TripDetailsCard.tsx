import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
} from 'lucide-react-native';
import Card from '@/components/Card';
import Colors from '@/constants/colors';
import { formatTimeAMPM } from '@/utils/dateUtils';

interface TripDetailsCardProps {
  departureDate: string;
  departureTime?: string;
  returnDate?: string;
  tripType?: string;
  route?: {
    fromIsland?: { name: string; zone?: string };
    toIsland?: { name: string };
  };
  origin?: string;
  destination?: string;
  passengerCount: number;
  vessel?: { name: string };
  status?: string;
  getStatusColor?: (status: string) => string;
  getStatusBadgeStyle?: (status: string) => object;
  getStatusTextStyle?: (status: string) => object;
}

const TripDetailsCard: React.FC<TripDetailsCardProps> = ({
  departureDate,
  departureTime,
  returnDate,
  tripType,
  route,
  origin,
  destination,
  passengerCount,
  vessel,
  status,
  getStatusColor,
  getStatusBadgeStyle,
  getStatusTextStyle,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDefaultStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return Colors.success;
      case 'completed':
        return Colors.primary;
      case 'cancelled':
        return Colors.error;
      case 'modified':
        return Colors.warning;
      case 'pending':
        return Colors.inactive;
      default:
        return Colors.inactive;
    }
  };

  const getDefaultStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return styles.statusConfirmed;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      case 'modified':
        return styles.statusModified;
      case 'pending':
        return styles.statusPending;
      default:
        return {};
    }
  };

  const getDefaultStatusTextStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return styles.statusTextConfirmed;
      case 'completed':
        return styles.statusTextCompleted;
      case 'cancelled':
        return styles.statusTextCancelled;
      case 'modified':
        return styles.statusTextModified;
      case 'pending':
        return styles.statusTextPending;
      default:
        return {};
    }
  };

  const statusColorFn = getStatusColor || getDefaultStatusColor;
  const statusBadgeFn = getStatusBadgeStyle || getDefaultStatusBadgeStyle;
  const statusTextFn = getStatusTextStyle || getDefaultStatusTextStyle;

  return (
    <Card variant='elevated' style={styles.detailsCard}>
      <Text style={styles.cardTitle}>Trip Details</Text>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Calendar size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Departure Date</Text>
          <Text style={styles.detailValue}>{formatDate(departureDate)}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Clock size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Departure Time</Text>
          <Text style={styles.detailValue}>
            {departureTime ? formatTimeAMPM(departureTime) : 'N/A'}
          </Text>
        </View>
      </View>

      {tripType === 'round_trip' && returnDate && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Calendar size={20} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Return Date</Text>
            <Text style={styles.detailValue}>{formatDate(returnDate)}</Text>
          </View>
        </View>
      )}

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Route</Text>
          <Text style={styles.detailValue}>
            {route?.fromIsland?.name || origin || 'Unknown'} →{' '}
            {route?.toIsland?.name || destination || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Zone</Text>
          <Text style={styles.detailValue}>
            {route?.fromIsland?.zone || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Users size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Passengers</Text>
          <Text style={styles.detailValue}>{passengerCount}</Text>
        </View>
      </View>

      {vessel && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <MapPin size={20} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Vessel</Text>
            <Text style={styles.detailValue}>{vessel.name || 'N/A'}</Text>
          </View>
        </View>
      )}

      {status && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <CheckCircle size={20} color={statusColorFn(status)} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Current Status</Text>
            <View style={[styles.inlineStatusBadge, statusBadgeFn(status)]}>
              <Text style={[styles.inlineStatusText, statusTextFn(status)]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  detailsCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
  },
  inlineStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.inactive,
    alignSelf: 'flex-start',
  },
  statusConfirmed: {
    backgroundColor: '#e8f5e9',
  },
  statusCompleted: {
    backgroundColor: '#e3f2fd',
  },
  statusCancelled: {
    backgroundColor: '#ffebee',
  },
  statusModified: {
    backgroundColor: '#fff3e0',
  },
  statusPending: {
    backgroundColor: '#f3e5f5',
  },
  inlineStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusTextConfirmed: {
    color: Colors.success,
  },
  statusTextCompleted: {
    color: Colors.primary,
  },
  statusTextCancelled: {
    color: Colors.error,
  },
  statusTextModified: {
    color: Colors.warning,
  },
  statusTextPending: {
    color: '#9c27b0',
  },
});

export default TripDetailsCard;
