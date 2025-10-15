import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Promotion } from '@/types/content';
import {
  Percent,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react-native';

// Components
import PromotionItem from '@/components/admin/PromotionItem';
import SearchBar from '@/components/admin/SearchBar';
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type SortField =
  | 'name'
  | 'discount_percentage'
  | 'start_date'
  | 'end_date'
  | 'created_at';
type SortOrder = 'asc' | 'desc';
type StatusFilter =
  | 'all'
  | 'current'
  | 'upcoming'
  | 'expired'
  | 'active'
  | 'inactive';

export default function PromotionsScreen() {
  const { canManageContent, canViewContent } = useAdminPermissions();
  const {
    promotions,
    loading,
    error,
    promotionsStats,
    refreshAll,
    deletePromotion,
    duplicatePromotion,
    clearError,
  } = useContentManagement();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Initialize data
  useEffect(() => {
    if (canViewContent()) {
      refreshAll();
    }
  }, []);

  // Filter and sort promotions
  const filteredAndSortedPromotions = useMemo(() => {
    let filtered = promotions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        promotion =>
          promotion.name.toLowerCase().includes(query) ||
          (promotion.description &&
            promotion.description.toLowerCase().includes(query)) ||
          promotion.discount_percentage.toString().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(promotion => {
        const start = new Date(promotion.start_date);
        const end = new Date(promotion.end_date);

        switch (statusFilter) {
          case 'current':
            return start <= now && end >= now && promotion.is_active;
          case 'upcoming':
            return start > now;
          case 'expired':
            return end < now;
          case 'active':
            return promotion.is_active;
          case 'inactive':
            return !promotion.is_active;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'discount_percentage':
          aValue = a.discount_percentage;
          bValue = b.discount_percentage;
          break;
        case 'start_date':
          aValue = new Date(a.start_date);
          bValue = new Date(b.start_date);
          break;
        case 'end_date':
          aValue = new Date(a.end_date);
          bValue = new Date(b.end_date);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [promotions, searchQuery, statusFilter, sortField, sortOrder]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error('Error refreshing promotions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePromotionPress = (promotionId: string) => {
    router.push(`./promotion/${promotionId}` as any);
  };

  const handleAddPromotion = () => {
    if (!canManageContent()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create promotions."
      );
      return;
    }
    router.push('./promotion/new' as any);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderPromotionItem = ({
    item,
    index,
  }: {
    item: Promotion;
    index: number;
  }) => (
    <PromotionItem
      key={`promotion-${item.id}-${index}`}
      promotion={item}
      onPress={handlePromotionPress}
    />
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* Quick Stats Summary */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Percent size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{promotionsStats.total}</Text>
            <Text style={styles.quickStatLabel}>Total</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <CheckCircle size={16} color={colors.success} />
            </View>
            <Text style={styles.quickStatValue}>{promotionsStats.active}</Text>
            <Text style={styles.quickStatLabel}>Current</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <Clock size={16} color={colors.warning} />
            </View>
            <Text style={styles.quickStatValue}>
              {promotionsStats.upcoming}
            </Text>
            <Text style={styles.quickStatLabel}>Upcoming</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.errorLight },
              ]}
            >
              <XCircle size={16} color={colors.error} />
            </View>
            <Text style={styles.quickStatValue}>{promotionsStats.expired}</Text>
            <Text style={styles.quickStatLabel}>Expired</Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder='Search promotions by name or description...'
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <Pressable
            style={[
              styles.controlButton,
              showFilters && styles.controlButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={16}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.controlButtonText,
                showFilters && styles.controlButtonTextActive,
              ]}
            >
              Filters
            </Text>
          </Pressable>

          <View style={styles.sortControl}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <Pressable
              style={[
                styles.sortButton,
                sortField === 'name' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('name')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortField === 'name' && styles.sortButtonTextActive,
                ]}
              >
                Name
              </Text>
              {sortField === 'name' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </Pressable>
            <Pressable
              style={[
                styles.sortButton,
                sortField === 'discount_percentage' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('discount_percentage')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortField === 'discount_percentage' &&
                    styles.sortButtonTextActive,
                ]}
              >
                Discount
              </Text>
              {sortField === 'discount_percentage' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </Pressable>
          </View>
        </View>

        <View style={styles.controlsRight}>
          <Text style={styles.resultsCount}>
            {filteredAndSortedPromotions.length} promotion
            {filteredAndSortedPromotions.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Filter Options (Collapsible) */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterSectionTitle}>Filter by Status</Text>
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Promotions
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === 'current' && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('current')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'current' && styles.filterChipTextActive,
                ]}
              >
                Current
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === 'upcoming' && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('upcoming')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'upcoming' && styles.filterChipTextActive,
                ]}
              >
                Upcoming
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === 'expired' && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('expired')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'expired' && styles.filterChipTextActive,
                ]}
              >
                Expired
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === 'active' && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('active')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'active' && styles.filterChipTextActive,
                ]}
              >
                Active
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.filterChip,
                statusFilter === 'inactive' && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter('inactive')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'inactive' && styles.filterChipTextActive,
                ]}
              >
                Inactive
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Section Divider */}
      {filteredAndSortedPromotions.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>Promotions</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Percent size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No promotions found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your search or filter criteria'
          : 'No promotions have been created yet'}
      </Text>
      {canManageContent() && !searchQuery && statusFilter === 'all' && (
        <Button
          title='Create First Promotion'
          onPress={handleAddPromotion}
          variant='primary'
          icon={<Plus size={20} color={colors.white} />}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  // Permission check
  if (!canViewContent()) {
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
            You don't have permission to view promotions.
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
          title: 'Promotions',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {loading.promotions && promotions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading promotions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedPromotions}
          renderItem={renderPromotionItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      )}

      {/* Floating Add Button */}
      {canManageContent() && filteredAndSortedPromotions.length > 0 && (
        <Pressable style={styles.floatingButton} onPress={handleAddPromotion}>
          <Plus size={24} color={colors.white} />
        </Pressable>
      )}
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
  backButton: {
    padding: 8,
    marginLeft: -8,
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
  listContainer: {
    flexGrow: 1,
    paddingBottom: 100, // Space for floating button
  },
  listHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  quickStats: {
    marginBottom: 20,
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  controlsRight: {
    alignItems: 'flex-end',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  controlButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  controlButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  controlButtonTextActive: {
    color: colors.primary,
  },
  sortControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sortButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: colors.primary,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  filtersSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sectionDivider: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  itemSeparator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 20,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  emptyStateButton: {
    marginTop: 16,
    minWidth: 200,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
