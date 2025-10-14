import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshControl,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useUserManagement } from '@/hooks';
import { Users, Download, AlertTriangle, Check } from 'lucide-react-native';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import UserItem from '@/components/admin/UserItem';
import EmptyState from '@/components/admin/EmptyState';
import { UserProfile } from '@/types/userManagement';
import ExportModal, { type ExportFilter } from '@/components/admin/ExportModal';
import { exportUsers } from '@/utils/userExportUtils';

// Users Components
import {
  TabNavigation,
  SearchAndFilterBar,
  FilterTabs,
  BulkActionsBar,
  FilterModal,
  UserListHeader,
  SelectAllSection,
  UserList,
  UserStats,
} from '@/components/admin/users';

const { width: screenWidth } = Dimensions.get('window');

type FilterRole =
  | 'all'
  | 'admin'
  | 'agent'
  | 'customer'
  | 'passenger'
  | 'captain';
type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';
type SortOrder =
  | 'name_asc'
  | 'name_desc'
  | 'date_desc'
  | 'date_asc'
  | 'role_asc'
  | 'status_asc';

export default function UsersScreen() {
  const {
    users,
    stats,
    loading,
    error,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    filteredUsers,
    sortedUsers,
    paginatedUsers,
    currentPage,
    itemsPerPage,
    totalItems,
    fetchAll,
    fetchStats,
    updateStatus,
    updateRole,
    delete: deleteUser,
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    setCurrentPage,
    setItemsPerPage,
    loadMore,
    formatCurrency,
    formatDate,
  } = useUserManagement();

  const {
    canViewUsers,
    canCreateUsers,
    canUpdateUsers,
    canDeleteUsers,
    canManageRoles,
    canExportReports,
  } = useAdminPermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  // Local search state - completely client-side, no store updates
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  // Client-side filtering using local search query for immediate results
  const displayUsers = React.useMemo(() => {
    if (!localSearchQuery.trim()) return paginatedUsers;

    const query = localSearchQuery.toLowerCase().trim();
    return paginatedUsers.filter(user => {
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.mobile_number?.toLowerCase().includes(query) ||
        user.id?.toLowerCase().includes(query)
      );
    });
  }, [paginatedUsers, localSearchQuery]);

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([fetchAll(), fetchStats()]);
      } catch (error) {
        console.error('Error initializing user data:', error);
      }
    };

    initializeData();
  }, [fetchAll, fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAll(), fetchStats()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced statistics
  const userStats = useMemo(() => {
    const totalUsers = stats.total_users;
    const activeUsers = stats.active_users;
    const adminCount = stats.admin_count;
    const agentCount = stats.agent_count;
    const customerCount = stats.customer_count;
    const passengerCount = stats.passenger_count;
    const newUsersThisMonth = stats.new_users_this_month;

    return {
      totalUsers,
      activeUsers,
      activeRate:
        totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0',
      adminCount,
      agentCount,
      customerCount,
      passengerCount,
      newUsersThisMonth,
      suspendedCount: stats.suspended_users,
    };
  }, [stats]);

  const handleUserPress = useCallback(
    (user: UserProfile) => {
      if (canViewUsers()) {
        router.push(`../user/${user.id}` as any);
      }
    },
    [canViewUsers]
  );

  const handleNewUser = useCallback(() => {
    if (canCreateUsers()) {
      router.push('../user/new' as any);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to create users."
      );
    }
  }, [canCreateUsers]);

  const handleExport = useCallback(() => {
    if (canExportReports()) {
      setShowExportModal(true);
    } else {
      Alert.alert(
        'Access Denied',
        "You don't have permission to export reports."
      );
    }
  }, [canExportReports]);

  const handleExportConfirm = useCallback(
    async (filters: ExportFilter) => {
      try {
        // Use all users or filtered users based on current view
        const usersToExport = users;
        await exportUsers(usersToExport, filters);
      } catch (error) {
        console.error('Export error:', error);
        Alert.alert(
          'Export Failed',
          'Failed to export users. Please try again.'
        );
      }
    },
    [users]
  );

  const handleBulkStatusUpdate = async (status: string) => {
    if (!canUpdateUsers()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to update users."
      );
      return;
    }

    Alert.alert(
      'Bulk Update',
      `Update ${selectedUsers.length} user(s) status to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              for (const userId of selectedUsers) {
                await updateStatus(userId, status);
              }
              setSelectedUsers([]);
              Alert.alert('Success', 'Users updated successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to update users.');
            }
          },
        },
      ]
    );
  };

  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && paginatedUsers.length < totalItems) {
      setLoadingMore(true);
      loadMore();
      // Reset loading state after a short delay to show the spinner
      setTimeout(() => setLoadingMore(false), 500);
    }
  }, [loadingMore, paginatedUsers.length, totalItems, loadMore]);

  // Footer component for loading indicator
  const renderFooter = useCallback(() => {
    const hasMoreData = paginatedUsers.length < totalItems;
    const remainingUsers = totalItems - paginatedUsers.length;

    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <LoadingSpinner size='small' />
          <Text style={styles.footerLoaderText}>Loading more users...</Text>
        </View>
      );
    }

    if (hasMoreData) {
      return (
        <View style={styles.footerIndicator}>
          <Text style={styles.footerIndicatorText}>
            {remainingUsers} more • Scroll to load
          </Text>
        </View>
      );
    }

    // No more data to load
    if (paginatedUsers.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            • All loaded ({paginatedUsers.length}) •
          </Text>
        </View>
      );
    }

    return null;
  }, [loadingMore, paginatedUsers.length, totalItems]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  // Add select all functionality
  const handleSelectAll = useCallback(() => {
    if (selectedUsers.length === displayUsers.length) {
      // Deselect all
      setSelectedUsers([]);
    } else {
      // Select all visible users
      setSelectedUsers(displayUsers.map(user => user.id));
    }
  }, [selectedUsers.length, displayUsers]);

  const isAllSelected =
    displayUsers.length > 0 && selectedUsers.length === displayUsers.length;
  const isPartiallySelected =
    selectedUsers.length > 0 && selectedUsers.length < displayUsers.length;

  const getCount = (role: FilterRole) => {
    // Always count from all users, ignoring current filters
    // Tab counts should show total users in each role
    if (role === 'all') {
      return users.length;
    }
    return users.filter(u => u.role === role).length;
  };

  const getResponsivePadding = () => ({
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  });

  // Helper function to get current filter/sort display text
  const getCurrentFilterText = () => {
    const filterText = [];

    if (filters.role && filters.role !== 'all') {
      filterText.push(
        `Role: ${filters.role.charAt(0).toUpperCase() + filters.role.slice(1)}`
      );
    }

    if (filters.status && filters.status !== 'all') {
      filterText.push(
        `Status: ${
          filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
        }`
      );
    }

    const sortText = {
      created_at:
        sortOrder === 'desc' ? 'Date (Newest first)' : 'Date (Oldest first)',
      name: sortOrder === 'asc' ? 'Name (A-Z)' : 'Name (Z-A)',
      role: sortOrder === 'asc' ? 'Role (A-Z)' : 'Role (Z-A)',
      status: sortOrder === 'asc' ? 'Status (A-Z)' : 'Status (Z-A)',
      email: sortOrder === 'asc' ? 'Email (A-Z)' : 'Email (Z-A)',
      last_login:
        sortOrder === 'desc'
          ? 'Last Login (Recent first)'
          : 'Last Login (Oldest first)',
    };

    return {
      filters: filterText.length > 0 ? filterText.join(', ') : 'All users',
      sort: sortText[sortBy] || 'Date (Newest first)',
    };
  };

  // Helper to check if any filters are active
  const hasActiveFilters = () => {
    return (
      (filters.role && filters.role !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      sortBy !== 'created_at' ||
      sortOrder !== 'desc' ||
      localSearchQuery !== ''
    );
  };

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    setFilters({ role: 'all', status: 'all' });
    setSortBy('created_at');
    setSortOrder('desc');
    setSearchQuery('');
    setLocalSearchQuery(''); // Clear local search as well
    setSelectedUsers([]);
  }, [setFilters, setSortBy, setSortOrder, setSearchQuery]);

  // Memoized keyExtractor
  const keyExtractor = useCallback((item: UserProfile) => item.id, []);

  // Memoized renderItem for FlatList
  const renderUserItem = useCallback(
    ({ item: user }: { item: UserProfile }) => (
      <View style={styles.userItemWrapper}>
        {canUpdateUsers() && (
          <TouchableOpacity
            style={styles.selectionCheckbox}
            onPress={() => toggleUserSelection(user.id)}
          >
            <View
              style={[
                styles.checkbox,
                selectedUsers.includes(user.id) && styles.checkboxSelected,
              ]}
            >
              {selectedUsers.includes(user.id) && (
                <Check size={14} color='white' />
              )}
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.userItemContent}>
          <UserItem user={user} onPress={() => handleUserPress(user)} />
        </View>
      </View>
    ),
    [canUpdateUsers, selectedUsers, toggleUserSelection, handleUserPress]
  );

  // Show loading state while initial data is being fetched
  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size='large' />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (!canViewUsers()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view users.
        </Text>
      </View>
    );
  }

  return (
    <>
      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            getResponsivePadding(),
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            if (activeTab !== ('users' as any)) return;

            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 100; // Trigger 100px before bottom

            if (isCloseToBottom) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          <Stack.Screen
            options={{
              title: 'User Management',
              headerRight: () => (
                <View style={styles.headerActions}>
                  {canExportReports() && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={handleExport}
                      accessibilityRole='button'
                      accessibilityLabel='Export'
                    >
                      <Download size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              ),
            }}
          />

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'overview' ? (
            <UserStats stats={userStats} isTablet={isTablet} />
          ) : (
            <>
              <SearchAndFilterBar
                searchQuery={localSearchQuery}
                onSearchChange={setLocalSearchQuery}
                onFilterPress={() => setShowFilterModal(true)}
                onSortPress={() => {
                  const sortFields: (
                    | 'name'
                    | 'email'
                    | 'role'
                    | 'status'
                    | 'created_at'
                    | 'last_login'
                  )[] = [
                    'created_at',
                    'name',
                    'email',
                    'role',
                    'status',
                    'last_login',
                  ];
                  const currentIndex = sortFields.indexOf(sortBy);
                  const nextIndex = (currentIndex + 1) % sortFields.length;
                  setSortBy(sortFields[nextIndex]);
                }}
                isTablet={isTablet}
              />

              <FilterTabs
                filterRole={filters.role || 'all'}
                onRoleChange={role => setFilters({ ...filters, role })}
                getCount={getCount}
              />

              <BulkActionsBar
                selectedCount={selectedUsers.length}
                onActivate={() => handleBulkStatusUpdate('active')}
                onSuspend={() => handleBulkStatusUpdate('suspended')}
                onClear={() => setSelectedUsers([])}
                canUpdateUsers={canUpdateUsers()}
              />

              <UserListHeader
                searchQuery={localSearchQuery}
                filteredCount={displayUsers.length}
                isTablet={isTablet}
                hasActiveFilters={hasActiveFilters()}
                currentFilterText={getCurrentFilterText()}
                onClearFilters={clearAllFilters}
              />

              <SelectAllSection
                canUpdateUsers={canUpdateUsers()}
                filteredCount={displayUsers.length}
                selectedCount={selectedUsers.length}
                isAllSelected={isAllSelected}
                isPartiallySelected={isPartiallySelected}
                onSelectAll={handleSelectAll}
              />

              <UserList
                users={displayUsers}
                selectedUsers={selectedUsers}
                canUpdateUsers={canUpdateUsers()}
                searchQuery={localSearchQuery}
                onUserPress={handleUserPress}
                onUserSelect={toggleUserSelection}
              />

              {renderFooter()}
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          <Stack.Screen
            options={{
              title: 'User Management',
              headerRight: () => (
                <View style={styles.headerActions}>
                  {canExportReports() && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={handleExport}
                      accessibilityRole='button'
                      accessibilityLabel='Export'
                    >
                      <Download size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              ),
            }}
          />
          <View style={[getResponsivePadding()]}>
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <SearchAndFilterBar
              searchQuery={localSearchQuery}
              onSearchChange={setLocalSearchQuery}
              onFilterPress={() => setShowFilterModal(true)}
              onSortPress={() => {
                const sortFields: (
                  | 'name'
                  | 'email'
                  | 'role'
                  | 'status'
                  | 'created_at'
                  | 'last_login'
                )[] = [
                  'created_at',
                  'name',
                  'email',
                  'role',
                  'status',
                  'last_login',
                ];
                const currentIndex = sortFields.indexOf(sortBy);
                const nextIndex = (currentIndex + 1) % sortFields.length;
                setSortBy(sortFields[nextIndex]);
              }}
              isTablet={isTablet}
            />

            <FilterTabs
              filterRole={filters.role || 'all'}
              onRoleChange={role => setFilters({ ...filters, role })}
              getCount={getCount}
            />

            <BulkActionsBar
              selectedCount={selectedUsers.length}
              onActivate={() => handleBulkStatusUpdate('active')}
              onSuspend={() => handleBulkStatusUpdate('suspended')}
              onClear={() => setSelectedUsers([])}
              canUpdateUsers={canUpdateUsers()}
            />

            <UserListHeader
              searchQuery={localSearchQuery}
              filteredCount={displayUsers.length}
              isTablet={isTablet}
              hasActiveFilters={hasActiveFilters()}
              currentFilterText={getCurrentFilterText()}
              onClearFilters={clearAllFilters}
            />
          </View>
          <FlatList
            style={styles.flatListContainer}
            contentContainerStyle={[
              styles.contentContainer,
              getResponsivePadding(),
            ]}
            data={displayUsers}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps='handled'
            renderItem={renderUserItem}
            ListEmptyComponent={() => (
              <EmptyState
                icon={<Users size={48} color={colors.textSecondary} />}
                title='No users found'
                message={
                  localSearchQuery
                    ? 'Try adjusting your search criteria'
                    : 'No users match the current filters'
                }
              />
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            removeClippedSubviews={true}
            maxToRenderPerBatch={15}
            windowSize={5}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderFooter}
          />
        </View>
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filters.status || ('all' as any)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusChange={status => setFilters({ ...filters, status })}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onClearAll={clearAllFilters}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
        title='Export Users'
        description='Select filters and file type to export user data'
        roleOptions={[
          { value: 'all', label: 'All Users' },
          { value: 'admin', label: 'Admins' },
          { value: 'agent', label: 'Agents' },
          { value: 'customer', label: 'Customers' },
          { value: 'passenger', label: 'Passengers' },
          { value: 'captain', label: 'Captains' },
        ]}
        showRoleFilter={true}
        showDateFilter={true}
        fileTypes={['excel', 'pdf', 'csv']}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  flatListContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${colors.border}60`,
  },
  userItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCheckbox: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userItemContent: {
    flex: 1,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  footerIndicator: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}08`,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 6,
  },
  footerIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  footerEnd: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerEndText: {
    fontSize: 11,
    color: colors.textSecondary,
    opacity: 0.6,
  },
});
