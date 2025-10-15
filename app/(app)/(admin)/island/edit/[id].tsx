import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Text,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, AlertCircle, RotateCcw } from 'lucide-react-native';
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from '@/types';
// UPDATED: Replace old store with new implementation
import {
  useIslandManagement,
  useIslandDetails,
} from '@/hooks/useIslandManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

// Components
import IslandForm from '@/components/admin/operations/IslandForm';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import Button from '@/components/admin/Button';

type Island = AdminManagement.Island;

export default function EditIslandScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canUpdateIslands } = useAdminPermissions();

  // UPDATED: Use new island management hooks
  const { getById: getIslandById } = useIslandManagement();
  const {
    island: currentIsland,
    loading: detailLoading,
    loadIsland,
  } = useIslandDetails(id || '');

  const [island, setIsland] = useState<Island | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIslandData = async () => {
    if (!id) {
      setError('Invalid island ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // UPDATED: Use new island loading methods
      // First try to get from current store data
      let islandData = getIslandById(id);

      if (!islandData) {
        // Island not in store, fetch it
        await loadIsland();
        islandData = currentIsland || undefined;
      }

      if (islandData) {
        setIsland(islandData);
      } else {
        setError('Island not found');
      }
    } catch (error) {
      console.error('Error loading island:', error);
      setError('Failed to load island details');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    Alert.alert('Success', 'Island updated successfully', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleError = (error: string) => {
    console.error('Error updating island:', error);
    setError(error);
  };

  const handleRetry = () => {
    setError(null);
    loadIslandData();
  };

  useEffect(() => {
    loadIslandData();
  }, [id]);

  // Update local island state when currentIsland changes
  useEffect(() => {
    if (currentIsland && !island) {
      setIsland(currentIsland);
    }
  }, [currentIsland, island]);

  if (!canUpdateIslands()) {
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
            You don't have permission to edit islands.
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

  // UPDATED: Use combined loading state from new hook and local state
  const isLoading = loading || detailLoading;

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
          <Text style={styles.loadingText}>Loading island details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
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
          <Text style={styles.errorTitle}>Unable to Load Island</Text>
          <Text style={styles.errorText}>{error}</Text>
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

  if (!island) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Island Not Found',
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
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.errorTitle}>Island Not Found</Text>
          <Text style={styles.errorText}>
            The requested island could not be found.
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
          title: `Edit ${island.name}`,
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
        <IslandForm
          initialData={island}
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
    gap: 16,
    width: '100%',
    maxWidth: 300,
  },
});
