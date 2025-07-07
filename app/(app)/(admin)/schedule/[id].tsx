import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import {
    Calendar,
    Clock,
    MapPin,
    Ship,
    Users,
    Edit3,
    Trash2
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";

export default function ScheduleDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { trips, updateTrip, deleteTrip } = useAdminStore();
    const [loading, setLoading] = useState(false);

    const trip = trips.find(t => t.id === id);

    if (!trip) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Trip not found</Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: typeof trip.status) => {
        setLoading(true);
        try {
            updateTrip(trip.id, { status: newStatus });
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setLoading(false);
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
                    onPress: () => {
                        deleteTrip(trip.id);
                        router.back();
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: `Trip #${trip.id}`,
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
                        disabled={trip.status === "in-progress" || loading}
                        loading={loading}
                        onPress={() => handleStatusUpdate("in-progress")}
                    />
                    <Button
                        title="Complete"
                        variant="outline"
                        size="small"
                        disabled={trip.status === "completed" || loading}
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
                        <Text style={styles.detailValue}>{trip.routeName}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Ship size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Vessel</Text>
                        <Text style={styles.detailValue}>{trip.vesselName}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>{trip.date}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Clock size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Departure Time</Text>
                        <Text style={styles.detailValue}>{trip.departureTime}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Clock size={20} color={colors.secondary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Arrival Time</Text>
                        <Text style={styles.detailValue}>{trip.arrivalTime}</Text>
                    </View>
                </View>
            </View>

            {/* Capacity Information */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Capacity Information</Text>

                <View style={styles.capacityStats}>
                    <View style={styles.statItem}>
                        <Users size={24} color={colors.primary} />
                        <Text style={styles.statValue}>{trip.bookings}</Text>
                        <Text style={styles.statLabel}>Bookings</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Ship size={24} color={colors.secondary} />
                        <Text style={styles.statValue}>{trip.capacity}</Text>
                        <Text style={styles.statLabel}>Capacity</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Users size={24} color={colors.success} />
                        <Text style={styles.statValue}>{trip.capacity - trip.bookings}</Text>
                        <Text style={styles.statLabel}>Available</Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>Occupancy</Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(trip.bookings / trip.capacity) * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {Math.round((trip.bookings / trip.capacity) * 100)}% Full
                    </Text>
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    errorText: {
        fontSize: 18,
        color: colors.textSecondary,
        marginBottom: 24,
        textAlign: "center",
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    dangerCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.danger,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    dangerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.danger,
        marginBottom: 8,
    },
    dangerDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    statusActions: {
        flexDirection: "row",
        gap: 12,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    detailContent: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: "500",
    },
    capacityStats: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 20,
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.primary,
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
    },
    progressContainer: {
        marginTop: 16,
    },
    progressLabel: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 8,
        fontWeight: "500",
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.border,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressFill: {
        height: "100%",
        backgroundColor: colors.primary,
    },
    progressText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
    },
}); 