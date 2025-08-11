import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { AdminManagement } from "@/types";
import {
  Ship,
  Route,
  Plus,
  AlertCircle,
  Calendar,
  Zap,
} from "lucide-react-native";

type Trip = AdminManagement.Trip;
type Route = AdminManagement.Route;
type Vessel = AdminManagement.Vessel;

// Add support for operations store types as well
type OperationsTrip = any; // Operations store trip type
type OperationsRoute = any; // Operations store route type
type OperationsVessel = any; // Operations store vessel type

interface TripInsightsProps {
  trips: (Trip | OperationsTrip)[];
  routes: (Route | OperationsRoute)[];
  vessels: (Vessel | OperationsVessel)[];
  onCreateTripForRoute?: (routeId: string) => void;
  onCreateTripForVessel?: (vesselId: string) => void;
  onGenerateTrips?: () => void;
  canManage?: boolean;
}

interface InsightData {
  routesWithoutTrips: (Route | OperationsRoute)[];
  vesselsWithoutTrips: (Vessel | OperationsVessel)[];
  routesWithoutVessels: (Route | OperationsRoute)[];
  activeRoutes: (Route | OperationsRoute)[];
  activeVessels: (Vessel | OperationsVessel)[];
}

// Helper functions to normalize data access between different data types
const getTripId = (trip: any) => trip.id;
const getTripRouteId = (trip: any) => trip.route_id;
const getTripVesselId = (trip: any) => trip.vessel_id;
const getTripTravelDate = (trip: any) => trip.travel_date;
const getTripIsActive = (trip: any) => trip.is_active !== false; // Default to true if not set
const getTripStatus = (trip: any) => trip.status || trip.computed_status;

const getRouteId = (route: any) => route.id;
const getRouteName = (route: any) => route.name;
const getRouteIsActive = (route: any) => route.is_active !== false; // Default to true if not set

const getVesselId = (vessel: any) => vessel.id;
const getVesselName = (vessel: any) => vessel.name;
const getVesselIsActive = (vessel: any) => vessel.is_active !== false; // Default to true if not set
const getVesselCapacity = (vessel: any) => vessel.seating_capacity;

