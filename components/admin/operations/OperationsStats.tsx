import React from "react";
import { colors } from "@/constants/adminColors";
import {
    MapPin,
    Ship,
    Calendar,
    TrendingUp
} from "lucide-react-native";
import { StatsSection } from "@/components/admin/common";
import { OperationsStatsData } from "@/types/admin/dashboard";

interface OperationsStatsProps {
    stats: OperationsStatsData;
    isTablet: boolean;
}

export default function OperationsStats({ stats, isTablet }: OperationsStatsProps) {
    const statItems = [
        {
            title: "Active Routes",
            value: stats.activeRoutes.toString(),
            subtitle: `of ${stats.totalRoutes} total`,
            icon: <MapPin size={isTablet ? 20 : 18} color={colors.primary} />,
        },
        {
            title: "Active Vessels",
            value: stats.activeVessels.toString(),
            subtitle: `of ${stats.totalVessels} total`,
            icon: <Ship size={isTablet ? 20 : 18} color={colors.secondary} />,
            color: colors.secondary,
        },
        {
            title: "Today's Trips",
            value: stats.todayTrips.toString(),
            subtitle: "scheduled trips",
            icon: <Calendar size={isTablet ? 20 : 18} color="#34C759" />,
            color: "#34C759",
        },
        {
            title: "Total Capacity",
            value: stats.totalCapacity.toString(),
            subtitle: "passengers",
            icon: <TrendingUp size={isTablet ? 20 : 18} color="#FF9500" />,
            color: "#FF9500",
        },
    ];

    return (
        <StatsSection
            title="Operations Overview"
            subtitle="Fleet and route performance metrics"
            stats={statItems}
            isTablet={isTablet}
            headerSize={isTablet ? "large" : "medium"}
        />
    );
} 