import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useIslandManagement } from '@/hooks/useIslandManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminManagement } from '@/types';
import { MapPin, Plus, AlertTriangle } from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import IslandItem from '@/components/admin/IslandItem';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface IslandsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

export default function IslandsTab({
  isActive,
  searchQuery = '',
}: IslandsTabProps) {
  const { canViewIslands, canManageIslands } = useAdminPermissions();
  const { islands, loading, loadAll } = useIslandManagement();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize islands data when tab becomes active
  useEffect(() => {
    if (isActive && canViewIslands() && islands.length === 0) {
      loadAll();
    }
  }, [isActive, islands.length]); // Removed function dependencies to prevent infinite loop

  const filteredIslands = useMemo(() => {
    if (!searchQuery) return islands;

    const query = searchQuery.toLowerCase();
    return islands.filter(
      island =>
        island.name.toLowerCase().includes(query) ||
        island.zone_info?.name?.toLowerCase().includes(query) ||
        island.zone?.toLowerCase().includes(query)
    );
  }, [islands, searchQuery]);

  // Remove duplicates by ID and limit to 4 preview items
  const uniqueIslands = useMemo(() => {
    return filteredIslands.filter(
      (island, index, self) => index === self.findIndex(i => i.id === island.id)
    );
  }, [filteredIslands]);

  // Create preview items (first 4 items)
  const previewItems = useMemo(() => {
    return uniqueIslands.slice(0, 4);
  }, [uniqueIslands]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAll();
    } catch (error) {
      console.error('Failed to refresh islands:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleIslandPress = (islandId: string) => {
    if (canViewIslands()) {
      router.push(`../island/${islandId}` as any);
    }
  };

  const handleAddIsland = () => {
    if (canManageIslands()) {
      router.push('../island/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create islands."
      );
    }
  };

  const handleViewAllIslands = () => {
    router.push('../islands' as any);
  };

  // Permission check
  if (!canViewIslands()) {
    return (
      <View style={styles.noPermissionContainer}>
        <View style={styles.noPermissionIcon}>
          <AlertTriangle size={48} color={colors.warning} />
        </View>
        <Text style={styles.noPermissionTitle}>Access Denied</Text>
        <Text style={styles.noPermissionText}>
          You don't have permission to view islands.
        </Text>
      </View>
    );
  }

  // Loading state
  if (loading.islands && islands.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading islands...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              <MapPin size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Islands Management</Text>
              <Text style={styles.sectionSubtitle}>
                {uniqueIslands.length} islands available
              </Text>
            </View>
          </View>
        </View>
        {canManageIslands() && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Add Island'
              onPress={handleAddIsland}
              size='small'
              variant='outline'
              icon={<Plus size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderIslandItem = ({
    item,
    index,
  }: {
    item: AdminManagement.Island;
    index: number;
  }) => (
    <IslandItem
      key={`island-${item.id}-${index}`}
      island={item as any}
      onPress={handleIslandPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <MapPin size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No islands found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? 'Try adjusting your search terms'
          : 'No islands available'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (uniqueIslands.length <= 4) return null; // Don't show footer if all items are displayed

    return (
      <View style={styles.footerContainer}>
        <Text style={styles.previewText}>
          Showing {previewItems.length} of {uniqueIslands.length} islands
        </Text>
        <Pressable style={styles.viewAllButton} onPress={handleViewAllIslands}>
          <Text style={styles.viewAllText}>View All Islands</Text>
          <MapPin size={16} color={colors.primary} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={previewItems}
        renderItem={renderIslandItem}
        keyExtractor={(item, index) => `island-${item.id}-${index}`}
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
