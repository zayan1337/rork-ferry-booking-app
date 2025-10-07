import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Activity,
  DollarSign,
  Users,
} from 'lucide-react-native';
import StatCard from '@/components/admin/StatCard';

interface FinanceStatsProps {
  totalWalletBalance: number;
  activeWallets: number;
  totalWallets: number;
  todayTransactions: number;
  totalRevenue: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  totalPayments: number;
  isTablet?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

function FinanceStats({
  totalWalletBalance,
  activeWallets,
  totalWallets,
  todayTransactions,
  totalRevenue,
  completedPayments,
  pendingPayments,
  failedPayments,
  totalPayments,
  isTablet = screenWidth >= 768,
}: FinanceStatsProps) {
  // Memoize calculations to prevent unnecessary re-renders
  const stats = useMemo(() => {
    const paymentSuccessRate =
      totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;

    const activeWalletPercentage =
      totalWallets > 0 ? (activeWallets / totalWallets) * 100 : 0;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'MVR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const formatNumber = (num: number) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    };

    return {
      paymentSuccessRate,
      activeWalletPercentage,
      formatCurrency,
      formatNumber,
    };
  }, [totalPayments, completedPayments, totalWallets, activeWallets]);

  // Memoize payment summary data
  const paymentSummaryData = useMemo(
    () => [
      {
        label: 'Completed',
        value: completedPayments,
        color: colors.success,
      },
      {
        label: 'Pending',
        value: pendingPayments,
        color: colors.warning,
      },
      {
        label: 'Failed',
        value: failedPayments,
        color: colors.danger,
      },
    ],
    [completedPayments, pendingPayments, failedPayments]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Finance Overview</Text>
        <Text style={styles.subtitle}>Financial performance and metrics</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Row 1: Revenue & Wallets */}
        <View style={styles.statsRow}>
          <StatCard
            icon={
              <DollarSign size={isTablet ? 24 : 20} color={colors.success} />
            }
            title='Total Revenue'
            value={stats.formatCurrency(totalRevenue)}
            color={colors.success}
            subtitle='All time'
            size={isTablet ? 'large' : 'medium'}
          />
          <StatCard
            icon={<Wallet size={isTablet ? 24 : 20} color={colors.primary} />}
            title='Wallet Balance'
            value={stats.formatCurrency(totalWalletBalance)}
            color={colors.primary}
            subtitle={`${activeWallets}/${totalWallets} active`}
            size={isTablet ? 'large' : 'medium'}
          />
        </View>

        {/* Row 2: Payments & Transactions */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<CreditCard size={isTablet ? 24 : 20} color={colors.info} />}
            title='Payments'
            value={stats.formatNumber(totalPayments)}
            color={colors.info}
            subtitle={`${completedPayments} completed`}
            size={isTablet ? 'large' : 'medium'}
          />
          <StatCard
            icon={<Activity size={isTablet ? 24 : 20} color={colors.warning} />}
            title='Transactions'
            value={stats.formatNumber(todayTransactions)}
            color={colors.warning}
            subtitle='Today'
            size={isTablet ? 'large' : 'medium'}
          />
        </View>

        {/* Row 3: Success Rate & Active Wallets */}
        <View style={styles.statsRow}>
          <StatCard
            icon={
              <TrendingUp size={isTablet ? 24 : 20} color={colors.success} />
            }
            title='Success Rate'
            value={`${stats.paymentSuccessRate.toFixed(1)}%`}
            color={colors.success}
            subtitle='Payment success'
            size={isTablet ? 'large' : 'medium'}
          />
          <StatCard
            icon={<Users size={isTablet ? 24 : 20} color={colors.primary} />}
            title='Active Wallets'
            value={stats.formatNumber(activeWallets)}
            color={colors.primary}
            subtitle={`${stats.activeWalletPercentage.toFixed(1)}% of total`}
            size={isTablet ? 'large' : 'medium'}
          />
        </View>
      </View>

      {/* Payment Status Summary */}
      <View style={styles.paymentSummary}>
        <Text style={styles.summaryTitle}>Payment Status Breakdown</Text>
        <View style={styles.summaryGrid}>
          {paymentSummaryData.map((item, index) => (
            <View key={index} style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIndicator,
                  { backgroundColor: item.color },
                ]}
              />
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: colors.background,
    // marginHorizontal: 16,
    // marginVertical: 8,
    // borderRadius: 16,
    // padding: 20,
    // shadowColor: colors.shadow,
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // elevation: 3,
    marginBottom: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  paymentSummary: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

export default memo(FinanceStats);
