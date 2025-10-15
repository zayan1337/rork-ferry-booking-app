import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useZoneStore } from '@/store/admin/zoneStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminManagement } from '@/types';
import { Plus, Globe, AlertTriangle } from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ZoneItem from '@/components/admin/ZoneItem';

interface ZonesTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function ZonesTab({ searchQuery = '' }: ZonesTabProps) {
  const { canManageZones, canViewZones } = useAdminPermissions();
  const zoneStore = useZoneStore();
  const { data: zones, loading, fetchAll } = zoneStore;

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize zones data
  useEffect(() => {
    if (canViewZones() && zones.length === 0) {
      fetchAll();
    }
  }, [zones.length]); // Removed function dependencies to prevent infinite loop

  const filteredZones = useMemo(() => {
    if (!searchQuery) return zones;

    const query = searchQuery.toLowerCase();
    return zones.filter(
      zone =>
        zone.name.toLowerCase().includes(query) ||
        zone.code.toLowerCase().includes(query) ||
        zone.description?.toLowerCase().includes(query)
    );
  }, [zones, searchQuery]);

  // Remove duplicates by ID and limit to 4 preview items
  const uniqueZones = useMemo(() => {
    return filteredZones.filter(
      (zone, index, self) => index === self.findIndex(z => z.id === zone.id)
    );
  }, [filteredZones]);

  // Create preview items (first 4 items)
  const previewItems = useMemo(() => {
    return uniqueZones.slice(0, 4);
  }, [uniqueZones]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAll();
    } catch (error) {
      console.error('Failed to refresh zones:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleZonePress = (zoneId: string) => {
    if (canViewZones()) {
      router.push(`../zone/${zoneId}` as any);
    }
  };

  const handleAddZone = () => {
    if (canManageZones()) {
      router.push('../zone/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create zones."
      );
    }
  };

  const handleViewAllZones = () => {
    router.push('../zones' as any);
  };

  // Permission check
  if (!canViewZones()) {
    return (
      <View style={styles.noPermissionContainer}>
        <View style={styles.noPermissionIcon}>
          <AlertTriangle size={48} color={colors.warning} />
        </View>
        <Text style={styles.noPermissionTitle}>Access Denied</Text>
        <Text style={styles.noPermissionText}>
          You don't have permission to view zones.
        </Text>
      </View>
    );
  }

  // Loading state
  if (loading.zones && zones.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading zones...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              <Globe size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Zones Management</Text>
              <Text style={styles.sectionSubtitle}>
                {uniqueZones.length} zones available
              </Text>
            </View>
          </View>
        </View>
        {canManageZones() && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Add Zone'
              onPress={handleAddZone}
              size='small'
              variant='outline'
              icon={<Plus size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderZoneItem = ({
    item,
    index,
  }: {
    item: AdminManagement.Zone;
    index: number;
  }) => (
    <ZoneItem
      key={`zone-${item.id}-${index}`}
      zone={item as any}
      onPress={handleZonePress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Globe size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No zones found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'Try adjusting your search terms' : 'No zones available'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (uniqueZones.length <= 4) return null; // Don't show footer if all items are displayed

    return (
      <View style={styles.footerContainer}>
        <Text style={styles.previewText}>
          Showing {previewItems.length} of {uniqueZones.length} zones
        </Text>
        <Pressable style={styles.viewAllButton} onPress={handleViewAllZones}>
          <Text style={styles.viewAllText}>View All Zones</Text>
          <Globe size={16} color={colors.primary} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={previewItems}
        renderItem={renderZoneItem}
        keyExtractor={(item, index) => `zone-${item.id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  sectionContent: {
    marginBottom: 16,
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    padding: 8,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerContainer: {
    paddingVertical: 24,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
    minWidth: 200,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyStateIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: `${colors.textSecondary}10`,
    borderRadius: 24,
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
  noPermissionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: `${colors.warning}10`,
    borderRadius: 24,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
