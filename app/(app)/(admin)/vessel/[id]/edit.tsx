import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
// UPDATED: Use vessel store directly for fetchVesselDetails
import { useVesselStore } from '@/store/admin/vesselStore';
import { AdminManagement } from '@/types';

// Components
import VesselForm from '@/components/admin/operations/VesselForm';
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

type VesselFormData = AdminManagement.VesselFormData;
type Vessel = AdminManagement.Vessel;
type VesselWithDetails = AdminManagement.VesselWithDetails;

export default function EditVesselScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageVessels } = useAdminPermissions();

  // UPDATED: Use vessel store directly to access fetchVesselDetails
  const { fetchVesselDetails, update, loading, error } = useVesselStore();

  const [vesselData, setVesselData] = useState<VesselWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isTablet = false; // You can implement tablet detection logic here

  useEffect(() => {
    loadVesselData();
  }, [id]);

  const loadVesselData = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setSaveError(null);

      // Use fetchVesselDetails to get complete vessel details including seat layout
      const vessel = await fetchVesselDetails(id);
      if (vessel) {
        setVesselData(vessel);
      } else {
        Alert.alert('Error', 'Vessel not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading vessel:', error);
      Alert.alert('Error', 'Failed to load vessel details. Please try again.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: VesselFormData) => {
    if (!id) return;

    try {
      setSaveError(null);
      await update(id, formData);

      // Show success message with options
      Alert.alert(
        'Success',
        'Vessel updated successfully! Seat layout has been updated accordingly.',
        [
          {
            text: 'View Vessel',
            onPress: () => router.push(`/vessel/${id}`),
          },
          {
            text: 'Edit More',
            onPress: () => {
              // Reload the data to show updated information
              loadVesselData();
            },
          },
          {
            text: 'Back to List',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating vessel:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update vessel';
      setSaveError(errorMessage);

      // Show error alert
      Alert.alert('Update Failed', `Failed to update vessel: ${errorMessage}`, [
        {
          text: 'Try Again',
          onPress: () => setSaveError(null),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    }
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
      ]
    );
  };

  if (!canManageVessels()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
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
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to edit vessels.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Loading...',
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
        <View style={styles.loadingContainer}>
          <LoadingSpinner size='large' />
          <Text style={styles.loadingText}>Loading vessel details...</Text>
          <Text style={styles.loadingSubtext}>
            Including seat layout configuration
          </Text>
        </View>
      </View>
    );
  }

  if (!vesselData) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Vessel Not Found',
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
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Vessel Not Found</Text>
          <Text style={styles.errorText}>
            The vessel you're looking for doesn't exist or has been removed.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Vessel',
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Display */}
        {saveError && (
          <View style={styles.errorBanner}>
            <View style={styles.errorBannerIcon}>
              <AlertCircle size={20} color={colors.error} />
            </View>
            <Text style={styles.errorBannerText}>{saveError}</Text>
            <TouchableOpacity
              onPress={() => setSaveError(null)}
              style={styles.errorBannerClose}
            >
              <Text style={styles.errorBannerCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        <VesselForm
          initialData={vesselData}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={loading.update}
        />
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  noAccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 12,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.errorLight,
  },
  errorBannerIcon: {
    marginRight: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  errorBannerClose: {
    padding: 5,
  },
  errorBannerCloseText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
