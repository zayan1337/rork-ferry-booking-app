import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { RouteForm } from '@/components/admin/operations';
import { RouteFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function NewRoutePage() {
    const { addRoute } = useAdminStore();
    const { canManageRoutes } = useAdminPermissions();

    const handleSave = async (routeData: RouteFormData) => {
        try {
            await addRoute(routeData as any);
            Alert.alert(
                'Success',
                'Route created successfully!',
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
                error instanceof Error ? error.message : 'Failed to create route'
            );
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <RoleGuard
            allowedRoles={['admin']}
        >
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'New Route',
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                <RouteForm
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