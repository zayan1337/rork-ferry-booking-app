import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Text,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useContentManagement } from '@/hooks/useContentManagement';
import { ArrowLeft, Percent } from 'lucide-react-native';
import PromotionForm, {
  PromotionFormData,
} from '@/components/admin/operations/PromotionForm';
import Button from '@/components/admin/Button';

export default function NewPromotionScreen() {
  const { canManageContent } = useAdminPermissions();
  const { createPromotion } = useContentManagement();
  const [isCreating, setIsCreating] = useState(false);

  const handleSuccess = (formData: PromotionFormData) => {
    Alert.alert('Success', 'Promotion created successfully!', [
      {
        text: 'OK',
        onPress: () => router.replace('./promotions' as any),
      },
    ]);
  };

  const handleError = (error: string) => {
    Alert.alert('Error', error);
  };

  const handleSubmit = async (formData: PromotionFormData) => {
    setIsCreating(true);
    try {
      const promotionData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        // Ensure proper date formatting - only add time if not already present
        start_date: formData.start_date.includes('T')
          ? formData.start_date
          : formData.start_date + 'T00:00:00Z',
        end_date: formData.end_date.includes('T')
          ? formData.end_date
          : formData.end_date + 'T23:59:59Z',
      };

      await createPromotion(promotionData);
      handleSuccess(formData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create promotion';
      handleError(errorMessage);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  if (!canManageContent()) {
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
            <Percent size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to create promotions.
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
          title: 'Create Promotion',
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
        <PromotionForm onSubmit={handleSubmit} isLoading={isCreating} />
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
    padding: 20,
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
    padding: 20,
    paddingBottom: 40,
  },
});
