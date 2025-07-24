import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { VesselForm } from '@/components/admin/operations';
import { VesselFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function NewVesselPage() {
    const { createVessel } = useAdminStore();
    const { canManageVessels } = useAdminPermissions();

    const handleSave = async (vesselData: VesselFormData) => {
        try {
            await createVessel(vesselData);
            Alert.alert(
                'Success',
                'Vessel created successfully!',
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
                error instanceof Error ? error.message : 'Failed to create vessel'
            );
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <RoleGuard
            allowedRoles={['admin', 'captain']}
        >
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'New Vessel',
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                <VesselForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            </View>
        </RoleGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
}); 