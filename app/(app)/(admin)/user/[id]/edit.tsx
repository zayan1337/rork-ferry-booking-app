import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { UserForm } from '@/components/admin/users';
import { UserProfile, UserFormData } from '@/types/userManagement';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import EmptyState from '@/components/admin/EmptyState';
import { AlertTriangle } from 'lucide-react-native';

export default function EditUserPage() {
  const { id } = useLocalSearchParams();
  const { users, getUser, updateUser } = useAdminStore();
  const { canUpdateUsers } = useAdminPermissions();

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

  const handleSave = async (userData: UserFormData) => {
    if (!user) return;

    try {
      await updateUser(user.id, userData);
      Alert.alert('Success', 'User updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update user'
      );
    }
  };

  const handleCancel = () => {
    router.back();
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
        <ActivityIndicator size='large' color={colors.primary} />
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
          title='Error'
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
          title='User Not Found'
          message='The requested user could not be found.'
        />
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: `Edit ${user.name}`,
            headerShown: true,
            presentation: 'card',
          }}
        />

        <UserForm
          userId={user.id}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
