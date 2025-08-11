import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useOperationsStore } from "@/store/admin/operationsStore";
import { useTripManagement } from "@/hooks/useTripManagement";
import { useRouteManagement } from "@/hooks/useRouteManagement";
import { useVesselManagement } from "@/hooks/useVesselManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Eye, AlertTriangle, Calendar, Filter, X } from "lucide-react-native";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import Dropdown from "@/components/admin/Dropdown";

interface ScheduleTabProps {
  isActive: boolean;
}

export default function ScheduleTab({ isActive }: ScheduleTabProps) {
  const { canViewTrips } = useAdminPermissions();
  const { todaySchedule, loading, fetchTodaySchedule } = useOperationsStore();

  const {
    trips: allTrips,
    loading: tripLoading,
    loadAll: loadTrips,
  } = useTripManagement();
  const { routes: allRoutes, loadAll: loadRoutes } = useRouteManagement();
  const { vessels: allVessels, loadAll: loadVessels } = useVesselManagement();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedVesselId, setSelectedVesselId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Initialize schedule data when tab becomes active
  useEffect(() => {
    if (isActive && canViewTrips()) {
      // Load both today's schedule and all trips data
      fetchTodaySchedule();
      if (!allTrips || allTrips.length === 0) {
        loadTrips();
      }
      if (!allRoutes || allRoutes.length === 0) {
        loadRoutes();
      }
      if (!allVessels || allVessels.length === 0) {
        loadVessels();
      }
    }
  }, [
    isActive,
    allTrips?.length,
    allRoutes?.length,
    allVessels?.length,
    fetchTodaySchedule,
    loadTrips,
    loadRoutes,
    loadVessels,
  ]);

  // Filter and display today's scheduled trips only
  const displaySchedule = useMemo(() => {
    // Use todaySchedule from operations store as primary source, fallback to allTrips
    let filtered = [];

    if (todaySchedule && todaySchedule.length > 0) {
      // Use operations store data (from today_schedule_view)
      filtered = todaySchedule;
    } else {
      // Fallback to all trips and filter for today's date
      const today = new Date().toISOString().split("T")[0];
      const allTripsArray = allTrips || [];

      // Debug: Show sample trip data to understand the format
      if (allTripsArray.length > 0) {
        // Show a few more travel dates to understand the pattern
        const sampleDates = allTripsArray.slice(0, 5).map((trip) => ({
          id: trip.id,
          travel_date: trip.travel_date,
          formatted_date:
            typeof trip.travel_date === "string"
              ? trip.travel_date.split("T")[0]
              : "not_string",
        }));
      }

      filtered = allTripsArray.filter((trip) => {
        // Handle both string and date formats
        let tripDate: string = "";
        if (typeof trip.travel_date === "string") {
          tripDate = trip.travel_date.split("T")[0]; // Extract date part if datetime
        } else if (
          trip.travel_date &&
          typeof trip.travel_date === "object" &&
          "toISOString" in trip.travel_date
        ) {
          tripDate = (trip.travel_date as Date).toISOString().split("T")[0];
        } else {
          tripDate = String(trip.travel_date || "").split("T")[0];
        }
        const isToday = tripDate === today;
        return isToday;
      });

      // If no trips found for today, try to find the closest future date as fallback
      if (filtered.length === 0 && allTripsArray.length > 0) {
        // Get all future trips and find the earliest
        const futureTripDates = allTripsArray
          .map((trip) => {
            let tripDate = "";
            if (typeof trip.travel_date === "string") {
              tripDate = trip.travel_date.split("T")[0];
            } else {
              tripDate = String(trip.travel_date || "").split("T")[0];
            }
            return { trip, tripDate };
          })
          .filter(({ tripDate }) => tripDate >= today)
          .sort((a, b) => a.tripDate.localeCompare(b.tripDate));

        if (futureTripDates.length > 0) {
          const closestDate = futureTripDates[0].tripDate;

          filtered = futureTripDates
            .filter(({ tripDate }) => tripDate === closestDate)
            .map(({ trip }) => trip);
        }
      }
    }

    // Filter by route if selected
    if (selectedRouteId && selectedRouteId !== "") {
      filtered = filtered.filter((trip) => trip.route_id === selectedRouteId);
    }

    // Filter by vessel if selected
    if (selectedVesselId && selectedVesselId !== "") {
      filtered = filtered.filter((trip) => trip.vessel_id === selectedVesselId);
    }

    // Sort by departure time (earliest first)
    return filtered.sort((a, b) => {
      const timeA = a.departure_time || "";
      const timeB = b.departure_time || "";
      return timeA.localeCompare(timeB);
    });
  }, [todaySchedule, allTrips, selectedRouteId, selectedVesselId]);

  // Determine what date we're actually showing
  const actualDisplayDate = useMemo(() => {
    if (todaySchedule && todaySchedule.length > 0) {
      return "Today";
    }
    if (displaySchedule.length > 0) {
      // Check if we're showing today's data or fallback data
      const today = new Date().toISOString().split("T")[0];
      const firstTrip = displaySchedule[0];
      let firstTripDate = "";

      if (typeof firstTrip.travel_date === "string") {
        firstTripDate = firstTrip.travel_date.split("T")[0];
      } else {
        firstTripDate = String(firstTrip.travel_date || "").split("T")[0];
      }

      if (firstTripDate === today) {
        return "Today";
      } else {
        const date = new Date(firstTripDate);
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() !== new Date().getFullYear()
              ? "numeric"
              : undefined,
        });
      }
    }
    return "Today";
  }, [todaySchedule, displaySchedule]);

  // Prepare dropdown options
  const routeOptions = useMemo(() => {
    if (!allRoutes) return [];
    return [
      { label: "All Routes", value: "" },
      ...allRoutes.map((route) => ({
        label:
          route.name || `${route.from_island_name} → ${route.to_island_name}`,
        value: route.id,
      })),
    ];
  }, [allRoutes]);

  const vesselOptions = useMemo(() => {
    if (!allVessels) return [];
    return [
      { label: "All Vessels", value: "" },
      ...allVessels.map((vessel) => ({
        label: vessel.name,
        value: vessel.id,
      })),
    ];
  }, [allVessels]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh schedule, trips, routes, and vessels data
      await Promise.all([
        fetchTodaySchedule(),
        loadTrips(),
        loadRoutes(),
        loadVessels(),
      ]);
    } catch (error) {
      console.error("Error refreshing schedule:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearFilters = () => {
    setSelectedRouteId("");
    setSelectedVesselId("");
  };

  const renderScheduleItem = React.useCallback((trip: any, index: number) => {
    // Format the departure date
    const formatDate = (trip: any) => {
      const dateStr = trip.travel_date;

      console.log(
        "formatDate: trip.travel_date =",
        dateStr,
        "type:",
        typeof dateStr
      );

      if (!dateStr) {
        console.log("formatDate: No travel_date, showing Today");
        return "Today";
      }

      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return "Today";
        }

        const formatted = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return formatted;
      } catch (error) {
        console.log("formatDate: Error formatting date", error);
        return "Today";
      }
    };

    return (
      <TouchableOpacity
        key={`schedule-${trip.id}-${index}`}
        style={styles.scheduleItem}
        onPress={() => handleTripPress(trip.id)}
      >
        <View style={styles.scheduleDateTime}>
          <Text style={styles.scheduleDate}>{formatDate(trip)}</Text>
          <Text style={styles.scheduleTime}>
            {trip.departure_time || "--:--"}
          </Text>
        </View>
        <Text style={styles.scheduleRoute}>
          {trip.routeName || trip.route_name || "Unknown Route"}
        </Text>
        <Text style={styles.scheduleVessel}>
          {trip.vesselName || trip.vessel_name || "Unknown Vessel"}
        </Text>
        <View style={styles.scheduleBookings}>
          <Text style={styles.scheduleBookingText}>
            {trip.bookings || 0}/{trip.capacity || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const handleTripPress = (tripId: string) => {
    if (canViewTrips()) {
      router.push(`../trip/${tripId}` as any);
    }
  };

  const handleViewAllTrips = () => {
    router.push("../trips" as any);
  };

  // Function to render schedule items in a grid layout
  const renderScheduleGrid = React.useCallback(() => {
    if (displaySchedule.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Calendar size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No trips scheduled today</Text>
          <Text style={styles.emptyStateText}>
            {selectedRouteId || selectedVesselId
              ? "No trips match the selected filters for today"
              : "No trips are scheduled for today"}
          </Text>
        </View>
      );
    }

    const rows = [];
    for (let i = 0; i < displaySchedule.length; i += 2) {
      const leftTrip = displaySchedule[i];
      const rightTrip = displaySchedule[i + 1];

      rows.push(
        <View key={`row-${i}`} style={styles.scheduleRow}>
          {renderScheduleItem(leftTrip, i)}
          {rightTrip ? (
            renderScheduleItem(rightTrip, i + 1)
          ) : (
            <View style={styles.scheduleItemPlaceholder} />
          )}
        </View>
      );
    }

    return <View style={styles.scheduleGrid}>{rows}</View>;
  }, [displaySchedule, selectedRouteId, selectedVesselId, renderScheduleItem]);

  // Permission check
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

  // Loading state - show loading if both data sources are loading or empty
  if (
    (loading.schedule || tripLoading) &&
    (!todaySchedule || todaySchedule.length === 0) &&
    (!allTrips || allTrips.length === 0)
  ) {
    return <LoadingSpinner />;
  }

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Header */}
      <SectionHeader
        title={`${actualDisplayDate}'s Schedule`}
        subtitle={`${
          actualDisplayDate === "Today" ? "Today's" : `${actualDisplayDate}'s`
        } scheduled trips (${displaySchedule.length} trips)`}
      />

      {/* Filter Controls */}
      <View style={styles.filterControls}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            showFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter
            size={16}
            color={showFilters ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterButtonText,
              showFilters && styles.filterButtonTextActive,
            ]}
          >
            Filters
          </Text>
        </TouchableOpacity>

        {(selectedRouteId || selectedVesselId) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <X size={14} color={colors.textSecondary} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Dropdown
                label="Route"
                options={routeOptions}
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
                placeholder="Select route..."
              />
            </View>
            <View style={styles.filterItem}>
              <Dropdown
                label="Vessel"
                options={vesselOptions}
                value={selectedVesselId}
                onValueChange={setSelectedVesselId}
                placeholder="Select vessel..."
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={handleViewAllTrips}
      >
        <Text style={styles.viewAllText}>View All Trips</Text>
        <Calendar size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>{renderScheduleGrid()}</View>
      {renderFooter()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filtersSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },

  header: {
    paddingTop: 16,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingBottom: 16,
  },
  scheduleGrid: {
    flex: 1,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  scheduleItem: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    width: "48%",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleItemPlaceholder: {
    width: "48%",
  },
  scheduleDateTime: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  scheduleDate: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
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
});
