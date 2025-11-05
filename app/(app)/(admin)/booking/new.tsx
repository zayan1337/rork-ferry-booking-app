import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { AdminBookingFormData } from '@/types/admin/management';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { BookingForm } from '@/components/admin/bookings';
import { ArrowLeft } from 'lucide-react-native';
import { useAlertContext } from '@/components/AlertProvider';

export default function NewBookingPage() {
  const { createBooking } = useAdminBookingStore();
  const { canCreateBookings } = useAdminPermissions();
  const { showSuccess, showError } = useAlertContext();
  const [saving, setSaving] = useState(false);

  const handleSave = async (formData: AdminBookingFormData) => {
    setSaving(true);
    try {
      await createBooking(formData);
      showSuccess('Success', 'Booking created successfully!', () =>
        router.back()
      );
    } catch (error) {
      showError('Error', 'Failed to create booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!canCreateBookings()) {
    return (
      <View style={styles.noPermissionContainer}>
        <Text style={styles.noPermissionText}>
          You don't have permission to create bookings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Booking',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <BookingForm
        onSave={handleSave}
        onCancel={handleCancel}
        loading={saving}
        title='Create New Booking'
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
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
});
