import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useBookingsData } from '@/hooks/useBookingsData';
import {
  getResponsiveDimensions,
  getResponsivePadding,
} from '@/utils/dashboardUtils';
import {
  Plus,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  X,
  Check,
  Eye,
} from 'lucide-react-native';

// Bookings Components
import BookingsStats from '@/components/admin/bookings/BookingsStats';
import FilterTabs from '@/components/admin/bookings/FilterTabs';
import BulkActionsBar from '@/components/admin/bookings/BulkActionsBar';

// Existing Components
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import SearchBar from '@/components/admin/SearchBar';
import BookingItem from '@/components/admin/BookingItem';
import EmptyState from '@/components/admin/EmptyState';
import { Booking } from '@/types/admin';
import { FilterStatus, SortOrder } from '@/types/admin/dashboard';

const { width: screenWidth } = Dimensions.get('window');

export default function BookingsScreen() {
  const { addActivityLog } = useAdminStore();

  const {
    canViewBookings,
    canCreateBookings,
    canUpdateBookings,
    canExportReports,
  } = useAdminPermissions();

  const {
    bookings,
    filterState,
    stats,
    updateFilterState,
    toggleBookingSelection,
    selectAllBookings,
    clearSelection,
    getStatusCount,
    hasActiveFilters,
    clearAllFilters,
    updateBooking,
  } = useBookingsData();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { isTablet, isSmallScreen } = getResponsiveDimensions();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh logic would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBookingPress = (booking: Booking) => {
    if (canViewBookings()) {
      router.push(`../booking/${booking.id}` as any);
    }
  };

  const handleNewBooking = () => {
    if (canCreateBookings()) {
      router.push('../booking/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create bookings."
      );
    }
  };

  const handleExport = async () => {
    if (canExportReports()) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        addActivityLog({
          user_id: 'admin1',
          user_name: 'Admin User',
          action: 'Export Bookings',
          details: `Exported ${bookings.length} bookings`,
        });
        Alert.alert('Success', 'Bookings report exported successfully.');
      } catch (error) {
        Alert.alert('Error', 'Failed to export bookings report.');
      }
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to export reports."
      );
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (!canUpdateBookings()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to update bookings."
      );
      return;
    }

    Alert.alert(
      'Bulk Update',
      `Update ${filterState.selectedBookings.length} booking(s) to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              for (const bookingId of filterState.selectedBookings) {
                await updateBooking(bookingId, { status: status as any });
              }
              clearSelection();
              addActivityLog({
                user_id: 'admin1',
                user_name: 'Admin User',
                action: 'Bulk Update Bookings',
                details: `Updated ${filterState.selectedBookings.length} bookings to ${status}`,
              });
              Alert.alert('Success', 'Bookings updated successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to update bookings.');
            }
          },
        },
      ]
    );
  };

  const isAllSelected =
    bookings.length > 0 &&
    filterState.selectedBookings.length === bookings.length;
  const isPartiallySelected =
    filterState.selectedBookings.length > 0 &&
    filterState.selectedBookings.length < bookings.length;

  // Helper function to get current filter/sort display text
  const getCurrentFilterText = () => {
    const filterText = [];

    if (filterState.filterStatus !== 'all') {
      filterText.push(
        `Status: ${filterState.filterStatus.charAt(0).toUpperCase() + filterState.filterStatus.slice(1)}`
      );
    }

    const sortText = {
      date_desc: 'Date (Newest first)',
      date_asc: 'Date (Oldest first)',
      amount_desc: 'Amount (High to Low)',
      amount_asc: 'Amount (Low to High)',
      customer_asc: 'Customer (A-Z)',
    };

    return {
      filters: filterText.length > 0 ? filterText.join(', ') : 'All bookings',
      sort: sortText[filterState.sortOrder],
    };
  };

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

  return (
    <>
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
        <Stack.Screen
          options={{
            title: 'Bookings',
            headerRight: () => (
              <View style={styles.headerActions}>
                {canExportReports() && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleExport}
                    accessibilityRole='button'
                    accessibilityLabel='Export'
                  >
                    <Download size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
                {canCreateBookings() && (
                  <Button
                    title={isSmallScreen ? 'New' : 'New Booking'}
                    variant='primary'
                    size={isTablet ? 'medium' : 'small'}
                    icon={<Plus size={isTablet ? 18 : 16} color='#FFFFFF' />}
                    onPress={handleNewBooking}
                  />
                )}
              </View>
            ),
          }}
        />

        {/* Enhanced Stats */}
        <BookingsStats stats={stats} isTablet={isTablet} />

        {/* Enhanced Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <SearchBar
              value={filterState.searchQuery}
              onChangeText={text => updateFilterState({ searchQuery: text })}
              placeholder='Search by customer, route, booking ID, or email...'
            />
          </View>
          <Button
            title=''
            variant='outline'
            size={isTablet ? 'large' : 'medium'}
            icon={<Filter size={isTablet ? 20 : 18} color={colors.primary} />}
            onPress={() => setShowFilterModal(true)}
          />
          <Button
            title=''
            variant='outline'
            size={isTablet ? 'large' : 'medium'}
            icon={
              <ArrowUpDown size={isTablet ? 20 : 18} color={colors.primary} />
            }
            onPress={() => {
              const sortOptions: SortOrder[] = [
                'date_desc',
                'date_asc',
                'amount_desc',
                'amount_asc',
                'customer_asc',
              ];
              const currentIndex = sortOptions.indexOf(filterState.sortOrder);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              updateFilterState({ sortOrder: sortOptions[nextIndex] });
            }}
          />
        </View>

        {/* Filter Tabs */}
        <FilterTabs
          activeFilter={filterState.filterStatus}
          onFilterChange={filter => updateFilterState({ filterStatus: filter })}
          getStatusCount={getStatusCount}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={filterState.selectedBookings.length}
          onConfirm={() => handleBulkStatusUpdate('confirmed')}
          onCancel={() => handleBulkStatusUpdate('cancelled')}
          onClear={clearSelection}
          canUpdateBookings={canUpdateBookings()}
        />

        {/* Bookings List */}
        <View style={styles.section}>
          <View style={styles.bookingsHeader}>
            <SectionHeader
              title={
                filterState.searchQuery ? 'Search Results' : 'All Bookings'
              }
              subtitle={`${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} found`}
              size={isTablet ? 'large' : 'medium'}
            />
          </View>

          {/* Compact Filter Status */}
          {(hasActiveFilters() || bookings.length > 0) && (
            <View style={styles.compactFilterStatus}>
              <Text style={styles.compactFilterText}>
                {getCurrentFilterText().filters}
              </Text>
              <View style={styles.filterStatusDivider}>
                <Text style={styles.compactFilterText}>
                  {getCurrentFilterText().sort}
                </Text>
                {hasActiveFilters() && (
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={clearAllFilters}
                    accessibilityRole='button'
                    accessibilityLabel='Clear all filters'
                  >
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Select All Section */}
          {canUpdateBookings() && bookings.length > 0 && (
            <TouchableOpacity
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
            </TouchableOpacity>
          )}

          {/* Content Area */}
          {bookings.length === 0 ? (
            <EmptyState
              icon={<Eye size={48} color={colors.textSecondary} />}
              title='No bookings found'
              message={
                filterState.searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'No bookings match the current filters'
              }
            />
          ) : (
            <View style={styles.bookingsList}>
              {bookings.map(booking => (
                <View key={booking.id} style={styles.bookingItemWrapper}>
                  {canUpdateBookings() && (
                    <TouchableOpacity
                      style={styles.selectionCheckbox}
                      onPress={() => toggleBookingSelection(booking.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          filterState.selectedBookings.includes(booking.id) &&
                            styles.checkboxSelected,
                        ]}
                      >
                        {filterState.selectedBookings.includes(booking.id) && (
                          <Check size={14} color='white' />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  <View style={styles.bookingItemContent}>
                    <BookingItem
                      booking={booking}
                      onPress={() => handleBookingPress(booking)}
                      compact={!isTablet}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType='slide'
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {[
                { key: 'all', label: 'All Status' },
                { key: 'reserved', label: 'Reserved' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'cancelled', label: 'Cancelled' },
                { key: 'completed', label: 'Completed' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filterState.filterStatus === option.key &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    updateFilterState({
                      filterStatus: option.key as FilterStatus,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterState.filterStatus === option.key &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filterState.filterStatus === option.key && (
                    <Check size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort by</Text>
              {[
                { key: 'date_desc', label: 'Date (Newest)' },
                { key: 'date_asc', label: 'Date (Oldest)' },
                { key: 'amount_desc', label: 'Amount (High to Low)' },
                { key: 'amount_asc', label: 'Amount (Low to High)' },
                { key: 'customer_asc', label: 'Customer (A-Z)' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filterState.sortOrder === option.key &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() =>
                    updateFilterState({ sortOrder: option.key as SortOrder })
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterState.sortOrder === option.key &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filterState.sortOrder === option.key && (
                    <Check size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                title='Clear All'
                variant='ghost'
                onPress={clearAllFilters}
              />
              <Button
                title='Apply'
                variant='primary'
                onPress={() => setShowFilterModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    flexGrow: 1,
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

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchWrapper: {
    flex: 1,
  },
  section: {
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
  bookingsList: {
    gap: 12,
    marginTop: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  filterOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
});
