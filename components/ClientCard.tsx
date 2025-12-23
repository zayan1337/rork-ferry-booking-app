import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { Client } from '@/types/agent';
import Colors from '@/constants/colors';
import {
  User,
  Mail,
  Phone,
  BarChart,
  UserX,
  AlertTriangle,
  TrendingUp,
  Star,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import Card from './Card';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

interface ClientCardProps {
  client: Client;
  onPress: (client: Client) => void;
  inactiveBookingsCount?: number;
  lastBookingDate?: string;
  totalRevenue?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

// Helper function to get client tier based on booking count
const getClientTier = (bookingsCount: number) => {
  if (bookingsCount >= 20)
    return { tier: 'VIP', color: Colors.warning, icon: Star };
  if (bookingsCount >= 10)
    return { tier: 'Gold', color: Colors.secondary, icon: TrendingUp };
  if (bookingsCount >= 5)
    return { tier: 'Silver', color: Colors.primary, icon: CheckCircle };
  return { tier: 'Bronze', color: Colors.subtext, icon: User };
};

// Helper function to get activity status
const getActivityStatus = (
  lastBookingDate?: string,
  bookingsCount: number = 0
) => {
  if (!lastBookingDate || bookingsCount === 0) {
    return {
      status: 'New',
      color: Colors.secondary,
      textColor: Colors.secondary,
    };
  }

  const lastBooking = new Date(lastBookingDate);
  const daysSinceLastBooking = Math.floor(
    (Date.now() - lastBooking.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastBooking <= 7) {
    return {
      status: 'Active',
      color: Colors.success,
      textColor: Colors.success,
    };
  } else if (daysSinceLastBooking <= 30) {
    return {
      status: 'Recent',
      color: Colors.warning,
      textColor: Colors.warning,
    };
  } else {
    return {
      status: 'Inactive',
      color: Colors.inactive,
      textColor: Colors.subtext,
    };
  }
};

// Helper function to format currency
const formatCurrency = (amount: number = 0) => {
  return `MVR ${amount.toFixed(0)}`;
};

// Helper function to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Never';
  // Use Maldives timezone for consistent date display
  return formatDateInMaldives(dateString, 'short-date');
};

const ClientCard = React.memo<ClientCardProps>(
  ({
    client,
    onPress,
    inactiveBookingsCount = 0,
    lastBookingDate,
    totalRevenue = 0,
  }) => {
    const handlePress = React.useCallback(() => {
      onPress(client);
    }, [onPress, client]);

    const clientTier = getClientTier(client.bookingsCount);
    const activityStatus = getActivityStatus(
      lastBookingDate,
      client.bookingsCount
    );
    const averageBookingValue =
      client.bookingsCount > 0 ? totalRevenue / client.bookingsCount : 0;
    const TierIcon = clientTier.icon;

    const cardStyle = {
      ...styles.card,
      ...(isTablet ? styles.tabletCard : {}),
    };

    return (
      <Pressable onPress={handlePress}>
        <Card variant='elevated' style={cardStyle}>
          {/* Header Section */}
          <View style={styles.header}>
            <View
              style={[
                styles.avatarContainer,
                !client.hasAccount && styles.avatarContainerNoAccount,
              ]}
            >
              {client.hasAccount ? (
                <User size={isTablet ? 28 : 24} color={Colors.primary} />
              ) : (
                <UserX size={isTablet ? 28 : 24} color={Colors.subtext} />
              )}
            </View>

            <View style={styles.clientMainInfo}>
              <View style={styles.nameSection}>
                <Text
                  style={[styles.clientName, isTablet && styles.tabletText]}
                  numberOfLines={1}
                >
                  {client.name}
                </Text>
                <View style={styles.badgesRow}>
                  {!client.hasAccount && (
                    <View style={styles.noAccountBadge}>
                      <Text style={styles.noAccountText}>No Account</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.tierBadge,
                      { backgroundColor: `${clientTier.color}15` },
                    ]}
                  >
                    <TierIcon size={10} color={clientTier.color} />
                    <Text
                      style={[styles.tierText, { color: clientTier.color }]}
                    >
                      {clientTier.tier}
                    </Text>
                  </View>
                </View>
              </View>
              <Text
                style={[styles.clientEmail, isTablet && styles.tabletSubtext]}
                numberOfLines={1}
              >
                {client.email}
              </Text>
            </View>

            <View style={styles.statusSection}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${activityStatus.color}15` },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: activityStatus.color },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: activityStatus.textColor },
                  ]}
                >
                  {activityStatus.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statsRow}>
              {/* Bookings Count */}
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <BarChart size={14} color={Colors.primary} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{client.bookingsCount}</Text>
                  <Text style={styles.statLabel}>Bookings</Text>
                </View>
              </View>

              {/* Total Revenue */}
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <TrendingUp size={14} color={Colors.success} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>
                    {formatCurrency(totalRevenue)}
                  </Text>
                  <Text style={styles.statLabel}>Revenue</Text>
                </View>
              </View>

              {/* Average Value */}
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Star size={14} color={Colors.warning} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>
                    {formatCurrency(averageBookingValue)}
                  </Text>
                  <Text style={styles.statLabel}>Avg. Value</Text>
                </View>
              </View>

              {/* Last Booking */}
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Clock size={14} color={Colors.secondary} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {formatDate(lastBookingDate)}
                  </Text>
                  <Text style={styles.statLabel}>Last Booking</Text>
                </View>
              </View>
            </View>

            {/* Issues Indicator */}
            {inactiveBookingsCount > 0 && (
              <View style={styles.issuesContainer}>
                <AlertTriangle size={12} color={Colors.error} />
                <Text style={styles.issuesText}>
                  {inactiveBookingsCount} cancelled/modified booking
                  {inactiveBookingsCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <View style={styles.contactRow}>
              <Phone size={12} color={Colors.subtext} />
              <Text
                style={[
                  styles.contactText,
                  isTablet && styles.tabletContactText,
                ]}
                numberOfLines={1}
              >
                {client.phone}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Mail size={12} color={Colors.subtext} />
              <Text
                style={[
                  styles.contactText,
                  isTablet && styles.tabletContactText,
                ]}
                numberOfLines={1}
              >
                {client.email}
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.client.id === nextProps.client.id &&
      prevProps.client.name === nextProps.client.name &&
      prevProps.client.bookingsCount === nextProps.client.bookingsCount &&
      prevProps.inactiveBookingsCount === nextProps.inactiveBookingsCount &&
      prevProps.lastBookingDate === nextProps.lastBookingDate &&
      prevProps.totalRevenue === nextProps.totalRevenue &&
      prevProps.onPress === nextProps.onPress
    );
  }
);

ClientCard.displayName = 'ClientCard';

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabletCard: {
    borderRadius: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: `${Colors.primary}20`,
  },
  avatarContainerNoAccount: {
    backgroundColor: `${Colors.subtext}10`,
    borderColor: `${Colors.subtext}20`,
  },
  clientMainInfo: {
    flex: 1,
    minWidth: 0, // Ensures text truncation works properly
  },
  nameSection: {
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  tabletText: {
    fontSize: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  noAccountBadge: {
    backgroundColor: `${Colors.subtext}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noAccountText: {
    fontSize: 9,
    color: Colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientEmail: {
    fontSize: 14,
    color: Colors.subtext,
    fontWeight: '400',
  },
  tabletSubtext: {
    fontSize: 15,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statsSection: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.background}`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.subtext,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  issuesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.error}08`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    gap: 6,
  },
  issuesText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  contactText: {
    fontSize: 11,
    color: Colors.subtext,
    fontWeight: '500',
    flex: 1,
  },
  tabletContactText: {
    fontSize: 12,
  },
});

export default ClientCard;
