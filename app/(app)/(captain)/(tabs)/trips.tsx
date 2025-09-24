import React, { useEffect, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
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
  Navigation,
  UserCheck,
  Eye,
} from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';

import { useCaptainStore } from '@/store/captainStore';
import { CaptainTrip } from '@/types/captain';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { formatSimpleDate } from '@/utils/dateUtils';
import { formatTripTime } from '@/utils/tripUtils';
import { formatCurrency } from '@/utils/currencyUtils';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function CaptainTripsScreen() {
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
    updateTripStatus,
    clearError,
  } = useCaptainStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchTripsByDate(dateFilter);
    }, [fetchTripsByDate, dateFilter])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTripsByDate(dateFilter);
    setIsRefreshing(false);
  };

  const handleDateChange = (date: string) => {
    setDateFilter(date);
    fetchTripsByDate(date);
  };

  const handleTripPress = (trip: CaptainTrip) => {
    router.push(`../trip-details/${trip.id}` as any);
  };

  const handleStartBoarding = async (tripId: string) => {
    const success = await updateTripStatus(tripId, 'boarding');
    if (success) {
      Alert.alert('Success', 'Boarding has started for this trip.');
    }
  };

  const handleMarkDeparted = async (tripId: string) => {
    Alert.alert(
      'Confirm Departure',
      'Mark this trip as departed? This will close check-in for new passengers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Depart',
          onPress: async () => {
            const success = await updateTripStatus(tripId, 'departed');
            if (success) {
              Alert.alert('Success', 'Trip marked as departed.');
            }
          },
        },
      ]
    );
  };

  const handleMarkArrived = async (tripId: string) => {
    const success = await updateTripStatus(tripId, 'arrived');
    if (success) {
      Alert.alert('Success', 'Trip marked as arrived.');
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    Alert.alert(
      'Complete Trip',
      'Mark this trip as completed? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            const success = await updateTripStatus(tripId, 'completed');
            if (success) {
              Alert.alert('Success', 'Trip completed successfully.');
            }
          },
        },
      ]
    );
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
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Date:</Text>
            <TextInput
              style={styles.dateInput}
              value={dateFilter}
              onChangeText={handleDateChange}
              placeholder='YYYY-MM-DD'
            />
          </View>
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
                  <TouchableOpacity
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
                  </TouchableOpacity>
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
      <TouchableOpacity onPress={() => handleTripPress(trip)}>
        {/* Trip Header */}
        <View style={styles.tripHeader}>
          <View style={styles.routeInfo}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.routeName}>
              {trip.from_island_name} → {trip.to_island_name}
            </Text>
          </View>
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
        </View>

        {/* Trip Details */}
        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatTripTime(trip.departure_time)}
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
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title='View Details'
          onPress={() => handleTripPress(trip)}
          variant='outline'
          style={styles.actionButton}
          icon={<Eye size={16} color={Colors.primary} />}
        />

        {trip.status === 'scheduled' && (
          <Button
            title='Start Boarding'
            onPress={() => handleStartBoarding(trip.id)}
            style={styles.actionButton}
            icon={<UserCheck size={16} color='white' />}
          />
        )}

        {trip.status === 'boarding' && (
          <Button
            title='Depart'
            onPress={() => handleMarkDeparted(trip.id)}
            style={styles.actionButton}
            icon={<Navigation size={16} color='white' />}
          />
        )}

        {trip.status === 'departed' && (
          <Button
            title='Mark Arrived'
            onPress={() => handleMarkArrived(trip.id)}
            style={styles.actionButton}
            icon={<CheckCircle size={16} color='white' />}
          />
        )}

        {trip.status === 'arrived' && (
          <Button
            title='Complete Trip'
            onPress={() => handleCompleteTrip(trip.id)}
            style={styles.actionButton}
            icon={<CheckCircle size={16} color='white' />}
          />
        )}
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <Card variant='outlined' style={styles.emptyCard}>
      <Ship size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Trips Found</Text>
      <Text style={styles.emptyMessage}>
        {dateFilter === new Date().toISOString().split('T')[0]
          ? "You don't have any trips scheduled for today."
          : `No trips found for ${formatSimpleDate(dateFilter)}.`}
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
            {formatSimpleDate(dateFilter)} - {filteredTrips.length} Trip(s)
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
        {loading.trips ? (
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
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  filtersContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.text,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
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
});