export default function TripInsights({
  trips = [],
  routes = [],
  vessels = [],
  onCreateTripForRoute,
  onCreateTripForVessel,
  onGenerateTrips,
  canManage = false,
}: TripInsightsProps) {
  // Calculate insights based on current data
  const insights: InsightData = React.useMemo(() => {
    const activeRoutes = routes.filter((route) => getRouteIsActive(route));
    const activeVessels = vessels.filter((vessel) => getVesselIsActive(vessel));

    // Get routes that have trips scheduled (current and future trips)
    const today = new Date().toISOString().split("T")[0];

    const currentAndFutureTrips = trips.filter((trip) => {
      const travelDate = getTripTravelDate(trip);
      const isValidDate = travelDate && travelDate >= today;
      const isActive = getTripIsActive(trip);
      const status = getTripStatus(trip);
      const isNotCancelled = status !== "cancelled";

      return isValidDate && isActive && isNotCancelled;
    });

    const routeIdsWithTrips = new Set(
      currentAndFutureTrips.map((trip) => getTripRouteId(trip))
    );
    const vesselIdsWithTrips = new Set(
      currentAndFutureTrips.map((trip) => getTripVesselId(trip))
    );

    // Find routes without current/future trips
    const routesWithoutTrips = activeRoutes.filter(
      (route) => !routeIdsWithTrips.has(getRouteId(route))
    );

    // Find vessels without current/future trips
    const vesselsWithoutTrips = activeVessels.filter(
      (vessel) => !vesselIdsWithTrips.has(getVesselId(vessel))
    );

    // Find routes that might not have vessels commonly assigned
    // (This is more complex as vessels can be assigned to multiple routes)
    const routesWithoutVessels = activeRoutes.filter((route) => {
      // Check if this route has had any trips in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentDate = thirtyDaysAgo.toISOString().split("T")[0];

      const recentTripsForRoute = trips.filter(
        (trip) =>
          getTripRouteId(trip) === getRouteId(route) &&
          getTripTravelDate(trip) >= recentDate &&
          getTripIsActive(trip)
      );

      return recentTripsForRoute.length === 0;
    });

    return {
      routesWithoutTrips,
      vesselsWithoutTrips,
      routesWithoutVessels,
      activeRoutes,
      activeVessels,
    };
  }, [trips, routes, vessels]);

  // Don't show if there are no insights to display
  if (
    insights.routesWithoutTrips.length === 0 &&
    insights.vesselsWithoutTrips.length === 0 &&
    insights.routesWithoutVessels.length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AlertCircle size={20} color={colors.warning} />
        <Text style={styles.headerTitle}>Trip Planning Opportunities</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.insightsRow}>
          {/* Routes without future trips */}
          {insights.routesWithoutTrips.length > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Route size={16} color={colors.warning} />
                <Text style={styles.insightTitle}>Routes Need Trips</Text>
              </View>
              <Text style={styles.insightCount}>
                {insights.routesWithoutTrips.length} route
                {insights.routesWithoutTrips.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.insightDescription}>
                Active routes without scheduled trips
              </Text>

              {/* Show first few route names */}
              <View style={styles.itemsList}>
                {insights.routesWithoutTrips.slice(0, 3).map((route) => (
                  <View key={getRouteId(route)} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {getRouteName(route)}
                    </Text>
                    {canManage && onCreateTripForRoute && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onCreateTripForRoute(getRouteId(route))}
                      >
                        <Plus size={12} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {insights.routesWithoutTrips.length > 3 && (
                  <Text style={styles.moreText}>
                    +{insights.routesWithoutTrips.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Vessels without future trips */}
          {insights.vesselsWithoutTrips.length > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ship size={16} color={colors.info} />
                <Text style={styles.insightTitle}>Idle Vessels</Text>
              </View>
              <Text style={styles.insightCount}>
                {insights.vesselsWithoutTrips.length} vessel
                {insights.vesselsWithoutTrips.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.insightDescription}>
                Available vessels without scheduled trips
              </Text>

              {/* Show first few vessel names */}
              <View style={styles.itemsList}>
                {insights.vesselsWithoutTrips.slice(0, 3).map((vessel) => (
                  <View key={getVesselId(vessel)} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {getVesselName(vessel)}
                    </Text>
                    <Text style={styles.capacityText}>
                      {getVesselCapacity(vessel)} seats
                    </Text>
                    {canManage && onCreateTripForVessel && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                          onCreateTripForVessel(getVesselId(vessel))
                        }
                      >
                        <Plus size={12} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {insights.vesselsWithoutTrips.length > 3 && (
                  <Text style={styles.moreText}>
                    +{insights.vesselsWithoutTrips.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Routes without recent vessel assignments */}
          {insights.routesWithoutVessels.length > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Calendar size={16} color={colors.danger} />
                <Text style={styles.insightTitle}>Inactive Routes</Text>
              </View>
              <Text style={styles.insightCount}>
                {insights.routesWithoutVessels.length} route
                {insights.routesWithoutVessels.length > 1 ? "s" : ""}
              </Text>
              <Text style={styles.insightDescription}>
                Routes without trips in 30 days
              </Text>

              <View style={styles.itemsList}>
                {insights.routesWithoutVessels.slice(0, 3).map((route) => (
                  <View key={getRouteId(route)} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {getRouteName(route)}
                    </Text>
                    {canManage && onCreateTripForRoute && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onCreateTripForRoute(getRouteId(route))}
                      >
                        <Plus size={12} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {insights.routesWithoutVessels.length > 3 && (
                  <Text style={styles.moreText}>
                    +{insights.routesWithoutVessels.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Quick action for bulk generation */}
          {canManage && onGenerateTrips && (
            <View style={[styles.insightCard, styles.actionCard]}>
              <View style={styles.insightHeader}>
                <Zap size={16} color={colors.primary} />
                <Text style={styles.insightTitle}>Bulk Generate</Text>
              </View>
              <Text style={styles.insightDescription}>
                Create trips for multiple routes and vessels
              </Text>

              <TouchableOpacity
                style={styles.generateButton}
                onPress={onGenerateTrips}
              >
                <Zap size={14} color={colors.white} />
                <Text style={styles.generateButtonText}>Generate Trips</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  insightsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: 200,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCard: {
    borderLeftColor: colors.primary,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  insightCount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  capacityText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  actionButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
});
