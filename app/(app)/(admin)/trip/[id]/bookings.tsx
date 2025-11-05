import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useTripStore } from '@/store/admin/tripStore';
import RoleGuard from '@/components/RoleGuard';
import { formatCurrency } from '@/utils/currencyUtils';
import {
  ArrowLeft,
  Search,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Users,
  Filter,
  Download,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react-native';

interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  passenger_count: number;
  total_fare: number;
  status: 'reserved' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?:
    | 'gateway'
    | 'cash'
    | 'bank_transfer'
    | 'card'
    | 'mobile_money';
  booking_date: string;
  special_requests?: string;
  agent_booking?: boolean;
  agent_name?: string;
}

export default function TripBookingsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchTrip } = useOperationsStore();
  const { fetchTripBookings } = useTripStore();
  const { canViewTrips, canManageTrips } = useAdminPermissions();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const fetchBookings = async () => {
    if (!id) return;

    try {
      const data = await fetchTripBookings(id);

      // Transform the data to match our interface
      const transformedBookings: Booking[] = (data || []).map(
        (booking: any) => ({
          id: booking.id,
          booking_reference: booking.booking_number,
          customer_name: booking.user_profiles?.full_name || 'Unknown Customer',
          customer_email: booking.user_profiles?.email,
          customer_phone: booking.user_profiles?.mobile_number,
          passenger_count: booking.passengers?.length || 0,
          total_fare: booking.total_fare || 0,
          status: booking.status,
          payment_status: 'pending', // Default since payment_status doesn't exist in schema
          payment_method: booking.payment_method_type,
          booking_date: booking.created_at,
          special_requests: undefined, // Not available in schema
          agent_booking: booking.user_profiles?.role === 'agent',
          agent_name:
            booking.user_profiles?.role === 'agent'
              ? booking.user_profiles?.full_name
              : undefined,
        })
      );

      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // Fall back to empty array if no bookings found
      setBookings([]);
    }
  };

  const loadData = async (showRefreshIndicator = false) => {
    if (!id) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const tripData = await fetchTrip(id);
      setTrip(tripData);

      // Fetch real booking data
      await fetchBookings();
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: colors.success, label: 'Confirmed', icon: CheckCircle };
      case 'pending':
        return { color: colors.warning, label: 'Pending', icon: Clock };
      case 'paid':
        return { color: colors.primary, label: 'Paid', icon: CheckCircle };
      case 'cancelled':
        return { color: colors.danger, label: 'Cancelled', icon: XCircle };
      case 'refunded':
        return { color: colors.info, label: 'Refunded', icon: RefreshCw };
      case 'failed':
        return { color: colors.danger, label: 'Failed', icon: AlertTriangle };
      default:
        return {
          color: colors.textSecondary,
          label: status,
          icon: AlertTriangle,
        };
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'card':
        return CreditCard;
      case 'cash':
        return DollarSign;
      case 'bank_transfer':
        return ArrowLeft;
      case 'mobile_money':
        return Phone;
      default:
        return CreditCard;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booking_reference
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking.customer_email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking.customer_phone?.includes(searchQuery);

    const matchesFilter =
      filterStatus === 'all' || booking.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const bookingStats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'reserved').length,
    totalRevenue: bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + b.total_fare, 0),
    totalPassengers: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.passenger_count, 0),
  };

  const handleBookingAction = (booking: Booking, action: string) => {
    switch (action) {
      case 'view':
        setSelectedBooking(booking);
        setShowBookingDetails(true);
        break;
      case 'confirm':
        Alert.alert(
          'Confirm Booking',
          `Confirm booking ${booking.booking_reference}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm',
              onPress: () => {
                setBookings(prev =>
                  prev.map(b =>
                    b.id === booking.id ? { ...b, status: 'confirmed' } : b
                  )
                );
              },
            },
          ]
        );
        break;
      case 'cancel':
        Alert.alert(
          'Cancel Booking',
          `Cancel booking ${booking.booking_reference}? This action cannot be undone.`,
          [
            { text: 'Keep Booking', style: 'cancel' },
            {
              text: 'Cancel Booking',
              style: 'destructive',
              onPress: () => {
                setBookings(prev =>
                  prev.map(b =>
                    b.id === booking.id ? { ...b, status: 'cancelled' } : b
                  )
                );
              },
            },
          ]
        );
        break;
    }
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const statusInfo = getStatusInfo(item.status);
    const paymentStatusInfo = getStatusInfo(item.payment_status);
    const StatusIcon = statusInfo.icon;
    const PaymentIcon = getPaymentMethodIcon(item.payment_method);

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => handleBookingAction(item, 'view')}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingReference}>
              {item.booking_reference}
            </Text>
            <Text style={styles.customerName}>{item.customer_name}</Text>
          </View>
          <View style={styles.bookingActions}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusInfo.color}20` },
              ]}
            >
              <StatusIcon size={12} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            <Pressable
              style={styles.moreButton}
              onPress={() => {
                Alert.alert(
                  'Booking Actions',
                  `Actions for ${item.booking_reference}`,
                  [
                    {
                      text: 'View Details',
                      onPress: () => handleBookingAction(item, 'view'),
                    },
                    ...(item.status === 'reserved'
                      ? [
                          {
                            text: 'Confirm',
                            onPress: () => handleBookingAction(item, 'confirm'),
                          },
                        ]
                      : []),
                    ...(item.status !== 'cancelled'
                      ? [
                          {
                            text: 'Cancel',
                            style: 'destructive' as const,
                            onPress: () => handleBookingAction(item, 'cancel'),
                          },
                        ]
                      : []),
                    { text: 'Close', style: 'cancel' as const },
                  ]
                );
              }}
            >
              <MoreHorizontal size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {item.passenger_count} passengers
              </Text>
            </View>
            <View style={styles.detailItem}>
              <DollarSign size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatCurrency(item.total_fare, 'MVR')}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <PaymentIcon size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {item.payment_method || 'N/A'} • {paymentStatusInfo.label}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {new Date(item.booking_date).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {(item.customer_phone || item.customer_email) && (
            <View style={styles.detailRow}>
              {item.customer_phone && (
                <View style={styles.detailItem}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{item.customer_phone}</Text>
                </View>
              )}
              {item.customer_email && (
                <View style={styles.detailItem}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{item.customer_email}</Text>
                </View>
              )}
            </View>
          )}

          {item.agent_booking && (
            <View style={styles.agentInfo}>
              <Text style={styles.agentText}>Agent: {item.agent_name}</Text>
            </View>
          )}

          {item.special_requests && (
            <View style={styles.specialRequests}>
              <Text style={styles.specialRequestsText}>
                Note: {item.special_requests}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
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
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin', 'captain']}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Trip Bookings',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
            headerRight: () => (
              <Pressable onPress={() => {}} style={styles.exportButton}>
                <Download size={20} color={colors.primary} />
              </Pressable>
            ),
          }}
        />

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{bookingStats.total}</Text>
              <Text style={styles.summaryLabel}>Total Bookings</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{bookingStats.confirmed}</Text>
              <Text style={styles.summaryLabel}>Confirmed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {bookingStats.totalPassengers}
              </Text>
              <Text style={styles.summaryLabel}>Passengers</Text>
            </View>
          </View>
          <View style={styles.revenueContainer}>
            <Text style={styles.revenueValue}>
              {formatCurrency(bookingStats.totalRevenue, 'MVR')}
            </Text>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search bookings...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <Pressable
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Bookings List */}
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType='fade'
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <Text style={styles.filterTitle}>Filter Bookings</Text>
              {['all', 'confirmed', 'pending', 'cancelled'].map(status => (
                <Pressable
                  key={status}
                  style={[
                    styles.filterOption,
                    filterStatus === status && styles.filterOptionSelected,
                  ]}
                  onPress={() => {
                    setFilterStatus(status);
                    setShowFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterStatus === status &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {status === 'all'
                      ? 'All Bookings'
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
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
  backButton: {
    padding: 8,
  },
  exportButton: {
    padding: 8,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryContainer: {
    backgroundColor: colors.card,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  revenueContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}30`,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 4,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingReference: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  agentInfo: {
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  agentText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  specialRequests: {
    backgroundColor: colors.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  specialRequestsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  filterOptionText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
