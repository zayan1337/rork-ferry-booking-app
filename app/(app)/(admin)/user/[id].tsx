import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Text,
  Pressable,
} from 'react-native';
import {
  Stack,
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
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
  Edit,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';

import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import {
  UserDetailsHeader,
  UserStatsSection,
  UserInfoSection,
  UserActionsSection,
  UserSystemInfoSection,
  UserStatusManager,
} from '@/components/admin/users';
import FreeTicketsModal from '@/components/admin/users/FreeTicketsModal';
import { useAlertContext } from '@/components/AlertProvider';

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
  const { showError, showSuccess, showConfirmation, showInfo } =
    useAlertContext();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [passengerTripData, setPassengerTripData] = useState<any>(null);
  const [islandNames, setIslandNames] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [userStatsData, setUserStatsData] = useState<any>(null);
  const [freeTicketsModalVisible, setFreeTicketsModalVisible] = useState(false);
  const [statusManagerVisible, setStatusManagerVisible] = useState(false);

  const loadPassengerTripData = useCallback(async (passengerId: string) => {
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

      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('trip_id, total_fare, status, created_at')
        .eq('id', passengerData.booking_id)
        .single();

      if (bookingError) throw bookingError;

      if (!bookingData?.trip_id) {
        return;
      }

      // Fetch trip details using operations_trips_view
      const { data: tripData, error: tripError } = await supabase
        .from('operations_trips_view')
        .select('*')
        .eq('id', bookingData.trip_id)
        .single();

      if (tripError) throw tripError;

      // Fetch booking segments to get boarding and dropoff islands
      const { data: segmentData, error: segmentError } = await supabase
        .from('booking_segments')
        .select(
          `
          boarding_stop:route_stops!booking_segments_boarding_stop_id_fkey(
            islands(name, zone)
          ),
          destination_stop:route_stops!booking_segments_destination_stop_id_fkey(
            islands(name, zone)
          )
        `
        )
        .eq('booking_id', passengerData.booking_id)
        .single();

      // Set island names from segments if available, otherwise from trip data
      let fromIsland = tripData?.from_island_name || 'Unknown';
      let toIsland = tripData?.to_island_name || 'Unknown';

      if (!segmentError && segmentData) {
        const boardingStop: any = (segmentData as any).boarding_stop;
        const destinationStop: any = (segmentData as any).destination_stop;

        if (boardingStop?.islands) {
          const island = Array.isArray(boardingStop.islands)
            ? boardingStop.islands[0]
            : boardingStop.islands;
          fromIsland = island?.name || fromIsland;
        }

        if (destinationStop?.islands) {
          const island = Array.isArray(destinationStop.islands)
            ? destinationStop.islands[0]
            : destinationStop.islands;
          toIsland = island?.name || toIsland;
        }
      }

      setIslandNames({
        from: fromIsland,
        to: toIsland,
      });

      // Transform the data to match the expected structure
      const transformedData = {
        booking_id: passengerData.booking_id,
        booking: {
          id: passengerData.booking_id,
          total_fare: bookingData.total_fare || 0,
          status: bookingData.status || 'unknown',
          created_at: bookingData.created_at,
        },
        trip: tripData,
      };

      setPassengerTripData(transformedData);
    } catch (error) {
      console.error('Error loading passenger trip data:', error);
    }
  }, []);

  const fetchUserStats = useCallback(
    async (userId: string, userRole: string) => {
      try {
        const stats: any = {};

        switch (userRole) {
          case 'agent': {
            // Fetch agent profile, user profile, and bookings data
            const [
              profileData,
              allBookingsData,
              commissionBookingsData,
              agentClientsData,
            ] = await Promise.all([
              supabase
                .from('user_profiles')
                .select(
                  'credit_ceiling, credit_balance, agent_discount, free_tickets_allocation, free_tickets_remaining'
                )
                .eq('id', userId)
                .single(),
              // Fetch ALL bookings for active bookings count
              supabase
                .from('bookings')
                .select('id, status, user_id, agent_client_id')
                .eq('agent_id', userId),
              // Fetch bookings with trip data for commission calculation (only confirmed/checked_in/completed)
              // Note: agent_discount is in user_profiles, not bookings table - we use profileData for that
              supabase
                .from('bookings')
                .select(
                  'id, status, total_fare, trip_id, trips(id, fare_multiplier, route_id, routes(id, base_fare)), passengers(id), booking_segments(fare_amount)'
                )
                .eq('agent_id', userId)
                .in('status', ['confirmed', 'checked_in', 'completed'])
                .not('total_fare', 'is', null),
              // Count all clients from agent_clients table
              supabase
                .from('agent_clients')
                .select('id', { count: 'exact', head: true })
                .eq('agent_id', userId),
            ]);

            const allBookings = allBookingsData.data || [];
            let commissionBookings = commissionBookingsData.data || [];

            // Check for query errors
            if (allBookingsData.error) {
              console.error(
                '[Agent Stats] Error fetching all bookings:',
                allBookingsData.error
              );
            }
            if (commissionBookingsData.error) {
              console.error(
                '[Agent Stats] Error fetching commission bookings:',
                commissionBookingsData.error
              );
            }

            // If no bookings found with trips, fetch confirmed bookings without trip requirement
            // We can calculate commission using total_fare and discount even without trip data
            if (commissionBookings.length === 0 && allBookings.length > 0) {
              // Fetch confirmed bookings directly
              const { data: confirmedBookings, error: confirmedError } =
                await supabase
                  .from('bookings')
                  .select('id, status, total_fare, trip_id, passengers(id)')
                  .eq('agent_id', userId)
                  .in('status', ['confirmed', 'checked_in', 'completed'])
                  .not('total_fare', 'is', null);

              if (
                !confirmedError &&
                confirmedBookings &&
                confirmedBookings.length > 0
              ) {
                // Use these bookings for commission calculation
                // We'll calculate commission using total_fare and agent discount
                commissionBookings = confirmedBookings.map((b: any) => ({
                  ...b,
                  trips: null,
                  booking_segments: [],
                }));
              } else if (confirmedError) {
                console.error(
                  '[Agent Stats] Error fetching confirmed bookings:',
                  confirmedError
                );
              }
            }

            // Client count should be from agent_clients table (simple count)
            stats.totalClients = agentClientsData.count || 0;

            // Calculate commission from confirmed/checked_in/completed bookings
            // Commission = discount amount = (original fare - discounted fare)
            // Note: total_fare is usually the discounted fare that client pays
            // Original fare = route base_fare * fare_multiplier * passengers (or from booking_segments)
            let totalCommission = 0;
            const agentDiscount = Number(profileData.data?.agent_discount || 0);

            // Calculate commission using the same logic as agent pages
            // Commission = originalFare - discountedFare (total_fare)
            commissionBookings.forEach((booking: any, index: number) => {
              try {
                const trip = booking.trips
                  ? Array.isArray(booking.trips)
                    ? booking.trips[0]
                    : booking.trips
                  : null;
                const route = trip?.routes
                  ? Array.isArray(trip.routes)
                    ? trip.routes[0]
                    : trip.routes
                  : null;

                const passengers = Array.isArray(booking.passengers)
                  ? booking.passengers.length
                  : booking.passengers
                    ? 1
                    : 0;

                const discountedFare = Number(booking.total_fare || 0); // This is what client pays (after discount)
                const fareMultiplier = Number(trip?.fare_multiplier || 1);
                const routeBaseFare = Number(route?.base_fare || 0);
                const multipliedFare = routeBaseFare * fareMultiplier;

                // Calculate original fare (before discount) - same logic as agent store
                let originalFare = discountedFare; // Default fallback

                // Method 1: Reverse-calculate from discount rate if available
                if (
                  agentDiscount > 0 &&
                  agentDiscount < 100 &&
                  discountedFare > 0
                ) {
                  // Reverse calculation: discountedFare = originalFare * (1 - discountRate/100)
                  // Therefore: originalFare = discountedFare / (1 - discountRate/100)
                  const reverseCalculated =
                    discountedFare / (1 - agentDiscount / 100);
                  // Only use if it's reasonable (not too far off)
                  if (
                    reverseCalculated >= discountedFare &&
                    reverseCalculated <= discountedFare * 2
                  ) {
                    originalFare = reverseCalculated;
                  }
                }

                // Method 2: Use booking_segments fare_amount if available
                const segments = Array.isArray(booking.booking_segments)
                  ? booking.booking_segments
                  : booking.booking_segments
                    ? [booking.booking_segments]
                    : [];

                if (segments.length > 0) {
                  const segmentFare = Number(
                    segments[0]?.fare_amount ||
                      segments.reduce(
                        (sum: number, seg: any) =>
                          sum + Number(seg.fare_amount || 0),
                        0
                      )
                  );

                  // Check if segment fare per passenger
                  if (passengers > 0 && segmentFare > 0) {
                    const totalSegmentFare = segmentFare * passengers;
                    if (
                      totalSegmentFare >= discountedFare &&
                      totalSegmentFare > originalFare
                    ) {
                      originalFare = totalSegmentFare;
                    } else if (
                      segmentFare >= discountedFare &&
                      segmentFare > originalFare
                    ) {
                      originalFare = segmentFare;
                    } else if (
                      originalFare === discountedFare &&
                      totalSegmentFare > discountedFare
                    ) {
                      originalFare = totalSegmentFare;
                    }
                  } else if (
                    segmentFare >= discountedFare &&
                    segmentFare > originalFare
                  ) {
                    originalFare = segmentFare;
                  }
                }

                // Method 3: Calculate from trip data (route base_fare × multiplier × passengers)
                if (trip && passengers > 0 && multipliedFare > 0) {
                  const calculatedFare = passengers * multipliedFare;
                  if (
                    calculatedFare >= discountedFare &&
                    calculatedFare > originalFare
                  ) {
                    originalFare = calculatedFare;
                  } else if (
                    originalFare === discountedFare &&
                    calculatedFare > 0
                  ) {
                    originalFare = calculatedFare;
                  }
                }

                // Final validation: Ensure originalFare is at least equal to discountedFare
                if (originalFare < discountedFare) {
                  originalFare = discountedFare;
                }

                // Calculate commission = originalFare - discountedFare (same as agent store)
                const commissionAmount =
                  originalFare > discountedFare
                    ? originalFare - discountedFare
                    : 0;

                if (commissionAmount > 0) {
                  totalCommission += commissionAmount;
                }
              } catch (error) {
                console.error(
                  'Error calculating commission for booking:',
                  booking.id,
                  error
                );
              }
            });

            stats.totalCommissions = Math.round(totalCommission * 100) / 100; // Round to 2 decimal places

            // Count active bookings (confirmed or checked_in)
            stats.activeBookings = allBookings.filter(
              (b: any) => b.status === 'confirmed' || b.status === 'checked_in'
            ).length;

            stats.creditLimit = profileData.data?.credit_ceiling || 0;
            stats.availableCredit = profileData.data?.credit_balance || 0;
            stats.freeTicketsAllocation =
              profileData.data?.free_tickets_allocation || 0;
            stats.freeTicketsRemaining =
              profileData.data?.free_tickets_remaining || 0;
            break;
          }

          case 'customer': {
            // Fetch active bookings, completed trips, and pending payments
            const [bookingsData, paymentsData] = await Promise.all([
              supabase
                .from('bookings')
                .select('id, status, trip_id, total_fare')
                .eq('user_id', userId),
              supabase
                .from('payments')
                .select('id, status, amount')
                .eq('user_id', userId),
            ]);

            const bookings = bookingsData.data || [];
            const payments = paymentsData.data || [];

            stats.activeBookings = bookings.filter(
              (b: any) => b.status === 'confirmed' || b.status === 'checked_in'
            ).length;

            // Count completed trips (bookings with trip_id and completed status)
            const tripsWithBooking = new Set(
              bookings
                .filter((b: any) => b.trip_id && b.status === 'completed')
                .map((b: any) => b.trip_id)
            );
            stats.completedTrips = tripsWithBooking.size;

            // Pending payments (payments that are pending or failed)
            stats.pendingPayments = payments
              .filter(
                (p: any) => p.status === 'pending' || p.status === 'failed'
              )
              .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
            break;
          }

          case 'passenger': {
            // Fetch passenger bookings to determine completed/upcoming trips
            const { data: passengerData } = await supabase
              .from('passengers')
              .select('booking_id')
              .eq('id', userId)
              .single();

            if (passengerData?.booking_id) {
              const { data: bookingData } = await supabase
                .from('bookings')
                .select(
                  'id, status, trip_id, trips!inner(travel_date, departure_time)'
                )
                .eq('id', passengerData.booking_id)
                .single();

              if (bookingData) {
                const trip: any = Array.isArray(bookingData.trips)
                  ? bookingData.trips[0]
                  : bookingData.trips;

                if (trip) {
                  const travelDate = new Date(trip.travel_date);
                  const now = new Date();
                  const isUpcoming = travelDate >= now;

                  stats.completedTrips = isUpcoming ? 0 : 1;
                  stats.upcomingTrips = isUpcoming ? 1 : 0;
                }
              }
            } else {
              stats.completedTrips = 0;
              stats.upcomingTrips = 0;
            }
            break;
          }

          case 'captain': {
            // Fetch captain routes (distinct routes from trips), trips, and rating
            const [tripsData, profileData] = await Promise.all([
              supabase
                .from('trips')
                .select('id, route_id, captain_id')
                .eq('captain_id', userId),
              supabase
                .from('user_profiles')
                .select('average_rating, created_at')
                .eq('id', userId)
                .single(),
            ]);

            // Count distinct routes from trips
            const trips = tripsData.data || [];
            const distinctRoutes = new Set(trips.map((t: any) => t.route_id));

            stats.totalRoutes = distinctRoutes.size;
            stats.totalTrips = trips.length;
            stats.averageRating = profileData.data?.average_rating || 0;

            // Calculate experience years from created_at
            if (profileData.data?.created_at) {
              const createdDate = new Date(profileData.data.created_at);
              const now = new Date();
              const yearsDiff = now.getFullYear() - createdDate.getFullYear();
              const monthsDiff = now.getMonth() - createdDate.getMonth();
              stats.experienceYears =
                monthsDiff < 0 ? yearsDiff - 1 : yearsDiff;
            } else {
              stats.experienceYears = 0;
            }
            break;
          }

          case 'admin': {
            // Admin users don't need stats - just fetch last login
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('last_login')
              .eq('id', userId)
              .single();

            stats.lastLogin =
              profileData?.last_login || new Date().toISOString();
            break;
          }
        }

        setUserStatsData(stats);
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setUserStatsData({});
      }
    },
    []
  );

  const loadUser = useCallback(
    async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }
        setError(null);
        setPassengerTripData(null);
        setIslandNames(null);
        setUserStatsData(null);

        if (!id || typeof id !== 'string') {
          setError('Invalid user ID');
          return;
        }

        // Try to fetch user from the store
        const fetchedUser = await fetchById(id);

        if (fetchedUser) {
          setUser(fetchedUser);

          // Fetch role-specific stats
          await fetchUserStats(fetchedUser.id, fetchedUser.role);

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
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [id, fetchById, loadPassengerTripData, fetchUserStats]
  );

  const hasLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadUser({ showLoader: !hasLoadedRef.current });
      hasLoadedRef.current = true;
    }, [loadUser])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadUser({ showLoader: false });
    } catch (err) {
      console.error('Error refreshing user:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusChange = () => {
    if (!user) return;
    setStatusManagerVisible(true);
  };

  const handleStatusUpdate = async (
    newStatus: 'active' | 'inactive' | 'suspended'
  ) => {
    if (!user) return;

    try {
      await update(user.id, { status: newStatus });
      showSuccess('Success', `User status updated to ${newStatus}`, () => {
        handleRefresh();
        setStatusManagerVisible(false);
      });
    } catch (error) {
      showError('Error', 'Failed to update user status');
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

  const handleManageFreeTickets = () => {
    if (!user) return;
    setFreeTicketsModalVisible(true);
  };

  const handleFreeTicketsUpdate = async () => {
    // Reload user stats to refresh free tickets data
    if (user) {
      await fetchUserStats(user.id, user.role);
    }
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
          showError(
            'No Trip Found',
            'This passenger is not associated with any trip.'
          );
        }
      } catch (error) {
        showError('Error', "Failed to find passenger's trip details.");
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

  const handleEdit = () => {
    if (!user) return;
    router.push(`./${user.id}/edit` as any);
  };

  // Calculate user statistics based on role using fetched data
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
          // Customer-specific stats from database
          activeBookings: userStatsData?.activeBookings || 0,
          completedTrips: userStatsData?.completedTrips || 0,
          pendingPayments: userStatsData?.pendingPayments || 0,
        } as typeof baseStats & {
          activeBookings: number;
          completedTrips: number;
          pendingPayments: number;
        };
      case 'agent':
        return {
          ...baseStats,
          // Agent-specific stats from database
          totalClients: userStatsData?.totalClients || 0,
          totalCommissions: userStatsData?.totalCommissions || 0,
          activeBookings: userStatsData?.activeBookings || 0,
          creditLimit: userStatsData?.creditLimit || 0,
          availableCredit: userStatsData?.availableCredit || 0,
          freeTicketsAllocation: userStatsData?.freeTicketsAllocation || 0,
          freeTicketsRemaining: userStatsData?.freeTicketsRemaining || 0,
        } as typeof baseStats & {
          totalClients: number;
          totalCommissions: number;
          activeBookings: number;
          creditLimit: number;
          availableCredit: number;
          freeTicketsAllocation: number;
          freeTicketsRemaining: number;
        };
      case 'admin':
        return {
          ...baseStats,
          // Admin-specific stats from database
          managedUsers: userStatsData?.managedUsers || 0,
          systemActions: userStatsData?.systemActions || 0,
          lastLogin:
            userStatsData?.lastLogin ||
            user.last_login ||
            new Date().toISOString(),
        } as typeof baseStats & {
          managedUsers: number;
          systemActions: number;
          lastLogin: string;
        };
      case 'passenger':
        return {
          ...baseStats,
          // Passenger-specific stats from database
          totalTrips: baseStats.totalBookings,
          completedTrips: userStatsData?.completedTrips || 0,
          upcomingTrips: userStatsData?.upcomingTrips || 0,
        } as typeof baseStats & {
          totalTrips: number;
          completedTrips: number;
          upcomingTrips: number;
        };
      case 'captain':
        return {
          ...baseStats,
          // Captain-specific stats from database
          totalRoutes: userStatsData?.totalRoutes || 0,
          totalTrips: userStatsData?.totalTrips || baseStats.totalTrips,
          averageRating:
            userStatsData?.averageRating || baseStats.averageRating,
          experienceYears: userStatsData?.experienceYears || 0,
        } as typeof baseStats & {
          totalRoutes: number;
          totalTrips: number;
          averageRating: number;
          experienceYears: number;
        };
      default:
        return baseStats;
    }
  }, [user, userStatsData]);

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
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
            headerRight: () => (
              <View style={styles.headerActions}>
                {canUpdateUsers() && user?.role !== 'passenger' && (
                  <>
                    <Pressable
                      onPress={handleEdit}
                      style={styles.headerActionButton}
                    >
                      <Edit size={20} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={handleStatusChange}
                      style={styles.headerActionButton}
                    >
                      <Shield size={20} color={colors.primary} />
                    </Pressable>
                  </>
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
            onManageFreeTickets={
              user.role === 'agent' ? handleManageFreeTickets : undefined
            }
            freeTicketsAllocation={(userStats as any)?.freeTicketsAllocation}
            freeTicketsRemaining={(userStats as any)?.freeTicketsRemaining}
          />

          {/* System Information */}
          <UserSystemInfoSection user={user} />

          {/* Passenger Trip Details */}
          {user.role === 'passenger' && passengerTripData && (
            <View style={styles.tripDetailsCard}>
              <Text style={styles.sectionTitle}>Trip Details</Text>

              {passengerTripData.trip && (
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
                        {passengerTripData.trip.travel_date
                          ? formatBookingDate(
                              passengerTripData.trip.travel_date
                            )
                          : 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.tripDetailItem}>
                      <Clock size={16} color={colors.textSecondary} />
                      <Text style={styles.tripDetailLabel}>Departure</Text>
                      <Text style={styles.tripDetailValue}>
                        {passengerTripData.trip.departure_time
                          ? formatTimeAMPM(
                              passengerTripData.trip.departure_time
                            )
                          : 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.tripDetailItem}>
                      <Ship size={16} color={colors.textSecondary} />
                      <Text style={styles.tripDetailLabel}>Vessel</Text>
                      <Text style={styles.tripDetailValue}>
                        {passengerTripData.trip.vessel_name || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.tripDetailItem}>
                      <DollarSign size={16} color={colors.textSecondary} />
                      <Text style={styles.tripDetailLabel}>Fare</Text>
                      <Text style={styles.tripDetailValue}>
                        MVR {passengerTripData.booking?.total_fare || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Booking Status */}
                  {passengerTripData.booking && (
                    <View style={styles.bookingStatus}>
                      <Text style={styles.bookingStatusLabel}>
                        Booking Status:
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              passengerTripData.booking.status === 'confirmed'
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
                                passengerTripData.booking.status === 'confirmed'
                                  ? colors.success
                                  : colors.warning,
                            },
                          ]}
                        >
                          {passengerTripData.booking.status
                            ? passengerTripData.booking.status
                                .charAt(0)
                                .toUpperCase() +
                              passengerTripData.booking.status.slice(1)
                            : 'Unknown'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* View Full Trip Details Button */}
                  <Pressable
                    style={styles.viewTripButton}
                    onPress={() => {
                      if (passengerTripData.trip?.id) {
                        router.push(
                          `../trip/${passengerTripData.trip.id}` as any
                        );
                      }
                    }}
                  >
                    <Text style={styles.viewTripButtonText}>
                      View Full Trip Details
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Status Management */}
          <View style={styles.actionsContainer}>
            {canUpdateUsers() && user?.role !== 'passenger' && (
              <Button
                title='Manage Status'
                onPress={handleStatusChange}
                variant='primary'
                icon={<Shield size={20} color={colors.white} />}
              />
            )}
          </View>
        </ScrollView>

        {/* Free Tickets Modal */}
        {user && user.role === 'agent' && (
          <FreeTicketsModal
            userId={user.id}
            userName={user.name}
            visible={freeTicketsModalVisible}
            onClose={() => setFreeTicketsModalVisible(false)}
            onUpdate={handleFreeTicketsUpdate}
            currentAllocation={(userStats as any)?.freeTicketsAllocation || 0}
            currentRemaining={(userStats as any)?.freeTicketsRemaining || 0}
          />
        )}

        {/* Status Manager Modal */}
        {user && (
          <UserStatusManager
            user={user}
            visible={statusManagerVisible}
            onClose={() => setStatusManagerVisible(false)}
            onStatusUpdate={handleStatusUpdate}
          />
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
