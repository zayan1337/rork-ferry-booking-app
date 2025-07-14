import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    FlatList,
    Platform,
    ActivityIndicator,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useOperationsData } from "@/hooks/useOperationsData";
import { Trip, TripFilters, TripSortField, SortConfig } from "@/types/operations";
import { filterTrips, searchTrips, formatTripStatus, getTripOccupancy } from "@/utils/tripUtils";
import { getResponsiveDimensions, getResponsivePadding } from "@/utils/dashboardUtils";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import EmptyState from "@/components/admin/EmptyState";
import TripItem from "@/components/admin/TripItem";

// Icons
import {
    Plus,
    Filter,
    Calendar,
    Clock,
    Ship,
    Users,
    MapPin,
    TrendingUp,
    AlertTriangle,
    SortAsc,
    SortDesc,
    BarChart3,
    Settings,
    Download,
    RefreshCw,
    ChevronDown,
    X,
    Eye,
    Edit,
    Trash,
    ArrowUpDown,
    Search,
    Grid,
    List,
} from "lucide-react-native";

interface TripListFilters extends TripFilters {
    searchTerm: string;
    dateFilter: "all" | "today" | "tomorrow" | "thisWeek" | "thisMonth" | "custom";
    customDateRange?: { from: string; to: string };
    occupancyFilter: "all" | "low" | "medium" | "high" | "full";
    fareFilter: "all" | "standard" | "premium" | "discounted";
}

interface TripStats {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    averageOccupancy: number;
    totalRevenue: number;
}

