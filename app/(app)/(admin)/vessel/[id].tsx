import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminManagement } from '@/types';
import { ArrowLeft, Edit, Trash2, AlertTriangle } from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import VesselDetails from '@/components/admin/operations/VesselDetails';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type Vessel = AdminManagement.Vessel;

export default function VesselDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canViewVessels, canManageVessels } = useAdminPermissions();

  const {
    fetchById,
    loading,
    error,
    remove,
    getVesselWithDetails,
    formatCurrency,
    formatPercentage,
    getUtilizationRating,
    getUtilizationColor,
  } = useVesselManagement();

  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [vesselWithDetails, setVesselWithDetails] =
    useState<AdminManagement.VesselWithDetails | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadVessel();
    }
  }, [id]);

  const loadVessel = async () => {
    if (!id) return;

    try {
      // Load basic vessel data
      const vesselData = await fetchById(id);
      if (vesselData) {
        setVessel(vesselData);
      } else {
        console.error('No vessel data returned for ID:', id);
      }

      // Load detailed vessel data
      const detailedVessel = await getVesselWithDetails(id);
      if (detailedVessel) {
        setVesselWithDetails(detailedVessel);
      } else {
        console.error('No detailed vessel data returned for ID:', id);
      }
    } catch (error) {
      console.error('Error loading vessel:', error);
      // Set error state so the error UI shows
      setVessel(null);
      setVesselWithDetails(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadVessel();
    setIsRefreshing(false);
  };

  const handleEdit = () => {
    if (canManageVessels()) {
      router.push(`../vessel/${id}/edit` as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to edit vessels."
      );
    }
  };

  const handleDelete = () => {
    if (!canManageVessels()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to delete vessels."
      );
      return;
    }

    Alert.alert(
      'Delete Vessel',
      `Are you sure you want to delete "${vessel?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              if (id) {
                await remove(id);
                Alert.alert('Success', 'Vessel deleted successfully!');
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vessel');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleViewTrips = () => {
    router.push(`../trip?vessel_id=${id}` as any);
  };

  const handleViewMaintenance = () => {
    // Navigate to maintenance log or create maintenance modal
    Alert.alert('Maintenance', 'Maintenance log feature coming soon!');
  };

  const handleViewSeatLayout = () => {
    router.push(`../vessel/${id}/seat-layout` as any);
  };

  const handleArchive = () => {
    if (!canManageVessels()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to archive vessels."
      );
      return;
    }

    Alert.alert(
      'Archive Vessel',
      `Are you sure you want to archive "${vessel?.name}"? This will remove it from active service.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id && vessel) {
                await remove(id);
                Alert.alert('Success', 'Vessel archived successfully!');
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to archive vessel');
            }
          },
        },
      ]
    );
  };

  // Calculate vessel statistics
  const vesselStats = useMemo(() => {
    if (!vessel) return null;

    return {
      totalTrips: vessel.total_trips_30d || 0,
      totalBookings: vessel.total_bookings_30d || 0,
      totalRevenue: vessel.total_revenue_30d || 0,
      capacityUtilization: vessel.capacity_utilization_30d || 0,
      avgPassengersPerTrip: vessel.avg_passengers_per_trip || 0,
      daysInService: vessel.days_in_service_30d || 0,
      performanceRating: getUtilizationRating(vessel),
      estimatedRevenue: vessel.total_revenue_30d || 0,
      onTimePerformance: 95, // Placeholder - would come from actual data
      cancellationRate: 2, // Placeholder - would come from actual data
    };
  }, [vessel, getUtilizationRating]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'confirmed' as const;
      case 'maintenance':
        return 'pending' as const;
      case 'inactive':
        return 'cancelled' as const;
      default:
        return 'pending' as const;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.warning;
      case 'maintenance':
        return colors.warning;
      case 'decommissioned':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Permission check
  if (!canViewVessels()) {
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
            <AlertTriangle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view vessel details.
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
  if (loading.singleVessel || !vessel) {
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
          <Text style={styles.loadingText}>Loading vessel details...</Text>
        </View>
      </View>
    );
  }

  // Error state
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
          <AlertTriangle size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Error Loading Vessel</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title='Try Again' variant='primary' onPress={loadVessel} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: vessel.name,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {canManageVessels() && (
                <>
                  <Pressable
                    onPress={handleEdit}
                    style={styles.headerActionButton}
                  >
                    <Edit size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={handleDelete}
                    style={[
                      styles.headerActionButton,
                      styles.deleteActionButton,
                    ]}
                    disabled={isDeleting}
                  >
                    <Trash2 size={20} color={colors.error} />
                  </Pressable>
                </>
              )}
            </View>
          ),
        }}
      />

      <VesselDetails
        vessel={vesselWithDetails || vessel}
        onEdit={canManageVessels() ? handleEdit : undefined}
        onArchive={canManageVessels() ? handleArchive : undefined}
        onViewTrips={handleViewTrips}
        onViewMaintenance={handleViewMaintenance}
        onViewSeatLayout={handleViewSeatLayout}
        showActions={canManageVessels()}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteActionButton: {
    backgroundColor: `${colors.error}10`,
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
    gap: 20,
    padding: 32,
  },
  noAccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundTertiary,
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
    gap: 20,
    padding: 32,
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
});
