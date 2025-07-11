import React from "react";
import { colors } from "@/constants/adminColors";
import {
    CreditCard,
    Ship,
    Users,
    Wallet
} from "lucide-react-native";
import { StatsSection } from "@/components/admin/common";
import { DashboardStatsData } from "@/types/admin/dashboard";

interface DashboardStatsProps {
    stats: DashboardStatsData;
    isTablet: boolean;
    canViewBookings: boolean;
    canViewTrips: boolean;
    canViewUsers: boolean;
    canViewWallets: boolean;
}

export default function DashboardStats({
    stats,
    isTablet,
    canViewBookings,
    canViewTrips,
    canViewUsers,
    canViewWallets,
}: DashboardStatsProps) {
    const statItems = [];

    if (canViewBookings) {
        statItems.push({
            title: "Today's Bookings",
            value: stats.todayBookings.toString(),
            subtitle: `MVR ${stats.dailyBookingsRevenue.toFixed(2)} Revenue`,
            icon: <CreditCard size={isTablet ? 20 : 18} color={colors.primary} />,
            trend: stats.dailyBookingsChange > 0 ? "up" as const : "down" as const,
            trendValue: `${Math.abs(stats.dailyBookingsChange)}%`,
        });
    }

    if (canViewTrips) {
        statItems.push({
            title: "Active Trips",
            value: stats.activeTripsCount.toString(),
            subtitle: `${stats.activeTripsCount} in progress`,
            icon: <Ship size={isTablet ? 20 : 18} color={colors.secondary} />,
            color: colors.secondary,
        });
    }

    if (canViewUsers) {
        statItems.push({
            title: "Active Users",
            value: stats.activeUsersTotal.toString(),
            subtitle: `${stats.onlineUsers} online now`,
            icon: <Users size={isTablet ? 20 : 18} color="#34C759" />,
            color: "#34C759",
        });
    }

    if (canViewWallets) {
        statItems.push({
            title: "Wallet Balance",
            value: `MVR ${stats.totalWalletBalance.toFixed(2)}`,
            subtitle: `${stats.walletCount} wallets`,
            icon: <Wallet size={isTablet ? 20 : 18} color="#FF9500" />,
            color: "#FF9500",
        });
    }

    return (
        <StatsSection
            title="Dashboard Overview"
            subtitle="Performance metrics and trends"
            stats={statItems}
            isTablet={isTablet}
            headerSize={isTablet ? "large" : "medium"}
        />
    );
} 