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
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
// UPDATED: Replace old content store with new zone store
import { useZoneStore } from "@/store/admin/zoneStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from "@/types";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Globe,
    Calendar,
    AlertCircle,
    Activity,
    MapPin,
    BarChart3,
    TrendingUp,
    Hash,
    FileText,
    Settings,
    Info,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');

type Zone = AdminManagement.Zone;

export default function ZoneDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewSettings, canManageSettings } = useAdminPermissions();

    // UPDATED: Use new zone store instead of content store
    const {
        data: zones,
        getZoneById,
        delete: deleteZone,
        fetchAll: fetchZones,
        fetchById,
    } = useZoneStore();

    const [zone, setZone] = useState<Zone | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isTablet = screenWidth >= 768;

    const loadZone = async () => {
        if (!id) return;

        try {
            setLoading(true);

            // UPDATED: Use new zone store methods
            // First try to get from current store data
            const zoneData = getZoneById(id);
            if (zoneData) {
                setZone(zoneData);
            } else {
                // Zone not found in store, fetch it
                const fetchedZone = await fetchById(id);
                setZone(fetchedZone);

                // If still not found, refresh all zones
                if (!fetchedZone) {
                    await fetchZones();
                    const refreshedZone = getZoneById(id);
                    setZone(refreshedZone || null);
                }
            }
        } catch (error) {
            console.error("Error loading zone:", error);
            Alert.alert("Error", "Failed to load zone details");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadZone();
        setIsRefreshing(false);
    };

    const handleEdit = () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to edit zones.");
            return;
        }
        router.push(`../zone/edit/${id}` as any);
    };

    const handleDelete = () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to delete zones.");
            return;
        }

        Alert.alert(
            "Delete Zone",
            `Are you sure you want to delete "${zone?.name}"? This action cannot be undone and will affect all islands in this zone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteZone(id);
                            Alert.alert("Success", "Zone deleted successfully");
                            router.back();
                        } catch (error) {
                            console.error("Error deleting zone:", error);
                            Alert.alert("Error", "Failed to delete zone. There may be islands using this zone.");
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const getStatusVariant = (status: boolean) => {
        return status ? 'default' : 'warning';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    useEffect(() => {
        loadZone();
    }, [id]);

    if (!canViewSettings()) {
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
                        <AlertCircle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view zone details.
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

    if (loading) {
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
                    <Text style={styles.loadingText}>Loading zone details...</Text>
                </View>
            </View>
        );
    }

    if (!zone) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Zone Not Found",
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
                <View style={styles.notFoundContainer}>
                    <View style={styles.notFoundIcon}>
                        <AlertCircle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.notFoundTitle}>Zone Not Found</Text>
                    <Text style={styles.notFoundText}>
                        The zone you're looking for doesn't exist or may have been deleted.
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

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: zone.name,
                    headerLeft: () => (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            {canManageSettings() && (
                                <TouchableOpacity
                                    onPress={handleEdit}
                                    style={styles.headerActionButton}
                                >
                                    <Edit size={20} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                            {canManageSettings() && (
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={[styles.headerActionButton, styles.deleteActionButton]}
                                    disabled={deleting}
                                >
                                    <Trash2 size={20} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Zone Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.zoneIcon, { backgroundColor: colors.primaryLight }]}>
                            <Globe size={24} color={colors.primary} />
                        </View>
                        <View style={styles.headerContent}>
                            <Text style={styles.zoneName}>{zone.name}</Text>
                            <View style={styles.zoneCode}>
                                <Hash size={16} color={colors.primary} />
                                <Text style={[styles.codeText, { color: colors.primary }]}>
                                    {zone.code}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        zone.is_active ? styles.statusActive : styles.statusInactive
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: zone.is_active ? colors.success : colors.textSecondary }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            zone.is_active ? styles.statusTextActive : styles.statusTextInactive
                        ]}>
                            {zone.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <View style={styles.statCardIcon}>
                                    <MapPin size={20} color={colors.primary} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{zone.total_islands || 0}</Text>
                                    <Text style={styles.statCardLabel}>Total Islands</Text>
                                </View>
                            </View>

                            <View style={styles.statCard}>
                                <View style={[styles.statCardIcon, { backgroundColor: colors.successLight }]}>
                                    <Activity size={20} color={colors.success} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{zone.active_islands || 0}</Text>
                                    <Text style={styles.statCardLabel}>Active Islands</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <View style={[styles.statCardIcon, { backgroundColor: colors.infoLight }]}>
                                    <TrendingUp size={20} color={colors.info} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{zone.total_routes || 0}</Text>
                                    <Text style={styles.statCardLabel}>Total Routes</Text>
                                </View>
                            </View>

                            <View style={styles.statCard}>
                                <View style={[styles.statCardIcon, { backgroundColor: colors.warningLight }]}>
                                    <BarChart3 size={20} color={colors.warning} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{zone.active_routes || 0}</Text>
                                    <Text style={styles.statCardLabel}>Active Routes</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Zone Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Zone Information</Text>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Globe size={20} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Zone Name</Text>
                                    <Text style={styles.infoValue}>{zone.name}</Text>
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
                                    <Hash size={20} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Zone Code</Text>
                                    <Text style={[styles.infoValue, { color: colors.primary }]}>
                                        {zone.code}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <View style={[
                                    styles.infoIcon,
                                    { backgroundColor: zone.is_active ? colors.successLight : colors.backgroundTertiary }
                                ]}>
                                    <Settings size={20} color={zone.is_active ? colors.success : colors.textSecondary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Status</Text>
                                    <Text style={[
                                        styles.infoValue,
                                        { color: zone.is_active ? colors.success : colors.textSecondary }
                                    ]}>
                                        {zone.is_active ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <BarChart3 size={20} color={colors.textSecondary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Order Index</Text>
                                    <Text style={styles.infoValue}>
                                        {zone.order_index}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {zone.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <View style={styles.descriptionCard}>
                            <View style={styles.descriptionIcon}>
                                <FileText size={20} color={colors.info} />
                            </View>
                            <Text style={styles.descriptionText}>
                                {zone.description}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Islands Overview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Islands Overview</Text>

                    <View style={styles.islandsSummary}>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryIcon}>
                                <Info size={20} color={colors.info} />
                            </View>
                            <Text style={styles.islandsDescription}>
                                This zone contains {zone.total_islands || 0} island{(zone.total_islands || 0) !== 1 ? 's' : ''},
                                with {zone.active_islands || 0} active island{(zone.active_islands || 0) !== 1 ? 's' : ''} and {zone.total_routes || 0} route{(zone.total_routes || 0) !== 1 ? 's' : ''}.
                            </Text>
                        </View>

                        {(zone.total_islands || 0) > 0 && (
                            <Button
                                title="View Islands"
                                variant="outline"
                                onPress={() => router.push(`../islands?zone=${id}` as any)}
                                icon={<MapPin size={16} color={colors.primary} />}
                            />
                        )}
                    </View>
                </View>

                {/* System Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System Information</Text>

                    <View style={styles.systemInfo}>
                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Zone ID</Text>
                            <Text style={styles.systemValue} selectable>{zone.id}</Text>
                        </View>

                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Created Date</Text>
                            <Text style={styles.systemValue}>
                                {formatDate(zone.created_at)}
                            </Text>
                        </View>

                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Last Updated</Text>
                            <Text style={styles.systemValue}>
                                {formatDate(zone.updated_at)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {canManageSettings() && (
                        <Button
                            title="Edit Zone"
                            onPress={handleEdit}
                            variant="primary"
                            icon={<Edit size={20} color={colors.white} />}
                        />
                    )}
                    {canManageSettings() && (
                        <Button
                            title="Delete Zone"
                            onPress={handleDelete}
                            variant="outline"
                            loading={deleting}
                            style={styles.deleteButton}
                            icon={<Trash2 size={20} color={colors.error} />}
                        />
                    )}
                </View>
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
    contentContainer: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 40,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 20,
    },
    noAccessIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.warningLight,
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    notFoundContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 20,
    },
    notFoundIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.warningLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    notFoundTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    notFoundText: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 22,
        marginBottom: 20,
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
        backgroundColor: colors.errorLight,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    zoneIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    zoneName: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 6,
        lineHeight: 30,
    },
    zoneCode: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    codeText: {
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.1,
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
    descriptionCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.infoLight,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    descriptionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    descriptionText: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
        fontWeight: "500",
    },
    islandsSummary: {
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
    islandsDescription: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
        fontWeight: "500",
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