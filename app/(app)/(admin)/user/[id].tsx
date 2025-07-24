import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { UserDetails } from '@/components/admin/users';
import { UserProfile } from '@/types/userManagement';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import EmptyState from '@/components/admin/EmptyState';
import { AlertTriangle } from 'lucide-react-native';

export default function UserDetailsPage() {
    const { id } = useLocalSearchParams();
    const { users, getUser, updateUser, deleteUser } = useAdminStore();
    const { canViewUsers, canUpdateUsers, canDeleteUsers } = useAdminPermissions();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadUser = () => {
            try {
                setLoading(true);
                setError(null);

                if (!id || typeof id !== 'string') {
                    setError('Invalid user ID');
                    return;
                }

                // Ensure users array is available
                if (!users || !Array.isArray(users)) {
                    setError('Users data not available');
                    return;
                }

                const foundUser = getUser(id);
                if (!foundUser) {
                    setError('User not found');
                    return;
                }

                setUser(foundUser);
            } catch (err) {
                setError('Failed to load user details');
                console.error('Error loading user:', err);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [id, users, getUser]);

    const handleEdit = () => {
        if (!user) return;
        router.push(`../user/${user.id}/edit` as any);
    };

    const handleArchive = async () => {
        if (!user) return;

        try {
            await updateUser(user.id, { status: 'inactive' });
            Alert.alert(
                'Success',
                'User has been archived successfully',
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
                'Failed to archive user'
            );
        }
    };

    const handleViewActivity = () => {
        if (!user) return;
        // Navigate to activity page
        router.push(`../user/${user.id}/activity` as any);
    };

    const handleViewPermissions = () => {
        if (!user) return;
        // Navigate to permissions page
        router.push(`../user/${user.id}/permissions` as any);
    };

    const handleViewBookings = () => {
        if (!user) return;
        // Navigate to bookings page
        router.push(`../user/${user.id}/bookings` as any);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen
                    options={{
                        title: 'Loading...',
                        headerShown: true,
                    }}
                />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Error',
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.danger} />}
                    title="Error"
                    message={error}
                />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'User Not Found',
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.warning} />}
                    title="User Not Found"
                    message="The requested user could not be found."
                />
            </View>
        );
    }

    return (
        <RoleGuard allowedRoles={['admin']}>
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: user.name || 'User Details',
                        headerShown: true,
                    }}
                />

                <UserDetails
                    user={user}
                    onEdit={canUpdateUsers() ? handleEdit : undefined}
                    onArchive={canDeleteUsers() ? handleArchive : undefined}
                    onViewActivity={handleViewActivity}
                    onViewPermissions={handleViewPermissions}
                    onViewBookings={handleViewBookings}
                    showActions={canUpdateUsers() || canDeleteUsers()}
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
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 