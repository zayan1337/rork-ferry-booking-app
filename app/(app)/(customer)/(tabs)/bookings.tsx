import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useUserBookingsStore } from '@/store/userBookingsStore';
import type { Booking, BookingStatus } from '@/types';
import Colors from '@/constants/colors';
import BookingCard from '@/components/BookingCard';
import Input from '@/components/Input';
import { useAuthStore } from '@/store/authStore';
import { useAlertContext } from '@/components/AlertProvider';

export default function BookingsScreen() {
  const { isAuthenticated, isGuestMode } = useAuthStore();
  const { showError } = useAlertContext();
  const {
    bookings,
    fetchUserBookings,
    isLoading,
    subscribeToBookingUpdates,
    unsubscribeFromBookingUpdates,
  } = useUserBookingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>(
    'all'
  );

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (isGuestMode || !isAuthenticated) {
      showError(
        'Login Required',
        'Please sign in to view your booking history.'
      );
      router.replace('/(auth)' as any);
      return;
    }
    fetchUserBookings();

    // Subscribe to real-time booking updates
    const unsubscribe = subscribeToBookingUpdates();

    // Listen for app state changes to refresh bookings when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, refresh bookings
        fetchUserBookings();
      }
      appStateRef.current = nextAppState;
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      unsubscribeFromBookingUpdates();
      subscription.remove();
    };
  }, [
    fetchUserBookings,
    isGuestMode,
    isAuthenticated,
    showError,
    router,
    subscribeToBookingUpdates,
    unsubscribeFromBookingUpdates,
  ]);

  const handleRefresh = useCallback(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  const handleViewBooking = useCallback((booking: Booking) => {
    router.push(`/booking-details/${booking.id}`);
  }, []);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return bookings.filter((booking: Booking) => {
      const matchesSearch =
        query === '' ||
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.route.fromIsland.name.toLowerCase().includes(query) ||
        booking.route.toIsland.name.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all' || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const sortedBookings = useMemo(
    () =>
      [...filteredBookings].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [filteredBookings]
  );

  const renderBookingItem = useCallback(
    ({ item }: { item: Booking }) => (
      <BookingCard booking={item} onPress={() => handleViewBooking(item)} />
    ),
    [handleViewBooking]
  );

  if (isGuestMode || !isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <Input
            placeholder='Search by booking number or route'
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            inputStyle={styles.searchInputText}
          />
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filtersLabel}>Filter by status:</Text>
        <View style={styles.filterButtons}>
          <Pressable
            style={[
              styles.filterButton,
              statusFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              statusFilter === 'confirmed' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('confirmed')}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === 'confirmed' && styles.filterButtonTextActive,
              ]}
            >
              Confirmed
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              statusFilter === 'completed' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === 'completed' && styles.filterButtonTextActive,
              ]}
            >
              Completed
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              statusFilter === 'cancelled' && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter('cancelled')}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === 'cancelled' && styles.filterButtonTextActive,
              ]}
            >
              Cancelled
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={sortedBookings}
        keyExtractor={item => item.id}
        renderItem={renderBookingItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try changing your search or filter criteria'
                : "You haven't made any bookings yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchInputText: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  filterButtonTextActive: {
    color: Colors.card,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
