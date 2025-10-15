import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Ship,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  Navigation,
  UserCheck,
  MapPin,
  Anchor,
} from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';

import { useCaptainStore } from '@/store/captainStore';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import StatCard from '@/components/StatCard';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatSimpleDate } from '@/utils/dateUtils';
import { formatTripTime } from '@/utils/tripUtils';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function CaptainDashboardScreen() {
  const { user } = useAuthStore();
  const {
    dashboardStats,
    trips,
    loading,
    error,
    fetchDashboardStats,
    fetchTodayTrips,
    refreshDashboard,
    clearError,
  } = useCaptainStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Auto-refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [refreshDashboard])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    setIsRefreshing(false);
  };

  // Get captain name
  const getCaptainName = () => {
    if (user?.profile?.full_name) {
      return user.profile.full_name;
    }
    return user?.email?.split('@')[0] || 'Captain';
  };

  // Get today's trips summary
  const getTodayTripsSummary = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const upcoming = trips.filter(trip => {
      const [hours, minutes] = trip.departure_time.split(':').map(Number);
      const tripTime = hours * 60 + minutes;
      return tripTime > currentTime && trip.status === 'scheduled';
    });

    const boarding = trips.filter(trip => trip.status === 'boarding');
    const departed = trips.filter(trip =>
      ['departed', 'arrived'].includes(trip.status)
    );
    const completed = trips.filter(trip => trip.status === 'completed');

    return { upcoming, boarding, departed, completed };
  };

  const tripsSummary = getTodayTripsSummary();
  const nextTrip = tripsSummary.upcoming[0];

  const renderWelcomeHeader = () => (
    <Card variant='elevated' style={styles.welcomeCard}>
      <View style={styles.welcomeHeader}>
        <View style={styles.captainAvatar}>
          <Anchor size={24} color='white' />
        </View>
        <View style={styles.welcomeInfo}>
          <Text style={styles.welcomeGreeting}>Good {getTimeOfDay()}</Text>
          <Text style={styles.captainName}>Captain {getCaptainName()}</Text>
          <Text style={styles.welcomeDate}>
            {formatSimpleDate(new Date().toISOString())}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>On Duty</Text>
        </View>
      </View>
    </Card>
  );

  const renderDashboardStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Today's Overview</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
      >
        <StatCard
          title='Total Trips'
          value={dashboardStats?.todayTrips.toString() || '0'}
          icon={<Ship size={20} color={Colors.primary} />}
          color={Colors.primary}
        />
        <StatCard
          title='Passengers'
          value={dashboardStats?.totalPassengers.toString() || '0'}
          icon={<Users size={20} color={Colors.primary} />}
          color={Colors.primary}
        />
        <StatCard
          title='Checked In'
          value={dashboardStats?.checkedInPassengers.toString() || '0'}
          icon={<CheckCircle size={20} color={Colors.success} />}
          color={Colors.success}
        />
        <StatCard
          title='On Time'
          value={`${dashboardStats?.onTimePercentage || 100}%`}
          icon={<Clock size={20} color={Colors.warning} />}
          color={Colors.warning}
        />
        <StatCard
          title='Revenue'
          value={formatCurrency(dashboardStats?.totalRevenue || 0, 'MVR')}
          icon={<DollarSign size={20} color={Colors.success} />}
          color={Colors.success}
        />
        <StatCard
          title='Occupancy'
          value={`${Math.round(dashboardStats?.averageOccupancy || 0)}%`}
          icon={<TrendingUp size={20} color={Colors.primary} />}
          color={Colors.primary}
        />
      </ScrollView>
    </View>
  );

  const renderNextTrip = () => {
    if (!nextTrip) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Trip</Text>
        <Card variant='elevated' style={styles.nextTripCard}>
          <View style={styles.nextTripHeader}>
            <View style={styles.routeInfo}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.routeName}>
                {nextTrip.from_island_name} → {nextTrip.to_island_name}
              </Text>
            </View>
            <View style={styles.timeInfo}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.departureTime}>
                {formatTripTime(nextTrip.departure_time)}
              </Text>
            </View>
          </View>

          <View style={styles.nextTripDetails}>
            <View style={styles.tripDetail}>
              <Ship size={16} color={Colors.textSecondary} />
              <Text style={styles.tripDetailText}>{nextTrip.vessel_name}</Text>
            </View>
            <View style={styles.tripDetail}>
              <Users size={16} color={Colors.textSecondary} />
              <Text style={styles.tripDetailText}>
                {nextTrip.booked_seats}/{nextTrip.capacity} passengers
              </Text>
            </View>
          </View>

          <View style={styles.nextTripActions}>
            <Pressable
              style={styles.prepareButton}
              onPress={() =>
                router.push(`/(captain)/trip-details/${nextTrip.id}` as any)
              }
            >
              <Navigation size={16} color='white' />
              <Text style={styles.prepareButtonText}>View Trip Details</Text>
            </Pressable>
          </View>
        </Card>
      </View>
    );
  };

  const renderTripsSummary = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trip Status Summary</Text>
        <Pressable
          onPress={() => router.push('/(captain)/(tabs)/trips' as any)}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>
      <View style={styles.tripsSummaryGrid}>
        <Pressable
          style={[styles.summaryCard, styles.upcomingCard]}
          onPress={() => router.push('/(captain)/(tabs)/trips' as any)}
        >
          <View style={styles.summaryIconContainer}>
            <Calendar size={20} color={Colors.primary} />
          </View>
          <Text style={styles.summaryCount}>
            {tripsSummary.upcoming.length}
          </Text>
          <Text style={styles.summaryLabel}>Upcoming</Text>
        </Pressable>

        <Pressable
          style={[styles.summaryCard, styles.boardingCard]}
          onPress={() => {
            if (tripsSummary.boarding.length > 0) {
              router.push(
                `/(captain)/trip-details/${tripsSummary.boarding[0].id}` as any
              );
            } else {
              router.push('/(captain)/(tabs)/trips' as any);
            }
          }}
        >
          <View style={styles.summaryIconContainer}>
            <UserCheck size={20} color={Colors.warning} />
          </View>
          <Text style={styles.summaryCount}>
            {tripsSummary.boarding.length}
          </Text>
          <Text style={styles.summaryLabel}>Boarding</Text>
        </Pressable>

        <Pressable
          style={[styles.summaryCard, styles.departedCard]}
          onPress={() => router.push('/(captain)/(tabs)/trips' as any)}
        >
          <View style={styles.summaryIconContainer}>
            <Ship size={20} color={Colors.primary} />
          </View>
          <Text style={styles.summaryCount}>
            {tripsSummary.departed.length}
          </Text>
          <Text style={styles.summaryLabel}>En Route</Text>
        </Pressable>

        <Pressable
          style={[styles.summaryCard, styles.completedCard]}
          onPress={() => router.push('/(captain)/(tabs)/trips' as any)}
        >
          <View style={styles.summaryIconContainer}>
            <CheckCircle size={20} color={Colors.success} />
          </View>
          <Text style={styles.summaryCount}>
            {tripsSummary.completed.length}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(captain)/(tabs)/checkin' as any)}
        >
          <View style={styles.actionIconContainer}>
            <UserCheck size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Passenger Check-in</Text>
          <Text style={styles.actionSubtext}>Scan QR codes</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(captain)/(tabs)/trips' as any)}
        >
          <View style={styles.actionIconContainer}>
            <Ship size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>My Trips</Text>
          <Text style={styles.actionSubtext}>View assigned trips</Text>
        </Pressable>

        {nextTrip && (
          <Pressable
            style={[styles.actionButton, styles.nextTripAction]}
            onPress={() =>
              router.push(`/(captain)/trip-details/${nextTrip.id}` as any)
            }
          >
            <View style={styles.actionIconContainer}>
              <Navigation size={24} color={Colors.warning} />
            </View>
            <Text style={styles.actionText}>Next Trip</Text>
            <Text style={styles.actionSubtext}>
              {formatTripTime(nextTrip.departure_time)}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(captain)/(tabs)/profile' as any)}
        >
          <View style={styles.actionIconContainer}>
            <Anchor size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Settings</Text>
          <Text style={styles.actionSubtext}>Profile & preferences</Text>
        </Pressable>
      </View>
    </View>
  );

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {renderWelcomeHeader()}
      {renderDashboardStats()}
      {renderNextTrip()}
      {renderTripsSummary()}
      {renderQuickActions()}
    </ScrollView>
  );
}

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}10`,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  welcomeCard: {
    marginBottom: 24,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captainAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  captainName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  welcomeDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  statsScrollContainer: {
    paddingRight: 16,
  },
  nextTripCard: {
    padding: 16,
  },
  nextTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departureTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  nextTripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDetailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  nextTripActions: {
    alignItems: 'center',
  },
  prepareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  prepareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tripsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: isTablet ? '22%' : '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  upcomingCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  boardingCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  departedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: isTablet ? '22%' : '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  nextTripAction: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
});
