import React from 'react';
import { colors } from '@/constants/adminColors';
import { CreditCard, Ship, Users, DollarSign } from 'lucide-react-native';
import { StatsSection } from '@/components/admin/common';
import { DashboardStatsData } from '@/types/admin/dashboard';
import { formatCurrency } from '@/utils/currencyUtils';

interface DashboardStatsProps {
  stats: DashboardStatsData;
  isTablet: boolean;
  canViewBookings: boolean;
  canViewTrips: boolean;
  canViewUsers: boolean;
  canViewWallets: boolean;
  canViewFinance?: boolean;
}

export default function DashboardStats({
  stats,
  isTablet,
  canViewBookings,
  canViewTrips,
  canViewUsers,
  canViewWallets,
  canViewFinance = true,
}: DashboardStatsProps) {
  const statItems = [];

  if (canViewBookings) {
    statItems.push({
      title: "Today's Bookings",
      value: stats.todayBookings.toString(),
      subtitle: `MVR ${stats.dailyBookingsRevenue.toFixed(2)} Revenue`,
      icon: <CreditCard size={isTablet ? 20 : 18} color={colors.primary} />,
      trend:
        stats.dailyBookingsChange !== 0
          ? stats.dailyBookingsChange > 0
            ? ('up' as const)
            : ('down' as const)
          : undefined,
      trendValue:
        stats.dailyBookingsChange !== 0
          ? `${Math.abs(stats.dailyBookingsChange).toFixed(1)}%`
          : undefined,
    });
  }

  if (canViewTrips) {
    statItems.push({
      title: 'Active Trips',
      value: stats.activeTripsCount.toString(),
      subtitle: `${stats.cancelledBookingsCount} cancelled bookings`,
      icon: <Ship size={isTablet ? 20 : 18} color={colors.secondary} />,
      color: colors.secondary,
    });
  }

  if (canViewUsers) {
    statItems.push({
      title: 'Active Users',
      value: stats.activeUsersTotal.toString(),
      subtitle: `${stats.onlineUsers} online now`,
      icon: <Users size={isTablet ? 20 : 18} color='#34C759' />,
      color: '#34C759',
    });
  }

  if (canViewFinance || canViewWallets) {
    statItems.push({
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue || 0, 'MVR'),
      subtitle: `MVR ${stats.dailyBookingsRevenue.toFixed(2)} today`,
      icon: <DollarSign size={isTablet ? 20 : 18} color='#FF9500' />,
      color: '#FF9500',
      trend:
        stats.dailyRevenueChange !== 0
          ? stats.dailyRevenueChange > 0
            ? ('up' as const)
            : ('down' as const)
          : undefined,
      trendValue:
        stats.dailyRevenueChange !== 0
          ? `${Math.abs(stats.dailyRevenueChange).toFixed(1)}%`
          : undefined,
    });
  }

  return (
    <StatsSection
      title='Dashboard Overview'
      subtitle='Performance metrics and trends'
      stats={statItems}
      isTablet={isTablet}
      headerSize={isTablet ? 'large' : 'medium'}
    />
  );
}
