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
} from "lucide-react-native";

// Operations Components
import OperationsStats from "@/components/admin/operations/OperationsStats";
import SectionSelector from "@/components/admin/operations/SectionSelector";

// Existing Components
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import TripItem from "@/components/admin/TripItem";

export default function OperationsScreen() {
  const {
    canViewRoutes,
    canManageRoutes,
    canViewTrips,
    canManageTrips,
    canViewVessels,
    canManageVessels,
  } = useAdminPermissions();

  const {
    stats,
    activeSection,
    setActiveSection,
    filteredRoutes,
    filteredTrips,
    filteredVessels,
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
      router.push(`../schedule/${tripId}` as any);
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
      router.push("../schedule/new" as any);
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
          {filteredRoutes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={styles.routeItem}
              onPress={() => handleRoutePress(route.id)}
            >
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.routeDetails}>
                  {route.origin} → {route.destination}
                </Text>
                <Text style={styles.routeFare}>MVR {route.base_fare}</Text>
              </View>
              <View style={styles.routeStats}>
                <View style={[styles.statusBadge, route.status === "active" ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, route.status === "active" ? styles.statusTextActive : styles.statusTextInactive]}>
                    {route.status}
                  </Text>
                </View>
                {route.total_trips_30d && (
                  <Text style={styles.routeTrips}>{route.total_trips_30d} trips/30d</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {/* Already showing all routes in this section */ }}
        >
          <Text style={styles.viewAllText}>Showing Routes</Text>
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
          {filteredTrips.map((trip) => (
            <TripItem
              key={trip.id}
              trip={trip}
              onPress={() => handleTripPress(trip.id)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {/* Already showing all trips in this section */ }}
        >
          <Text style={styles.viewAllText}>Showing Trips</Text>
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
          {filteredVessels.map((vessel) => (
            <TouchableOpacity
              key={vessel.id}
              style={styles.vesselItem}
              onPress={() => handleVesselPress(vessel.id)}
            >
              <View style={styles.vesselInfo}>
                <Text style={styles.vesselName}>{vessel.name}</Text>
                <Text style={styles.vesselCapacity}>
                  Capacity: {vessel.seating_capacity} passengers
                </Text>
                {vessel.capacity_utilization_30d && (
                  <Text style={styles.vesselUtilization}>
                    Utilization: {vessel.capacity_utilization_30d}%
                  </Text>
                )}
              </View>
              <View style={styles.vesselStats}>
                <View style={[styles.statusBadge, vessel.status === "active" ? styles.statusActive :
                  vessel.status === "maintenance" ? styles.statusMaintenance : styles.statusInactive]}>
                  <Text style={[styles.statusText, vessel.status === "active" ? styles.statusTextActive : styles.statusTextInactive]}>
                    {vessel.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {/* Already showing all vessels in this section */ }}
        >
          <Text style={styles.viewAllText}>Showing Vessels</Text>
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

    return (
      <View style={styles.sectionContent}>
        <SectionHeader
          title="Schedule Overview"
          subtitle="Today's trip schedule"
        />

        <View style={styles.scheduleGrid}>
          {todaySchedule.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.scheduleItem}
              onPress={() => handleTripPress(trip.id)}
            >
              <Text style={styles.scheduleTime}>{trip.departure_time}</Text>
              <Text style={styles.scheduleRoute}>{trip.routeName}</Text>
              <Text style={styles.scheduleVessel}>{trip.vesselName}</Text>
              <View style={styles.scheduleBookings}>
                <Text style={styles.scheduleBookingText}>
                  {trip.bookings}/{trip.capacity}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => setActiveSection("trips")}
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
      <OperationsStats stats={stats} isTablet={isTablet} />

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
    marginBottom: 16,
    minHeight: 44,
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
}); 