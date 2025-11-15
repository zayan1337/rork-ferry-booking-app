import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { TermsAndConditions, Promotion } from '@/types/content';
import {
  FileText,
  Percent,
  Plus,
  AlertTriangle,
  Eye,
} from 'lucide-react-native';

// Components
import TermsItem from '@/components/admin/TermsItem';
import PromotionItem from '@/components/admin/PromotionItem';
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface ContentTabProps {
  isActive: boolean;
  searchQuery?: string;
}

type TabType = 'terms' | 'promotions';

const ContentTab: React.FC<ContentTabProps> = ({
  isActive,
  searchQuery = '',
}) => {
  const { showError, showSuccess, showConfirmation } = useAlertContext();
  const { canManageContent, canViewContent } = useAdminPermissions();
  const {
    terms,
    promotions,
    loading,
    refreshAll,
    deleteTerms,
    deletePromotion,
    duplicatePromotion,
    error,
    clearError,
  } = useContentManagement();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('terms');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Memoize permission check result
  const hasViewPermission = useMemo(() => canViewContent(), [canViewContent]);
  const hasManagePermission = useMemo(
    () => canManageContent(),
    [canManageContent]
  );

  // Initialize data when tab becomes active - only once
  useEffect(() => {
    if (isActive && hasViewPermission && !hasInitialized) {
      refreshAll().finally(() => {
        setHasInitialized(true);
      });
    }
  }, [isActive, hasViewPermission, hasInitialized]); // Removed refreshAll from dependencies to prevent infinite loops

  // Clear error when component unmounts or becomes inactive
  useEffect(() => {
    if (!isActive && error) {
      clearError();
    }
  }, [isActive, error]); // Removed clearError function dependency

  // Filter data based on search query
  const filteredTerms = useMemo(() => {
    if (!searchQuery) return terms;
    const query = searchQuery.toLowerCase();
    return terms.filter(
      term =>
        term.title.toLowerCase().includes(query) ||
        term.content.toLowerCase().includes(query) ||
        term.version.toLowerCase().includes(query)
    );
  }, [terms, searchQuery]);

  const filteredPromotions = useMemo(() => {
    if (!searchQuery) return promotions;
    const query = searchQuery.toLowerCase();
    return promotions.filter(
      promotion =>
        promotion.name.toLowerCase().includes(query) ||
        (promotion.description &&
          promotion.description.toLowerCase().includes(query))
    );
  }, [promotions, searchQuery]);

  // Get current data based on active tab
  const currentData = useMemo(() => {
    return activeTab === 'terms' ? filteredTerms : filteredPromotions;
  }, [activeTab, filteredTerms, filteredPromotions]);

  // Preview items (first 4)
  const previewItems = useMemo(() => {
    return currentData.slice(0, 4);
  }, [currentData]);

  const handleRefresh = useCallback(async () => {
    if (!hasViewPermission) return;

    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error('Failed to refresh content:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [hasViewPermission]); // Removed refreshAll from dependencies to prevent infinite loops

  const handleAddContent = useCallback(() => {
    if (!hasManagePermission) {
      showError(
        'Access Denied',
        `You don't have permission to create ${activeTab}.`
      );
      return;
    }

    const route = activeTab === 'terms' ? '../terms/new' : '../promotion/new';
    router.push(route as any);
  }, [activeTab, hasManagePermission, showError]);

  const handleViewAll = useCallback(() => {
    const route = activeTab === 'terms' ? '../terms' : '../promotions';
    router.push(route as any);
  }, [activeTab]);

  const handleItemPress = useCallback(
    (itemId: string) => {
      if (!hasViewPermission) return;

      const route =
        activeTab === 'terms' ? `../terms/${itemId}` : `../promotion/${itemId}`;
      router.push(route as any);
    },
    [activeTab, hasViewPermission]
  );

  const handleEdit = useCallback(
    (itemId: string) => {
      if (!hasManagePermission) return;

      const route =
        activeTab === 'terms'
          ? `../terms/edit/${itemId}`
          : `../promotion/edit/${itemId}`;
      router.push(route as any);
    },
    [activeTab, hasManagePermission]
  );

  const handleDelete = useCallback(
    async (itemId: string) => {
      if (!hasManagePermission) {
        showError(
          'Access Denied',
          `You don't have permission to delete ${activeTab}.`
        );
        return;
      }

      const itemType =
        activeTab === 'terms' ? 'terms and conditions' : 'promotion';
      showConfirmation(
        `Delete ${itemType}`,
        `Are you sure you want to delete this ${itemType}? This action cannot be undone.`,
        async () => {
          try {
            if (activeTab === 'terms') {
              await deleteTerms(itemId);
            } else {
              await deletePromotion(itemId);
            }
            showSuccess('Success', `${itemType} deleted successfully.`);
          } catch (error) {
            showError('Error', `Failed to delete ${itemType}.`);
          }
        },
        undefined,
        true // Mark as destructive action
      );
    },
    [
      activeTab,
      hasManagePermission,
      deleteTerms,
      deletePromotion,
      showError,
      showSuccess,
      showConfirmation,
    ]
  );

  const handleDuplicate = useCallback(
    async (itemId: string) => {
      if (!hasManagePermission) {
        showError(
          'Access Denied',
          `You don't have permission to duplicate ${activeTab}.`
        );
        return;
      }

      try {
        if (activeTab === 'promotions') {
          await duplicatePromotion(itemId);
          showSuccess('Success', 'Promotion duplicated successfully.');
        }
      } catch (error) {
        console.error('Error duplicating item:', error);
        showError('Error', `Failed to duplicate ${activeTab}.`);
      }
    },
    [activeTab, hasManagePermission, duplicatePromotion, showError, showSuccess]
  );

  // Permission check
  if (!hasViewPermission) {
    return (
      <View style={styles.noPermissionContainer}>
        <View style={styles.noPermissionIcon}>
          <AlertTriangle size={48} color={colors.warning} />
        </View>
        <Text style={styles.noPermissionTitle}>Access Denied</Text>
        <Text style={styles.noPermissionText}>
          You don't have permission to view content management.
        </Text>
      </View>
    );
  }

  // Loading state
  if ((loading.terms || loading.promotions) && !hasInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              {activeTab === 'terms' ? (
                <FileText size={20} color={colors.primary} />
              ) : (
                <Percent size={20} color={colors.primary} />
              )}
            </View>
            <View>
              <Text style={styles.sectionTitle}>Content Management</Text>
              <Text style={styles.sectionSubtitle}>
                {currentData.length}{' '}
                {activeTab === 'terms' ? 'terms & conditions' : 'promotions'}{' '}
                available
              </Text>
            </View>
          </View>
        </View>
        {hasManagePermission && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title={activeTab === 'terms' ? 'Add Terms' : 'Add Promotion'}
              onPress={handleAddContent}
              size='small'
              variant='outline'
              icon={<Plus size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabToggleContainer}>
        <Pressable
          style={[
            styles.tabToggle,
            activeTab === 'terms' && styles.tabToggleActive,
          ]}
          onPress={() => setActiveTab('terms')}
        >
          <FileText
            size={16}
            color={
              activeTab === 'terms' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabToggleText,
              activeTab === 'terms' && styles.tabToggleTextActive,
            ]}
          >
            Terms & Conditions ({filteredTerms.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tabToggle,
            activeTab === 'promotions' && styles.tabToggleActive,
          ]}
          onPress={() => setActiveTab('promotions')}
        >
          <Percent
            size={16}
            color={
              activeTab === 'promotions' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabToggleText,
              activeTab === 'promotions' && styles.tabToggleTextActive,
            ]}
          >
            Promotions ({filteredPromotions.length})
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: TermsAndConditions | Promotion;
    index: number;
  }) => {
    if (activeTab === 'terms') {
      const terms = item as TermsAndConditions;
      return (
        <TermsItem
          key={`terms-${terms.id}-${index}`}
          terms={terms}
          onPress={handleItemPress}
          onEdit={hasManagePermission ? handleEdit : undefined}
          onDelete={hasManagePermission ? handleDelete : undefined}
          showActions={hasManagePermission}
        />
      );
    } else {
      const promotion = item as Promotion;
      return (
        <PromotionItem
          key={`promotion-${promotion.id}-${index}`}
          promotion={promotion}
          onPress={handleItemPress}
        />
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        {activeTab === 'terms' ? (
          <FileText size={48} color={colors.textSecondary} />
        ) : (
          <Percent size={48} color={colors.textSecondary} />
        )}
      </View>
      <Text style={styles.emptyStateTitle}>
        No {activeTab === 'terms' ? 'Terms & Conditions' : 'Promotions'} Found
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? 'Try adjusting your search terms'
          : `No ${activeTab} available`}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (currentData.length <= 4) return null;

    return (
      <View style={styles.footerContainer}>
        <Text style={styles.previewText}>
          Showing {previewItems.length} of {currentData.length}{' '}
          {activeTab === 'terms' ? 'terms & conditions' : 'promotions'}
        </Text>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>
            View All {activeTab === 'terms' ? 'Terms' : 'Promotions'}
          </Text>
          <Eye size={16} color={colors.primary} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={previewItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${activeTab}-${item.id}-${index}`}
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
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
  sectionContent: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
    paddingHorizontal: 16,
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
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 16,
  },
  tabToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabToggleActive: {
    backgroundColor: `${colors.primary}15`,
  },
  tabToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabToggleTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
  footerContainer: {
    paddingVertical: 24,
    marginHorizontal: 16,
  },
  previewText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
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
});

export default ContentTab;
