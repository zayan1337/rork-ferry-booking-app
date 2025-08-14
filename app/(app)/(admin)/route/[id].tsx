import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
// UPDATED: Use new route management hook instead of operations store
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from '@/types';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
  Activity,
  Navigation,
  BarChart3,
  Target,
  Route as RouteIcon,
  Plane,
  Timer,
  Star,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import Button from '@/components/admin/Button';
import StatusBadge from '@/components/admin/StatusBadge';
import StatCard from '@/components/admin/StatCard';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');

type Route = AdminManagement.Route;

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canViewRoutes, canUpdateRoutes, canDeleteRoutes } =
    useAdminPermissions();

  // UPDATED: Use new route management hook
  const {
    routes,
    getById,
    getRouteWithDetails,
    remove,
    loading,
    error,
    formatCurrency,
    formatPercentage,
    getPerformanceRating,
    getPerformanceColor,
  } = useRouteManagement();

  const [routeData, setRouteData] = useState<Route | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    loadRouteData();
  }, [id]);

  const loadRouteData = async () => {
    if (!id) return;

    try {
      const route = getById(id);
      if (route) {
        setRouteData(route);
      } else {
        // Try to get detailed route data
        const detailedRoute = await getRouteWithDetails(id);
        if (detailedRoute) {
          setRouteData(detailedRoute as Route);
        }
      }
    } catch (error) {
      console.error('Error loading route:', error);
      Alert.alert('Error', 'Failed to load route details');
    }
  };

  // Calculate additional statistics
  const routeStats = useMemo(() => {
    if (!routeData) return null;

    // Use the statistics directly from the route data
    const totalTrips = routeData.total_trips_30d || 0;
    const onTimePerformance = routeData.on_time_performance_30d || 0;
    const cancellationRate = routeData.cancellation_rate_30d || 0;
    const estimatedRevenue = routeData.total_revenue_30d || 0;
    const averageOccupancy = routeData.average_occupancy_30d || 0;

    return {
      totalTrips,
      onTimePerformance: onTimePerformance.toFixed(1),
      cancellationRate: cancellationRate.toFixed(1),
      estimatedRevenue,
      averageOccupancy,
      performanceRating: getPerformanceRating(routeData),
    };
  }, [routeData, getPerformanceRating]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRouteData();
    setIsRefreshing(false);
  };

  const handleEdit = () => {
    if (canUpdateRoutes()) {
      router.push(`../route/${id}/edit` as any);
    } else {
      Alert.alert('Access Denied', "You don't have permission to edit routes.");
    }
  };

  const handleDelete = () => {
    if (!canDeleteRoutes()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to delete routes."
      );
      return;
    }

    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete the route "${routeData?.name}"? This action cannot be undone and will affect all associated trips and bookings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (id) {
                await remove(id);
                Alert.alert('Success', 'Route deleted successfully.');
                router.back();
              }
            } catch (error) {
              console.error('Error deleting route:', error);
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to delete route. There may be active bookings on this route.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleViewTrips = () => {
    router.push(`../trips?route=${id}` as any);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'payment';
      case 'maintenance':
        return 'payment';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textSecondary;
      case 'maintenance':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return colors.success;
    if (utilization >= 60) return colors.warning;
    return colors.danger;
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
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view route details.
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

  if (loading.routes || loading.singleRoute) {
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
          <Text style={styles.loadingText}>Loading route details...</Text>
        </View>
      </View>
    );
  }

  if (!routeData) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Route Not Found',
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
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Route Not Found</Text>
          <Text style={styles.notFoundText}>
            The route you're looking for doesn't exist or may have been deleted.
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
          title: routeData.name || 'Route Details',
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
              {canUpdateRoutes() && (
                <TouchableOpacity
                  onPress={handleEdit}
                  style={styles.headerActionButton}
                >
                  <Edit size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              {canDeleteRoutes() && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={[styles.headerActionButton, styles.deleteActionButton]}
                  disabled={isDeleting}
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
        {/* Route Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.routeIcon}>
              <RouteIcon size={24} color={colors.primary} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.routeName}>{routeData.name}</Text>
              <View style={styles.routeDirection}>
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={styles.routeDescription}>
                  {routeData.from_island_name || routeData.origin || 'Unknown'}{' '}
                  →{' '}
                  {routeData.to_island_name ||
                    routeData.destination ||
                    'Unknown'}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              routeData.status === 'active'
                ? styles.statusActive
                : styles.statusInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(routeData.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                routeData.status === 'active'
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {routeData.status?.charAt(0).toUpperCase() +
                routeData.status?.slice(1)}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        {routeStats && (
          <View style={styles.quickStats}>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statCardIcon}>
                    <Calendar size={20} color={colors.primary} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {routeStats.totalTrips}
                    </Text>
                    <Text style={styles.statCardLabel}>Total Trips</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statCardIcon,
                      { backgroundColor: colors.successLight },
                    ]}
                  >
                    <Timer size={20} color={colors.success} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {routeStats.onTimePerformance}%
                    </Text>
                    <Text style={styles.statCardLabel}>
                      On-Time Performance
                    </Text>
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
                      {formatCurrency(routeStats.estimatedRevenue)}
                    </Text>
                    <Text style={styles.statCardLabel}>Revenue (Est.)</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <View
                    style={[
                      styles.statCardIcon,
                      { backgroundColor: colors.warningLight },
                    ]}
                  >
                    <Users size={20} color={colors.warning} />
                  </View>
                  <View style={styles.statCardContent}>
                    <Text style={styles.statCardValue}>
                      {routeStats.averageOccupancy}%
                    </Text>
                    <Text style={styles.statCardLabel}>Avg Occupancy</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Route Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <MapPin size={20} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Origin</Text>
                  <Text style={styles.infoValue}>
                    {routeData.from_island_name ||
                      routeData.origin ||
                      'Unknown'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.infoLight },
                  ]}
                >
                  <Navigation size={20} color={colors.info} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Destination</Text>
                  <Text style={styles.infoValue}>
                    {routeData.to_island_name ||
                      routeData.destination ||
                      'Unknown'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.successLight },
                  ]}
                >
                  <Activity size={20} color={colors.success} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Distance</Text>
                  <Text style={styles.infoValue}>
                    {routeData.distance || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.warningLight },
                  ]}
                >
                  <Clock size={20} color={colors.warning} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>
                    {routeData.duration || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <DollarSign size={20} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Base Fare</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(routeData.base_fare || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    {
                      backgroundColor:
                        routeData.status === 'active'
                          ? colors.successLight
                          : colors.backgroundTertiary,
                    },
                  ]}
                >
                  <Target
                    size={20}
                    color={
                      routeData.status === 'active'
                        ? colors.success
                        : colors.textSecondary
                    }
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: getStatusColor(routeData.status) },
                    ]}
                  >
                    {routeData.status?.charAt(0).toUpperCase() +
                      routeData.status?.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        {routeStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>

            <View style={styles.performanceGrid}>
              <View style={styles.performanceCard}>
                <View style={styles.performanceIcon}>
                  <BarChart3 size={20} color={colors.success} />
                </View>
                <View style={styles.performanceContent}>
                  <Text style={styles.performanceTitle}>Trip Statistics</Text>
                  <Text style={styles.performanceValue}>
                    {routeStats.totalTrips}
                  </Text>
                  <Text style={styles.performanceLabel}>Total Trips (30d)</Text>
                  <Text style={styles.performanceSubtext}>
                    Cancellation rate: {routeStats.cancellationRate}%
                  </Text>
                </View>
              </View>

              <View style={styles.performanceCard}>
                <View
                  style={[
                    styles.performanceIcon,
                    { backgroundColor: colors.warningLight },
                  ]}
                >
                  <Star size={20} color={colors.warning} />
                </View>
                <View style={styles.performanceContent}>
                  <Text style={styles.performanceTitle}>Reliability</Text>
                  <Text style={styles.performanceValue}>
                    {routeStats.onTimePerformance}%
                  </Text>
                  <Text style={styles.performanceLabel}>
                    On-Time Performance
                  </Text>
                  <Text style={styles.performanceSubtext}>
                    Rating: {routeStats.performanceRating}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Trip Operations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Operations</Text>

          <View style={styles.operationsSummary}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Info size={20} color={colors.info} />
              </View>
              <Text style={styles.operationsDescription}>
                This route has {routeStats?.totalTrips || 0} trip
                {(routeStats?.totalTrips || 0) !== 1 ? 's' : ''} in the last 30
                days, with {formatPercentage(routeStats?.averageOccupancy || 0)}{' '}
                average occupancy and {routeStats?.onTimePerformance || 0}%
                on-time performance.
              </Text>
            </View>

            <View style={styles.operationButtons}>
              <Button
                title='View All Trips'
                variant='outline'
                onPress={handleViewTrips}
                icon={<Calendar size={16} color={colors.primary} />}
                style={styles.operationButton}
              />

              <Button
                title='Schedule New Trip'
                variant='primary'
                onPress={() => router.push(`../trip/new?route=${id}` as any)}
                icon={<Plane size={16} color={colors.white} />}
                style={styles.operationButton}
              />
            </View>
          </View>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>

          <View style={styles.systemInfo}>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Route ID</Text>
              <Text style={styles.systemValue} selectable>
                {routeData.id}
              </Text>
            </View>

            {routeData.created_at && (
              <View style={styles.systemRow}>
                <Text style={styles.systemLabel}>Created Date</Text>
                <Text style={styles.systemValue}>
                  {formatDate(routeData.created_at)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {routeData.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{routeData.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {canUpdateRoutes() && (
            <Button
              title='Edit Route'
              onPress={handleEdit}
              variant='primary'
              icon={<Edit size={20} color={colors.white} />}
            />
          )}
          {canDeleteRoutes() && (
            <Button
              title='Delete Route'
              onPress={handleDelete}
              variant='outline'
              loading={isDeleting}
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
    padding: 12,
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  notFoundIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  notFoundText: {
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
  routeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  routeName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 30,
  },
  routeDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
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
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  performanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceContent: {
    gap: 2,
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  performanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  performanceSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 14,
  },
  operationsSummary: {
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
    backgroundColor: colors.info + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  operationsDescription: {
    flex: 1,
    fontSize: 14,
    color: colors.info,
    lineHeight: 20,
    fontWeight: '500',
  },
  operationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  operationButton: {
    flex: 1,
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
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '400',
  },
  actionsContainer: {
    gap: 16,
    marginTop: 8,
  },
  deleteButton: {
    borderColor: colors.error,
  },
});
