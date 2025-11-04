import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import EmptyState from '@/components/admin/EmptyState';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';

interface Booking {
  id: string;
  booking_number: string;
  status: string;
  total_fare: number;
  travel_date: string;
  departure_time: string;
  created_at: string;
  route_name?: string;
}

export default function UserBookingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [id]);

  const loadBookings = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch bookings for this user/agent
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          booking_number,
          status,
          total_fare,
          created_at,
          trip_id,
          trips!inner(
            travel_date,
            departure_time,
            route_id,
            routes!inner(
              from_island_id,
              to_island_id,
              from_islands:from_island_id(
                name
              ),
              to_islands:to_island_id(
                name
              )
            )
          )
        `
        )
        .or(`user_id.eq.${id},agent_id.eq.${id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedBookings: Booking[] = (data || []).map(
        (booking: any) => {
          const trip = Array.isArray(booking.trips)
            ? booking.trips[0]
            : booking.trips;
          const route = trip?.routes
            ? Array.isArray(trip.routes)
              ? trip.routes[0]
              : trip.routes
            : null;
          const fromIsland = route?.from_islands
            ? Array.isArray(route.from_islands)
              ? route.from_islands[0]
              : route.from_islands
            : null;
          const toIsland = route?.to_islands
            ? Array.isArray(route.to_islands)
              ? route.to_islands[0]
              : route.to_islands
            : null;

          return {
            id: booking.id,
            booking_number: booking.booking_number,
            status: booking.status,
            total_fare: booking.total_fare || 0,
            travel_date: trip?.travel_date || '',
            departure_time: trip?.departure_time || '',
            created_at: booking.created_at,
            route_name:
              fromIsland?.name && toIsland?.name
                ? `${fromIsland.name} → ${toIsland.name}`
                : 'Unknown Route',
          };
        }
      );

      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return colors.success;
      case 'pending_payment':
        return colors.warning;
      case 'cancelled':
        return colors.danger;
      case 'completed':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const handleBookingPress = (bookingId: string) => {
    router.push(`../../booking/${bookingId}` as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'User Bookings',
          headerShown: true,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
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
          {bookings.length === 0 ? (
            <EmptyState
              icon={<Calendar size={48} color={colors.textSecondary} />}
              title='No Bookings'
              message='This user has no bookings yet.'
            />
          ) : (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>
                {bookings.length} Booking{bookings.length !== 1 ? 's' : ''}
              </Text>
              {bookings.map(booking => (
                <Pressable
                  key={booking.id}
                  style={styles.bookingCard}
                  onPress={() => handleBookingPress(booking.id)}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingNumber}>
                        {booking.booking_number}
                      </Text>
                      <Text style={styles.routeName}>{booking.route_name}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${getStatusColor(booking.status)}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(booking.status) },
                        ]}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1).replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>
                        {booking.travel_date
                          ? formatBookingDate(booking.travel_date)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Time:</Text>
                      <Text style={styles.detailValue}>
                        {booking.departure_time
                          ? formatTimeAMPM(booking.departure_time)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fare:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(booking.total_fare, 'MVR')}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
  bookingNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  routeName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});
