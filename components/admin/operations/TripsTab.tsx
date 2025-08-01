import React, { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useTripManagement } from "@/hooks/useTripManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    Plus,
    Eye,
    AlertTriangle,
    Calendar,
} from "lucide-react-native";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import TripItem from "@/components/admin/TripItem";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface TripsTabProps {
    isActive: boolean;
    searchQuery?: string;
}

export default function TripsTab({ isActive, searchQuery = "" }: TripsTabProps) {
    const { canViewTrips, canManageTrips } = useAdminPermissions();
    const {
        trips: allTrips,
        filteredTrips,
        searchQuery: tripSearchQuery,
        setSearchQuery: setTripSearchQuery,
        loading,
        stats,
        loadAll: loadTrips,
    } = useTripManagement();

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Initialize trips data when tab becomes active
    useEffect(() => {
        if (isActive && canViewTrips() && (!allTrips || allTrips.length === 0)) {
            loadTrips();
        }
    }, [isActive, allTrips?.length, loadTrips]);

    // Filter trips based on search query
    const filteredTripsData = useMemo(() => {
        if (!filteredTrips) return [];

        let filtered = filteredTrips;
        const query = searchQuery || tripSearchQuery || "";

        if (query) {
            filtered = filteredTrips.filter(trip =>
                trip.route_name?.toLowerCase().includes(query.toLowerCase()) ||
                trip.vessel_name?.toLowerCase().includes(query.toLowerCase()) ||
                trip.travel_date?.toLowerCase().includes(query.toLowerCase())
            );
        }

        return filtered;
    }, [filteredTrips, searchQuery, tripSearchQuery]);

    // Limit trips to 4 for display
    const displayTrips = useMemo(() => {
        return filteredTripsData
            .filter((trip, index, self) => index === self.findIndex(t => t.id === trip.id))
            .slice(0, 4);
    }, [filteredTripsData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadTrips();
        } catch (error) {
            console.error('Error refreshing trips:', error);
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
            router.push("../trip/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create trips.");
        }
    };

    const handleViewAllTrips = () => {
        router.push("../trips" as any);
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

    // Loading state
    if (loading.data && (!allTrips || allTrips.length === 0)) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            {/* Header */}
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

            {/* Search Bar */}
            <SearchBar
                placeholder="Search trips..."
                value={searchQuery || tripSearchQuery || ""}
                onChangeText={(text) => setTripSearchQuery(text)}
            />

            {/* Trips List */}
            <View style={styles.itemsList}>
                {displayTrips.length > 0 ? (
                    displayTrips.map((trip: any, index: number) => (
                        <TripItem
                            key={`trip-${trip.id}-${index}`}
                            trip={{
                                ...trip,
                                routeId: trip.route_id,
                                vesselId: trip.vessel_id,
                                date: trip.travel_date,
                                departureTime: trip.departure_time,
                                routeName: trip.route_name || 'Unknown Route',
                                vesselName: trip.vessel_name || 'Unknown Vessel',
                                status: trip.computed_status === 'boarding' || trip.computed_status === 'departed' ? 'in-progress' :
                                    trip.computed_status === 'arrived' || trip.computed_status === 'completed' ? 'completed' :
                                        trip.computed_status === 'delayed' ? 'scheduled' :
                                            trip.computed_status as any,
                                bookings: trip.confirmed_bookings || 0,
                            } as any}
                            onPress={() => handleTripPress(trip.id)}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Calendar size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyStateTitle}>No trips found</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery || tripSearchQuery ? 'Try adjusting your search terms' : 'No trips scheduled for today'}
                        </Text>
                    </View>
                )}
            </View>

            {/* View All Button */}
            <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAllTrips}
            >
                <Text style={styles.viewAllText}>View All Trips</Text>
                <Eye size={16} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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