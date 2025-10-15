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
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useTripStore } from '@/store/admin/tripStore';
import RoleGuard from '@/components/RoleGuard';
import {
  ArrowLeft,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
} from 'lucide-react-native';

interface Passenger {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  seat_number?: string;
  booking_id: string;
  booking_status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in';
  passenger_type: 'adult' | 'child' | 'infant';
  special_requirements?: string;
  checked_in_at?: string;
}

export default function TripPassengersPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchTrip } = useOperationsStore();
  const { fetchTripPassengers } = useTripStore();
  const { canViewTrips } = useAdminPermissions();

  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const fetchPassengers = async () => {
    if (!id) return;

    try {
      const data = await fetchTripPassengers(id);

      // Transform the data to match our interface
      const transformedPassengers: Passenger[] = (data || []).map(
        (passenger: any) => ({
          id: passenger.id,
          name: passenger.passenger_name,
          email: passenger.bookings?.user_profiles?.email,
          phone:
            passenger.passenger_contact_number ||
            passenger.bookings?.user_profiles?.mobile_number,
          seat_number: passenger.seats?.seat_number,
          booking_id: passenger.booking_id,
          booking_status: passenger.bookings?.status,
          passenger_type: 'adult', // Default since it's not in the schema
          special_requirements: passenger.special_assistance_request,
          checked_in_at:
            passenger.bookings?.status === 'checked_in'
              ? new Date().toISOString()
              : undefined,
        })
      );

      setPassengers(transformedPassengers);
    } catch (error) {
      console.error('Error fetching passengers:', error);
      // Fall back to empty array if no passengers found
      setPassengers([]);
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

      // Fetch real passenger data
      await fetchPassengers();
    } catch (error) {
      Alert.alert('Error', 'Failed to load passenger data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleCheckIn = (passengerId: string) => {
    Alert.alert('Check In Passenger', 'Mark this passenger as checked in?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check In',
        onPress: () => {
          setPassengers(prev =>
            prev.map(p =>
              p.id === passengerId
                ? {
                    ...p,
                    booking_status: 'checked_in',
                    checked_in_at: new Date().toISOString(),
                  }
                : p
            )
          );
        },
      },
    ]);
  };

  const handleExportManifest = () => {
    Alert.alert('Export Manifest', 'Choose export format:', [
      { text: 'PDF', onPress: () => console.log('Export PDF') },
      { text: 'Excel', onPress: () => console.log('Export Excel') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'checked_in':
        return {
          color: colors.success,
          label: 'Checked In',
          icon: CheckCircle,
        };
      case 'confirmed':
        return { color: colors.primary, label: 'Confirmed', icon: Clock };
      case 'pending':
        return { color: colors.warning, label: 'Pending', icon: AlertTriangle };
      case 'cancelled':
        return {
          color: colors.danger,
          label: 'Cancelled',
          icon: AlertTriangle,
        };
      default:
        return {
          color: colors.textSecondary,
          label: status,
          icon: AlertTriangle,
        };
    }
  };

  const filteredPassengers = passengers.filter(
    passenger =>
      passenger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      passenger.booking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      passenger.seat_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPassengerItem = ({ item }: { item: Passenger }) => {
    const statusInfo = getStatusInfo(item.booking_status);
    const StatusIcon = statusInfo.icon;

    return (
      <View style={styles.passengerCard}>
        <View style={styles.passengerHeader}>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{item.name}</Text>
            <Text style={styles.bookingId}>Booking: {item.booking_id}</Text>
          </View>
          <View style={styles.passengerActions}>
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
          </View>
        </View>

        <View style={styles.passengerDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                Seat {item.seat_number || 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={styles.detailText}>{item.passenger_type}</Text>
            </View>
          </View>

          {(item.email || item.phone) && (
            <View style={styles.detailRow}>
              {item.phone && (
                <View style={styles.detailItem}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{item.phone}</Text>
                </View>
              )}
              {item.email && (
                <View style={styles.detailItem}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{item.email}</Text>
                </View>
              )}
            </View>
          )}

          {item.special_requirements && (
            <View style={styles.specialRequirements}>
              <Text style={styles.specialRequirementsText}>
                Special: {item.special_requirements}
              </Text>
            </View>
          )}

          {item.booking_status === 'confirmed' && (
            <Pressable
              style={styles.checkInButton}
              onPress={() => handleCheckIn(item.id)}
            >
              <CheckCircle size={16} color={colors.primary} />
              <Text style={styles.checkInButtonText}>Check In</Text>
            </Pressable>
          )}
        </View>
      </View>
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
        <Text style={styles.loadingText}>Loading passengers...</Text>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin', 'captain']}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Trip Passengers',
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
              <Pressable
                onPress={handleExportManifest}
                style={styles.exportButton}
              >
                <Download size={20} color={colors.primary} />
              </Pressable>
            ),
          }}
        />

        {/* Header Stats */}
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{passengers.length}</Text>
            <Text style={styles.statLabel}>Total Passengers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {passengers.filter(p => p.booking_status === 'checked_in').length}
            </Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {passengers.filter(p => p.booking_status === 'confirmed').length}
            </Text>
            <Text style={styles.statLabel}>Pending Check-in</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search passengers...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Passenger List */}
        <FlatList
          data={filteredPassengers}
          renderItem={renderPassengerItem}
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
  headerStats: {
    flexDirection: 'row',
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
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
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  passengerCard: {
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
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  passengerActions: {
    alignItems: 'flex-end',
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
  passengerDetails: {
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
  specialRequirements: {
    backgroundColor: colors.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  specialRequirementsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  checkInButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
