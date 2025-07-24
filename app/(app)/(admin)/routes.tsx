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
import { useOperationsStore } from "@/store/admin/operationsStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";
import {
    Plus,
    Filter,
    SortAsc,
    SortDesc,
    MapPin,
    DollarSign,
    Activity,
    TrendingUp,
    Users,
    Eye,
    Navigation,
    BarChart3,
    ArrowLeft,
    Search,
    AlertTriangle,
} from "lucide-react-native";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import RouteItem from "@/components/admin/RouteItem";
import StatCard from "@/components/admin/StatCard";
import EmptyState from "@/components/admin/EmptyState";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface RouteListFilters {
    status: "all" | "active" | "inactive" | "maintenance";
    sortBy: "name" | "created_at" | "base_fare" | "total_trips_30d" | "total_revenue_30d";
    sortDirection: "asc" | "desc";
}

export default function RoutesScreen() {
    const {
        routes,
        loading,
        removeRoute,
        searchQueries,
        setSearchQuery,
        fetchRoutes,
    } = useOperationsStore();

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

    // Fetch routes on mount
    React.useEffect(() => {
        if (!routes || routes.length === 0) {
            fetchRoutes();
        }
    }, []);

    // Calculate route statistics
    const routeStats = useMemo(() => {
        if (!routes || !Array.isArray(routes)) return null;

        const activeRoutes = routes.filter(r => r.status === "active" || r.is_active).length;
        const totalRoutes = routes.length;
        const inactiveRoutes = totalRoutes - activeRoutes;

        const avgFare = routes.reduce((sum, r) => sum + (r.base_fare || 0), 0) / (totalRoutes || 1);

        // Calculate total revenue estimate
        const totalRevenue = routes.reduce((total, route) => {
            return total + (route.total_revenue_30d || 0);
        }, 0);

        const totalTrips = routes.reduce((total, route) => {
            return total + (route.total_trips_30d || 0);
        }, 0);

        return {
            totalRoutes,
            activeRoutes,
            inactiveRoutes,
            avgFare: Math.round(avgFare),
            totalRevenue: Math.round(totalRevenue),
            totalTrips,
        };
    }, [routes]);

    // Filter and sort routes
    const filteredAndSortedRoutes = useMemo(() => {
        if (!routes || !Array.isArray(routes)) return [];

        let filtered = routes.filter(route => {
            const searchQuery = searchQueries.routes?.toLowerCase() || '';
            const matchesSearch = !searchQuery ||
                (route.name && route.name.toLowerCase().includes(searchQuery)) ||
                (route.route_name && route.route_name.toLowerCase().includes(searchQuery)) ||
                (route.from_island_name && route.from_island_name.toLowerCase().includes(searchQuery)) ||
                (route.to_island_name && route.to_island_name.toLowerCase().includes(searchQuery));

            const routeStatus = route.status || (route.is_active ? 'active' : 'inactive');
            const matchesStatus = filters.status === "all" || routeStatus === filters.status;

            return matchesSearch && matchesStatus;
        });

        // Sort routes
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (filters.sortBy) {
                case "name":
                    aValue = a.name || a.route_name || "";
                    bValue = b.name || b.route_name || "";
                    break;
                case "base_fare":
                    aValue = a.base_fare || 0;
                    bValue = b.base_fare || 0;
                    break;
                case "total_trips_30d":
                    aValue = a.total_trips_30d || 0;
                    bValue = b.total_trips_30d || 0;
                    break;
                case "total_revenue_30d":
                    aValue = a.total_revenue_30d || 0;
                    bValue = b.total_revenue_30d || 0;
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
        await fetchRoutes();
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

    const handleSort = (field: RouteListFilters["sortBy"]) => {
        setFilters(prev => ({
            ...prev,
            sortBy: field,
            sortDirection: prev.sortBy === field && prev.sortDirection === "asc" ? "desc" : "asc",
        }));
    };

    const formatCurrency = (amount: number) => {
        return `MVR ${amount.toLocaleString()}`;
    };

    const renderRouteItem = ({ item, index }: { item: any; index: number }) => (
        <RouteItem
            key={`route-${item.id}-${index}`}
            route={item}
            onPress={handleRoutePress}
            showStats={true}
        />
    );

    const renderListHeader = () => (
        <View style={styles.listHeader}>
            {/* Quick Stats Summary */}
            {routeStats && (
                <View style={styles.quickStats}>
                    <View style={styles.quickStatsRow}>
                        <View style={styles.quickStatItem}>
                            <View style={[styles.quickStatIcon, { backgroundColor: colors.primaryLight }]}>
                                <Navigation size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.quickStatValue}>{routeStats.totalRoutes}</Text>
                            <Text style={styles.quickStatLabel}>Total</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                            <View style={[styles.quickStatIcon, { backgroundColor: colors.successLight }]}>
                                <Activity size={16} color={colors.success} />
                            </View>
                            <Text style={styles.quickStatValue}>{routeStats.activeRoutes}</Text>
                            <Text style={styles.quickStatLabel}>Active</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                            <View style={[styles.quickStatIcon, { backgroundColor: colors.infoLight }]}>
                                <TrendingUp size={16} color={colors.info} />
                            </View>
                            <Text style={styles.quickStatValue}>{routeStats.totalTrips}</Text>
                            <Text style={styles.quickStatLabel}>Trips</Text>
                        </View>
                        <View style={styles.quickStatItem}>
                            <View style={[styles.quickStatIcon, { backgroundColor: colors.successLight }]}>
                                <DollarSign size={16} color={colors.success} />
                            </View>
                            <Text style={styles.quickStatValue}>{(routeStats.totalRevenue / 1000).toFixed(0)}K</Text>
                            <Text style={styles.quickStatLabel}>Revenue</Text>
                </View>
                    </View>
                </View>
            )}

            {/* Search Section */}
            <View style={styles.searchSection}>
                <SearchBar
                    placeholder="Search routes by name or islands..."
                    value={searchQueries.routes || ""}
                    onChangeText={(text) => setSearchQuery("routes", text)}
                    style={styles.searchBar}
                />
            </View>

            {/* Controls Row */}
            <View style={styles.controlsRow}>
                <View style={styles.controlsLeft}>
                    <TouchableOpacity
                        style={[styles.controlButton, showFilters && styles.controlButtonActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={16} color={showFilters ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.controlButtonText, showFilters && styles.controlButtonTextActive]}>
                            Filters
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.sortControl}>
                        <Text style={styles.sortLabel}>Sort:</Text>
                        <TouchableOpacity
                            style={[styles.sortButton, filters.sortBy === "name" && styles.sortButtonActive]}
                            onPress={() => handleSort("name")}
                        >
                            <Text style={[styles.sortButtonText, filters.sortBy === "name" && styles.sortButtonTextActive]}>
                                Name
                            </Text>
                            {filters.sortBy === "name" && (
                                filters.sortDirection === "asc" ?
                                    <SortAsc size={12} color={colors.primary} /> :
                                    <SortDesc size={12} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.sortButton, filters.sortBy === "base_fare" && styles.sortButtonActive]}
                            onPress={() => handleSort("base_fare")}
                        >
                            <Text style={[styles.sortButtonText, filters.sortBy === "base_fare" && styles.sortButtonTextActive]}>
                                Fare
                            </Text>
                            {filters.sortBy === "base_fare" && (
                                filters.sortDirection === "asc" ?
                                    <SortAsc size={12} color={colors.primary} /> :
                                    <SortDesc size={12} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.controlsRight}>
                    <Text style={styles.resultsCount}>
                        {filteredAndSortedRoutes.length} route{filteredAndSortedRoutes.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {/* Filter Options (Collapsible) */}
            {showFilters && (
                <View style={styles.filtersSection}>
                    <Text style={styles.filterSectionTitle}>Filter by Status</Text>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.filterChip, filters.status === "all" && styles.filterChipActive]}
                            onPress={() => setFilters(prev => ({ ...prev, status: "all" }))}
                        >
                            <Text style={[styles.filterChipText, filters.status === "all" && styles.filterChipTextActive]}>
                                All Routes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, filters.status === "active" && styles.filterChipActive]}
                            onPress={() => setFilters(prev => ({ ...prev, status: "active" }))}
                        >
                            <Text style={[styles.filterChipText, filters.status === "active" && styles.filterChipTextActive]}>
                                Active Only
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, filters.status === "inactive" && styles.filterChipActive]}
                            onPress={() => setFilters(prev => ({ ...prev, status: "inactive" }))}
                        >
                            <Text style={[styles.filterChipText, filters.status === "inactive" && styles.filterChipTextActive]}>
                                Inactive Only
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                    )}

            {/* Section Divider */}
            {filteredAndSortedRoutes.length > 0 && (
                <View style={styles.sectionDivider}>
                    <Text style={styles.listTitle}>Routes</Text>
                </View>
            )}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
                <Navigation size={64} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No routes found</Text>
            <Text style={styles.emptyStateText}>
                {searchQueries.routes || filters.status !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "No routes have been created yet"}
            </Text>
            {canManageRoutes() && !searchQueries.routes && filters.status === "all" && (
                <Button
                    title="Create First Route"
                    onPress={handleAddRoute}
                    variant="primary"
                    icon={<Plus size={20} color={colors.white} />}
                    style={styles.emptyStateButton}
                />
            )}
        </View>
    );

    if (!canViewRoutes()) {
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
                        You don't have permission to view routes.
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
                    title: "Routes",
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

            {loading.routes ? (
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading routes...</Text>
                </View>
            ) : (
            <FlatList
                data={filteredAndSortedRoutes}
                renderItem={renderRouteItem}
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={renderEmptyState}
                keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Floating Add Button */}
            {canManageRoutes() && filteredAndSortedRoutes.length > 0 && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={handleAddRoute}
                    activeOpacity={0.8}
                >
                    <Plus size={24} color={colors.white} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
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
    backButton: {
        padding: 8,
        marginLeft: -8,
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
    listContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 100, // Space for floating button
    },
    listHeader: {
        paddingTop: 20,
        paddingBottom: 16,
    },
    quickStats: {
        marginBottom: 20,
    },
    quickStatsRow: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    quickStatItem: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    quickStatIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    quickStatValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 24,
    },
    quickStatLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    searchSection: {
        marginBottom: 20,
    },
    searchBar: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    controlsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        gap: 16,
    },
    controlsLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        flex: 1,
    },
    controlsRight: {
        alignItems: "flex-end",
    },
    controlButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    controlButtonActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    controlButtonText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    controlButtonTextActive: {
        color: colors.primary,
    },
    sortControl: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sortLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    sortButtonActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    sortButtonText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    sortButtonTextActive: {
        color: colors.primary,
    },
    resultsCount: {
        fontSize: 14,
        color: colors.textTertiary,
        fontWeight: "500",
    },
    filtersSection: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    filterSectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    filterRow: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    sectionDivider: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: 8,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 80,
        paddingHorizontal: 20,
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
    floatingButton: {
        position: "absolute",
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
}); 