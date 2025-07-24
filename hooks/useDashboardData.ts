import { useMemo } from "react";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAuthStore } from "@/store/authStore";
import { DashboardStatsData } from "@/types/admin/dashboard";

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
    } = useAdminStore();

    const { user } = useAuthStore();

    // Calculate real-time statistics
    const stats: DashboardStatsData = useMemo(() => {
        const todayBookings = bookings.filter(b =>
            new Date(b.created_at).toDateString() === new Date().toDateString()
        ).length;

        const activeTripsCount = trips.filter(t =>
            t.is_active && t.travel_date === new Date().toISOString().split('T')[0]
        ).length;

        const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
        const unreadNotifications = notifications.filter(n => !n.is_read).length;

        return {
            todayBookings,
            activeTripsCount,
            totalWalletBalance,
            unreadNotifications,
            dailyBookingsRevenue: dashboardStats.dailyBookings?.revenue || 0,
            activeUsersTotal: dashboardStats.activeUsers?.total || users.length,
            onlineUsers: dashboardStats.activeUsers?.online_now || 0,
            walletCount: dashboardStats.walletStats?.active_wallets || wallets.length,
            dailyBookingsChange: dashboardStats.dailyBookings?.change_percentage || 0,
            dailyRevenueChange: 0, // Would need yesterday's data to calculate
        };
    }, [bookings, trips, wallets, notifications, dashboardStats, users]);

    const adminProfile = user?.profile;
    const adminName = adminProfile?.full_name || user?.email?.split("@")[0] || "Admin";
    const adminRole = adminProfile?.role || "admin";

    const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.read).length;

    const getInitials = (name: string) => {
        return name
            ? name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "AD";
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
    };
}; 