import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useContentManagement } from '@/hooks/useContentManagement';
import {
  ArrowLeft,
  Percent,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import PromotionForm, {
  PromotionFormData,
} from '@/components/admin/operations/PromotionForm';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import Button from '@/components/admin/Button';

export default function EditPromotionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageContent } = useAdminPermissions();
  const { promotions, updatePromotion, refreshAll } = useContentManagement();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const promotion = promotions.find(p => p.id === id);

  // Load promotion data
  useEffect(() => {
    const loadData = async () => {
      if (!promotion && promotions.length === 0) {
        try {
          await refreshAll();
        } catch (err) {
          setError('Failed to load promotion data');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadData();
  }, [promotion, promotions.length, refreshAll]);

  const handleSubmit = async (formData: PromotionFormData) => {
    if (!promotion) return;

    setIsUpdating(true);
    try {
      const promotionData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        // Ensure proper date formatting - only add time if not already present
        start_date: formData.start_date.includes('T')
          ? formData.start_date
          : `${formData.start_date}T00:00:00Z`,
        end_date: formData.end_date.includes('T')
          ? formData.end_date
          : `${formData.end_date}T23:59:59Z`,
      };

      await updatePromotion(promotion.id, promotionData);

      Alert.alert('Success', 'Promotion updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update promotion';
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await refreshAll();
    } catch (err) {
      setError('Failed to load promotion data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canManageContent()) {
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
            <Percent size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to edit promotions.
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
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading promotion...</Text>
        </View>
      </View>
    );
  }

  if (error || !promotion) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Error',
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
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>
            {error || 'Promotion Not Found'}
          </Text>
          <Text style={styles.errorText}>
            {error
              ? 'There was a problem loading the promotion data.'
              : "The promotion you're looking for doesn't exist or has been deleted."}
          </Text>
          <View style={styles.errorButtons}>
            <Button
              title='Try Again'
              variant='primary'
              onPress={handleRetry}
              icon={<RefreshCw size={20} color={colors.white} />}
            />
            <Button
              title='Go Back'
              variant='outline'
              onPress={() => router.back()}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Promotion',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PromotionForm
          promotion={promotion}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
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
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 300,
  },
});
