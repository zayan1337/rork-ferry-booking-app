import React from "react";
import { colors } from "@/constants/adminColors";
import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Users,
    DollarSign,
    BarChart3
} from "lucide-react-native";
import { StatsSection } from "@/components/admin/common";

interface TripStatsData {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    averageOccupancy: number;
    totalRevenue: number;
    todayTrips?: number;
}

interface TripStatsProps {
    stats: TripStatsData;
    isTablet: boolean;
    variant?: 'full' | 'compact';
}

export default function TripStats({ stats, isTablet, variant = 'full' }: TripStatsProps) {
    const getOccupancyColor = () => {
        if (stats.averageOccupancy >= 80) return colors.success;
        if (stats.averageOccupancy >= 60) return colors.warning;
        return colors.danger;
    };

    const formatRevenue = (revenue: number) => {
        if (revenue >= 1000000) {
            return `${(revenue / 1000000).toFixed(1)}M`;
        }
        if (revenue >= 1000) {
            return `${(revenue / 1000).toFixed(1)}K`;
        }
        return revenue.toString();
    };

    const getCompactStats = () => [
        {
            title: "Today's Trips",
            value: stats.todayTrips?.toString() || stats.scheduled.toString(),
            subtitle: "scheduled",
            icon: <Calendar size={isTablet ? 20 : 18} color={colors.primary} />,
            color: colors.primary,
        },
        {
            title: "In Progress",
            value: stats.inProgress.toString(),
            subtitle: "active now",
            icon: <Clock size={isTablet ? 20 : 18} color={colors.warning} />,
            color: colors.warning,
        },
        {
            title: "Avg. Occupancy",
            value: `${stats.averageOccupancy.toFixed(1)}%`,
            subtitle: "capacity used",
            icon: <Users size={isTablet ? 20 : 18} color={getOccupancyColor()} />,
            color: getOccupancyColor(),
        },
        {
            title: "Revenue",
            value: `MVR ${formatRevenue(stats.totalRevenue)}`,
            subtitle: "total earned",
            icon: <TrendingUp size={isTablet ? 20 : 18} color={colors.secondary} />,
            color: colors.secondary,
        },
    ];

    const getFullStats = () => [
        {
            title: "Total Trips",
            value: stats.total.toString(),
            subtitle: "all time",
            icon: <BarChart3 size={isTablet ? 20 : 18} color={colors.primary} />,
            color: colors.primary,
        },
        {
            title: "Scheduled",
            value: stats.scheduled.toString(),
            subtitle: "upcoming trips",
            icon: <Calendar size={isTablet ? 20 : 18} color="#007AFF" />,
            color: "#007AFF",
        },
        {
            title: "In Progress",
            value: stats.inProgress.toString(),
            subtitle: "currently running",
            icon: <Clock size={isTablet ? 20 : 18} color={colors.warning} />,
            color: colors.warning,
        },
        {
            title: "Completed",
            value: stats.completed.toString(),
            subtitle: "finished trips",
            icon: <CheckCircle size={isTablet ? 20 : 18} color={colors.success} />,
            color: colors.success,
        },
        {
            title: "Cancelled",
            value: stats.cancelled.toString(),
            subtitle: "cancelled trips",
            icon: <XCircle size={isTablet ? 20 : 18} color={colors.danger} />,
            color: colors.danger,
        },
        {
            title: "Avg. Occupancy",
            value: `${stats.averageOccupancy.toFixed(1)}%`,
            subtitle: "capacity utilization",
            icon: <Users size={isTablet ? 20 : 18} color={getOccupancyColor()} />,
            color: getOccupancyColor(),
            trend: stats.averageOccupancy >= 70 ? "up" : stats.averageOccupancy >= 50 ? "neutral" : "down",
        },
        {
            title: "Total Revenue",
            value: `MVR ${formatRevenue(stats.totalRevenue)}`,
            subtitle: "earnings",
            icon: <DollarSign size={isTablet ? 20 : 18} color={colors.secondary} />,
            color: colors.secondary,
            trend: "up", // Assuming revenue trend is positive
        },
    ];

    const statItems = variant === 'compact' ? getCompactStats() : getFullStats();

    return (
        <StatsSection
            title="Trip Management Overview"
            subtitle={variant === 'compact'
                ? "Key metrics at a glance"
                : "Comprehensive trip statistics and performance metrics"
            }
            stats={statItems}
            isTablet={isTablet}
            headerSize={isTablet ? "large" : "medium"}
        />
    );
} 