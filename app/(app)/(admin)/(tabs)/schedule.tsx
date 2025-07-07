import React, { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import {
    Calendar,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle,
    Ship
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import TripItem from "@/components/admin/TripItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";

export default function ScheduleScreen() {
    const {
        trips,
        refreshData,
    } = useAdminStore();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    };

    const filteredTrips = trips?.filter((trip) =>
        (trip?.routeName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (trip?.vesselName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (trip?.id || "").includes(searchQuery)
    ) || [];

    // Calculate stats
    const todayTrips = trips?.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t?.date === today;
    }) || [];

    const completedTrips = trips?.filter(t => t?.status === "completed").length || 0;
    const inProgressTrips = trips?.filter(t => t?.status === "in-progress").length || 0;
    const scheduledTrips = trips?.filter(t => t?.status === "scheduled").length || 0;

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
                    title: "Schedule",
                    headerRight: () => (
                        <Button
                            title="New"
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color="#FFFFFF" />}
                            onPress={() => router.push("../schedule/new")}
                        />
                    ),
                }}
            />

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Today's Trips"
                    value={todayTrips.length.toString()}
                    icon={<Calendar size={24} color={colors.primary} />}
                    subtitle="+8%"
                />
                <StatCard
                    title="In Progress"
                    value={inProgressTrips.toString()}
                    icon={<Ship size={24} color={colors.secondary} />}
                    subtitle="Active"
                />
                <StatCard
                    title="Completed"
                    value={completedTrips.toString()}
                    icon={<CheckCircle size={24} color={colors.success} />}
                    subtitle="+5%"
                />
                <StatCard
                    title="Scheduled"
                    value={scheduledTrips.toString()}
                    icon={<Clock size={24} color={colors.warning} />}
                    subtitle="Upcoming"
                />
            </View>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search trips..."
            />

            {/* Trips List */}
            <View style={styles.section}>
                <SectionHeader
                    title={`All Trips (${filteredTrips.length})`}
                    onSeeAll={() => {/* Open filter modal */ }}
                />

                {filteredTrips.length === 0 ? (
                    <EmptyState
                        title="No trips found"
                        message={searchQuery ? "No trips match your search criteria" : "No trips scheduled"}
                        icon={<Calendar size={48} color={colors.textSecondary} />}
                    />
                ) : (
                    filteredTrips.map((trip) => (
                        <TripItem
                            key={trip.id}
                            trip={trip}
                            onPress={() => router.push(`../schedule/${trip.id}`)}
                        />
                    ))
                )}

                <View style={styles.actionButton}>
                    <Button
                        title="Schedule New Trip"
                        variant="outline"
                        icon={<Plus size={18} color={colors.primary} />}
                        onPress={() => router.push("../schedule/new")}
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
    actionButton: {
        marginTop: 16,
    },
}); 