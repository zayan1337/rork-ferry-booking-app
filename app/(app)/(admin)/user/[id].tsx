import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';

import { UserProfile } from '@/types/userManagement';
import { useUserStore } from '@/store/admin/userStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import EmptyState from '@/components/admin/EmptyState';
import {
  AlertTriangle,
  ArrowLeft,
  Shield,
  MapPin,
  Clock,
  Ship,
  Calendar,
  DollarSign,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import {
  UserDetailsHeader,
  UserStatsSection,
  UserInfoSection,
  UserActionsSection,
  UserSystemInfoSection,
} from '@/components/admin/users';

const { width: screenWidth } = Dimensions.get('window');

export default function UserDetailsPage() {
  const { id } = useLocalSearchParams();
  const {
    currentUser,
    fetchById,
    update,
    delete: deleteUser,
    loading: storeLoading,
    error: storeError,
  } = useUserStore();
  const { canViewUsers, canUpdateUsers, canDeleteUsers } =
    useAdminPermissions();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [passengerTripData, setPassengerTripData] = useState<any>(null);
  const [islandNames, setIslandNames] = useState<{
    from: string;
    to: string;
  } | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError(null);
        setPassengerTripData(null);
        setIslandNames(null);

        if (!id || typeof id !== 'string') {
          setError('Invalid user ID');
          return;
        }

        // Try to fetch user from the store
        const fetchedUser = await fetchById(id);

        if (fetchedUser) {
          setUser(fetchedUser);

          // If it's a passenger, fetch their trip details
          if (fetchedUser.role === 'passenger') {
            await loadPassengerTripData(fetchedUser.id);
          }
        } else {
          setError(`User with ID "${id}" not found`);
        }
      } catch (err) {
        setError('Failed to load user details');
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, fetchById]);

  const loadPassengerTripData = async (passengerId: string) => {
    try {
      // First, get the passenger's booking_id from the passengers table
      const { data: passengerData, error: passengerError } = await supabase
        .from('passengers')
        .select('booking_id')
        .eq('id', passengerId)
        .single();

      if (passengerError) throw passengerError;

      if (!passengerData?.booking_id) {
        return;
      }

      // Now fetch the complete trip details using the operations_trips_view
      const { data, error } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq(
          'id',
          (
            await supabase
              .from('bookings')
              .select('trip_id')
              .eq('id', passengerData.booking_id)
              .single()
          ).data?.trip_id
        )
        .single();

      if (error) throw error;

      // Transform the data to match the expected structure
      const transformedData = {
        id: passengerId,
        booking_id: passengerData.booking_id,
        bookings: [
          {
            id: passengerData.booking_id,
            total_fare: (
              await supabase
                .from('bookings')
                .select('total_fare, status, created_at')
                .eq('id', passengerData.booking_id)
                .single()
            ).data,
            trips: data,
          },
        ],
      };

      setPassengerTripData(transformedData);

      // Set island names directly from the view data
      if (data) {
        setIslandNames({
          from: data.from_island_name || 'Unknown',
          to: data.to_island_name || 'Unknown',
        });
      }
    } catch (error) {
      console.error('Error loading passenger trip data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (id && typeof id === 'string') {
        const fetchedUser = await fetchById(id);
        if (fetchedUser) {
          setUser(fetchedUser);

          // If it's a passenger, refresh trip data too
          if (fetchedUser.role === 'passenger') {
            await loadPassengerTripData(fetchedUser.id);
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusChange = () => {
    if (!user) return;
    // Show status change modal or navigate to status management
    Alert.alert('Change User Status', `Current status: ${user.status}`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Activate',
        onPress: () => updateUserStatus('active'),
      },
      {
        text: 'Suspend',
        onPress: () => updateUserStatus('suspended'),
      },
      {
        text: 'Block',
        onPress: () => updateUserStatus('inactive'),
      },
    ]);
  };

  const updateUserStatus = async (
    newStatus: 'active' | 'inactive' | 'suspended'
  ) => {
    if (!user) return;

    try {
      await update(user.id, { status: newStatus });
      Alert.alert('Success', `User status updated to ${newStatus}`, [
        {
          text: 'OK',
          onPress: () => handleRefresh(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleViewActivity = () => {
    if (!user) return;
    router.push(`../user/${user.id}/activity` as any);
  };

  const handleViewPermissions = () => {
    if (!user) return;
    router.push(`../user/${user.id}/permissions` as any);
  };

  const handleViewBookings = () => {
    if (!user) return;
    router.push(`../user/${user.id}/bookings` as any);
  };

  const handleViewClients = () => {
    if (!user) return;
    router.push(`../user/${user.id}/clients` as any);
  };

  const handleViewTransactions = () => {
    if (!user) return;
    router.push(`../user/${user.id}/transactions` as any);
  };

  const handleViewTrips = async () => {
    if (!user) return;

    // For passengers, we need to find their associated trip/booking
    if (user.role === 'passenger') {
      try {
        // Find the passenger's booking to get the trip ID
        const { data: passengerData, error } = await supabase
          .from('passengers')
          .select(
            `
            id,
            booking_id,
            bookings!inner(
              trip_id
            )
          `
          )
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (
          passengerData &&
          passengerData.bookings &&
          Array.isArray(passengerData.bookings) &&
          passengerData.bookings[0]?.trip_id
        ) {
          // Navigate to the trip details page
          router.push(`../trip/${passengerData.bookings[0].trip_id}` as any);
        } else {
          Alert.alert(
            'No Trip Found',
            'This passenger is not associated with any trip.'
          );
        }
      } catch (error) {
        console.error('Error finding passenger trip:', error);
        Alert.alert('Error', "Failed to find passenger's trip details.");
      }
    } else {
      // For other users, navigate to their trips list
      router.push(`../user/${user.id}/trips` as any);
    }
  };

  const handleViewVessel = () => {
    if (!user) return;
    // For now, navigate to vessels list since vessel_id might not be available
    router.push(`../vessels` as any);
  };

  const handleViewRoutes = () => {
    if (!user) return;
    router.push(`../routes?captain=${user.id}` as any);
  };

  // Calculate user statistics based on role
  const userStats = useMemo(() => {
    if (!user) return null;

    const baseStats = {
      totalBookings: user.total_bookings || 0,
      totalSpent: user.total_spent || 0,
      totalTrips: user.total_trips || 0,
      averageRating: user.average_rating || 0,
      walletBalance: user.wallet_balance || 0,
      creditScore: user.credit_score || 0,
      loyaltyPoints: user.loyalty_points || 0,
    };

    switch (user.role) {
      case 'customer':
        return {
          ...baseStats,
          // Customer-specific stats
          activeBookings: Math.floor(baseStats.totalBookings * 0.3),
          completedTrips: Math.floor(baseStats.totalTrips * 0.8),
          pendingPayments: Math.floor(baseStats.totalSpent * 0.1),
        } as typeof baseStats & {
          activeBookings: number;
          completedTrips: number;
          pendingPayments: number;
        };
      case 'agent':
        return {
          ...baseStats,
          // Agent-specific stats
          totalClients: Math.floor(Math.random() * 50) + 10,
          totalCommissions: Math.floor(baseStats.totalSpent * 0.05),
          activeBookings: Math.floor(baseStats.totalBookings * 0.4),
          creditLimit: 10000,
          availableCredit: 7500,
        } as typeof baseStats & {
          totalClients: number;
          totalCommissions: number;
          activeBookings: number;
          creditLimit: number;
          availableCredit: number;
        };
      case 'admin':
        return {
          ...baseStats,
          // Admin-specific stats
          managedUsers: Math.floor(Math.random() * 200) + 50,
          systemActions: Math.floor(Math.random() * 1000) + 200,
          lastLogin: user.last_login || new Date().toISOString(),
        } as typeof baseStats & {
          managedUsers: number;
          systemActions: number;
          lastLogin: string;
        };
      case 'passenger':
        return {
          ...baseStats,
          // Passenger-specific stats
          totalTrips: baseStats.totalBookings,
          completedTrips: Math.floor(baseStats.totalBookings * 0.9),
          upcomingTrips: Math.floor(baseStats.totalBookings * 0.1),
        } as typeof baseStats & {
          totalTrips: number;
          completedTrips: number;
          upcomingTrips: number;
        };
      case 'captain':
        return {
          ...baseStats,
          // Captain-specific stats
          totalRoutes: Math.floor(Math.random() * 20) + 5,
          totalTrips: Math.floor(Math.random() * 100) + 20,
          averageRating: 4.5 + Math.random() * 0.5,
          experienceYears: Math.floor(Math.random() * 10) + 5,
        } as typeof baseStats & {
          totalRoutes: number;
          totalTrips: number;
          averageRating: number;
          experienceYears: number;
        };
      default:
        return baseStats;
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Error',
            headerShown: true,
          }}
        />
        <EmptyState
          icon={<AlertTriangle size={48} color={colors.danger} />}
          title='Error'
          message={error}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'User Not Found',
            headerShown: true,
          }}
        />
        <EmptyState
          icon={<AlertTriangle size={48} color={colors.warning} />}
          title='User Not Found'
          message='The requested user could not be found.'
        />
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: user.name || 'User Details',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View style={styles.headerActions}>
                {canUpdateUsers() && (
                  <TouchableOpacity
                    onPress={handleStatusChange}
                    style={styles.headerActionButton}
                  >
                    <Shield size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ),
          }}
        />

        <ScrollView
          style={styles.scrollView}
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
          {/* User Header */}
          <UserDetailsHeader user={user} />

          {/* Quick Stats */}
          {userStats && <UserStatsSection user={user} userStats={userStats} />}

          {/* User Information */}
          <UserInfoSection user={user} />

          {/* Role-Specific Actions */}
          <UserActionsSection
            user={user}
            onViewBookings={handleViewBookings}
            onViewActivity={handleViewActivity}
            onViewPermissions={handleViewPermissions}
            onViewClients={handleViewClients}
            onViewTransactions={handleViewTransactions}
            onViewTrips={handleViewTrips}
            onViewVessel={handleViewVessel}
            onViewRoutes={handleViewRoutes}
          />

          {/* System Information */}
          <UserSystemInfoSection user={user} />

          {/* Passenger Trip Details */}
          {user.role === 'passenger' && passengerTripData && (
            <View style={styles.tripDetailsCard}>
              <Text style={styles.sectionTitle}>Trip Details</Text>

              {passengerTripData.bookings &&
                Array.isArray(passengerTripData.bookings) &&
                passengerTripData.bookings[0] && (
                  <View style={styles.tripInfo}>
                    {/* Trip Route */}
                    <View style={styles.tripRoute}>
                      <MapPin size={16} color={colors.primary} />
                      <Text style={styles.tripRouteText}>
                        {islandNames?.from || 'Unknown'} →{' '}
                        {islandNames?.to || 'Unknown'}
                      </Text>
                    </View>

                    {/* Trip Details Grid */}
                    <View style={styles.tripDetailsGrid}>
                      <View style={styles.tripDetailItem}>
                        <Calendar size={16} color={colors.textSecondary} />
                        <Text style={styles.tripDetailLabel}>Travel Date</Text>
                        <Text style={styles.tripDetailValue}>
                          {passengerTripData.bookings[0].trips?.travel_date
                            ? new Date(
                                passengerTripData.bookings[0].trips.travel_date
                              ).toLocaleDateString()
                            : 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.tripDetailItem}>
                        <Clock size={16} color={colors.textSecondary} />
                        <Text style={styles.tripDetailLabel}>Departure</Text>
                        <Text style={styles.tripDetailValue}>
                          {passengerTripData.bookings[0].trips
                            ?.departure_time || 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.tripDetailItem}>
                        <Ship size={16} color={colors.textSecondary} />
                        <Text style={styles.tripDetailLabel}>Vessel</Text>
                        <Text style={styles.tripDetailValue}>
                          {passengerTripData.bookings[0].trips?.vessel_name ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.tripDetailItem}>
                        <DollarSign size={16} color={colors.textSecondary} />
                        <Text style={styles.tripDetailLabel}>Fare</Text>
                        <Text style={styles.tripDetailValue}>
                          MVR{' '}
                          {passengerTripData.bookings[0].total_fare
                            ?.total_fare || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Booking Status */}
                    <View style={styles.bookingStatus}>
                      <Text style={styles.bookingStatusLabel}>
                        Booking Status:
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              passengerTripData.bookings[0].total_fare
                                ?.status === 'confirmed'
                                ? `${colors.success}20`
                                : `${colors.warning}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                passengerTripData.bookings[0].total_fare
                                  ?.status === 'confirmed'
                                  ? colors.success
                                  : colors.warning,
                            },
                          ]}
                        >
                          {passengerTripData.bookings[0].total_fare?.status
                            ?.charAt(0)
                            .toUpperCase() +
                            passengerTripData.bookings[0].total_fare?.status?.slice(
                              1
                            ) || 'Unknown'}
                        </Text>
                      </View>
                    </View>

                    {/* View Full Trip Details Button */}
                    <TouchableOpacity
                      style={styles.viewTripButton}
                      onPress={() => {
                        if (passengerTripData.bookings[0].trips?.id) {
                          router.push(
                            `../trip/${passengerTripData.bookings[0].trips.id}` as any
                          );
                        }
                      }}
                    >
                      <Text style={styles.viewTripButtonText}>
                        View Full Trip Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          )}

          {/* Status Management */}
          <View style={styles.actionsContainer}>
            {canUpdateUsers() && (
              <Button
                title='Manage Status'
                onPress={handleStatusChange}
                variant='primary'
                icon={<Shield size={20} color={colors.white} />}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 12,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  actionsContainer: {
    gap: 16,
    marginTop: 8,
  },
  // Trip Details Styles
  tripDetailsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  tripInfo: {
    gap: 16,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tripRouteText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tripDetailsGrid: {
    gap: 12,
  },
  tripDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  tripDetailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 80,
  },
  tripDetailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  bookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  bookingStatusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewTripButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  viewTripButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
