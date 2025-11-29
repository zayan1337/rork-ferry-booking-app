import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  AlertCircle,
  Activity,
  Settings,
  FileText,
  UserPlus,
  ArrowUp,
  ArrowDown,
  MapPin,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import Card from '@/components/Card';
import StatCard from '@/components/StatCard';
import AgentBookingCard from '@/components/AgentBookingCard';
import Button from '@/components/Button';
import { AgentInfoCard } from '@/components/agent';

import { useAgentData } from '@/hooks/useAgentData';
import { useRefreshControl } from '@/hooks/useRefreshControl';

import {
  formatCurrency,
  formatAgentDisplayName,
} from '@/utils/agentFormatters';
import {
  getDashboardStats,
  getDashboardBookings,
  calculatePerformanceMetrics,
  getUpcomingBookings,
  calculateCreditHealth,
  getResponsiveConfig,
  getBookingTrends,
  formatBookingStatus,
} from '@/utils/agentDashboard';

const { width: screenWidth } = Dimensions.get('window');
const responsiveConfig = getResponsiveConfig(screenWidth);

// Trend Indicator Component
const TrendIndicator = ({
  value,
  isPositive,
  showPercentage = true,
}: {
  value: number;
  isPositive?: boolean;
  showPercentage?: boolean;
}) => {
  const isUp = isPositive !== undefined ? isPositive : value > 0;
  const displayValue = showPercentage
    ? `${Math.abs(value).toFixed(1)}%`
    : Math.abs(value).toString();

  return (
    <View
      style={[
        styles.trendIndicator,
        { backgroundColor: isUp ? `${Colors.success}20` : `${Colors.error}20` },
      ]}
    >
      {isUp ? (
        <ArrowUp size={12} color={Colors.success} />
      ) : (
        <ArrowDown size={12} color={Colors.error} />
      )}
      <Text
        style={[
          styles.trendText,
          { color: isUp ? Colors.success : Colors.error },
        ]}
      >
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
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <Pressable style={styles.quickActionCard} onPress={onPress}>
    {icon}
    <Text style={styles.quickActionText}>{title}</Text>
  </Pressable>
);

// Credit Status Badge Component (reusable)
const CreditStatusBadge = ({
  type,
  label,
}: {
  type: 'critical' | 'low';
  label: string;
}) => {
  const color = type === 'critical' ? Colors.error : Colors.warning;
  return (
    <View style={[styles.creditBadge, { backgroundColor: `${color}20` }]}>
      <AlertCircle size={14} color={color} />
      <Text style={[styles.creditBadgeText, { color }]}>{label}</Text>
    </View>
  );
};

// Credit Metric Item Component (reusable)
const CreditMetricItem = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={styles.creditMetric}>
    <Text style={styles.creditLabel} numberOfLines={2}>
      {label}
    </Text>
    <Text style={[styles.creditValue, valueColor && { color: valueColor }]}>
      {value}
    </Text>
  </View>
);

// Enhanced Credit Overview Component
const CreditOverviewCard = ({
  agent,
  bookings,
}: {
  agent: any;
  bookings: any[];
}) => {
  if (!agent) return null;

  const creditHealth = calculateCreditHealth(agent, bookings);
  const formatUtilizationValue = (value: number) => {
    if (value <= 0) return '0.00%';
    if (value < 1) return `${value.toFixed(2)}%`;
    return `${value.toFixed(1)}%`;
  };
  const utilizationPercentage = Math.min(
    100,
    Math.max(0, creditHealth.utilizationPercentage)
  );
  const getCreditColor = () => {
    if (creditHealth.isCriticalCredit) return Colors.error;
    if (creditHealth.isLowCredit) return Colors.warning;
    return Colors.success;
  };

  return (
    <Card style={styles.creditOverviewCard}>
      <View style={styles.creditHeader}>
        <Text style={styles.creditTitle}>Credit Overview</Text>
        {creditHealth.isCriticalCredit && (
          <CreditStatusBadge type='critical' label='Critical' />
        )}
        {creditHealth.isLowCredit && !creditHealth.isCriticalCredit && (
          <CreditStatusBadge type='low' label='Low Credit' />
        )}
      </View>

      <View style={styles.creditMetrics}>
        <CreditMetricItem
          label='Available Credit'
          value={formatCurrency(agent.creditBalance)}
          valueColor={getCreditColor()}
        />
        <CreditMetricItem
          label='Credit Ceiling'
          value={formatCurrency(agent.creditCeiling)}
        />
        <CreditMetricItem
          label='Utilization'
          value={formatUtilizationValue(utilizationPercentage)}
        />
      </View>

      {/* Credit Usage Bar */}
      <View style={styles.creditBar}>
        <View
          style={[
            styles.creditBarFill,
            {
              width: `${utilizationPercentage}%`,
              backgroundColor: getCreditColor(),
            },
          ]}
        />
      </View>

      {creditHealth.daysToDeplete > 0 && creditHealth.daysToDeplete < 30 && (
        <View style={styles.creditWarning}>
          <Text style={styles.creditWarningText}>
            ⚠️ Credit may deplete in ~{creditHealth.daysToDeplete} days at
            current usage
          </Text>
        </View>
      )}
    </Card>
  );
};

