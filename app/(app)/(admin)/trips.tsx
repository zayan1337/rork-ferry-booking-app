import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useTripManagement } from "@/hooks/useTripManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useVesselManagement } from "@/hooks/useVesselManagement";
import { useRouteManagement } from "@/hooks/useRouteManagement";
import { AdminManagement } from "@/types";
import {
  searchTrips,
  filterTripsByStatus,
  sortTrips,
  calculateTripStats,
  formatCurrency,
  formatPercentage,
} from "@/utils/admin/tripUtils";
import {
  ArrowLeft,
  Plus,
  Navigation,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Activity,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  CalendarRange,
  Ship,
} from "lucide-react-native";

import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import TripItem from "@/components/admin/TripItem";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import DatePicker from "@/components/admin/DatePicker";
import Dropdown from "@/components/admin/Dropdown";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

type Trip = AdminManagement.Trip;

// Helper functions for date range
const getDefaultDateRange = () => {
  const today = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(today.getMonth() + 1);

  return {
    from: today.toISOString().split("T")[0],
    to: oneMonthLater.toISOString().split("T")[0],
  };
};

export default function TripsScreen() {
  const { canViewTrips, canManageTrips } = useAdminPermissions();

  const [filterActive, setFilterActive] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [fromDatePickerKey, setFromDatePickerKey] = useState(0);
  const [toDatePickerKey, setToDatePickerKey] = useState(0);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [selectedVesselId, setSelectedVesselId] = useState<string>("");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");

  const {
    trips: allTrips,
    loading,
    error,
    stats,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filters,
    setFilters,
    loadAll: fetchTrips,
    refresh,
  } = useTripManagement();

  // Get vessels and routes for filters
  const { vessels: allVessels } = useVesselManagement();
  const { routes: allRoutes } = useRouteManagement();

  // Set initial sort order to ascending on component mount
  useEffect(() => {
    if (sortOrder === "desc") {
      setSortOrder("asc");
    }
  }, []);

  // No need to update filters - we handle date filtering directly in the component

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleTripPress = (tripId: string) => {
    router.push(`./trip/${tripId}` as any);
  };

  const handleAddTrip = () => {
    if (canManageTrips()) {
      router.push("./trip/new" as any);
    } else {
      Alert.alert(
        "Access Denied",
        "You don't have permission to create trips."
      );
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleFromDateChange = (date: string) => {
    setDateRange((prev) => ({ ...prev, from: date }));
  };

  const handleToDateChange = (date: string) => {
    setDateRange((prev) => ({ ...prev, to: date }));
  };

  const resetDateRange = () => {
    setDateRange(getDefaultDateRange());
    // Reset the date picker keys to hide any open pickers
    setFromDatePickerKey(0);
    setToDatePickerKey(0);
  };

  const filteredAndSortedTrips = React.useMemo(() => {
    let filtered = allTrips || [];

    // Apply date range filter first
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((trip) => {
        const tripDate = trip.travel_date;
        if (!tripDate) return false;

        let travelDate: string;
        if (typeof tripDate === "string") {
          travelDate = tripDate.split("T")[0];
        } else if (
          tripDate &&
          typeof tripDate === "object" &&
          "toISOString" in tripDate
        ) {
          travelDate = (tripDate as Date).toISOString().split("T")[0];
        } else {
          travelDate = String(tripDate).split("T")[0];
        }

        return travelDate >= dateRange.from && travelDate <= dateRange.to;
      });
    }

    // Apply vessel filter
    if (selectedVesselId) {
      filtered = filtered.filter((trip) => trip.vessel_id === selectedVesselId);
    }

    // Apply route filter
    if (selectedRouteId) {
      filtered = filtered.filter((trip) => trip.route_id === selectedRouteId);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = searchTrips(filtered, searchQuery);
    }

    // Apply status filter
    filtered = filterTripsByStatus(filtered, filterActive);

    // Apply sorting
    filtered = sortTrips(filtered, sortBy, sortOrder);

    return filtered;
  }, [
    allTrips,
    searchQuery,
    filterActive,
    sortBy,
    sortOrder,
    dateRange,
    selectedVesselId,
    selectedRouteId,
  ]);

  // Calculate stats for all trips (not filtered by date)
  const overallStats = useMemo(() => {
    return calculateTripStats(allTrips || []);
  }, [allTrips]);

  // Calculate stats for date-range filtered trips
  const dateRangeStats = useMemo(() => {
    return calculateTripStats(filteredAndSortedTrips);
  }, [filteredAndSortedTrips]);

  useEffect(() => {
    if (!allTrips || allTrips.length === 0) {
      fetchTrips();
    }
  }, []);

  const renderTripItem = ({ item, index }: { item: Trip; index: number }) => (
    <TripItem key={item.id} trip={item as any} onPress={handleTripPress} />
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* Overall Stats */}
      <View style={styles.quickStats}>
        <Text style={styles.statsTitle}>Overall Trip Statistics</Text>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Calendar size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{overallStats.total}</Text>
            <Text style={styles.quickStatLabel}>Total Trips</Text>
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
            <Text style={styles.quickStatValue}>{overallStats.scheduled}</Text>
            <Text style={styles.quickStatLabel}>Scheduled</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.infoLight },
              ]}
            >
              <Users size={16} color={colors.info} />
            </View>
            <Text style={styles.quickStatValue}>
              {Math.round(overallStats.averageOccupancy)}%
            </Text>
            <Text style={styles.quickStatLabel}>Avg Occupancy</Text>
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
              {Math.round(overallStats.totalRevenue / 1000)}K
            </Text>
            <Text style={styles.quickStatLabel}>Total Revenue</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Search trips by route, vessel, date..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Simplified Date Range Selector */}
      <View style={styles.dateRangeSection}>
        <View style={styles.dateRangeHeader}>
          <View style={styles.dateRangeTitle}>
            <CalendarRange size={16} color={colors.primary} />
            <Text style={styles.dateRangeTitleText}>Date Range</Text>
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={resetDateRange}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRangeInputsRow}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>From</Text>
            <DatePicker
              key={`from-${fromDatePickerKey}`}
              value={dateRange.from}
              onChange={(date) => {
                handleFromDateChange(date);
                setFromDatePickerKey(0); // Hide after selection
              }}
              placeholder=""
            />
          </View>

          {/* <Text style={styles.dateSeparator}>to</Text> */}

          <View style={styles.dateInputContainer}>
            <Text style={styles.dateInputLabel}>To</Text>
            <DatePicker
              key={`to-${toDatePickerKey}`}
              value={dateRange.to}
              onChange={(date) => {
                handleToDateChange(date);
                setToDatePickerKey(0); // Hide after selection
              }}
              placeholder=""
            />
          </View>
        </View>

        {/* Additional Filters Row */}
        <View style={styles.additionalFiltersRow}>
          <View style={styles.filterDropdownContainer}>
            <Dropdown
              label="Vessel"
              value={selectedVesselId}
              onValueChange={setSelectedVesselId}
              options={[
                { label: "All Vessels", value: "" },
                ...(allVessels?.map((vessel) => ({
                  label: vessel.name,
                  value: vessel.id,
                })) || []),
              ]}
              placeholder="All Vessels"
            />
          </View>

          <View style={styles.filterDropdownContainer}>
            <Dropdown
              label="Route"
              value={selectedRouteId}
              onValueChange={setSelectedRouteId}
              options={[
                { label: "All Routes", value: "" },
                ...(allRoutes?.map((route) => ({
                  label: route.name,
                  value: route.id,
                })) || []),
              ]}
              placeholder="All Routes"
            />
          </View>
        </View>

        {/* Simple Stats Row */}
        <View style={styles.simpleStatsRow}>
          <Text style={styles.simpleStatsText}>
            Showing {dateRangeStats.total} trips • {dateRangeStats.scheduled}{" "}
            scheduled
          </Text>
        </View>
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
                sortBy === "travel_date" && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort("travel_date")}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === "travel_date" && styles.sortButtonTextActive,
                ]}
              >
                Date
              </Text>
              {sortBy === "travel_date" &&
                (sortOrder === "asc" ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === "departure_time" && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort("departure_time")}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === "departure_time" && styles.sortButtonTextActive,
                ]}
              >
                Time
              </Text>
              {sortBy === "departure_time" &&
                (sortOrder === "asc" ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === "status" && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort("status")}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === "status" && styles.sortButtonTextActive,
                ]}
              >
                Status
              </Text>
              {sortBy === "status" &&
                (sortOrder === "asc" ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlsRight}>
          <Text style={styles.resultsCount}>
            {filteredAndSortedTrips.length} trip
            {filteredAndSortedTrips.length !== 1 ? "s" : ""}
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
                All Trips
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === "scheduled" && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive("scheduled")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === "scheduled" && styles.filterChipTextActive,
                ]}
              >
                Scheduled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === "boarding" && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive("boarding")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === "boarding" && styles.filterChipTextActive,
                ]}
              >
                Boarding
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === "departed" && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive("departed")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === "departed" && styles.filterChipTextActive,
                ]}
              >
                Departed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === "arrived" && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive("arrived")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === "arrived" && styles.filterChipTextActive,
                ]}
              >
                Arrived
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === "cancelled" && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive("cancelled")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === "cancelled" && styles.filterChipTextActive,
                ]}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === "delayed" && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive("delayed")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === "delayed" && styles.filterChipTextActive,
                ]}
              >
                Delayed
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Section Divider */}
      {filteredAndSortedTrips.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>Trips</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Calendar size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No trips found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || filterActive !== null
          ? "Try adjusting your search or filter criteria"
          : "No trips have been scheduled yet"}
      </Text>
      {canManageTrips() && !searchQuery && filterActive === null && (
        <Button
          title="Schedule First Trip"
          onPress={handleAddTrip}
          variant="primary"
          icon={<Plus size={20} color={colors.white} />}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  if (!canViewTrips()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Access Denied",
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
            You don't have permission to view trips.
          </Text>
          <Button
            title="Go Back"
            variant="primary"
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
          title: "Trips",
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

      {loading.data ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedTrips}
          renderItem={renderTripItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          keyExtractor={(item) => item.id}
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

      {canManageTrips() && filteredAndSortedTrips.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleAddTrip}
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
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  noAccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  listHeader: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateRangeSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateRangeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateRangeTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateRangeTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.backgroundTertiary,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dateRangeInputsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 4,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  dateSeparator: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    paddingBottom: 10, // Align with the date input fields
  },
  additionalFiltersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  filterDropdownContainer: {
    flex: 1,
  },
  simpleStatsRow: {
    alignItems: "center",
  },
  simpleStatsText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  quickStats: {
    marginBottom: 20,
  },
  quickStatsRow: {
    flexDirection: "row",
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
    alignItems: "center",
    gap: 8,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 24,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  controlsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  controlsRight: {
    alignItems: "flex-end",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },
  controlButtonTextActive: {
    color: colors.primary,
  },
  sortControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },
  sortButtonTextActive: {
    color: colors.primary,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: "500",
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
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
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
    fontWeight: "600",
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
    fontWeight: "700",
    color: colors.text,
  },
  itemSeparator: {
    height: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 20,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 24,
  },
  emptyStateButton: {
    marginTop: 16,
    minWidth: 200,
  },
  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
