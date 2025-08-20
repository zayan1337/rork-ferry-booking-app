import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminManagement } from '@/types';
import {
  Plus,
  Eye,
  AlertTriangle,
  Route as RouteIcon,
} from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface RoutesTabProps {
  isActive: boolean;
  searchQuery?: string;
}

type Route = AdminManagement.Route;

export default function RoutesTab({
  isActive,
  searchQuery = '',
}: RoutesTabProps) {
  const { canViewRoutes, canManageRoutes } = useAdminPermissions();
  const {
    routes: allRoutes,
    stats: routeStats,
    searchQuery: routeSearchQuery,
    setSearchQuery: setRouteSearchQuery,
    loading: routeLoading,
    loadAll: loadRoutes,
  } = useRouteManagement();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize routes data when tab becomes active
  useEffect(() => {
    if (isActive && canViewRoutes() && (!allRoutes || allRoutes.length === 0)) {
      loadRoutes();
    }
  }, [isActive, allRoutes?.length]);

  // Filter routes based on search query
  const filteredRoutes = useMemo(() => {
    if (!allRoutes) return [];

    let filtered = allRoutes;
    const query = searchQuery || routeSearchQuery || '';

    if (query) {
      filtered = allRoutes.filter(
        route =>
          route.name?.toLowerCase().includes(query.toLowerCase()) ||
          route.from_island_name?.toLowerCase().includes(query.toLowerCase()) ||
          route.to_island_name?.toLowerCase().includes(query.toLowerCase())
      );
    }

    return filtered;
  }, [allRoutes, searchQuery, routeSearchQuery]);

  // Limit routes to 4 for display
  const displayRoutes = useMemo(() => {
    return filteredRoutes.slice(0, 4);
  }, [filteredRoutes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadRoutes();
    } catch (error) {
      console.error('Error refreshing routes:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRoutePress = (routeId: string) => {
    if (canViewRoutes()) {
      router.push(`../route/${routeId}` as any);
    }
  };

  const handleAddRoute = () => {
    if (canManageRoutes()) {
      router.push('../route/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create routes."
      );
    }
  };

  const handleViewAllRoutes = () => {
    router.push('../routes' as any);
  };

  // Permission check
  if (!canViewRoutes()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view routes.
        </Text>
      </View>
    );
  }

  // Loading state
  if (routeLoading.routes && (!allRoutes || allRoutes.length === 0)) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Routes Management'
            subtitle={`${routeStats.active} active routes`}
          />
        </View>
        {canManageRoutes() && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Add Route'
              onPress={handleAddRoute}
              size='small'
              variant='outline'
              icon={<Plus size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search routes...'
        value={searchQuery || routeSearchQuery || ''}
        onChangeText={setRouteSearchQuery}
      />

      {/* Routes List */}
      <View style={styles.itemsList}>
        {displayRoutes.length > 0 ? (
          displayRoutes.map((route: Route, index: number) => (
            <TouchableOpacity
              key={`route-${route.id}-${index}`}
              style={styles.routeItem}
              onPress={() => handleRoutePress(route.id)}
            >
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>
                  {route.name || 'Unknown Route'}
                </Text>
                <Text style={styles.routeDetails}>
                  {route.from_island_name || route.origin || 'Unknown'} →{' '}
                  {route.to_island_name || route.destination || 'Unknown'}
                </Text>
                <Text style={styles.routeFare}>MVR {route.base_fare || 0}</Text>
              </View>
              <View style={styles.routeStats}>
                <View
                  style={[
                    styles.statusBadge,
                    route.status === 'active'
                      ? styles.statusActive
                      : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      route.status === 'active'
                        ? styles.statusTextActive
                        : styles.statusTextInactive,
                    ]}
                  >
                    {route.status || 'unknown'}
                  </Text>
                </View>
                {route.total_trips_30d !== null &&
                  route.total_trips_30d !== undefined && (
                    <Text style={styles.routeTrips}>
                      {route.total_trips_30d} trips/30d
                    </Text>
                  )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <RouteIcon size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No routes found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || routeSearchQuery
                ? 'Try adjusting your search terms'
                : 'No routes available'}
            </Text>
          </View>
        )}
      </View>

      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={handleViewAllRoutes}
      >
        <Text style={styles.viewAllText}>View All Routes</Text>
        <Eye size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  itemsList: {
    gap: 12,
    marginTop: 16,
  },
  routeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  routeDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  routeFare: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  routeStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  routeTrips: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: `${colors.success}20`,
  },
  statusInactive: {
    backgroundColor: `${colors.textSecondary}20`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
});
