import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    FlatList,
    Dimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";
import { filterVessels, searchVessels, formatVesselCapacity, getVesselAge, getVesselEfficiencyRating } from "@/utils/vesselUtils";
import {
    Plus,
    Filter,
    SortAsc,
    SortDesc,
    Ship,
    Users,
    Settings,
    Activity,
    TrendingUp,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Wrench,
    Calendar,
    Anchor,
    Gauge,
} from "lucide-react-native";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import StatCard from "@/components/admin/StatCard";
import EmptyState from "@/components/admin/EmptyState";

// Reusable Admin Components
import {
    StatsSection,
    SearchFilterBar,
    TabSelector,
    ListSection
} from "@/components/admin/common";
import { VesselStats } from "@/components/admin/operations";

interface VesselListFilters {
    status: "all" | "active" | "inactive" | "maintenance" | "decommissioned";
    vessel_type: "all" | "ferry" | "speedboat" | "catamaran";
    sortBy: "name" | "created_at" | "seating_capacity" | "capacity_utilization_30d" | "year_built";
    sortDirection: "asc" | "desc";
}

const { width: screenWidth } = Dimensions.get('window');

// VesselItem Component
interface VesselItemProps {
    vessel: any;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (vessel: any) => void;
    canManage?: boolean;
}

const VesselItem: React.FC<VesselItemProps> = ({ vessel, onPress, onEdit, onDelete, canManage = false }) => {
    if (!vessel || typeof vessel !== 'object' || !vessel.id) {
        return null;
    }

    // Safe string conversion function
    const safeString = (value: any, fallback: string = '') => {
        if (value === null || value === undefined) return fallback;
        return String(value);
    };

    // Safe utility function calls with fallbacks
    const getVesselCapacityDisplay = () => {
        try {
            if (vessel && vessel.seating_capacity && vessel.crew_capacity && vessel.capacity) {
                return formatVesselCapacity(vessel);
            }
            return 'N/A';
        } catch (error) {
            return 'N/A';
        }
    };

    const getVesselAgeDisplay = () => {
        try {
            if (vessel) {
                return getVesselAge(vessel);
            }
            return 0;
        } catch (error) {
            return 0;
        }
    };

    const getVesselRatingDisplay = () => {
        try {
            if (vessel) {
                return getVesselEfficiencyRating(vessel);
            }
            return 'N/A';
        } catch (error) {
            return 'N/A';
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "active":
                return "confirmed" as const;
            case "maintenance":
                return "pending" as const;
            case "inactive":
                return "cancelled" as const;
            case "decommissioned":
                return "failed" as const;
            default:
                return "pending" as const;
        }
    };

    const getEfficiencyColor = (rating: string) => {
        switch (rating) {
            case "excellent":
                return colors.success;
            case "good":
                return colors.primary;
            case "fair":
                return colors.warning;
            case "poor":
                return colors.danger;
            case "N/A":
                return colors.textSecondary;
            default:
                return colors.textSecondary;
        }
    };

    return (
        <TouchableOpacity
            style={styles.vesselItem}
            onPress={() => onPress(vessel.id)}
            activeOpacity={0.7}
        >
            <View style={styles.vesselHeader}>
                <View style={styles.vesselInfo}>
                    <View style={styles.vesselNameRow}>
                        <Ship size={20} color={colors.primary} />
                        <Text style={styles.vesselName}>
                            {safeString(vessel?.name, 'Unknown Vessel')}
                        </Text>
                        <StatusBadge
                            status={getStatusVariant(vessel?.status || 'inactive')}
                        />
                    </View>
                    <Text style={styles.vesselRegistration}>
                        Registration: {safeString(vessel?.registration_number, 'N/A')}
                    </Text>
                    <Text style={styles.vesselType}>
                        {vessel?.vessel_type ?
                            safeString(vessel.vessel_type.charAt(0).toUpperCase() + vessel.vessel_type.slice(1)) :
                            'Unknown Type'
                        }
                        {vessel?.manufacturer && ` • ${safeString(vessel.manufacturer)}`}
                    </Text>
                </View>

                {canManage && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            Alert.alert(
                                "Vessel Actions",
                                "Choose an action",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Edit", onPress: () => onEdit?.(vessel.id) },
                                    { text: "Archive", style: "destructive", onPress: () => onDelete?.(vessel) },
                                ]
                            );
                        }}
                    >
                        <MoreVertical size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.vesselStats}>
                <View style={styles.statRow}>
                    <View style={styles.statItem}>
                        <Users size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Capacity</Text>
                        <Text style={styles.statValue}>
                            {getVesselCapacityDisplay()}
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <TrendingUp size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Utilization</Text>
                        <Text style={[
                            styles.statValue,
                            { color: (vessel?.capacity_utilization_30d || 0) >= 70 ? colors.success : colors.warning }
                        ]}>
                            {safeString(vessel?.capacity_utilization_30d || 0)}%
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Calendar size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Age</Text>
                        <Text style={styles.statValue}>
                            {safeString(getVesselAgeDisplay())} years
                        </Text>
                    </View>

                    <View style={styles.statItem}>
                        <Gauge size={16} color={colors.textSecondary} />
                        <Text style={styles.statLabel}>Rating</Text>
                        <Text style={[
                            styles.statValue,
                            { color: getEfficiencyColor(getVesselRatingDisplay()) }
                        ]}>
                            {safeString(getVesselRatingDisplay())}
                        </Text>
                    </View>
                </View>

                {vessel?.total_trips_30d !== undefined && vessel?.total_trips_30d !== null && (
                    <View style={styles.additionalStats}>
                        <Text style={styles.tripsStat}>
                            {safeString(vessel.total_trips_30d || 0)} trips in last 30 days
                        </Text>
                        {vessel?.total_revenue_30d && vessel.total_revenue_30d > 0 && (
                            <Text style={styles.revenueStat}>
                                MVR {safeString((vessel.total_revenue_30d || 0).toLocaleString())} revenue
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default function VesselsScreen() {
    const { vessels, deleteVessel, loading } = useAdminStore();
    const { canViewVessels, canManageVessels } = useAdminPermissions();

    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<VesselListFilters>({
        status: "all",
        vessel_type: "all",
        sortBy: "name",
        sortDirection: "asc",
    });

    const { isTablet, isSmallScreen } = getResponsiveDimensions();

    // Filter and sort vessels
    const filteredVessels = useMemo(() => {
        let result = Array.isArray(vessels) ? vessels.filter(vessel =>
            vessel &&
            typeof vessel === 'object' &&
            vessel.id &&
            vessel.name
        ) : [];

        // Apply search
        if (searchQuery.trim()) {
            result = searchVessels(result, searchQuery);
        }

        // Apply filters
        result = filterVessels(result, {
            status: filters.status === "all" ? undefined : filters.status,
            vessel_type: filters.vessel_type === "all" ? undefined : filters.vessel_type,
        });

        // Apply sorting with safe property access
        result.sort((a, b) => {
            // Ensure both items exist and have required properties
            if (!a || !b) return 0;

            let aValue, bValue;

            switch (filters.sortBy) {
                case "name":
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case "created_at":
                    aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
                    bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
                    break;
                case "seating_capacity":
                    aValue = a.seating_capacity || 0;
                    bValue = b.seating_capacity || 0;
                    break;
                case "capacity_utilization_30d":
                    aValue = a.capacity_utilization_30d || 0;
                    bValue = b.capacity_utilization_30d || 0;
                    break;
                case "year_built":
                    aValue = a.year_built || 0;
                    bValue = b.year_built || 0;
                    break;
                default:
                    return 0;
            }

            if (typeof aValue === "string" && typeof bValue === "string") {
                return filters.sortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return filters.sortDirection === "asc"
                ? (aValue as number) - (bValue as number)
                : (bValue as number) - (aValue as number);
        });

        return result;
    }, [vessels, searchQuery, filters]);

    // Calculate statistics
    const stats = useMemo(() => {
        const vesselsArray = Array.isArray(vessels) ? vessels : [];
        const totalVessels = vesselsArray.length;
        const activeVessels = vesselsArray.filter(v => v?.status === "active").length;
        const maintenanceVessels = vesselsArray.filter(v => v?.status === "maintenance").length;
        const avgUtilization = vesselsArray.length ?
            vesselsArray.reduce((sum, v) => sum + (v?.capacity_utilization_30d || 0), 0) / vesselsArray.length : 0;

        return [
            {
                title: "Total Vessels",
                value: totalVessels.toString(),
                icon: <Ship size={24} color={colors.primary} />,
                trend: totalVessels > 0 ? "up" : "neutral",
            },
            {
                title: "Active Vessels",
                value: activeVessels.toString(),
                icon: <Activity size={24} color={colors.success} />,
                trend: activeVessels > 0 ? "up" : "neutral",
            },
            {
                title: "In Maintenance",
                value: maintenanceVessels.toString(),
                icon: <Wrench size={24} color={colors.warning} />,
                trend: maintenanceVessels > 0 ? "down" : "neutral",
            },
            {
                title: "Avg Utilization",
                value: `${Math.round(avgUtilization)}%`,
                icon: <TrendingUp size={24} color={colors.primary} />,
                trend: avgUtilization >= 70 ? "up" : avgUtilization >= 40 ? "neutral" : "down",
            },
        ];
    }, [vessels]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Add refresh logic here
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    const handleVesselPress = (vesselId: string) => {
        if (canViewVessels()) {
            router.push(`/vessel/${vesselId}` as any);
        }
    };

    const handleAddVessel = () => {
        if (canManageVessels()) {
            router.push("/vessel/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create vessels.");
        }
    };

    const handleEditVessel = (vesselId: string) => {
        if (canManageVessels()) {
            router.push(`/vessel/${vesselId}` as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to edit vessels.");
        }
    };

    const handleDeleteVessel = (vessel: any) => {
        if (!canManageVessels()) {
            Alert.alert("Access Denied", "You don't have permission to delete vessels.");
            return;
        }

        Alert.alert(
            "Archive Vessel",
            `Are you sure you want to archive "${vessel.name}"? This will remove it from active service.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteVessel(vessel.id);
                            Alert.alert("Success", "Vessel archived successfully!");
                        } catch (error) {
                            Alert.alert("Error", "Failed to archive vessel");
                        }
                    },
                },
            ]
        );
    };

    const handleSort = (field: VesselListFilters["sortBy"]) => {
        setFilters(prev => ({
            ...prev,
            sortBy: field,
            sortDirection: prev.sortBy === field && prev.sortDirection === "asc" ? "desc" : "asc",
        }));
    };





    if (!canViewVessels()) {
        return (
            <View style={styles.noPermissionContainer}>
                <Stack.Screen options={{ title: "Vessels" }} />
                <Ship size={64} color={colors.textSecondary} />
                <Text style={styles.noPermissionTitle}>Access Denied</Text>
                <Text style={styles.noPermissionText}>
                    You don't have permission to view vessels.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Vessels",
                    headerShown: true,
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
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
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <SectionHeader
                            title="Vessels Management"
                            subtitle={`${filteredVessels.length} vessels found`}
                        />
                    </View>
                    {canManageVessels() && (
                        <View style={styles.headerAction}>
                            <Button
                                title={isSmallScreen ? "Add" : "Add Vessel"}
                                onPress={handleAddVessel}
                                size="small"
                                variant="primary"
                                icon={<Plus size={16} color="white" />}
                            />
                        </View>
                    )}
                </View>

                {/* Statistics */}
                <StatsSection
                    title=""
                    subtitle=""
                    stats={stats.map(stat => ({
                        title: stat.title,
                        value: stat.value,
                        icon: stat.icon,
                        trend: stat.trend === "up" ? "up" : stat.trend === "down" ? "down" : undefined
                    }))}
                    isTablet={isTablet}
                    headerSize="small"
                />

                {/* Search and Filters */}
                <SearchFilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search vessels..."
                    rightActions={[
                        {
                            icon: <Filter size={20} color={showFilters ? "white" : colors.primary} />,
                            onPress: () => setShowFilters(!showFilters),
                            variant: showFilters ? "primary" : "outline",
                            size: "medium",
                            title: showFilters ? "Hide Filters" : "Filters"
                        }
                    ]}
                />

                {/* Quick Filter Tabs */}
                <View style={styles.quickFilters}>
                    <TabSelector
                        options={[
                            { key: "all", label: "All", },
                            { key: "active", label: "Active" },
                            { key: "maintenance", label: "Maintenance" },
                            { key: "inactive", label: "Inactive" },
                        ]}
                        activeTab={filters.status}
                        onTabChange={(tab) => setFilters(prev => ({ ...prev, status: tab as any }))}
                        variant="pills"
                        showCounts={filters.status === "all"}
                    />

                    <TabSelector
                        options={[
                            { key: "all", label: "All Types" },
                            { key: "ferry", label: "Ferry" },
                            { key: "speedboat", label: "Speedboat" },
                            { key: "catamaran", label: "Catamaran" },
                        ]}
                        activeTab={filters.vessel_type}
                        onTabChange={(tab) => setFilters(prev => ({ ...prev, vessel_type: tab as any }))}
                        variant="pills"
                    />
                </View>

                {/* Advanced Filters */}
                {showFilters && (
                    <View style={styles.advancedFilters}>
                        <Text style={styles.filterSectionTitle}>Sort Options</Text>
                        <TabSelector
                            options={[
                                { key: "name", label: "Name" },
                                { key: "seating_capacity", label: "Capacity" },
                                { key: "capacity_utilization_30d", label: "Utilization" },
                                { key: "year_built", label: "Age" },
                            ]}
                            activeTab={filters.sortBy}
                            onTabChange={(tab) => handleSort(tab as any)}
                            variant="cards"
                        />
                        <View style={styles.sortDirection}>
                            <TouchableOpacity
                                style={[styles.sortDirectionButton, filters.sortDirection === "asc" && styles.sortDirectionActive]}
                                onPress={() => setFilters(prev => ({ ...prev, sortDirection: "asc" }))}
                            >
                                <SortAsc size={16} color={filters.sortDirection === "asc" ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.sortDirectionText, filters.sortDirection === "asc" && styles.sortDirectionTextActive]}>
                                    Ascending
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sortDirectionButton, filters.sortDirection === "desc" && styles.sortDirectionActive]}
                                onPress={() => setFilters(prev => ({ ...prev, sortDirection: "desc" }))}
                            >
                                <SortDesc size={16} color={filters.sortDirection === "desc" ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.sortDirectionText, filters.sortDirection === "desc" && styles.sortDirectionTextActive]}>
                                    Descending
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Vessels List */}
                <View style={styles.vesselsList}>
                    {filteredVessels.length > 0 ? (
                        <View style={styles.vesselsContainer}>
                            {filteredVessels.filter(vessel =>
                                vessel &&
                                typeof vessel === 'object' &&
                                vessel.id &&
                                vessel.name
                            ).map((vessel) => (
                                <VesselItem
                                    key={vessel.id}
                                    vessel={vessel}
                                    onPress={handleVesselPress}
                                    onEdit={handleEditVessel}
                                    onDelete={handleDeleteVessel}
                                    canManage={canManageVessels()}
                                />
                            ))}
                        </View>
                    ) : (
                        <EmptyState
                            title="No vessels found"
                            message={searchQuery ? "Try adjusting your search terms" : "No vessels available"}
                            icon={<Ship size={48} color={colors.textSecondary} />}
                            action={canManageVessels() ? (
                                <Button
                                    title="Add First Vessel"
                                    onPress={handleAddVessel}
                                    variant="primary"
                                    size="small"
                                />
                            ) : undefined}
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
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: 44,
        gap: 12,
    },
    headerContent: {
        flex: 1,
        minWidth: 0, // Allow shrinking
    },
    headerAction: {
        flexShrink: 0, // Prevent shrinking
    },
    quickFilters: {
        gap: 16,
        marginBottom: 16,
    },
    advancedFilters: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 16,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    sortDirection: {
        flexDirection: "row",
        gap: 12,
        marginTop: 12,
    },
    sortDirectionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    sortDirectionActive: {
        backgroundColor: colors.primary + "10",
        borderColor: colors.primary,
    },
    sortDirectionText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    sortDirectionTextActive: {
        color: colors.primary,
    },
    vesselsList: {
        flex: 1,
    },
    vesselsContainer: {
        gap: 12,
    },


    vesselItem: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    vesselHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    vesselInfo: {
        flex: 1,
        gap: 4,
    },
    vesselNameRow: {
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
    vesselRegistration: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    vesselType: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actionButton: {
        padding: 4,
    },
    vesselStats: {
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
    additionalStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    tripsStat: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "500",
    },
    revenueStat: {
        fontSize: 12,
        color: colors.success,
        fontWeight: "500",
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        backgroundColor: colors.backgroundSecondary,
        gap: 16,
    },
    noPermissionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.text,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
    },
}); 