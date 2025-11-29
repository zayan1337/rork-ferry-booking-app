import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import StatusBadge from './StatusBadge';
import {
  formatCurrency,
  formatDate,
  formatPassengerCount,
  formatBookingNumber,
  getBookingRouteDisplayName,
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
  DollarSign,
  Percent,
  TrendingUp,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface AdminBookingItemProps {
  booking: AdminBooking;
  onPress: (booking: AdminBooking) => void;
  compact?: boolean;
}

function AdminBookingItem({
  booking,
  onPress,
  compact = false,
}: AdminBookingItemProps) {
  if (compact) {
    return (
      <Pressable
        style={styles.compactContainer}
        onPress={() => onPress(booking)}
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
              {booking.agent_id
                ? booking.agent_name || 'Unknown Agent'
                : booking.user_name || 'Unknown Customer'}
            </Text>
            {booking.agent_id &&
              booking.user_name &&
              booking.user_name !== booking.agent_name && (
                <Text style={[styles.compactDetailText, { marginLeft: 4 }]}>
                  (Client: {booking.user_name})
                </Text>
              )}
          </View>
          <View style={styles.compactDetailRow}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={styles.compactDetailText}>
              {getBookingRouteDisplayName(booking as any)}
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

          {/* Agent Booking Financial Details - Compact */}
          {booking.agent_id && (
            <View style={styles.compactFinancialSection}>
              {(() => {
                const passengerCount = booking.passenger_count || 1;
                const totalFare = booking.total_fare || 0;
                // Get segment fare from booking (added by bookingStore when fetching)
                // Otherwise fall back to base fare
                const segmentFare =
                  (booking as any).segment_fare ||
                  ((booking as any).booking_segments?.[0]?.fare_amount as
                    | number
                    | undefined) ||
                  0;
                const baseFare = booking.trip_base_fare || 0;
                // Use segment fare if available, otherwise use base fare
                const farePerPassenger =
                  segmentFare > 0 ? segmentFare : baseFare;
                // Calculate original fare: segment/base fare per passenger × number of passengers
                const originalFare = farePerPassenger * passengerCount;
                const discountAmount = Math.max(0, originalFare - totalFare);
                const commission = discountAmount;
                const totalPaidByAgent = totalFare;

                return (
                  <>
                    <View style={styles.compactFinancialRow}>
                      <Text style={styles.compactFinancialLabel}>Fare:</Text>
                      <Text style={styles.compactFinancialValue}>
                        {formatCurrency(originalFare)}
                      </Text>
                    </View>
                    {discountAmount > 0 && (
                      <View style={styles.compactFinancialRow}>
                        <Text style={styles.compactFinancialLabel}>Disc:</Text>
                        <Text
                          style={[
                            styles.compactFinancialValue,
                            styles.compactDiscountValue,
                          ]}
                        >
                          -{formatCurrency(discountAmount)}
                        </Text>
                      </View>
                    )}
                    {commission > 0 && (
                      <View style={styles.compactFinancialRow}>
                        <Text style={styles.compactFinancialLabel}>Comm:</Text>
                        <Text
                          style={[
                            styles.compactFinancialValue,
                            styles.compactCommissionValue,
                          ]}
                        >
                          {formatCurrency(commission)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.compactFinancialRow,
                        styles.compactFinancialRowTotal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.compactFinancialLabel,
                          styles.compactTotalLabel,
                        ]}
                      >
                        Paid:
                      </Text>
                      <Text
                        style={[
                          styles.compactFinancialValue,
                          styles.compactTotalValue,
                        ]}
                      >
                        {formatCurrency(totalPaidByAgent)}
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.container} onPress={() => onPress(booking)}>
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
        {/* Show Agent section if booking was made by agent */}
        {booking.agent_id ? (
          <View style={styles.customerSection}>
            <View style={styles.customerHeader}>
              <User size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Agent</Text>
            </View>
            <Text style={styles.customerName}>
              {booking.agent_name || 'Unknown Agent'}
            </Text>
            {booking.agent_email && (
              <View style={styles.contactRow}>
                <Mail size={14} color={colors.textSecondary} />
                <Text style={styles.contactText}>{booking.agent_email}</Text>
              </View>
            )}
            {/* Show client information if agent booked for a client */}
            {booking.user_name && booking.user_name !== booking.agent_name && (
              <View style={styles.clientInfo}>
                <Text style={styles.clientLabel}>Client:</Text>
                <Text style={styles.clientName}>{booking.user_name}</Text>
                {booking.user_email && (
                  <View style={styles.contactRow}>
                    <Mail size={12} color={colors.textSecondary} />
                    <Text style={[styles.contactText, { fontSize: 12 }]}>
                      {booking.user_email}
                    </Text>
                  </View>
                )}
                {booking.user_mobile && (
                  <View style={styles.contactRow}>
                    <Phone size={12} color={colors.textSecondary} />
                    <Text style={[styles.contactText, { fontSize: 12 }]}>
                      {booking.user_mobile}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Agent Booking Financial Details */}
            <View style={styles.agentFinancialSection}>
              <View style={styles.sectionHeaderRow}>
                <DollarSign size={14} color={colors.primary} />
                <Text style={styles.financialSectionTitle}>
                  Agent Booking Details
                </Text>
              </View>
              {(() => {
                const passengerCount = booking.passenger_count || 1;
                const totalFare = booking.total_fare || 0;
                // Get segment fare from booking (added by bookingStore when fetching)
                // Otherwise fall back to base fare
                const segmentFare =
                  (booking as any).segment_fare ||
                  ((booking as any).booking_segments?.[0]?.fare_amount as
                    | number
                    | undefined) ||
                  0;
                const baseFare = booking.trip_base_fare || 0;
                // Use segment fare if available, otherwise use base fare
                const farePerPassenger =
                  segmentFare > 0 ? segmentFare : baseFare;
                // Calculate original fare: segment/base fare per passenger × number of passengers
                const originalFare = farePerPassenger * passengerCount;
                const discountAmount = Math.max(0, originalFare - totalFare);
                const commission = discountAmount; // Commission is the discount amount
                const totalPaidByAgent = totalFare;

                return (
                  <View style={styles.financialDetails}>
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Booking Fare:</Text>
                      <Text style={styles.financialValue}>
                        {formatCurrency(originalFare)}
                      </Text>
                    </View>
                    {discountAmount > 0 && (
                      <View style={styles.financialRow}>
                        <View style={styles.financialLabelContainer}>
                          <Percent size={12} color={colors.success} />
                          <Text
                            style={[styles.financialLabel, { marginLeft: 4 }]}
                          >
                            Discount:
                          </Text>
                        </View>
                        <Text
                          style={[styles.financialValue, styles.discountValue]}
                        >
                          -{formatCurrency(discountAmount)}
                        </Text>
                      </View>
                    )}
                    {commission > 0 && (
                      <View style={styles.financialRow}>
                        <View style={styles.financialLabelContainer}>
                          <TrendingUp size={12} color={colors.primary} />
                          <Text
                            style={[styles.financialLabel, { marginLeft: 4 }]}
                          >
                            Commission:
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.financialValue,
                            styles.commissionValue,
                          ]}
                        >
                          {formatCurrency(commission)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[styles.financialRow, styles.financialRowTotal]}
                    >
                      <View style={styles.financialLabelContainer}>
                        <DollarSign size={14} color={colors.primary} />
                        <Text
                          style={[
                            styles.financialLabel,
                            styles.totalLabel,
                            { marginLeft: 4 },
                          ]}
                        >
                          Total Paid by Agent:
                        </Text>
                      </View>
                      <Text style={[styles.financialValue, styles.totalValue]}>
                        {formatCurrency(totalPaidByAgent)}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        ) : (
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
        )}

        <View style={styles.tripSection}>
          <View style={styles.tripHeader}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>
          <Text style={styles.routeName}>
            {getBookingRouteDisplayName(booking as any) ||
              booking.route_name ||
              'Unknown Route'}
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

          {/* Only show agent in additional section if not already shown in main section */}
          {!booking.agent_id && booking.agent_name && (
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
    </Pressable>
  );
}

// Memoize to avoid unnecessary re-renders in large lists
export default React.memo(AdminBookingItem, (prev, next) => {
  // Re-render only if booking id or key fields change, or compact flag changes
  return (
    prev.compact === next.compact &&
    prev.booking.id === next.booking.id &&
    prev.booking.status === next.booking.status &&
    prev.booking.total_fare === next.booking.total_fare &&
    prev.booking.created_at === next.booking.created_at &&
    prev.booking.route_name === next.booking.route_name &&
    prev.onPress === next.onPress
  );
});

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
  clientInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}30`,
    gap: 4,
  },
  clientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
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
  agentFinancialSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: `${colors.primary}08`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  financialSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  financialDetails: {
    gap: 6,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialRowTotal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
  },
  financialLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  financialValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  discountValue: {
    color: colors.success,
  },
  commissionValue: {
    color: colors.primary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  compactFinancialSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: `${colors.primary}08`,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    gap: 4,
  },
  compactFinancialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactFinancialRowTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
  },
  compactFinancialLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  compactTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  compactFinancialValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  compactDiscountValue: {
    color: colors.success,
  },
  compactCommissionValue: {
    color: colors.primary,
  },
  compactTotalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
