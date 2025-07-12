import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { UserForm } from '@/components/admin/users';
import { UserFormData } from '@/types/userManagement';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function NewUserPage() {
    const { addUser } = useAdminStore();
    const { canCreateUsers } = useAdminPermissions();

    const handleSave = async (userData: UserFormData) => {
        try {
            addUser(userData);
            Alert.alert(
                'Success',
                'User created successfully!',
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
                error instanceof Error ? error.message : 'Failed to create user'
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
                        title: 'New User',
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                <UserForm
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