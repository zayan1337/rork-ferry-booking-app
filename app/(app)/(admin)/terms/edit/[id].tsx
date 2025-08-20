import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react-native';

// Components
import TermsForm from '@/components/admin/operations/TermsForm';
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

export default function EditTermsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageContent } = useAdminPermissions();
  const {
    currentTerms,
    loading,
    fetchTermsById,
    resetCurrentTerms,
    error,
    clearError,
  } = useContentManagement();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const loadTermsData = async () => {
    if (!id) {
      setLocalError('Invalid terms ID');
      return;
    }

    try {
      setLocalError(null);
      await fetchTermsById(id);
    } catch (error) {
      console.error('Error loading terms:', error);
      setLocalError('Failed to load terms and conditions details');
    }
  };

  const handleSuccess = () => {
    Alert.alert('Success', 'Terms and conditions updated successfully', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleError = (error: string) => {
    console.error('Error updating terms:', error);
    setLocalError(error);
  };

  const handleRetry = () => {
    setLocalError(null);
    clearError();
    loadTermsData();
  };

  // Load terms data
  useEffect(() => {
    if (canManageContent() && id && !hasInitialized) {
      // Check if we already have the data for this ID to avoid unnecessary API calls
      if (currentTerms && currentTerms.id === id) {
        setHasInitialized(true);
        return;
      }

      loadTermsData().finally(() => {
        setHasInitialized(true);
      });
    }
  }, [id, hasInitialized, currentTerms]);

  // Cleanup on unmount - only clear errors, keep data for navigation
  useEffect(() => {
    return () => {
      clearError();
    };
  }, []);

  // Permission check
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
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to edit terms and conditions.
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

  // Loading state
  if (loading.singleTerms && !currentTerms) {
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
          <LoadingSpinner />
          <Text style={styles.loadingText}>
            Loading terms and conditions...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if ((error || localError) && hasInitialized) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Error',
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
          <Text style={styles.errorTitle}>Unable to Load Terms</Text>
          <Text style={styles.errorText}>{error || localError}</Text>
          <View style={styles.errorButtons}>
            <Button
              title='Try Again'
              variant='primary'
              onPress={handleRetry}
              icon={<RotateCcw size={20} color={colors.white} />}
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

  // Not found state
  if (!currentTerms && hasInitialized) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Terms Not Found',
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
            <FileText size={48} color={colors.warning} />
          </View>
          <Text style={styles.errorTitle}>Terms Not Found</Text>
          <Text style={styles.errorText}>
            The terms and conditions you're trying to edit don't exist or have
            been removed.
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
          title: `Edit: ${currentTerms?.title || 'Terms & Conditions'}`,
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
        <TermsForm
          terms={currentTerms || undefined}
          onSuccess={handleSuccess}
          onError={handleError}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
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
    maxWidth: 300,
    lineHeight: 22,
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
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
