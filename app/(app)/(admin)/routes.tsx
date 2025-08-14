import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
// UPDATED: Use new route management hook instead of operations store
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from '@/types';
// UPDATED: Use new utility functions from admin folder
import {
  searchRoutes,
  filterRoutesByStatus,
  sortRoutes,
} from '@/utils/admin/routeUtils';
import {
  ArrowLeft,
  Plus,
  Navigation,
  Filter,
  SortAsc,
  SortDesc,
  Activity,
  TrendingUp,
  DollarSign,
  AlertTriangle,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import RouteItem from '@/components/admin/RouteItem';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type Route = AdminManagement.Route;

export default function RoutesScreen() {
  const { canViewRoutes, canManageRoutes } = useAdminPermissions();

  // UPDATED: Use new route management hook instead of operations store
  const {
    routes: allRoutes,
    loading,
    error,
    stats,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loadAll: fetchRoutes,
    refresh,
  } = useRouteManagement();

  // Maintain existing local state for filters and UI
  const [filterActive, setFilterActive] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleRoutePress = (routeId: string) => {
    router.push(`./route/${routeId}` as any);
  };

  const handleAddRoute = () => {
    if (canManageRoutes()) {
      router.push('./route/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create routes."
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

  const filteredAndSortedRoutes = React.useMemo(() => {
    let filtered = allRoutes || [];

    // Search filter - using utility from searchQuery hook state
    if (searchQuery) {
      filtered = searchRoutes(filtered, searchQuery);
    }

    // Active status filter
    filtered = filterRoutesByStatus(filtered, filterActive);

    // Sort - using sort state from hook
    filtered = sortRoutes(filtered, sortBy, sortOrder);

    return filtered;
  }, [allRoutes, searchQuery, filterActive, sortBy, sortOrder]);

  // Fetch routes if not already loaded
  useEffect(() => {
    if (!allRoutes || allRoutes.length === 0) {
      fetchRoutes();
    }
  }, []);

  // UPDATED: Cast route to content Route type for component compatibility
  const renderRouteItem = ({ item, index }: { item: Route; index: number }) => (
    <RouteItem
      key={item.id}
      route={item as any} // Safe cast since our Route type includes all required fields
      onPress={handleRoutePress}
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
              <Navigation size={16} color={colors.primary} />
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
            <Text style={styles.quickStatValue}>
              {Math.round(stats.totalTrips30d / 1000)}K
            </Text>
            <Text style={styles.quickStatLabel}>Trips</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <DollarSign size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.quickStatValue}>
              {Math.round(stats.totalRevenue30d / 1000)}K
            </Text>
            <Text style={styles.quickStatLabel}>Revenue</Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder='Search routes by name or islands...'
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <TouchableOpacity
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
          </TouchableOpacity>

          <View style={styles.sortControl}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <TouchableOpacity
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
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'base_fare' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('base_fare')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'base_fare' && styles.sortButtonTextActive,
                ]}
              >
                Fare
              </Text>
              {sortBy === 'base_fare' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'total_revenue_30d' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('total_revenue_30d')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'total_revenue_30d' && styles.sortButtonTextActive,
                ]}
              >
                Revenue
              </Text>
              {sortBy === 'total_revenue_30d' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlsRight}>
          <Text style={styles.resultsCount}>
            {filteredAndSortedRoutes.length} route
            {filteredAndSortedRoutes.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Filter Options (Collapsible) */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterSectionTitle}>Filter by Status</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
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
                All Routes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === 'active' && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive('active')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === 'active' && styles.filterChipTextActive,
                ]}
              >
                Active Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === 'inactive' && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive('inactive')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === 'inactive' && styles.filterChipTextActive,
                ]}
              >
                Inactive Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Section Divider */}
      {filteredAndSortedRoutes.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>Routes</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Navigation size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No routes found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || filterActive !== null
          ? 'Try adjusting your search or filter criteria'
          : 'No routes have been created yet'}
      </Text>
      {canManageRoutes() && !searchQuery && filterActive === null && (
        <Button
          title='Create First Route'
          onPress={handleAddRoute}
          variant='primary'
          icon={<Plus size={20} color={colors.white} />}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  if (!canViewRoutes()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <AlertTriangle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view routes.
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
          title: 'Routes',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* UPDATED: Use loading state from new route hook */}
      {loading.routes ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedRoutes}
          renderItem={renderRouteItem}
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
      {canManageRoutes() && filteredAndSortedRoutes.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleAddRoute}
          activeOpacity={0.8}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
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
  headerActionButton: {
    padding: 8,
    marginRight: -8,
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
