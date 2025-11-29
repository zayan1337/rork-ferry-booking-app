import { useMemo, useEffect } from 'react';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAuthStore } from '@/store/authStore';
import { DashboardStatsData } from '@/types/admin/dashboard';

export const useDashboardData = () => {
  const {
    alerts,
    bookings,
    trips,
    users,
    vessels,
    routes,
    wallets,
    notifications,
    activityLogs,
    dashboardStats,
    fetchDashboardData,
    loading,
  } = useAdminStore();

  const { user } = useAuthStore();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []); // Empty dependency array to run only once

  // Calculate real-time statistics from database data
  const stats: DashboardStatsData = useMemo(() => {
    return {
      todayBookings: dashboardStats.dailyBookings?.count || 0,
      activeTripsCount: dashboardStats.activeTrips?.count || 0,
      cancelledBookingsCount:
        dashboardStats.activeTrips?.cancelled_bookings || 0,
      totalWalletBalance: dashboardStats.walletStats?.total_balance || 0,
      unreadNotifications: alerts.filter(a => !a.read).length,
      dailyBookingsRevenue: dashboardStats.dailyBookings?.revenue || 0,
      totalRevenue: dashboardStats.totalRevenue || 0,
      activeUsersTotal: dashboardStats.activeUsers?.total || 0,
      onlineUsers: dashboardStats.activeUsers?.online_now || 0,
      walletCount: dashboardStats.walletStats?.active_wallets || 0,
      dailyBookingsChange: dashboardStats.dailyBookings?.change_percentage || 0,
      dailyRevenueChange: dashboardStats.revenueChangePercentage || 0,
    };
  }, [dashboardStats, alerts]);

  const adminProfile = user?.profile;
  const adminName =
    adminProfile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const adminRole = adminProfile?.role || 'admin';

  const criticalAlerts = alerts.filter(
    a => a.severity === 'critical' && !a.read
  ).length;

  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'AD';
  };

  return {
    stats,
    adminName,
    adminRole,
    criticalAlerts,
    alerts,
    bookings,
    trips,
    activityLogs,
    getInitials,
    isLoading: loading.dashboard || false,
  };
};
