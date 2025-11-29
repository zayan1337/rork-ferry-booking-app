import React from 'react';
import { colors } from '@/constants/adminColors';
import {
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
} from 'lucide-react-native';
import { StatsSection } from '@/components/admin/common';
import { formatCurrency } from '@/utils/currencyUtils';

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
  totalRefundedAmount?: number;
  todayRefundedAmount?: number;
  todayTripBookings?: number;
  todayCancelledCount?: number;
}

interface BookingsStatsProps {
  stats: BookingsStatsData;
  isTablet: boolean;
}

export default function BookingsStats({ stats, isTablet }: BookingsStatsProps) {
  const totalRefunded = stats.totalRefundedAmount || 0;
  const todayRefunded = stats.todayRefundedAmount || 0;
  const todayTripBookings = stats.todayTripBookings || 0;
  const todayCancelled = stats.todayCancelledCount || 0;

  const statItems = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings.toString(),
      subtitle: `${formatCurrency(stats.todayRevenue, 'MVR')} revenue`,
      icon: <CreditCard size={isTablet ? 20 : 18} color={colors.primary} />,
      trend:
        Number(stats.todayBookingsChange) !== 0
          ? Number(stats.todayBookingsChange) > 0
            ? ('up' as const)
            : ('down' as const)
          : undefined,
      trendValue:
        Number(stats.todayBookingsChange) !== 0
          ? `${Math.abs(Number(stats.todayBookingsChange))}%`
          : undefined,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue, 'MVR'),
      subtitle: `Today: ${formatCurrency(stats.todayRevenue, 'MVR')}`,
      icon: <TrendingUp size={isTablet ? 20 : 18} color={colors.success} />,
      color: colors.success,
      trend:
        Number(stats.todayRevenueChange) !== 0
          ? Number(stats.todayRevenueChange) > 0
            ? ('up' as const)
            : ('down' as const)
          : undefined,
      trendValue:
        Number(stats.todayRevenueChange) !== 0
          ? `${Math.abs(Number(stats.todayRevenueChange))}%`
          : undefined,
    },
    {
      title: 'Cancelled Bookings',
      value: stats.cancelledCount.toString(),
      subtitle: `Today: ${todayCancelled} cancelled`,
      icon: <XCircle size={isTablet ? 20 : 18} color={colors.error} />,
      color: colors.error,
    },
    {
      title: 'Refunded Amount',
      value: formatCurrency(totalRefunded, 'MVR'),
      subtitle: `Today: ${formatCurrency(todayRefunded, 'MVR')}`,
      icon: <DollarSign size={isTablet ? 20 : 18} color={colors.warning} />,
      color: colors.warning,
    },
    {
      title: "Today's Trip Bookings",
      value: todayTripBookings.toString(),
      subtitle: 'Bookings for trips today',
      icon: (
        <Calendar
          size={isTablet ? 20 : 18}
          color={colors.info || colors.secondary}
        />
      ),
      color: colors.info || colors.secondary,
    },
    {
      title: 'Confirmed',
      value: stats.confirmedCount.toString(),
      subtitle: `${stats.confirmedRate}% success rate`,
      icon: <CheckCircle size={isTablet ? 20 : 18} color={colors.success} />,
      color: colors.success,
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
