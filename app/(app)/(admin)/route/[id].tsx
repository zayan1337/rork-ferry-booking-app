import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useOperationsStore } from "@/store/admin/operationsStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
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
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import StatCard from "@/components/admin/StatCard";

const { width: screenWidth } = Dimensions.get('window');

export default function RouteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchRoute, updateRouteData, removeRoute, trips, fetchTrips } = useOperationsStore();
  const { canViewRoutes, canUpdateRoutes, canDeleteRoutes } = useAdminPermissions();
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    loadRouteData();
    // Also fetch trips to calculate statistics
    fetchTrips();
  }, [id]);

  const loadRouteData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const route = await fetchRoute(id);
      setRouteData(route);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to load route details'
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Calculate additional statistics
  const routeStats = useMemo(() => {
    if (!routeData || !trips) return null;

    const routeTrips = trips.filter(trip => trip.route_id === id);
    const totalTrips = routeTrips.length;
    const completedTrips = routeTrips.filter(trip => trip.status === 'arrived' || trip.status === 'completed').length;
    const cancelledTrips = routeTrips.filter(trip => trip.status === 'cancelled').length;
    const delayedTrips = routeTrips.filter(trip => trip.status === 'delayed').length;

    const onTimePerformance = totalTrips > 0 ? ((completedTrips / totalTrips) * 100) : 0;
    const cancellationRate = totalTrips > 0 ? ((cancelledTrips / totalTrips) * 100) : 0;

    // Calculate total revenue estimate
    const estimatedRevenue = routeTrips.reduce((total, trip) => {
      return total + ((trip.booked_seats || trip.bookings || 0) * (routeData.base_fare || 0));
    }, 0);

    return {
      totalTrips,
      completedTrips,
      cancelledTrips,
      delayedTrips,
      onTimePerformance: onTimePerformance.toFixed(1),
      cancellationRate: cancellationRate.toFixed(1),
      estimatedRevenue,
      averageOccupancy: routeData.average_occupancy_30d || 0,
    };
  }, [routeData, trips, id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRouteData();
    await fetchTrips();
    setIsRefreshing(false);
  };

  const handleEdit = () => {
    if (canUpdateRoutes()) {
      router.push(`../route/${id}/edit` as any);
    } else {
      Alert.alert("Access Denied", "You don't have permission to edit routes.");
    }
  };

  const handleDelete = () => {
    if (!canDeleteRoutes()) {
      Alert.alert("Access Denied", "You don't have permission to delete routes.");
      return;
    }

    Alert.alert(
      "Delete Route",
      `Are you sure you want to delete the route "${routeData?.name || routeData?.route_name}"? This action cannot be undone and will affect all associated trips and bookings.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (id) {
                const success = await removeRoute(id);
                if (success) {
                  Alert.alert("Success", "Route deleted successfully.");
                  router.back();
                } else {
                  throw new Error("Failed to delete route");
                }
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete route. There may be active bookings on this route.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleViewTrips = () => {
    router.push(`../schedule?route=${id}` as any);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'payment';
      case 'maintenance': return 'payment';
      default: return 'default';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return colors.success;
    if (utilization >= 60) return colors.warning;
    return colors.danger;
  };

  const formatCurrency = (amount: number) => {
    return `MVR ${amount.toLocaleString()}`;
  };

  if (!canViewRoutes()) {
    return (
      <View style={styles.noPermissionContainer}>
        <Stack.Screen options={{ title: "Access Denied" }} />
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view route details.
        </Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Loading..." }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading route details...</Text>
      </View>
    );
  }

  if (!routeData) {
    return (
      <View style={styles.notFoundContainer}>
        <Stack.Screen options={{ title: "Route Not Found" }} />
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.notFoundText}>Route not found</Text>
        <Text style={styles.notFoundSubtext}>
          The route you're looking for doesn't exist or may have been deleted.
        </Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: routeData.name || routeData.route_name || "Route Details",
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
                <Button
                  title={isTablet ? "Edit" : ""}
                  variant="outline"
                  size="small"
                  icon={<Edit size={16} color={colors.primary} />}
                  onPress={handleEdit}
                />
              )}
              {canDeleteRoutes() && (
                <Button
                  title={isTablet ? "Delete" : ""}
                  variant="danger"
                  size="small"
                  icon={<Trash2 size={16} color="#FFFFFF" />}
                  onPress={handleDelete}
                  disabled={isDeleting}
                />
              )}
            </View>
          ),
        }}
      />

      {/* Route Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.routeIcon}>
            <RouteIcon size={24} color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.routeName}>{routeData.name || routeData.route_name}</Text>
            <View style={styles.routeDirection}>
              <MapPin size={16} color={colors.textSecondary} />
              <Text style={styles.routeDescription}>
                {routeData.origin || routeData.from_island_name} → {routeData.destination || routeData.to_island_name}
              </Text>
            </View>
          </View>
        </View>
        <StatusBadge
          status={routeData.status}
          variant={getStatusVariant(routeData.status)}
        />
      </View>

      {/* Quick Stats */}
      {routeStats && (
        <View style={styles.quickStats}>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Trips"
              value={routeStats.totalTrips.toString()}
              icon={<Calendar size={20} color={colors.primary} />}
              trend={routeStats.totalTrips > 0 ? "up" : "neutral"}
              size="small"
            />
            <StatCard
              title="On-Time Performance"
              value={`${routeStats.onTimePerformance}%`}
              icon={<Timer size={20} color={colors.success} />}
              trend={parseFloat(routeStats.onTimePerformance) > 80 ? "up" : "down"}
              size="small"
            />
            <StatCard
              title="Revenue (Est.)"
              value={formatCurrency(routeStats.estimatedRevenue)}
              icon={<TrendingUp size={20} color={colors.success} />}
              trend="up"
              size="small"
            />
            <StatCard
              title="Avg Occupancy"
              value={`${routeStats.averageOccupancy}%`}
              icon={<Users size={20} color={getUtilizationColor(routeStats.averageOccupancy)} />}
              trend={routeStats.averageOccupancy > 70 ? "up" : "down"}
              size="small"
            />
          </View>
        </View>
      )}

      {/* Route Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Information</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MapPin size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Origin</Text>
                <Text style={styles.infoValue}>{routeData.origin || routeData.from_island_name}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Navigation size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Destination</Text>
                <Text style={styles.infoValue}>{routeData.destination || routeData.to_island_name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Activity size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>{routeData.distance || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Clock size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{routeData.duration || "N/A"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <DollarSign size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Base Fare</Text>
                <Text style={styles.infoValue}>{formatCurrency(routeData.base_fare || 0)}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Target size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: routeData.status === 'active' ? colors.success : colors.warning }]}>
                  {routeData.status?.charAt(0).toUpperCase() + routeData.status?.slice(1)}
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

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <BarChart3 size={20} color={colors.success} />
                <Text style={styles.metricTitle}>Trip Statistics</Text>
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{routeStats.completedTrips}/{routeStats.totalTrips}</Text>
                <Text style={styles.metricLabel}>Completed Trips</Text>
                {routeStats.cancelledTrips > 0 && (
                  <Text style={styles.metricSubtext}>
                    {routeStats.cancelledTrips} cancelled ({routeStats.cancellationRate}%)
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Star size={20} color={colors.warning} />
                <Text style={styles.metricTitle}>Reliability</Text>
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{routeStats.onTimePerformance}%</Text>
                <Text style={styles.metricLabel}>On-Time Performance</Text>
                {routeStats.delayedTrips > 0 && (
                  <Text style={styles.metricSubtext}>
                    {routeStats.delayedTrips} delayed trips
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionButtons}>
          <Button
            title="View Trips"
            variant="outline"
            onPress={handleViewTrips}
            icon={<Calendar size={18} color={colors.primary} />}
            style={styles.actionButton}
          />

          <Button
            title="Schedule New Trip"
            variant="primary"
            onPress={() => router.push(`../schedule/new?route=${id}` as any)}
            icon={<Plane size={18} color="#FFFFFF" />}
            style={styles.actionButton}
          />
        </View>
      </View>

      {/* Description */}
      {routeData.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{routeData.description}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  routeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  routeName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  routeDirection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  quickStats: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  section: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  metricContent: {
    gap: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metricSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionsSection: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: 32,
    gap: 16,
  },
  notFoundText: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  notFoundSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: 32,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 250,
  },
}); 