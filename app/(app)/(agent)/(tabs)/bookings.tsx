import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Search, SortAsc, Calendar } from 'lucide-react-native';

import Colors from '@/constants/colors';
import AgentBookingCard from '@/components/AgentBookingCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { SkeletonBookingsList } from '@/components/skeleton';

import type { Booking } from '@/types/agent';
import { useAgentData } from '@/hooks/useAgentData';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { formatCurrency } from '@/utils/agentFormatters';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function AgentBookingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { agent, bookings, isLoadingBookings, error, refreshBookings } =
    useAgentData();

  const [activeTab, setActiveTab] = useState<
    'all' | 'confirmed' | 'completed' | 'cancelled' | 'upcoming'
  >((params.filter as any) || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'date' | 'amount' | 'status' | 'upcoming'
  >((params.sortBy as any) || 'date');

  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: async () => {
      if (agent?.id) {
        await refreshBookings();
      }
    },
  });

  useEffect(() => {
    if (agent?.id) {
      refreshBookings();
    }
  }, [agent?.id, refreshBookings]);

  const filteredAndSortedBookings = useMemo(() => {
    if (!bookings) return [];

    const filtered = bookings.filter(booking => {
      // Filter by status or upcoming
      if (activeTab === 'upcoming') {
        // Show only future departures that are confirmed or pending
        const departureDate = new Date(booking.departureDate);
        const now = new Date();
        return (
          departureDate > now &&
          (booking.status === 'confirmed' || booking.status === 'pending')
        );
      } else if (activeTab !== 'all' && booking.status !== activeTab) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          booking.clientName.toLowerCase().includes(query) ||
          booking.origin.toLowerCase().includes(query) ||
          booking.destination.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query) ||
          booking.bookingNumber?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort bookings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'upcoming':
          // Sort by departure date (soonest first) for upcoming bookings
          return (
            new Date(a.departureDate).getTime() -
            new Date(b.departureDate).getTime()
          );
        case 'amount':
          return b.discountedAmount - a.discountedAmount;
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return (
            new Date(b.bookingDate).getTime() -
            new Date(a.bookingDate).getTime()
          );
      }
    });

    return filtered;
  }, [bookings, activeTab, searchQuery, sortBy]);

  // Calculate summary statistics
  const bookingStats = useMemo(() => {
    if (!bookings) return { total: 0, revenue: 0, commission: 0 };

    const filteredBookings = bookings.filter(booking => {
      if (activeTab === 'upcoming') {
        const departureDate = new Date(booking.departureDate);
        const now = new Date();
        return (
          departureDate > now &&
          (booking.status === 'confirmed' || booking.status === 'pending')
        );
      }
      return activeTab === 'all' || booking.status === activeTab;
    });

    return {
      total: filteredBookings.length,
      revenue: filteredBookings.reduce(
        (sum, booking) => sum + booking.discountedAmount,
        0
      ),
      commission: filteredBookings.reduce(
        (sum, booking) => sum + (booking.commission || 0),
        0
      ),
    };
  }, [bookings, activeTab]);

  const handleBookingPress = (booking: Booking) => {
    router.push(`../agent-booking/${booking.id}` as any);
  };

  const handleNewBooking = () => {
    router.push('../agent-booking/new' as any);
  };

  const handleSortChange = () => {
    const sortOptions = ['date', 'amount', 'status', 'upcoming'] as const;
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  };

  // Stable renderItem function for better FlatList performance
  const renderBookingItem = React.useCallback(
    ({ item }: { item: Booking }) => (
      <AgentBookingCard booking={item} onPress={handleBookingPress} />
    ),
    [handleBookingPress]
  );

  const tabs = [
    { key: 'all', label: 'All', count: bookings?.length || 0 },
    {
      key: 'upcoming',
      label: 'Upcoming',
      count:
        bookings?.filter(b => {
          const departureDate = new Date(b.departureDate);
          const now = new Date();
          return (
            departureDate > now &&
            (b.status === 'confirmed' || b.status === 'pending')
          );
        }).length || 0,
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      count: bookings?.filter(b => b.status === 'confirmed').length || 0,
    },
    {
      key: 'completed',
      label: 'Completed',
      count: bookings?.filter(b => b.status === 'completed').length || 0,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: bookings?.filter(b => b.status === 'cancelled').length || 0,
    },
  ];

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button
          title='Retry'
          onPress={() => refreshBookings()}
          variant='primary'
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder='Search bookings, clients, routes...'
              style={styles.searchInput}
              inputStyle={styles.searchInputText}
            />
            <Search
              size={20}
              color={Colors.subtext}
              style={styles.searchIcon}
            />
          </View>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={handleSortChange}
          >
            <SortAsc size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newBookingButton}
            onPress={handleNewBooking}
          >
            <Plus size={20} color='white' />
          </TouchableOpacity>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingStats.total}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(bookingStats.revenue)}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(bookingStats.commission)}
            </Text>
            <Text style={styles.statLabel}>Commission</Text>
          </View>
        </View>
      </View>

      {/* Enhanced Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.activeTabBadge,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.activeTabBadgeText,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort indicator */}
        <View style={styles.sortIndicator}>
          <Text style={styles.sortText}>
            Sort:{' '}
            {sortBy === 'date'
              ? 'Date'
              : sortBy === 'amount'
                ? 'Amount'
                : sortBy === 'status'
                  ? 'Status'
                  : 'Upcoming'}
          </Text>
        </View>
      </View>

      {/* Enhanced Bookings List */}
      {isLoadingBookings && (!bookings || bookings.length === 0) ? (
        <SkeletonBookingsList count={6} delay={0} />
      ) : filteredAndSortedBookings.length > 0 ? (
        <FlatList
          data={filteredAndSortedBookings}
          keyExtractor={item => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.bookingsList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          getItemLayout={(data, index) => ({
            length: 180,
            offset: 180 * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Calendar size={48} color={Colors.inactive} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching bookings' : 'No bookings found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search terms or filters'
              : 'Create your first booking to get started'}
          </Text>
          {!searchQuery && (
            <Button
              title='Create a Booking'
              onPress={handleNewBooking}
              variant='primary'
              style={styles.emptyButton}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.card,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    marginBottom: 0,
  },
  searchInputText: {
    paddingLeft: 40,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
  },
  sortButton: {
    backgroundColor: Colors.highlight,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  newBookingButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.subtext,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  tabsContainer: {
    backgroundColor: Colors.card,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsContent: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.text,
    fontWeight: '600',
    marginRight: 6,
  },
  activeTabText: {
    color: 'white',
  },
  tabBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.subtext,
  },
  activeTabBadgeText: {
    color: 'white',
  },
  sortIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortText: {
    fontSize: 12,
    color: Colors.subtext,
    fontWeight: '500',
  },
  bookingsList: {
    padding: 16,
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    minWidth: 120,
  },
});
