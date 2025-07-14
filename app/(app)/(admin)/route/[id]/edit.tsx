import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { RouteForm } from '@/components/admin/operations';
import { RouteFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function EditRoutePage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { routes, updateRoute, loading } = useAdminStore();
    const { canUpdateRoutes } = useAdminPermissions();

    // Find the current route data
    const currentRoute = routes?.find(r => r.id === id);

    const handleSave = async (routeData: RouteFormData) => {
        if (!id) {
            Alert.alert('Error', 'Route ID is missing');
            return;
        }

        try {
            await updateRoute(id, routeData as any);
            Alert.alert(
                'Success',
                'Route updated successfully!',
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
                error instanceof Error ? error.message : 'Failed to update route'
            );
        }
    };

    const handleCancel = () => {
        router.back();
    };

    if (loading.routes) {
        return (
            <View style={[styles.container, styles.loading]}>
                <Stack.Screen
                    options={{
                        title: 'Loading...',
                        headerShown: true,
                        presentation: 'card',
                    }}
                />
            </View>
        );
    }

    if (!currentRoute) {
        Alert.alert('Error', 'Route not found', [
            { text: 'OK', onPress: () => router.back() }
        ]);
        return null;
    }

    return (
        <RoleGuard
            allowedRoles={['admin']}
        >
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: `Edit ${currentRoute.name}`,
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                <RouteForm
                    routeId={id}
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
    loading: {
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 