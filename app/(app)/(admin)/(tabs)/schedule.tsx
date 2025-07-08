import React, { useState, useEffect } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminTrips } from "@/hooks/admin";
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
        loading,
        error,
        pagination,
        fetchTrips,
        refreshTrips
    } = useAdminTrips();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Load initial data
    useEffect(() => {
        fetchTrips();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshTrips();
        } catch (error) {
            console.error("Refresh error:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            await fetchTrips({ search: query.trim() });
        } else {
            await fetchTrips();
        }
    };

    // Calculate stats
    const todayTrips = trips.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t.travel_date === today;
    });

    const completedTrips = trips.filter(t => t.status === "completed").length;
    const inProgressTrips = trips.filter(t => t.status === "in_progress").length;
    const scheduledTrips = trips.filter(t => t.status === "scheduled").length;

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

            {/* Error state */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Today's Trips"
                    value={todayTrips.length.toString()}
                    icon={<Calendar size={24} color={colors.primary} />}
                    subtitle={`${Math.round((todayTrips.length / Math.max(trips.length, 1)) * 100)}%`}
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
                    subtitle={`${Math.round((completedTrips / Math.max(trips.length, 1)) * 100)}%`}
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
                onChangeText={handleSearch}
                placeholder="Search trips..."
            />

            {/* Trips List */}
            <View style={styles.section}>
                <SectionHeader
                    title={`All Trips (${trips.length})`}
                    onSeeAll={() => {/* Open filter modal */ }}
                />

                {loading && trips.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading trips...</Text>
                    </View>
                ) : trips.length === 0 ? (
                    <EmptyState
                        title="No trips found"
                        message={searchQuery ? "No trips match your search criteria" : "No trips scheduled"}
                        icon={<Calendar size={48} color={colors.textSecondary} />}
                    />
                ) : (
                    trips.map((trip) => (
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
    actionButton: {
        marginTop: 16,
    },
}); 