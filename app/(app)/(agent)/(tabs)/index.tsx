import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import {
    Plus,
    TicketIcon,
    Users,
    CreditCard,
    DollarSign,
    Calendar,
    CheckCircle,
    XCircle,
    TrendingUp,
    TrendingDown,
    Clock,
    AlertCircle,
    Activity,
    Settings,
    Search,
    FileText,
    UserPlus,
    ArrowUp,
    ArrowDown,
    MapPin,
    Bell
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
import {
    getDashboardStats,
    getDashboardBookings,
    calculatePerformanceMetrics,
    getUpcomingBookings,
    calculateCreditHealth,
    getResponsiveConfig,
    getBookingTrends,
    formatBookingStatus
} from "@/utils/agentDashboard";

const { width: screenWidth } = Dimensions.get('window');
const responsiveConfig = getResponsiveConfig(screenWidth);

// Trend Indicator Component
const TrendIndicator = ({
    value,
    isPositive,
    showPercentage = true
}: {
    value: number;
    isPositive?: boolean;
    showPercentage?: boolean;
}) => {
    const isUp = isPositive !== undefined ? isPositive : value > 0;
    const displayValue = showPercentage ? `${Math.abs(value).toFixed(1)}%` : Math.abs(value).toString();

    return (
        <View style={[styles.trendIndicator, { backgroundColor: isUp ? Colors.success + '20' : Colors.error + '20' }]}>
            {isUp ? (
                <ArrowUp size={12} color={Colors.success} />
            ) : (
                <ArrowDown size={12} color={Colors.error} />
            )}
            <Text style={[styles.trendText, { color: isUp ? Colors.success : Colors.error }]}>
                {displayValue}
            </Text>
        </View>
    );
};

// Quick Action Item Component
const QuickActionCard = ({
    title,
    icon,
    onPress,
    backgroundColor = Colors.primary
}: {
    title: string;
    icon: React.ReactNode;
    onPress: () => void;
    backgroundColor?: string;
}) => (
    <TouchableOpacity
        style={[styles.quickActionCard, { backgroundColor }]}
        onPress={onPress}
    >
        {icon}
        <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
);

// Enhanced Credit Overview Component
const CreditOverviewCard = ({ agent, bookings }: { agent: any; bookings: any[] }) => {
    if (!agent) return null;

    const creditHealth = calculateCreditHealth(agent, bookings);

    return (
        <Card style={styles.creditOverviewCard}>
            <View style={styles.creditHeader}>
                <Text style={styles.creditTitle}>Credit Overview</Text>
                {creditHealth.isCriticalCredit && (
                    <View style={[styles.creditBadge, { backgroundColor: Colors.error + '20' }]}>
                        <AlertCircle size={14} color={Colors.error} />
                        <Text style={[styles.creditBadgeText, { color: Colors.error }]}>Critical</Text>
                    </View>
                )}
                {creditHealth.isLowCredit && !creditHealth.isCriticalCredit && (
                    <View style={[styles.creditBadge, { backgroundColor: Colors.warning + '20' }]}>
                        <AlertCircle size={14} color={Colors.warning} />
                        <Text style={[styles.creditBadgeText, { color: Colors.warning }]}>Low Credit</Text>
                    </View>
                )}
            </View>

            <View style={styles.creditMetrics}>
                <View style={styles.creditMetric}>
                    <Text style={styles.creditLabel}>Available Credit</Text>
                    <Text style={[styles.creditValue, {
                        color: creditHealth.isCriticalCredit ? Colors.error :
                            creditHealth.isLowCredit ? Colors.warning : Colors.success
                    }]}>
                        {formatCurrency(agent.creditBalance)}
                    </Text>
                </View>

                <View style={styles.creditMetric}>
                    <Text style={styles.creditLabel}>Credit Ceiling</Text>
                    <Text style={styles.creditValue}>
                        {formatCurrency(agent.creditCeiling)}
                    </Text>
                </View>

                <View style={styles.creditMetric}>
                    <Text style={styles.creditLabel}>Utilization</Text>
                    <Text style={styles.creditValue}>
                        {creditHealth.utilizationPercentage.toFixed(1)}%
                    </Text>
                </View>
            </View>

            {/* Credit Usage Bar */}
            <View style={styles.creditBar}>
                <View
                    style={[
                        styles.creditBarFill,
                        {
                            width: `${creditHealth.utilizationPercentage}%`,
                            backgroundColor: creditHealth.isCriticalCredit ? Colors.error :
                                creditHealth.isLowCredit ? Colors.warning : Colors.success
                        }
                    ]}
                />
            </View>

            {creditHealth.daysToDeplete > 0 && creditHealth.daysToDeplete < 30 && (
                <View style={styles.creditWarning}>
                    <Text style={styles.creditWarningText}>
                        ⚠️ Credit may deplete in ~{creditHealth.daysToDeplete} days at current usage
                    </Text>
                </View>
            )}

            {agent.freeTicketsAllocation > 0 && (
                <View style={styles.freeTicketsInfo}>
                    <TicketIcon size={16} color={Colors.secondary} />
                    <Text style={styles.freeTicketsText}>
                        {agent.freeTicketsRemaining}/{agent.freeTicketsAllocation} free tickets remaining
                    </Text>
                </View>
            )}
        </Card>
    );
};

// Enhanced Performance Insights Component
const PerformanceInsightsCard = ({ stats, bookings, clients }: { stats: any; bookings: any[]; clients: any[] }) => {
    const metrics = calculatePerformanceMetrics(bookings, clients);
    const trends = getBookingTrends(bookings);

    return (
        <Card style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
                <TrendingUp size={20} color={Colors.primary} />
                <Text style={styles.performanceTitle}>Performance Insights</Text>
            </View>

            <View style={styles.performanceMetrics}>
                <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Completion Rate</Text>
                    <Text style={[styles.performanceValue, { color: Colors.success }]}>
                        {metrics.completionRate.toFixed(1)}%
                    </Text>
                </View>

                <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Client Retention</Text>
                    <Text style={[styles.performanceValue, { color: Colors.secondary }]}>
                        {metrics.clientRetentionRate.toFixed(1)}%
                    </Text>
                </View>

                <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Avg Revenue/Booking</Text>
                    <Text style={styles.performanceValue}>
                        {formatCurrency(metrics.averageRevenuePerBooking)}
                    </Text>
                </View>
            </View>

            {/* Trends Section */}
            <View style={styles.trendsSection}>
                <View style={styles.trendItem}>
                    <Text style={styles.trendLabel}>This Week</Text>
                    <View style={styles.trendValueContainer}>
                        <Text style={styles.trendValue}>{trends.thisWeek} bookings</Text>
                        {trends.weeklyChange !== 0 && (
                            <TrendIndicator value={trends.weeklyChange} />
                        )}
                    </View>
                </View>

                <View style={styles.trendItem}>
                    <Text style={styles.trendLabel}>This Month</Text>
                    <View style={styles.trendValueContainer}>
                        <Text style={styles.trendValue}>{trends.thisMonth} bookings</Text>
                        {trends.monthlyChange !== 0 && (
                            <TrendIndicator value={trends.monthlyChange} />
                        )}
                    </View>
                </View>
            </View>
        </Card>
    );
};

// Upcoming Departures Component
const UpcomingDeparturesCard = ({ bookings, router }: { bookings: any[]; router: any }) => {
    const upcomingBookings = getUpcomingBookings(bookings);

    if (upcomingBookings.length === 0) return null;

    return (
        <Card style={styles.upcomingCard}>
            <View style={styles.upcomingHeader}>
                <Calendar size={20} color={Colors.primary} />
                <Text style={styles.upcomingTitle}>Upcoming Departures</Text>
                <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>{upcomingBookings.length}</Text>
                </View>
            </View>

            <ScrollView style={styles.upcomingList} nestedScrollEnabled>
                {upcomingBookings.slice(0, 3).map((booking, index) => {
                    const statusInfo = formatBookingStatus(booking.status);
                    const departureDate = new Date(booking.departureDate);
                    const isToday = departureDate.toDateString() === new Date().toDateString();
                    const isTomorrow = departureDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                    let dateLabel = departureDate.toLocaleDateString();
                    if (isToday) dateLabel = 'Today';
                    else if (isTomorrow) dateLabel = 'Tomorrow';

                    return (
                        <View key={booking.id} style={styles.upcomingItem}>
                            <View style={styles.upcomingInfo}>
                                <View style={styles.upcomingRoute}>
                                    <MapPin size={14} color={Colors.primary} />
                                    <Text style={styles.upcomingRouteText}>
                                        {booking.origin} → {booking.destination}
                                    </Text>
                                </View>
                                <Text style={styles.upcomingClient}>{booking.clientName}</Text>
                                <View style={styles.upcomingDetails}>
                                    <Text style={[styles.upcomingDate, { color: isToday ? Colors.warning : Colors.subtext }]}>
                                        {dateLabel}
                                    </Text>
                                    {booking.departureTime && (
                                        <Text style={styles.upcomingTime}>{booking.departureTime}</Text>
                                    )}
                                </View>
                            </View>
                            <View style={[styles.upcomingStatus, { backgroundColor: statusInfo.color + '20' }]}>
                                <Text style={[styles.upcomingStatusText, { color: statusInfo.color }]}>
                                    {statusInfo.label}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {upcomingBookings.length > 3 && (
                <TouchableOpacity
                    style={styles.upcomingViewAll}
                    onPress={() => router.push({
                        pathname: "./bookings",
                        params: { sortBy: "upcoming", filter: "upcoming" }
                    })}
                >
                    <Text style={styles.upcomingViewAllText}>
                        View all {upcomingBookings.length} upcoming departures
                    </Text>
                </TouchableOpacity>
            )}
        </Card>
    );
};

export default function AgentDashboardScreen() {
    const router = useRouter();
    const {
        agent,
        stats,
        bookings,
        clients,
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

    const handleViewClients = () => {
        router.push("./clients");
    };

    const handleViewCredit = () => {
        router.push("./credit");
    };

    const handleViewProfile = () => {
        router.push("./profile");
    };

    // Stable function for booking press
    const handleBookingCardPress = React.useCallback((booking: any) => {
        handleBookingPress(booking.id);
    }, []);

    // Quick actions configuration
    const quickActions = [
        {
            title: "New Booking",
            icon: <Plus size={20} color="white" />,
            onPress: handleNewBooking,
            backgroundColor: Colors.primary
        },
        {
            title: "Add Client",
            icon: <UserPlus size={20} color="white" />,
            onPress: handleViewClients,
            backgroundColor: '#5a67d8'  // Indigo - professional alternative
        },
        {
            title: "View Reports",
            icon: <FileText size={20} color="white" />,
            onPress: handleViewAllBookings,
            backgroundColor: '#667eea'  // Lighter indigo for variety
        },
        {
            title: "Settings",
            icon: <Settings size={20} color="white" />,
            onPress: handleViewProfile,
            backgroundColor: '#718096'  // Neutral gray-blue
        }
    ];

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
                    <Text style={[styles.greeting, { fontSize: responsiveConfig.fontSize.heading }]}>
                        Hello, {agentFirstName}
                    </Text>
                    <Text style={[styles.subGreeting, { fontSize: responsiveConfig.fontSize.body }]}>
                        Welcome to your agent dashboard
                    </Text>
                    <View style={styles.headerBadge}>
                        <Activity size={14} color={Colors.primary} />
                        <Text style={styles.headerBadgeText}>Agent Portal</Text>
                    </View>
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

            {/* Credit Overview */}
            {!isInitializing && agent && (
                <CreditOverviewCard agent={agent} bookings={bookings || []} />
            )}

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { fontSize: responsiveConfig.fontSize.title }]}>
                Quick Actions
            </Text>
            <View style={[styles.quickActionsContainer, { gap: responsiveConfig.cardSpacing }]}>
                {quickActions.map((action, index) => (
                    <QuickActionCard
                        key={index}
                        title={action.title}
                        icon={action.icon}
                        onPress={action.onPress}
                        backgroundColor={action.backgroundColor}
                    />
                ))}
            </View>

            {/* Performance Overview Section */}
            <Text style={[styles.sectionTitle, { fontSize: responsiveConfig.fontSize.title }]}>
                Performance Overview
            </Text>
            {isLoadingStats || isInitializing ? (
                <SkeletonStatsSection delay={0} />
            ) : (
                <>
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

                    {/* Performance Insights */}
                    <PerformanceInsightsCard
                        stats={displayStats}
                        bookings={bookings || []}
                        clients={clients || []}
                    />
                </>
            )}

            {/* Upcoming Departures */}
            {!isLoadingBookings && !isInitializing && bookings && (
                <UpcomingDeparturesCard bookings={bookings} router={router} />
            )}

            {/* Recent Activity Section */}
            <View style={styles.recentBookingsHeader}>
                <View style={styles.recentBookingsTitle}>
                    {/* <Clock size={18} color={Colors.primary} /> */}
                    <Text style={[styles.sectionTitle, { fontSize: responsiveConfig.fontSize.title }]}>
                        Recent Activity
                    </Text>
                </View>
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
                    <View style={styles.emptyIcon}>
                        <TicketIcon size={48} color={Colors.inactive} />
                    </View>
                    <Text style={styles.emptyTitle}>No Recent Activity</Text>
                    <Text style={styles.emptyText}>Start by creating your first booking or adding a new client</Text>
                    <View style={styles.emptyActions}>
                        <Button
                            title="Create Booking"
                            onPress={handleNewBooking}
                            variant="primary"
                            style={styles.emptyButton}
                        />
                        <Button
                            title="Add Client"
                            onPress={handleViewClients}
                            variant="outline"
                            style={styles.emptyButton}
                        />
                    </View>
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
        alignItems: "flex-start",
        marginBottom: 20,
        paddingTop: 8,
    },
    greeting: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 4,
    },
    subGreeting: {
        fontSize: 16,
        color: Colors.subtext,
        marginBottom: 8,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.highlight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    headerBadgeText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '500',
        marginLeft: 4,
    },
    newBookingButton: {
        backgroundColor: Colors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    newBookingText: {
        color: "white",
        fontWeight: "600",
        marginLeft: 6,
        fontSize: 16,
    },
    agentInfoCard: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.text,
        marginBottom: 16,
        marginTop: 8,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    quickActionCard: {
        width: responsiveConfig.isTablet ? (screenWidth - 64) / 4 : (screenWidth - 56) / 2,
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    quickActionText: {
        color: 'white',
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
        fontSize: 14,
    },
    creditOverviewCard: {
        marginBottom: 24,
        padding: 16,
    },
    creditHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    creditTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    creditBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    creditBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    creditMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    creditMetric: {
        flex: 1,
        alignItems: 'center',
    },
    creditLabel: {
        fontSize: 12,
        color: Colors.subtext,
        marginBottom: 4,
    },
    creditValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    creditBar: {
        height: 6,
        backgroundColor: Colors.border,
        borderRadius: 3,
        marginBottom: 12,
        overflow: 'hidden',
    },
    creditBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    creditWarning: {
        backgroundColor: Colors.warning + '10',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    creditWarningText: {
        fontSize: 12,
        color: Colors.warning,
        textAlign: 'center',
    },
    freeTicketsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    freeTicketsText: {
        fontSize: 14,
        color: Colors.secondary,
        fontWeight: '500',
        marginLeft: 8,
    },
    performanceCard: {
        marginTop: 16,
        padding: 16,
    },
    performanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    performanceTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 8,
    },
    performanceMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    performanceMetric: {
        flex: 1,
        alignItems: 'center',
    },
    performanceLabel: {
        fontSize: 12,
        color: Colors.subtext,
        marginBottom: 4,
        textAlign: 'center',
    },
    performanceValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    trendsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    trendItem: {
        flex: 1,
        alignItems: 'center',
    },
    trendLabel: {
        fontSize: 12,
        color: Colors.subtext,
        marginBottom: 4,
    },
    trendValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trendValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    trendIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 2,
    },
    trendText: {
        fontSize: 10,
        fontWeight: '500',
    },
    upcomingCard: {
        marginBottom: 24,
        padding: 16,
    },
    upcomingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    upcomingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 8,
        flex: 1,
    },
    upcomingBadge: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upcomingBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    upcomingList: {
        maxHeight: 200,
    },
    upcomingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    upcomingInfo: {
        flex: 1,
    },
    upcomingRoute: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    upcomingRouteText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 4,
    },
    upcomingClient: {
        fontSize: 13,
        color: Colors.subtext,
        marginBottom: 4,
    },
    upcomingDetails: {
        flexDirection: 'row',
        gap: 8,
    },
    upcomingDate: {
        fontSize: 12,
        fontWeight: '500',
    },
    upcomingTime: {
        fontSize: 12,
        color: Colors.subtext,
    },
    upcomingStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    upcomingStatusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    upcomingViewAll: {
        marginTop: 12,
        alignItems: 'center',
    },
    upcomingViewAllText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
    },
    statsContainer: {
        paddingBottom: 8,
    },
    recentBookingsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 8,
    },
    recentBookingsTitle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllText: {
        color: Colors.primary,
        fontWeight: "600",
        fontSize: 16,
    },
    emptyCard: {
        alignItems: "center",
        padding: 32,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.subtext,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyActions: {
        flexDirection: responsiveConfig.isTablet ? 'row' : 'column',
        gap: 12,
        width: '100%',
        maxWidth: 300,
    },
    emptyButton: {
        flex: responsiveConfig.isTablet ? 1 : undefined,
        minWidth: responsiveConfig.isTablet ? undefined : 200,
    },
}); 