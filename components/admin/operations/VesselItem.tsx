import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { AdminManagement } from "@/types";
import {
    Ship,
    Users,
    TrendingUp,
    Activity,
    MoreVertical,
} from "lucide-react-native";

// Components
import StatusBadge from "@/components/admin/StatusBadge";

type Vessel = AdminManagement.Vessel;

interface VesselItemProps {
    vessel: Vessel;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    canManage?: boolean;
}

export default function VesselItem({
    vessel,
    onPress,
    onEdit,
    onDelete,
    canManage = false
}: VesselItemProps) {
    const getStatusVariant = (status: string) => {
        switch (status) {
            case "active":
                return "confirmed" as const;
            case "maintenance":
                return "pending" as const;
            case "inactive":
                return "cancelled" as const;
            default:
                return "pending" as const;
        }
    };

    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 80) return colors.success;
        if (utilization >= 60) return colors.primary;
        if (utilization >= 40) return colors.warning;
        return colors.danger;
    };

    const formatCurrency = (amount: number) => {
        return `MVR ${amount.toLocaleString()}`;
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(vessel.id)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.vesselInfo}>
                    <View style={styles.nameRow}>
                        <Ship size={20} color={colors.primary} />
                        <Text style={styles.vesselName}>{vessel.name}</Text>
                        <StatusBadge status={getStatusVariant(vessel.status)} />
                    </View>
                    <Text style={styles.capacity}>
                        {vessel.seating_capacity} passengers
                    </Text>
                </View>

                {canManage && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            // Show action menu
                        }}
                    >
                        <MoreVertical size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.stats}>
                <View style={styles.statRow}>
                    <View style={styles.statItem}>
                        <Activity size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Trips (30d)</Text>
                        <Text style={styles.statValue}>
                            {vessel.total_trips_30d || 0}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Users size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Bookings (30d)</Text>
                        <Text style={styles.statValue}>
                            {vessel.total_bookings_30d || 0}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <TrendingUp size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Utilization</Text>
                        <Text style={[
                            styles.statValue,
                            { color: getUtilizationColor(vessel.capacity_utilization_30d || 0) }
                        ]}>
                            {formatPercentage(vessel.capacity_utilization_30d || 0)}
                        </Text>
                    </View>
                </View>

                {vessel.total_revenue_30d && vessel.total_revenue_30d > 0 && (
                    <View style={styles.revenueRow}>
                        <Text style={styles.revenueLabel}>Revenue (30d):</Text>
                        <Text style={styles.revenueValue}>
                            {formatCurrency(vessel.total_revenue_30d)}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    vesselInfo: {
        flex: 1,
        gap: 4,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    vesselName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
    },
    capacity: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actionButton: {
        padding: 4,
    },
    stats: {
        gap: 8,
    },
    statRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
        gap: 2,
    },
    statLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: "center",
    },
    statValue: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.text,
        textAlign: "center",
    },
    revenueRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    revenueLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    revenueValue: {
        fontSize: 12,
        color: colors.success,
        fontWeight: "600",
    },
}); 