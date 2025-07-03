import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { 
    Plus,
    TicketIcon,
    Users,
    CreditCard,
    DollarSign,
    Calendar,
    CheckCircle,
    XCircle
} from "lucide-react-native";

import Colors from "@/constants/colors";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import AgentBookingCard from "@/components/AgentBookingCard";
import Button from "@/components/Button";
import { AgentInfoCard } from "@/components/agent";
import {
    SkeletonAgentInfoSection,
    SkeletonStatsSection,
    SkeletonRecentBookingsList
} from "@/components/skeleton";

import { useAgentData } from "@/hooks/useAgentData";
import { useRefreshControl } from "@/hooks/useRefreshControl";

import { 
    formatCurrency, 
    formatAgentDisplayName 
} from "@/utils/agentFormatters";
import { getDashboardStats, getDashboardBookings } from "@/utils/agentDashboard";

export default function AgentDashboardScreen() {
    const router = useRouter();
    const {
        agent,
        stats,
        bookings,
        localStats,
        isInitializing,
        isLoadingStats,
        isLoadingBookings,
        error,
        retryInitialization,
        refreshAgentData
    } = useAgentData();

    const { isRefreshing, onRefresh } = useRefreshControl({
        onRefresh: refreshAgentData
    });

    // Use utility functions for processing data
    const displayStats = getDashboardStats(stats, localStats);
    const recentBookings = getDashboardBookings(bookings);
    const agentFirstName = formatAgentDisplayName(agent);

    const handleBookingPress = (bookingId: string) => {
        if (bookingId) {
            router.push(`../booking/${bookingId}` as any);
        }
    };

    const handleNewBooking = () => {
        router.push("../booking/new" as any);
    };

    const handleViewAllBookings = () => {
        router.push("./bookings");
    };

    // Stable function for booking press
    const handleBookingCardPress = React.useCallback((booking: any) => {
        handleBookingPress(booking.id);
    }, []);

    if (error) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <Button
                    title="Retry"
                    onPress={retryInitialization}
                    variant="primary"
                />
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl 
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    colors={[Colors.primary]}
                    tintColor={Colors.primary}
                />
            }
        >
            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {agentFirstName}</Text>
                    <Text style={styles.subGreeting}>Welcome to your agent dashboard</Text>
                </View>
                <TouchableOpacity
                    style={styles.newBookingButton}
                    onPress={handleNewBooking}
                >
                    <Plus size={20} color="white" />
                    <Text style={styles.newBookingText}>New Booking</Text>
                </TouchableOpacity>
            </View>

            {/* Agent Information Card */}
            <View style={styles.agentInfoCard}>
                {isInitializing || !agent ? (
                    <SkeletonAgentInfoSection delay={0} />
                ) : (
                    <AgentInfoCard agent={agent} variant="dashboard" />
                )}
            </View>

            {/* Performance Overview Section */}
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            {isLoadingStats || isInitializing ? (
                <SkeletonStatsSection delay={0} />
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsContainer}
                >
                    <StatCard
                        title="Total Bookings"
                        value={displayStats.totalBookings}
                        icon={<TicketIcon size={16} color={Colors.primary} />}
                    />
                    <StatCard
                        title="Active Bookings"
                        value={displayStats.activeBookings}
                        icon={<Calendar size={16} color={Colors.primary} />}
                    />
                    <StatCard
                        title="Completed"
                        value={displayStats.completedBookings}
                        icon={<CheckCircle size={16} color={Colors.success} />}
                        color={Colors.success}
                    />
                    <StatCard
                        title="Cancelled"
                        value={displayStats.cancelledBookings}
                        icon={<XCircle size={16} color={Colors.error} />}
                        color={Colors.error}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(displayStats.totalRevenue)}
                        icon={<DollarSign size={16} color={Colors.primary} />}
                    />
                    <StatCard
                        title="Commission"
                        value={formatCurrency(displayStats.totalCommission)}
                        icon={<CreditCard size={16} color={Colors.secondary} />}
                        color={Colors.secondary}
                    />
                    <StatCard
                        title="Unique Clients"
                        value={displayStats.uniqueClients}
                        icon={<Users size={16} color={Colors.primary} />}
                    />
                </ScrollView>
            )}

            {/* Recent Bookings Section */}
            <View style={styles.recentBookingsHeader}>
                <Text style={styles.sectionTitle}>Recent Bookings</Text>
                <TouchableOpacity onPress={handleViewAllBookings}>
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {isLoadingBookings || isInitializing ? (
                <SkeletonRecentBookingsList count={3} delay={0} />
            ) : recentBookings.length > 0 ? (
                recentBookings.map((booking: any) => (
                    booking && booking.id ? (
                        <AgentBookingCard
                            key={booking.id}
                            booking={booking}
                            onPress={handleBookingCardPress}
                        />
                    ) : null
                ))
            ) : (
                <Card variant="outlined" style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No recent bookings found</Text>
                    <Button
                        title="Create a Booking"
                        onPress={handleNewBooking}
                        variant="primary"
                        style={styles.emptyButton}
                    />
                </Card>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    errorText: {
        fontSize: 16,
        color: Colors.error,
        textAlign: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    greeting: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
    },
    subGreeting: {
        fontSize: 16,
        color: Colors.subtext,
    },
    newBookingButton: {
        backgroundColor: Colors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    newBookingText: {
        color: "white",
        fontWeight: "600",
        marginLeft: 4,
    },
    agentInfoCard: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 12,
    },
    statsContainer: {
        paddingBottom: 8,
    },
    recentBookingsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        marginBottom: 12,
    },
    viewAllText: {
        color: Colors.primary,
        fontWeight: "500",
    },
    emptyCard: {
        alignItems: "center",
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.subtext,
        marginBottom: 16,
    },
    emptyButton: {
        minWidth: 200,
    },
}); 