import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { RouteStats as RouteStatsType } from '@/types/operations';
import { formatCurrency } from '@/utils/currencyUtils';
import StatCard from '@/components/admin/StatCard';
import {
    MapPin,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Calendar,
    Clock,
    Activity,
    Target,
    BarChart3,
    Percent,
    Route,
} from 'lucide-react-native';

interface RouteStatsProps {
    stats: RouteStatsType;
    isTablet?: boolean;
    onViewDetails?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function RouteStats({
    stats,
    isTablet = false,
    onViewDetails,
}: RouteStatsProps) {
    const screenIsTablet = isTablet || screenWidth >= 768;

    const getTrendIcon = (trend: number) => {
        if (trend > 0) return <TrendingUp size={16} color={colors.success} />;
        if (trend < 0) return <TrendingDown size={16} color={colors.danger} />;
        return <Activity size={16} color={colors.textSecondary} />;
    };

    const getTrendColor = (trend: number) => {
        if (trend > 0) return colors.success;
        if (trend < 0) return colors.danger;
        return colors.textSecondary;
    };

    const formatTrend = (trend: number) => {
        if (trend === 0) return '0%';
        return `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`;
    };

    const getPerformanceColor = (rating: number) => {
        if (rating >= 4) return colors.success;
        if (rating >= 3) return colors.warning;
        return colors.danger;
    };

    const mainStats = [
        {
            title: 'Total Routes',
            value: stats.total_routes.toString(),
            subtitle: 'All routes',
            icon: <MapPin size={20} color={colors.primary} />,
            trend: 'neutral' as const,
            trendIcon: getTrendIcon(0),
        },
        {
            title: 'Active Routes',
            value: stats.active_routes.toString(),
            subtitle: 'Currently operational',
            icon: <Activity size={20} color={colors.success} />,
            trend: 'neutral' as const,
            trendIcon: getTrendIcon(0),
        },
        {
            title: 'Average Fare',
            value: formatCurrency(stats.average_fare),
            subtitle: 'System-wide',
            icon: <DollarSign size={20} color={colors.success} />,
            trend: 'neutral' as const,
            trendIcon: getTrendIcon(0),
        },
        {
            title: 'Total Distance',
            value: `${stats.total_distance} km`,
            subtitle: 'Network coverage',
            icon: <Route size={20} color={colors.primary} />,
            trend: 'neutral' as const,
            trendIcon: getTrendIcon(0),
        },
    ];

    const detailStats = [
        {
            title: 'Active Routes',
            value: stats.active_routes.toString(),
            subtitle: 'Currently operational',
            icon: <Activity size={18} color={colors.success} />,
        },
        {
            title: 'Inactive Routes',
            value: stats.inactive_routes.toString(),
            subtitle: 'Temporarily suspended',
            icon: <Activity size={18} color={colors.warning} />,
        },
        {
            title: 'Maintenance Routes',
            value: stats.maintenance_routes.toString(),
            subtitle: 'Under maintenance',
            icon: <Activity size={18} color={colors.danger} />,
        },
        {
            title: 'Average Fare',
            value: formatCurrency(stats.average_fare),
            subtitle: 'System-wide',
            icon: <DollarSign size={18} color={colors.success} />,
        },
        {
            title: 'Total Distance',
            value: `${stats.total_distance} km`,
            subtitle: 'Network coverage',
            icon: <Route size={18} color={colors.primary} />,
        },
        {
            title: 'Most Popular Route',
            value: stats.most_popular_route?.name || 'N/A',
            subtitle: 'Top performing',
            icon: <TrendingUp size={18} color={colors.success} />,
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Route Statistics</Text>
                    <Text style={styles.subtitle}>
                        Performance overview and analytics
                    </Text>
                </View>
                {onViewDetails && (
                    <TouchableOpacity style={styles.viewDetailsButton} onPress={onViewDetails}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <BarChart3 size={16} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Main Stats */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Metrics</Text>
                <View style={[styles.statsGrid, screenIsTablet && styles.statsGridTablet]}>
                    {mainStats.map((stat, index) => (
                        <View key={index} style={[styles.statCard, screenIsTablet && styles.statCardTablet]}>
                            <View style={styles.statHeader}>
                                <View style={styles.statIcon}>
                                    {stat.icon}
                                </View>
                                <View style={styles.statTrend}>
                                    {stat.trendIcon}
                                    <Text style={[styles.trendText, { color: getTrendColor(parseFloat(stat.trend)) }]}>
                                        {stat.trend}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statTitle}>{stat.title}</Text>
                            <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Detailed Stats */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                <View style={styles.detailGrid}>
                    {detailStats.map((stat, index) => (
                        <View key={index} style={styles.detailCard}>
                            <View style={styles.detailIcon}>
                                {stat.icon}
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailValue}>{stat.value}</Text>
                                <Text style={styles.detailTitle}>{stat.title}</Text>
                                <Text style={styles.detailSubtitle}>{stat.subtitle}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Performance Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Summary</Text>
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <View style={styles.summaryIcon}>
                            <Activity size={20} color={colors.success} />
                        </View>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryValue}>
                                {stats.active_routes}
                            </Text>
                            <Text style={styles.summaryLabel}>Active Routes</Text>
                            <Text style={styles.summaryDescription}>
                                {stats.active_routes >= (stats.total_routes * 0.8)
                                    ? 'Excellent availability'
                                    : stats.active_routes >= (stats.total_routes * 0.6)
                                        ? 'Good availability'
                                        : 'Room for improvement'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryItem}>
                        <View style={styles.summaryIcon}>
                            <DollarSign size={20} color={colors.success} />
                        </View>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryValue}>
                                {formatCurrency(stats.average_fare)}
                            </Text>
                            <Text style={styles.summaryLabel}>Average Fare</Text>
                            <Text style={styles.summaryDescription}>
                                System-wide average
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryItem}>
                        <View style={styles.summaryIcon}>
                            <Route size={20} color={colors.primary} />
                        </View>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryValue}>
                                {stats.total_distance} km
                            </Text>
                            <Text style={styles.summaryLabel}>Total Distance</Text>
                            <Text style={styles.summaryDescription}>
                                Network coverage
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Insights */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Insights</Text>
                <View style={styles.insightsContainer}>
                    {stats.highDemandRoutes > 0 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightIcon, { backgroundColor: colors.success + '10' }]}>
                                <TrendingUp size={16} color={colors.success} />
                            </View>
                            <Text style={styles.insightText}>
                                {stats.highDemandRoutes} route{stats.highDemandRoutes > 1 ? 's' : ''} showing high demand
                            </Text>
                        </View>
                    )}

                    {stats.lowDemandRoutes > 0 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightIcon, { backgroundColor: colors.warning + '10' }]}>
                                <TrendingDown size={16} color={colors.warning} />
                            </View>
                            <Text style={styles.insightText}>
                                {stats.lowDemandRoutes} route{stats.lowDemandRoutes > 1 ? 's' : ''} need attention
                            </Text>
                        </View>
                    )}

                    {stats.revenueGrowthRate > 0 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightIcon, { backgroundColor: colors.success + '10' }]}>
                                <DollarSign size={16} color={colors.success} />
                            </View>
                            <Text style={styles.insightText}>
                                Revenue growing at {stats.revenueGrowthRate.toFixed(1)}% monthly
                            </Text>
                        </View>
                    )}
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.primary + '10',
        borderRadius: 8,
    },
    viewDetailsText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.primary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statsGridTablet: {
        gap: 16,
    },
    statCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        width: '48%',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statCardTablet: {
        width: '23%',
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    statSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailCard: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailContent: {
        flex: 1,
    },
    detailValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    detailTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 1,
    },
    detailSubtitle: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    summaryContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryContent: {
        flex: 1,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    summaryDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    insightsContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        gap: 12,
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    insightIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
}); 