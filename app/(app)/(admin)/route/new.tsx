import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { RouteForm } from '@/components/admin/operations';
import { RouteFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import { MapPin, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function NewRoutePage() {
    const { addRoute, loading } = useAdminStore();
    const { canManageRoutes } = useAdminPermissions();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async (routeData: RouteFormData) => {
        if (!canManageRoutes()) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to create routes.'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await addRoute(routeData as any);
            Alert.alert(
                'Success',
                'Route created successfully!',
                [
                    {
                        text: 'View Route',
                        onPress: () => {
                            // In a real app, you'd get the created route ID
                            router.replace('../operations');
                        },
                    },
                    {
                        text: 'Create Another',
                        onPress: () => {
                            // Stay on the page to create another route
                        },
                        style: 'cancel',
                    },
                ]
            );
        } catch (error) {
            console.error('Error creating route:', error);
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'Failed to create route. Please check your connection and try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Discard Changes',
            'Are you sure you want to discard your changes?',
            [
                { text: 'Keep Editing', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => router.back()
                },
            ]
        );
    };

    if (!canManageRoutes()) {
        return (
            <RoleGuard allowedRoles={['admin']}>
                <View style={[styles.container, styles.centerContent]}>
                    <Stack.Screen
                        options={{
                            title: 'Access Denied',
                            headerShown: true,
                            presentation: 'card',
                        }}
                    />
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.errorText}>
                        You don't have permission to create routes.
                    </Text>
                </View>
            </RoleGuard>
        );
    }

    if (loading.routes) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Stack.Screen
                    options={{
                        title: 'Loading...',
                        headerShown: true,
                        presentation: 'card',
                    }}
                />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                    Loading route data...
                </Text>
            </View>
        );
    }

    return (
        <RoleGuard allowedRoles={['admin']}>
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'New Route',
                        headerShown: true,
                        presentation: 'card',
                        headerLeft: () => (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleCancel}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                        headerTitleStyle: {
                            fontSize: 18,
                            fontWeight: '600',
                            color: colors.text,
                        },
                    }}
                />

                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <MapPin size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Create New Route</Text>
                        <Text style={styles.headerSubtitle}>
                            Add a new ferry route to the system
                        </Text>
                    </View>
                </View>

                <RouteForm
                    onSave={handleSave}
                    onCancel={handleCancel}
                />

                {/* Loading Overlay */}
                {isSubmitting && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingContent}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingOverlayText}>
                                Creating route...
                            </Text>
                        </View>
                    </View>
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
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 20,
        margin: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 250,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        gap: 12,
        minWidth: 200,
    },
    loadingOverlayText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
}); 