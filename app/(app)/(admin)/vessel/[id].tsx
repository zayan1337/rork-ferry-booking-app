import React, { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminVessels } from "@/hooks/admin";
import {
    Ship,
    MapPin,
    Users,
    Edit3,
    Trash2,
    Activity,
    Anchor,
    Navigation,
    Calendar,
    CheckCircle
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import { AdminVessel } from "@/types/admin";

export default function VesselDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        getVesselDetails,
        updateVessel: updateVesselStatus,
        deleteVessel,
        loading,
        error
    } = useAdminVessels();

    const [vessel, setVessel] = useState<AdminVessel | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Load vessel details
    useEffect(() => {
        if (id) {
            loadVesselDetails();
        }
    }, [id]);

    const loadVesselDetails = async () => {
        try {
            const vesselData = await getVesselDetails(id!);
            setVessel(vesselData);
        } catch (err) {
            console.error('Error loading vessel details:', err);
        }
    };

    if (loading && !vessel) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading vessel details...</Text>
            </View>
        );
    }

    if (error || !vessel) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {error || "Vessel not found"}
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: boolean) => {
        setActionLoading(true);
        try {
            const success = await updateVesselStatus(vessel.id, { is_active: newStatus });
            if (success) {
                setVessel(prev => prev ? { ...prev, is_active: newStatus } : null);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update vessel status');
        } finally {
            setActionLoading(false);
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
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const success = await deleteVessel(vessel.id);
                            if (success) {
                                router.back();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete vessel');
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
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        } catch {
            return dateString;
        }
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
                    <StatusBadge status={vessel.is_active ? "active" : "inactive"} />
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Activate"
                        variant="primary"
                        size="small"
                        disabled={vessel.is_active || actionLoading}
                        loading={actionLoading}
                        onPress={() => handleStatusUpdate(true)}
                    />
                    <Button
                        title="Deactivate"
                        variant="outline"
                        size="small"
                        disabled={!vessel.is_active || actionLoading}
                        onPress={() => handleStatusUpdate(false)}
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
                        <Text style={styles.detailLabel}>Seating Capacity</Text>
                        <Text style={styles.detailValue}>{vessel.seating_capacity} passengers</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Activity size={20} color={vessel.is_active ? colors.success : colors.textSecondary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <StatusBadge status={vessel.is_active ? "active" : "inactive"} />
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Created At</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(vessel.created_at)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Current Statistics */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Current Statistics</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Ship size={24} color={colors.primary} />
                        <Text style={styles.statValue}>{vessel.current_trips_count || 0}</Text>
                        <Text style={styles.statLabel}>Active Trips</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Users size={24} color={colors.secondary} />
                        <Text style={styles.statValue}>{vessel.total_bookings || 0}</Text>
                        <Text style={styles.statLabel}>Total Bookings</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Activity size={24} color={colors.success} />
                        <Text style={styles.statValue}>{vessel.seating_capacity}</Text>
                        <Text style={styles.statLabel}>Max Capacity</Text>
                    </View>

                    <View style={styles.statItem}>
                        <CheckCircle size={24} color={vessel.is_active ? colors.success : colors.textSecondary} />
                        <Text style={styles.statValue}>{vessel.is_active ? "Active" : "Inactive"}</Text>
                        <Text style={styles.statLabel}>Current Status</Text>
                    </View>
                </View>
            </View>

            {/* Location Information */}
            {vessel.current_location && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Current Location</Text>

                    <View style={styles.detailRow}>
                        <MapPin size={20} color={colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Coordinates</Text>
                            <Text style={styles.detailValue}>
                                {vessel.current_location.latitude.toFixed(6)}, {vessel.current_location.longitude.toFixed(6)}
                            </Text>
                        </View>
                    </View>

                    <Button
                        title="View on Map"
                        variant="outline"
                        icon={<Navigation size={18} color={colors.primary} />}
                        onPress={() => {
                            // Open map view or external map app
                            const url = `https://maps.google.com/?q=${vessel.current_location!.latitude},${vessel.current_location!.longitude}`;
                            console.log('Opening map:', url);
                        }}
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
                        onPress={() => {
                            // Navigate to vessel tracking page
                            console.log('Track vessel:', vessel.id);
                        }}
                        fullWidth
                    />

                    <Button
                        title={vessel.is_active ? "Schedule Maintenance" : "Activate Vessel"}
                        variant="outline"
                        icon={<Anchor size={18} color={colors.primary} />}
                        onPress={() => handleStatusUpdate(!vessel.is_active)}
                        loading={actionLoading}
                        fullWidth
                    />

                    <Button
                        title="View Schedule"
                        variant="outline"
                        icon={<Calendar size={18} color={colors.primary} />}
                        onPress={() => {
                            // Navigate to vessel schedule
                            router.push(`/(admin)/schedule?vessel_id=${vessel.id}` as any);
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
                    title="Delete Vessel"
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        width: '48%',
        marginBottom: 16,
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