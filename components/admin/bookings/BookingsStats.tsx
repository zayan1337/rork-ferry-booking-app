import React from 'react';
import { colors } from '@/constants/adminColors';
import {
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import { StatsSection } from '@/components/admin/common';

interface BookingsStatsData {
  totalBookings: number;
  todayBookings: number;
  todayBookingsChange: string;
  todayRevenue: number;
  todayRevenueChange: string;
  totalRevenue: number;
  confirmedCount: number;
  confirmedRate: string;
  reservedCount: number;
  cancelledCount: number;
  completedCount: number;
}

interface BookingsStatsProps {
  stats: BookingsStatsData;
  isTablet: boolean;
}

export default function BookingsStats({ stats, isTablet }: BookingsStatsProps) {
  const statItems = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings.toString(),
      subtitle: `MVR ${stats.todayRevenue.toFixed(2)} revenue`,
      icon: <CreditCard size={isTablet ? 20 : 18} color={colors.primary} />,
      trend:
        Number(stats.todayBookingsChange) >= 0
          ? ('up' as const)
          : ('down' as const),
      trendValue: `${Math.abs(Number(stats.todayBookingsChange))}%`,
    },
    {
      title: 'Total Revenue',
      value: `MVR ${stats.totalRevenue.toLocaleString()}`,
      subtitle: `Today: MVR ${stats.todayRevenue.toFixed(2)}`,
      icon: <TrendingUp size={isTablet ? 20 : 18} color={colors.success} />,
      color: colors.success,
      trend:
        Number(stats.todayRevenueChange) >= 0
          ? ('up' as const)
          : ('down' as const),
      trendValue: `${Math.abs(Number(stats.todayRevenueChange))}%`,
    },
    {
      title: 'Confirmed',
      value: stats.confirmedCount.toString(),
      subtitle: `${stats.confirmedRate}% success rate`,
      icon: <CheckCircle size={isTablet ? 20 : 18} color={colors.success} />,
      color: colors.success,
    },
    {
      title: 'Reserved',
      value: stats.reservedCount.toString(),
      subtitle:
        stats.reservedCount > 0 ? 'Needs confirmation' : 'All confirmed',
      icon: <Clock size={isTablet ? 20 : 18} color={colors.warning} />,
      color: colors.warning,
    },
  ];

  return (
    <StatsSection
      title='Bookings Overview'
      subtitle='Performance metrics and trends'
      stats={statItems}
      isTablet={isTablet}
      headerSize={isTablet ? 'large' : 'medium'}
    />
  );
}
