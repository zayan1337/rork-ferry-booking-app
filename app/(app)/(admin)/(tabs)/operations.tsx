import React, { useState } from "react";
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
import { useOperationsData } from "@/hooks/useOperationsData";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";
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
import IslandItem from "@/components/admin/IslandItem";

export default function OperationsScreen() {
  const {
    canViewRoutes,
    canManageRoutes,
    canViewTrips,
    canManageTrips,
    canViewVessels,
    canManageVessels,
    canViewIslands,
    canManageIslands,
  } = useAdminPermissions();

  const {
    stats,
    activeSection,
    setActiveSection,
    filteredRoutes,
    filteredTrips,
    filteredVessels,
    filteredIslands,
    todaySchedule,
    searchQueries,
    setSearchQuery,
    loading,
  } = useOperationsData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isTablet, isSmallScreen } = getResponsiveDimensions();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Refresh logic would go here
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
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

  const handleIslandPress = (islandId: string) => {
    if (canViewIslands()) {
      router.push(`../island/${islandId}` as any);
    }
  };

  const handleAddIsland = () => {
    if (canManageIslands()) {
      router.push("../island/new" as any);
    } else {
      Alert.alert("Access Denied", "You don't have permission to create islands.");
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

    // Filter out duplicate routes by ID to prevent key conflicts
    const uniqueRoutes = filteredRoutes.filter((route, index, self) =>
      index === self.findIndex(r => r.id === route.id)
    );

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title="Routes Management"
              subtitle={`${stats.activeRoutes} active routes`}
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
          value={searchQueries.routes || ""}
          onChangeText={(text) => setSearchQuery("routes", text)}
        />

        <View style={styles.itemsList}>
          {uniqueRoutes.length > 0 ? (
            uniqueRoutes.map((route, index) => (
              <TouchableOpacity
                key={`route-${route.id}-${index}`}
                style={styles.routeItem}
                onPress={() => handleRoutePress(route.id)}
              >
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{route.name || route.route_name || 'Unknown Route'}</Text>
                  <Text style={styles.routeDetails}>
                    {route.origin || route.from_island_name || 'Unknown'} → {route.destination || route.to_island_name || 'Unknown'}
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
                {searchQueries.routes ? 'Try adjusting your search terms' : 'No routes available'}
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

    // Filter out duplicate trips by ID to prevent key conflicts
    const uniqueTrips = filteredTrips.filter((trip, index, self) =>
      index === self.findIndex(t => t.id === trip.id)
    );

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
          {uniqueTrips.length > 0 ? (
            uniqueTrips.map((trip, index) => (
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

    // Filter out duplicate vessels by ID to prevent key conflicts
    const uniqueVessels = filteredVessels.filter((vessel, index, self) =>
      index === self.findIndex(v => v.id === vessel.id)
    );

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
          {uniqueVessels.length > 0 ? (
            uniqueVessels.map((vessel, index) => (
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

  const renderIslands = () => {
    if (!canViewIslands()) {
      return (
        <View style={styles.noPermissionContainer}>
          <View style={styles.noPermissionIcon}>
            <AlertTriangle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view islands.
          </Text>
        </View>
      );
    }

    // Filter out duplicate islands by ID to prevent key conflicts
    const uniqueIslands = filteredIslands.filter((island, index, self) =>
      index === self.findIndex(i => i.id === island.id)
    );

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIcon}>
                <MapPin size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Islands Management</Text>
                <Text style={styles.sectionSubtitle}>{uniqueIslands.length} islands available</Text>
              </View>
            </View>
          </View>
          {canManageIslands() && (
            <View style={styles.sectionHeaderButton}>
              <Button
                title="Add Island"
                onPress={handleAddIsland}
                size="small"
                variant="outline"
                icon={<Plus size={16} color={colors.primary} />}
              />
            </View>
          )}
        </View>

        <SearchBar
          placeholder="Search islands..."
          value={searchQueries.islands || ""}
          onChangeText={(text) => setSearchQuery("islands", text)}
        />

        <View style={styles.itemsList}>
          {uniqueIslands.length > 0 ? (
            uniqueIslands.map((island, index) => (
              <IslandItem
                key={`island-${island.id}-${index}`}
                island={island}
                onPress={handleIslandPress}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <MapPin size={48} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyStateTitle}>No islands found</Text>
              <Text style={styles.emptyStateText}>
                {searchQueries.islands ? 'Try adjusting your search terms' : 'No islands available'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push("../islands" as any)}
        >
          <Text style={styles.viewAllText}>View All Islands</Text>
          <MapPin size={16} color={colors.primary} />
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

    // Filter out duplicate trips by ID to prevent key conflicts
    const uniqueSchedule = todaySchedule.filter((trip, index, self) =>
      index === self.findIndex(t => t.id === trip.id)
    );

    return (
      <View style={styles.sectionContent}>
        <SectionHeader
          title="Schedule Overview"
          subtitle="Today's trip schedule"
        />

        {uniqueSchedule.length > 0 ? (
          <View style={styles.scheduleGrid}>
            {uniqueSchedule.map((trip: any, index: number) => (
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
      case "islands":
        return renderIslands();
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
      <OperationsStats stats={stats} isTablet={isTablet} />

      {/* Section Selector */}
      <SectionSelector
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        canViewRoutes={canViewRoutes()}
        canViewTrips={canViewTrips()}
        canViewVessels={canViewVessels()}
        canViewIslands={canViewIslands()}
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