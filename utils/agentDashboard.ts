import { AgentDashboardStats } from '@/types/agent';
import { getInactiveBookings } from './bookingUtils';

/**
 * Process and combine dashboard stats from different sources
 */
export const getDashboardStats = (
  stats: AgentDashboardStats | null,
  localStats: AgentDashboardStats | null
): AgentDashboardStats => {
  return {
    totalBookings: stats?.totalBookings || localStats?.totalBookings || 0,
    activeBookings: localStats?.activeBookings || stats?.activeBookings || 0, // Prioritize local calculation
    completedBookings: stats?.completedBookings || localStats?.completedBookings || 0,
    cancelledBookings: stats?.cancelledBookings || localStats?.cancelledBookings || 0,
    totalRevenue: stats?.totalRevenue || localStats?.totalRevenue || 0,
    totalCommission: stats?.totalCommission || localStats?.totalCommission || 0,
    uniqueClients: stats?.uniqueClients || localStats?.uniqueClients || 0,
  };
};

/**
 * Get and sort recent bookings for dashboard display
 */
export const getDashboardBookings = (bookings: any[] | null): any[] => {
  if (!bookings) return [];
  
  return bookings
    .slice() // Create a copy
    .sort((a, b) => new Date(b.bookingDate || 0).getTime() - new Date(a.bookingDate || 0).getTime())
    .slice(0, 3);
};

/**
 * Calculate inactive bookings count
 */
export const getInactiveBookingsCount = (bookings: any[] | null): number => {
  if (!bookings) return 0;
  return getInactiveBookings(bookings).length;
}; 