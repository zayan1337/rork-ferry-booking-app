import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useTripManagement } from '@/hooks/useTripManagement';
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAlertContext } from '@/components/AlertProvider';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { Plus, Eye, AlertTriangle, Calendar, Zap } from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import TripItem from '@/components/admin/TripItem';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import TripGenerator from './TripGenerator';
import TripInsights from './TripInsights';

interface TripsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

export default function TripsTab({
  isActive,
  searchQuery = '',
}: TripsTabProps) {
  const { canViewTrips, canManageTrips } = useAdminPermissions();
  const { showError } = useAlertContext();
  const {
    trips: allTrips,
    filteredTrips,
    searchQuery: tripSearchQuery,
    setSearchQuery: setTripSearchQuery,
    loading,
    stats,
    loadAll: loadTrips,
  } = useTripManagement();

  // Get route and vessel data for insights
  const { routes: allRoutes, loadAll: loadRoutes } = useRouteManagement();

  const { vessels: allVessels, loadAll: loadVessels } = useVesselManagement();

  // Get operations store data for more accurate insights
  const {
    trips: operationsTrips,
    routes: operationsRoutes,
    vessels: operationsVessels,
    refreshAll,
  } = useOperationsStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  // Initialize data when tab becomes active
  useEffect(() => {
    if (isActive && canViewTrips()) {
      if (!allTrips || allTrips.length === 0) {
        loadTrips();
      }
      if (!allRoutes || allRoutes.length === 0) {
        loadRoutes();
      }
      if (!allVessels || allVessels.length === 0) {
        loadVessels();
      }
      // Always refresh operations store data for accurate insights
      refreshAll();
    }
  }, [
    isActive,
    allTrips?.length,
    allRoutes?.length,
    allVessels?.length,
    loadTrips,
    loadRoutes,
    loadVessels,
    refreshAll,
  ]);

  // Filter trips based on search query
  const filteredTripsData = useMemo(() => {
    if (!filteredTrips) return [];

    let filtered = filteredTrips;
    const query = searchQuery || tripSearchQuery || '';

    if (query) {
      filtered = filteredTrips.filter(
        trip =>
          trip.route_name?.toLowerCase().includes(query.toLowerCase()) ||
          trip.vessel_name?.toLowerCase().includes(query.toLowerCase()) ||
          trip.travel_date?.toLowerCase().includes(query.toLowerCase()) ||
          trip.from_island_name?.toLowerCase().includes(query.toLowerCase()) ||
          trip.to_island_name?.toLowerCase().includes(query.toLowerCase())
      );
    }

    return filtered;
  }, [filteredTrips, searchQuery, tripSearchQuery]);

  const displayTrips = useMemo(() => {
    return filteredTripsData
      .filter(
        (trip, index, self) => index === self.findIndex(t => t.id === trip.id)
      )
      .sort((a, b) => {
        // Sort by travel date (most recent first)
        const dateA = new Date(a.travel_date);
        const dateB = new Date(b.travel_date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // If same date, sort by departure time
        return a.departure_time.localeCompare(b.departure_time);
      })
      .slice(0, 4);
  }, [filteredTripsData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadTrips(),
        loadRoutes(),
        loadVessels(),
        refreshAll(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTripPress = (tripId: string) => {
    if (canViewTrips()) {
      router.push(`../trip/${tripId}` as any);
    }
  };

  const handleAddTrip = () => {
    if (canManageTrips()) {
      // Go directly to the unified trip form
      router.push('../trip/new' as any);
    } else {
      showError('Access Denied', "You don't have permission to create trips.");
    }
  };

  const handleViewAllTrips = () => {
    router.push('../trips' as any);
  };

  const handleGeneratorResult = (result: any) => {
    if (result.success) {
      // Refresh trips to show newly generated ones
      loadTrips();
    }
  };

  const handleCreateTripForRoute = (routeId: string) => {
    if (canManageTrips()) {
      router.push(`../trip/new?route_id=${routeId}` as any);
    } else {
      showError('Access Denied', "You don't have permission to create trips.");
    }
  };

  const handleCreateTripForVessel = (vesselId: string) => {
    if (canManageTrips()) {
      router.push(`../trip/new?vessel_id=${vesselId}` as any);
    } else {
      showError('Access Denied', "You don't have permission to create trips.");
    }
  };

  // Helper function to map computed_status to TripItem status
  const mapTripStatus = (computedStatus: string) => {
    switch (computedStatus) {
      case 'scheduled':
        return 'scheduled';
      case 'boarding':
        return 'boarding';
      case 'departed':
        return 'departed';
      case 'arrived':
        return 'arrived';
      case 'completed':
        return 'arrived'; // Map completed to arrived for display
      case 'cancelled':
        return 'cancelled';
      case 'delayed':
        return 'delayed';
      default:
        return 'scheduled';
    }
  };

  // Permission check
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

  // Loading state - only show loading if we're actively loading and haven't received any data yet
  if (loading.data && allTrips === undefined) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Trips Management'
            subtitle={`${stats.todayTrips} trips today`}
          />
        </View>
        {canManageTrips() && (
          <View style={styles.sectionHeaderActions}>
            <Button
              title='Generate'
              onPress={() => setShowGenerator(true)}
              size='small'
              variant='outline'
              icon={<Zap size={16} color={colors.primary} />}
            />
            <Button
              title='Add Trip'
              onPress={handleAddTrip}
              size='small'
              variant='primary'
              icon={<Plus size={16} color={colors.white} />}
            />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search trips...'
        value={searchQuery || tripSearchQuery || ''}
        onChangeText={text => setTripSearchQuery(text)}
      />

      {/* Trip Insights */}
      <TripInsights
        trips={operationsTrips || allTrips || []}
        routes={operationsRoutes || allRoutes || []}
        vessels={operationsVessels || allVessels || []}
        onCreateTripForRoute={handleCreateTripForRoute}
        onCreateTripForVessel={handleCreateTripForVessel}
        onGenerateTrips={() => setShowGenerator(true)}
        canManage={canManageTrips()}
      />

      {/* Trips List */}
      <View style={styles.itemsList}>
        {displayTrips.length > 0 ? (
          displayTrips.map((trip: any, index: number) => (
            <TripItem
              key={`trip-${trip.id}-${index}`}
              trip={{
                id: trip.id,
                travel_date: trip.travel_date,
                departure_time: trip.departure_time,
                arrival_time: trip.arrival_time,
                status: mapTripStatus(trip.computed_status || trip.status),
                route_name: trip.route_name,
                vessel_name: trip.vessel_name,
                from_island_name: trip.from_island_name,
                to_island_name: trip.to_island_name,
                available_seats: trip.available_seats || trip.capacity || 0,
                booked_seats: trip.booked_seats || 0,
                capacity: trip.capacity || trip.seating_capacity,
                occupancy_rate: trip.occupancy_rate || 0,
                fare_multiplier: trip.fare_multiplier || 1.0,
                base_fare: trip.base_fare || 0,
                confirmed_bookings:
                  trip.confirmed_bookings || trip.bookings || 0,
                total_revenue: trip.total_revenue || 0,
                is_active: trip.is_active,
                delay_reason: trip.delay_reason,
                weather_conditions: trip.weather_conditions,
              }}
              onPress={handleTripPress}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No trips found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || tripSearchQuery
                ? 'Try adjusting your search terms'
                : 'No trips scheduled'}
            </Text>
          </View>
        )}
      </View>

      {/* View All Button */}
      <Pressable style={styles.viewAllButton} onPress={handleViewAllTrips}>
        <Text style={styles.viewAllText}>View All Trips</Text>
        <Eye size={16} color={colors.primary} />
      </Pressable>

      {/* Trip Generator Modal */}
      <TripGenerator
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerate={handleGeneratorResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    maxWidth: '50%',
    marginRight: 8,
  },
  itemsList: {
    gap: 12,
    marginTop: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
});
