import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
// UPDATED: Use new vessel management hook and types
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { AdminManagement } from '@/types';

// Components
import VesselForm from '@/components/admin/operations/VesselForm';
import Button from '@/components/admin/Button';
import { useAlertContext } from '@/components/AlertProvider';

type VesselFormData = AdminManagement.VesselFormData;

export default function NewVesselScreen() {
  const { canManageVessels } = useAdminPermissions();
  const { create, loading } = useVesselManagement();
  const { showSuccess, showError } = useAlertContext();

  const handleSuccess = async (vesselData: VesselFormData): Promise<void> => {
    try {
      // Create the vessel
      await create(vesselData);

      showSuccess(
        'Success',
        'Vessel created successfully! Seat layout has been configured.',
        () => router.back()
      );
    } catch (error) {
      showError('Error', 'Failed to create vessel. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!canManageVessels()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to create new vessels.
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
          title: 'Create Vessel',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <VesselForm
          onSave={handleSuccess}
          onCancel={handleCancel}
          loading={loading.create}
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
});
