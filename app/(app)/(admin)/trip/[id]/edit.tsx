import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import {
  Stack,
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripForm } from '@/components/admin/operations';
import { AdminManagement } from '@/types';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { ArrowLeft } from 'lucide-react-native';

type TripFormData = AdminManagement.TripFormData;

export default function EditTripPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageTrips } = useAdminPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when page is focused
  useFocusEffect(
    useCallback(() => {
      setIsSubmitting(false);
    }, [])
  );

  // Handle missing trip ID
  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Trip ID not found', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [id]);

  const handleSave = async (tripData: TripFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // The TripForm component now handles validation and updating
      Alert.alert('Success', 'Trip updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Failed to update trip. Please try again.');
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
            You don't have permission to edit trips.
          </Text>
        </View>
      </View>
    );
  }

  if (!id) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Trip Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip ID not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Trip',
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

      <TripForm tripId={id} onSave={handleSave} onCancel={handleCancel} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '500',
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
