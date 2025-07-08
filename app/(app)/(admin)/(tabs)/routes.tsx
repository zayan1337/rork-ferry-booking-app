import React, { useState, useEffect } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminRoutes } from "@/hooks/admin";
import {
    MapPin,
    Plus,
    Navigation,
    Map,
    Clock,
    Route
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";

export default function RoutesScreen() {
    const {
        routes,
        islands,
        loading,
        error,
        pagination,
        fetchRoutes,
        fetchIslands,
        refreshRoutes
    } = useAdminRoutes();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Load initial data
    useEffect(() => {
        fetchIslands();
        fetchRoutes();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchIslands(),
                refreshRoutes()
            ]);
        } catch (error) {
            console.error("Refresh error:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            await fetchRoutes({ search: query.trim() });
        } else {
            await fetchRoutes();
        }
    };

    // Calculate stats
    const activeRoutes = routes.filter(r => r.is_active).length;
    const inactiveRoutes = routes.filter(r => !r.is_active).length;
    const totalRoutes = routes.length;
    const averageDistance = routes.length > 0
        ? Math.round(routes.reduce((sum, r) => {
            const distance = parseFloat(r.distance?.replace(/[^\d.]/g, '') || '0');
            return sum + distance;
        }, 0) / routes.length)
        : 0;

    const RouteItem = ({ route }: { route: any }) => {
        if (!route) return null;

        return (
            <TouchableOpacity
                style={styles.itemCard}
                onPress={() => {/* Navigate to route details */ }}
            >
                <View style={styles.itemHeader}>
                    <View style={styles.itemTitleContainer}>
                        <MapPin size={20} color={colors.secondary} />
                        <Text style={styles.itemTitle}>
                            {route.route_name || `${route.from_island_name} to ${route.to_island_name}`}
                        </Text>
                    </View>
                    <StatusBadge status={route.is_active ? "active" : "inactive"} />
                </View>

                <View style={styles.itemDetails}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>From</Text>
                        <Text style={styles.detailValue}>{route.from_island_name}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>To</Text>
                        <Text style={styles.detailValue}>{route.to_island_name}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Base Fare</Text>
                        <Text style={styles.detailValue}>MVR {route.base_fare}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{route.duration || "Unknown"}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            <Stack.Screen
                options={{
                    title: "Routes",
                    headerRight: () => (
                        <Button
                            title="New"
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color="#FFFFFF" />}
                            onPress={() => {/* Navigate to new route */ }}
                        />
                    ),
                }}
            />

            {/* Error state */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Active Routes"
                    value={activeRoutes.toString()}
                    icon={<MapPin size={24} color={colors.success} />}
                    subtitle="Operating"
                />
                <StatCard
                    title="Total Routes"
                    value={totalRoutes.toString()}
                    icon={<Route size={24} color={colors.primary} />}
                    subtitle="Available"
                />
                <StatCard
                    title="Avg Distance"
                    value={`${averageDistance} km`}
                    icon={<Navigation size={24} color={colors.secondary} />}
                    subtitle="Per Route"
                />
                <StatCard
                    title="Inactive"
                    value={inactiveRoutes.toString()}
                    icon={<Map size={24} color={colors.textSecondary} />}
                    subtitle="Not Operating"
                />
            </View>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search routes..."
            />

            {/* Routes List */}
            <View style={styles.section}>
                <SectionHeader
                    title={`Ferry Routes (${routes.length})`}
                    onSeeAll={() => {/* Open filter modal */ }}
                />

                {loading && routes.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading routes...</Text>
                    </View>
                ) : routes.length === 0 ? (
                    <EmptyState
                        title="No routes found"
                        message={searchQuery ? "No routes match your search criteria" : "No routes configured"}
                        icon={<MapPin size={48} color={colors.textSecondary} />}
                    />
                ) : (
                    routes.map((route) => (
                        <RouteItem key={route.id} route={route} />
                    ))
                )}

                <View style={styles.actionButton}>
                    <Button
                        title="Add New Route"
                        variant="outline"
                        icon={<Plus size={18} color={colors.primary} />}
                        onPress={() => {/* Navigate to new route */ }}
                        fullWidth
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    errorContainer: {
        backgroundColor: colors.danger,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    itemCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    itemTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginLeft: 8,
        flex: 1,
    },
    itemDetails: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    detailItem: {
        minWidth: "45%",
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    actionButton: {
        marginTop: 16,
    },
}); 