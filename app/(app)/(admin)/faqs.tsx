import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useFAQManagement } from '@/hooks/useFAQManagement';
import { useFAQManagementStore } from '@/store/admin/faqStore';
import { FAQ, FAQCategory } from '@/types/admin/management';
import {
  ArrowLeft,
  Plus,
  HelpCircle,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Activity,
  TrendingUp,
  Grid3x3,
  List,
  MoreHorizontal,
  Folder,
  MessageSquare,
  Settings,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import FAQItem from '@/components/admin/FAQItem';
import FAQCategoryItem from '@/components/admin/FAQCategoryItem';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import StatCard from '@/components/admin/StatCard';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function FAQsScreen() {
  const { canViewSettings, canManageSettings } = useAdminPermissions();
  const {
    faqs,
    categories,
    filteredFaqs,
    categoriesWithCounts,
    loading,
    error,
    faqStats,
    categoryStats,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    setSearchQuery,
    setFilters,
    setSortBy,
    setSortOrder,
    refreshAll,
    deleteFAQ,
    getFAQById,
  } = useFAQManagement();

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentView, setCurrentView] = useState<'faqs' | 'categories'>('faqs');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Category-specific state
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categorySortBy, setCategorySortBy] = useState<
    'name' | 'order_index' | 'created_at'
  >('name');
  const [categorySortOrder, setCategorySortOrder] = useState<'asc' | 'desc'>(
    'asc'
  );
  const [categoryFilterActive, setCategoryFilterActive] = useState<
    boolean | null
  >(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFAQPress = (faqId: string) => {
    router.push(`./faq/${faqId}` as any);
  };

  const handleAddFAQ = () => {
    if (canManageSettings()) {
      router.push('./faq/new' as any);
    } else {
      Alert.alert('Access Denied', "You don't have permission to create FAQs.");
    }
  };

  const handleEditFAQ = (faqId: string) => {
    if (canManageSettings()) {
      router.push(`./faq/edit/${faqId}` as any);
    } else {
      Alert.alert('Access Denied', "You don't have permission to edit FAQs.");
    }
  };

  const handleDeleteFAQ = (faqId: string) => {
    if (!canManageSettings()) {
      Alert.alert('Access Denied', "You don't have permission to delete FAQs.");
      return;
    }

    const faq = getFAQById(faqId);
    if (!faq) return;

    Alert.alert(
      'Delete FAQ',
      `Are you sure you want to delete "${faq.question}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFAQ(faqId);
              Alert.alert('Success', 'FAQ deleted successfully');
            } catch (error) {
              console.error('Error deleting FAQ:', error);
              Alert.alert('Error', 'Failed to delete FAQ');
            }
          },
        },
      ]
    );
  };

  const handleToggleView = () => {
    setCurrentView(currentView === 'faqs' ? 'categories' : 'faqs');
    // Reset filters when switching views
    if (currentView === 'categories') {
      setShowFilters(false);
    }
  };

  // Category management functions
  const handleCategoryPress = (categoryId: string) => {
    // Switch back to FAQs view and filter by this category
    setCurrentView('faqs');
    handleCategoryFilter(categoryId);
  };

  const handleEditCategory = (categoryId: string) => {
    if (canManageSettings()) {
      router.push(`./faq-categories/edit/${categoryId}` as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to edit categories."
      );
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!canManageSettings()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to delete categories."
      );
      return;
    }

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await useFAQManagementStore.getState().deleteCategory(categoryId);
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              console.error('Error deleting category:', error);
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'Failed to delete category';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const toggleCategorySort = (field: 'name' | 'order_index' | 'created_at') => {
    if (categorySortBy === field) {
      setCategorySortOrder(categorySortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCategorySortBy(field);
      setCategorySortOrder('asc');
    }
  };

  const handleCategoryStatusFilter = (isActive: boolean | null) => {
    setCategoryFilterActive(isActive);
  };

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = [...categoriesWithCounts];

    // Apply search filter
    if (categorySearchQuery.trim()) {
      const query = categorySearchQuery.toLowerCase();
      filtered = filtered.filter(
        category =>
          category.name.toLowerCase().includes(query) ||
          category.description?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (categoryFilterActive !== null) {
      filtered = filtered.filter(
        category => category.is_active === categoryFilterActive
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (categorySortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'order_index':
          comparison = a.order_index - b.order_index;
          break;
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return categorySortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [
    categoriesWithCounts,
    categorySearchQuery,
    categoryFilterActive,
    categorySortBy,
    categorySortOrder,
  ]);

  const toggleSort = (
    field: 'question' | 'category' | 'order_index' | 'created_at' | 'updated_at'
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleCategoryFilter = (categoryId: string | null) => {
    setFilterCategory(categoryId);
    setFilters({ ...filters, category_id: categoryId || undefined });
  };

  const handleStatusFilter = (isActive: boolean | null) => {
    setFilterActive(isActive);
    setFilters({
      ...filters,
      is_active: isActive === null ? undefined : isActive,
    });
  };

  const renderFAQItem = ({ item, index }: { item: FAQ; index: number }) => (
    <FAQItem
      key={item.id}
      faq={item}
      onPress={handleFAQPress}
      onEdit={canManageSettings() ? handleEditFAQ : undefined}
      onDelete={canManageSettings() ? handleDeleteFAQ : undefined}
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
              <HelpCircle size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{faqStats.total}</Text>
            <Text style={styles.quickStatLabel}>Total FAQs</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Activity size={16} color={colors.success} />
            </View>
            <Text style={styles.quickStatValue}>{faqStats.active}</Text>
            <Text style={styles.quickStatLabel}>Active</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.infoLight },
              ]}
            >
              <Folder size={16} color={colors.info} />
            </View>
            <Text style={styles.quickStatValue}>
              {faqStats.totalCategories}
            </Text>
            <Text style={styles.quickStatLabel}>Categories</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <TrendingUp size={16} color={colors.warning} />
            </View>
            <Text style={styles.quickStatValue}>
              {faqStats.recentlyUpdated}
            </Text>
            <Text style={styles.quickStatLabel}>Recent</Text>
          </View>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={16}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                showFilters && styles.filterButtonTextActive,
              ]}
            >
              Filters
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => toggleSort('question' as const)}
          >
            {sortBy === 'question' ? (
              sortOrder === 'asc' ? (
                <SortAsc size={16} color={colors.primary} />
              ) : (
                <SortDesc size={16} color={colors.primary} />
              )
            ) : (
              <SortAsc size={16} color={colors.textSecondary} />
            )}
            <Text style={styles.sortButtonText}>Question</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionBarRight}>
          <TouchableOpacity
            style={[
              styles.manageButton,
              currentView === 'categories' && styles.manageButtonActive,
            ]}
            onPress={handleToggleView}
          >
            {currentView === 'faqs' ? (
              <Folder size={16} color={colors.primary} />
            ) : (
              <MessageSquare size={16} color={colors.primary} />
            )}
            <Text style={[styles.manageButtonText]}>
              {currentView === 'faqs' ? 'Categories' : 'FAQs'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterCategory === null && styles.filterChipActive,
                ]}
                onPress={() => handleCategoryFilter(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterCategory === null && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterChip,
                    filterCategory === category.id && styles.filterChipActive,
                  ]}
                  onPress={() => handleCategoryFilter(category.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterCategory === category.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterActive === null && styles.filterChipActive,
                ]}
                onPress={() => handleStatusFilter(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterActive === null && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterActive === true && styles.filterChipActive,
                ]}
                onPress={() => handleStatusFilter(true)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterActive === true && styles.filterChipTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterActive === false && styles.filterChipActive,
                ]}
                onPress={() => handleStatusFilter(false)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterActive === false && styles.filterChipTextActive,
                  ]}
                >
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Search Bar - Only show for FAQs view */}
      {currentView === 'faqs' && (
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder='Search FAQs...'
          />
        </View>
      )}

      {currentView === 'faqs' && filteredFaqs.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>FAQs ({filteredFaqs.length})</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <HelpCircle size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No FAQs found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || filterCategory || filterActive !== null
          ? 'Try adjusting your search or filter criteria'
          : 'No FAQs have been created yet'}
      </Text>
      {canManageSettings() &&
        !searchQuery &&
        !filterCategory &&
        filterActive === null && (
          <Button
            title='Create First FAQ'
            onPress={handleAddFAQ}
            variant='primary'
            icon={<Plus size={20} color={colors.white} />}
            style={styles.emptyStateButton}
          />
        )}
    </View>
  );

  const renderCategoryItem = ({
    item,
    index,
  }: {
    item: FAQCategory & { faq_count: number; active_faq_count: number };
    index: number;
  }) => (
    <FAQCategoryItem
      key={item.id}
      category={item}
      faqCount={item.faq_count}
      onPress={handleCategoryPress}
      onEdit={canManageSettings() ? handleEditCategory : undefined}
      onDelete={canManageSettings() ? handleDeleteCategory : undefined}
    />
  );

  const renderCategoriesEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Folder size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Categories found</Text>
      <Text style={styles.emptyStateText}>
        {categorySearchQuery || categoryFilterActive !== null
          ? 'Try adjusting your search or filter criteria'
          : 'No FAQ categories have been created yet'}
      </Text>
      {canManageSettings() &&
        !categorySearchQuery &&
        categoryFilterActive === null && (
          <Button
            title='Create First Category'
            onPress={() => router.push('./faq-categories/new' as any)}
            variant='primary'
            icon={<Plus size={20} color={colors.white} />}
            style={styles.emptyStateButton}
          />
        )}
    </View>
  );

  const renderCategoriesHeader = () => (
    <View style={styles.listHeader}>
      {/* Categories Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Folder size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{categoryStats.total}</Text>
            <Text style={styles.quickStatLabel}>Total Categories</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Activity size={16} color={colors.success} />
            </View>
            <Text style={styles.quickStatValue}>{categoryStats.active}</Text>
            <Text style={styles.quickStatLabel}>Active</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.infoLight },
              ]}
            >
              <MessageSquare size={16} color={colors.info} />
            </View>
            <Text style={styles.quickStatValue}>{faqStats.total}</Text>
            <Text style={styles.quickStatLabel}>Total FAQs</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <TrendingUp size={16} color={colors.warning} />
            </View>
            <Text style={styles.quickStatValue}>{categoryStats.withFaqs}</Text>
            <Text style={styles.quickStatLabel}>With FAQs</Text>
          </View>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={16}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                showFilters && styles.filterButtonTextActive,
              ]}
            >
              Filters
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => toggleCategorySort('name')}
          >
            {categorySortBy === 'name' ? (
              categorySortOrder === 'asc' ? (
                <SortAsc size={16} color={colors.primary} />
              ) : (
                <SortDesc size={16} color={colors.primary} />
              )
            ) : (
              <SortAsc size={16} color={colors.textSecondary} />
            )}
            <Text style={styles.sortButtonText}>Name</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionBarRight}>
          <TouchableOpacity
            style={[
              styles.manageButton,
              currentView === 'faqs' && styles.manageButtonActive,
            ]}
            onPress={handleToggleView}
          >
            <MessageSquare size={16} color={colors.primary} />
            <Text
              style={[styles.manageButtonText, styles.manageButtonTextActive]}
            >
              FAQs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  categoryFilterActive === null && styles.filterChipActive,
                ]}
                onPress={() => handleCategoryStatusFilter(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    categoryFilterActive === null &&
                      styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  categoryFilterActive === true && styles.filterChipActive,
                ]}
                onPress={() => handleCategoryStatusFilter(true)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    categoryFilterActive === true &&
                      styles.filterChipTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  categoryFilterActive === false && styles.filterChipActive,
                ]}
                onPress={() => handleCategoryStatusFilter(false)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    categoryFilterActive === false &&
                      styles.filterChipTextActive,
                  ]}
                >
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={categorySearchQuery}
          onChangeText={setCategorySearchQuery}
          placeholder='Search categories...'
        />
      </View>

      {filteredAndSortedCategories.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>
            Categories ({filteredAndSortedCategories.length})
          </Text>
        </View>
      )}
    </View>
  );

  if (!canViewSettings()) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'FAQs' }} />
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>
            You don't have permission to view FAQs.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'FAQs',
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

      {currentView === 'faqs' ? (
        loading.faqs ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
            <Text style={styles.loadingText}>Loading FAQs...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredFaqs}
            renderItem={renderFAQItem}
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
        )
      ) : loading.categories ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading Categories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedCategories}
          renderItem={renderCategoryItem}
          ListHeaderComponent={renderCategoriesHeader}
          ListEmptyComponent={renderCategoriesEmptyState}
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
      {canManageSettings() && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={
            currentView === 'faqs'
              ? handleAddFAQ
              : () => router.push('./faq-categories/new' as any)
          }
          activeOpacity={0.8}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  listHeader: {
    padding: 12,
    gap: 16,
  },
  quickStats: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  sortButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  manageButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  manageButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  manageButtonTextActive: {
    color: colors.primary,
  },
  filtersPanel: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  searchContainer: {
    marginBottom: 8,
  },
  sectionDivider: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: colors.background + '40',
    marginHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    width: 200,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: colors.errorLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
});
