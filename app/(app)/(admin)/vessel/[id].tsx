import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { VesselDetails, VesselForm } from '@/components/admin/operations';
import { OperationsVessel } from '@/types/database';
import { Vessel, VesselFormData } from '@/types/operations';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

// Function to convert OperationsVessel to Vessel type expected by components
const mapOperationsVesselToVessel = (operationsVessel: OperationsVessel): Vessel => {
    return {
        id: operationsVessel.id,
        name: operationsVessel.name,
        registration_number: `REG-${operationsVessel.id.slice(-6).toUpperCase()}`, // Generate a registration number
        capacity: operationsVessel.seating_capacity,
        seating_capacity: operationsVessel.seating_capacity,
        crew_capacity: Math.ceil(operationsVessel.seating_capacity / 20), // Estimate crew capacity
        status: operationsVessel.status,
        vessel_type: "ferry" as const, // Default type
        created_at: operationsVessel.created_at,
        updated_at: operationsVessel.created_at, // Use created_at as fallback
        // Optional stats from database
        total_trips_30d: operationsVessel.total_trips_30d,
        capacity_utilization_30d: operationsVessel.capacity_utilization_30d,
        total_revenue_30d: operationsVessel.total_revenue_30d,
    };
};

export default function VesselDetailsPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchVessel, updateVesselData, removeVessel } = useOperationsStore();
    const { canViewVessels, canManageVessels } = useAdminPermissions();

    const [vessel, setVessel] = useState<Vessel | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        loadVessel();
    }, [id]);

    const loadVessel = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const vesselData = await fetchVessel(id);
            if (vesselData) {
                setVessel(mapOperationsVesselToVessel(vesselData));
            }
        } catch (error) {
            Alert.alert(
                'Error',
                'Failed to load vessel details'
            );
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleSave = async (vesselData: VesselFormData) => {
        if (!id) return;

        try {
            const success = await updateVesselData(id, {
                name: vesselData.name,
                seating_capacity: vesselData.seating_capacity,
                is_active: vesselData.status === 'active',
            });

            if (success) {
                await loadVessel(); // Refresh the vessel data
                setEditMode(false);
                Alert.alert('Success', 'Vessel updated successfully!');
            } else {
                throw new Error('Failed to update vessel');
            }
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to update vessel'
            );
        }
    };

    const handleCancelEdit = () => {
        setEditMode(false);
    };

    const handleArchive = async () => {
        if (!id || !vessel) return;

        Alert.alert(
            'Archive Vessel',
            `Are you sure you want to archive "${vessel.name}"? This will remove it from active service.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await removeVessel(id);
                            if (success) {
                                Alert.alert(
                                    'Success',
                                    'Vessel archived successfully!',
                                    [
                                        {
                                            text: 'OK',
                                            onPress: () => router.back(),
                                        },
                                    ]
                                );
                            } else {
                                throw new Error('Failed to archive vessel');
                            }
                        } catch (error) {
                            Alert.alert(
                                'Error',
                                error instanceof Error ? error.message : 'Failed to archive vessel'
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleViewTrips = () => {
        if (!id) return;
        // Navigate to trips filtered by this vessel
        router.push(`../schedule?vesselId=${id}` as any);
    };

    const handleViewMaintenance = () => {
        if (!id) return;
        // Navigate to maintenance records for this vessel
        router.push(`../maintenance?vesselId=${id}` as any);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen
                    options={{
                        title: 'Vessel Details',
                        headerShown: true,
                    }}
                />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!vessel) {
        return (
            <View style={styles.errorContainer}>
                <Stack.Screen
                    options={{
                        title: 'Vessel Not Found',
                        headerShown: true,
                    }}
                />
            </View>
        );
    }

    return (
        <RoleGuard
            allowedRoles={['admin', 'captain']}
        >
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: editMode ? 'Edit Vessel' : vessel.name,
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                {editMode ? (
                    <VesselForm
                        vesselId={id}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                    />
                ) : (
                    <VesselDetails
                        vessel={vessel}
                        onEdit={canManageVessels() ? handleEdit : undefined}
                        onArchive={canManageVessels() ? handleArchive : undefined}
                        onViewTrips={handleViewTrips}
                        onViewMaintenance={handleViewMaintenance}
                        showActions={canManageVessels()}
                    />
                )}
            </View>
        </RoleGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
}); 