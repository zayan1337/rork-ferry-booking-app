import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
// UPDATED: Use new route management hook instead of operations data hook
import { useRouteManagement } from "@/hooks/useRouteManagement";
import { useOperationsStore } from "@/store/admin/operationsStore";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";
import { AdminManagement } from "@/types";

// Operations Components
import OperationsStats from "@/components/admin/operations/OperationsStats";
import SectionSelector from "@/components/admin/operations/SectionSelector";
import {
  RoutesTab,
  TripsTab,
  VesselsTab,
  ScheduleTab,
} from "@/components/admin/operations";

type Route = AdminManagement.Route;

export default function OperationsScreen() {
  const {
    canViewRoutes,
    canViewTrips,
    canViewVessels,
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

  const renderContent = () => {
    switch (activeSection) {
      case "routes":
        return <RoutesTab isActive={activeSection === "routes"} searchQuery={routeSearchQuery} />;
      case "trips":
        return <TripsTab isActive={activeSection === "trips"} searchQuery={searchQueries.trips} />;
      case "vessels":
        return <VesselsTab isActive={activeSection === "vessels"} searchQuery={searchQueries.vessels} />;
      case "schedule":
        return <ScheduleTab isActive={activeSection === "schedule"} />;
      default:
        return <RoutesTab isActive={activeSection === "routes"} searchQuery={routeSearchQuery} />;
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
    paddingTop: 16,
  },
}); 