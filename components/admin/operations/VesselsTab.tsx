import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useAlertContext } from '@/components/AlertProvider';
import { Plus, Eye, AlertTriangle, Ship } from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface VesselsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

export default function VesselsTab({
  isActive,
  searchQuery = '',
}: VesselsTabProps) {
  const { canViewVessels, canManageVessels } = useAdminPermissions();
  const { showError } = useAlertContext();
  const {
    vessels: filteredVessels,
    searchQuery: vesselSearchQuery,
    setSearchQuery: setVesselSearchQuery,
    loading,
    stats,
    loadAll: loadVessels,
  } = useVesselManagement();

  // Ensure safe data
  const safeVessels = filteredVessels || [];
  const safeStats = stats || {
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
    totalTrips30d: 0,
    totalBookings30d: 0,
    totalRevenue30d: 0,
    avgUtilization: 0,
    avgCapacity: 0,
    totalCapacity: 0,
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize vessels data when tab becomes active
  useEffect(() => {
    if (
      isActive &&
      canViewVessels() &&
      (!safeVessels || safeVessels.length === 0)
    ) {
      loadVessels();
    }
  }, [isActive, safeVessels?.length, loadVessels]);

  // Filter vessels based on search query
  const filteredVesselsData = useMemo(() => {
    if (!safeVessels) return [];

    let filtered = safeVessels;
    const query = searchQuery || vesselSearchQuery || '';

    if (query) {
      filtered = safeVessels.filter(
        vessel =>
          vessel.name?.toLowerCase().includes(query.toLowerCase()) ||
          vessel.status?.toLowerCase().includes(query.toLowerCase())
      );
    }

    return filtered;
  }, [safeVessels, searchQuery, vesselSearchQuery]);

  // Limit vessels to 4 for display
  const displayVessels = useMemo(() => {
    return filteredVesselsData
      .filter(
        (vessel, index, self) =>
          index === self.findIndex(v => v.id === vessel.id)
      )
      .slice(0, 4);
  }, [filteredVesselsData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadVessels();
    } catch (error) {
      console.error('Error refreshing vessels:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVesselPress = (vesselId: string) => {
    if (canViewVessels()) {
      router.push(`../vessel/${vesselId}` as any);
    }
  };

  const handleAddVessel = () => {
    if (canManageVessels()) {
      router.push('../vessel/new' as any);
    } else {
      showError(
        'Access Denied',
        "You don't have permission to create vessels."
      );
    }
  };

  const handleViewAllVessels = () => {
    router.push('../vessels' as any);
  };

  // Permission check
  if (!canViewVessels()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view vessels.
        </Text>
      </View>
    );
  }

  // Loading state - only show loading if we're actively loading and haven't received any data yet
  if (loading.vessels && safeVessels.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Vessels Management'
            subtitle={`${safeStats.active} active vessels`}
          />
        </View>
        {canManageVessels() && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Add Vessel'
              onPress={handleAddVessel}
              size='small'
              variant='outline'
              icon={<Plus size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search vessels...'
        value={searchQuery || vesselSearchQuery || ''}
        onChangeText={setVesselSearchQuery}
      />

      {/* Vessels List */}
      <View style={styles.itemsList}>
        {displayVessels.length > 0 ? (
          displayVessels.map((vessel: any, index: number) => (
            <Pressable
              key={`vessel-${vessel.id}-${index}`}
              style={styles.vesselItem}
              onPress={() => handleVesselPress(vessel.id)}
            >
              <View style={styles.vesselInfo}>
                <Text style={styles.vesselName}>
                  {vessel.name || 'Unknown Vessel'}
                </Text>
                <Text style={styles.vesselCapacity}>
                  Capacity: {vessel.seating_capacity || 0} passengers
                </Text>
                {vessel.capacity_utilization_30d !== null &&
                  vessel.capacity_utilization_30d !== undefined && (
                    <Text style={styles.vesselUtilization}>
                      Utilization: {vessel.capacity_utilization_30d}%
                    </Text>
                  )}
              </View>
              <View style={styles.vesselStats}>
                <View
                  style={[
                    styles.statusBadge,
                    vessel.status === 'active'
                      ? styles.statusActive
                      : vessel.status === 'maintenance'
                        ? styles.statusMaintenance
                        : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      vessel.status === 'active'
                        ? styles.statusTextActive
                        : styles.statusTextInactive,
                    ]}
                  >
                    {vessel.status || 'unknown'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ship size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No vessels found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No vessels available'}
            </Text>
          </View>
        )}
      </View>

      {/* View All Button */}
      <Pressable style={styles.viewAllButton} onPress={handleViewAllVessels}>
        <Text style={styles.viewAllText}>View All Vessels</Text>
        <Eye size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  itemsList: {
    gap: 12,
    marginTop: 16,
  },
  vesselItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vesselInfo: {
    flex: 1,
  },
  vesselName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  vesselCapacity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  vesselUtilization: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  vesselStats: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: `${colors.success}20`,
  },
  statusInactive: {
    backgroundColor: `${colors.textSecondary}20`,
  },
  statusMaintenance: {
    backgroundColor: `${colors.warning}20`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
});
