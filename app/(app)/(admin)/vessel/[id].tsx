import React, { useState, useEffect, useMemo } from "react";
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
    Anchor,
    Gauge,
    Wrench,
    Fuel,
    BarChart3,
    Clock,
    Target,
    Ruler,
    MapPin,
    Phone,
    Mail,
    FileText,
    Shield,
    Award,
    Zap,
    Thermometer,
    Droplets,
    Navigation,
    Compass,
    LifeBuoy,
    Radio,
    Satellite,
    Wifi,
    Battery,
    Signal,
    Eye,
    EyeOff,
    Grid3X3,
    Layout,
    UserCheck,
    Crown,
    Info,
    Plane,
    Star,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import VesselDetails from "@/components/admin/operations/VesselDetails";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type Vessel = AdminManagement.Vessel;

export default function VesselDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewVessels, canManageVessels } = useAdminPermissions();

    const {
        fetchById,
        loading,
        error,
        remove,
        getVesselWithDetails,
        formatCurrency,
        formatPercentage,
        getUtilizationRating,
        getUtilizationColor,
    } = useVesselManagement();

    const [vessel, setVessel] = useState<Vessel | null>(null);
    const [vesselWithDetails, setVesselWithDetails] = useState<AdminManagement.VesselWithDetails | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (id) {
            loadVessel();
        }
    }, [id]);

    const loadVessel = async () => {
        if (!id) return;

        try {
            // Load basic vessel data
            const vesselData = await fetchById(id);
            if (vesselData) {
                setVessel(vesselData);
            } else {
                console.error('No vessel data returned for ID:', id);
            }

            // Load detailed vessel data
            const detailedVessel = await getVesselWithDetails(id);
            if (detailedVessel) {
                setVesselWithDetails(detailedVessel);
            } else {
                console.error('No detailed vessel data returned for ID:', id);
            }
        } catch (error) {
            console.error('Error loading vessel:', error);
            // Set error state so the error UI shows
            setVessel(null);
            setVesselWithDetails(null);
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
                            setIsDeleting(true);
                            if (id) {
                                await remove(id);
                                Alert.alert("Success", "Vessel deleted successfully!");
                                router.back();
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete vessel");
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleViewTrips = () => {
        router.push(`../trip?vessel_id=${id}` as any);
    };

    const handleViewMaintenance = () => {
        // Navigate to maintenance log or create maintenance modal
        Alert.alert("Maintenance", "Maintenance log feature coming soon!");
    };

    const handleViewSeatLayout = () => {
        router.push(`../vessel/${id}/seat-layout` as any);
    };

    const handleArchive = () => {
        if (!canManageVessels()) {
            Alert.alert("Access Denied", "You don't have permission to archive vessels.");
            return;
        }

        Alert.alert(
            "Archive Vessel",
            `Are you sure you want to archive "${vessel?.name}"? This will remove it from active service.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (id && vessel) {
                                await remove(id);
                                Alert.alert("Success", "Vessel archived successfully!");
                                router.back();
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to archive vessel");
                        }
                    },
                },
            ]
        );
    };

    // Calculate vessel statistics
    const vesselStats = useMemo(() => {
        if (!vessel) return null;

        return {
            totalTrips: vessel.total_trips_30d || 0,
            totalBookings: vessel.total_bookings_30d || 0,
            totalRevenue: vessel.total_revenue_30d || 0,
            capacityUtilization: vessel.capacity_utilization_30d || 0,
            avgPassengersPerTrip: vessel.avg_passengers_per_trip || 0,
            daysInService: vessel.days_in_service_30d || 0,
            performanceRating: getUtilizationRating(vessel),
            estimatedRevenue: vessel.total_revenue_30d || 0,
            onTimePerformance: 95, // Placeholder - would come from actual data
            cancellationRate: 2, // Placeholder - would come from actual data
        };
    }, [vessel, getUtilizationRating]);

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return colors.success;
            case 'inactive':
                return colors.warning;
            case 'maintenance':
                return colors.warning;
            case 'decommissioned':
                return colors.danger;
            default:
                return colors.textSecondary;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Permission check
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

    // Loading state
    if (loading.singleVessel || !vessel) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Loading...",
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

    // Error state
    if (error) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Error",
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
                <View style={styles.errorContainer}>
                    <AlertTriangle size={48} color={colors.danger} />
                    <Text style={styles.errorTitle}>Error Loading Vessel</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button
                        title="Try Again"
                        variant="primary"
                        onPress={loadVessel}
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
                                        onPress={handleEdit}
                                        style={styles.headerActionButton}
                                    >
                                        <Edit size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleDelete}
                                        style={[styles.headerActionButton, styles.deleteActionButton]}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ),
                }}
            />

            <VesselDetails
                vessel={vesselWithDetails || vessel}
                onEdit={canManageVessels() ? handleEdit : undefined}
                onArchive={canManageVessels() ? handleArchive : undefined}
                onViewTrips={handleViewTrips}
                onViewMaintenance={handleViewMaintenance}
                onViewSeatLayout={handleViewSeatLayout}
                showActions={canManageVessels()}
            />
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
    contentContainer: {
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
        borderRadius: 20,
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    deleteActionButton: {
        backgroundColor: colors.error + '10',
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
        padding: 32,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 22,
        marginBottom: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    vesselIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    vesselName: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    vesselInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    vesselDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    statusActive: {
        backgroundColor: colors.successLight,
    },
    statusInactive: {
        backgroundColor: colors.backgroundTertiary,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    quickStats: {
        marginBottom: 24,
    },
    statsGrid: {
        gap: 12,
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        gap: 12,
    },
    statCardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    statCardContent: {
        flex: 1,
    },
    statCardValue: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 22,
        marginBottom: 2,
    },
    statCardLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 20,
        lineHeight: 24,
    },
    infoGrid: {
        gap: 20,
    },
    infoRow: {
        flexDirection: "row",
        gap: 16,
    },
    infoItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "600",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        lineHeight: 20,
    },
    performanceGrid: {
        flexDirection: "row",
        gap: 12,
    },
    performanceCard: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    performanceIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.successLight,
        alignItems: "center",
        justifyContent: "center",
    },
    performanceContent: {
        gap: 2,
    },
    performanceTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    performanceValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 24,
    },
    performanceLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    performanceSubtext: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
        lineHeight: 14,
    },
    operationsSummary: {
        gap: 20,
    },
    summaryCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.infoLight,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    summaryIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    operationsDescription: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
        fontWeight: "500",
    },
    operationButtons: {
        flexDirection: "row",
        gap: 12,
    },
    operationButton: {
        flex: 1,
    },
    systemInfo: {
        gap: 16,
    },
    systemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    systemLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "600",
        flex: 1,
    },
    systemValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
        lineHeight: 18,
    },
    actionsContainer: {
        gap: 16,
        marginTop: 8,
    },
    deleteButton: {
        borderColor: colors.error,
    },
}); 