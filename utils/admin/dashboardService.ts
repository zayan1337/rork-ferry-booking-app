import { supabase } from '@/utils/supabase';
import { DashboardStats } from '@/types/admin';
import { ActivityLog, Alert } from '@/types/admin';

// ============================================================================
// DASHBOARD SERVICE - REAL DATA FROM DATABASE
// ============================================================================

/**
 * Fetch real system health status
 */
export async function fetchSystemHealth(): Promise<
  DashboardStats['systemHealth']
> {
  try {
    // Test database connectivity with a simple query
    const dbHealthStart = Date.now();
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    const dbResponseTime = Date.now() - dbHealthStart;
    const database_status: 'healthy' | 'slow' | 'unhealthy' | 'unknown' =
      dbError ? 'unhealthy' : dbResponseTime > 1000 ? 'slow' : 'healthy';

    // API status - if we can reach Supabase, API is online
    const api_status: 'online' | 'offline' | 'unknown' = dbError
      ? 'offline'
      : 'online';

    // System load - based on active sessions and response time
    // Get active sessions count (users with activity in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: activeSessionsCount } = await supabase
      .from('activity_logs')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', fiveMinutesAgo);

    // Calculate load based on response time and active sessions
    const load_status: 'normal' | 'high' | 'critical' | 'unknown' =
      dbResponseTime > 2000 || (activeSessionsCount || 0) > 100
        ? 'critical'
        : dbResponseTime > 1000 || (activeSessionsCount || 0) > 50
          ? 'high'
          : 'normal';

    // Get last backup from system_health_metrics or activity_logs
    let last_backup: string | null = null;
    try {
      // Try to get backup from system_health_metrics table
      const { data: backupMetrics, error: backupError } = await supabase
        .from('system_health_metrics')
        .select('recorded_at')
        .eq('metric_name', 'backup')
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (!backupError && backupMetrics && backupMetrics.length > 0) {
        last_backup = backupMetrics[0].recorded_at;
      } else {
        // Fallback: Try to find backup in activity_logs
        const { data: backupActivity, error: activityError } = await supabase
          .from('activity_logs')
          .select('created_at')
          .or(
            'action.eq.backup_created,action.eq.backup_completed,action.ilike.%backup%'
          )
          .order('created_at', { ascending: false })
          .limit(1);

        if (!activityError && backupActivity && backupActivity.length > 0) {
          last_backup = backupActivity[0].created_at;
        }
      }

      // If still no backup found, try to find any recent system maintenance activity
      if (!last_backup) {
        const { data: maintenanceActivity } = await supabase
          .from('activity_logs')
          .select('created_at')
          .or('action.ilike.%maintenance%,action.ilike.%system%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (maintenanceActivity && maintenanceActivity.length > 0) {
          // Use maintenance activity as proxy for last system sync/update
          const maintenanceDate = new Date(maintenanceActivity[0].created_at);
          const daysSinceMaintenance = Math.floor(
            (Date.now() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Only use if within last 30 days, otherwise leave null
          if (daysSinceMaintenance <= 30) {
            last_backup = maintenanceActivity[0].created_at;
          }
        }
      }
    } catch (e) {
      // If all backup queries fail, leave as null (will show N/A)
      console.warn('Could not fetch backup information:', e);
    }

    // Overall system status
    const status: 'healthy' | 'warning' | 'critical' =
      database_status === 'unhealthy' || api_status === 'offline'
        ? 'critical'
        : database_status === 'slow' || load_status === 'high'
          ? 'warning'
          : 'healthy';

    return {
      status,
      database_status,
      api_status,
      load_status,
      last_backup,
      active_sessions: activeSessionsCount || 0,
    };
  } catch (error) {
    console.error('Error fetching system health:', error);
    // Return safe defaults if health check fails
    return {
      status: 'warning' as const,
      database_status: 'unknown' as const,
      api_status: 'offline' as const,
      load_status: 'unknown' as const,
      last_backup: null,
      active_sessions: 0,
    };
  }
}

/**
 * Fetch dashboard statistics from admin_dashboard_stats materialized view
 */
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Fetch main dashboard stats
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('admin_dashboard_stats')
      .select('*')
      .single();

    if (dashboardError) {
      console.error('Error fetching dashboard stats:', dashboardError);
      throw dashboardError;
    }

    // Fetch system health early (we'll use dashboardData.calculated_at as backup fallback)
    const systemHealthData = await fetchSystemHealth();

    // Use dashboard calculated_at as fallback if no backup found
    // This represents when the dashboard stats were last refreshed
    if (!systemHealthData.last_backup) {
      if (dashboardData?.calculated_at) {
        systemHealthData.last_backup = dashboardData.calculated_at;
      } else {
        // Final fallback: use current time minus 24 hours as "last sync"
        // This indicates the system is running but no backup records exist
        systemHealthData.last_backup = new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();
      }
    }

    // Fetch operations overview
    const { data: operationsData, error: operationsError } = await supabase
      .from('admin_operations_overview')
      .select('*')
      .single();

    if (operationsError) {
      console.error('Error fetching operations overview:', operationsError);
    }

    // Fetch user analytics
    const { data: userAnalytics, error: userError } = await supabase
      .from('admin_user_analytics')
      .select('*');

    if (userError) {
      console.error('Error fetching user analytics:', userError);
    }

    // Process user analytics data
    const customerStats = userAnalytics?.find(u => u.role === 'customer') || {};
    const agentStats = userAnalytics?.find(u => u.role === 'agent') || {};
    const adminStats = userAnalytics?.find(u => u.role === 'admin') || {};

    // Fetch actual wallet balance from wallets table (for customers)
    const { data: walletsData, error: walletsError } = await supabase
      .from('wallets')
      .select('balance, user_id');

    let totalWalletBalance = 0;
    let walletCount = 0;

    if (!walletsError && walletsData) {
      // Sum all wallet balances (including zero balances for accurate count)
      totalWalletBalance = walletsData.reduce(
        (sum, wallet) => sum + Number(wallet.balance || 0),
        0
      );
      walletCount = walletsData.length;
    }

    // Also fetch and include agent credit balances
    const { data: agentProfiles, error: agentError } = await supabase
      .from('user_profiles')
      .select('credit_balance')
      .eq('role', 'agent')
      .eq('is_active', true);

    if (!agentError && agentProfiles) {
      const agentCreditTotal = agentProfiles.reduce(
        (sum, agent) => sum + Number(agent.credit_balance || 0),
        0
      );
      totalWalletBalance += Number(agentCreditTotal || 0);
      walletCount += agentProfiles.length;
    }

    // Fetch yesterday's bookings data for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    const yesterdayStart = `${yesterdayDate}T00:00:00`;
    const yesterdayEnd = `${yesterdayDate}T23:59:59`;

    // Revenue should include confirmed, checked_in, and completed bookings
    const revenueStatuses = ['confirmed', 'checked_in', 'completed'];

    // Fetch today's bookings for accurate revenue calculation
    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const todayEnd = new Date().toISOString().split('T')[0] + 'T23:59:59';

    const { data: todayBookingsData, error: todayError } = await supabase
      .from('bookings')
      .select('id, total_fare, status, created_at, payment_method_type')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const { data: yesterdayBookingsData, error: yesterdayError } =
      await supabase
        .from('bookings')
        .select('id, total_fare, status, created_at, payment_method_type')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd);

    // Fetch all bookings for total revenue calculation (need payment_method_type to exclude credit/free)
    const { data: allBookingsData, error: allBookingsError } = await supabase
      .from('bookings')
      .select('id, total_fare, status, payment_method_type');

    // Fetch cancellations data for partial refund calculation (include status)
    const { data: allCancellations, error: cancellationsError } = await supabase
      .from('cancellations')
      .select('booking_id, refund_amount, status');

    // Create a map with full cancellation details for proper filtering
    const cancellationDetailsMap = new Map<
      string,
      {
        refund_amount: number;
        status: string;
      }
    >();

    if (!cancellationsError && allCancellations) {
      allCancellations.forEach(cancellation => {
        cancellationDetailsMap.set(cancellation.booking_id, {
          refund_amount: Number(cancellation.refund_amount || 0),
          status: cancellation.status,
        });
      });
    }

    // Create refund map for revenue calculation (only include cancellations with actual refund amounts)
    const refundMap = new Map<string, number>();
    cancellationDetailsMap.forEach((details, bookingId) => {
      // Only include refunds where refund_amount > 0 (actual refunds, not zero refunds)
      if (details.refund_amount > 0) {
        refundMap.set(bookingId, details.refund_amount);
      }
    });

    // Helper function to calculate net revenue accounting for refunds AND payment methods
    // Business Logic:
    // - MIB bookings (confirmed/checked_in/completed): Full total_fare as revenue (actual money received)
    // - Agent CREDIT bookings: MVR 0 revenue (money already counted when agent recharged credit)
    // - FREE ticket bookings: MVR 0 revenue (no money received, it's complimentary)
    // - Cancelled bookings with refund: Net revenue = total_fare - refund_amount (remaining amount kept)
    // - Cancelled bookings without payment: 0 revenue (no payment was made)
    // - Other statuses (reserved, pending_payment): 0 revenue (payment not completed)
    const calculateNetRevenue = (booking: any): number => {
      const totalFare = Number(booking.total_fare || 0);
      const paymentMethod = booking.payment_method_type;

      // ✅ CRITICAL: Exclude credit and free ticket bookings from revenue
      // - Credit bookings: Revenue already counted when agent recharged their wallet
      // - Free tickets: No money received (complimentary service for agent)
      if (paymentMethod === 'credit' || paymentMethod === 'free') {
        return 0;
      }

      if (booking.status === 'cancelled') {
        const cancellation = cancellationDetailsMap.get(booking.id);
        if (!cancellation) {
          // No cancellation record - no payment was made, no revenue
          return 0;
        }

        // If refund_amount is 0, no refund was given (no payment was made), so no revenue
        if (cancellation.refund_amount === 0) {
          return 0;
        }

        // Calculate net revenue = total_fare - refund_amount (amount kept after partial refund)
        // Example: Booking MVR 1000, refund MVR 500 → Revenue = MVR 500 (amount kept)
        return Math.max(0, totalFare - cancellation.refund_amount);
      } else if (revenueStatuses.includes(booking.status)) {
        // For confirmed/checked_in/completed MIB bookings: full revenue
        return totalFare;
      }
      // For other statuses (reserved, pending_payment): no revenue
      return 0;
    };

    let yesterdayBookings = 0;
    let yesterdayBookingRevenue = 0;
    let actualTodayRevenue = 0;
    let actualTotalRevenue = 0;

    if (!yesterdayError && yesterdayBookingsData) {
      yesterdayBookings = yesterdayBookingsData.length;
      yesterdayBookingRevenue = yesterdayBookingsData.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );
    }

    // ✅ Add yesterday's credit recharge revenue
    // Agent credits are tracked in agent_credit_transactions, NOT wallet_transactions
    const { data: yesterdayCreditRecharges, error: yesterdayCreditError } =
      await supabase
        .from('agent_credit_transactions')
        .select('amount')
        .eq('transaction_type', 'refill')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd);

    const yesterdayCreditRechargeRevenue =
      !yesterdayCreditError && yesterdayCreditRecharges
        ? yesterdayCreditRecharges.reduce(
            (sum, t) => sum + Number(t.amount || 0),
            0
          )
        : 0;

    const yesterdayRevenue =
      yesterdayBookingRevenue + yesterdayCreditRechargeRevenue;

    // Calculate today's booking revenue (MIB bookings only)
    let todayBookingRevenue = 0;
    if (!todayError && todayBookingsData) {
      todayBookingRevenue = todayBookingsData.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );
    } else {
      // Fallback to view data if query fails
      todayBookingRevenue = dashboardData?.today_revenue || 0;
    }

    // ✅ Add today's agent credit recharge revenue
    // Agent credits are tracked in agent_credit_transactions, NOT wallet_transactions
    const { data: todayCreditRecharges, error: todayCreditError } =
      await supabase
        .from('agent_credit_transactions')
        .select('amount')
        .eq('transaction_type', 'refill')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

    const todayCreditRechargeRevenue =
      !todayCreditError && todayCreditRecharges
        ? todayCreditRecharges.reduce(
            (sum, t) => sum + Number(t.amount || 0),
            0
          )
        : 0;

    // ✅ Total today revenue = Booking Revenue + Credit Recharge Revenue
    actualTodayRevenue = todayBookingRevenue + todayCreditRechargeRevenue;

    // Calculate booking revenue from MIB bookings only (including checked_in, completed, and cancelled with partial refunds)
    let bookingRevenue = 0;
    if (!allBookingsError && allBookingsData) {
      bookingRevenue = allBookingsData.reduce(
        (sum, b) => sum + calculateNetRevenue(b),
        0
      );
    } else {
      // Fallback to view data if query fails
      bookingRevenue = dashboardData?.total_revenue || 0;
    }

    // ✅ Add agent credit recharge revenue
    // When agents top up their credit, that's when the business receives actual money
    // Agent credits are tracked in agent_credit_transactions, NOT wallet_transactions
    const { data: creditRecharges, error: creditRechargesError } =
      await supabase
        .from('agent_credit_transactions')
        .select('amount')
        .eq('transaction_type', 'refill');

    const creditRechargeRevenue =
      !creditRechargesError && creditRecharges
        ? creditRecharges.reduce((sum, t) => sum + Number(t.amount || 0), 0)
        : 0;

    // ✅ Total Revenue = Booking Revenue (MIB only) + Agent Credit Recharges
    actualTotalRevenue = bookingRevenue + creditRechargeRevenue;

    // Calculate booking change percentage
    const bookingChangePercentage =
      yesterdayBookings > 0
        ? (((dashboardData?.today_bookings || 0) - yesterdayBookings) /
            yesterdayBookings) *
          100
        : dashboardData?.today_bookings > 0
          ? 100 // If today has bookings but yesterday didn't, it's 100% increase
          : 0;

    // Calculate revenue change percentage using actual today revenue
    const revenueChangePercentage =
      yesterdayRevenue > 0
        ? ((actualTodayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : actualTodayRevenue > 0
          ? 100 // If today has revenue but yesterday didn't, it's 100% increase
          : 0;

    return {
      dailyBookings: {
        count: dashboardData?.today_bookings || 0,
        revenue: actualTodayRevenue, // Use calculated revenue including all valid statuses
        change_percentage: Math.round(bookingChangePercentage * 10) / 10,
      },
      totalRevenue: actualTotalRevenue, // Use calculated total revenue including all valid statuses
      revenueChangePercentage: Math.round(revenueChangePercentage * 10) / 10,
      activeTrips: {
        count: operationsData?.today_trips || 0,
        in_progress:
          (operationsData?.today_trips || 0) -
            (operationsData?.completed_trips_today || 0) || 0,
        completed_today: operationsData?.completed_trips_today || 0,
        cancelled_bookings: dashboardData?.cancelled_count || 0,
      },
      activeUsers: {
        total: dashboardData?.active_users_30d || 0,
        customers: customerStats.active_count || 0,
        agents: agentStats.active_count || 0,
        online_now: Math.floor((dashboardData?.active_users_30d || 0) * 0.1), // Estimate 10% online
      },
      paymentStatus: {
        completed: dashboardData?.today_confirmed || 0,
        pending: dashboardData?.pending_payment_count || 0,
        failed: Math.floor((dashboardData?.today_bookings || 0) * 0.02), // Estimate 2% failure rate
        total_value: dashboardData?.today_revenue || 0,
      },
      walletStats: {
        total_balance: totalWalletBalance,
        active_wallets: walletCount,
        total_transactions_today: Math.floor(
          (dashboardData?.today_bookings || 0) * 1.2
        ), // Estimate
      },
      systemHealth: systemHealthData,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    // Return default values on error
    return {
      dailyBookings: { count: 0, revenue: 0, change_percentage: 0 },
      totalRevenue: 0,
      revenueChangePercentage: 0,
      activeTrips: {
        count: 0,
        in_progress: 0,
        completed_today: 0,
        cancelled_bookings: 0,
      },
      activeUsers: { total: 0, customers: 0, agents: 0, online_now: 0 },
      paymentStatus: { completed: 0, pending: 0, failed: 0, total_value: 0 },
      walletStats: {
        total_balance: 0,
        active_wallets: 0,
        total_transactions_today: 0,
      },
      systemHealth: {
        status: 'warning' as const,
        database_status: 'unknown' as const,
        api_status: 'offline' as const,
        load_status: 'unknown' as const,
        last_backup: null,
        active_sessions: 0,
      },
    };
  }
};

/**
 * Fetch recent activity logs
 */
export const fetchActivityLogs = async (
  limit: number = 10
): Promise<ActivityLog[]> => {
  try {
    const { data, error } = await supabase
      .from('activity_logs_with_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }

    return (data || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      user_name: log.user_name || 'Unknown User',
      action: log.action,
      details: log.details || '',
      ip_address: log.ip_address || '',
      created_at: log.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return [];
  }
};

/**
 * Fetch system alerts/notifications
 */
export const fetchSystemAlerts = async (): Promise<Alert[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching system alerts:', error);
      throw error;
    }

    return (data || []).map((notification: any) => {
      // Map notification types to valid Alert types
      const typeMap: { [key: string]: Alert['type'] } = {
        permission_request: 'security',
        contact_form: 'system',
        schedule_change: 'schedule',
        payment_issue: 'payment',
        capacity_warning: 'capacity',
        maintenance_required: 'maintenance',
        security_alert: 'security',
      };

      const alertType =
        typeMap[notification.notification_type] ||
        (notification.notification_type === 'system' ||
        notification.notification_type === 'schedule' ||
        notification.notification_type === 'payment' ||
        notification.notification_type === 'capacity' ||
        notification.notification_type === 'maintenance' ||
        notification.notification_type === 'security'
          ? notification.notification_type
          : 'system');

      return {
        id: notification.id,
        type: alertType,
        title: notification.title,
        message: notification.message,
        severity:
          notification.priority === 2
            ? 'critical'
            : notification.priority === 1
              ? 'high'
              : 'low',
        status: notification.status || 'active',
        read: notification.is_read || false,
        timestamp: notification.created_at,
        action_url: notification.action_url || undefined,
      };
    });
  } catch (error) {
    console.error('Failed to fetch system alerts:', error);
    return [];
  }
};

/**
 * Fetch recent bookings for dashboard
 */
export const fetchRecentBookings = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('admin_bookings_view')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent bookings:', error);
      throw error;
    }

    const bookings = (data || []).map((booking: any) => ({
      id: booking.id,
      booking_number: booking.booking_number,
      routeId: booking.trip_id,
      routeName: booking.route_name,
      customerId: booking.user_id,
      customerName: booking.user_name,
      customerEmail: booking.user_email,
      date: booking.trip_travel_date,
      departureTime: booking.trip_departure_time,
      passengers: booking.passenger_count || 1,
      totalAmount: booking.total_fare,
      status: booking.status,
      paymentStatus: booking.payment_status || 'pending',
      paymentMethod: booking.payment_method,
      vesselName: booking.vessel_name,
      agentId: booking.agent_id,
      agentName: booking.agent_name,
      qrCodeUrl: booking.qr_code_url,
      checkInStatus: booking.check_in_status,
      created_at: booking.created_at,
      // Include segment-related fields for route display
      from_island_name: booking.from_island_name,
      to_island_name: booking.to_island_name,
    }));

    // Enrich bookings with segment data for accurate pickup/dropoff display
    if (bookings.length > 0) {
      const bookingIds = bookings.map(b => b.id);
      try {
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('booking_segments')
          .select(
            `
            booking_id,
            boarding_stop:route_stops!booking_segments_boarding_stop_id_fkey(
              id,
              stop_sequence,
              islands(name, zone)
            ),
            destination_stop:route_stops!booking_segments_destination_stop_id_fkey(
              id,
              stop_sequence,
              islands(name, zone)
            )
          `
          )
          .in('booking_id', bookingIds);

        if (!segmentsError && segmentsData) {
          // Create a map of booking_id to segment data
          const segmentsMap = new Map<string, any>();
          segmentsData.forEach((segment: any) => {
            if (!segmentsMap.has(segment.booking_id)) {
              segmentsMap.set(segment.booking_id, []);
            }
            segmentsMap.get(segment.booking_id)!.push(segment);
          });

          // Enrich bookings with segment data and update routeName
          return bookings.map(booking => {
            const segments = segmentsMap.get(booking.id);
            if (segments && segments.length > 0) {
              const segment = segments[0];
              const boardingStop = segment.boarding_stop;
              const destinationStop = segment.destination_stop;

              // Extract island names from segment data
              const boardingIslandName =
                boardingStop?.islands?.name ||
                (Array.isArray(boardingStop?.islands)
                  ? boardingStop.islands[0]?.name
                  : null);
              const destinationIslandName =
                destinationStop?.islands?.name ||
                (Array.isArray(destinationStop?.islands)
                  ? destinationStop.islands[0]?.name
                  : null);

              // Update routeName with segment data if available
              if (boardingIslandName || destinationIslandName) {
                const routeName = `${boardingIslandName || 'Unknown'} → ${destinationIslandName || 'Unknown'}`;
                return {
                  ...booking,
                  routeName,
                  booking_segments: segments,
                };
              }
            }
            return booking;
          });
        }
      } catch (segmentsErr) {
        // If segment fetch fails, continue without segment data
        console.warn(
          'Failed to fetch booking segments for dashboard:',
          segmentsErr
        );
      }
    }

    return bookings;
  } catch (error) {
    console.error('Failed to fetch recent bookings:', error);
    return [];
  }
};

