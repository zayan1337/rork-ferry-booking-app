import React from 'react';
import { StyleSheet, Text, Pressable, View, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Calendar, Clock, Users, MapPin } from 'lucide-react-native';
import StatusBadge from './StatusBadge';
import { Booking } from '@/types/admin';

interface BookingItemProps {
  booking: Booking;
  onPress?: () => void;
  compact?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function BookingItem({
  booking,
  onPress,
  compact = false,
}: BookingItemProps) {
  const isSmallScreen = screenWidth < 480;
  const scale = isSmallScreen ? 0.9 : 1;

  const getSizeStyles = () => {
    if (compact) {
      return {
        padding: 12 * scale,
        titleSize: 14 * scale,
        subtitleSize: 12 * scale,
        detailSize: 11 * scale,
        amountSize: 14 * scale,
        iconSize: 14,
        borderRadius: 12,
      };
    }

    return {
      padding: 16 * scale,
      titleSize: 16 * scale,
      subtitleSize: 14 * scale,
      detailSize: 13 * scale,
      amountSize: 16 * scale,
      iconSize: 16,
      borderRadius: 16,
    };
  };

  const sizeStyles = getSizeStyles();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MVR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Pressable
      style={[
        styles.container,
        {
          padding: sizeStyles.padding,
          borderRadius: sizeStyles.borderRadius,
        },
      ]}
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={`Booking ${booking.id} for ${booking.customerName}`}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.id, { fontSize: sizeStyles.detailSize }]}>
            #{booking.id}
          </Text>
          {!compact && (
            <View style={styles.routeContainer}>
              <MapPin
                size={sizeStyles.iconSize - 2}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.routeName, { fontSize: sizeStyles.titleSize }]}
                numberOfLines={1}
              >
                {booking.routeName}
              </Text>
            </View>
          )}
        </View>
        <StatusBadge
          status={booking.status}
          size={compact ? 'small' : 'medium'}
        />
      </View>

      {/* Route name for compact layout */}
      {compact && (
        <View style={styles.routeContainer}>
          <MapPin size={sizeStyles.iconSize - 2} color={colors.textSecondary} />
          <Text
            style={[styles.routeName, { fontSize: sizeStyles.titleSize }]}
            numberOfLines={1}
          >
            {booking.routeName}
          </Text>
        </View>
      )}

      {/* Customer name */}
      <Text
        style={[styles.customerName, { fontSize: sizeStyles.subtitleSize }]}
        numberOfLines={1}
      >
        {booking.customerName}
      </Text>

      {/* Details Grid */}
      <View style={[styles.detailsGrid, { marginTop: compact ? 8 : 12 }]}>
        <View style={styles.detailItem}>
          <Calendar size={sizeStyles.iconSize} color={colors.textSecondary} />
          <Text
            style={[styles.detailText, { fontSize: sizeStyles.detailSize }]}
          >
            {formatDate(booking.date)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Clock size={sizeStyles.iconSize} color={colors.textSecondary} />
          <Text
            style={[styles.detailText, { fontSize: sizeStyles.detailSize }]}
          >
            {booking.departureTime}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Users size={sizeStyles.iconSize} color={colors.textSecondary} />
          <Text
            style={[styles.detailText, { fontSize: sizeStyles.detailSize }]}
          >
            {booking.passengers}{' '}
            {booking.passengers === 1 ? 'passenger' : 'passengers'}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { marginTop: compact ? 8 : 12 }]}>
        <StatusBadge
          status={booking.paymentStatus}
          size='small'
          variant='payment'
        />
        <Text style={[styles.amount, { fontSize: sizeStyles.amountSize }]}>
          {formatAmount(booking.totalAmount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${colors.border}20`,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  id: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeName: {
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
    flex: 1,
  },
  customerName: {
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%',
  },
  detailText: {
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}30`,
  },
  amount: {
    fontWeight: '700',
    color: colors.primary,
  },
});
