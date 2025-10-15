import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import {
  Calendar,
  User,
  CreditCard,
  Ship,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  QrCode,
} from 'lucide-react-native';

import { Booking } from '@/types/agent';
import Colors from '@/constants/colors';
import Card from './Card';
import { isBookingExpired, isBookingInactive } from '@/utils/bookingUtils';
import { getClientDisplayName } from '@/utils/clientUtils';
import { formatCurrency, formatBookingDate } from '@/utils/agentFormatters';
import { formatTimeAMPM } from '@/utils/dateUtils';
import { useAgentStore } from '@/store/agent/agentStore';

interface AgentBookingCardProps {
  booking: Booking;
  onPress: (booking: Booking) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

// Memoized component for better VirtualizedList performance
const AgentBookingCard = React.memo<AgentBookingCardProps>(
  ({ booking, onPress }) => {
    const { clients } = useAgentStore();

    const getStatusColor = (status: string, isExpired: boolean = false) => {
      if (isExpired) {
        return Colors.warning;
      }

      switch (status) {
        case 'confirmed':
          return Colors.primary;
        case 'completed':
          return Colors.success;
        case 'cancelled':
          return Colors.error;
        case 'modified':
          return Colors.warning;
        case 'pending':
          return Colors.secondary;
        default:
          return Colors.inactive;
      }
    };

    const getPaymentMethodColor = (method: string) => {
      switch (method) {
        case 'credit':
          return Colors.warning;
        case 'gateway':
          return Colors.primary;
        case 'free':
          return Colors.success;
        default:
          return Colors.subtext;
      }
    };

    const getPaymentMethodText = (method: string) => {
      switch (method) {
        case 'credit':
          return 'Credit';
        case 'gateway':
          return 'Gateway';
        case 'free':
          return 'Free';
        default:
          return (
            method?.charAt(0).toUpperCase() + method?.slice(1) || 'Unknown'
          );
      }
    };

    const getStatusText = (status: string) => {
      return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const bookingExpired = isBookingExpired(booking);
    const bookingInactive = isBookingInactive(booking);
    const isRoundTrip =
      booking.tripType === 'round_trip' || booking.isRoundTrip;
    const hasDiscount = booking.discountedAmount !== booking.totalAmount;

    const handlePress = React.useCallback(() => {
      onPress(booking);
    }, [onPress, booking]);

    const formatTime = (timeString?: string) => {
      if (!timeString) return '';
      return formatTimeAMPM(timeString);
    };

    return (
      <Pressable onPress={handlePress}>
        <Card
          variant='elevated'
          style={StyleSheet.flatten([
            styles.card,
            bookingInactive && styles.inactiveCard,
          ])}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.routeContainer}>
              <View style={styles.routeInfo}>
                <Text
                  style={[
                    styles.routeText,
                    bookingInactive && styles.inactiveText,
                  ]}
                >
                  {booking.origin} → {booking.destination}
                </Text>
                {isRoundTrip && (
                  <View style={styles.tripTypeContainer}>
                    <ArrowRightLeft size={12} color={Colors.primary} />
                    <Text style={styles.tripTypeText}>Round Trip</Text>
                  </View>
                )}
              </View>
              {booking.bookingNumber && (
                <Text style={styles.bookingNumber}>
                  #{booking.bookingNumber}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(
                    booking.status,
                    bookingExpired
                  ),
                },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(booking.status)}
              </Text>
            </View>
          </View>

          {/* Trip Details Section */}
          <View style={styles.tripDetails}>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Calendar size={14} color={Colors.subtext} />
                <Text
                  style={[
                    styles.dateTimeText,
                    bookingExpired && styles.expiredText,
                  ]}
                >
                  {formatBookingDate(booking.departureDate)}
                  {bookingExpired && ' (Expired)'}
                </Text>
              </View>
              {booking.departureTime && (
                <View style={styles.dateTimeItem}>
                  <Clock size={14} color={Colors.subtext} />
                  <Text style={styles.dateTimeText}>
                    {formatTime(booking.departureTime)}
                  </Text>
                </View>
              )}
            </View>

            {isRoundTrip && booking.returnDate && (
              <View style={styles.returnDateRow}>
                <Text style={styles.returnLabel}>Return:</Text>
                <Text style={styles.returnDate}>
                  {formatBookingDate(booking.returnDate)}
                </Text>
              </View>
            )}

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <User size={14} color={Colors.subtext} />
                <Text style={styles.detailText}>
                  {booking.passengerCount}{' '}
                  {booking.passengerCount === 1 ? 'passenger' : 'passengers'}
                </Text>
              </View>
              {booking.vessel?.name && (
                <View style={styles.detailItem}>
                  <Ship size={14} color={Colors.subtext} />
                  <Text style={styles.detailText}>{booking.vessel.name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Additional Info Row */}
          <View style={styles.additionalInfo}>
            <View style={styles.additionalInfoLeft}>
              <View style={styles.paymentMethodContainer}>
                <CreditCard
                  size={12}
                  color={getPaymentMethodColor(booking.paymentMethod)}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    { color: getPaymentMethodColor(booking.paymentMethod) },
                  ]}
                >
                  {getPaymentMethodText(booking.paymentMethod)}
                </Text>
              </View>
              {booking.qrCodeUrl && (
                <View style={styles.qrIndicator}>
                  <QrCode size={12} color={Colors.success} />
                  <Text style={styles.qrText}>QR Ready</Text>
                </View>
              )}
              {booking.checkInStatus && (
                <View style={styles.checkInIndicator}>
                  <CheckCircle2 size={12} color={Colors.success} />
                  <Text style={styles.checkInText}>Checked In</Text>
                </View>
              )}
            </View>
            {booking.commission > 0 && (
              <View style={styles.commissionContainer}>
                <Text style={styles.commissionLabel}>Commission:</Text>
                <Text style={styles.commissionAmount}>
                  {formatCurrency(booking.commission)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Footer Section */}
          <View style={styles.footer}>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>
                {getClientDisplayName(booking.clientName, clients)}
              </Text>
              <Text style={styles.bookingId}>ID: {booking.id.slice(-8)}</Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={styles.price}>
                {formatCurrency(booking.discountedAmount)}
              </Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>
                  {formatCurrency(booking.totalAmount)}
                </Text>
              )}
              {hasDiscount && (
                <Text style={styles.discountText}>
                  Save{' '}
                  {formatCurrency(
                    booking.totalAmount - booking.discountedAmount
                  )}
                </Text>
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.booking.id === nextProps.booking.id &&
      prevProps.booking.status === nextProps.booking.status &&
      prevProps.booking.discountedAmount ===
        nextProps.booking.discountedAmount &&
      prevProps.booking.updatedAt === nextProps.booking.updatedAt &&
      prevProps.onPress === nextProps.onPress
    );
  }
);

AgentBookingCard.displayName = 'AgentBookingCard';

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeContainer: {
    flex: 1,
    marginRight: 12,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  routeText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 8,
  },
  tripTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.highlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tripTypeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 2,
  },
  bookingNumber: {
    fontSize: 12,
    color: Colors.subtext,
    fontWeight: '500',
    marginTop: 2,
  },
  inactiveText: {
    color: Colors.subtext,
  },
  expiredText: {
    color: Colors.warning,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  tripDetails: {
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  dateTimeText: {
    marginLeft: 6,
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  returnDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginRight: 6,
    fontWeight: '500',
  },
  returnDate: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 6,
    color: Colors.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  additionalInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  qrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  qrText: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  checkInIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  checkInText: {
    marginLeft: 4,
    fontSize: 11,
    color: Colors.success,
    fontWeight: '500',
  },
  commissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionLabel: {
    fontSize: 11,
    color: Colors.subtext,
    marginRight: 4,
  },
  commissionAmount: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  clientInfo: {
    flex: 1,
    marginRight: 12,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  bookingId: {
    fontSize: 11,
    color: Colors.subtext,
    fontWeight: '500',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: 13,
    color: Colors.subtext,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default AgentBookingCard;
