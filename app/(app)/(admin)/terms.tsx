import React, { useState, useEffect } from 'react';
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
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { TermsAndConditions } from '@/types/content';
import {
  ArrowLeft,
  Plus,
  FileText,
  Filter,
  SortAsc,
  SortDesc,
  Activity,
  Hash,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import TermsItem from '@/components/admin/TermsItem';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TermsScreen() {
  const { canViewContent, canManageContent } = useAdminPermissions();

  const {
    terms: allTerms,
    loading,
    termsStats,
    fetchTerms,
    deleteTerms,
    error,
    clearError,
  } = useContentManagement();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterVersion, setFilterVersion] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    'title' | 'version' | 'effective_date' | 'created_at'
  >('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTerms();
    setIsRefreshing(false);
  };

  const loadTermsData = async () => {
    if (!allTerms || allTerms.length === 0) {
      await fetchTerms();
    }
  };

  useEffect(() => {
    if (canViewContent()) {
      loadTermsData();
    }
  }, []);

  const handleTermPress = (termId: string) => {
    router.push(`./terms/${termId}` as any);
  };

  const handleAddTerm = () => {
    if (canManageContent()) {
      router.push('./terms/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create terms and conditions."
      );
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort terms
  const filteredAndSortedTerms = React.useMemo(() => {
    let filtered = allTerms || [];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        term =>
          term.title.toLowerCase().includes(query) ||
          term.version.toLowerCase().includes(query) ||
          term.content.toLowerCase().includes(query)
      );
    }

    // Apply active filter
    if (filterActive !== null) {
      filtered = filtered.filter(term => term.is_active === filterActive);
    }

    // Apply version filter
    if (filterVersion) {
      filtered = filtered.filter(term => term.version === filterVersion);
    }

    // Sort terms
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'version':
          aValue = a.version;
          bValue = b.version;
          break;
        case 'effective_date':
          aValue = new Date(a.effective_date).getTime();
          bValue = new Date(b.effective_date).getTime();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return sorted;
  }, [allTerms, searchQuery, filterActive, filterVersion, sortBy, sortOrder]);

  // Use stats from the hook
  const stats = React.useMemo(() => {
    return {
      total: termsStats.total,
      active: termsStats.active,
      inactive: termsStats.inactive,
      versions: termsStats.versions.length,
    };
  }, [termsStats]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterActive(null);
    setFilterVersion(null);
    setSortBy('title');
    setSortOrder('asc');
  };

  const renderTermItem = ({
    item,
    index,
  }: {
    item: TermsAndConditions;
    index: number;
  }) => <TermsItem key={item.id} terms={item} onPress={handleTermPress} />;

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
              <FileText size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{stats.total}</Text>
            <Text style={styles.quickStatLabel}>Total</Text>
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
            <Text style={styles.quickStatValue}>{stats.active}</Text>
            <Text style={styles.quickStatLabel}>Active</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.infoLight },
              ]}
            >
              <Hash size={16} color={colors.info} />
            </View>
            <Text style={styles.quickStatValue}>{stats.versions}</Text>
            <Text style={styles.quickStatLabel}>Versions</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.backgroundTertiary },
              ]}
            >
              <FileText size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.quickStatValue}>{stats.inactive}</Text>
            <Text style={styles.quickStatLabel}>Inactive</Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <SearchBar
          placeholder='Search terms by title, version, or content...'
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <TouchableOpacity
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
          </TouchableOpacity>

          <View style={styles.sortControl}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'title' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('title')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'title' && styles.sortButtonTextActive,
                ]}
              >
                Title
              </Text>
              {sortBy === 'title' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'version' && styles.sortButtonActive,
              ]}
              onPress={() => toggleSort('version')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'version' && styles.sortButtonTextActive,
                ]}
              >
                Version
              </Text>
              {sortBy === 'version' &&
                (sortOrder === 'asc' ? (
                  <SortAsc size={12} color={colors.primary} />
                ) : (
                  <SortDesc size={12} color={colors.primary} />
                ))}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlsRight}>
          <Text style={styles.resultsCount}>
            {filteredAndSortedTerms.length} term
            {filteredAndSortedTerms.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Filter Options (Collapsible) */}
      {showFilters && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterSectionTitle}>Filter by Status</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === null && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === null && styles.filterChipTextActive,
                ]}
              >
                All Terms
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === true && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive(true)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === true && styles.filterChipTextActive,
                ]}
              >
                Active Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterActive === false && styles.filterChipActive,
              ]}
              onPress={() => setFilterActive(false)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterActive === false && styles.filterChipTextActive,
                ]}
              >
                Inactive Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Section Divider */}
      {filteredAndSortedTerms.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>Terms & Conditions</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <FileText size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No terms found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || filterActive !== null
          ? 'Try adjusting your search or filter criteria'
          : 'No terms and conditions have been created yet'}
      </Text>
      {canManageContent() && !searchQuery && filterActive === null && (
        <Button
          title='Create First Terms'
          onPress={handleAddTerm}
          variant='primary'
          icon={<Plus size={20} color={colors.white} />}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );

  if (!canViewContent()) {
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
            <FileText size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view terms and conditions.
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
          title: 'Terms & Conditions',
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

      {loading.terms && allTerms === undefined ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>
            Loading terms and conditions...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedTerms}
          renderItem={renderTermItem}
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
      {canManageContent() && filteredAndSortedTerms.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleAddTerm}
          activeOpacity={0.8}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
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
    paddingHorizontal: 12,
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
