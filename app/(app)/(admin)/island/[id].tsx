import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useIslandDetails } from '@/hooks/useIslandManagement';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  AlertCircle,
  Activity,
  Route as RouteIcon,
  TrendingUp,
  BarChart3,
  Settings,
  Info,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');

export default function IslandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canUpdateIslands, canDeleteIslands, canViewRoutes, canViewIslands } =
    useAdminPermissions();

  // Use new island details hook
  const {
    island,
    islandWithDetails,
    loading: islandLoading,
    error,
    loadIsland,
  } = useIslandDetails(id!);

  // Keep operations store for route statistics (until routes are migrated)
  const { routes, fetchRoutes, removeIsland } = useOperationsStore();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTablet = screenWidth >= 768;

  const loadIslandData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      await loadIsland();
      // Also fetch routes to calculate statistics
      await fetchRoutes();
    } catch (error) {
      console.error('Error loading island:', error);
      Alert.alert('Error', 'Failed to load island details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadIslandData();
    setIsRefreshing(false);
  };

  const handleEdit = () => {
    if (!canUpdateIslands()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to edit islands."
      );
      return;
    }
    router.push(`../island/edit/${id}` as any);
  };

  const handleDelete = () => {
    if (!canDeleteIslands()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to delete islands."
      );
      return;
    }

    Alert.alert(
      'Delete Island',
      `Are you sure you want to delete "${island?.name}"? This action cannot be undone and will affect all routes using this island.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const success = await removeIsland(id);
              if (success) {
                Alert.alert('Success', 'Island deleted successfully');
                router.back();
              } else {
                Alert.alert('Error', 'Failed to delete island');
              }
            } catch (error) {
              console.error('Error deleting island:', error);
              Alert.alert(
                'Error',
                'Failed to delete island. There may be active routes using this island.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getZoneColor = (zone: string) => {
    switch (zone.toLowerCase()) {
      case 'male':
        return colors.primary;
      case 'north':
        return colors.info;
      case 'south':
        return colors.warning;
      case 'central':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getZoneLabel = (zone: string) => {
    switch (zone.toLowerCase()) {
      case 'male':
        return 'Male Zone';
      case 'north':
        return 'North Zone';
      case 'south':
        return 'South Zone';
      case 'central':
        return 'Central Zone';
      default:
        return zone;
    }
  };

  const getStatusVariant = (status: boolean) => {
    return status ? 'default' : 'warning';
  };

  // Calculate island statistics
  const islandStats = React.useMemo(() => {
    if (!island || !routes) return null;

    const fromRoutes = routes.filter(
      route => route.from_island_id === island.id
    );
    const toRoutes = routes.filter(route => route.to_island_id === island.id);
    const totalRoutes = [...fromRoutes, ...toRoutes];
    const activeRoutes = totalRoutes.filter(route => route.status === 'active');

    return {
      totalRoutes: totalRoutes.length,
      activeRoutes: activeRoutes.length,
      fromRoutes: fromRoutes.length,
      toRoutes: toRoutes.length,
    };
  }, [island, routes]);

  const handleViewRoutes = () => {
    if (canViewRoutes()) {
      router.push(`../routes?island=${id}` as any);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  useEffect(() => {
    loadIslandData();
  }, [id]);

  if (!canViewIslands()) {
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
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view island details.
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

  if (loading || islandLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Loading...',
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
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading island details...</Text>
        </View>
      </View>
    );
  }

  if (!island) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Island Not Found',
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
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Island Not Found</Text>
          <Text style={styles.errorText}>
            The island you're looking for doesn't exist or has been removed.
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
          title: island.name,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {canUpdateIslands() && (
                <TouchableOpacity
                  onPress={handleEdit}
                  style={styles.headerActionButton}
                >
                  <Edit size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              {canDeleteIslands() && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={[styles.headerActionButton, styles.deleteActionButton]}
                  disabled={deleting}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
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
        {/* Island Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.islandIcon,
                { backgroundColor: `${getZoneColor(island.zone)}15` },
              ]}
            >
              <MapPin size={24} color={getZoneColor(island.zone)} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.islandName}>{island.name}</Text>
              <View style={styles.islandLocation}>
                <Activity size={16} color={getZoneColor(island.zone)} />
                <Text
                  style={[
                    styles.zoneText,
                    { color: getZoneColor(island.zone) },
                  ]}
                >
                  {getZoneLabel(island.zone)}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              island.is_active ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: island.is_active
                    ? colors.success
                    : colors.textSecondary,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                island.is_active
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {island.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        {islandStats && (
          <View style={styles.quickStats}>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statCardIcon}>
                    <RouteIcon size={20} color={colors.primary} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {islandStats.totalRoutes}
                    </Text>
                    <Text style={styles.statCardLabel}>Total Routes</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statCardIcon,
                      { backgroundColor: colors.successLight },
                    ]}
                  >
                    <Activity size={20} color={colors.success} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {islandStats.activeRoutes}
                    </Text>
                    <Text style={styles.statCardLabel}>Active Routes</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statCardIcon,
                      { backgroundColor: colors.infoLight },
                    ]}
                  >
                    <TrendingUp size={20} color={colors.info} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {islandStats.fromRoutes}
                    </Text>
                    <Text style={styles.statCardLabel}>Departure Routes</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statCardIcon,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <BarChart3 size={20} color={colors.warning} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {islandStats.toRoutes}
                    </Text>
                    <Text style={styles.statCardLabel}>Arrival Routes</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Island Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Island Information</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <MapPin size={20} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Island Name</Text>
                  <Text style={styles.infoValue}>{island.name}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: `${getZoneColor(island.zone)}15` },
                  ]}
                >
                  <Activity size={20} color={getZoneColor(island.zone)} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Zone</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: getZoneColor(island.zone) },
                    ]}
                  >
                    {getZoneLabel(island.zone)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    {
                      backgroundColor: island.is_active
                        ? colors.successLight
                        : colors.backgroundTertiary,
                    },
                  ]}
                >
                  <Settings
                    size={20}
                    color={
                      island.is_active ? colors.success : colors.textSecondary
                    }
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: island.is_active
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {island.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Calendar size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Created</Text>
                  <Text style={styles.infoValue}>
                    {new Date(island.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Routes Information */}
        {islandStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routes Overview</Text>

            <View style={styles.routesSummary}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Info size={20} color={colors.info} />
                </View>
                <Text style={styles.routesDescription}>
                  This island is connected to {islandStats.totalRoutes} route
                  {islandStats.totalRoutes !== 1 ? 's' : ''}, with{' '}
                  {islandStats.fromRoutes} departure route
                  {islandStats.fromRoutes !== 1 ? 's' : ''} and{' '}
                  {islandStats.toRoutes} arrival route
                  {islandStats.toRoutes !== 1 ? 's' : ''}.
                </Text>
              </View>

              {islandStats.totalRoutes > 0 && canViewRoutes() && (
                <Button
                  title='View All Routes'
                  variant='outline'
                  onPress={handleViewRoutes}
                  icon={<RouteIcon size={16} color={colors.primary} />}
                />
              )}
            </View>
          </View>
        )}

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>

          <View style={styles.systemInfo}>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Island ID</Text>
              <Text style={styles.systemValue} selectable>
                {island.id}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Created Date</Text>
              <Text style={styles.systemValue}>
                {formatDate(island.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {canUpdateIslands() && (
            <Button
              title='Edit Island'
              onPress={handleEdit}
              variant='primary'
              icon={<Edit size={20} color={colors.white} />}
            />
          )}
          {canDeleteIslands() && (
            <Button
              title='Delete Island'
              onPress={handleDelete}
              variant='outline'
              loading={deleting}
              style={styles.deleteButton}
              icon={<Trash2 size={20} color={colors.error} />}
            />
          )}
        </View>
      </ScrollView>
    </View>
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
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: colors.warningLight,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    marginBottom: 20,
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
  deleteActionButton: {
    backgroundColor: colors.errorLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  islandIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  islandName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 30,
  },
  islandLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.backgroundTertiary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  quickStats: {
    marginBottom: 24,
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardContent: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
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
  infoGrid: {
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  routesSummary: {
    gap: 20,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.info}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  routesDescription: {
    flex: 1,
    fontSize: 14,
    color: colors.info,
    lineHeight: 20,
    fontWeight: '500',
  },
  systemInfo: {
    gap: 16,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  systemLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  systemValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 16,
    marginTop: 8,
  },
  deleteButton: {
    borderColor: colors.error,
  },
});
