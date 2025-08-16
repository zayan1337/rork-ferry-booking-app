import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import StatusBadge from './StatusBadge';
import {
  formatCurrency,
  formatDate,
  formatRouteName,
  formatPassengerCount,
  formatBookingNumber,
} from '@/utils/admin/bookingManagementUtils';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Ship,
  QrCode,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface AdminBookingItemProps {
  booking: AdminBooking;
  onPress: (booking: AdminBooking) => void;
  compact?: boolean;
}

export default function AdminBookingItem({
  booking,
  onPress,
  compact = false,
}: AdminBookingItemProps) {
  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => onPress(booking)}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <View style={styles.compactLeft}>
            <Text style={styles.compactBookingNumber}>
              {formatBookingNumber(booking.booking_number)}
            </Text>
            <StatusBadge status={booking.status} size='small' />
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactAmount}>
              {formatCurrency(booking.total_fare)}
            </Text>
            <Text style={styles.compactDate}>
              {formatDate(booking.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.compactDetails}>
          <View style={styles.compactDetailRow}>
            <User size={12} color={colors.textSecondary} />
            <Text style={styles.compactDetailText}>
              {booking.user_name || 'Unknown Customer'}
            </Text>
          </View>
          <View style={styles.compactDetailRow}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={styles.compactDetailText}>
              {formatRouteName(
                booking.from_island_name,
                booking.to_island_name
              )}
            </Text>
          </View>
          {booking.trip_travel_date && (
            <View style={styles.compactDetailRow}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={styles.compactDetailText}>
                {formatDate(booking.trip_travel_date)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(booking)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <Text style={styles.bookingNumber}>
            {formatBookingNumber(booking.booking_number)}
          </Text>
          <StatusBadge status={booking.status} />
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.amount}>
            {formatCurrency(booking.total_fare)}
          </Text>
          <Text style={styles.date}>{formatDate(booking.created_at)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.customerSection}>
          <View style={styles.customerHeader}>
            <User size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>
          <Text style={styles.customerName}>
            {booking.user_name || 'Unknown Customer'}
          </Text>
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

        <View style={styles.tripSection}>
          <View style={styles.tripHeader}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>
          <Text style={styles.routeName}>
            {booking.route_name || 'Unknown Route'}
          </Text>
          <View style={styles.tripDetails}>
            {booking.trip_travel_date && (
              <View style={styles.detailRow}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {formatDate(booking.trip_travel_date)}
                </Text>
              </View>
            )}
            {booking.trip_departure_time && (
              <View style={styles.detailRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {booking.trip_departure_time}
                </Text>
              </View>
            )}
            {booking.vessel_name && (
              <View style={styles.detailRow}>
                <Ship size={14} color={colors.textSecondary} />
                <Text style={styles.detailText}>{booking.vessel_name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.additionalSection}>
          <View style={styles.additionalRow}>
            <Text style={styles.additionalLabel}>Passengers:</Text>
            <Text style={styles.additionalValue}>
              {formatPassengerCount(booking.passenger_count || 0)}
            </Text>
          </View>

          {booking.agent_name && (
            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>Agent:</Text>
              <Text style={styles.additionalValue}>{booking.agent_name}</Text>
            </View>
          )}

          {booking.payment_status && (
            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>Payment:</Text>
              <StatusBadge
                status={booking.payment_status as any}
                variant='payment'
                size='small'
              />
            </View>
          )}

          {booking.qr_code_url && (
            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>QR Code:</Text>
              <QrCode size={16} color={colors.primary} />
            </View>
          )}

          {booking.check_in_status && (
            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>Check-in:</Text>
              <StatusBadge
                status={booking.check_in_status ? 'checked_in' : 'pending'}
                variant='default'
                size='small'
              />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${colors.border}20`,
  },
  compactContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${colors.border}20`,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  compactBookingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compactDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  content: {
    gap: 12,
  },
  customerSection: {
    gap: 6,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tripSection: {
    gap: 6,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  tripDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  compactDetails: {
    gap: 4,
  },
  compactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  additionalSection: {
    gap: 6,
  },
  additionalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  additionalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  additionalValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
});
