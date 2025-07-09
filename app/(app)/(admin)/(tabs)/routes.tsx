import React, { useState } from "react";
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
import { useAdminStore } from "@/store/admin/adminStore";
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
    const adminStore = useAdminStore();
    const routes = adminStore?.routes || [];
    const refreshData = adminStore?.refreshData || (() => Promise.resolve());

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshData();
        } catch (error) {
            console.error("Refresh error:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const filteredRoutes = routes?.filter((route) => {
        if (!route) return false;
        const name = route.name || "";
        const origin = route.origin || "";
        const destination = route.destination || "";
        const id = route.id || "";
        const query = searchQuery?.toLowerCase() || "";

        return name.toLowerCase().includes(query) ||
            origin.toLowerCase().includes(query) ||
            destination.toLowerCase().includes(query) ||
            id.toLowerCase().includes(query);
    }) || [];

    // Calculate stats with null safety
    const activeRoutes = routes?.filter(r => r?.status === "active")?.length || 0;
    const inactiveRoutes = routes?.filter(r => r?.status === "inactive")?.length || 0;
    const totalRoutes = routes?.length || 0;
    const averageDistance = routes?.length > 0
        ? Math.round(routes.reduce((sum, r) => sum + (parseFloat(r?.distance?.replace(/[^\d.]/g, '') || '0') || 0), 0) / routes.length)
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
                        <Text style={styles.itemTitle}>{route?.name || "Unknown Route"}</Text>
                    </View>
                    <StatusBadge status={route?.status || "inactive"} />
                </View>

                <View style={styles.itemDetails}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Origin</Text>
                        <Text style={styles.detailValue}>{route?.origin || "Unknown"}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Destination</Text>
                        <Text style={styles.detailValue}>{route?.destination || "Unknown"}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{route?.duration || "Unknown"}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Distance</Text>
                        <Text style={styles.detailValue}>{route?.distance || "Unknown"}</Text>
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
                onChangeText={setSearchQuery}
                placeholder="Search routes..."
            />

            {/* Routes List */}
            <View style={styles.section}>
                <SectionHeader
                    title={`Ferry Routes (${filteredRoutes?.length || 0})`}
                    onSeeAll={() => {/* Open filter modal */ }}
                />

                {(!filteredRoutes || filteredRoutes.length === 0) ? (
                    <EmptyState
                        title="No routes found"
                        message={searchQuery ? "No routes match your search criteria" : "No routes configured"}
                        icon={<MapPin size={48} color={colors.textSecondary} />}
                    />
                ) : (
                    filteredRoutes.map((route, index) => (
                        <RouteItem key={route?.id || index} route={route} />
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
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
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
        gap: 8,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    itemDetails: {
        gap: 8,
    },
    detailItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    detailLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    actionButton: {
        marginTop: 16,
    },
}); 