export default function TripsListingPage() {
    const { canViewTrips, canManageTrips } = useAdminPermissions();
    const { trips: allTrips, routes, vessels, loading } = useAdminStore();

    const [trips, setTrips] = useState<Trip[]>([]);
    const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
    const [filters, setFilters] = useState<TripListFilters>({
        searchTerm: "",
        status: "all",
        dateFilter: "all",
        occupancyFilter: "all",
        fareFilter: "all",
    });
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        field: "travel_date" as TripSortField,
        direction: "desc",
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [showBulkActions, setShowBulkActions] = useState(false);

    const { isTablet, isSmallScreen } = getResponsiveDimensions();

    // Calculate trip statistics
    const tripStats = useMemo<TripStats>(() => {
        const scheduled = trips.filter(t => t.status === 'scheduled').length;
        const inProgress = trips.filter(t => ['boarding', 'departed'].includes(t.status)).length;
        const completed = trips.filter(t => t.status === 'arrived').length;
        const cancelled = trips.filter(t => t.status === 'cancelled').length;

        const totalOccupancy = trips.reduce((sum, trip) => sum + getTripOccupancy(trip), 0);
        const averageOccupancy = trips.length > 0 ? totalOccupancy / trips.length : 0;

        const totalRevenue = trips.reduce((sum, trip) => {
            const route = routes?.find(r => r.id === trip.route_id);
            return sum + (route ? trip.booked_seats * route.base_fare * trip.fare_multiplier : 0);
        }, 0);

        return {
            total: trips.length,
            scheduled,
            inProgress,
            completed,
            cancelled,
            averageOccupancy,
            totalRevenue,
        };
    }, [trips, routes]);

    // Auto-refresh focused page
    useFocusEffect(
        useCallback(() => {
            loadTrips();
        }, [])
    );

    useEffect(() => {
        loadTrips();
    }, []);

    useEffect(() => {
        applyFiltersAndSort();
    }, [trips, filters, sortConfig]);

    const loadTrips = async () => {
        try {
            setTrips(allTrips || []);
        } catch (error) {
            Alert.alert("Error", "Failed to load trips");
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadTrips();
        setIsRefreshing(false);
    };

    const applyFiltersAndSort = useCallback(() => {
        let filtered = [...trips];

        // Apply search
        if (filters.searchTerm.trim()) {
            filtered = searchTrips(filtered, filters.searchTerm);
        }

        // Apply status filter
        if (filters.status && filters.status !== "all") {
            filtered = filtered.filter(trip => trip.status === filters.status);
        }

        // Apply route filter
        if (filters.route_id) {
            filtered = filtered.filter(trip => trip.route_id === filters.route_id);
        }

        // Apply vessel filter
        if (filters.vessel_id) {
            filtered = filtered.filter(trip => trip.vessel_id === filters.vessel_id);
        }

        // Apply date filter
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const thisWeek = new Date(today);
        thisWeek.setDate(today.getDate() + 7);
        const thisMonth = new Date(today);
        thisMonth.setMonth(today.getMonth() + 1);

        switch (filters.dateFilter) {
            case "today":
                filtered = filtered.filter(trip => {
                    const tripDate = new Date(trip.travel_date);
                    return tripDate.toDateString() === today.toDateString();
                });
                break;
            case "tomorrow":
                filtered = filtered.filter(trip => {
                    const tripDate = new Date(trip.travel_date);
                    return tripDate.toDateString() === tomorrow.toDateString();
                });
                break;
            case "thisWeek":
                filtered = filtered.filter(trip => {
                    const tripDate = new Date(trip.travel_date);
                    return tripDate >= today && tripDate <= thisWeek;
                });
                break;
            case "thisMonth":
                filtered = filtered.filter(trip => {
                    const tripDate = new Date(trip.travel_date);
                    return tripDate >= today && tripDate <= thisMonth;
                });
                break;
            case "custom":
                if (filters.customDateRange) {
                    const fromDate = new Date(filters.customDateRange.from);
                    const toDate = new Date(filters.customDateRange.to);
                    filtered = filtered.filter(trip => {
                        const tripDate = new Date(trip.travel_date);
                        return tripDate >= fromDate && tripDate <= toDate;
                    });
                }
                break;
        }

        // Apply occupancy filter
        if (filters.occupancyFilter !== "all") {
            filtered = filtered.filter(trip => {
                const occupancy = getTripOccupancy(trip);
                switch (filters.occupancyFilter) {
                    case "low": return occupancy < 50;
                    case "medium": return occupancy >= 50 && occupancy < 80;
                    case "high": return occupancy >= 80 && occupancy < 100;
                    case "full": return occupancy >= 100;
                    default: return true;
                }
            });
        }

        // Apply fare filter
        if (filters.fareFilter !== "all") {
            filtered = filtered.filter(trip => {
                switch (filters.fareFilter) {
                    case "standard": return trip.fare_multiplier === 1;
                    case "premium": return trip.fare_multiplier > 1;
                    case "discounted": return trip.fare_multiplier < 1;
                    default: return true;
                }
            });
        }

        // Sort
        filtered.sort((a, b) => {
            const { field, direction } = sortConfig;
            let aValue: any = a[field as keyof Trip];
            let bValue: any = b[field as keyof Trip];

            if (field === "travel_date" || field === "departure_time") {
                aValue = new Date(`${a.travel_date} ${a.departure_time}`);
                bValue = new Date(`${b.travel_date} ${b.departure_time}`);
            } else if (field === "available_seats" || field === "booked_seats") {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
            }

            if (aValue < bValue) return direction === "asc" ? -1 : 1;
            if (aValue > bValue) return direction === "asc" ? 1 : -1;
            return 0;
        });

        setFilteredTrips(filtered);
    }, [trips, filters, sortConfig]);

    const handleSort = (field: TripSortField) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const handleTripPress = (tripId: string) => {
        if (canViewTrips()) {
            router.push(`./trips/${tripId}` as any);
        }
    };

    const handleAddTrip = () => {
        if (canManageTrips()) {
            router.push("./trips/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create trips.");
        }
    };

    const handleBulkAction = (action: string) => {
        if (selectedTrips.length === 0) {
            Alert.alert("No Selection", "Please select trips to perform bulk actions.");
            return;
        }

        let confirmMessage = "";
        switch (action) {
            case "cancel":
                confirmMessage = `Are you sure you want to cancel ${selectedTrips.length} selected trip(s)?`;
                break;
            case "delay":
                confirmMessage = `Mark ${selectedTrips.length} selected trip(s) as delayed?`;
                break;
            case "export":
                confirmMessage = `Export data for ${selectedTrips.length} selected trip(s)?`;
                break;
            default:
                confirmMessage = `Perform ${action} on ${selectedTrips.length} selected trip(s)?`;
        }

        Alert.alert(
            "Confirm Bulk Action",
            confirmMessage,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => performBulkAction(action) },
            ]
        );
    };

    const performBulkAction = async (action: string) => {
        try {
            console.log(`Performing ${action} on trips:`, selectedTrips);
            // Implementation would depend on the specific action
            setSelectedTrips([]);
            setShowBulkActions(false);
            await loadTrips();
        } catch (error) {
            Alert.alert("Error", `Failed to ${action} selected trips`);
        }
    };

    const toggleTripSelection = (tripId: string) => {
        setSelectedTrips(prev =>
            prev.includes(tripId)
                ? prev.filter(id => id !== tripId)
                : [...prev, tripId]
        );
    };

    const selectAllTrips = () => {
        setSelectedTrips(filteredTrips.map(trip => trip.id));
    };

    const clearSelection = () => {
        setSelectedTrips([]);
        setShowBulkActions(false);
    };

    const resetFilters = () => {
        setFilters({
            searchTerm: "",
            status: "all",
            dateFilter: "all",
            occupancyFilter: "all",
            fareFilter: "all",
        });
        setShowAdvancedFilters(false);
    };

    const renderFilterButton = (label: string, isActive: boolean, onPress: () => void) => (
        <TouchableOpacity
            style={[styles.filterButton, isActive && styles.filterButtonActive]}
            onPress={onPress}
        >
            <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderSortButton = (field: TripSortField, label: string) => (
        <TouchableOpacity
            style={[styles.sortButton, sortConfig.field === field && styles.sortButtonActive]}
            onPress={() => handleSort(field)}
        >
            <Text style={[styles.sortButtonText, sortConfig.field === field && styles.sortButtonTextActive]}>
                {label}
            </Text>
            {sortConfig.field === field && (
                sortConfig.direction === "asc" ?
                    <SortAsc size={14} color={colors.primary} /> :
                    <SortDesc size={14} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    const renderStatsCard = (title: string, value: string | number, subtitle?: string, icon?: React.ReactNode, color?: string) => (
        <View style={[styles.statsCard, isSmallScreen && styles.statsCardSmall]}>
            <View style={styles.statsCardContent}>
                <View style={styles.statsCardHeader}>
                    {icon && <View style={[styles.statsCardIcon, { backgroundColor: color + '20' }]}>{icon}</View>}
                    <Text style={styles.statsCardTitle}>{title}</Text>
                </View>
                <Text style={[styles.statsCardValue, { color: color || colors.text }]}>{value}</Text>
                {subtitle && <Text style={styles.statsCardSubtitle}>{subtitle}</Text>}
            </View>
        </View>
    );

    const renderTripCard = ({ item: trip }: { item: Trip }) => {
        const isSelected = selectedTrips.includes(trip.id);
        const occupancy = getTripOccupancy(trip);
        const status = formatTripStatus(trip.status);
        const route = routes?.find(r => r.id === trip.route_id);
        const vessel = vessels?.find(v => v.id === trip.vessel_id);

        if (viewMode === 'list') {
            return (
                <TouchableOpacity
                    style={[styles.tripListItem, isSelected && styles.tripItemSelected]}
                    onPress={() => handleTripPress(trip.id)}
                    onLongPress={() => toggleTripSelection(trip.id)}
                >
                    <View style={styles.tripListContent}>
                        <View style={styles.tripListMain}>
                            <Text style={styles.tripListRoute}>
                                {route?.origin || 'Unknown'} → {route?.destination || 'Unknown'}
                            </Text>
                            <Text style={styles.tripListDateTime}>
                                {new Date(trip.travel_date).toLocaleDateString()} • {trip.departure_time}
                            </Text>
                        </View>
                        <View style={styles.tripListMeta}>
                            <StatusBadge status={trip.status} size="small" />
                            <Text style={styles.tripListOccupancy}>{occupancy}%</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.tripCard, isSelected && styles.tripCardSelected]}
                onPress={() => handleTripPress(trip.id)}
                onLongPress={() => toggleTripSelection(trip.id)}
            >
                <View style={styles.tripCardHeader}>
                    <View style={styles.tripRoute}>
                        <MapPin size={16} color={colors.primary} />
                        <Text style={styles.tripRouteText}>
                            {route?.origin || 'Unknown'} → {route?.destination || 'Unknown'}
                        </Text>
                    </View>
                    <StatusBadge status={trip.status} />
                </View>

                <View style={styles.tripCardContent}>
                    <View style={styles.tripDateTime}>
                        <View style={styles.tripDateTimeItem}>
                            <Calendar size={14} color={colors.textSecondary} />
                            <Text style={styles.tripDateTimeText}>
                                {new Date(trip.travel_date).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.tripDateTimeItem}>
                            <Clock size={14} color={colors.textSecondary} />
                            <Text style={styles.tripDateTimeText}>{trip.departure_time}</Text>
                        </View>
                    </View>

                    <View style={styles.tripDetails}>
                        <View style={styles.tripDetailItem}>
                            <Ship size={14} color={colors.textSecondary} />
                            <Text style={styles.tripDetailText}>{vessel?.name || 'Unknown Vessel'}</Text>
                        </View>
                        <View style={styles.tripDetailItem}>
                            <Users size={14} color={colors.textSecondary} />
                            <Text style={styles.tripDetailText}>
                                {trip.booked_seats}/{trip.available_seats + trip.booked_seats}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.tripMetrics}>
                        <View style={styles.tripOccupancy}>
                            <Text style={styles.tripOccupancyLabel}>Occupancy</Text>
                            <View style={styles.tripOccupancyBar}>
                                <View
                                    style={[
                                        styles.tripOccupancyFill,
                                        { width: `${Math.min(occupancy, 100)}%` },
                                        occupancy > 80 ? styles.occupancyHigh :
                                            occupancy > 60 ? styles.occupancyMedium : styles.occupancyLow
                                    ]}
                                />
                            </View>
                            <Text style={styles.tripOccupancyText}>{occupancy.toFixed(0)}%</Text>
                        </View>

                        {trip.fare_multiplier !== 1 && (
                            <View style={styles.tripFareMultiplier}>
                                <TrendingUp size={12} color={colors.warning} />
                                <Text style={styles.tripFareMultiplierText}>
                                    {trip.fare_multiplier}x fare
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {isSelected && (
                    <View style={styles.tripCardSelectedOverlay}>
                        <View style={styles.tripCardSelectedIndicator} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (!canViewTrips()) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: "Trips" }} />
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view trips.
                    </Text>
                </View>
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
                                style={styles.headerButton}
                                onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            >
                                <Settings size={20} color={colors.primary} />
                            </TouchableOpacity>
                            {canManageTrips() && (
                                <TouchableOpacity
                                    style={[styles.headerButton, styles.primaryHeaderButton]}
                                    onPress={handleAddTrip}
                                >
                                    <Plus size={20} color={colors.white} />
                                </TouchableOpacity>
                            )}
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
                {/* Statistics Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsSection}
                    contentContainerStyle={styles.statsContent}
                >
                    {renderStatsCard(
                        "Total Trips",
                        tripStats.total.toString(),
                        "All time",
                        <BarChart3 size={16} color={colors.primary} />,
                        colors.primary
                    )}
                    {renderStatsCard(
                        "Scheduled",
                        tripStats.scheduled.toString(),
                        "Upcoming",
                        <Calendar size={16} color={colors.info} />,
                        colors.info
                    )}
                    {renderStatsCard(
                        "In Progress",
                        tripStats.inProgress.toString(),
                        "Currently running",
                        <Clock size={16} color={colors.warning} />,
                        colors.warning
                    )}
                    {renderStatsCard(
                        "Avg. Occupancy",
                        `${tripStats.averageOccupancy.toFixed(1)}%`,
                        "Overall performance",
                        <Users size={16} color={colors.success} />,
                        colors.success
                    )}
                </ScrollView>

                {/* Header */}
                <SectionHeader
                    title="All Trips"
                    subtitle={`${filteredTrips.length} of ${trips.length} trips`}
                />

                {/* Search and View Toggle */}
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <SearchBar
                            placeholder="Search trips, routes, vessels..."
                            value={filters.searchTerm}
                            onChangeText={(text) => setFilters(prev => ({ ...prev, searchTerm: text }))}
                        />
                    </View>

                    <View style={styles.viewToggle}>
                        <TouchableOpacity
                            style={[styles.viewToggleButton, viewMode === 'card' && styles.viewToggleButtonActive]}
                            onPress={() => setViewMode('card')}
                        >
                            <Grid size={16} color={viewMode === 'card' ? colors.white : colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
                            onPress={() => setViewMode('list')}
                        >
                            <List size={16} color={viewMode === 'list' ? colors.white : colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.filterToggle, showAdvancedFilters && styles.filterToggleActive]}
                        onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                        <Filter size={16} color={showAdvancedFilters ? colors.white : colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <View style={styles.advancedFilters}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Date Range</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterRow}
                            >
                                {["all", "today", "tomorrow", "thisWeek", "thisMonth"].map(filter => (
                                    <TouchableOpacity
                                        key={filter}
                                        style={[
                                            styles.filterChip,
                                            filters.dateFilter === filter && styles.filterChipActive
                                        ]}
                                        onPress={() => setFilters(prev => ({ ...prev, dateFilter: filter as any }))}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            filters.dateFilter === filter && styles.filterChipTextActive
                                        ]}>
                                            {filter === "all" ? "All Dates" :
                                                filter === "today" ? "Today" :
                                                    filter === "tomorrow" ? "Tomorrow" :
                                                        filter === "thisWeek" ? "This Week" : "This Month"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Status</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterRow}
                            >
                                {[
                                    { key: "all", label: "All Status" },
                                    { key: "scheduled", label: "Scheduled" },
                                    { key: "boarding", label: "Boarding" },
                                    { key: "departed", label: "Departed" },
                                    { key: "arrived", label: "Completed" },
                                    { key: "cancelled", label: "Cancelled" },
                                ].map(({ key, label }) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.filterChip,
                                            filters.status === key && styles.filterChipActive
                                        ]}
                                        onPress={() => setFilters(prev => ({ ...prev, status: key as any }))}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            filters.status === key && styles.filterChipTextActive
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Occupancy</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterRow}
                            >
                                {[
                                    { key: "all", label: "All Levels" },
                                    { key: "low", label: "Low (<50%)" },
                                    { key: "medium", label: "Medium (50-80%)" },
                                    { key: "high", label: "High (80-100%)" },
                                    { key: "full", label: "Full (100%)" },
                                ].map(({ key, label }) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.filterChip,
                                            filters.occupancyFilter === key && styles.filterChipActive
                                        ]}
                                        onPress={() => setFilters(prev => ({ ...prev, occupancyFilter: key as any }))}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            filters.occupancyFilter === key && styles.filterChipTextActive
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Fare Type</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.filterRow}
                            >
                                {[
                                    { key: "all", label: "All Types" },
                                    { key: "standard", label: "Standard" },
                                    { key: "premium", label: "Premium" },
                                    { key: "discounted", label: "Discounted" },
                                ].map(({ key, label }) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.filterChip,
                                            filters.fareFilter === key && styles.filterChipActive
                                        ]}
                                        onPress={() => setFilters(prev => ({ ...prev, fareFilter: key as any }))}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            filters.fareFilter === key && styles.filterChipTextActive
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.filterActions}>
                            <Button
                                title="Reset Filters"
                                variant="outline"
                                size="small"
                                onPress={resetFilters}
                            />
                            <Button
                                title="Apply Filters"
                                size="small"
                                onPress={() => setShowAdvancedFilters(false)}
                            />
                        </View>
                    </View>
                )}

                {/* Sort Options */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.sortOptions}
                    contentContainerStyle={styles.sortOptionsContent}
                >
                    {renderSortButton("travel_date", "Date")}
                    {renderSortButton("departure_time", "Time")}
                    {renderSortButton("status", "Status")}
                    {renderSortButton("booked_seats", "Bookings")}
                    {renderSortButton("available_seats", "Availability")}
                </ScrollView>

                {/* Selection and Bulk Actions */}
                {selectedTrips.length > 0 && (
                    <View style={styles.bulkActions}>
                        <View style={styles.bulkActionsLeft}>
                            <Text style={styles.bulkActionsText}>
                                {selectedTrips.length} trip(s) selected
                            </Text>
                            <TouchableOpacity onPress={selectAllTrips}>
                                <Text style={styles.selectAllText}>Select All</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.bulkActionsButtons}>
                            <TouchableOpacity
                                style={styles.bulkActionButton}
                                onPress={() => handleBulkAction("export")}
                            >
                                <Download size={16} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bulkActionButton}
                                onPress={() => handleBulkAction("delay")}
                            >
                                <Clock size={16} color={colors.warning} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.bulkActionButton}
                                onPress={() => handleBulkAction("cancel")}
                            >
                                <X size={16} color={colors.error} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.bulkActionButton, styles.clearButton]}
                                onPress={clearSelection}
                            >
                                <Text style={styles.clearButtonText}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Trips List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading trips...</Text>
                    </View>
                ) : filteredTrips.length === 0 ? (
                    <EmptyState
                        title="No trips found"
                        subtitle={filters.searchTerm || Object.values(filters).some(f => f !== "all" && f !== "")
                            ? "Try adjusting your filters or search terms"
                            : "Create your first trip to get started"}
                        actionTitle={canManageTrips() ? "Add Trip" : undefined}
                        onActionPress={canManageTrips() ? handleAddTrip : undefined}
                    />
                ) : (
                    <FlatList
                        data={filteredTrips}
                        renderItem={renderTripCard}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.tripsList}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                )}
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
    headerButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.primary + "20",
    },
    primaryHeaderButton: {
        backgroundColor: colors.primary,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    searchSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    searchContainer: {
        flex: 1,
    },
    filterToggle: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    filterToggleActive: {
        backgroundColor: colors.primary,
    },
    viewToggle: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    viewToggleButton: {
        padding: 10,
        borderRadius: 8,
    },
    viewToggleButtonActive: {
        backgroundColor: colors.primary,
    },
    quickFilters: {
        marginBottom: 8,
    },
    quickFiltersContent: {
        paddingRight: 16,
        gap: 8,
    },
    statusFilters: {
        marginBottom: 8,
    },
    statusFiltersContent: {
        paddingRight: 16,
        gap: 8,
    },
    sortOptions: {
        marginBottom: 16,
    },
    sortOptionsContent: {
        paddingRight: 16,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterButtonText: {
        fontSize: 14,
        color: colors.text,
    },
    filterButtonTextActive: {
        color: colors.white,
    },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    sortButtonActive: {
        backgroundColor: colors.primary + "20",
        borderColor: colors.primary,
    },
    sortButtonText: {
        fontSize: 14,
        color: colors.text,
    },
    sortButtonTextActive: {
        color: colors.primary,
    },
    bulkActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.primary + "10",
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    bulkActionsLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    bulkActionsText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: "500",
    },
    selectAllText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: "500",
        textDecorationLine: "underline",
    },
    bulkActionsButtons: {
        flexDirection: "row",
        gap: 8,
    },
    bulkActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    clearButton: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
    },
    clearButtonText: {
        fontSize: 14,
        color: colors.text,
    },
    tripsList: {
        gap: 12,
    },
    tripListItem: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tripItemSelected: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    tripListContent: {
        flex: 1,
    },
    tripListMain: {
        marginBottom: 8,
    },
    tripListRoute: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    tripListDateTime: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    tripListMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    tripListOccupancy: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    tripCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        position: "relative",
    },
    tripCardSelected: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    tripCardSelectedOverlay: {
        position: "absolute",
        top: 8,
        right: 8,
    },
    tripCardSelectedIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
    },
    tripCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    tripRoute: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    tripRouteText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    tripCardContent: {
        gap: 12,
    },
    tripDateTime: {
        flexDirection: "row",
        gap: 16,
    },
    tripDateTimeItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    tripDateTimeText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    tripDetails: {
        flexDirection: "row",
        gap: 16,
    },
    tripDetailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    tripDetailText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    tripMetrics: {
        gap: 8,
    },
    tripOccupancy: {
        gap: 4,
    },
    tripOccupancyLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    tripOccupancyBar: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: "hidden",
    },
    tripOccupancyFill: {
        height: "100%",
        borderRadius: 2,
    },
    occupancyLow: {
        backgroundColor: colors.success,
    },
    occupancyMedium: {
        backgroundColor: colors.warning,
    },
    occupancyHigh: {
        backgroundColor: colors.error,
    },
    tripOccupancyText: {
        fontSize: 12,
        color: colors.text,
        fontWeight: "500",
    },
    tripFareMultiplier: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    tripFareMultiplierText: {
        fontSize: 12,
        color: colors.warning,
        fontWeight: "500",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 64,
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
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
    advancedFilters: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterSection: {
        marginBottom: 16,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    filterRow: {
        paddingRight: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        color: colors.text,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    filterActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    statsSection: {
        marginBottom: 16,
    },
    statsContent: {
        paddingRight: 16,
        gap: 12,
    },
    statsCard: {
        width: 180,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statsCardSmall: {
        width: 150,
    },
    statsCardContent: {
        alignItems: "center",
    },
    statsCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    statsCardIcon: {
        padding: 8,
        borderRadius: 12,
    },
    statsCardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    statsCardValue: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
    },
    statsCardSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
}); 