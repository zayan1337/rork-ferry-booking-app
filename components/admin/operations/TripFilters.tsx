import React from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Filter,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Calendar,
  X,
} from 'lucide-react-native';
import { SearchFilterBar } from '@/components/admin/common';

export interface TripFiltersState {
  searchTerm: string;
  status:
    | 'all'
    | 'scheduled'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'delayed';
  dateFilter:
    | 'all'
    | 'today'
    | 'tomorrow'
    | 'thisWeek'
    | 'thisMonth'
    | 'custom';
  occupancyFilter: 'all' | 'low' | 'medium' | 'high' | 'full';
  fareFilter: 'all' | 'standard' | 'premium' | 'discounted';
  routeFilter?: string;
  vesselFilter?: string;
}

export interface TripSortConfig {
  field:
    | 'travel_date'
    | 'departure_time'
    | 'status'
    | 'booked_seats'
    | 'available_seats'
    | 'fare_multiplier';
  direction: 'asc' | 'desc';
}

interface TripFiltersProps {
  filters: TripFiltersState;
  sortConfig: TripSortConfig;
  onFiltersChange: (filters: Partial<TripFiltersState>) => void;
  onSortChange: (sortConfig: TripSortConfig) => void;
  onReset: () => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  resultsCount?: number;
  totalCount?: number;
  canManageTrips?: boolean;
  onAddTrip?: () => void;
}

