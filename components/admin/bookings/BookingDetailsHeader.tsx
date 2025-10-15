import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking, BookingStatus } from '@/types/admin/management';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  formatBookingNumber,
  formatCurrency,
  formatDate,
  formatTime,
} from '@/utils/admin/bookingManagementUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Edit,
  User,
  Phone,
  Mail,
} from 'lucide-react-native';

interface BookingDetailsHeaderProps {
  booking: AdminBooking;
  onEdit?: () => void;
  onStatusUpdate?: (status: BookingStatus) => void;
  canUpdateBookings?: boolean;
}

export default function BookingDetailsHeader({
  booking,
  onEdit,
  onStatusUpdate,
  canUpdateBookings = false,
}: BookingDetailsHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.bookingNumber}>
            {formatBookingNumber(booking.booking_number)}
          </Text>
          <View style={styles.statusContainer}>
            <StatusBadge status={booking.status} />
            {booking.payment_status && (
              <StatusBadge
                status={booking.payment_status as any}
                variant='payment'
                size='small'
              />
            )}
          </View>
        </View>

        {canUpdateBookings && onEdit && (
          <Pressable
            style={styles.editButton}
            onPress={onEdit}
            accessibilityRole='button'
            accessibilityLabel='Edit booking'
          >
            <Edit size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <CreditCard size={16} color={colors.primary} />
          <Text style={styles.statValue}>
            {formatCurrency(booking.total_fare)}
          </Text>
          <Text style={styles.statLabel}>Total Fare</Text>
        </View>

        <View style={styles.statItem}>
          <Users size={16} color={colors.primary} />
          <Text style={styles.statValue}>{booking.passenger_count || 1}</Text>
          <Text style={styles.statLabel}>Passengers</Text>
        </View>

        <View style={styles.statItem}>
          <Calendar size={16} color={colors.primary} />
          <Text style={styles.statValue}>
            {formatDate(booking.trip_travel_date || booking.created_at)}
          </Text>
          <Text style={styles.statLabel}>Travel Date</Text>
        </View>
      </View>

      {/* Route Information */}
      <View style={styles.routeSection}>
        <View style={styles.routeInfo}>
          <MapPin size={20} color={colors.primary} />
          <View style={styles.routeDetails}>
            <Text style={styles.routeName}>
              {booking.route_name || 'Route Information'}
            </Text>
            <Text style={styles.routeDescription}>
              {booking.from_island_name} → {booking.to_island_name}
            </Text>
          </View>
        </View>

        <View style={styles.timeInfo}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={styles.timeText}>
            {formatTime(booking.trip_departure_time || '')}
          </Text>
        </View>
      </View>

      {/* Customer Information */}
      <View style={styles.customerSection}>
        <View style={styles.customerHeader}>
          <User size={16} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Customer Information</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {booking.user_name || 'Customer Name'}
          </Text>
          <View style={styles.contactInfo}>
            {booking.user_email && (
              <View style={styles.contactRow}>
                <Mail size={14} color={colors.textSecondary} />
                <Text style={styles.contactText}>{booking.user_email}</Text>
              </View>
            )}
            {booking.user_mobile && (
              <View style={styles.contactRow}>
                <Phone size={14} color={colors.textSecondary} />
                <Text style={styles.contactText}>{booking.user_mobile}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  bookingNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}40`,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  routeSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}40`,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  routeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  customerSection: {
    marginTop: 8,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerInfo: {
    marginLeft: 24,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
