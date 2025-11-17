import { AgentDashboardStats } from '@/types/agent';
import { getInactiveBookings } from './bookingUtils';

/**
 * Process and combine dashboard stats from different sources
 * Recalculates revenue and commission from bookings to exclude cancelled bookings
 */
export const getDashboardStats = (
  stats: AgentDashboardStats | null,
  localStats: AgentDashboardStats | null,
  bookings?: any[] | null
): AgentDashboardStats => {
  // Recalculate revenue and commission from bookings if available
  // This ensures cancelled bookings are excluded
  let calculatedRevenue = stats?.totalRevenue || localStats?.totalRevenue || 0;
  let calculatedCommission =
    stats?.totalCommission || localStats?.totalCommission || 0;

  if (bookings && bookings.length > 0) {
    // Only count revenue from confirmed, checked_in, or completed bookings (exclude cancelled)
    const validRevenueBookings = bookings.filter(
      b =>
        b.status === 'confirmed' ||
        b.status === 'checked_in' ||
        b.status === 'completed'
    );

    calculatedRevenue = validRevenueBookings.reduce(
      (sum, booking) =>
        sum + (booking.totalAmount || booking.discountedAmount || 0),
      0
    );

    calculatedCommission = validRevenueBookings.reduce(
      (sum, booking) => sum + (booking.commission || 0),
      0
    );
  }

  return {
    totalBookings: stats?.totalBookings || localStats?.totalBookings || 0,
    activeBookings: localStats?.activeBookings || stats?.activeBookings || 0, // Prioritize local calculation
    completedBookings:
      stats?.completedBookings || localStats?.completedBookings || 0,
    cancelledBookings:
      stats?.cancelledBookings || localStats?.cancelledBookings || 0,
    totalRevenue: calculatedRevenue,
    totalCommission: calculatedCommission,
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
    .sort(
      (a, b) =>
        new Date(b.bookingDate || 0).getTime() -
        new Date(a.bookingDate || 0).getTime()
    )
    .slice(0, 3);
};

/**
 * Calculate inactive bookings count
 */
export const getInactiveBookingsCount = (bookings: any[] | null): number => {
  if (!bookings) return 0;
  return getInactiveBookings(bookings).length;
};

/**
 * Calculate advanced performance metrics
 */
export interface PerformanceMetrics {
  completionRate: number;
  cancellationRate: number;
  averageRevenuePerBooking: number;
  averageCommissionPerBooking: number;
  clientRetentionRate: number;
  revenueGrowthRate: number;
}

export const calculatePerformanceMetrics = (
  bookings: any[] | null,
  clients: any[] | null,
  previousPeriodBookings?: any[] | null
): PerformanceMetrics => {
  if (!bookings || bookings.length === 0) {
    return {
      completionRate: 0,
      cancellationRate: 0,
      averageRevenuePerBooking: 0,
      averageCommissionPerBooking: 0,
      clientRetentionRate: 0,
      revenueGrowthRate: 0,
    };
  }

  const completedBookings = bookings.filter(
    b => b.status === 'completed'
  ).length;
  const cancelledBookings = bookings.filter(
    b => b.status === 'cancelled'
  ).length;
  // Only count revenue from confirmed, checked_in, or completed bookings (exclude cancelled)
  const validRevenueBookings = bookings.filter(
    b =>
      b.status === 'confirmed' ||
      b.status === 'checked_in' ||
      b.status === 'completed'
  );
  const totalRevenue = validRevenueBookings.reduce(
    (sum, booking) =>
      sum + (booking.totalAmount || booking.discountedAmount || 0),
    0
  );
  const totalCommission = validRevenueBookings.reduce(
    (sum, booking) => sum + (booking.commission || 0),
    0
  );

  // Calculate client retention (clients with multiple bookings)
  const clientBookingCounts = new Map();
  bookings.forEach(booking => {
    const clientId = booking.clientId;
    clientBookingCounts.set(
      clientId,
      (clientBookingCounts.get(clientId) || 0) + 1
    );
  });
  const returningClients = Array.from(clientBookingCounts.values()).filter(
    count => count > 1
  ).length;
  const totalUniqueClients = clientBookingCounts.size;

  // Calculate revenue growth rate if previous period data is available
  let revenueGrowthRate = 0;
  if (previousPeriodBookings && previousPeriodBookings.length > 0) {
    const previousValidBookings = previousPeriodBookings.filter(
      b =>
        b.status === 'confirmed' ||
        b.status === 'checked_in' ||
        b.status === 'completed'
    );
    const previousRevenue = previousValidBookings.reduce(
      (sum, booking) =>
        sum + (booking.totalAmount || booking.discountedAmount || 0),
      0
    );
    if (previousRevenue > 0) {
      revenueGrowthRate =
        ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    }
  }

  return {
    completionRate:
      bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0,
    cancellationRate:
      bookings.length > 0 ? (cancelledBookings / bookings.length) * 100 : 0,
    averageRevenuePerBooking:
      validRevenueBookings.length > 0
        ? totalRevenue / validRevenueBookings.length
        : 0,
    averageCommissionPerBooking:
      validRevenueBookings.length > 0
        ? totalCommission / validRevenueBookings.length
        : 0,
    clientRetentionRate:
      totalUniqueClients > 0
        ? (returningClients / totalUniqueClients) * 100
        : 0,
    revenueGrowthRate,
  };
};

/**
 * Get upcoming bookings (departing within next 7 days)
 */
export const getUpcomingBookings = (bookings: any[] | null): any[] => {
  if (!bookings) return [];

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return bookings
    .filter(booking => {
      if (booking.status !== 'confirmed' && booking.status !== 'pending')
        return false;
      const departureDate = new Date(booking.departureDate);
      return departureDate >= now && departureDate <= nextWeek;
    })
    .sort(
      (a, b) =>
        new Date(a.departureDate).getTime() -
        new Date(b.departureDate).getTime()
    );
};

/**
 * Calculate credit health metrics
 */
export interface CreditHealth {
  utilizationPercentage: number;
  isLowCredit: boolean;
  isCriticalCredit: boolean;
  recommendedTopUp: number;
  daysToDeplete: number;
}

export const calculateCreditHealth = (
  agent: any,
  recentBookings: any[] | null
): CreditHealth => {
  if (!agent) {
    return {
      utilizationPercentage: 0,
      isLowCredit: false,
      isCriticalCredit: false,
      recommendedTopUp: 0,
      daysToDeplete: 0,
    };
  }

  const creditBalance = agent.creditBalance || 0;
  const creditCeiling = agent.creditCeiling || 0;
  const utilizationPercentage =
    creditCeiling > 0
      ? ((creditCeiling - creditBalance) / creditCeiling) * 100
      : 0;

  const isLowCredit = creditBalance < creditCeiling * 0.3;
  const isCriticalCredit = creditBalance < creditCeiling * 0.1;

  // Calculate average daily spending based on recent bookings (only valid revenue bookings)
  let averageDailySpending = 0;
  if (recentBookings && recentBookings.length > 0) {
    const last30Days = recentBookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isValidStatus =
        booking.status === 'confirmed' ||
        booking.status === 'checked_in' ||
        booking.status === 'completed';
      return (
        bookingDate >= thirtyDaysAgo &&
        booking.paymentMethod === 'credit' &&
        isValidStatus
      );
    });

    const totalSpent = last30Days.reduce(
      (sum, booking) =>
        sum + (booking.totalAmount || booking.discountedAmount || 0),
      0
    );
    averageDailySpending = totalSpent / 30;
  }

  const daysToDeplete =
    averageDailySpending > 0
      ? Math.floor(creditBalance / averageDailySpending)
      : 0;
  const recommendedTopUp = isCriticalCredit
    ? creditCeiling * 0.5
    : isLowCredit
      ? creditCeiling * 0.3
      : 0;

  return {
    utilizationPercentage,
    isLowCredit,
    isCriticalCredit,
    recommendedTopUp,
    daysToDeplete,
  };
};

