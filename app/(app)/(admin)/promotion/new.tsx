import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { PromotionFormData } from '@/types/content';

// Components
import PromotionForm from '@/components/admin/operations/PromotionForm';
import EmptyState from '@/components/admin/EmptyState';
import { AlertTriangle } from 'lucide-react-native';

export default function NewPromotionScreen() {
    const { canManageContent } = useAdminPermissions();
    const { createPromotion } = useContentManagement();

    const handleSubmit = async (data: PromotionFormData) => {
        try {
            await createPromotion(data);
            Alert.alert(
                'Success',
                'Promotion created successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            console.error('Error creating promotion:', error);
            throw error;
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
                        title: 'Create Promotion',
                        headerShown: true,
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <EmptyState
                        icon={<AlertTriangle size={48} color={colors.warning} />}
                        title="Access Denied"
                        message="You don't have permission to create promotions."
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Create Promotion',
                    headerShown: true,
                }}
            />
            <PromotionForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
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
}); 