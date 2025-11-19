import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Calendar,
  DollarSign,
  Star,
  CreditCard,
  Users,
  BarChart3,
  Activity,
  Clock,
  Route as RouteIcon,
  Ship,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { UserProfile } from '@/types/userManagement';

interface UserStatsSectionProps {
  user: UserProfile;
  userStats: any;
}

export default function UserStatsSection({
  user,
  userStats,
}: UserStatsSectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MVR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderCustomerStats = () => (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statCardIcon}>
            <Calendar size={20} color={colors.primary} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>{userStats.totalBookings}</Text>
            <Text style={styles.statCardLabel}>Total Bookings</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statCardIcon,
              { backgroundColor: colors.successLight },
            ]}
          >
            <DollarSign size={20} color={colors.success} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {formatCurrency(userStats.totalSpent)}
            </Text>
            <Text style={styles.statCardLabel}>Total Spent</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View
            style={[styles.statCardIcon, { backgroundColor: colors.infoLight }]}
          >
            <Star size={20} color={colors.info} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {userStats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.statCardLabel}>Avg Rating</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statCardIcon,
              { backgroundColor: colors.warningLight },
            ]}
          >
            <CreditCard size={20} color={colors.warning} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {formatCurrency(userStats.walletBalance)}
            </Text>
            <Text style={styles.statCardLabel}>Wallet Balance</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderAgentStats = () => (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statCardIcon}>
            <Users size={20} color={colors.primary} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {(userStats as any).totalClients}
            </Text>
            <Text style={styles.statCardLabel}>Total Clients</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statCardIcon,
              { backgroundColor: colors.successLight },
            ]}
          >
            <DollarSign size={20} color={colors.success} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {formatCurrency((userStats as any).totalCommissions)}
            </Text>
            <Text style={styles.statCardLabel}>Total Commissions</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View
            style={[styles.statCardIcon, { backgroundColor: colors.infoLight }]}
          >
            <CreditCard size={20} color={colors.info} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {formatCurrency((userStats as any).availableCredit)}
            </Text>
            <Text style={styles.statCardLabel}>Available Credit</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statCardIcon,
              { backgroundColor: colors.warningLight },
            ]}
          >
            <BarChart3 size={20} color={colors.warning} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {(userStats as any).activeBookings}
            </Text>
            <Text style={styles.statCardLabel}>Active Bookings</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderAdminStats = () => {
    // Admin users don't need stats displayed
    return null;
  };

  const renderPassengerStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={styles.statCardIcon}>
          <Calendar size={20} color={colors.primary} />
        </View>
        <View style={styles.statCardContent}>
          <Text style={styles.statCardValue}>{userStats.totalTrips}</Text>
          <Text style={styles.statCardLabel}>Total Trips</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <View
          style={[
            styles.statCardIcon,
            { backgroundColor: colors.successLight },
          ]}
        >
          <Clock size={20} color={colors.success} />
        </View>
        <View style={styles.statCardContent}>
          <Text style={styles.statCardValue}>
            {(userStats as any).completedTrips}
          </Text>
          <Text style={styles.statCardLabel}>Completed Trips</Text>
        </View>
      </View>
    </View>
  );

  const renderCaptainStats = () => (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statCardIcon}>
            <RouteIcon size={20} color={colors.primary} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {(userStats as any).totalRoutes}
            </Text>
            <Text style={styles.statCardLabel}>Total Routes</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statCardIcon,
              { backgroundColor: colors.successLight },
            ]}
          >
            <Ship size={20} color={colors.success} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>{userStats.totalTrips}</Text>
            <Text style={styles.statCardLabel}>Total Trips</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View
            style={[styles.statCardIcon, { backgroundColor: colors.infoLight }]}
          >
            <Star size={20} color={colors.info} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {userStats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.statCardLabel}>Avg Rating</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statCardIcon,
              { backgroundColor: colors.warningLight },
            ]}
          >
            <Clock size={20} color={colors.warning} />
          </View>
          <View style={styles.statCardContent}>
            <Text style={styles.statCardValue}>
              {(userStats as any).experienceYears}y
            </Text>
            <Text style={styles.statCardLabel}>Experience</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderStats = () => {
    switch (user.role) {
      case 'customer':
        return renderCustomerStats();
      case 'agent':
        return renderAgentStats();
      case 'admin':
        return renderAdminStats();
      case 'passenger':
        return renderPassengerStats();
      case 'captain':
        return renderCaptainStats();
      default:
        return null;
    }
  };

  if (!userStats) return null;

  return (
    <View style={styles.quickStats}>
      <View style={styles.statsGrid}>{renderStats()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickStats: {
    marginBottom: 24,
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardContent: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