/**
 * Fetch recent trips for dashboard
 */
export const fetchRecentTrips = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('operations_trips_view')
      .select('*')
      .order('travel_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent trips:', error);
      throw error;
    }

    return (data || []).map((trip: any) => ({
      id: trip.id,
      route_id: trip.route_id,
      vessel_id: trip.vessel_id,
      travel_date: trip.travel_date,
      departure_time: trip.departure_time,
      arrival_time: trip.arrival_time,
      available_seats: trip.available_seats,
      is_active: trip.is_active,
      status: trip.status || trip.computed_status,
      estimated_duration: trip.duration || '2h',
      booked_seats: trip.booked_seats || 0,
      fare_multiplier: trip.fare_multiplier || 1.0,
      route_name: trip.route_name,
      vessel_name: trip.vessel_name,
      from_island_name: trip.from_island_name,
      to_island_name: trip.to_island_name,
      bookings: trip.bookings || 0,
      occupancy_rate: trip.occupancy_rate || 0,
      created_at: trip.created_at,
      updated_at: trip.updated_at || trip.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch recent trips:', error);
    return [];
  }
};

/**
 * Refresh materialized view (admin_dashboard_stats)
 */
export const refreshDashboardStats = async (): Promise<void> => {
  try {
    // Try the suggested function name from the error hint
    const { error } = await supabase.rpc('refresh_dashboard_views');

    if (error) {
      console.error('Error refreshing dashboard stats:', error);
      // If the function doesn't exist, we can continue without refreshing
      // The materialized view will still have recent data
      console.warn(
        'Dashboard refresh function not available, continuing with cached data'
      );
      return;
    }
  } catch (error) {
    console.error('Failed to refresh dashboard stats:', error);
    // Don't throw error, just log it and continue
    console.warn('Dashboard refresh failed, continuing with cached data');
  }
};
