import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  Stack,
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import { colors } from '@/constants/adminColors';
import { AdminBooking, BookingStatus } from '@/types/admin/management';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  BookingActionsSection,
  BookingQRCode,
  BookingTripDetails,
  BookingPaymentDetails,
  BookingPassengerDetails,
} from '@/components/admin/bookings';
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  RefreshCw,
  Users,
  CreditCard,
  Calendar,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
} from 'lucide-react-native';
import {
  formatDateTime,
  formatCurrency,
} from '@/utils/admin/bookingManagementUtils';
import { supabase } from '@/utils/supabase';
import { getRouteStops } from '@/utils/segmentUtils';
import { getBookingSegment } from '@/utils/segmentBookingUtils';
import type { RouteStop } from '@/types/multiStopRoute';

const { width: screenWidth } = Dimensions.get('window');

export default function BookingDetailsPage() {
  const { id } = useLocalSearchParams();
  const {
    fetchBooking,
    updateBooking,
    loading: storeLoading,
    error: storeError,
  } = useAdminBookingStore();
  const { canViewBookings, canUpdateBookings } = useAdminPermissions();

  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [boardingStopName, setBoardingStopName] = useState<string | null>(null);
  const [destinationStopName, setDestinationStopName] = useState<string | null>(
    null
  );
  const [boardingStop, setBoardingStop] = useState<any | null>(null);
  const [destinationStop, setDestinationStop] = useState<any | null>(null);
  const [bookingSegment, setBookingSegment] = useState<any | null>(null);

  // Auto-refresh when page is focused
  useFocusEffect(
    React.useCallback(() => {
      loadBooking();
    }, [])
  );

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (!id || typeof id !== 'string') {
        setError('Invalid booking ID');
        return;
      }

      const fetchedBooking = await fetchBooking(id);

      if (fetchedBooking) {
        setBooking(fetchedBooking);

        // For multi-stop routes, fetch route stops and booking segments
        if (
          !fetchedBooking.from_island_name ||
          !fetchedBooking.to_island_name
        ) {
          await loadMultiStopRouteData(fetchedBooking);
        } else {
          // Reset multi-stop data for regular routes
          setRouteStops([]);
          setBoardingStopName(null);
          setDestinationStopName(null);
          setBoardingStop(null);
          setDestinationStop(null);
          setBookingSegment(null);
        }
      } else {
        setError(`Booking with ID "${id}" not found`);
      }
    } catch (err) {
      setError('Failed to load booking details');
      console.error('Error loading booking:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMultiStopRouteData = async (booking: AdminBooking) => {
    try {
      // Fetch booking segments directly from booking_segments table
      const segmentData = await getBookingSegment(booking.id);

      if (segmentData) {
        // Store the full booking segment data
        setBookingSegment(segmentData);

        // Extract boarding and destination stop information from booking_segments
        const boardingStopData = segmentData.boarding_stop;
        const destinationStopData = segmentData.destination_stop;

        setBoardingStop(boardingStopData);
        setDestinationStop(destinationStopData);
        setBoardingStopName(boardingStopData?.island?.name || null);
        setDestinationStopName(destinationStopData?.island?.name || null);

        // Fetch trip to get route_id
        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('route_id')
          .eq('id', booking.trip_id)
          .single();

        if (!tripError && trip) {
          // Fetch all route stops
          const stops = await getRouteStops(trip.route_id);
          setRouteStops(stops);
        }
      }
    } catch (err: any) {
      // If booking segment doesn't exist, it's okay - not all bookings have segments
      if (err?.code !== 'PGRST116') {
        console.error('Error loading multi-stop route data:', err);
      }
    }
  };

  const handleRefresh = async () => {
    if (!id || typeof id !== 'string') return;
    await loadBooking(true);
  };

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (!booking) return;

    setUpdating(true);
    try {
      await updateBooking(booking.id, { status: newStatus });
      // Refresh the booking data
      const updatedBooking = await fetchBooking(booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
      }
      Alert.alert(
        'Success',
        `Booking status updated to ${newStatus.replace('_', ' ')}`
      );
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async (newStatus: string) => {
    if (!booking) return;

    setUpdating(true);
    try {
      await updateBooking(booking.id, { payment_status: newStatus });
      // Refresh the booking data
      const updatedBooking = await fetchBooking(booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
      }
      Alert.alert('Success', 'Payment status updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    if (!booking) return;
    router.push(`../booking/${booking.id}/modify` as any);
  };

  const handleViewCustomer = () => {
    if (!booking?.user_id) return;
    router.push(`../user/${booking.user_id}` as any);
  };

  const handleShareQR = () => {
    Alert.alert(
      'Share QR Code',
      'QR code sharing functionality will be implemented here.'
    );
  };

  const handleDownloadQR = () => {
    Alert.alert(
      'Download QR Code',
      'QR code download functionality will be implemented here.'
    );
  };

  const getBookingStatusInfo = (booking: AdminBooking) => {
    const status = booking.status;
    const paymentStatus = booking.payment_status;
    const passengerCount = booking.passenger_count || 1;
    const totalFare = booking.total_fare || 0;
    const baseFare = booking.trip_base_fare || 0;

    // Calculate actual payment amount
    let paymentAmount = 0;

    // Use the payment amount from the database view (which now properly aggregates payments)
    if (
      booking.payment_amount !== null &&
      booking.payment_amount !== undefined
    ) {
      paymentAmount = booking.payment_amount;
    } else {
      // Fallback: If no payment amount in database, infer based on status
      switch (booking.status) {
        case 'confirmed':
        case 'checked_in':
        case 'completed':
          // For confirmed bookings without payment records, assume they paid the total fare
          paymentAmount = totalFare;
          break;
        case 'pending_payment':
          paymentAmount = 0; // No payment yet
          break;
        case 'cancelled':
          paymentAmount = 0; // No payment for cancelled bookings
          break;
        default:
          paymentAmount = 0;
      }
    }

    // Calculate discount (difference between total fare and what was actually paid)
    const discount = Math.max(0, totalFare - paymentAmount);

    // Calculate any additional charges (if payment amount is more than total fare)
    const additionalCharges = Math.max(0, paymentAmount - totalFare);

    return {
      status,
      paymentStatus,
      passengerCount,
      totalFare,
      baseFare,
      paymentAmount,
      discount,
      additionalCharges,
      isAgentBooking: !!booking.agent_id,
    };
  };

  // Helper function to determine payment status
  const getPaymentStatus = (booking: AdminBooking) => {
    // If there's a specific payment status from the payments table, use it
    if (booking.payment_status) {
      return booking.payment_status;
    }

    // Otherwise, infer from booking status
    switch (booking.status) {
      case 'confirmed':
      case 'checked_in':
      case 'completed':
        return 'completed';
      case 'pending_payment':
        return 'pending';
      case 'cancelled':
        return 'cancelled'; // Changed from 'refunded' to 'cancelled' for payment cancellations
      default:
        return 'pending';
    }
  };

  // Helper function to determine payment amount
  const getPaymentAmount = (booking: AdminBooking) => {
    // If there's a specific payment amount from the payments table, use it
    if (booking.payment_amount && booking.payment_amount > 0) {
      return booking.payment_amount;
    }

    // Otherwise, infer from booking status
    switch (booking.status) {
      case 'confirmed':
      case 'checked_in':
      case 'completed':
        return booking.total_fare; // Assume full payment for confirmed bookings
      case 'pending_payment':
        return 0; // No payment yet
      case 'cancelled':
        return 0; // No payment for cancelled bookings
      default:
        return 0;
    }
  };

  if (!canViewBookings()) {
    return (
      <View style={styles.noPermissionContainer}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
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
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view booking details.
        </Text>
      </View>
    );
  }

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
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Booking Not Found',
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
        <Text style={styles.errorTitle}>Booking Not Found</Text>
        <Text style={styles.errorMessage}>
          {error ||
            'The requested booking could not be found. It may have been cancelled or removed.'}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => loadBooking()}>
          <RefreshCw size={16} color='#FFFFFF' />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const bookingInfo = getBookingStatusInfo(booking);
  const paymentStatus = getPaymentStatus(booking);
  const paymentAmount = getPaymentAmount(booking);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Booking #${booking.booking_number}`,
          headerShown: true,
          presentation: 'card',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
          headerRight: () =>
            canUpdateBookings() ? (
              <Pressable onPress={handleEdit} style={styles.editButton}>
                <Edit size={20} color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Overview Card */}
        <View style={styles.overviewCard}>
          {/* Header */}
          <View style={styles.overviewHeader}>
            <View style={styles.overviewHeaderLeft}>
              <Text style={styles.bookingId}>
                Booking #{booking.booking_number}
              </Text>
              <View style={styles.routeInfo}>
                <MapPin size={16} color={colors.primary} />
                <Text style={styles.routeName}>
                  {(() => {
                    // Prioritize booking's from_island_name and to_island_name
                    if (booking.from_island_name && booking.to_island_name) {
                      return `${booking.from_island_name} → ${booking.to_island_name}`;
                    }
                    // Fallback to boarding/destination stops for multi-stop routes
                    if (boardingStopName && destinationStopName) {
                      return `${boardingStopName} → ${destinationStopName}`;
                    }
                    // If we have route stops, show first and last
                    if (routeStops.length > 0) {
                      const firstStop = routeStops[0];
                      const lastStop = routeStops[routeStops.length - 1];
                      return `${firstStop.island_name || 'Unknown'} → ${lastStop.island_name || 'Unknown'}`;
                    }
                    return 'Route information unavailable';
                  })()}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {
                    formatDateTime(
                      booking.trip_travel_date || booking.created_at
                    ).split(' ')[0]
                  }
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {booking.trip_departure_time || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(booking.status)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(booking.status) },
                  ]}
                >
                  {booking.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${getPaymentStatusColor(paymentStatus)}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getPaymentStatusColor(paymentStatus) },
                  ]}
                >
                  {paymentStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Users size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {bookingInfo.passengerCount} passenger(s)
                </Text>
              </View>
              <View style={styles.detailItem}>
                <CreditCard size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {formatCurrency(bookingInfo.totalFare)}
                </Text>
              </View>
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {formatCurrency(
                  booking.total_fare || booking.trip_base_fare || 0
                )}
              </Text>
              <Text style={styles.metricLabel}>Total Fare</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {formatCurrency(bookingInfo.paymentAmount)}
              </Text>
              <Text style={styles.metricLabel}>Paid Amount</Text>
            </View>
            {bookingInfo.discount > 0 && (
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  -{formatCurrency(bookingInfo.discount)}
                </Text>
                <Text style={styles.metricLabel}>Discount</Text>
              </View>
            )}
            {bookingInfo.additionalCharges > 0 && (
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  +{formatCurrency(bookingInfo.additionalCharges)}
                </Text>
                <Text style={styles.metricLabel}>Additional Charges</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats Cards */}
        {/* <View style={styles.quickStatsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <DollarSign size={20} color={colors.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {formatCurrency(bookingInfo.paymentAmount)}
              </Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statTrend}>
              <TrendingUp size={16} color={colors.success} />
              <Text style={styles.statTrendText}>+8%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Users size={20} color={colors.primary} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{bookingInfo.passengerCount}</Text>
              <Text style={styles.statLabel}>Passengers</Text>
            </View>
            <View style={styles.statTrend}>
              <Percent size={16} color={colors.primary} />
              <Text style={styles.statTrendText}>100%</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <CheckCircle size={20} color={colors.warning} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {booking.status === 'confirmed'
                  ? 'Confirmed'
                  : booking.status.replace('_', ' ')}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <View style={styles.statTrend}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={styles.statTrendText}>Today</Text>
            </View>
          </View>
        </View> */}

        {/* Customer Information */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {booking.user_name || 'Customer Name'}
            </Text>
            <View style={styles.contactInfo}>
              {booking.user_email && (
                <View style={styles.contactRow}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.contactText}>{booking.user_email}</Text>
                </View>
              )}
              {booking.user_mobile && (
                <View style={styles.contactRow}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text style={styles.contactText}>{booking.user_mobile}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {/* QR Code Section */}
        <BookingQRCode
          booking={booking}
          onShare={handleShareQR}
          onDownload={handleDownloadQR}
        />

        {/* Trip Details Section */}
        <BookingTripDetails
          booking={booking}
          boardingStopName={boardingStopName}
          destinationStopName={destinationStopName}
          boardingStop={boardingStop}
          destinationStop={destinationStop}
          bookingSegment={bookingSegment}
        />

        {/* Payment Details Section */}
        <BookingPaymentDetails booking={booking} />

        {/* Passenger Details Section */}
        <BookingPassengerDetails booking={booking} />

        {/* Booking Actions Section */}
        <BookingActionsSection
          booking={booking}
          onStatusUpdate={handleStatusUpdate}
          onPaymentStatusUpdate={handlePaymentStatusUpdate}
          onViewCustomer={handleViewCustomer}
          canUpdateBookings={canUpdateBookings()}
          loading={updating}
        />

        {/* Additional booking information */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking ID:</Text>
            <Text style={styles.infoValue}>#{booking.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(booking.created_at)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>
              {booking.updated_at
                ? formatDateTime(booking.updated_at)
                : formatDateTime(booking.created_at)}
            </Text>
          </View>
          {booking.agent_id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agent:</Text>
              <Text style={styles.infoValue}>
                {booking.agent_name || 'N/A'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Helper functions for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return colors.success;
    case 'cancelled':
      return colors.danger;
    case 'completed':
      return colors.info;
    case 'pending_payment':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'failed':
      return colors.danger;
    case 'refunded':
      return colors.info;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: colors.backgroundSecondary,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
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
    // flex: 1,
  },
  bookingId: {
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
    // flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
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
  customerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  customerInfo: {
    marginLeft: 28,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
});
