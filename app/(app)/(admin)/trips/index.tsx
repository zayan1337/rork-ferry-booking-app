import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Trip } from "@/types/operations";
import { filterTrips, searchTrips, formatTripStatus, getTripOccupancy } from "@/utils/tripUtils";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";

// Operations Components
import {
    TripStats,
    TripFilters,
    TripBulkActions,
    type TripFiltersState,
    type TripSortConfig
} from "@/components/admin/operations";

// Common Components
import { ListSection } from "@/components/admin/common";
import EmptyState from "@/components/admin/EmptyState";
import TripItem from "@/components/admin/TripItem";
import Button from "@/components/admin/Button";

// Icons
import {
    Plus,
    Calendar,
    AlertTriangle,
    Grid,
    List,
    MoreHorizontal,
} from "lucide-react-native";

export default function TripsListingPage() {
    const { canViewTrips, canManageTrips } = useAdminPermissions();
    const { trips: allTrips, routes, vessels } = useAdminStore();

    const [trips, setTrips] = useState<Trip[]>([]);
    const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
    const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'card' | 'list' | 'compact'>('card');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Filter and sort state
    const [filters, setFilters] = useState<TripFiltersState>({
        searchTerm: "",
        status: "all",
        dateFilter: "all",
        occupancyFilter: "all",
        fareFilter: "all",
    });

    const [sortConfig, setSortConfig] = useState<TripSortConfig>({
        field: "travel_date",
        direction: "desc",
    });

    const { isTablet, isSmallScreen } = getResponsiveDimensions();

    // Calculate trip statistics
    const tripStats = useMemo(() => {
        const statsTrips = trips.length ? trips : allTrips || [];
        const scheduled = statsTrips.filter(t => t.status === 'scheduled').length;
        const inProgress = statsTrips.filter(t => ['boarding', 'departed'].includes(t.status)).length;
        const completed = statsTrips.filter(t => t.status === 'arrived').length;
        const cancelled = statsTrips.filter(t => t.status === 'cancelled').length;

        const totalOccupancy = statsTrips.reduce((sum, trip) => {
            const occupancy = getTripOccupancy(trip);
            return sum + occupancy;
        }, 0);

        const averageOccupancy = statsTrips.length > 0 ? totalOccupancy / statsTrips.length : 0;

        const totalRevenue = statsTrips.reduce((sum, trip) => {
            const baseFare = routes?.find(r => r.id === trip.route_id)?.base_fare || 0;
            const fareMultiplier = trip.fare_multiplier || 1;
            return sum + (trip.booked_seats * baseFare * fareMultiplier);
        }, 0);

        const today = new Date().toISOString().split('T')[0];
        const todayTrips = statsTrips.filter(t => t.travel_date === today).length;

        return {
            total: statsTrips.length,
            scheduled,
            inProgress,
            completed,
            cancelled,
            averageOccupancy,
            totalRevenue,
            todayTrips,
        };
    }, [trips, allTrips, routes]);

    // Load and filter trips
    const loadTrips = useCallback(async () => {
        try {
            // Only show loading if we have data to process
            if (allTrips && allTrips.length > 0) {
                setIsLoading(true);
            }

            const tripsData = allTrips || [];

            // Apply filters and search
            let filtered = searchTrips(tripsData, filters.searchTerm);
            filtered = filterTrips(filtered, filters as any);

            // Apply sorting
            filtered.sort((a, b) => {
                let aValue: any = (a as any)[sortConfig.field];
                let bValue: any = (b as any)[sortConfig.field];

                if (sortConfig.field === 'travel_date' || sortConfig.field === 'departure_time') {
                    aValue = new Date(`${a.travel_date} ${a.departure_time}`);
                    bValue = new Date(`${b.travel_date} ${b.departure_time}`);
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });

            setTrips(tripsData);
            setFilteredTrips(filtered);
        } catch (error) {
            console.error('Error loading trips:', error);
        } finally {
            setIsLoading(false);
        }
    }, [allTrips, filters, sortConfig]);

    // Effects
    useEffect(() => {
        loadTrips();
    }, [loadTrips]);

    useFocusEffect(
        useCallback(() => {
            loadTrips();
        }, [loadTrips])
    );

    // Event handlers
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadTrips();
        setIsRefreshing(false);
    };

    const handleFiltersChange = (newFilters: Partial<TripFiltersState>) => {
        setFilters((prev: TripFiltersState) => ({ ...prev, ...newFilters }));
        setSelectedTrips([]); // Clear selection when filters change
    };

    const handleSortChange = (newSortConfig: TripSortConfig) => {
        setSortConfig(newSortConfig);
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: "",
            status: "all",
            dateFilter: "all",
            occupancyFilter: "all",
            fareFilter: "all",
        });
        setSortConfig({
            field: "travel_date",
            direction: "desc",
        });
        setSelectedTrips([]);
    };

    const handleTripPress = (tripId: string) => {
        if (canViewTrips()) {
            router.push(`/trips/${tripId}` as any);
        }
    };

    const handleAddTrip = () => {
        if (canManageTrips()) {
            router.push("/trips/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create trips.");
        }
    };

    const handleTripSelection = (tripId: string) => {
        setSelectedTrips(prev =>
            prev.includes(tripId)
                ? prev.filter(id => id !== tripId)
                : [...prev, tripId]
        );
    };

    const handleSelectAllTrips = () => {
        setSelectedTrips(filteredTrips.map(trip => trip.id));
    };

    const handleClearSelection = () => {
        setSelectedTrips([]);
    };

    const handleBulkAction = async (actionKey: string) => {
        console.log(`Performing bulk action: ${actionKey} on ${selectedTrips.length} trips`);
        // TODO: Implement actual bulk actions

        switch (actionKey) {
            case 'export':
                // Export logic
                break;
            case 'reschedule':
            case 'delay':
            case 'complete':
            case 'cancel':
                // Update trip status logic
                break;
        }

        // Clear selection after action
        setSelectedTrips([]);
    };

    const toggleViewMode = () => {
        const modes: Array<'card' | 'list' | 'compact'> = ['card', 'list', 'compact'];
        const currentIndex = modes.indexOf(viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setViewMode(modes[nextIndex]);
    };

    // Render trip item with enhanced props
    const renderTripItem = ({ item: trip }: { item: Trip }) => {
        // Enhance trip data with computed fields
        const enhancedTrip = {
            ...trip,
            routeName: routes?.find(r => r.id === trip.route_id)?.name || 'Unknown Route',
            vesselName: vessels?.find(v => v.id === trip.vessel_id)?.name || 'Unknown Vessel',
            date: new Date(trip.travel_date).toLocaleDateString(),
            departureTime: trip.departure_time,
            arrivalTime: trip.arrival_time,
            capacity: trip.available_seats + trip.booked_seats,
            bookings: trip.booked_seats,
        };

        return (
            <TripItem
                trip={enhancedTrip as any}
                viewMode={viewMode}
                isSelected={selectedTrips.includes(trip.id)}
                showSelection={selectedTrips.length > 0 || canManageTrips()}
                onPress={() => handleTripPress(trip.id)}
                onSelectionToggle={() => handleTripSelection(trip.id)}
            />
        );
    };

    // Permission check
    if (!canViewTrips()) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: "Trips" }} />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.warning} />}
                    title="Access Denied"
                    message="You don't have permission to view trips."
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Trip Management",
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.viewModeButton}
                                onPress={toggleViewMode}
                            >
                                {viewMode === 'card' ? <Grid size={20} color={colors.primary} /> :
                                    viewMode === 'list' ? <List size={20} color={colors.primary} /> :
                                        <MoreHorizontal size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.content}
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
                {/* Statistics Section */}
                <TripStats
                    stats={tripStats}
                    isTablet={isTablet}
                    variant={isSmallScreen ? 'compact' : 'full'}
                />

                {/* Filters Section */}
                <TripFilters
                    filters={filters}
                    sortConfig={sortConfig}
                    onFiltersChange={handleFiltersChange}
                    onSortChange={handleSortChange}
                    onReset={handleResetFilters}
                    showAdvanced={showAdvancedFilters}
                    onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    resultsCount={filteredTrips.length}
                    totalCount={trips.length}
                    canManageTrips={canManageTrips()}
                    onAddTrip={handleAddTrip}
                />

                {/* Bulk Actions */}
                <TripBulkActions
                    selectedCount={selectedTrips.length}
                    totalCount={filteredTrips.length}
                    onSelectAll={handleSelectAllTrips}
                    onClearSelection={handleClearSelection}
                    onBulkAction={handleBulkAction}
                    canManageTrips={canManageTrips()}
                />

                {/* Trips List Section */}
                <ListSection
                    title="Trips"
                    subtitle={`${filteredTrips.length} trips found`}
                    listStyle={styles.tripsList}
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : filteredTrips.length === 0 ? (
                        <EmptyState
                            icon={<Calendar size={48} color={colors.textSecondary} />}
                            title="No trips found"
                            message={
                                filters.searchTerm || filters.status !== "all" || filters.dateFilter !== "all"
                                    ? "Try adjusting your filters or search terms"
                                    : canManageTrips()
                                        ? "Create your first trip to get started"
                                        : "No trips are currently available"
                            }
                            action={canManageTrips() ? (
                                <Button
                                    title="Add Trip"
                                    onPress={handleAddTrip}
                                    icon={<Plus size={16} color={colors.text} />}
                                />
                            ) : undefined}
                        />
                    ) : (
                        <FlatList
                            data={filteredTrips}
                            renderItem={renderTripItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.flatListContent}
                        />
                    )}
                </ListSection>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    viewModeButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.primary + "20",
    },
    tripsList: {
        flex: 1,
    },
    flatListContent: {
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
}); 