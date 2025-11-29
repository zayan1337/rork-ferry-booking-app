import React, { useEffect, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import {
  Ship,
  Users,
  Clock,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';

import { useCaptainStore } from '@/store/captainStore';
import { CaptainTrip } from '@/types/captain';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/currencyUtils';
import { useAlertContext } from '@/components/AlertProvider';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function CaptainTripsScreen() {
  const params = useLocalSearchParams<{ status?: string }>();
  const {
    trips,
    loading,
    error,
    searchQuery,
    dateFilter,
    statusFilter,
    fetchTripsByDate,
    setSearchQuery,
    setDateFilter,
    setStatusFilter,
    clearError,
  } = useCaptainStore();
  const { showError } = useAlertContext();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Set status filter from route params when screen loads
  useEffect(() => {
    if (params.status) {
      // Map dashboard status to trips status filter
      const statusMap: Record<string, string> = {
        upcoming: 'scheduled',
        boarding: 'boarding',
        'en route': 'departed',
        departed: 'departed',
        completed: 'completed',
      };
      const mappedStatus =
        statusMap[params.status.toLowerCase()] || params.status;
      setStatusFilter(mappedStatus);
      // Auto-show filters when navigating with a status param
      setShowFilters(true);
    }
  }, [params.status, setStatusFilter]);

  // Auto-refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchTripsByDate(dateFilter);
    }, [fetchTripsByDate, dateFilter])
  );

  useEffect(() => {
    if (error) {
      showError('Error', error);
      clearError();
    }
  }, [error, clearError, showError]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTripsByDate(dateFilter);
    setIsRefreshing(false);
  };

  const handleDateChange = (date: string) => {
    setDateFilter(date);
    fetchTripsByDate(date);
  };

  // Check if any filters are active
  const hasActiveFilters =
    statusFilter !== 'all' ||
    searchQuery.length > 0 ||
    dateFilter !== new Date().toISOString().split('T')[0];

  // Clear all filters
  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
    fetchTripsByDate(today);
  };

  const handleTripPress = (trip: CaptainTrip) => {
    router.push(`../trip-details/${trip.id}` as any);
  };

  // Filter trips based on search and status
  const filteredTrips = trips.filter(trip => {
    const matchesSearch =
      !searchQuery ||
      trip.route_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.from_island_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      trip.to_island_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || trip.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: CaptainTrip['status']) => {
    switch (status) {
      case 'scheduled':
        return Colors.primary;
      case 'boarding':
        return Colors.warning;
      case 'departed':
        return Colors.primary;
      case 'arrived':
        return Colors.success;
      case 'completed':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      case 'delayed':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: CaptainTrip['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'boarding':
        return 'Boarding';
      case 'departed':
        return 'En Route';
      case 'arrived':
        return 'Arrived';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'delayed':
        return 'Delayed';
      default:
        return status;
    }
  };

  const renderSearchAndFilters = () => (
    <Card variant='outlined' style={styles.searchCard}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder='Search trips, routes, vessels...'
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <X size={16} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter
            size={20}
            color={hasActiveFilters ? Colors.error : Colors.primary}
          />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            {hasActiveFilters && (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
              >
                <X size={16} color={Colors.error} />
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </Pressable>
            )}
          </View>

          <CalendarDatePicker
            label='Filter by Date'
            value={dateFilter}
            onChange={handleDateChange}
            placeholder='Select date'
            minDate={
              new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            }
          />

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.statusFilters}>
                {[
                  'all',
                  'scheduled',
                  'boarding',
                  'departed',
                  'arrived',
                  'completed',
                ].map(status => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusFilterButton,
                      statusFilter === status &&
                        styles.statusFilterButtonActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.statusFilterText,
                        statusFilter === status &&
                          styles.statusFilterTextActive,
                      ]}
                    >
                      {status === 'all'
                        ? 'All'
                        : getStatusLabel(status as CaptainTrip['status'])}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </Card>
  );

  const renderTripCard = (trip: CaptainTrip) => (
    <Card key={trip.id} variant='elevated' style={styles.tripCard}>
      <Pressable onPress={() => handleTripPress(trip)}>
        {/* Trip Header */}
        <View style={styles.tripHeader}>
          <View style={styles.routeInfo}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.routeName}>{trip.route_name}</Text>
          </View>
          <View style={styles.headerBadges}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(trip.status)}20` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(trip.status) },
                ]}
              >
                {getStatusLabel(trip.status)}
              </Text>
            </View>

            {/* Inactive Badge */}
            {!trip.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
              </View>
            )}

            {/* Special Assistance Badge */}
            {typeof trip.special_assistance_count === 'number' &&
              trip.special_assistance_count > 0 && (
                <View style={styles.specialAssistanceBadge}>
                  <Text style={styles.badgeText}>
                    {String(trip.special_assistance_count)}
                  </Text>
                </View>
              )}
          </View>
        </View>

        {/* Inactive Trip Warning */}
        {!trip.is_active && (
          <View style={styles.inactiveWarning}>
            <AlertCircle size={14} color={Colors.warning} />
            <Text style={styles.inactiveWarningText}>
              This trip is currently inactive. Tap to view and activate it.
            </Text>
          </View>
        )}

        {/* Progress indicator - only show if we have valid stop data */}
        {trip.total_stops &&
          trip.total_stops > 1 &&
          trip.current_stop_sequence &&
          trip.current_stop_sequence > 0 && (
            <View style={styles.multiStopProgress}>
              <Text style={styles.multiStopProgressText}>
                Stop {trip.current_stop_sequence} of {trip.total_stops}
              </Text>
              <View style={styles.multiStopProgressBar}>
                <View
                  style={[
                    styles.multiStopProgressFill,
                    {
                      width: `${(trip.current_stop_sequence / trip.total_stops) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

        {/* Trip Details */}
        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatTimeAMPM(trip.departure_time)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ship size={14} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{trip.vessel_name}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Users size={14} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {trip.booked_seats}/{trip.capacity} passengers
              </Text>
            </View>
            <View style={styles.detailItem}>
              <CheckCircle size={14} color={Colors.success} />
              <Text style={styles.detailText}>
                {trip.checked_in_passengers} checked in
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${trip.occupancy_rate || 0}%`,
                  backgroundColor:
                    trip.occupancy_rate && trip.occupancy_rate > 80
                      ? Colors.warning
                      : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(trip.occupancy_rate || 0)}% capacity
          </Text>
        </View>
      </Pressable>
    </Card>
  );

  const renderEmptyState = () => (
    <Card variant='outlined' style={styles.emptyCard}>
      <Ship size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Trips Found</Text>
      <Text style={styles.emptyMessage}>
        {dateFilter === new Date().toISOString().split('T')[0]
          ? "You don't have any trips scheduled for today."
          : `No trips found for ${formatBookingDate(dateFilter)}.`}
      </Text>
      <Button
        title='Refresh'
        onPress={handleRefresh}
        variant='outline'
        style={styles.refreshButton}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
        {renderSearchAndFilters()}

        {/* Trip Summary */}
        <Card variant='outlined' style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {formatBookingDate(dateFilter)} - {filteredTrips.length} Trip(s)
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {filteredTrips.reduce(
                  (sum, trip) => sum + trip.booked_seats,
                  0
                )}
              </Text>
              <Text style={styles.summaryLabel}>Total Passengers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {filteredTrips.reduce(
                  (sum, trip) => sum + trip.checked_in_passengers,
                  0
                )}
              </Text>
              <Text style={styles.summaryLabel}>Checked In</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(
                  filteredTrips.reduce(
                    (sum, trip) => sum + (trip.revenue || 0),
                    0
                  ),
                  'MVR'
                )}
              </Text>
              <Text style={styles.summaryLabel}>Revenue</Text>
            </View>
          </View>
        </Card>

        {/* Trips List */}
        {loading.trips && trips.length === 0 ? (
          <Card variant='outlined' style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading trips...</Text>
          </Card>
        ) : filteredTrips.length > 0 ? (
          <View style={styles.tripsContainer}>
            {filteredTrips.map(renderTripCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  searchCard: {
    marginBottom: 16,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: `${Colors.error}10`,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  filtersContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${Colors.error}10`,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusFilterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  statusFilterTextActive: {
    color: 'white',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tripsContainer: {
    gap: 16,
  },
  tripCard: {
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    minWidth: 120,
  },
  loadingCard: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  // Multi-stop styles
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiStopProgress: {
    marginTop: 8,
    marginBottom: 4,
  },
  multiStopProgressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  multiStopProgressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  multiStopProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  specialAssistanceBadge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${Colors.textSecondary}20`,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  inactiveWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.warning}10`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  inactiveWarningText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
    flex: 1,
  },
});
