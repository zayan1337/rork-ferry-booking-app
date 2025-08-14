import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Trip, Route, Vessel } from '@/types/operations';
import { formatCurrency } from '@/utils/currencyUtils';
import StatCard from '@/components/admin/StatCard';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  MapPin,
  Ship,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react-native';

interface TripAnalyticsProps {
  trip: Trip;
  route?: Route;
  vessel?: Vessel;
  historicalData?: {
    similarTrips: Trip[];
    averageOccupancy: number;
    averageRevenue: number;
    onTimePerformance: number;
    customerSatisfaction: number;
    cancellationRate: number;
  };
}

const { width: screenWidth } = Dimensions.get('window');

export default function TripAnalytics({
  trip,
  route,
  vessel,
  historicalData,
}: TripAnalyticsProps) {
  const [selectedMetric, setSelectedMetric] = useState<
    'revenue' | 'occupancy' | 'performance'
  >('revenue');

  // Calculate trip-specific metrics
  const totalCapacity = (trip.available_seats || 0) + (trip.booked_seats || 0);
  const occupancyRate =
    totalCapacity > 0 ? (trip.booked_seats / totalCapacity) * 100 : 0;
  const revenue = route
    ? (trip.booked_seats || 0) * route.base_fare * (trip.fare_multiplier || 1)
    : 0;
  const revenuePerSeat = totalCapacity > 0 ? revenue / totalCapacity : 0;

  // Performance indicators
  const isOnTime = trip.status !== 'delayed';
  const isFullyBooked = occupancyRate >= 100;
  const isHighDemand = occupancyRate >= 80;
  const isProfitable = revenue > (route?.base_fare || 0) * totalCapacity * 0.6; // 60% break-even

  // Comparison with historical averages
  const occupancyComparison = historicalData
    ? occupancyRate - historicalData.averageOccupancy
    : 0;
  const revenueComparison = historicalData
    ? revenue - historicalData.averageRevenue
    : 0;

  const performanceStats = [
    {
      title: 'Revenue',
      value: formatCurrency(revenue, 'MVR'),
      subtitle: historicalData
        ? `${revenueComparison >= 0 ? '+' : ''}${formatCurrency(revenueComparison, 'MVR')} vs avg`
        : 'vs average',
      icon: <DollarSign size={24} color={colors.primary} />,
      trend:
        revenueComparison > 0
          ? 'up'
          : revenueComparison < 0
            ? 'down'
            : 'neutral',
      color: colors.success,
    },
    {
      title: 'Occupancy',
      value: `${occupancyRate.toFixed(1)}%`,
      subtitle: historicalData
        ? `${occupancyComparison >= 0 ? '+' : ''}${occupancyComparison.toFixed(1)}% vs avg`
        : `${trip.booked_seats}/${totalCapacity} seats`,
      icon: <Users size={24} color={colors.primary} />,
      trend:
        occupancyComparison > 0
          ? 'up'
          : occupancyComparison < 0
            ? 'down'
            : 'neutral',
      color: isHighDemand
        ? colors.success
        : occupancyRate > 50
          ? colors.warning
          : colors.error,
    },
    {
      title: 'Revenue/Seat',
      value: formatCurrency(revenuePerSeat, 'MVR'),
      subtitle: 'Per seat revenue',
      icon: <Target size={24} color={colors.primary} />,
      trend: 'neutral',
      color: colors.primary,
    },
    {
      title: 'Performance',
      value: isOnTime ? 'On Time' : 'Delayed',
      subtitle: historicalData
        ? `${historicalData.onTimePerformance.toFixed(1)}% historical avg`
        : 'Status',
      icon: isOnTime ? (
        <CheckCircle size={24} color={colors.success} />
      ) : (
        <AlertTriangle size={24} color={colors.warning} />
      ),
      trend: 'neutral',
      color: isOnTime ? colors.success : colors.warning,
    },
  ];

  const insightCards = [
    {
      title: 'Demand Level',
      value: isFullyBooked
        ? 'Sold Out'
        : isHighDemand
          ? 'High Demand'
          : occupancyRate > 50
            ? 'Moderate'
            : 'Low',
      description: isFullyBooked
        ? 'Trip is fully booked. Consider adding more capacity.'
        : isHighDemand
          ? 'High demand detected. Monitor for potential additional trips.'
          : occupancyRate > 50
            ? 'Moderate booking levels. Normal operations.'
            : 'Low bookings. Consider marketing or schedule adjustments.',
      icon: isFullyBooked ? (
        <Zap size={20} color={colors.warning} />
      ) : isHighDemand ? (
        <TrendingUp size={20} color={colors.success} />
      ) : (
        <Activity size={20} color={colors.primary} />
      ),
      color: isFullyBooked
        ? colors.warning
        : isHighDemand
          ? colors.success
          : colors.primary,
    },
    {
      title: 'Revenue Status',
      value: isProfitable ? 'Profitable' : 'Below Target',
      description: isProfitable
        ? 'Trip is generating good revenue above break-even point.'
        : 'Revenue below optimal levels. Consider pricing adjustments.',
      icon: isProfitable ? (
        <ThumbsUp size={20} color={colors.success} />
      ) : (
        <ThumbsDown size={20} color={colors.error} />
      ),
      color: isProfitable ? colors.success : colors.error,
    },
    {
      title: 'Route Performance',
      value:
        route?.origin && route?.destination
          ? `${route.origin} ↔ ${route.destination}`
          : 'Route Analysis',
      description: historicalData
        ? `Average occupancy: ${historicalData.averageOccupancy.toFixed(1)}% | Satisfaction: ${(historicalData.customerSatisfaction * 100).toFixed(1)}%`
        : 'Historical performance data not available.',
      icon: <MapPin size={20} color={colors.primary} />,
      color: colors.primary,
    },
    {
      title: 'Vessel Efficiency',
      value: vessel?.name || 'Unknown Vessel',
      description: `Capacity: ${totalCapacity} passengers | Type: ${vessel?.vessel_type || 'Unknown'}`,
      icon: <Ship size={20} color={colors.primary} />,
      color: colors.primary,
    },
  ];

  const renderMetricChart = () => {
    const chartData = historicalData?.similarTrips || [];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {selectedMetric === 'revenue'
            ? 'Revenue Trend'
            : selectedMetric === 'occupancy'
              ? 'Occupancy Trend'
              : 'Performance Trend'}
        </Text>

        {chartData.length > 0 ? (
          <View style={styles.chartPlaceholder}>
            <BarChart3 size={48} color={colors.textSecondary} />
            <Text style={styles.chartPlaceholderText}>
              Chart visualization would show {selectedMetric} trends
            </Text>
          </View>
        ) : (
          <View style={styles.chartPlaceholder}>
            <PieChart size={48} color={colors.textSecondary} />
            <Text style={styles.chartPlaceholderText}>
              Insufficient historical data for visualization
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Performance Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          {performanceStats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              trend={stat.trend as 'up' | 'down' | 'neutral'}
            />
          ))}
        </View>
      </View>

      {/* Insights & Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insights & Recommendations</Text>
        <View style={styles.insightsGrid}>
          {insightCards.map((insight, index) => (
            <View
              key={index}
              style={[styles.insightCard, { borderLeftColor: insight.color }]}
            >
              <View style={styles.insightHeader}>
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: insight.color + '20' },
                  ]}
                >
                  {insight.icon}
                </View>
                <Text style={styles.insightTitle}>{insight.title}</Text>
              </View>
              <Text style={styles.insightValue}>{insight.value}</Text>
              <Text style={styles.insightDescription}>
                {insight.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Historical Comparison */}
      {historicalData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historical Comparison</Text>
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Average Occupancy</Text>
              <Text style={styles.comparisonValue}>
                {historicalData.averageOccupancy.toFixed(1)}%
              </Text>
              <Text
                style={[
                  styles.comparisonDiff,
                  {
                    color:
                      occupancyComparison >= 0 ? colors.success : colors.error,
                  },
                ]}
              >
                {occupancyComparison >= 0 ? '+' : ''}
                {occupancyComparison.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Average Revenue</Text>
              <Text style={styles.comparisonValue}>
                {formatCurrency(historicalData.averageRevenue, 'MVR')}
              </Text>
              <Text
                style={[
                  styles.comparisonDiff,
                  {
                    color:
                      revenueComparison >= 0 ? colors.success : colors.error,
                  },
                ]}
              >
                {revenueComparison >= 0 ? '+' : ''}
                {formatCurrency(revenueComparison, 'MVR')}
              </Text>
            </View>

            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>On-Time Rate</Text>
              <Text style={styles.comparisonValue}>
                {historicalData.onTimePerformance.toFixed(1)}%
              </Text>
              <Text style={styles.comparisonSubtext}>Historical average</Text>
            </View>
          </View>
        </View>
      )}

      {/* Metric Selector and Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trend Analysis</Text>

        <View style={styles.metricSelector}>
          {(['revenue', 'occupancy', 'performance'] as const).map(metric => (
            <TouchableOpacity
              key={metric}
              style={[
                styles.metricButton,
                selectedMetric === metric && styles.metricButtonActive,
              ]}
              onPress={() => setSelectedMetric(metric)}
            >
              <Text
                style={[
                  styles.metricButtonText,
                  selectedMetric === metric && styles.metricButtonTextActive,
                ]}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderMetricChart()}
      </View>

      {/* Key Metrics Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics Summary</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Capacity Utilization</Text>
            <Text style={styles.summaryValue}>{occupancyRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Revenue per Available Seat</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(revenuePerSeat, 'MVR')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fare Multiplier Applied</Text>
            <Text style={styles.summaryValue}>
              {trip.fare_multiplier || 1}x
            </Text>
          </View>
          {historicalData && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Customer Satisfaction</Text>
                <Text style={styles.summaryValue}>
                  {(historicalData.customerSatisfaction * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cancellation Rate</Text>
                <Text style={styles.summaryValue}>
                  {(historicalData.cancellationRate * 100).toFixed(1)}%
                </Text>
              </View>
            </>
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
  insightsGrid: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  comparisonItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  comparisonDiff: {
    fontSize: 14,
    fontWeight: '500',
  },
  comparisonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metricSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  metricButtonActive: {
    backgroundColor: colors.primary,
  },
  metricButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricButtonTextActive: {
    color: colors.white,
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  chartPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    gap: 8,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
