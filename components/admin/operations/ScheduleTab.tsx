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
import { useOperationsStore } from "@/store/admin/operationsStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    Eye,
    AlertTriangle,
    Calendar,
} from "lucide-react-native";

// Components
import SectionHeader from "@/components/admin/SectionHeader";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface ScheduleTabProps {
    isActive: boolean;
}

export default function ScheduleTab({ isActive }: ScheduleTabProps) {
    const { canViewTrips } = useAdminPermissions();
    const {
        todaySchedule,
        loading,
    } = useOperationsStore();

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Initialize schedule data when tab becomes active
    useEffect(() => {
        if (isActive && canViewTrips() && (!todaySchedule || todaySchedule.length === 0)) {
            // Load schedule data - this would typically be handled by the store
            // For now, we'll rely on the store's existing data
        }
    }, [isActive, todaySchedule?.length]);

    // Limit schedule to 4 items for display
    const displaySchedule = useMemo(() => {
        return todaySchedule.slice(0, 4);
    }, [todaySchedule]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Refresh schedule data - this would typically be handled by the store
            // For now, we'll just simulate a delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Error refreshing schedule:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleTripPress = (tripId: string) => {
        if (canViewTrips()) {
            router.push(`../trips/${tripId}` as any);
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
                    You don't have permission to view schedule.
                </Text>
            </View>
        );
    }

    // Loading state
    if (loading.schedule && (!todaySchedule || todaySchedule.length === 0)) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <SectionHeader
                title="Schedule Overview"
                subtitle="Today's trip schedule"
            />

            {/* Schedule Grid */}
            {displaySchedule.length > 0 ? (
                <View style={styles.scheduleGrid}>
                    {displaySchedule.map((trip: any, index: number) => (
                        <TouchableOpacity
                            key={`schedule-${trip.id}-${index}`}
                            style={styles.scheduleItem}
                            onPress={() => handleTripPress(trip.id)}
                        >
                            <Text style={styles.scheduleTime}>{trip.departure_time || '--:--'}</Text>
                            <Text style={styles.scheduleRoute}>{trip.routeName || trip.route_name || 'Unknown Route'}</Text>
                            <Text style={styles.scheduleVessel}>{trip.vesselName || trip.vessel_name || 'Unknown Vessel'}</Text>
                            <View style={styles.scheduleBookings}>
                                <Text style={styles.scheduleBookingText}>
                                    {trip.bookings || 0}/{trip.capacity || 0}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Calendar size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyStateTitle}>No trips scheduled</Text>
                    <Text style={styles.emptyStateText}>
                        No trips are scheduled for today
                    </Text>
                </View>
            )}

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
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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