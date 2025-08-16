import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { AdminBooking, AdminBookingFormData } from '@/types/admin/management';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { BookingForm } from '@/components/admin/bookings';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import EmptyState from '@/components/admin/EmptyState';
import { AlertTriangle } from 'lucide-react-native';

export default function EditBookingPage() {
  const { id } = useLocalSearchParams();
  const {
    fetchBooking,
    updateBooking,
    loading: storeLoading,
    error: storeError,
  } = useAdminBookingStore();
  const { canUpdateBookings } = useAdminPermissions();

  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id || typeof id !== 'string') {
          setError('Invalid booking ID');
          return;
        }

        const fetchedBooking = await fetchBooking(id);

        if (fetchedBooking) {
          setBooking(fetchedBooking);
        } else {
          setError(`Booking with ID "${id}" not found`);
        }
      } catch (err) {
        setError('Failed to load booking details');
        console.error('Error loading booking:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id, fetchBooking]);

  const handleSave = async (formData: AdminBookingFormData) => {
    if (!booking) return;

    setSaving(true);
    try {
      // Transform form data to match the booking update structure
      const updateData = {
        user_id: formData.user_id,
        trip_id: formData.trip_id,
        is_round_trip: formData.is_round_trip,
        total_fare: formData.total_fare,
        // Add other fields as needed
      };

      await updateBooking(booking.id, updateData);

      Alert.alert('Success', 'Booking updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!canUpdateBookings()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to edit bookings.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size='large' />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState
          icon={<AlertTriangle size={48} color={colors.textSecondary} />}
          title='Booking Not Found'
          message={error || 'The requested booking could not be found'}
        />
      </View>
    );
  }

  // Transform booking data to form data
  const initialFormData: Partial<AdminBookingFormData> = {
    user_id: booking.user_id,
    trip_id: booking.trip_id,
    is_round_trip: booking.is_round_trip,
    total_fare: booking.total_fare,
    // Add passenger data if available
    passengers: [], // This would need to be populated from passenger data
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Edit Booking #${booking.booking_number}`,
        }}
      />

      <BookingForm
        initialData={initialFormData}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={saving}
        title='Edit Booking'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
