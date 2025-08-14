import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripForm } from '@/components/admin/operations';
import { AdminManagement } from '@/types';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import { ArrowLeft } from 'lucide-react-native';

type TripFormData = AdminManagement.TripFormData;

export default function NewTripPage() {
  const { canManageTrips } = useAdminPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const params = useLocalSearchParams();

  // Extract pre-fill data from query parameters
  const initialData = {
    route_id: (params.route_id as string) || '',
    vessel_id: (params.vessel_id as string) || '',
  };

  // Reset state when page is focused
  useFocusEffect(
    useCallback(() => {
      setIsSubmitting(false);
    }, [])
  );

  const handleSave = async (tripData: TripFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // The TripForm component now handles validation and creation
      Alert.alert('Success', 'Trip created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!canManageTrips()) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Access Denied' }} />
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedText}>
            You don't have permission to create trips.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'New Trip',
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <TripForm
        onSave={handleSave}
        onCancel={handleCancel}
        initialData={initialData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
