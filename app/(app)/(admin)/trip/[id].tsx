import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Stack,
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripForm } from '@/components/admin/operations';
import { OperationsTrip } from '@/types/database';
import { Trip, TripFormData } from '@/types/operations';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useTripManagement } from '@/hooks/useTripManagement';
import { useTripStore } from '@/store/admin/tripStore';
import RoleGuard from '@/components/RoleGuard';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatTripStatus, getTripOccupancy } from '@/utils/tripUtils';
import type {
  RouteSegmentFare,
  TripFareOverride,
} from '@/types/multiStopRoute';
import { getMultiStopRoute } from '@/utils/multiStopRouteUtils';
import RouteSegmentFaresDisplay from '@/components/admin/routes/RouteSegmentFaresDisplay';
import TripFareOverrideEditor from '@/components/admin/trips/TripFareOverrideEditor';
import { supabase } from '@/utils/supabase';
import {
  BarChart3,
  Edit,
  Trash,
  Users,
  MapPin,
  Clock,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Ship,
  TrendingUp,
  DollarSign,
  Percent,
  Navigation,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Bookmark,
  ChevronRight,
} from 'lucide-react-native';

// Function to convert OperationsTrip to Trip type expected by components
const mapOperationsTripToTrip = (operationsTrip: OperationsTrip): Trip => {
  return {
    id: operationsTrip.id,
    route_id: operationsTrip.route_id,
    vessel_id: operationsTrip.vessel_id,
    travel_date: operationsTrip.travel_date,
    departure_time: operationsTrip.departure_time,
    arrival_time: operationsTrip.arrival_time || undefined,
    estimated_duration: '1h 30m', // Default estimate
    status: operationsTrip.status as any,
    available_seats: operationsTrip.available_seats,
    booked_seats: operationsTrip.booked_seats || operationsTrip.bookings || 0,
    fare_multiplier: 1.0, // Default multiplier
    created_at: operationsTrip.created_at,
    updated_at: operationsTrip.created_at, // Use created_at as fallback
    // Display fields
    routeName: operationsTrip.route_name || operationsTrip.routeName,
    vesselName: operationsTrip.vessel_name || operationsTrip.vesselName,
    bookings: operationsTrip.bookings || operationsTrip.booked_seats || 0,
    capacity: operationsTrip.seating_capacity || operationsTrip.capacity,
    is_active: operationsTrip.is_active,
  };
};

