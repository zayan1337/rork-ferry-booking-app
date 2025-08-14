import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
// UPDATED: Use hooks from the hooks index
import {
  useRouteManagement,
  useVesselManagement,
  useTripManagement,
} from '@/hooks';
import { useOperationsStore } from '@/store/admin/operationsStore';
import {
  getResponsiveDimensions,
  getResponsivePadding,
} from '@/utils/dashboardUtils';
import { AdminManagement } from '@/types';

// Operations Components
import OperationsStats from '@/components/admin/operations/OperationsStats';
import SectionSelector from '@/components/admin/operations/SectionSelector';
import {
  RoutesTab,
  TripsTab,
  VesselsTab,
  ScheduleTab,
} from '@/components/admin/operations';

type Route = AdminManagement.Route;

export default function OperationsScreen() {
  const { canViewRoutes, canViewTrips, canViewVessels } = useAdminPermissions();

  // UPDATED: Use new route management hook for routes
  const {
    routes: allRoutes,
    stats: routeStats,
    searchQuery: routeSearchQuery,
    setSearchQuery: setRouteSearchQuery,
    loading: routeLoading,
    loadAll: loadRoutes,
  } = useRouteManagement();

  // UPDATED: Use new vessel management hook for vessels
  const {
    vessels: allVessels,
    stats: vesselStats,
    searchQuery: vesselSearchQuery,
    setSearchQuery: setVesselSearchQuery,
    loading: vesselLoading,
    loadAll: loadVessels,
  } = useVesselManagement();

  // UPDATED: Use new trip management hook for trips
  const {
    trips: allTrips,
    stats: tripStats,
    searchQuery: tripSearchQuery,
    setSearchQuery: setTripSearchQuery,
    loading: tripLoading,
    loadAll: loadTrips,
  } = useTripManagement();

  // Ensure vessels data is properly initialized
  const safeVessels = allVessels || [];
  const safeVesselStats = vesselStats || {
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
    totalTrips30d: 0,
    totalBookings30d: 0,
    totalRevenue30d: 0,
    avgUtilization: 0,
    avgCapacity: 0,
    totalCapacity: 0,
  };

  // Keep operations store for schedule and other data
  const { todaySchedule, searchQueries, setSearchQuery, loading, stats } =
    useOperationsStore();

  // Load routes, vessels, and trips on component mount

  // Load routes, vessels, trips and operations stats on component mount
  useEffect(() => {
    const initializeData = async () => {
      const promises = [];

      if (!allRoutes || allRoutes.length === 0) {
        promises.push(loadRoutes());
      }
      if (!safeVessels || safeVessels.length === 0) {
        promises.push(loadVessels());
      }
      if (!allTrips || allTrips.length === 0) {
        promises.push(loadTrips());
      }

      // Always refresh operations stats to get latest data from database
      promises.push(useOperationsStore.getState().refreshAll());

      await Promise.all(promises);
    };

    initializeData();
  }, [allRoutes, loadRoutes, safeVessels, loadVessels, allTrips, loadTrips]);

  const [activeSection, setActiveSection] = useState<
    'routes' | 'trips' | 'vessels' | 'schedule'
  >('routes');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isTablet, isSmallScreen } = getResponsiveDimensions();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh routes, vessels, trips and operations stats
      await Promise.all([
        loadRoutes(),
        loadVessels(),
        loadTrips(),
        useOperationsStore.getState().refreshAll(), // Refresh operations stats from database
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'routes':
        return (
          <RoutesTab
            isActive={activeSection === 'routes'}
            searchQuery={routeSearchQuery}
          />
        );
      case 'trips':
        return (
          <TripsTab
            isActive={activeSection === 'trips'}
            searchQuery={tripSearchQuery}
          />
        );
      case 'vessels':
        return (
          <VesselsTab
            isActive={activeSection === 'vessels'}
            searchQuery={vesselSearchQuery}
          />
        );
      case 'schedule':
        return <ScheduleTab isActive={activeSection === 'schedule'} />;
      default:
        return (
          <RoutesTab
            isActive={activeSection === 'routes'}
            searchQuery={routeSearchQuery}
          />
        );
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
          title: 'Operations',
        }}
      />

      {/* Operations Stats */}
      <OperationsStats
        stats={{
          // Prioritize operations store stats (from database views) over individual hook stats
          activeRoutes: stats.activeRoutes || routeStats.active,
          totalRoutes: stats.totalRoutes || routeStats.total,
          activeVessels: stats.activeVessels || safeVesselStats.active,
          totalVessels: stats.totalVessels || safeVesselStats.total,
          todayTrips: stats.todayTrips || tripStats.todayTrips,
          // Combine revenue from all sources or use operations store total
          totalRevenue30d:
            (routeStats.totalRevenue30d || 0) +
            (safeVesselStats.totalRevenue30d || 0),
        }}
        isTablet={isTablet}
      />

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
