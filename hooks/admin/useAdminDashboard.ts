import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { AdminDashboardStats, AdminAlert } from '@/types/admin';
import { useAdminDashboardStore } from '@/store/admin/adminDashboardStore';

export const useAdminDashboard = () => {
    const {
        stats,
        alerts,
        loading,
        error,
        unreadAlertsCount,
        setStats,
        setAlerts,
        setLoading,
        setError,
        markAlertAsRead,
        markAllAlertsAsRead,
        addAlert,
        dismissAlert
    } = useAdminDashboardStore();

    const fetchDashboardStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current date boundaries
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayISOString = today.toISOString();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            // Fetch all required data in parallel
            const [
                bookingsResult,
                usersResult,
                tripsResult,
                vesselsResult,
                paymentsResult,
                dailyBookingsResult,
                weeklyBookingsResult,
                monthlyBookingsResult,
                checkInsResult
            ] = await Promise.all([
                // All bookings with status breakdown
                supabase
                    .from('bookings')
                    .select('id, status, total_fare, created_at, check_in_status', { count: 'exact' }),

                // Users by role and status
                supabase
                    .from('user_profiles')
                    .select('id, role, is_active, created_at', { count: 'exact' }),

                // Active trips (current and future)
                supabase
                    .from('trips')
                    .select('id, travel_date', { count: 'exact' })
                    .eq('is_active', true)
                    .gte('travel_date', today.toISOString().split('T')[0]),

                // Vessels by status
                supabase
                    .from('vessels')
                    .select('id, is_active', { count: 'exact' }),

                // Payment statistics
                supabase
                    .from('payments')
                    .select('id, status, amount, created_at'),

                // Daily bookings and revenue
                supabase
                    .from('bookings')
                    .select('id, total_fare, status')
                    .gte('created_at', todayISOString),

                // Weekly revenue (confirmed bookings only)
                supabase
                    .from('bookings')
                    .select('total_fare')
                    .gte('created_at', weekAgo)
                    .eq('status', 'confirmed'),

                // Monthly revenue (confirmed bookings only)
                supabase
                    .from('bookings')
                    .select('total_fare')
                    .gte('created_at', monthAgo)
                    .eq('status', 'confirmed'),

                // Check-ins for calculating check-in rate
                supabase
                    .from('check_ins')
                    .select('id, booking_id')
            ]);

            // Check for errors
            if (bookingsResult.error) throw bookingsResult.error;
            if (usersResult.error) throw usersResult.error;
            if (tripsResult.error) throw tripsResult.error;
            if (vesselsResult.error) throw vesselsResult.error;
            if (paymentsResult.error) throw paymentsResult.error;

            // Process the data
            const bookings = bookingsResult.data || [];
            const users = usersResult.data || [];
            const vessels = vesselsResult.data || [];
            const payments = paymentsResult.data || [];
            const dailyBookings = dailyBookingsResult.data || [];
            const weeklyBookings = weeklyBookingsResult.data || [];
            const monthlyBookings = monthlyBookingsResult.data || [];
            const checkIns = checkInsResult.data || [];

            // Calculate booking statistics
            const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
            const pendingBookings = bookings.filter(b => b.status === 'pending_payment').length;
            const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
            const completedBookings = bookings.filter(b => b.status === 'completed').length;

            // Calculate check-in rate
            const totalCompletableBookings = bookings.filter(b =>
                ['confirmed', 'checked_in', 'completed'].includes(b.status)
            ).length;
            const checkInRate = totalCompletableBookings > 0
                ? (checkIns.length / totalCompletableBookings) * 100
                : 0;

            // Calculate payment statistics
            const completedPayments = payments.filter(p => p.status === 'completed').length;
            const pendingPayments = payments.filter(p => p.status === 'pending').length;
            const failedPayments = payments.filter(p => p.status === 'failed').length;
            const totalPendingAmount = payments
                .filter(p => p.status === 'pending')
                .reduce((sum, p) => sum + (p.amount || 0), 0);

            // Calculate user statistics
            const newUsersToday = users.filter(u =>
                new Date(u.created_at).toDateString() === new Date().toDateString()
            ).length;
            const newUsersWeek = users.filter(u =>
                new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length;
            const activeCustomers = users.filter(u => u.role === 'customer' && u.is_active).length;
            const activeAgents = users.filter(u => u.role === 'agent' && u.is_active).length;

            // Calculate vessel statistics
            const activeVessels = vessels.filter(v => v.is_active).length;
            const inactiveVessels = vessels.filter(v => !v.is_active).length;

            // TODO: Add maintenance status to vessels table for accurate maintenance count
            const maintenanceVessels = 0;

            // TODO: Calculate utilization rate based on trips and capacity
            const utilizationRate = 0;

            // Calculate revenue figures
            const dailyRevenue = dailyBookings
                .filter(b => ['confirmed', 'completed'].includes(b.status))
                .reduce((sum, b) => sum + (b.total_fare || 0), 0);
            const weeklyRevenue = weeklyBookings.reduce((sum, b) => sum + (b.total_fare || 0), 0);
            const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + (b.total_fare || 0), 0);

            const dashboardStats: AdminDashboardStats = {
                overview: {
                    total_bookings: bookingsResult.count || 0,
                    daily_bookings: dailyBookings.length,
                    daily_revenue: dailyRevenue,
                    weekly_revenue: weeklyRevenue,
                    monthly_revenue: monthlyRevenue,
                    active_trips: tripsResult.count || 0,
                    total_users: usersResult.count || 0,
                    active_agents: activeAgents,
                    active_vessels: activeVessels
                },
                booking_stats: {
                    confirmed: confirmedBookings,
                    pending: pendingBookings,
                    cancelled: cancelledBookings,
                    completed: completedBookings,
                    check_in_rate: checkInRate
                },
                payment_stats: {
                    completed: completedPayments,
                    pending: pendingPayments,
                    failed: failedPayments,
                    total_pending_amount: totalPendingAmount
                },
                user_stats: {
                    new_users_today: newUsersToday,
                    new_users_week: newUsersWeek,
                    active_customers: activeCustomers,
                    active_agents: activeAgents
                },
                vessel_stats: {
                    active: activeVessels,
                    maintenance: maintenanceVessels,
                    inactive: inactiveVessels,
                    utilization_rate: utilizationRate
                },
                recent_activity: [] // Will be populated by alerts
            };

            setStats(dashboardStats);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
        } finally {
            setLoading(false);
        }
    }, [setStats, setLoading, setError]);

    const fetchAlerts = useCallback(async () => {
        try {
            const systemAlerts: AdminAlert[] = [];

            // Check for low capacity trips (less than 5 seats available)
            const { data: lowCapacityTrips } = await supabase
                .from('trips_with_available_seats')
                .select('id, vessel_name, travel_date, departure_time, available_seats')
                .lt('available_seats', 5)
                .gte('travel_date', new Date().toISOString().split('T')[0])
                .eq('is_active', true)
                .limit(5);

            lowCapacityTrips?.forEach(trip => {
                systemAlerts.push({
                    id: `capacity-${trip.id}`,
                    type: 'capacity',
                    title: 'Low Capacity Alert',
                    message: `Trip on ${trip.vessel_name} (${trip.travel_date} ${trip.departure_time}) has only ${trip.available_seats} seats left`,
                    severity: trip.available_seats < 2 ? 'critical' : trip.available_seats < 3 ? 'high' : 'medium',
                    is_read: false,
                    trip_id: trip.id,
                    created_at: new Date().toISOString(),
                    time_ago: 'just now',
                    action_required: true
                });
            });

            // Check for pending payments over 24 hours old
            const { data: oldPendingPayments } = await supabase
                .from('payments')
                .select('id, booking_id, amount, created_at')
                .eq('status', 'pending')
                .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(5);

            oldPendingPayments?.forEach(payment => {
                systemAlerts.push({
                    id: `payment-${payment.id}`,
                    type: 'payment',
                    title: 'Pending Payment Alert',
                    message: `Payment of $${payment.amount} has been pending for over 24 hours`,
                    severity: 'medium',
                    is_read: false,
                    booking_id: payment.booking_id,
                    created_at: new Date().toISOString(),
                    time_ago: 'just now',
                    action_required: true
                });
            });

            // Check for failed payments in the last 24 hours
            const { data: recentFailedPayments } = await supabase
                .from('payments')
                .select('id, booking_id, amount, created_at')
                .eq('status', 'failed')
                .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(3);

            recentFailedPayments?.forEach(payment => {
                systemAlerts.push({
                    id: `failed-payment-${payment.id}`,
                    type: 'payment',
                    title: 'Failed Payment Alert',
                    message: `Payment of $${payment.amount} failed and requires attention`,
                    severity: 'high',
                    is_read: false,
                    booking_id: payment.booking_id,
                    created_at: new Date().toISOString(),
                    time_ago: 'just now',
                    action_required: true
                });
            });

            // Check for cancelled bookings in the last 4 hours (potential issues)
            const { data: recentCancellations } = await supabase
                .from('bookings')
                .select('id, booking_number, total_fare, created_at')
                .eq('status', 'cancelled')
                .gt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
                .limit(3);

            recentCancellations?.forEach(booking => {
                systemAlerts.push({
                    id: `cancellation-${booking.id}`,
                    type: 'booking',
                    title: 'Recent Cancellation',
                    message: `Booking ${booking.booking_number} ($${booking.total_fare}) was recently cancelled`,
                    severity: 'low',
                    is_read: false,
                    booking_id: booking.id,
                    created_at: new Date().toISOString(),
                    time_ago: 'just now',
                    action_required: false
                });
            });

            // Check for inactive vessels that might need attention
            const { data: inactiveVessels } = await supabase
                .from('vessels')
                .select('id, name, created_at')
                .eq('is_active', false)
                .limit(2);

            inactiveVessels?.forEach(vessel => {
                systemAlerts.push({
                    id: `vessel-${vessel.id}`,
                    type: 'vessel',
                    title: 'Inactive Vessel',
                    message: `Vessel "${vessel.name}" is currently inactive`,
                    severity: 'low',
                    is_read: false,
                    created_at: new Date().toISOString(),
                    time_ago: 'just now',
                    action_required: false
                });
            });

            // Sort alerts by severity and time
            const sortedAlerts = systemAlerts.sort((a, b) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
                if (severityDiff !== 0) return severityDiff;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setAlerts(sortedAlerts);
        } catch (err) {
            console.error('Error fetching alerts:', err);
            // Don't set error for alerts as it's not critical
        }
    }, [setAlerts]);

    const refreshData = useCallback(async () => {
        await Promise.all([
            fetchDashboardStats(),
            fetchAlerts()
        ]);
    }, [fetchDashboardStats, fetchAlerts]);

    // Initialize data on mount
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return {
        stats,
        alerts,
        loading,
        error,
        unreadAlertsCount,
        markAlertAsRead,
        markAllAlertsAsRead,
        addAlert,
        dismissAlert,
        refreshData
    };
}; 