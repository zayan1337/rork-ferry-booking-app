import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Text,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, AlertCircle, RotateCcw } from 'lucide-react-native';
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from '@/types';
// UPDATED: Replace old content store with new zone store
import { useZoneStore } from '@/store';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

// Components
import ZoneForm from '@/components/admin/operations/ZoneForm';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import Button from '@/components/admin/Button';

type Zone = AdminManagement.Zone;

export default function EditZoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageSettings } = useAdminPermissions();

  // UPDATED: Use new zone store instead of content store
  const { getZoneById, fetchAll: fetchZones, fetchById } = useZoneStore();

  const [zone, setZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadZone = async () => {
    if (!id) {
      setError('Invalid zone ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // UPDATED: Use new zone store methods
      // First try to get from current store data
      let zoneData = getZoneById(id);

      if (!zoneData) {
        // Zone not found in store, fetch it
        const fetchedZone = await fetchById(id);
        zoneData = fetchedZone || undefined;

        // If still not found, refresh all zones
        if (!fetchedZone) {
          await fetchZones();
          zoneData = getZoneById(id);
        }
      }

      if (zoneData) {
        setZone(zoneData);
      } else {
        setError('Zone not found');
      }
    } catch (error) {
      console.error('Error loading zone:', error);
      setError('Failed to load zone details');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    Alert.alert('Success', 'Zone updated successfully', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleError = (error: string) => {
    console.error('Error updating zone:', error);
    setError(error);
  };

  const handleRetry = () => {
    setError(null);
    loadZone();
  };

  useEffect(() => {
    loadZone();
  }, [id]);

  if (!canManageSettings()) {
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
            You don't have permission to edit zones.
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

  if (loading) {
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
          <Text style={styles.loadingText}>Loading zone details...</Text>
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
          <Text style={styles.errorTitle}>Unable to Load Zone</Text>
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

  if (!zone) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Zone Not Found',
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
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.errorTitle}>Zone Not Found</Text>
          <Text style={styles.errorText}>
            The requested zone could not be found.
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
          title: `Edit ${zone.name}`,
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ZoneForm
          initialData={zone}
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