// Performance Metric Item Component (reusable)
const PerformanceMetricItem = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={styles.performanceMetric}>
    <Text style={styles.performanceLabel} numberOfLines={2}>
      {label}
    </Text>
    <Text
      style={[styles.performanceValue, valueColor && { color: valueColor }]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

// Trend Item Component (reusable)
const TrendItem = ({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change: number;
}) => (
  <View style={styles.trendItem}>
    <Text style={styles.trendLabel}>{label}</Text>
    <View style={styles.trendValueContainer}>
      <Text style={styles.trendValue}>{value} bookings</Text>
      {change !== 0 && <TrendIndicator value={change} />}
    </View>
  </View>
);

// Enhanced Performance Insights Component
const PerformanceInsightsCard = ({
  stats,
  bookings,
  clients,
  metrics,
}: {
  stats: any;
  bookings: any[];
  clients: any[];
  metrics: any | null;
}) => {
  const trends = getBookingTrends(bookings);

  if (!metrics) {
    return (
      <Card style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <TrendingUp size={20} color={Colors.primary} />
          <Text style={styles.performanceTitle}>Performance Insights</Text>
        </View>
        <ActivityIndicator
          size='small'
          color={Colors.primary}
          style={{ padding: 20 }}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.performanceCard}>
      <View style={styles.performanceHeader}>
        <TrendingUp size={20} color={Colors.primary} />
        <Text style={styles.performanceTitle}>Performance Insights</Text>
      </View>

      <View style={styles.performanceMetrics}>
        <PerformanceMetricItem
          label='Completion Rate'
          value={`${metrics.completionRate.toFixed(1)}%`}
          valueColor={Colors.success}
        />
        <PerformanceMetricItem
          label='Client Retention'
          value={`${metrics.clientRetentionRate.toFixed(1)}%`}
          valueColor={Colors.secondary}
        />
        <PerformanceMetricItem
          label='Avg Revenue/Booking'
          value={formatCurrency(metrics.averageRevenuePerBooking)}
        />
      </View>

      {/* Trends Section */}
      <View style={styles.trendsSection}>
        <TrendItem
          label='This Week'
          value={trends.thisWeek}
          change={trends.weeklyChange}
        />
        <TrendItem
          label='This Month'
          value={trends.thisMonth}
          change={trends.monthlyChange}
        />
      </View>
    </Card>
  );
};

// Upcoming Departures Component
const UpcomingDeparturesCard = ({
  bookings,
  router,
}: {
  bookings: any[];
  router: any;
}) => {
  const upcomingBookings = getUpcomingBookings(bookings);

  if (upcomingBookings.length === 0) return null;

  return (
    <Card style={styles.upcomingCard}>
      <View style={styles.upcomingHeader}>
        <Calendar size={20} color={Colors.primary} />
        <Text style={styles.upcomingTitle}>Upcoming Departures</Text>
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingBadgeText}>
            {upcomingBookings.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.upcomingList} nestedScrollEnabled>
        {upcomingBookings.slice(0, 3).map(booking => {
          const statusInfo = formatBookingStatus(booking.status);
          const departureDate = new Date(booking.departureDate);
          const isToday =
            departureDate.toDateString() === new Date().toDateString();
          const isTomorrow =
            departureDate.toDateString() ===
            new Date(Date.now() + 86400000).toDateString();

          const dateLabel = isToday
            ? 'Today'
            : isTomorrow
              ? 'Tomorrow'
              : departureDate.toLocaleDateString();

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
                  <Text
                    style={[
                      styles.upcomingDate,
                      { color: isToday ? Colors.warning : Colors.subtext },
                    ]}
                  >
                    {dateLabel}
                  </Text>
                  {booking.departureTime && (
                    <Text style={styles.upcomingTime}>
                      {booking.departureTime}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.upcomingStatus,
                  { backgroundColor: `${statusInfo.color}20` },
                ]}
              >
                <Text
                  style={[
                    styles.upcomingStatusText,
                    { color: statusInfo.color },
                  ]}
                >
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {upcomingBookings.length > 3 && (
        <Pressable
          style={styles.upcomingViewAll}
          onPress={() =>
            router.push({
              pathname: './bookings',
              params: { sortBy: 'upcoming', filter: 'upcoming' },
            })
          }
        >
          <Text style={styles.upcomingViewAllText}>
            View all {upcomingBookings.length} upcoming departures
          </Text>
        </Pressable>
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
    refreshAgentData,
  } = useAgentData();

  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: refreshAgentData,
  });

  const [displayStats, setDisplayStats] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  // Calculate display stats asynchronously (includes partial refunds)
  useEffect(() => {
    const calculateStats = async () => {
      const calculatedStats = await getDashboardStats(
        stats,
        localStats,
        bookings
      );
      setDisplayStats(calculatedStats);
    };
    calculateStats();
  }, [stats, localStats, bookings]);

  // Calculate performance metrics asynchronously
  useEffect(() => {
    const calculateMetrics = async () => {
      const metrics = await calculatePerformanceMetrics(bookings, clients);
      setPerformanceMetrics(metrics);
    };
    calculateMetrics();
  }, [bookings, clients]);

  const recentBookings = getDashboardBookings(bookings);
  const agentFirstName = formatAgentDisplayName(agent);

  const handleBookingPress = (bookingId: string) => {
    if (bookingId) {
      router.push(`../agent-booking/${bookingId}` as any);
    }
  };

  const handleNewBooking = () => {
    // Navigate to booking page immediately
    router.push('../agent-booking/new' as any);
  };

  const handleViewAllBookings = () => {
    router.push('./bookings');
  };

  const handleViewClients = () => {
    router.push('../client/add');
  };

  const handleViewCredit = () => {
    router.push('./credit');
  };

  const handleViewProfile = () => {
    router.push('./profile');
  };

  // Stable function for booking press
  const handleBookingCardPress = React.useCallback((booking: any) => {
    handleBookingPress(booking.id);
  }, []);

  // Quick actions configuration
  const quickActions = [
    {
      title: 'New Booking',
      icon: <Plus size={24} color={Colors.primary} />,
      onPress: handleNewBooking,
    },
    {
      title: 'Add Client',
      icon: <UserPlus size={24} color={Colors.primary} />,
      onPress: handleViewClients,
    },
    {
      title: 'View Reports',
      icon: <FileText size={24} color={Colors.primary} />,
      onPress: handleViewAllBookings,
    },
    {
      title: 'Settings',
      icon: <Settings size={24} color={Colors.primary} />,
      onPress: handleViewProfile,
    },
  ];

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title='Retry' onPress={retryInitialization} variant='primary' />
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
          <Text
            style={[
              styles.greeting,
              { fontSize: responsiveConfig.fontSize.heading },
            ]}
          >
            Hello, {agentFirstName}
          </Text>
          <Text
            style={[
              styles.subGreeting,
              // { fontSize: responsiveConfig.fontSize.body },
            ]}
          >
            Welcome to your agent dashboard
          </Text>
          <View style={styles.headerBadge}>
            <Activity size={14} color={Colors.primary} />
            <Text style={styles.headerBadgeText}>Agent Portal</Text>
          </View>
        </View>
      </View>

      {/* Agent Information Card - Quick Stats */}
      <View style={styles.agentInfoCard}>
        {isInitializing || !agent ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={Colors.primary} />
          </View>
        ) : (
          <AgentInfoCard agent={agent} variant='dashboard' />
        )}
      </View>

      {/* Credit Overview - Detailed Credit Information */}
      {!isInitializing && agent && (
        <CreditOverviewCard agent={agent} bookings={bookings || []} />
      )}

      {/* Quick Actions */}
      {/* <Text
        style={[
          styles.sectionTitle,
          { fontSize: responsiveConfig.fontSize.title },
        ]}
      >
        Quick Actions
      </Text>
      <View
        style={[
          styles.quickActionsContainer,
          { gap: responsiveConfig.cardSpacing },
        ]}
      >
        {quickActions.map((action, index) => (
          <QuickActionCard
            key={index}
            title={action.title}
            icon={action.icon}
            onPress={action.onPress}
          />
        ))}
      </View> */}

      {/* Performance Overview Section */}
      <Text
        style={[
          styles.sectionTitle,
          { fontSize: responsiveConfig.fontSize.title },
        ]}
      >
        Performance Overview
      </Text>
      {isLoadingStats || isInitializing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={Colors.primary} />
        </View>
      ) : displayStats ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            {[
              {
                title: 'Total Bookings',
                value: displayStats.totalBookings,
                icon: <TicketIcon size={16} color={Colors.primary} />,
              },
              {
                title: 'Active Bookings',
                value: displayStats.activeBookings,
                icon: <Calendar size={16} color={Colors.primary} />,
              },
              {
                title: 'Completed',
                value: displayStats.completedBookings,
                icon: <CheckCircle size={16} color={Colors.success} />,
                color: Colors.success,
              },
              {
                title: 'Cancelled',
                value: displayStats.cancelledBookings,
                icon: <XCircle size={16} color={Colors.error} />,
                color: Colors.error,
              },
              {
                title: 'Total Revenue',
                value: formatCurrency(displayStats.totalRevenue),
                icon: <DollarSign size={16} color={Colors.primary} />,
              },
              {
                title: 'Commission',
                value: formatCurrency(displayStats.totalCommission),
                icon: <CreditCard size={16} color={Colors.secondary} />,
                color: Colors.secondary,
              },
              {
                title: 'Unique Clients',
                value: displayStats.uniqueClients,
                icon: <Users size={16} color={Colors.primary} />,
              },
            ].map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </ScrollView>

          {/* Performance Insights */}
          <PerformanceInsightsCard
            stats={displayStats}
            bookings={bookings || []}
            clients={clients || []}
            metrics={performanceMetrics}
          />
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={Colors.primary} />
        </View>
      )}

      {/* Upcoming Departures */}
      {!isLoadingBookings && !isInitializing && bookings && (
        <UpcomingDeparturesCard bookings={bookings} router={router} />
      )}

      {/* Recent Activity Section */}
      <View style={styles.recentBookingsHeader}>
        <View style={styles.recentBookingsTitle}>
          {/* <Clock size={18} color={Colors.primary} /> */}
          <Text
            style={[
              styles.sectionTitle,
              { fontSize: responsiveConfig.fontSize.title },
            ]}
          >
            Recent Activity
          </Text>
        </View>
        <Pressable onPress={handleViewAllBookings}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      {isLoadingBookings || isInitializing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={Colors.primary} />
        </View>
      ) : recentBookings.length > 0 ? (
        recentBookings.map((booking: any) =>
          booking && booking.id ? (
            <AgentBookingCard
              key={booking.id}
              booking={booking}
              onPress={handleBookingCardPress}
            />
          ) : null
        )
      ) : (
        <Card variant='outlined' style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <TicketIcon size={48} color={Colors.inactive} />
          </View>
          <Text style={styles.emptyTitle}>No Recent Activity</Text>
          <Text style={styles.emptyText}>
            Start by creating your first booking or adding a new client
          </Text>
          <View style={styles.emptyActions}>
            <Button
              title='Create Booking'
              onPress={handleNewBooking}
              variant='primary'
              style={styles.emptyButton}
            />
            <Button
              title='Add Client'
              onPress={handleViewClients}
              variant='outline'
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
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
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
  agentInfoCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 24,
  },
  // quickActionsContainer: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   justifyContent: 'space-between',
  //   marginBottom: 32,
  //   gap: 12,
  // },
  quickActionCard: {
    width: responsiveConfig.isTablet
      ? (screenWidth - 64) / 4
      : (screenWidth - 56) / 2,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  creditOverviewCard: {
    marginBottom: 32,
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
    backgroundColor: `${Colors.warning}10`,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  creditWarningText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
  },
  performanceCard: {
    marginTop: 24,
    marginBottom: 32,
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
    gap: 8,
  },
  performanceMetric: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
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
    marginBottom: 32,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  recentBookingsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  emptyCard: {
    alignItems: 'center',
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