/**
 * Get responsive layout configuration based on screen dimensions
 */
export interface ResponsiveConfig {
  isTablet: boolean;
  isMobile: boolean;
  statsPerRow: number;
  quickActionsPerRow: number;
  cardSpacing: number;
  fontSize: {
    heading: number;
    title: number;
    body: number;
    caption: number;
  };
}

export const getResponsiveConfig = (screenWidth: number): ResponsiveConfig => {
  const isTablet = screenWidth >= 768;
  const isMobile = screenWidth < 768;

  return {
    isTablet,
    isMobile,
    statsPerRow: isTablet ? 4 : 2,
    quickActionsPerRow: isTablet ? 4 : 2,
    cardSpacing: isTablet ? 20 : 16,
    fontSize: {
      heading: isTablet ? 32 : 28,
      title: isTablet ? 22 : 20,
      body: isTablet ? 18 : 16,
      caption: isTablet ? 14 : 12,
    },
  };
};

/**
 * Format booking status for display
 */
export const formatBookingStatus = (
  status: string
): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmed', color: '#2ecc71' },
    completed: { label: 'Completed', color: '#3498db' },
    cancelled: { label: 'Cancelled', color: '#e74c3c' },
    pending: { label: 'Pending', color: '#f39c12' },
    modified: { label: 'Modified', color: '#9b59b6' },
  };

  return statusMap[status] || { label: status, color: '#636e72' };
};

/**
 * Get booking trends over time periods
 */
export interface BookingTrends {
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
  weeklyChange: number;
  monthlyChange: number;
}

export const getBookingTrends = (bookings: any[] | null): BookingTrends => {
  if (!bookings) {
    return {
      thisWeek: 0,
      lastWeek: 0,
      thisMonth: 0,
      lastMonth: 0,
      weeklyChange: 0,
      monthlyChange: 0,
    };
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisWeek = bookings.filter(
    b => new Date(b.bookingDate) >= weekStart
  ).length;
  const lastWeek = bookings.filter(b => {
    const date = new Date(b.bookingDate);
    return date >= lastWeekStart && date < weekStart;
  }).length;

  const thisMonth = bookings.filter(
    b => new Date(b.bookingDate) >= monthStart
  ).length;
  const lastMonth = bookings.filter(b => {
    const date = new Date(b.bookingDate);
    return date >= lastMonthStart && date <= lastMonthEnd;
  }).length;

  const weeklyChange =
    lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
  const monthlyChange =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  return {
    thisWeek,
    lastWeek,
    thisMonth,
    lastMonth,
    weeklyChange,
    monthlyChange,
  };
};
