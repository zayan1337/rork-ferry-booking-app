import React from 'react';
import { Wallet, TrendingUp, CreditCard, Activity } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';

// Common Components
import { StatsSection } from '@/components/admin/common';

interface FinanceStatsProps {
  totalWalletBalance: number;
  activeWallets: number;
  todayRevenue: number;
  todayTransactions: number;
  paymentSuccessRate: number;
  completedPayments: number;
  revenueChangePercentage?: number;
  isTablet?: boolean;
}

export default function FinanceStats({
  totalWalletBalance,
  activeWallets,
  todayRevenue,
  todayTransactions,
  paymentSuccessRate,
  completedPayments,
  revenueChangePercentage = 0,
  isTablet = false,
}: FinanceStatsProps) {
  const financeStatsData = [
    {
      title: 'Total Balance',
      value: `MVR ${totalWalletBalance.toFixed(2)}`,
      subtitle: `${activeWallets} wallets`,
      icon: <Wallet size={isTablet ? 20 : 18} color={colors.primary} />,
    },
    {
      title: "Today's Revenue",
      value: `MVR ${todayRevenue.toFixed(2)}`,
      subtitle: `${todayTransactions} transactions`,
      icon: <TrendingUp size={isTablet ? 20 : 18} color='#34C759' />,
      color: '#34C759',
      trend: revenueChangePercentage >= 0 ? 'up' : 'down',
      trendValue: `${Math.abs(revenueChangePercentage)}%`,
    },
    {
      title: 'Payment Success',
      value: `${Math.round(paymentSuccessRate)}%`,
      subtitle: `${completedPayments} completed`,
      icon: <CreditCard size={isTablet ? 20 : 18} color='#FF9500' />,
      color: '#FF9500',
    },
    {
      title: 'Transactions',
      value: todayTransactions.toString(),
      subtitle: 'today',
      icon: <Activity size={isTablet ? 20 : 18} color='#8E44AD' />,
      color: '#8E44AD',
    },
  ];

  return (
    <StatsSection
      title='Financial Overview'
      subtitle='Performance metrics and trends'
      stats={financeStatsData}
      isTablet={isTablet}
      headerSize={isTablet ? 'large' : 'medium'}
    />
  );
}
