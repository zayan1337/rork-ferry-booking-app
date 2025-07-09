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
    Ship,
    Plus,
    Anchor,
    Activity,
    MapPin,
    Navigation
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";

export default function VesselsScreen() {
    const adminStore = useAdminStore();
    const vessels = adminStore?.vessels || [];
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

    const filteredVessels = vessels?.filter((vessel) => {
        if (!vessel) return false;
        const name = vessel.name || "";
        const id = vessel.id || "";
        const query = searchQuery?.toLowerCase() || "";

        return name.toLowerCase().includes(query) || id.toLowerCase().includes(query);
    }) || [];

    // Calculate stats with null safety
    const activeVessels = vessels?.filter(v => v?.status === "active")?.length || 0;
    const maintenanceVessels = vessels?.filter(v => v?.status === "maintenance")?.length || 0;
    const totalCapacity = vessels?.reduce((sum, v) => sum + (v?.capacity || 0), 0) || 0;
    const inactiveVessels = vessels?.filter(v => v?.status === "inactive")?.length || 0;

    const VesselItem = ({ vessel }: { vessel: any }) => {
        if (!vessel) return null;

        return (
            <TouchableOpacity
                style={styles.itemCard}
                onPress={() => router.push(`../vessel/${vessel?.id || ""}`)}
            >
                <View style={styles.itemHeader}>
                    <View style={styles.itemTitleContainer}>
                        <Ship size={20} color={colors.primary} />
                        <Text style={styles.itemTitle}>{vessel?.name || "Unknown Vessel"}</Text>
                    </View>
                    <StatusBadge status={vessel?.status || "inactive"} />
                </View>

                <View style={styles.itemDetails}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Capacity</Text>
                        <Text style={styles.detailValue}>{vessel?.capacity || 0} passengers</Text>
                    </View>
                    {vessel?.currentLocation && (
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Location</Text>
                            <Text style={styles.detailValue}>
                                {vessel.currentLocation.latitude?.toFixed(2) || "0.00"}, {vessel.currentLocation.longitude?.toFixed(2) || "0.00"}
                            </Text>
                        </View>
                    )}
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
                    title: "Vessels",
                    headerRight: () => (
                        <Button
                            title="New"
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color="#FFFFFF" />}
                            onPress={() => router.push("../vessel/new")}
                        />
                    ),
                }}
            />

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Active Vessels"
                    value={activeVessels.toString()}
                    icon={<Ship size={24} color={colors.success} />}
                    subtitle="Operating"
                />
                <StatCard
                    title="Maintenance"
                    value={maintenanceVessels.toString()}
                    icon={<Anchor size={24} color={colors.warning} />}
                    subtitle="In Service"
                />
                <StatCard
                    title="Total Capacity"
                    value={totalCapacity.toString()}
                    icon={<Activity size={24} color={colors.primary} />}
                    subtitle="Passengers"
                />
                <StatCard
                    title="Inactive"
                    value={inactiveVessels.toString()}
                    icon={<Ship size={24} color={colors.textSecondary} />}
                    subtitle="Not Operating"
                />
            </View>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search vessels..."
            />

            {/* Vessels List */}
            <View style={styles.section}>
                <SectionHeader
                    title={`Fleet Vessels (${filteredVessels?.length || 0})`}
                    onSeeAll={() => {/* Open filter modal */ }}
                />

                {(!filteredVessels || filteredVessels.length === 0) ? (
                    <EmptyState
                        title="No vessels found"
                        message={searchQuery ? "No vessels match your search criteria" : "No vessels in fleet"}
                        icon={<Ship size={48} color={colors.textSecondary} />}
                    />
                ) : (
                    filteredVessels.map((vessel, index) => (
                        <VesselItem key={vessel?.id || index} vessel={vessel} />
                    ))
                )}

                <View style={styles.actionButton}>
                    <Button
                        title="Add New Vessel"
                        variant="outline"
                        icon={<Plus size={18} color={colors.primary} />}
                        onPress={() => router.push("../vessel/new")}
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