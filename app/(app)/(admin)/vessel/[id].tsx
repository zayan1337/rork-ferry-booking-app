import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Dimensions,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useVesselManagement } from "@/hooks/useVesselManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminManagement } from "@/types";
import {
    formatCurrency,
    formatPercentage,
    getUtilizationRating,
    getUtilizationColor,
} from "@/utils/admin/vesselUtils";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Ship,
    Users,
    TrendingUp,
    Activity,
    DollarSign,
    Calendar,
    AlertTriangle,
    Settings,
    MoreVertical,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type Vessel = AdminManagement.Vessel;

export default function VesselDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewVessels, canManageVessels } = useAdminPermissions();

    const {
        getById,
        loading,
        error,
        remove,
    } = useVesselManagement();

    const [vessel, setVessel] = useState<Vessel | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (id) {
        loadVessel();
        }
    }, [id]);

    const loadVessel = async () => {
        if (!id) return;

        const vesselData = getById(id);
            if (vesselData) {
            setVessel(vesselData);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadVessel();
        setIsRefreshing(false);
    };

    const handleEdit = () => {
        if (canManageVessels()) {
            router.push(`../vessel/${id}/edit` as any);
            } else {
            Alert.alert("Access Denied", "You don't have permission to edit vessels.");
        }
    };

    const handleDelete = () => {
        if (!canManageVessels()) {
            Alert.alert("Access Denied", "You don't have permission to delete vessels.");
            return;
        }

        Alert.alert(
            "Delete Vessel",
            `Are you sure you want to delete "${vessel?.name}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (id) {
                                await remove(id);
                                Alert.alert("Success", "Vessel deleted successfully!");
                                router.back();
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete vessel");
                        }
                    },
                },
            ]
        );
    };

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

    const renderStats = () => {
        if (!vessel) return null;

        const stats = [
            {
                title: "Total Trips (30d)",
                value: vessel.total_trips_30d?.toString() || "0",
                icon: <Activity size={20} color={colors.primary} />,
                color: colors.primary,
            },
            {
                title: "Total Bookings (30d)",
                value: vessel.total_bookings_30d?.toString() || "0",
                icon: <Users size={20} color={colors.success} />,
                color: colors.success,
            },
            {
                title: "Capacity Utilization",
                value: formatPercentage(vessel.capacity_utilization_30d || 0),
                icon: <TrendingUp size={20} color={getUtilizationColor(getUtilizationRating(vessel))} />,
                color: getUtilizationColor(getUtilizationRating(vessel)),
            },
            {
                title: "Total Revenue (30d)",
                value: formatCurrency(vessel.total_revenue_30d || 0),
                icon: <DollarSign size={20} color={colors.success} />,
                color: colors.success,
            },
        ];

        return (
            <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Performance Statistics</Text>
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={styles.statIcon}>
                                {stat.icon}
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.title}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderVesselInfo = () => {
        if (!vessel) return null;

        return (
            <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Vessel Information</Text>
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{vessel.name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Status:</Text>
                        <StatusBadge status={getStatusVariant(vessel.status)} />
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Seating Capacity:</Text>
                        <Text style={styles.infoValue}>{vessel.seating_capacity} passengers</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Created:</Text>
                        <Text style={styles.infoValue}>
                            {new Date(vessel.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    {vessel.updated_at && vessel.updated_at !== vessel.created_at && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Last Updated:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(vessel.updated_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (!canViewVessels()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Access Denied",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <View style={styles.noAccessIcon}>
                        <AlertTriangle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view vessel details.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        );
    }

    if (loading.singleVessel) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Vessel Details",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading vessel details...</Text>
                </View>
            </View>
        );
    }

    if (!vessel) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Vessel Not Found",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.emptyState}>
                    <View style={styles.emptyStateIcon}>
                        <Ship size={64} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.emptyStateTitle}>Vessel Not Found</Text>
                    <Text style={styles.emptyStateText}>
                        The vessel you're looking for doesn't exist or has been removed.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                        style={styles.emptyStateButton}
                    />
                </View>
            </View>
        );
    }

    return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                    title: vessel.name,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            {canManageVessels() && (
                                <>
                                    <TouchableOpacity
                                        style={styles.headerActionButton}
                                        onPress={handleEdit}
                                    >
                                        <Edit size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.headerActionButton}
                                        onPress={handleDelete}
                                    >
                                        <Trash2 size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Vessel Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.vesselTitle}>
                            <Ship size={32} color={colors.primary} />
                            <Text style={styles.vesselName}>{vessel.name}</Text>
                        </View>
                        <StatusBadge status={getStatusVariant(vessel.status)} />
                    </View>
                    <Text style={styles.vesselCapacity}>
                        {vessel.seating_capacity} passengers
                    </Text>
                </View>

                {/* Statistics */}
                {renderStats()}

                {/* Vessel Information */}
                {renderVesselInfo()}
            </ScrollView>
            </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    headerActionButton: {
        padding: 8,
        marginRight: -8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        padding: 32,
    },
    noAccessIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.backgroundTertiary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    noPermissionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 22,
        marginBottom: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        gap: 20,
    },
    emptyStateIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.backgroundTertiary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
    },
    emptyStateText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 320,
        lineHeight: 24,
    },
    emptyStateButton: {
        marginTop: 16,
        minWidth: 200,
    },
    header: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    vesselTitle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    vesselName: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
    },
    vesselCapacity: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    statsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    statCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: 150,
        alignItems: "center",
        gap: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        alignItems: "center",
        justifyContent: "center",
    },
    statValue: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
        fontWeight: "500",
    },
    infoSection: {
        marginBottom: 20,
    },
    infoCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    infoLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    infoValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: "600",
    },
}); 