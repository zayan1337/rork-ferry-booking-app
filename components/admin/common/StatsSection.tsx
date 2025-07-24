import React from "react";
import {
    StyleSheet,
    View,
} from "react-native";
import StatCard from "@/components/admin/StatCard";
import SectionHeader from "@/components/admin/SectionHeader";

interface StatItem {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    color?: string;
    size?: "small" | "medium" | "large";
    trend?: "up" | "down";
    trendValue?: string;
}

interface StatsSectionProps {
    title: string;
    subtitle: string;
    stats: StatItem[];
    isTablet?: boolean;
    headerSize?: "small" | "medium" | "large";
}

export default function StatsSection({
    title,
    subtitle,
    stats,
    isTablet = false,
    headerSize = "medium",
}: StatsSectionProps) {
    return (
        <View style={styles.statsContainer}>
            <SectionHeader
                title={title}
                subtitle={subtitle}
                size={headerSize}
            />
            <View style={styles.statsGrid}>
                {(stats || []).map((stat, index) => (
                    <StatCard
                        key={index}
                        title={stat.title}
                        value={stat.value}
                        subtitle={stat.subtitle}
                        icon={stat.icon}
                        color={stat.color}
                        size={stat.size || (isTablet ? "large" : "medium")}
                        trend={stat.trend}
                        trendValue={stat.trendValue}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statsContainer: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
    },
}); 