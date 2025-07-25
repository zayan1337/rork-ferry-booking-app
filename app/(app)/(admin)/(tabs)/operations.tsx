import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
// UPDATED: Use new route management hook instead of operations data hook
import { useRouteManagement } from "@/hooks/useRouteManagement";
import { useOperationsStore } from "@/store/admin/operationsStore";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";
import { AdminManagement } from "@/types";
import {
  Plus,
  Eye,
  AlertTriangle,
  Calendar,
  MapPin,
  Route as RouteIcon,
  Ship,
} from "lucide-react-native";

// Operations Components
import OperationsStats from "@/components/admin/operations/OperationsStats";
import SectionSelector from "@/components/admin/operations/SectionSelector";

// Existing Components
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import TripItem from "@/components/admin/TripItem";

type Route = AdminManagement.Route;

export default function OperationsScreen() {
  const {
    canViewRoutes,
    canManageRoutes,
    canViewTrips,
    canManageTrips,
    canViewVessels,
    canManageVessels,
  } = useAdminPermissions();

  // UPDATED: Use new route management hook for routes
  const {
    routes: allRoutes,
    stats: routeStats,
    searchQuery: routeSearchQuery,
    setSearchQuery: setRouteSearchQuery,
    loading: routeLoading,
    loadAll: loadRoutes,
  } = useRouteManagement();

  // Keep operations store for trips, vessels, and other data
  const {
    trips: filteredTrips,
    vessels: filteredVessels,
    todaySchedule,
    searchQueries,
    setSearchQuery,
    loading,
    stats,
  } = useOperationsStore();

  // Load routes on component mount
  useEffect(() => {
    if (!allRoutes || allRoutes.length === 0) {
      loadRoutes();
    }
  }, [allRoutes, loadRoutes]);

  // Limit routes to 4 for display (like islands/zones pattern)
  const displayRoutes = useMemo(() => {
    if (!allRoutes) return [];
    
    // Apply search filter if there's a search query
    let filtered = allRoutes;
    if (routeSearchQuery) {
      filtered = allRoutes.filter(route =>
        route.name?.toLowerCase().includes(routeSearchQuery.toLowerCase()) ||
        route.from_island_name?.toLowerCase().includes(routeSearchQuery.toLowerCase()) ||
        route.to_island_name?.toLowerCase().includes(routeSearchQuery.toLowerCase())
      );
    }
    
    // Return only first 4 routes for display
    return filtered.slice(0, 4);
  }, [allRoutes, routeSearchQuery]);

  // Limit trips to 4 for display
  const displayTrips = useMemo(() => {
    if (!filteredTrips) return [];
    return filteredTrips
      .filter((trip, index, self) => index === self.findIndex(t => t.id === trip.id))
      .slice(0, 4);
  }, [filteredTrips]);

  // Limit vessels to 4 for display
  const displayVessels = useMemo(() => {
    if (!filteredVessels) return [];
    return filteredVessels
      .filter((vessel, index, self) => index === self.findIndex(v => v.id === vessel.id))
      .slice(0, 4);
  }, [filteredVessels]);

  const [activeSection, setActiveSection] = useState<"routes" | "trips" | "vessels" | "schedule">("routes");

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isTablet, isSmallScreen } = getResponsiveDimensions();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh routes and other data
      await Promise.all([
        loadRoutes(),
        // Add other refresh calls here if needed
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRoutePress = (routeId: string) => {
    if (canViewRoutes()) {
      router.push(`../route/${routeId}` as any);
    }
  };

  const handleTripPress = (tripId: string) => {
    if (canViewTrips()) {
      router.push(`../trips/${tripId}` as any);
    }
  };

  const handleVesselPress = (vesselId: string) => {
    if (canViewVessels()) {
      router.push(`../vessel/${vesselId}` as any);
    }
  };

  const handleAddRoute = () => {
    if (canManageRoutes()) {
      router.push("../route/new" as any);
    } else {
      Alert.alert("Access Denied", "You don't have permission to create routes.");
    }
  };

  const handleAddTrip = () => {
    if (canManageTrips()) {
      router.push("../trips/new" as any);
    } else {
      Alert.alert("Access Denied", "You don't have permission to create trips.");
    }
  };

  const handleAddVessel = () => {
    if (canManageVessels()) {
      router.push("../vessel/new" as any);
    } else {
      Alert.alert("Access Denied", "You don't have permission to create vessels.");
    }
  };

  const renderRoutes = () => {
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

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title="Routes Management"
              subtitle={`${routeStats.active} active routes`}
            />
          </View>
          {canManageRoutes() && (
            <View style={styles.sectionHeaderButton}>
              <Button
                title="Add Route"
                onPress={handleAddRoute}
                size="small"
                variant="outline"
                icon={<Plus size={16} color={colors.primary} />}
              />
            </View>
          )}
        </View>

        <SearchBar
          placeholder="Search routes..."
          value={routeSearchQuery || ""}
          onChangeText={setRouteSearchQuery}
        />

        <View style={styles.itemsList}>
          {displayRoutes.length > 0 ? (
            displayRoutes.map((route: Route, index: number) => (
              <TouchableOpacity
                key={`route-${route.id}-${index}`}
                style={styles.routeItem}
                onPress={() => handleRoutePress(route.id)}
              >
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{route.name || 'Unknown Route'}</Text>
                  <Text style={styles.routeDetails}>
                    {route.from_island_name || route.origin || 'Unknown'} → {route.to_island_name || route.destination || 'Unknown'}
                  </Text>
                  <Text style={styles.routeFare}>MVR {route.base_fare || 0}</Text>
                </View>
                <View style={styles.routeStats}>
                  <View style={[styles.statusBadge, route.status === "active" ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusText, route.status === "active" ? styles.statusTextActive : styles.statusTextInactive]}>
                      {route.status || 'unknown'}
                    </Text>
                  </View>
                  {route.total_trips_30d !== null && route.total_trips_30d !== undefined && (
                    <Text style={styles.routeTrips}>{route.total_trips_30d} trips/30d</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <RouteIcon size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No routes found</Text>
              <Text style={styles.emptyStateText}>
                {routeSearchQuery ? 'Try adjusting your search terms' : 'No routes available'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push("../routes" as any)}
        >
          <Text style={styles.viewAllText}>View All Routes</Text>
          <Eye size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderTrips = () => {
    if (!canViewTrips()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view trips.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title="Trips Management"
              subtitle={`${stats.todayTrips} trips today`}
            />
          </View>
          {canManageTrips() && (
            <View style={styles.sectionHeaderButton}>
              <Button
                title="Add Trip"
                onPress={handleAddTrip}
                size="small"
                variant="outline"
                icon={<Plus size={16} color={colors.primary} />}
              />
            </View>
          )}
        </View>

        <SearchBar
          placeholder="Search trips..."
          value={searchQueries.trips || ""}
          onChangeText={(text) => setSearchQuery("trips", text)}
        />

        <View style={styles.itemsList}>
          {displayTrips.length > 0 ? (
            displayTrips.map((trip: any, index: number) => (
              <TripItem
                key={`trip-${trip.id}-${index}`}
                trip={{
                  ...trip,
                  routeId: trip.route_id,
                  vesselId: trip.vessel_id,
                  date: trip.travel_date,
                  departureTime: trip.departure_time,
                  routeName: trip.routeName || trip.route_name || 'Unknown Route',
                  vesselName: trip.vesselName || trip.vessel_name || 'Unknown Vessel',
                  status: trip.status === 'boarding' || trip.status === 'departed' ? 'in-progress' :
                    trip.status === 'arrived' || trip.status === 'completed' ? 'completed' :
                      trip.status === 'delayed' ? 'scheduled' :
                        trip.status as any,
                  bookings: trip.bookings || 0,
                } as any}
                onPress={() => handleTripPress(trip.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No trips found</Text>
              <Text style={styles.emptyStateText}>
                {searchQueries.trips ? 'Try adjusting your search terms' : 'No trips scheduled for today'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push("../trips" as any)}
        >
          <Text style={styles.viewAllText}>View All Trips</Text>
          <Eye size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderVessels = () => {
    if (!canViewVessels()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view vessels.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title="Vessels Management"
              subtitle={`${stats.activeVessels} active vessels`}
            />
          </View>
          {canManageVessels() && (
            <View style={styles.sectionHeaderButton}>
              <Button
                title="Add Vessel"
                onPress={handleAddVessel}
                size="small"
                variant="outline"
                icon={<Plus size={16} color={colors.primary} />}
              />
            </View>
          )}
        </View>

        <SearchBar
          placeholder="Search vessels..."
          value={searchQueries.vessels || ""}
          onChangeText={(text) => setSearchQuery("vessels", text)}
        />

        <View style={styles.itemsList}>
          {displayVessels.length > 0 ? (
            displayVessels.map((vessel: any, index: number) => (
              <TouchableOpacity
                key={`vessel-${vessel.id}-${index}`}
                style={styles.vesselItem}
                onPress={() => handleVesselPress(vessel.id)}
              >
                <View style={styles.vesselInfo}>
                  <Text style={styles.vesselName}>{vessel.name || 'Unknown Vessel'}</Text>
                  <Text style={styles.vesselCapacity}>
                    Capacity: {vessel.seating_capacity || 0} passengers
                  </Text>
                  {vessel.capacity_utilization_30d !== null && vessel.capacity_utilization_30d !== undefined && (
                    <Text style={styles.vesselUtilization}>
                      Utilization: {vessel.capacity_utilization_30d}%
                    </Text>
                  )}
                </View>
                <View style={styles.vesselStats}>
                  <View style={[styles.statusBadge, vessel.status === "active" ? styles.statusActive :
                    vessel.status === "maintenance" ? styles.statusMaintenance : styles.statusInactive]}>
                    <Text style={[styles.statusText, vessel.status === "active" ? styles.statusTextActive : styles.statusTextInactive]}>
                      {vessel.status || 'unknown'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ship size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No vessels found</Text>
              <Text style={styles.emptyStateText}>
                {searchQueries.vessels ? 'Try adjusting your search terms' : 'No vessels available'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push("../vessels" as any)}
        >
          <Text style={styles.viewAllText}>View All Vessels</Text>
          <Eye size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSchedule = () => {
    if (!canViewTrips()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view schedule.
          </Text>
        </View>
      );
    }

    // Limit schedule to 4 items for display
    const displaySchedule = todaySchedule.slice(0, 4);

    return (
      <View style={styles.sectionContent}>
        <SectionHeader
          title="Schedule Overview"
          subtitle="Today's trip schedule"
        />

        {displaySchedule.length > 0 ? (
          <View style={styles.scheduleGrid}>
            {displaySchedule.map((trip: any, index: number) => (
              <TouchableOpacity
                key={`schedule-${trip.id}-${index}`}
                style={styles.scheduleItem}
                onPress={() => handleTripPress(trip.id)}
              >
                <Text style={styles.scheduleTime}>{trip.departure_time || '--:--'}</Text>
                <Text style={styles.scheduleRoute}>{trip.routeName || trip.route_name || 'Unknown Route'}</Text>
                <Text style={styles.scheduleVessel}>{trip.vesselName || trip.vessel_name || 'Unknown Vessel'}</Text>
                <View style={styles.scheduleBookings}>
                  <Text style={styles.scheduleBookingText}>
                    {trip.bookings || 0}/{trip.capacity || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No trips scheduled</Text>
            <Text style={styles.emptyStateText}>
              No trips are scheduled for today
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push("../trips" as any)}
        >
          <Text style={styles.viewAllText}>View All Trips</Text>
          <Calendar size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case "routes":
        return renderRoutes();
      case "trips":
        return renderTrips();
      case "vessels":
        return renderVessels();
      case "schedule":
        return renderSchedule();
      default:
        return renderRoutes();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
      showsVerticalScrollIndicator={false}
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
          title: "Operations",
        }}
      />

      {/* Operations Stats */}
      <OperationsStats stats={{
        ...stats,
        activeRoutes: routeStats.active,
        totalRoutes: routeStats.total,
      }} isTablet={isTablet} />

      {/* Section Selector */}
      <SectionSelector
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        canViewRoutes={canViewRoutes()}
        canViewTrips={canViewTrips()}
        canViewVessels={canViewVessels()}
      />

      {/* Content */}
      {renderContent()}
    </ScrollView>
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
  sectionContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    maxWidth: "40%",
  },
  itemsList: {
    gap: 12,
    marginTop: 16,
  },
  routeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "600",
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
    fontWeight: "500",
    color: colors.primary,
  },
  routeStats: {
    alignItems: "flex-end",
    gap: 8,
  },
  routeTrips: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  vesselItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vesselInfo: {
    flex: 1,
  },
  vesselName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  vesselCapacity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  vesselUtilization: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  vesselStats: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: colors.success + "20",
  },
  statusInactive: {
    backgroundColor: colors.textSecondary + "20",
  },
  statusMaintenance: {
    backgroundColor: colors.warning + "20",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  scheduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  scheduleItem: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    minWidth: "45%",
    flex: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  scheduleRoute: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  scheduleVessel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  scheduleBookings: {
    alignSelf: "flex-start",
  },
  scheduleBookingText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.primary,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 250,
  },
  noPermissionIcon: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: colors.warning + "10",
    borderRadius: 24,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    padding: 8,
    backgroundColor: colors.primary + "10",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyStateIcon: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: colors.textSecondary + "10",
    borderRadius: 24,
  },
}); 