export default function TripDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchTrip, updateTripData, routes, vessels, refreshAll } =
    useOperationsStore();
  const { cancel, remove } = useTripManagement();
  const tripStore = useTripStore();
  const { canViewTrips, canManageTrips } = useAdminPermissions();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'details' | 'analytics' | 'passengers' | 'bookings'
  >('details');
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [routeSegmentFares, setRouteSegmentFares] = useState<
    RouteSegmentFare[]
  >([]);
  const [tripFareOverrides, setTripFareOverrides] = useState<
    TripFareOverride[]
  >([]);
  const [showFareOverrideEditor, setShowFareOverrideEditor] = useState(false);
  const [loadingSegmentData, setLoadingSegmentData] = useState(false);

  // Auto-refresh when page is focused
  useFocusEffect(
    useCallback(() => {
      if (!editMode) {
        loadTrip();
      }
    }, [editMode])
  );

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async (showRefreshIndicator = false) => {
    if (!id) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // First try to get from tripStore (which has the most up-to-date data after cancel)
      const tripData = await tripStore.fetchById(id);

      if (tripData) {
        // Use the trip data directly with type assertion (both types are compatible in practice)
        setTrip(tripData as Trip);

        // Load multi-stop route data if applicable
        if (tripData.route_id) {
          await loadMultiStopRouteData(tripData.route_id);
        }
      } else {
        // Fallback to operations store
        const operationsTripData = await fetchTrip(id);
        if (operationsTripData) {
          const mappedTrip = mapOperationsTripToTrip(operationsTripData);
          setTrip(mappedTrip);

          // Load multi-stop route data if applicable
          if (mappedTrip.route_id) {
            await loadMultiStopRouteData(mappedTrip.route_id);
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load trip details. Please try again.', [
        { text: 'Retry', onPress: () => loadTrip() },
        { text: 'Go Back', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMultiStopRouteData = async (routeId: string) => {
    setLoadingSegmentData(true);
    try {
      const multiRoute = await getMultiStopRoute(routeId);
      if (multiRoute && multiRoute.is_multi_stop) {
        setRouteSegmentFares(multiRoute.segment_fares);

        // Load trip fare overrides if they exist
        if (id) {
          const { data: overrides } = await supabase
            .from('trip_fare_overrides')
            .select('*')
            .eq('trip_id', id);

          if (overrides) {
            setTripFareOverrides(overrides);
          }
        }
      }
    } catch (error) {
      console.error('Error loading multi-stop route data:', error);
    } finally {
      setLoadingSegmentData(false);
    }
  };

  const handleSaveFareOverrides = async (overrides: TripFareOverride[]) => {
    if (!id) return;

    try {
      // Delete existing overrides
      await supabase.from('trip_fare_overrides').delete().eq('trip_id', id);

      // Insert new overrides
      if (overrides.length > 0) {
        const { error } = await supabase.from('trip_fare_overrides').insert(
          overrides.map(o => ({
            trip_id: id,
            from_stop_id: o.from_stop_id,
            to_stop_id: o.to_stop_id,
            override_fare_amount: o.override_fare_amount,
            reason: o.reason,
          }))
        );

        if (error) throw error;
      }

      setShowFareOverrideEditor(false);
      await loadTrip(true); // Reload trip data
      Alert.alert('Success', 'Fare overrides saved successfully');
    } catch (error) {
      console.error('Error saving fare overrides:', error);
      Alert.alert('Error', 'Failed to save fare overrides');
    }
  };

  const handleRefresh = () => {
    loadTrip(true);
  };

  const handleEdit = () => {
    setEditMode(true);
    setActionMenuVisible(false);
  };

  const handleSave = async (tripData: TripFormData) => {
    if (!id) return;

    try {
      const success = await updateTripData(id, {
        route_id: tripData.route_id,
        vessel_id: tripData.vessel_id,
        travel_date: tripData.travel_date,
        departure_time: tripData.departure_time,
        available_seats: trip?.available_seats || 0, // Keep current available seats
        captain_id: tripData.captain_id || '', // Include captain assignment
        is_active: true,
      });

      if (success) {
        await loadTrip(); // Refresh the trip data
        setEditMode(false);
        Alert.alert('Success', 'Trip updated successfully!');
      } else {
        throw new Error('Failed to update trip');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update trip'
      );
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleCancel = async () => {
    if (!id || !trip) return;

    const route = routes?.find(r => r.id === trip.route_id);
    const routeName = route
      ? `${route.origin || route.from_island_name} → ${
          route.destination || route.to_island_name
        }`
      : 'this trip';

    Alert.alert(
      'Cancel Trip',
      `Are you sure you want to cancel ${routeName} on ${new Date(
        trip.travel_date
      ).toLocaleDateString()} at ${
        trip.departure_time
      }?\n\nThis will change the trip status to cancelled and notify ${
        trip.booked_seats
      } booked passengers.`,
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Cancel Trip',
          style: 'destructive',
          onPress: async () => {
            // Use a default reason for cross-platform compatibility
            const defaultReason = 'Trip cancelled by administrator';
            try {
              await cancel(id, defaultReason);

              // Force refresh all stores to get the latest data
              await tripStore.fetchAll();
              await refreshAll();
              await loadTrip(true);

              Alert.alert(
                'Trip Cancelled',
                'The trip has been cancelled successfully. Passengers will be notified.'
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to cancel trip'
              );
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!id || !trip) return;

    const route = routes?.find(r => r.id === trip.route_id);
    const routeName = route
      ? `${route.origin || route.from_island_name} → ${
          route.destination || route.to_island_name
        }`
      : 'this trip';

    Alert.alert(
      'Delete Trip',
      `Are you sure you want to permanently delete ${routeName} on ${new Date(
        trip.travel_date
      ).toLocaleDateString()} at ${
        trip.departure_time
      }?\n\n⚠️ WARNING: This action cannot be undone and will permanently remove the trip and all associated data including ${
        trip.booked_seats
      } bookings.`,
      [
        { text: 'Keep Trip', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(id);
              Alert.alert(
                'Trip Deleted',
                'The trip has been permanently deleted from the system.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete trip'
              );
            }
          },
        },
      ]
    );
  };

  const handleViewPassengers = () => {
    if (!id) return;
    router.push(`../trip/${id}/passengers` as any);
  };

  const handleViewBookings = () => {
    if (!id) return;
    router.push(`../trip/${id}/bookings` as any);
  };

  const handleShare = () => {
    if (!trip) return;

    Alert.alert('Share Trip', 'Choose how to share this trip information:', [
      { text: 'Copy Link', onPress: () => console.log('Copy link') },
      { text: 'Export PDF', onPress: () => console.log('Export PDF') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getTripStatusInfo = (trip: Trip) => {
    const status = formatTripStatus(trip.status);
    const occupancy = getTripOccupancy(trip);
    const route = routes?.find(r => r.id === trip.route_id);
    const vessel = vessels?.find(v => v.id === trip.vessel_id);

    return {
      status,
      occupancy,
      route,
      vessel,
      revenue: route
        ? trip.booked_seats * route.base_fare * trip.fare_multiplier
        : 0,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Trip Not Found',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <Text style={styles.errorTitle}>Trip Not Found</Text>
        <Text style={styles.errorMessage}>
          The requested trip could not be found. It may have been cancelled or
          moved.
        </Text>
        <Pressable style={styles.retryButton} onPress={() => loadTrip()}>
          <RefreshCw size={16} color='#FFFFFF' />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const tripInfo = getTripStatusInfo(trip);

  return (
    <RoleGuard allowedRoles={['admin', 'captain']}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: editMode ? 'Edit Trip' : 'Trip Details',
            headerShown: true,
            presentation: 'card',
            headerLeft: () => (
              <Pressable
                onPress={() => (editMode ? setEditMode(false) : router.back())}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
            headerRight: () =>
              !editMode && canManageTrips() ? (
                <Pressable onPress={handleEdit} style={styles.editButton}>
                  <Edit size={20} color={colors.primary} />
                </Pressable>
              ) : null,
          }}
        />

        {/* Action Menu Overlay */}
        {actionMenuVisible && (
          <Pressable
            style={styles.actionMenuOverlay}
            onPress={() => setActionMenuVisible(false)}
          >
            <View style={styles.actionMenuContainer}>
              {/* This section is removed as per the new_code, but the state variable remains */}
            </View>
          </Pressable>
        )}

        {editMode ? (
          <TripForm
            tripId={id}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        ) : (
          <ScrollView
            style={styles.content}
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
            {/* Trip Overview Card */}
            <View style={styles.overviewCard}>
              {/* Header */}
              <View style={styles.overviewHeader}>
                <View style={styles.overviewHeaderLeft}>
                  <Text style={styles.tripId}>Trip #{trip.id}</Text>
                  <View style={styles.routeInfo}>
                    <MapPin size={16} color={colors.primary} />
                    <Text style={styles.routeName}>
                      {tripInfo.route?.origin || 'Unknown'} →{' '}
                      {tripInfo.route?.destination || 'Unknown'}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${tripInfo.status.color}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: tripInfo.status.color },
                    ]}
                  >
                    {tripInfo.status.label}
                  </Text>
                </View>
              </View>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {new Date(trip.travel_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{trip.departure_time}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ship size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {tripInfo.vessel?.name || 'Unknown Vessel'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Users size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {trip.booked_seats}/
                      {tripInfo.vessel?.seating_capacity || 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Metrics */}
              <View style={styles.metricsContainer}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>
                    {formatCurrency(tripInfo.revenue, 'MVR')}
                  </Text>
                  <Text style={styles.metricLabel}>Revenue</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{tripInfo.occupancy}%</Text>
                  <Text style={styles.metricLabel}>Occupancy</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>
                    {trip.fare_multiplier}x
                  </Text>
                  <Text style={styles.metricLabel}>Fare</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Cards */}
            <View style={styles.quickStatsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <DollarSign size={20} color={colors.success} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>
                    {formatCurrency(tripInfo.revenue, 'MVR')}
                  </Text>
                  <Text style={styles.statLabel}>Revenue</Text>
                </View>
                <View style={styles.statTrend}>
                  <TrendingUp size={16} color={colors.success} />
                  <Text style={styles.statTrendText}>+12%</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Users size={20} color={colors.primary} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>{trip.booked_seats}</Text>
                  <Text style={styles.statLabel}>Passengers</Text>
                </View>
                <View style={styles.statTrend}>
                  <Percent size={16} color={colors.primary} />
                  <Text style={styles.statTrendText}>
                    {tripInfo.occupancy}%
                  </Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <CheckCircle size={20} color={colors.warning} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValue}>On Time</Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
                <View style={styles.statTrend}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.statTrendText}>15min</Text>
                </View>
              </View>
            </View>

            {/* Management Actions */}
            <View style={styles.managementCard}>
              <Text style={styles.sectionTitle}>Trip Management</Text>

              <Pressable
                style={styles.managementAction}
                onPress={handleViewPassengers}
              >
                <View style={styles.managementActionLeft}>
                  <View style={styles.managementIconContainer}>
                    <Users size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.managementActionTitle}>
                      Passenger Manifest
                    </Text>
                    <Text style={styles.managementActionSubtitle}>
                      View all {trip.booked_seats} passengers on this trip
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                style={styles.managementAction}
                onPress={handleViewBookings}
              >
                <View style={styles.managementActionLeft}>
                  <View style={styles.managementIconContainer}>
                    <Bookmark size={20} color={colors.info} />
                  </View>
                  <View>
                    <Text style={styles.managementActionTitle}>
                      Booking Details
                    </Text>
                    <Text style={styles.managementActionSubtitle}>
                      Manage reservations and payments
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                style={styles.managementAction}
                onPress={() => {
                  Alert.alert(
                    'Feature Coming Soon',
                    'Real-time tracking will be available in the next update.'
                  );
                }}
              >
                <View style={styles.managementActionLeft}>
                  <View style={styles.managementIconContainer}>
                    <Navigation size={20} color={colors.success} />
                  </View>
                  <View>
                    <Text style={styles.managementActionTitle}>
                      Live Tracking
                    </Text>
                    <Text style={styles.managementActionSubtitle}>
                      Monitor vessel location and progress
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </Pressable>

              {trip.status !== 'completed' && trip.status !== 'cancelled' && (
                <Pressable
                  style={[styles.managementAction, styles.dangerAction]}
                  onPress={handleCancel}
                >
                  <View style={styles.managementActionLeft}>
                    <View
                      style={[
                        styles.managementIconContainer,
                        styles.dangerIconContainer,
                      ]}
                    >
                      <AlertTriangle size={20} color={colors.danger} />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.managementActionTitle,
                          styles.dangerActionTitle,
                        ]}
                      >
                        Cancel Trip
                      </Text>
                      <Text style={styles.managementActionSubtitle}>
                        Cancel this trip and notify passengers
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.danger} />
                </Pressable>
              )}

              {canManageTrips() && (
                <Pressable
                  style={[styles.managementAction, styles.deleteAction]}
                  onPress={handleDelete}
                >
                  <View style={styles.managementActionLeft}>
                    <View
                      style={[
                        styles.managementIconContainer,
                        styles.deleteIconContainer,
                      ]}
                    >
                      <Trash size={20} color={colors.danger} />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.managementActionTitle,
                          styles.deleteActionTitle,
                        ]}
                      >
                        Delete Trip
                      </Text>
                      <Text style={styles.managementActionSubtitle}>
                        Permanently remove trip from system
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.danger} />
                </Pressable>
              )}
            </View>

            {/* Segment Breakdown for Multi-Stop Routes */}
            {routeSegmentFares.length > 0 && (
              <View style={styles.managementCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Segment Fares</Text>
                  {canManageTrips() && (
                    <Pressable
                      style={styles.editFaresButton}
                      onPress={() => setShowFareOverrideEditor(true)}
                    >
                      <Edit size={16} color={colors.primary} />
                      <Text style={styles.editFaresText}>Edit Fares</Text>
                    </Pressable>
                  )}
                </View>

                {loadingSegmentData ? (
                  <Text style={styles.loadingText}>
                    Loading segment data...
                  </Text>
                ) : (
                  <>
                    <RouteSegmentFaresDisplay
                      segmentFares={routeSegmentFares.map(fare => {
                        // Check if this segment has an override
                        const override = tripFareOverrides.find(
                          o =>
                            o.from_stop_id === fare.from_stop_id &&
                            o.to_stop_id === fare.to_stop_id
                        );

                        return {
                          ...fare,
                          fare_amount:
                            override?.override_fare_amount || fare.fare_amount,
                        };
                      })}
                      editable={false}
                    />

                    {/* Show override indicators */}
                    {tripFareOverrides.length > 0 && (
                      <View style={styles.overrideIndicator}>
                        <AlertCircle size={14} color={colors.warning} />
                        <Text style={styles.overrideText}>
                          {tripFareOverrides.length} segment
                          {tripFareOverrides.length > 1 ? 's' : ''} with custom
                          fares
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Enhanced Analytics */}
            <View style={styles.analyticsCard}>
              <Text style={styles.sectionTitle}>Performance Analytics</Text>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <View style={styles.analyticsIconContainer}>
                    <BarChart3 size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.analyticsValue}>
                    {tripInfo.occupancy}%
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Capacity Utilization
                  </Text>
                </View>
                <View style={styles.analyticsItem}>
                  <View style={styles.analyticsIconContainer}>
                    <TrendingUp size={16} color={colors.success} />
                  </View>
                  <Text style={styles.analyticsValue}>
                    {tripInfo.route
                      ? Math.round(
                          (tripInfo.revenue / tripInfo.route.base_fare) * 100
                        ) / 100
                      : 0}
                    x
                  </Text>
                  <Text style={styles.analyticsLabel}>Revenue Multiple</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <View style={styles.analyticsIconContainer}>
                    <Clock size={16} color={colors.info} />
                  </View>
                  <Text style={styles.analyticsValue}>
                    {tripInfo.route?.duration || 'N/A'}
                  </Text>
                  <Text style={styles.analyticsLabel}>Estimated Duration</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Fare Override Editor Modal */}
        {showFareOverrideEditor && routeSegmentFares.length > 0 && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TripFareOverrideEditor
                tripId={id || ''}
                routeSegmentFares={routeSegmentFares}
                existingOverrides={tripFareOverrides}
                onSave={handleSaveFareOverrides}
                onCancel={() => setShowFareOverrideEditor(false)}
              />
            </View>
          </View>
        )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    gap: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  overviewHeaderLeft: {
    flex: 1,
  },
  tripId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}30`,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  analyticsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  analyticsIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickStatsContainer: {
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  managementCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  managementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  managementActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managementIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: `${colors.danger}20`,
  },
  managementActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dangerActionTitle: {
    color: colors.danger,
  },
  managementActionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dangerAction: {
    backgroundColor: `${colors.danger}10`,
  },
  deleteAction: {
    backgroundColor: `${colors.danger}15`,
    borderWidth: 1,
    borderColor: `${colors.danger}30`,
  },
  deleteIconContainer: {
    backgroundColor: `${colors.danger}25`,
  },
  deleteActionTitle: {
    color: colors.danger,
    fontWeight: '700',
  },
  actionMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    width: '80%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editFaresButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  editFaresText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  overrideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
  },
  overrideText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
