import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Promotion, PromotionFormData } from '@/types/content';

// Components
import PromotionForm from '@/components/admin/operations/PromotionForm';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import EmptyState from '@/components/admin/EmptyState';
import { AlertTriangle, Percent, ArrowLeft } from 'lucide-react-native';

export default function EditPromotionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageContent } = useAdminPermissions();
    const {
        currentPromotion,
        loading,
        updatePromotion,
        fetchPromotionById,
        resetCurrentPromotion,
    } = useContentManagement();

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (canManageContent() && id) {
            fetchPromotionById(id);
        }
    }, [id]); // Removed function dependencies

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetCurrentPromotion();
        };
    }, []); // Empty dependency array for cleanup only

    // Use currentPromotion from the store
    const promotion = currentPromotion;

    const handleSubmit = async (data: PromotionFormData) => {
        if (!promotion) return;

        setIsLoading(true);
        try {
            await updatePromotion(promotion.id, data);
            Alert.alert(
                'Success',
                'Promotion updated successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            console.error('Error updating promotion:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    // Permission check
    if (!canManageContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Edit Promotion',
                        headerShown: true,
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <EmptyState
                        icon={<AlertTriangle size={48} color={colors.warning} />}
                        title="Access Denied"
                        message="You don't have permission to edit promotions."
                    />
                </View>
            </View>
        );
    }

    // Loading state
    if (loading.promotions) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Edit Promotion',
                        headerShown: true,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                </View>
            </View>
        );
    }

    // Promotion not found
    if (!promotion) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Promotion Not Found',
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<Percent size={48} color={colors.textSecondary} />}
                    title="Promotion Not Found"
                    message="The promotion you're trying to edit doesn't exist or has been removed."
                    action={{
                        label: 'Go Back',
                        onPress: () => router.back(),
                        icon: <ArrowLeft size={16} color={colors.white} />
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `Edit ${promotion.name}`,
                    headerShown: true,
                }}
            />
            <PromotionForm
                promotion={promotion}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isLoading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}); 