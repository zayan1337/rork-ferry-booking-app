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
            // Map UserFormData to UserProfile format
            const userProfile: Omit<UserProfile, 'id' | 'created_at'> = {
                name: userData.name,
                email: userData.email,
                mobile_number: userData.mobile_number,
                role: userData.role,
                status: userData.status,
                email_verified: false,
                mobile_verified: false,
                profile_picture: userData.profile_picture,
                date_of_birth: userData.date_of_birth,
                gender: userData.gender,
                address: userData.address,
                emergency_contact: userData.emergency_contact,
                preferences: userData.preferences,
                updated_at: new Date().toISOString(),
                last_login: undefined,
                total_bookings: 0,
                total_spent: 0,
                total_trips: 0,
                average_rating: 0,
                wallet_balance: 0,
                credit_score: 0,
                loyalty_points: 0
            };

            addUser(userProfile);
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