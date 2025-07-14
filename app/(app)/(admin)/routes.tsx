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
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";
import {
    Plus,
    Filter,
    SortAsc,
    SortDesc,
    MapPin,
    Clock,
    DollarSign,
    Activity,
    TrendingUp,
    Users,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Navigation,
    BarChart3,
} from "lucide-react-native";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import StatCard from "@/components/admin/StatCard";
import EmptyState from "@/components/admin/EmptyState";

interface RouteListFilters {
    status: "all" | "active" | "inactive" | "maintenance";
    sortBy: "name" | "created_at" | "base_fare" | "total_trips_30d";
    sortDirection: "asc" | "desc";
}

export default function RoutesScreen() {
    const {
        routes,
        trips,
        loading,
        deleteRoute,
        searchQueries,
        setSearchQuery,
    } = useAdminStore();

    const {
        canViewRoutes,
        canManageRoutes,
        canUpdateRoutes,
        canDeleteRoutes,
    } = useAdminPermissions();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filters, setFilters] = useState<RouteListFilters>({
        status: "all",
        sortBy: "name",
        sortDirection: "asc",
    });
    const [showFilters, setShowFilters] = useState(false);

    const { isTablet } = getResponsiveDimensions();

    // Calculate route statistics
    const routeStats = useMemo(() => {
        if (!routes) return null;

        const activeRoutes = routes.filter(r => r.status === "active").length;
        const totalRoutes = routes.length;
        const avgFare = routes.reduce((sum, r) => sum + (r.base_fare || 0), 0) / totalRoutes;

        // Calculate total revenue estimate from trips
        const totalRevenue = trips?.reduce((total, trip) => {
            const route = routes.find(r => r.id === trip.route_id);
            if (route) {
                return total + ((trip.booked_seats || 0) * (route.base_fare || 0) * (trip.fare_multiplier || 1));
            }
            return total;
        }, 0) || 0;

        return {
            totalRoutes,
            activeRoutes,
            inactiveRoutes: totalRoutes - activeRoutes,
            avgFare: Math.round(avgFare),
            totalRevenue: Math.round(totalRevenue),
        };
    }, [routes, trips]);

    // Filter and sort routes
    const filteredAndSortedRoutes = useMemo(() => {
        if (!routes) return [];

        let filtered = routes.filter(route => {
            const searchQuery = searchQueries.routes?.toLowerCase() || '';
            const matchesSearch = !searchQuery ||
                route.name?.toLowerCase().includes(searchQuery) ||
                route.origin?.toLowerCase().includes(searchQuery) ||
                route.destination?.toLowerCase().includes(searchQuery);

            const matchesStatus = filters.status === "all" || route.status === filters.status;

            return matchesSearch && matchesStatus;
        });

        // Sort routes
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (filters.sortBy) {
                case "name":
                    aValue = a.name || "";
                    bValue = b.name || "";
                    break;
                case "base_fare":
                    aValue = a.base_fare || 0;
                    bValue = b.base_fare || 0;
                    break;
                case "total_trips_30d":
                    aValue = a.total_trips_30d || 0;
                    bValue = b.total_trips_30d || 0;
                    break;
                case "created_at":
                default:
                    aValue = new Date(a.created_at || "").getTime();
                    bValue = new Date(b.created_at || "").getTime();
                    break;
            }

            if (filters.sortDirection === "desc") {
                return aValue < bValue ? 1 : -1;
            }
            return aValue > bValue ? 1 : -1;
        });

        return filtered;
    }, [routes, searchQueries.routes, filters]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    const handleRoutePress = (routeId: string) => {
        if (canViewRoutes()) {
            router.push(`./route/${routeId}` as any);
        }
    };

    const handleAddRoute = () => {
        if (canManageRoutes()) {
            router.push("./route/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create routes.");
        }
    };

    const handleEditRoute = (routeId: string) => {
        if (canUpdateRoutes()) {
            router.push(`./route/${routeId}/edit` as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to edit routes.");
        }
    };

    const handleDeleteRoute = (route: any) => {
        if (!canDeleteRoutes()) {
            Alert.alert("Access Denied", "You don't have permission to delete routes.");
            return;
        }

        Alert.alert(
            "Delete Route",
            `Are you sure you want to delete "${route.name}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteRoute(route.id);
                            Alert.alert("Success", "Route deleted successfully.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete route.");
                        }
                    },
                },
            ]
        );
    };

    const handleSort = (field: RouteListFilters["sortBy"]) => {
        setFilters(prev => ({
            ...prev,
            sortBy: field,
            sortDirection: prev.sortBy === field && prev.sortDirection === "asc" ? "desc" : "asc",
        }));
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'default';
            case 'inactive': return 'payment';
            case 'maintenance': return 'payment';
            default: return 'default';
        }
    };

    const formatCurrency = (amount: number) => {
        return `MVR ${amount.toLocaleString()}`;
    };

    const renderRouteItem = ({ item: route }: { item: any }) => (
        <TouchableOpacity
            style={styles.routeCard}
            onPress={() => handleRoutePress(route.id)}
        >
            <View style={styles.routeCardHeader}>
                <View style={styles.routeIcon}>
                    <Navigation size={20} color={colors.primary} />
                </View>
                <View style={styles.routeMainInfo}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    <View style={styles.routeDirection}>
                        <MapPin size={14} color={colors.textSecondary} />
                        <Text style={styles.routeDetails}>
                            {route.origin} → {route.destination}
                        </Text>
                    </View>
                </View>
                <StatusBadge
                    status={route.status}
                    variant={getStatusVariant(route.status)}
                />
            </View>

            <View style={styles.routeCardContent}>
                <View style={styles.routeMetrics}>
                    <View style={styles.metricItem}>
                        <Activity size={16} color={colors.textSecondary} />
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>{route.distance || "N/A"}</Text>
                    </View>

                    <View style={styles.metricItem}>
                        <Clock size={16} color={colors.textSecondary} />
                        <Text style={styles.metricLabel}>Duration</Text>
                        <Text style={styles.metricValue}>{route.duration || "N/A"}</Text>
                    </View>

                    <View style={styles.metricItem}>
                        <DollarSign size={16} color={colors.textSecondary} />
                        <Text style={styles.metricLabel}>Base Fare</Text>
                        <Text style={styles.metricValue}>{formatCurrency(route.base_fare || 0)}</Text>
                    </View>

                    {route.total_trips_30d !== null && route.total_trips_30d !== undefined && (
                        <View style={styles.metricItem}>
                            <BarChart3 size={16} color={colors.textSecondary} />
                            <Text style={styles.metricLabel}>Trips (30d)</Text>
                            <Text style={styles.metricValue}>{route.total_trips_30d}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.routeActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleRoutePress(route.id)}
                    >
                        <Eye size={16} color={colors.primary} />
                    </TouchableOpacity>

                    {canUpdateRoutes() && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEditRoute(route.id)}
                        >
                            <Edit size={16} color={colors.primary} />
                        </TouchableOpacity>
                    )}

                    {canDeleteRoutes() && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.dangerAction]}
                            onPress={() => handleDeleteRoute(route)}
                        >
                            <Trash2 size={16} color={colors.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (!canViewRoutes()) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: "Access Denied" }} />
                <EmptyState
                    icon={<MapPin size={48} color={colors.warning} />}
                    title="Access Denied"
                    message="You don't have permission to view routes."
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Routes Management",
                    headerShown: true,
                }}
            />

            {/* Header with Stats */}
            {routeStats && (
                <View style={styles.statsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statsContent}
                    >
                        <StatCard
                            title="Total Routes"
                            value={routeStats.totalRoutes.toString()}
                            icon={<Navigation size={20} color={colors.primary} />}
                            trend="neutral"
                            size="small"
                        />
                        <StatCard
                            title="Active Routes"
                            value={routeStats.activeRoutes.toString()}
                            icon={<TrendingUp size={20} color={colors.success} />}
                            trend="up"
                            size="small"
                        />
                        <StatCard
                            title="Avg Fare"
                            value={formatCurrency(routeStats.avgFare)}
                            icon={<DollarSign size={20} color={colors.primary} />}
                            trend="neutral"
                            size="small"
                        />
                        <StatCard
                            title="Est. Revenue"
                            value={formatCurrency(routeStats.totalRevenue)}
                            icon={<BarChart3 size={20} color={colors.success} />}
                            trend="up"
                            size="small"
                        />
                    </ScrollView>
                </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <View style={styles.headerSection}>
                    <SectionHeader
                        title="All Routes"
                        subtitle={`${filteredAndSortedRoutes.length} routes found`}
                    />
                </View>

                {canManageRoutes() && (
                    <View style={styles.buttonSection}>
                        <Button
                            title={isTablet ? "Add Route" : "Add"}
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color="#FFFFFF" />}
                            onPress={handleAddRoute}
                        />
                    </View>
                )}
            </View>

            {/* Search and Filters */}
            <View style={styles.filtersContainer}>
                <SearchBar
                    placeholder="Search routes..."
                    value={searchQueries.routes || ""}
                    onChangeText={(text) => setSearchQuery("routes", text)}
                    style={styles.searchBar}
                />

                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Filter size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Filter Options */}
            {showFilters && (
                <View style={styles.filtersPanel}>
                    <Text style={styles.filterTitle}>Status</Text>
                    <View style={styles.filterOptions}>
                        {["all", "active", "inactive", "maintenance"].map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.filterOption,
                                    filters.status === status && styles.filterOptionActive,
                                ]}
                                onPress={() => setFilters(prev => ({ ...prev, status: status as any }))}
                            >
                                <Text
                                    style={[
                                        styles.filterOptionText,
                                        filters.status === status && styles.filterOptionTextActive,
                                    ]}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterTitle}>Sort By</Text>
                    <View style={styles.sortOptions}>
                        {[
                            { key: "name", label: "Name" },
                            { key: "base_fare", label: "Fare" },
                            { key: "total_trips_30d", label: "Trips" },
                            { key: "created_at", label: "Date" },
                        ].map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={styles.sortOption}
                                onPress={() => handleSort(option.key as any)}
                            >
                                <Text style={styles.sortOptionText}>{option.label}</Text>
                                {filters.sortBy === option.key && (
                                    filters.sortDirection === "asc" ?
                                        <SortAsc size={16} color={colors.primary} /> :
                                        <SortDesc size={16} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Routes List */}
            <FlatList
                data={filteredAndSortedRoutes}
                renderItem={renderRouteItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={() => (
                    <EmptyState
                        icon={<Navigation size={48} color={colors.textSecondary} />}
                        title="No Routes Found"
                        message="No routes match your current filters. Try adjusting your search or filters."
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    statsContainer: {
        paddingVertical: 16,
    },
    statsContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    controlsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start", // Changed to flex-start for better alignment
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 60, // Ensure minimum height
    },
    headerSection: {
        flex: 1,
        paddingRight: 12, // Add some padding to prevent overlap
        minWidth: 0, // Allow shrinking if needed
    },
    buttonSection: {
        flexShrink: 0,
        justifyContent: "center",
    },
    filtersContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
    },
    searchBar: {
        flex: 1,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
    },
    filtersPanel: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    filterTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
        marginTop: 12,
    },
    filterOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    filterOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterOptionActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterOptionText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    filterOptionTextActive: {
        color: "#FFFFFF",
    },
    sortOptions: {
        gap: 8,
    },
    sortOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
    },
    sortOptionText: {
        fontSize: 14,
        color: colors.text,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    routeCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    routeCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    routeIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    routeMainInfo: {
        flex: 1,
    },
    routeName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    routeDirection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    routeDetails: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    routeCardContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    routeMetrics: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    metricItem: {
        alignItems: "center",
        minWidth: 60,
    },
    metricLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.text,
    },
    routeActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
        alignItems: "center",
        justifyContent: "center",
    },
    dangerAction: {
        backgroundColor: colors.danger + "15",
    },
}); 