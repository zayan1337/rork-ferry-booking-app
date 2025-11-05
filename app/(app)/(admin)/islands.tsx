import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
// UPDATED: Replace old stores with new implementation
import { useIslandManagement } from '@/hooks/useIslandManagement';
import { useZoneStore } from '@/store/admin/zoneStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAlertContext } from '@/components/AlertProvider';
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from '@/types';
// UPDATED: Use new utility functions from admin folder
import {
  searchIslands,
  filterIslandsByStatus,
  filterIslandsByZone,
  sortIslands,
  getZoneStatistics,
} from '@/utils/admin/islandUtils';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Filter,
  SortAsc,
  SortDesc,
  Activity,
  TrendingUp,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import IslandItem from '@/components/admin/IslandItem';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type Island = AdminManagement.Island;

export default function IslandsScreen() {
  const { canViewIslands, canManageIslands } = useAdminPermissions();
  const { showError } = useAlertContext();

  // UPDATED: Use new island management hook instead of separate stores
  const {
    islands: allIslands,
    loading,
    error,
    stats,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loadAll: fetchIslands,
    refresh,
  } = useIslandManagement();

  // UPDATED: Use new zone store instead of content store
  const {
    data: zones,
    loading: zoneLoading,
    fetchAll: fetchZones,
  } = useZoneStore();

  // Maintain existing local state for filters and UI
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterZone, setFilterZone] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refresh(), fetchZones()]);
    setIsRefreshing(false);
  };

  const handleIslandPress = (islandId: string) => {
    router.push(`./island/${islandId}` as any);
  };

  const handleAddIsland = () => {
    if (canManageIslands()) {
      router.push('./island/new' as any);
    } else {
      showError(
        'Access Denied',
        "You don't have permission to create islands."
      );
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedIslands = React.useMemo(() => {
    let filtered = allIslands || [];

    // Search filter - using utility from searchQuery hook state
    if (searchQuery) {
      filtered = searchIslands(filtered, searchQuery);
    }

    // Active status filter
    filtered = filterIslandsByStatus(filtered, filterActive);

    // Zone filter
    filtered = filterIslandsByZone(filtered, filterZone);

    // Sort - using sort state from hook
    filtered = sortIslands(filtered, sortBy, sortOrder);

    return filtered;
  }, [allIslands, searchQuery, filterActive, filterZone, sortBy, sortOrder]);

  // Fetch zones if not already loaded
  useEffect(() => {
    if (!zones || zones.length === 0) {
      fetchZones();
    }
  }, [zones, fetchZones]);

  // UPDATED: Use stats from hook instead of calculating manually
  const zoneStats = React.useMemo(() => {
    if (!zones || !allIslands) return [];
    return getZoneStatistics(allIslands, zones);
  }, [allIslands, zones]);

  useEffect(() => {
    if (!allIslands || allIslands.length === 0) {
      fetchIslands();
    }
  }, []);

  // UPDATED: Cast island to DatabaseIsland for component compatibility
  const renderIslandItem = ({
    item,
    index,
  }: {
    item: Island;
    index: number;
  }) => (
    <IslandItem
      key={item.id}
      island={item as any} // Safe cast since our Island type includes all DatabaseIsland fields
      onPress={handleIslandPress}
    />
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* Quick Stats Summary */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <MapPin size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{stats.total}</Text>
            <Text style={styles.quickStatLabel}>Total</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Activity size={16} color={colors.success} />
            </View>
            <Text style={styles.quickStatValue}>{stats.active}</Text>
            <Text style={styles.quickStatLabel}>Active</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.infoLight },
              ]}
            >
              <TrendingUp size={16} color={colors.info} />
            </View>
            {/* UPDATED: Use stats from new implementation, fallback to zones count */}
            <Text style={styles.quickStatValue}>
              {Object.keys(stats.byZone).length}
            </Text>
            <Text style={styles.quickStatLabel}>Zones</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <MapPin size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.quickStatValue}>{stats.inactive}</Text>
            <Text style={styles.quickStatLabel}>Inactive</Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder='Search islands by name or zone...'
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <Pressable
            style={[
              styles.controlButton,
              showFilters && styles.controlButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={16}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.controlButtonText,
                showFilters && styles.controlButtonTextActive,
              ]}
            >
              Filters
            </Text>
          </Pressable>

          <View style={styles.sortControl}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'name' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('name')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'name' && styles.sortButtonTextActive,
                ]}
              >
                Name
              </Text>
              {sortBy === 'name' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </Pressable>
            <Pressable
              style={[
                styles.sortButton,
                sortBy === 'zone' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('zone')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'zone' && styles.sortButtonTextActive,
                ]}
              >
                Zone
              </Text>
              {sortBy === 'zone' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </Pressable>
          </View>
        </View>

        <View style={styles.controlsRight}>
          <Text style={styles.resultsCount}>
            {filteredAndSortedIslands.length} island
            {filteredAndSortedIslands.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Filter Options (Collapsible) */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterSectionTitle}>Filter by Status</Text>
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterChip,
                filterActive === null && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === null && styles.filterChipTextActive,
                ]}
              >
                All Islands
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                filterActive === true && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive(true)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === true && styles.filterChipTextActive,
                ]}
              >
                Active Only
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                filterActive === false && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive(false)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === false && styles.filterChipTextActive,
                ]}
              >
                Inactive Only
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Section Divider */}
      {filteredAndSortedIslands.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>Islands</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <MapPin size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No islands found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || filterActive !== null
          ? 'Try adjusting your search or filter criteria'
          : 'No islands have been created yet'}
      </Text>
      {canManageIslands() && !searchQuery && filterActive === null && (
        <Button
          title='Create First Island'
          onPress={handleAddIsland}
          variant='primary'
          icon={<Plus size={20} color={colors.white} />}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  if (!canViewIslands()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
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
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <MapPin size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view islands.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Islands',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {/* UPDATED: Use loading state from new hook */}
      {loading.islands && allIslands === undefined ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading islands...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedIslands}
          renderItem={renderIslandItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      )}

      {/* Floating Add Button */}
      {canManageIslands() && filteredAndSortedIslands.length > 0 && (
        <Pressable style={styles.floatingButton} onPress={handleAddIsland}>
          <Plus size={24} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  noAccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 100, // Space for floating button
  },
  listHeader: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  quickStats: {
    marginBottom: 20,
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  controlsRight: {
    alignItems: 'flex-end',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  controlButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  controlButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  controlButtonTextActive: {
    color: colors.primary,
  },
  sortControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sortButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: colors.primary,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  filtersSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sectionDivider: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  itemSeparator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 20,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  emptyStateButton: {
    marginTop: 16,
    minWidth: 200,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
