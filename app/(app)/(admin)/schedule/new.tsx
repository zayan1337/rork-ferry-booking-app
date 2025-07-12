import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripForm } from '@/components/admin/operations';
import { TripFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function NewTripPage() {
    const { createTrip } = useAdminStore();
    const { canManageTrips } = useAdminPermissions();

    const handleSave = async (tripData: TripFormData) => {
        try {
            await createTrip(tripData);
            Alert.alert(
                'Success',
                'Trip scheduled successfully!',
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
                error instanceof Error ? error.message : 'Failed to schedule trip'
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
                        title: 'Schedule New Trip',
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                <TripForm
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