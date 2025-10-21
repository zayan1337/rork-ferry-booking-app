import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
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
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

type TripFormData = AdminManagement.TripFormData;

export default function NewTripPage() {
  const { canManageTrips } = useAdminPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validatedInitialData, setValidatedInitialData] = useState<{
    route_id?: string;
    vessel_id?: string;
  }>({});
  const params = useLocalSearchParams();

  // Route and vessel selection:
  // - TripForm loads all routes/vessels from database
  // - Supports both simple (2-stop) and multi-stop routes
  // - Query params (route_id, vessel_id) are validated before pre-filling
  // - If no params or invalid, user selects from database dropdown
  
  // Validate query parameters against database
  useEffect(() => {
    validateInitialData();
  }, [params.route_id, params.vessel_id]);

  const validateInitialData = async () => {
    const data: { route_id?: string; vessel_id?: string } = {};

    // Validate route_id if provided
    if (params.route_id && typeof params.route_id === 'string') {
      try {
        const { data: route, error } = await supabase
          .from('routes')
          .select('id, name, is_active')
          .eq('id', params.route_id)
          .eq('is_active', true)
          .single();

        if (!error && route) {
          data.route_id = params.route_id;
          console.log('Pre-selected route:', route.name);
        } else {
          console.warn('Route not found or inactive:', params.route_id);
        }
      } catch (error) {
        console.error('Error validating route:', error);
      }
    }

    // Validate vessel_id if provided
    if (params.vessel_id && typeof params.vessel_id === 'string') {
      try {
        const { data: vessel, error } = await supabase
          .from('vessels')
          .select('id, name, is_active')
          .eq('id', params.vessel_id)
          .eq('is_active', true)
          .single();

        if (!error && vessel) {
          data.vessel_id = params.vessel_id;
          console.log('Pre-selected vessel:', vessel.name);
        } else {
          console.warn('Vessel not found or inactive:', params.vessel_id);
        }
      } catch (error) {
        console.error('Error validating vessel:', error);
      }
    }

    setValidatedInitialData(data);
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
      // TripForm component handles:
      // - Loading all active routes from database (including multi-stop routes)
      // - Loading all active vessels from database
      // - Validation and trip creation
      // - Multi-stop route segment information
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
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <TripForm
        onSave={handleSave}
        onCancel={handleCancel}
        initialData={validatedInitialData}
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
