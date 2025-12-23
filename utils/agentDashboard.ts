import { AgentDashboardStats } from '@/types/agent';
import { getInactiveBookings } from './bookingUtils';
import {
  calculateTotalRevenueAsync,
  type BookingForRevenue,
} from './revenueCalculation';
import {
  parseMaldivesDateTime,
  getMaldivesTimeComponents,
} from './timezoneUtils';

/**
 * Process and combine dashboard stats from different sources
 * Recalculates revenue from bookings to include partial refunds from cancelled bookings
 */
export const getDashboardStats = async (
  stats: AgentDashboardStats | null,
  localStats: AgentDashboardStats | null,
  bookings?: any[] | null
): Promise<AgentDashboardStats> => {
  // Recalculate revenue from bookings if available
  // This includes partial refunds from cancelled bookings
  let calculatedRevenue = stats?.totalRevenue || localStats?.totalRevenue || 0;
  let calculatedCommission =
    stats?.totalCommission || localStats?.totalCommission || 0;

  if (bookings && bookings.length > 0) {
    // Prepare bookings for revenue calculation (including cancelled with partial refunds)
    const bookingsForRevenue: BookingForRevenue[] = bookings.map(booking => ({
      id: booking.id,
      status: booking.status,
      // ✅ Use discountedAmount (what client paid) not totalAmount (original fare)
      total_fare: booking.discountedAmount || booking.totalAmount || 0,
    }));

    // Calculate net revenue accounting for partial refunds
    calculatedRevenue = await calculateTotalRevenueAsync(bookingsForRevenue);

    // Commission calculation - only from valid revenue bookings (confirmed, checked_in, completed)
    const validRevenueBookings = bookings.filter(
      b =>
        b.status === 'confirmed' ||
        b.status === 'checked_in' ||
        b.status === 'completed'
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

export const calculatePerformanceMetrics = async (
  bookings: any[] | null,
  clients: any[] | null,
  previousPeriodBookings?: any[] | null
): Promise<PerformanceMetrics> => {
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

  // Prepare bookings for revenue calculation (including cancelled with partial refunds)
  const bookingsForRevenue: BookingForRevenue[] = bookings.map(booking => ({
    id: booking.id,
    status: booking.status,
    // ✅ Use discountedAmount (what client paid) not totalAmount (original fare)
    total_fare: booking.discountedAmount || booking.totalAmount || 0,
  }));

  // Calculate net revenue accounting for partial refunds
  const totalRevenue = await calculateTotalRevenueAsync(bookingsForRevenue);

  // Commission calculation - only from valid revenue bookings (confirmed, checked_in, completed)
  const validRevenueBookings = bookings.filter(
    b =>
      b.status === 'confirmed' ||
      b.status === 'checked_in' ||
      b.status === 'completed'
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
    const previousBookingsForRevenue: BookingForRevenue[] =
      previousPeriodBookings.map(booking => ({
        id: booking.id,
        status: booking.status,
        // ✅ Use discountedAmount (what client paid) not totalAmount (original fare)
        total_fare: booking.discountedAmount || booking.totalAmount || 0,
      }));
    const previousRevenue = await calculateTotalRevenueAsync(
      previousBookingsForRevenue
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

  const now = Date.now();
  const nextWeekMs = now + 7 * 24 * 60 * 60 * 1000;

  return bookings
    .filter(booking => {
      if (booking.status !== 'confirmed' && booking.status !== 'pending')
        return false;
      // Parse departure date/time in Maldives timezone for accurate comparison
      const departureDateTime = parseMaldivesDateTime(
        booking.departureDate,
        booking.departureTime || '00:00'
      );
      const departureMs = departureDateTime.getTime();
      return departureMs >= now && departureMs <= nextWeekMs;
    })
    .sort((a, b) => {
      // Sort by departure datetime in Maldives timezone
      const dateTimeA = parseMaldivesDateTime(
        a.departureDate,
        a.departureTime || '00:00'
      );
      const dateTimeB = parseMaldivesDateTime(
        b.departureDate,
        b.departureTime || '00:00'
      );
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
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
        // ✅ Use discountedAmount (what client paid) not totalAmount (original fare)
        sum + (booking.discountedAmount || booking.totalAmount || 0),
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

  // Get current time components in Maldives timezone
  const maldivesTime = getMaldivesTimeComponents(new Date());

  // Calculate week start (Sunday) in Maldives timezone
  const now = new Date();
  const dayOfWeek = new Date(
    now.getTime() + 5 * 60 * 60 * 1000 // Adjust to Maldives UTC+5
  ).getUTCDay();

  const weekStartMs = Date.now() - dayOfWeek * 24 * 60 * 60 * 1000;
  const weekStart = new Date(weekStartMs);
  weekStart.setUTCHours(0 - 5, 0, 0, 0); // Set to midnight in Maldives (UTC+5)

  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Calculate month boundaries in Maldives timezone
  const monthStart = new Date(
    Date.UTC(maldivesTime.year, maldivesTime.month - 1, 1, -5, 0, 0, 0)
  );
  const lastMonthStart = new Date(
    Date.UTC(maldivesTime.year, maldivesTime.month - 2, 1, -5, 0, 0, 0)
  );
  const lastMonthEnd = new Date(
    Date.UTC(maldivesTime.year, maldivesTime.month - 1, 0, 18, 59, 59, 999)
  ); // End of last day

  const thisWeek = bookings.filter(b => {
    const bookingDate = new Date(b.bookingDate);
    return bookingDate >= weekStart;
  }).length;

  const lastWeek = bookings.filter(b => {
    const date = new Date(b.bookingDate);
    return date >= lastWeekStart && date < weekStart;
  }).length;

  const thisMonth = bookings.filter(b => {
    const bookingDate = new Date(b.bookingDate);
    return bookingDate >= monthStart;
  }).length;

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
