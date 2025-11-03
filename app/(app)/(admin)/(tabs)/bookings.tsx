import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
  Alert,
  FlatList,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAdminBookingManagement } from '@/hooks/useAdminBookingManagement';
import {
  getResponsiveDimensions,
  getResponsivePadding,
} from '@/utils/dashboardUtils';
import {
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  Check,
  X,
  Eye,
} from 'lucide-react-native';

// Bookings Components
import {
  BookingsStats,
  FilterTabs,
  BulkActionsBar,
  TabNavigation,
  FilterModal,
} from '@/components/admin/bookings';

// Existing Components
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import SearchBar from '@/components/admin/SearchBar';
import EmptyState from '@/components/admin/EmptyState';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminBookingItem from '@/components/admin/AdminBookingItem';
import { AdminBooking } from '@/types/admin/management';
import ExportModal, { type ExportFilter } from '@/components/admin/ExportModal';
import { exportBookings } from '@/utils/bookingExportUtils';

const { width: screenWidth } = Dimensions.get('window');

export default function BookingsScreen() {
  const {
    canViewBookings,
    canCreateBookings,
    canUpdateBookings,
    canExportReports,
  } = useAdminPermissions();

  const {
    // Data
    bookings,
    stats,
    filters,

    // Loading states
    loading,
    statsLoading,
    refreshing,
    hasFetched,

    // Pagination
    currentPage,
    itemsPerPage,
    totalItems,
    hasMore,

    // UI state
    showFilterModal,
    setShowFilterModal,

    // Actions
    handleRefresh,
    handleBulkStatusUpdate,
    fetchBookings,
    fetchStats,

    // Selection actions
    toggleBookingSelection,
    selectAllBookings,
    clearSelection,

    // Filter actions
    getStatusCount,
    hasActiveFilters,
    clearFilters,
    setFilters,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    getCurrentFilterText,

    // Pagination actions
    loadMore,

    // Utility functions
    formatCurrency,
    formatDate,
  } = useAdminBookingManagement();

  const { isTablet, isSmallScreen } = getResponsiveDimensions();

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>(
    'overview'
  );

  // Local search state - completely client-side, no store updates
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Client-side filtering using local search query for immediate results
  const displayBookings = React.useMemo(() => {
    if (!localSearchQuery.trim()) return bookings;

    const query = localSearchQuery.toLowerCase().trim();
    return bookings.filter(booking => {
      return (
        booking.user_name?.toLowerCase().includes(query) ||
        booking.user_email?.toLowerCase().includes(query) ||
        booking.booking_number?.toLowerCase().includes(query) ||
        booking.route_name?.toLowerCase().includes(query) ||
        booking.from_island_name?.toLowerCase().includes(query) ||
        booking.to_island_name?.toLowerCase().includes(query)
      );
    });
  }, [bookings, localSearchQuery]);

  // Fetch data on component mount and when switching tabs
  useEffect(() => {
    // Always fetch stats for overview tab
    fetchStats();

    // Fetch bookings data if on bookings tab
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, fetchBookings, fetchStats]);

  const handleBookingPress = (booking: AdminBooking) => {
    if (canViewBookings()) {
      router.push(`../booking/${booking.id}` as any);
    }
  };

  const handleExport = () => {
    if (canExportReports()) {
      setShowExportModal(true);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to export reports."
      );
    }
  };

  const handleExportConfirm = async (filters: ExportFilter) => {
    try {
      await exportBookings(bookings, filters);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        'Failed to export bookings. Please try again.'
      );
    }
  };

  const isAllSelected =
    displayBookings.length > 0 &&
    filters.selectedBookings.length === displayBookings.length;
  const isPartiallySelected =
    filters.selectedBookings.length > 0 &&
    filters.selectedBookings.length < displayBookings.length;

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMore();
    }
  };

  // Memoized key extractor and renderItem for FlatList performance
  const keyExtractor = useCallback((item: AdminBooking) => item.id, []);

  const renderBookingItem = useCallback(
    ({ item: booking }: { item: AdminBooking }) => (
      <View style={styles.bookingItemWrapper}>
        {canUpdateBookings() && (
          <Pressable
            style={styles.selectionCheckbox}
            onPress={() => toggleBookingSelection(booking.id)}
          >
            <View
              style={[
                styles.checkbox,
                filters.selectedBookings.includes(booking.id) &&
                  styles.checkboxSelected,
              ]}
            >
              {filters.selectedBookings.includes(booking.id) && (
                <Check size={14} color='white' />
              )}
            </View>
          </Pressable>
        )}
        <View style={styles.bookingItemContent}>
          <AdminBookingItem
            booking={booking}
            onPress={handleBookingPress}
            compact={!isTablet}
          />
        </View>
      </View>
    ),
    [
      canUpdateBookings,
      filters.selectedBookings,
      handleBookingPress,
      isTablet,
      toggleBookingSelection,
    ]
  );

  if (!canViewBookings()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view bookings.
        </Text>
      </View>
    );
  }

  const renderHeader = () => (
    <Stack.Screen
      options={{
        title: 'Bookings',
        headerRight: () => (
          <View style={styles.headerActions}>
            {canExportReports() && (
              <Pressable
                style={styles.headerButton}
                onPress={handleExport}
                accessibilityRole='button'
                accessibilityLabel='Export'
              >
                <Download size={18} color={colors.primary} />
              </Pressable>
            )}
          </View>
        ),
      }}
    />
  );

  const renderListHeader = () => (
    <>
      {/* Filter Tabs */}
      <FilterTabs
        activeFilter={filters.filterStatus}
        onFilterChange={filter => setFilters({ filterStatus: filter })}
        getStatusCount={getStatusCount}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={filters.selectedBookings.length}
        onConfirm={() => handleBulkStatusUpdate('confirmed')}
        onCancel={() => handleBulkStatusUpdate('cancelled')}
        onClear={clearSelection}
        canUpdateBookings={canUpdateBookings()}
      />

      {/* Bookings List Header */}
      <View style={styles.section}>
        <View style={styles.bookingsHeader}>
          <SectionHeader
            title={localSearchQuery ? 'Search Results' : 'All Bookings'}
            subtitle={`${displayBookings.length} ${displayBookings.length === 1 ? 'booking' : 'bookings'} found`}
            size={isTablet ? 'large' : 'medium'}
          />
        </View>

        {/* Compact Filter Status */}
        {(hasActiveFilters() || displayBookings.length > 0) && (
          <View style={styles.compactFilterStatus}>
            <Text style={styles.compactFilterText}>
              {getCurrentFilterText().filters}
            </Text>
            <View style={styles.filterStatusDivider}>
              <Text style={styles.compactFilterText}>
                {getCurrentFilterText().sort}
              </Text>
              {hasActiveFilters() && (
                <Pressable
                  style={styles.clearFiltersButton}
                  onPress={clearFilters}
                  accessibilityRole='button'
                  accessibilityLabel='Clear all filters'
                >
                  <X size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Select All Section */}
        {canUpdateBookings() && displayBookings.length > 0 && (
          <Pressable
            style={styles.selectAllButton}
            onPress={selectAllBookings}
            accessibilityRole='button'
            accessibilityLabel={
              isAllSelected ? 'Deselect all bookings' : 'Select all bookings'
            }
          >
            <View
              style={[
                styles.selectAllCheckboxLarge,
                isAllSelected && styles.checkboxSelected,
                isPartiallySelected && styles.checkboxPartial,
              ]}
            >
              {isAllSelected && <Check size={14} color='white' />}
              {isPartiallySelected && !isAllSelected && (
                <View style={styles.partialCheckmark} />
              )}
            </View>
            <Text style={styles.selectAllTextLarge}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );

  return (
    <>
      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            getResponsivePadding(),
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {statsLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size='large' />
              <Text style={styles.loadingText}>
                Loading booking statistics...
              </Text>
            </View>
          ) : (
            <BookingsStats stats={stats} isTablet={isTablet} />
          )}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          {renderHeader()}
          {/* Fixed Search Bar and Tab Navigation */}
          <View style={[styles.stickyHeader, getResponsivePadding()]}>
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            {/* Enhanced Search and Filter */}
            <View style={styles.searchContainer}>
              <View style={styles.searchWrapper}>
                <SearchBar
                  value={localSearchQuery}
                  onChangeText={setLocalSearchQuery}
                  placeholder='Search by customer, route, booking ID, or email...'
                />
              </View>
              <Button
                title=''
                variant='outline'
                size={isTablet ? 'large' : 'medium'}
                icon={
                  <Filter size={isTablet ? 20 : 18} color={colors.primary} />
                }
                onPress={() => setShowFilterModal(true)}
              />
              <Button
                title=''
                variant='outline'
                size={isTablet ? 'large' : 'medium'}
                icon={
                  <ArrowUpDown
                    size={isTablet ? 20 : 18}
                    color={colors.primary}
                  />
                }
                onPress={() => {
                  const sortFields: (
                    | 'created_at'
                    | 'total_fare'
                    | 'user_name'
                    | 'route_name'
                    | 'trip_travel_date'
                  )[] = [
                    'created_at',
                    'total_fare',
                    'user_name',
                    'route_name',
                    'trip_travel_date',
                  ];
                  const currentIndex = sortFields.indexOf(filters.sortBy);
                  const nextIndex = (currentIndex + 1) % sortFields.length;
                  setSortBy(sortFields[nextIndex]);
                }}
              />
            </View>
          </View>

          {/* Scrollable List */}
          <FlatList
            style={styles.flatListContainer}
            contentContainerStyle={[
              styles.contentContainer,
              getResponsivePadding(),
            ]}
            data={displayBookings}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps='handled'
            ListHeaderComponent={renderListHeader}
            renderItem={renderBookingItem}
            ListEmptyComponent={() => {
              if ((loading || !hasFetched) && displayBookings.length === 0) {
                return (
                  <View style={styles.loadingContainer}>
                    <LoadingSpinner size='large' />
                    <Text style={styles.loadingText}>Loading bookings...</Text>
                  </View>
                );
              }
              return (
                <View style={styles.emptyState}>
                  <EmptyState
                    icon={<Eye size={48} color={colors.textSecondary} />}
                    title='No bookings found'
                    message={
                      localSearchQuery
                        ? 'Try adjusting your search criteria'
                        : 'No bookings match the current filters'
                    }
                  />
                </View>
              );
            }}
            ListFooterComponent={() => {
              // Show hint to scroll when more data is available
              if (!loading && hasMore) {
                const remaining = Math.max(
                  (totalItems || 0) - displayBookings.length,
                  0
                );
                return (
                  <View style={styles.footerIndicator}>
                    <Text style={styles.footerIndicatorText}>
                      {remaining > 0 ? `${remaining} more` : 'More items'} •
                      Scroll to load
                    </Text>
                  </View>
                );
              }
              if (!loading && !hasMore && displayBookings.length > 0) {
                return (
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      Showing {displayBookings.length} bookings
                    </Text>
                  </View>
                );
              }
              if (loading && hasMore) {
                return (
                  <View style={styles.footer}>
                    <LoadingSpinner size='small' />
                    <Text style={styles.footerText}>
                      Loading more bookings...
                    </Text>
                  </View>
                );
              }
              return null;
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          />
        </View>
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filters.filterStatus}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onStatusChange={status => setFilters({ filterStatus: status })}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onClearAll={clearFilters}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
        title='Export Bookings'
        description='Select filters and file type to export booking data'
        roleOptions={[
          { value: 'all', label: 'All Bookings' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'pending', label: 'Pending' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'completed', label: 'Completed' },
        ]}
        showRoleFilter={true}
        showDateFilter={true}
        fileTypes={['excel', 'pdf', 'csv']}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  flatListContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },

  emptyState: {
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  itemSeparator: {
    height: 8,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footerIndicator: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}08`,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 6,
  },
  footerIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${colors.border}60`,
  },

  stickyHeader: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    zIndex: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  searchWrapper: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginBottom: 24,
  },
  bookingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactFilterStatus: {
    paddingHorizontal: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}40`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterStatusDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactFilterText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  clearFiltersButton: {
    padding: 2,
    borderRadius: 2,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  selectAllCheckboxLarge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllTextLarge: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  bookingItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCheckbox: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxPartial: {
    backgroundColor: `${colors.primary}40`,
    borderColor: colors.primary,
  },
  partialCheckmark: {
    width: 8,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  bookingItemContent: {
    flex: 1,
  },

  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
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
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
