import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
  Linking,
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
import { formatTripStatus } from '@/utils/tripUtils';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import type {
  RouteSegmentFare,
  TripFareOverride,
} from '@/types/multiStopRoute';
import { getMultiStopRoute } from '@/utils/multiStopRouteUtils';
import RouteSegmentFaresDisplay from '@/components/admin/routes/RouteSegmentFaresDisplay';
import SeatBlockingManager from '@/components/admin/operations/SeatBlockingManager';
import { supabase } from '@/utils/supabase';
import {
  BarChart3,
  Edit,
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
  X,
} from 'lucide-react-native';
import { useAlertContext } from '@/components/AlertProvider';

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
  const { showError, showSuccess, showConfirmation, showInfo } =
    useAlertContext();
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
  const [loadingSegmentData, setLoadingSegmentData] = useState(false);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [isMultiStopRoute, setIsMultiStopRoute] = useState(false);
  const [specialAssistanceCount, setSpecialAssistanceCount] = useState(0);
  const [showSeatBlocking, setShowSeatBlocking] = useState(false);
  const [vesselData, setVesselData] = useState<any>(null);
  const [tripRevenue, setTripRevenue] = useState<number>(0);

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

        // Load special assistance count
        try {
          const { count } = await supabase
            .from('passengers')
            .select('id, bookings!inner(trip_id)', {
              count: 'exact',
              head: true,
            })
            .not('special_assistance_request', 'is', null)
            .neq('special_assistance_request', '')
            .eq('bookings.trip_id', tripData.id);
          setSpecialAssistanceCount(count || 0);
        } catch (e) {
          setSpecialAssistanceCount(0);
        }

        // Load vessel data if vessel_id exists
        if (tripData.vessel_id) {
          try {
            const { data: vessel, error: vesselError } = await supabase
              .from('vessels')
              .select('id, name, seating_capacity, registration_number')
              .eq('id', tripData.vessel_id)
              .single();

            if (!vesselError && vessel) {
              setVesselData(vessel);
            }
          } catch (e) {
            console.error('Error loading vessel:', e);
          }
        }

        // Load actual revenue from bookings
        try {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('total_fare, status')
            .eq('trip_id', tripData.id)
            .in('status', ['confirmed', 'checked_in', 'completed']);

          if (!bookingsError && bookings) {
            const revenue = bookings.reduce(
              (sum, booking) => sum + Number(booking.total_fare || 0),
              0
            );
            setTripRevenue(revenue);
          } else {
            // Fallback to trip data revenue if available
            setTripRevenue(
              (tripData as any).total_revenue ||
                (tripData as any).trip_revenue ||
                0
            );
          }
        } catch (e) {
          console.error('Error loading revenue:', e);
          setTripRevenue(
            (tripData as any).total_revenue ||
              (tripData as any).trip_revenue ||
              0
          );
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

          // Load special assistance count
          try {
            const { count } = await supabase
              .from('passengers')
              .select('id, bookings!inner(trip_id)', {
                count: 'exact',
                head: true,
              })
              .not('special_assistance_request', 'is', null)
              .neq('special_assistance_request', '')
              .eq('bookings.trip_id', mappedTrip.id);
            setSpecialAssistanceCount(count || 0);
          } catch (e) {
            setSpecialAssistanceCount(0);
          }

          // Load vessel data if vessel_id exists
          if (mappedTrip.vessel_id) {
            try {
              const { data: vessel, error: vesselError } = await supabase
                .from('vessels')
                .select('id, name, seating_capacity, registration_number')
                .eq('id', mappedTrip.vessel_id)
                .single();

              if (!vesselError && vessel) {
                setVesselData(vessel);
              }
            } catch (e) {
              console.error('Error loading vessel:', e);
            }
          }

          // Load actual revenue from bookings
          try {
            const { data: bookings, error: bookingsError } = await supabase
              .from('bookings')
              .select('total_fare, status')
              .eq('trip_id', mappedTrip.id)
              .in('status', ['confirmed', 'checked_in', 'completed']);

            if (!bookingsError && bookings) {
              const revenue = bookings.reduce(
                (sum, booking) => sum + Number(booking.total_fare || 0),
                0
              );
              setTripRevenue(revenue);
            } else {
              // Fallback to trip data revenue if available
              setTripRevenue(
                (operationsTripData as any).total_revenue ||
                  (operationsTripData as any).trip_revenue ||
                  0
              );
            }
          } catch (e) {
            console.error('Error loading revenue:', e);
            setTripRevenue(
              (operationsTripData as any).total_revenue ||
                (operationsTripData as any).trip_revenue ||
                0
            );
          }
        }
      }
    } catch (error) {
      showError('Error', 'Failed to load trip details. Please try again.', () =>
        loadTrip()
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMultiStopRouteData = async (routeId: string) => {
    setLoadingSegmentData(true);
    try {
      const multiRoute = await getMultiStopRoute(routeId);

      if (multiRoute) {
        // Always load stops (both simple and multi-stop routes have stops now)
        setRouteStops(multiRoute.stops || []);
        setIsMultiStopRoute(multiRoute.stops?.length > 2 || false);

        if (multiRoute.segment_fares) {
          setRouteSegmentFares(multiRoute.segment_fares);
        }

        // Load trip fare overrides if they exist
        if (id) {
          const { data: overrides, error } = await supabase
            .from('trip_fare_overrides')
            .select('*')
            .eq('trip_id', id);

          if (error) {
            console.error('Error loading trip fare overrides:', error);
          } else {
            setTripFareOverrides(overrides || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading multi-stop route data:', error);
    } finally {
      setLoadingSegmentData(false);
    }
  };

  const handleRefresh = () => {
    loadTrip(true);
  };

  // Silent update function for seat changes - updates data without showing loading indicators
  const handleSeatChange = async () => {
    if (!id) return;

    try {
      // Silently fetch updated trip data without setting loading states
      const tripData = await tripStore.fetchById(id);

      if (tripData) {
        // Update trip state directly without loading indicators
        setTrip(tripData as Trip);

        // Update special assistance count silently
        try {
          const { count } = await supabase
            .from('passengers')
            .select('id, bookings!inner(trip_id)', {
              count: 'exact',
              head: true,
            })
            .not('special_assistance_request', 'is', null)
            .neq('special_assistance_request', '')
            .eq('bookings.trip_id', tripData.id);
          setSpecialAssistanceCount(count || 0);
        } catch (e) {
          // Silently fail
        }

        // Update revenue silently
        try {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('total_fare, status')
            .eq('trip_id', tripData.id)
            .in('status', ['confirmed', 'checked_in', 'completed']);

          if (bookings) {
            const revenue = bookings.reduce(
              (sum, booking) => sum + Number(booking.total_fare || 0),
              0
            );
            setTripRevenue(revenue);
          }
        } catch (e) {
          // Silently fail
        }
      } else {
        // Fallback to operations store
        const operationsTripData = await fetchTrip(id);
        if (operationsTripData) {
          const mappedTrip = mapOperationsTripToTrip(operationsTripData);
          setTrip(mappedTrip);

          // Update special assistance count silently
          try {
            const { count } = await supabase
              .from('passengers')
              .select('id, bookings!inner(trip_id)', {
                count: 'exact',
                head: true,
              })
              .not('special_assistance_request', 'is', null)
              .neq('special_assistance_request', '')
              .eq('bookings.trip_id', mappedTrip.id);
            setSpecialAssistanceCount(count || 0);
          } catch (e) {
            // Silently fail
          }

          // Update revenue silently
          try {
            const { data: bookings } = await supabase
              .from('bookings')
              .select('total_fare, status')
              .eq('trip_id', mappedTrip.id)
              .in('status', ['confirmed', 'checked_in', 'completed']);

            if (bookings) {
              const revenue = bookings.reduce(
                (sum, booking) => sum + Number(booking.total_fare || 0),
                0
              );
              setTripRevenue(revenue);
            }
          } catch (e) {
            // Silently fail
          }
        }
      }
    } catch (error) {
      // Silently fail - don't show error alerts for background updates
      console.error('Silent update failed:', error);
    }
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
        captain_id: tripData.captain_id?.trim() || undefined, // Include captain assignment (undefined if empty)
        is_active: tripData.is_active,
      });

      if (success) {
        await loadTrip(); // Refresh the trip data
        setEditMode(false);
        showSuccess('Success', 'Trip updated successfully!');
      } else {
        throw new Error('Failed to update trip');
      }
    } catch (error) {
      showError(
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

    showConfirmation(
      'Cancel Trip',
      `Are you sure you want to cancel ${routeName} on ${formatBookingDate(
        trip.travel_date
      )} at ${formatTimeAMPM(
        trip.departure_time
      )}?\n\nThis will change the trip status to cancelled and notify ${
        trip.booked_seats
      } booked passengers.`,
      async () => {
        // Use a default reason for cross-platform compatibility
        const defaultReason = 'Trip cancelled by administrator';
        try {
          await cancel(id, defaultReason);

          // Force refresh all stores to get the latest data
          await tripStore.fetchAll();
          await refreshAll();
          await loadTrip(true);

          showSuccess(
            'Trip Cancelled',
            'The trip has been cancelled successfully. Passengers will be notified.'
          );
        } catch (error) {
          showError(
            'Error',
            error instanceof Error ? error.message : 'Failed to cancel trip'
          );
        }
      },
      undefined,
      true // Mark as destructive action
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

    showConfirmation(
      'Delete Trip',
      `Are you sure you want to permanently delete ${routeName} on ${formatBookingDate(
        trip.travel_date
      )} at ${formatTimeAMPM(
        trip.departure_time
      )}?\n\n⚠️ WARNING: This action cannot be undone and will permanently remove the trip and all associated data including ${
        trip.booked_seats
      } bookings.`,
      async () => {
        try {
          await remove(id);
          showSuccess(
            'Trip Deleted',
            'The trip has been permanently deleted from the system.',
            () => router.back()
          );
        } catch (error) {
          showError(
            'Error',
            error instanceof Error ? error.message : 'Failed to delete trip'
          );
        }
      },
      undefined,
      true // Mark as destructive action
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
    showInfo('Share Trip', 'Share functionality coming soon.');
  };

  const getTripStatusInfo = (trip: Trip) => {
    const status = formatTripStatus(trip.status);
    const route = routes?.find(r => r.id === trip.route_id);

    // Try to get vessel from multiple sources
    let vessel = vessels?.find(v => v.id === trip.vessel_id);

    // If not found in vessels array, use vesselData state
    if (!vessel && vesselData && vesselData.id === trip.vessel_id) {
      vessel = vesselData;
    }

    // If still not found, create a vessel object from trip data
    if (!vessel && trip.vessel_id) {
      vessel = {
        id: trip.vessel_id,
        name:
          (trip as any).vessel_name ||
          (trip as any).vesselName ||
          'Unknown Vessel',
        seating_capacity: trip.capacity || 0,
        status: 'active' as const,
        is_active: true,
        created_at: new Date().toISOString(),
      } as any;
    }

    // Calculate occupancy using vessel capacity or trip capacity
    const totalCapacity = vessel?.seating_capacity || trip.capacity || 0;
    const bookedSeats = trip.booked_seats || 0;
    const occupancy =
      totalCapacity > 0 ? Math.round((bookedSeats / totalCapacity) * 100) : 0;

    // Use actual revenue from bookings state, or calculate from route if not available
    let revenue = tripRevenue || 0;
    if (revenue === 0 && route && bookedSeats > 0) {
      // Fallback to calculated revenue if actual revenue not loaded yet
      revenue = bookedSeats * route.base_fare * (trip.fare_multiplier || 1);
    }

    // Calculate duration from route stops or use route duration
    let duration = route?.duration || 'N/A';
    if (routeStops.length > 0 && duration === 'N/A') {
      // Calculate total duration from route stops
      const totalMinutes = routeStops.reduce((sum, stop, index) => {
        if (index > 0 && stop.estimated_travel_time) {
          return sum + stop.estimated_travel_time;
        }
        return sum;
      }, 0);

      if (totalMinutes > 0) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        duration =
          hours > 0
            ? `${hours}h ${minutes}m`
            : minutes > 0
              ? `${minutes}m`
              : 'N/A';
      }
    }

    return {
      status,
      occupancy,
      route,
      vessel,
      revenue,
      duration,
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
                  <Text style={styles.tripId}>Trip #{trip.id.slice(0, 8)}</Text>
                  <View style={styles.routeInfo}>
                    <MapPin size={16} color={colors.primary} />
                    <Text style={styles.routeName}>
                      {routeStops.length > 0
                        ? isMultiStopRoute
                          ? `${routeStops[0]?.island_name || 'Start'} → ${
                              routeStops.length - 2
                            } stops → ${
                              routeStops[routeStops.length - 1]?.island_name ||
                              'End'
                            }`
                          : `${routeStops[0]?.island_name || 'Start'} → ${
                              routeStops[routeStops.length - 1]?.island_name ||
                              'End'
                            }`
                        : `${tripInfo.route?.origin || 'Unknown'} → ${
                            tripInfo.route?.destination || 'Unknown'
                          }`}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusBadgesContainer}>
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
                  {trip.is_active === true && (
                    <View style={styles.activeStatusBadge}>
                      <CheckCircle size={12} color={colors.success} />
                      <Text style={styles.activeStatusText}>ACTIVE</Text>
                    </View>
                  )}
                  {trip.is_active === false && (
                    <View style={styles.inactiveStatusBadge}>
                      <AlertCircle size={12} color={colors.textSecondary} />
                      <Text style={styles.inactiveStatusText}>INACTIVE</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Inactive Trip Warning */}
              {trip.is_active === false && (
                <View style={styles.inactiveWarning}>
                  <AlertTriangle size={16} color={colors.warning} />
                  <Text style={styles.inactiveWarningText}>
                    This trip is currently inactive and not available for
                    booking
                  </Text>
                </View>
              )}

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {formatBookingDate(trip.travel_date)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {formatTimeAMPM(trip.departure_time)}
                    </Text>
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

            {/* Route Stops Display */}
            {routeStops.length > 0 && (
              <View style={styles.routeStopsCard}>
                <View style={styles.routeStopsHeader}>
                  <MapPin size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>
                    {isMultiStopRoute ? 'Multi-Stop Route' : 'Route Path'}
                  </Text>
                  <View style={styles.stopCountBadge}>
                    <Text style={styles.stopCountText}>
                      {routeStops.length} stops
                    </Text>
                  </View>
                </View>

                {loadingSegmentData ? (
                  <View style={styles.loadingStopsContainer}>
                    <ActivityIndicator size='small' color={colors.primary} />
                    <Text style={styles.loadingText}>
                      Loading route stops...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.stopsTimeline}>
                    {routeStops
                      .sort((a, b) => a.stop_sequence - b.stop_sequence)
                      .map((stop, index) => {
                        const isFirst = index === 0;
                        const isLast = index === routeStops.length - 1;
                        const travelTime = stop.estimated_travel_time; // Minutes from previous stop (NULL for first stop)

                        // Calculate arrival time for this stop
                        let arrivalTime = '';
                        if (trip?.departure_time) {
                          // Calculate cumulative travel time from start
                          let cumulativeMinutes = 0;
                          for (let i = 0; i <= index; i++) {
                            if (i > 0 && routeStops[i].estimated_travel_time) {
                              cumulativeMinutes +=
                                routeStops[i].estimated_travel_time;
                            }
                          }

                          // Parse departure time and add cumulative minutes
                          const [hours, minutes] = trip.departure_time
                            .split(':')
                            .map(Number);
                          const departureDate = new Date();
                          departureDate.setHours(hours, minutes, 0, 0);
                          departureDate.setMinutes(
                            departureDate.getMinutes() + cumulativeMinutes
                          );

                          const arrivalHours = departureDate
                            .getHours()
                            .toString()
                            .padStart(2, '0');
                          const arrivalMinutes = departureDate
                            .getMinutes()
                            .toString()
                            .padStart(2, '0');
                          arrivalTime = `${arrivalHours}:${arrivalMinutes}`;
                        }

                        return (
                          <View key={stop.id} style={styles.stopItem}>
                            {/* Timeline connector */}
                            {!isLast && (
                              <View style={styles.timelineConnector}>
                                <View style={styles.timelineLine} />
                              </View>
                            )}

                            {/* Stop marker */}
                            <View
                              style={[
                                styles.stopMarker,
                                isFirst && styles.stopMarkerFirst,
                                isLast && styles.stopMarkerLast,
                              ]}
                            >
                              <View
                                style={[
                                  styles.stopDot,
                                  isFirst && styles.stopDotFirst,
                                  isLast && styles.stopDotLast,
                                ]}
                              />
                            </View>

                            {/* Stop details */}
                            <View style={styles.stopDetails}>
                              <View style={styles.stopMainInfo}>
                                <View style={styles.stopSequenceContainer}>
                                  <Text style={styles.stopSequence}>
                                    Stop {stop.stop_sequence}
                                  </Text>
                                  {arrivalTime && (
                                    <View style={styles.arrivalTimeContainer}>
                                      <Clock size={12} color={colors.primary} />
                                      <Text style={styles.arrivalTime}>
                                        {isFirst ? 'Departs' : 'Arrives'}{' '}
                                        {formatTimeAMPM(arrivalTime)}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <View
                                  style={[
                                    styles.stopTypeBadge,
                                    stop.stop_type === 'pickup' &&
                                      styles.stopTypePickup,
                                    stop.stop_type === 'dropoff' &&
                                      styles.stopTypeDropoff,
                                    stop.stop_type === 'both' &&
                                      styles.stopTypeBoth,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.stopTypeText,
                                      stop.stop_type === 'pickup' &&
                                        styles.stopTypeTextPickup,
                                      stop.stop_type === 'dropoff' &&
                                        styles.stopTypeTextDropoff,
                                      stop.stop_type === 'both' &&
                                        styles.stopTypeTextBoth,
                                    ]}
                                  >
                                    {stop.stop_type === 'pickup'
                                      ? 'Pick-up'
                                      : stop.stop_type === 'dropoff'
                                        ? 'Drop-off'
                                        : 'Both'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.stopIslandName}>
                                {stop.island_name || 'Unknown Island'}
                              </Text>

                              {stop.island_zone && (
                                <Text style={styles.stopZone}>
                                  Zone: {stop.island_zone}
                                </Text>
                              )}

                              {stop.notes && (
                                <Text style={styles.stopNotes}>
                                  {stop.notes}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                  </View>
                )}
              </View>
            )}

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
                <View style={styles.managementRightArea}>
                  {specialAssistanceCount > 0 && (
                    <View style={styles.assistanceBadge}>
                      <Text style={styles.assistanceBadgeText}>
                        {specialAssistanceCount}
                      </Text>
                    </View>
                  )}
                  <ChevronRight size={20} color={colors.textSecondary} />
                </View>
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

              {canManageTrips() && trip.vessel_id && (
                <Pressable
                  style={styles.managementAction}
                  onPress={() => setShowSeatBlocking(!showSeatBlocking)}
                >
                  <View style={styles.managementActionLeft}>
                    <View style={styles.managementIconContainer}>
                      <Users size={20} color={colors.warning} />
                    </View>
                    <View>
                      <Text style={styles.managementActionTitle}>
                        Seat Blocking
                      </Text>
                      <Text style={styles.managementActionSubtitle}>
                        {showSeatBlocking
                          ? 'Hide seat blocking panel'
                          : 'Block or release seats on this trip'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight
                    size={20}
                    color={colors.textSecondary}
                    style={{
                      transform: [
                        { rotate: showSeatBlocking ? '90deg' : '0deg' },
                      ],
                    }}
                  />
                </Pressable>
              )}

              <Pressable
                style={styles.managementAction}
                onPress={async () => {
                  // Try to get registration number from vessels array first
                  let registrationNumber = (
                    vessels?.find(v => v.id === trip.vessel_id) as any
                  )?.registration_number;

                  // If not found, fetch directly from vessels table
                  if (!registrationNumber && trip.vessel_id) {
                    try {
                      const { data: vesselData, error } = await supabase
                        .from('vessels')
                        .select('registration_number')
                        .eq('id', trip.vessel_id)
                        .single();

                      if (!error && vesselData) {
                        registrationNumber = vesselData.registration_number;
                      }
                    } catch (error) {
                      console.error(
                        'Error fetching vessel registration:',
                        error
                      );
                    }
                  }

                  if (!registrationNumber) {
                    showError(
                      'Tracking Unavailable',
                      'This vessel does not have a registration number for tracking.'
                    );
                    return;
                  }

                  const trackingUrl = `https://m.followme.mv/public/${registrationNumber}`;

                  Linking.canOpenURL(trackingUrl)
                    .then(supported => {
                      if (supported) {
                        return Linking.openURL(trackingUrl);
                      } else {
                        showError(
                          'Cannot Open Tracking',
                          'Unable to open the vessel tracking system.'
                        );
                      }
                    })
                    .catch(error => {
                      showError(
                        'Error',
                        'An error occurred while trying to open the tracking system.'
                      );
                    });
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

              {/* Delete action removed per requirements */}
            </View>

            {/* Seat Blocking Manager */}
            {showSeatBlocking && canManageTrips() && trip?.vessel_id && (
              <View style={styles.seatBlockingCard}>
                <View style={styles.seatBlockingHeader}>
                  <Text style={styles.sectionTitle}>
                    Seat Blocking Management
                  </Text>
                  <Pressable
                    onPress={() => setShowSeatBlocking(false)}
                    style={styles.closeButton}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
                {trip.vessel_id ? (
                  <SeatBlockingManager
                    tripId={trip.id}
                    vesselId={trip.vessel_id}
                    onSeatsChanged={handleSeatChange}
                  />
                ) : (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                      No vessel assigned to this trip
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Segment Fares Display - Read Only */}
            {routeSegmentFares.length > 0 && (
              <View style={styles.managementCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Segment Fares</Text>
                  {tripFareOverrides.length > 0 && (
                    <View style={styles.customFaresBadge}>
                      <AlertCircle size={12} color={colors.warning} />
                      <Text style={styles.customFaresText}>Custom Fares</Text>
                    </View>
                  )}
                </View>

                {loadingSegmentData ? (
                  <View style={styles.loadingStopsContainer}>
                    <ActivityIndicator size='small' color={colors.primary} />
                    <Text style={styles.loadingText}>
                      Loading segment fares...
                    </Text>
                  </View>
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
                          hasOverride: !!override,
                          overrideReason: override?.reason,
                        };
                      })}
                      editable={false}
                    />

                    {/* Show override details */}
                    {tripFareOverrides.length > 0 && (
                      <View style={styles.overrideDetailsContainer}>
                        <View style={styles.overrideHeader}>
                          <AlertCircle size={16} color={colors.warning} />
                          <Text style={styles.overrideHeaderText}>
                            Custom Fare Overrides ({tripFareOverrides.length})
                          </Text>
                        </View>
                        {tripFareOverrides.map((override, index) => {
                          const segment = routeSegmentFares.find(
                            f =>
                              f.from_stop_id === override.from_stop_id &&
                              f.to_stop_id === override.to_stop_id
                          );
                          if (!segment) return null;

                          return (
                            <View key={index} style={styles.overrideItem}>
                              <View style={styles.overrideSegment}>
                                <Text style={styles.overrideSegmentText}>
                                  {segment.from_island_name} →{' '}
                                  {segment.to_island_name}
                                </Text>
                                <View style={styles.overrideFares}>
                                  <Text style={styles.originalFare}>
                                    {formatCurrency(segment.fare_amount, 'MVR')}
                                  </Text>
                                  <Text style={styles.fareArrow}>→</Text>
                                  <Text style={styles.overrideFare}>
                                    {formatCurrency(
                                      override.override_fare_amount,
                                      'MVR'
                                    )}
                                  </Text>
                                </View>
                              </View>
                              {override.reason && (
                                <Text style={styles.overrideReason}>
                                  Reason: {override.reason}
                                </Text>
                              )}
                            </View>
                          );
                        })}
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
                    {tripInfo.route && trip.booked_seats > 0
                      ? (
                          tripInfo.revenue /
                          (tripInfo.route.base_fare * trip.booked_seats)
                        ).toFixed(2)
                      : trip.fare_multiplier || 1}
                    x
                  </Text>
                  <Text style={styles.analyticsLabel}>Revenue Multiple</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <View style={styles.analyticsIconContainer}>
                    <Clock size={16} color={colors.info} />
                  </View>
                  <Text style={styles.analyticsValue}>
                    {tripInfo.duration || 'N/A'}
                  </Text>
                  <Text style={styles.analyticsLabel}>Estimated Duration</Text>
                </View>
              </View>
            </View>
          </ScrollView>
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
  statusBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${colors.success}20`,
    borderWidth: 1,
    borderColor: colors.success,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inactiveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${colors.textSecondary}20`,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  inactiveStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inactiveWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: `${colors.warning}15`,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
    marginBottom: 16,
  },
  inactiveWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.warning,
    lineHeight: 18,
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
  managementRightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assistanceBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  assistanceBadgeText: {
    color: 'white',
    fontSize: 11,
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
  customFaresBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.warningLight,
  },
  customFaresText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  overrideDetailsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  overrideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  overrideHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  overrideItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overrideSegment: {
    marginBottom: 6,
  },
  overrideSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  overrideFares: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalFare: {
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  fareArrow: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  overrideFare: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.warning,
  },
  overrideReason: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Route Stops Styles
  routeStopsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeStopsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stopCountBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stopCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingStopsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  stopsTimeline: {
    gap: 0,
  },
  stopItem: {
    position: 'relative',
    paddingLeft: 40,
    paddingBottom: 20,
  },
  timelineConnector: {
    position: 'absolute',
    left: 15,
    top: 24,
    bottom: 0,
    width: 2,
    alignItems: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
  },
  stopMarker: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarkerFirst: {
    // Special styling for first stop
  },
  stopMarkerLast: {
    // Special styling for last stop
  },
  stopDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    borderWidth: 3,
    borderColor: colors.card,
  },
  stopDotFirst: {
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
  },
  stopDotLast: {
    backgroundColor: colors.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
  },
  stopDetails: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  stopMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stopSequenceContainer: {
    flex: 1,
    gap: 4,
  },
  stopSequence: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  arrivalTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  arrivalTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  stopTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stopTypePickup: {
    backgroundColor: `${colors.success}20`,
  },
  stopTypeDropoff: {
    backgroundColor: `${colors.warning}20`,
  },
  stopTypeBoth: {
    backgroundColor: `${colors.primary}20`,
  },
  stopTypeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stopTypeTextPickup: {
    color: colors.success,
  },
  stopTypeTextDropoff: {
    color: colors.warning,
  },
  stopTypeTextBoth: {
    color: colors.primary,
  },
  stopIslandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  stopZone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  stopNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  seatBlockingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  seatBlockingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
});
