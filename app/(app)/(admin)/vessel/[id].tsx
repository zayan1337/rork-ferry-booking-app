import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { VesselDetails, VesselForm } from '@/components/admin/operations';
import { Vessel, VesselFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function VesselDetailsPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { getVessel, updateVessel, deleteVessel } = useAdminStore();
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
            const vesselData = await getVessel(id);
            setVessel(vesselData);
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
            await updateVessel(id, vesselData);
            await loadVessel(); // Refresh the vessel data
            setEditMode(false);
            Alert.alert('Success', 'Vessel updated successfully!');
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
                            await deleteVessel(id);
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