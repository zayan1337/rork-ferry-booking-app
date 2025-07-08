import React, { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminTrips } from "@/hooks/admin";
import {
    Calendar,
    Clock,
    MapPin,
    Ship,
    Users,
    Edit3,
    Trash2,
    CheckCircle,
    Activity
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import { AdminTrip } from "@/types/admin";

export default function ScheduleDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        getTripDetails,
        updateTrip: updateTripStatus,
        deleteTrip,
        loading,
        error
    } = useAdminTrips();

    const [trip, setTrip] = useState<AdminTrip | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Load trip details
    useEffect(() => {
        if (id) {
            loadTripDetails();
        }
    }, [id]);

    const loadTripDetails = async () => {
        try {
            const tripData = await getTripDetails(id!);
            setTrip(tripData);
        } catch (err) {
            console.error('Error loading trip details:', err);
        }
    };

    if (loading && !trip) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading trip details...</Text>
            </View>
        );
    }

    if (error || !trip) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {error || "Trip not found"}
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: AdminTrip['status']) => {
        setActionLoading(true);
        try {
            const success = await updateTripStatus(trip.id, { status: newStatus });
            if (success) {
                setTrip(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update trip status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = () => {
        router.push(`../schedule/${trip.id}/edit` as any);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Trip",
            "Are you sure you want to delete this trip? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const success = await deleteTrip(trip.id);
                            if (success) {
                                router.back();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete trip');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    const formatTime = (timeString: string) => {
        try {
            if (timeString.includes('T')) {
                // Full datetime string
                const date = new Date(timeString);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            // Time only string (HH:MM:SS)
            return timeString.substring(0, 5); // Get HH:MM part
        } catch {
            return timeString;
        }
    };

    const occupancyPercentage = Math.round(
        ((trip.vessel_capacity - trip.available_seats) / trip.vessel_capacity) * 100
    );

    const getOccupancyColor = () => {
        if (occupancyPercentage >= 90) return colors.danger;
        if (occupancyPercentage >= 70) return colors.warning;
        return colors.success;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: `Trip #${trip.id.substring(0, 8)}`,
                    headerRight: () => (
                        <Button
                            title="Edit"
                            variant="outline"
                            size="small"
                            icon={<Edit3 size={16} color={colors.primary} />}
                            onPress={handleEdit}
                        />
                    ),
                }}
            />

            {/* Trip Status Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Trip Status</Text>
                    <StatusBadge status={trip.status} />
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Start Trip"
                        variant="primary"
                        size="small"
                        disabled={trip.status === "in_progress" || actionLoading}
                        loading={actionLoading}
                        onPress={() => handleStatusUpdate("in_progress")}
                    />
                    <Button
                        title="Complete"
                        variant="outline"
                        size="small"
                        disabled={trip.status === "completed" || actionLoading}
                        onPress={() => handleStatusUpdate("completed")}
                    />
                </View>
            </View>

            {/* Trip Information Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Trip Information</Text>

                <View style={styles.detailRow}>
                    <MapPin size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Route</Text>
                        <Text style={styles.detailValue}>
                            {trip.route_name || `${trip.from_island_name} to ${trip.to_island_name}`}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Ship size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Vessel</Text>
                        <Text style={styles.detailValue}>{trip.vessel_name}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Travel Date</Text>
                        <Text style={styles.detailValue}>{formatDate(trip.travel_date)}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Clock size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Departure Time</Text>
                        <Text style={styles.detailValue}>{formatTime(trip.departure_time)}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Clock size={20} color={colors.secondary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Arrival Time</Text>
                        <Text style={styles.detailValue}>{formatTime(trip.arrival_time)}</Text>
                    </View>
                </View>

                {trip.base_fare && (
                    <View style={styles.detailRow}>
                        <CheckCircle size={20} color={colors.success} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Base Fare</Text>
                            <Text style={styles.detailValue}>MVR {trip.base_fare}</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Capacity Information */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Capacity Information</Text>

                <View style={styles.capacityStats}>
                    <View style={styles.statItem}>
                        <Users size={24} color={colors.primary} />
                        <Text style={styles.statValue}>{trip.vessel_capacity - trip.available_seats}</Text>
                        <Text style={styles.statLabel}>Booked</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Ship size={24} color={colors.secondary} />
                        <Text style={styles.statValue}>{trip.vessel_capacity}</Text>
                        <Text style={styles.statLabel}>Total Capacity</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Users size={24} color={colors.success} />
                        <Text style={styles.statValue}>{trip.available_seats}</Text>
                        <Text style={styles.statLabel}>Available</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Activity size={24} color={getOccupancyColor()} />
                        <Text style={styles.statValue}>{occupancyPercentage}%</Text>
                        <Text style={styles.statLabel}>Occupied</Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>Occupancy</Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${occupancyPercentage}%`,
                                    backgroundColor: getOccupancyColor()
                                }
                            ]}
                        />
                    </View>
                    <Text style={[styles.progressText, { color: getOccupancyColor() }]}>
                        {occupancyPercentage}% Full
                    </Text>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>

                <View style={styles.actionGrid}>
                    <Button
                        title="View Bookings"
                        variant="primary"
                        icon={<Users size={18} color="#FFFFFF" />}
                        onPress={() => {
                            // Navigate to bookings filtered by this trip
                            router.push(`/(admin)/bookings?trip_id=${trip.id}` as any);
                        }}
                        fullWidth
                    />

                    <Button
                        title="View Vessel"
                        variant="outline"
                        icon={<Ship size={18} color={colors.primary} />}
                        onPress={() => {
                            router.push(`/(admin)/vessel/${trip.vessel_id}` as any);
                        }}
                        fullWidth
                    />

                    <Button
                        title="Generate Manifest"
                        variant="outline"
                        icon={<CheckCircle size={18} color={colors.primary} />}
                        onPress={() => {
                            // Generate passenger manifest
                            console.log('Generate manifest for trip:', trip.id);
                        }}
                        fullWidth
                    />
                </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <Text style={styles.dangerDescription}>
                    These actions cannot be undone. Please proceed with caution.
                </Text>

                <Button
                    title="Delete Trip"
                    variant="danger"
                    icon={<Trash2 size={18} color="#FFFFFF" />}
                    onPress={handleDelete}
                    loading={actionLoading}
                    fullWidth
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        padding: 16,
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
        textAlign: 'center',
        marginBottom: 24,
    },
    card: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    statusActions: {
        flexDirection: 'row',
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailContent: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    capacityStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    progressContainer: {
        marginTop: 16,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    actionGrid: {
        gap: 12,
    },
    dangerCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.danger,
    },
    dangerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.danger,
        marginBottom: 8,
    },
    dangerDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
    },
}); 