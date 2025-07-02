import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import StatCard from "@/components/StatCard";
import AgentBookingCard from "@/components/AgentBookingCard";
import Button from "@/components/Button";
import {
    TicketIcon,
    Users,
    CreditCard,
    DollarSign,
    Calendar,
    CheckCircle,
    XCircle,
    Plus
} from "lucide-react-native";
import { getInactiveBookings } from "@/utils/bookingUtils";
import { formatCurrency } from "@/utils/currencyUtils";
import { getAgentDisplayName, formatAgentId } from "@/utils/agentUtils";
import { useAgentData } from "@/hooks/useAgentData";

export default function AgentDashboardScreen() {
    const router = useRouter();
    const {
        agent,
        stats,
        bookings,
        localStats,
        isLoading,
        error,
        retryInitialization
    } = useAgentData();

    // Use local stats for more accurate active/inactive calculations
    const displayStats = {
        totalBookings: stats?.totalBookings || localStats?.totalBookings || 0,
        activeBookings: localStats?.activeBookings || stats?.activeBookings || 0, // Prioritize local calculation
        completedBookings: stats?.completedBookings || localStats?.completedBookings || 0,
        cancelledBookings: stats?.cancelledBookings || localStats?.cancelledBookings || 0,
        totalRevenue: stats?.totalRevenue || localStats?.totalRevenue || 0,
        totalCommission: stats?.totalCommission || localStats?.totalCommission || 0,
        uniqueClients: stats?.uniqueClients || localStats?.uniqueClients || 0,
    };

    // Get the most recent bookings - safely handle undefined bookings
    const recentBookings = (bookings || [])
        .slice() // Create a copy
        .sort((a, b) => new Date(b.bookingDate || 0).getTime() - new Date(a.bookingDate || 0).getTime())
        .slice(0, 3);

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

    if (isLoading || !agent) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

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

    const agentFirstName = getAgentDisplayName(agent);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

            <View style={styles.agentInfoCard}>
                <Card variant="elevated">
                    <View style={styles.agentInfoHeader}>
                        <Text style={styles.agentInfoTitle}>Agent Information</Text>
                        <View style={styles.agentIdBadge}>
                            <Text style={styles.agentIdText}>{formatAgentId(agent.agentId)}</Text>
                        </View>
                    </View>

                    <View style={styles.agentInfoRow}>
                        <View style={styles.agentInfoItem}>
                            <Text style={styles.agentInfoLabel}>Credit Balance</Text>
                            <Text style={styles.agentInfoValue}>{formatCurrency(agent.creditBalance)}</Text>
                        </View>
                        <View style={styles.agentInfoItem}>
                            <Text style={styles.agentInfoLabel}>Discount Rate</Text>
                            <Text style={styles.agentInfoValue}>{agent.discountRate || 0}%</Text>
                        </View>
                        <View style={styles.agentInfoItem}>
                            <Text style={styles.agentInfoLabel}>Free Tickets</Text>
                            <Text style={styles.agentInfoValue}>{agent.freeTicketsRemaining || 0}</Text>
                        </View>
                    </View>
                </Card>
            </View>

            <Text style={styles.sectionTitle}>Performance Overview</Text>
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
                    title="Inactive Bookings"
                    value={localStats ? getInactiveBookings(bookings || []).length : 0}
                    icon={<XCircle size={16} color={Colors.warning} />}
                    color={Colors.warning}
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

            <View style={styles.recentBookingsHeader}>
                <Text style={styles.sectionTitle}>Recent Bookings</Text>
                <TouchableOpacity onPress={handleViewAllBookings}>
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                    booking && booking.id ? (
                        <AgentBookingCard
                            key={booking.id}
                            booking={booking}
                            onPress={() => handleBookingPress(booking.id)}
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
    loadingText: {
        fontSize: 16,
        color: Colors.textSecondary,
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
    agentInfoHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    agentInfoTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
    },
    agentIdBadge: {
        backgroundColor: Colors.highlight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    agentIdText: {
        color: Colors.primary,
        fontWeight: "500",
        fontSize: 14,
    },
    agentInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    agentInfoItem: {
        flex: 1,
    },
    agentInfoLabel: {
        fontSize: 12,
        color: Colors.subtext,
        marginBottom: 4,
    },
    agentInfoValue: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
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