export default function TripFilters({
  filters,
  sortConfig,
  onFiltersChange,
  onSortChange,
  onReset,
  showAdvanced = false,
  onToggleAdvanced,
  resultsCount,
  totalCount,
  canManageTrips = false,
  onAddTrip,
}: TripFiltersProps) {
  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ searchTerm });
  };

  const handleFilterChange = (key: keyof TripFiltersState, value: any) => {
    onFiltersChange({ [key]: value });
  };

  const handleSort = (field: TripSortConfig['field']) => {
    const direction =
      sortConfig.field === field && sortConfig.direction === 'asc'
        ? 'desc'
        : 'asc';
    onSortChange({ field, direction });
  };

  const isFilterActive = () => {
    return (
      filters.searchTerm ||
      filters.status !== 'all' ||
      filters.dateFilter !== 'all' ||
      filters.occupancyFilter !== 'all' ||
      filters.fareFilter !== 'all' ||
      filters.routeFilter ||
      filters.vesselFilter
    );
  };

  const renderFilterButton = (
    label: string,
    isActive: boolean,
    onPress: () => void,
    icon?: React.ReactNode
  ) => (
    <Pressable
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}
    >
      {icon && icon}
      <Text
        style={[
          styles.filterButtonText,
          isActive && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderSortButton = (field: TripSortConfig['field'], label: string) => {
    const isActive = sortConfig.field === field;
    const isAsc = isActive && sortConfig.direction === 'asc';
    const isDesc = isActive && sortConfig.direction === 'desc';

    return (
      <Pressable
        style={[styles.sortButton, isActive && styles.sortButtonActive]}
        onPress={() => handleSort(field)}
      >
        <Text
          style={[
            styles.sortButtonText,
            isActive && styles.sortButtonTextActive,
          ]}
        >
          {label}
        </Text>
        {isActive ? (
          isAsc ? (
            <SortAsc size={14} color={colors.primary} />
          ) : (
            <SortDesc size={14} color={colors.primary} />
          )
        ) : (
          <ArrowUpDown size={14} color={colors.textSecondary} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Search and Filter Bar */}
      <SearchFilterBar
        searchValue={filters.searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder='Search trips, routes, vessels...'
        filterActions={[
          {
            icon: (
              <Filter
                size={16}
                color={showAdvanced ? colors.white : colors.primary}
              />
            ),
            onPress: onToggleAdvanced || (() => {}),
            variant: showAdvanced ? 'primary' : 'outline',
            size: 'medium',
          },
        ]}
        rightActions={
          canManageTrips
            ? [
                {
                  icon: <Calendar size={16} color={colors.white} />,
                  onPress: onAddTrip || (() => {}),
                  variant: 'primary',
                  size: 'medium',
                  title: '',
                },
              ]
            : []
        }
      />

      {/* Results Info */}
      {resultsCount !== undefined && totalCount !== undefined && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {resultsCount === totalCount
              ? `${totalCount} trips`
              : `${resultsCount} of ${totalCount} trips`}
          </Text>
          {isFilterActive() && (
            <Pressable onPress={onReset} style={styles.clearFilters}>
              <X size={14} color={colors.danger} />
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Quick Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickFilters}
        contentContainerStyle={styles.quickFiltersContent}
      >
        {renderFilterButton('All', filters.status === 'all', () =>
          handleFilterChange('status', 'all')
        )}
        {renderFilterButton('Scheduled', filters.status === 'scheduled', () =>
          handleFilterChange('status', 'scheduled')
        )}
        {renderFilterButton(
          'In Progress',
          filters.status === 'in-progress',
          () => handleFilterChange('status', 'in-progress')
        )}
        {renderFilterButton('Completed', filters.status === 'completed', () =>
          handleFilterChange('status', 'completed')
        )}
        {renderFilterButton('Cancelled', filters.status === 'cancelled', () =>
          handleFilterChange('status', 'cancelled')
        )}
      </ScrollView>

      {/* Advanced Filters */}
      {showAdvanced && (
        <View style={styles.advancedFilters}>
          {/* Date Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {renderFilterButton(
                'All Time',
                filters.dateFilter === 'all',
                () => handleFilterChange('dateFilter', 'all')
              )}
              {renderFilterButton('Today', filters.dateFilter === 'today', () =>
                handleFilterChange('dateFilter', 'today')
              )}
              {renderFilterButton(
                'Tomorrow',
                filters.dateFilter === 'tomorrow',
                () => handleFilterChange('dateFilter', 'tomorrow')
              )}
              {renderFilterButton(
                'This Week',
                filters.dateFilter === 'thisWeek',
                () => handleFilterChange('dateFilter', 'thisWeek')
              )}
              {renderFilterButton(
                'This Month',
                filters.dateFilter === 'thisMonth',
                () => handleFilterChange('dateFilter', 'thisMonth')
              )}
            </ScrollView>
          </View>

          {/* Occupancy Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Occupancy Level</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {renderFilterButton(
                'All',
                filters.occupancyFilter === 'all',
                () => handleFilterChange('occupancyFilter', 'all')
              )}
              {renderFilterButton(
                'Low (0-50%)',
                filters.occupancyFilter === 'low',
                () => handleFilterChange('occupancyFilter', 'low')
              )}
              {renderFilterButton(
                'Medium (51-80%)',
                filters.occupancyFilter === 'medium',
                () => handleFilterChange('occupancyFilter', 'medium')
              )}
              {renderFilterButton(
                'High (81-99%)',
                filters.occupancyFilter === 'high',
                () => handleFilterChange('occupancyFilter', 'high')
              )}
              {renderFilterButton(
                'Full (100%)',
                filters.occupancyFilter === 'full',
                () => handleFilterChange('occupancyFilter', 'full')
              )}
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {renderSortButton('travel_date', 'Date')}
              {renderSortButton('departure_time', 'Time')}
              {renderSortButton('status', 'Status')}
              {renderSortButton('booked_seats', 'Bookings')}
              {renderSortButton('available_seats', 'Availability')}
              {renderSortButton('fare_multiplier', 'Fare')}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
  },
  resultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '500',
  },
  quickFilters: {
    marginBottom: 8,
  },
  quickFiltersContent: {
    paddingRight: 16,
    gap: 8,
  },
  advancedFilters: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 16,
    marginTop: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  filterRow: {
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  sortButtonActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
