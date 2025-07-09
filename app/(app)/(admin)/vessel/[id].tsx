import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import {
    Ship,
    MapPin,
    Users,
    Edit3,
    Trash2,
    Activity,
    Anchor,
    Navigation
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";

export default function VesselDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { vessels, updateVessel, deleteVessel } = useAdminStore();
    const [loading, setLoading] = useState(false);

    const vessel = vessels.find(v => v.id === id);

    if (!vessel) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Vessel not found</Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: typeof vessel.status) => {
        setLoading(true);
        try {
            updateVessel(vessel.id, { status: newStatus });
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        router.push(`../vessel/${vessel.id}/edit` as any);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Vessel",
            "Are you sure you want to delete this vessel? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteVessel(vessel.id);
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
                    title: vessel.name,
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

            {/* Vessel Status Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Vessel Status</Text>
                    <StatusBadge status={vessel.status} />
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Activate"
                        variant="primary"
                        size="small"
                        disabled={vessel.status === "active" || loading}
                        loading={loading}
                        onPress={() => handleStatusUpdate("active")}
                    />
                    <Button
                        title="Maintenance"
                        variant="outline"
                        size="small"
                        disabled={vessel.status === "maintenance" || loading}
                        onPress={() => handleStatusUpdate("maintenance")}
                    />
                </View>
            </View>

            {/* Vessel Information Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Vessel Information</Text>

                <View style={styles.detailRow}>
                    <Ship size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Vessel Name</Text>
                        <Text style={styles.detailValue}>{vessel.name}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Users size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Capacity</Text>
                        <Text style={styles.detailValue}>{vessel.capacity} passengers</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Activity size={20} color={vessel.status === "active" ? colors.success : colors.warning} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <StatusBadge status={vessel.status} />
                    </View>
                </View>
            </View>

            {/* Location Information */}
            {vessel.currentLocation && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Current Location</Text>

                    <View style={styles.detailRow}>
                        <MapPin size={20} color={colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Coordinates</Text>
                            <Text style={styles.detailValue}>
                                {vessel.currentLocation.latitude.toFixed(6)}, {vessel.currentLocation.longitude.toFixed(6)}
                            </Text>
                        </View>
                    </View>

                    <Button
                        title="View on Map"
                        variant="outline"
                        icon={<Navigation size={18} color={colors.primary} />}
                        onPress={() => {/* Open map view */ }}
                        fullWidth
                    />
                </View>
            )}

            {/* Quick Actions */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>

                <View style={styles.actionGrid}>
                    <Button
                        title="Track Vessel"
                        variant="primary"
                        icon={<MapPin size={18} color="#FFFFFF" />}
                        onPress={() => {/* Open tracking */ }}
                        fullWidth
                    />

                    <Button
                        title="Schedule Maintenance"
                        variant="outline"
                        icon={<Anchor size={18} color={colors.primary} />}
                        onPress={() => handleStatusUpdate("maintenance")}
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
                    title="Delete Vessel"
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
    actionGrid: {
        gap: 12,
    },
}); 