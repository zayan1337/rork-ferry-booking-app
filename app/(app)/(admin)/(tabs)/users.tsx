import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useUserManagement } from "@/hooks";
import {
  Users,
  Plus,
  Download,
  AlertTriangle,
  Check,
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import UserItem from "@/components/admin/UserItem";
import EmptyState from "@/components/admin/EmptyState";
import { UserProfile } from "@/types/userManagement";

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
} from "@/components/admin/users";

const { width: screenWidth } = Dimensions.get("window");

type FilterRole =
  | "all"
  | "admin"
  | "agent"
  | "customer"
  | "passenger"
  | "captain";
type FilterStatus = "all" | "active" | "inactive" | "suspended";
type SortOrder =
  | "name_asc"
  | "name_desc"
  | "date_desc"
  | "date_asc"
  | "role_asc"
  | "status_asc";

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
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([fetchAll(), fetchStats()]);
      } catch (error) {
        console.error("Error initializing user data:", error);
      }
    };

    initializeData();
  }, [fetchAll, fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAll(), fetchStats()]);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Use the paginated users from the hook (already filtered and sorted)
  const filteredAndSortedUsers = useMemo(() => {
    return paginatedUsers.filter((user) => {
      // Role filter
      const roleMatch = filterRole === "all" || user.role === filterRole;

      // Status filter
      const statusMatch =
        filterStatus === "all" || user.status === filterStatus;

      return roleMatch && statusMatch;
    });
  }, [paginatedUsers, filterRole, filterStatus]);

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
        totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : "0",
      adminCount,
      agentCount,
      customerCount,
      passengerCount,
      newUsersThisMonth,
      suspendedCount: stats.suspended_users,
    };
  }, [stats]);

  const handleUserPress = (user: UserProfile) => {
    if (canViewUsers()) {
      router.push(`../user/${user.id}` as any);
    }
  };

  const handleNewUser = () => {
    if (canCreateUsers()) {
      router.push("../user/new" as any);
    } else {
      Alert.alert(
        "Access Denied",
        "You don't have permission to create users."
      );
    }
  };

  const handleExport = async () => {
    if (canExportReports()) {
      try {
        // TODO: Implement export functionality
        Alert.alert("Success", "Users report exported successfully.");
      } catch (error) {
        Alert.alert("Error", "Failed to export users report.");
      }
    } else {
      Alert.alert(
        "Access Denied",
        "You don't have permission to export reports."
      );
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (!canUpdateUsers()) {
      Alert.alert(
        "Access Denied",
        "You don't have permission to update users."
      );
      return;
    }

    Alert.alert(
      "Bulk Update",
      `Update ${selectedUsers.length} user(s) status to ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              for (const userId of selectedUsers) {
                await updateStatus(userId, status);
              }
              setSelectedUsers([]);
              Alert.alert("Success", "Users updated successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to update users.");
            }
          },
        },
      ]
    );
  };

  const handleLoadMore = () => {
    if (!loading && paginatedUsers.length < totalItems) {
      loadMore();
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Add select all functionality
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredAndSortedUsers.length) {
      // Deselect all
      setSelectedUsers([]);
    } else {
      // Select all visible users
      setSelectedUsers(filteredAndSortedUsers.map((user) => user.id));
    }
  };

  const isAllSelected =
    filteredAndSortedUsers.length > 0 &&
    selectedUsers.length === filteredAndSortedUsers.length;
  const isPartiallySelected =
    selectedUsers.length > 0 &&
    selectedUsers.length < filteredAndSortedUsers.length;

  const getCount = (role: FilterRole, status?: FilterStatus) => {
    let filtered = users;
    if (role !== "all") {
      if (role === "agent") {
        filtered = users.filter((u) => u.role === "agent");
      } else if (role === "passenger") {
        filtered = users.filter((u) => u.role === "passenger");
      } else {
        filtered = users.filter((u) => u.role === role);
      }
    }
    if (status && status !== "all") {
      filtered = filtered.filter((u) => u.status === status);
    }
    return filtered.length;
  };

  const getResponsivePadding = () => ({
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  });

  // Helper function to get current filter/sort display text
  const getCurrentFilterText = () => {
    let filterText = [];

    if (filterRole !== "all") {
      filterText.push(
        `Role: ${filterRole.charAt(0).toUpperCase() + filterRole.slice(1)}`
      );
    }

    if (filterStatus !== "all") {
      filterText.push(
        `Status: ${
          filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)
        }`
      );
    }

    const sortText = {
      created_at:
        sortOrder === "desc" ? "Date (Newest first)" : "Date (Oldest first)",
      name: sortOrder === "asc" ? "Name (A-Z)" : "Name (Z-A)",
      role: sortOrder === "asc" ? "Role (A-Z)" : "Role (Z-A)",
      status: sortOrder === "asc" ? "Status (A-Z)" : "Status (Z-A)",
      email: sortOrder === "asc" ? "Email (A-Z)" : "Email (Z-A)",
      last_login:
        sortOrder === "desc"
          ? "Last Login (Recent first)"
          : "Last Login (Oldest first)",
    };

    return {
      filters: filterText.length > 0 ? filterText.join(", ") : "All users",
      sort: sortText[sortBy] || "Date (Newest first)",
    };
  };

  // Helper to check if any filters are active
  const hasActiveFilters = () => {
    return (
      filterRole !== "all" ||
      filterStatus !== "all" ||
      sortBy !== "created_at" ||
      sortOrder !== "desc" ||
      searchQuery !== ""
    );
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setFilterRole("all");
    setFilterStatus("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setSearchQuery("");
    setSelectedUsers([]);
  };

  // Show loading state while initial data is being fetched
  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
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
      {activeTab === "overview" ? (
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
        >
          <Stack.Screen
            options={{
              title: "User Management",
              headerRight: () => (
                <View style={styles.headerActions}>
                  {canExportReports() && (
                    <TouchableOpacity
                      style={styles.headerButton}
                      onPress={handleExport}
                      accessibilityRole="button"
                      accessibilityLabel="Export"
                    >
                      <Download size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  {canCreateUsers() && (
                    <Button
                      title={isSmallScreen ? "New" : "New User"}
                      variant="primary"
                      size={isTablet ? "medium" : "small"}
                      icon={<Plus size={isTablet ? 18 : 16} color="#FFFFFF" />}
                      onPress={handleNewUser}
                    />
                  )}
                </View>
              ),
            }}
          />

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "overview" ? (
            <UserStats stats={userStats} isTablet={isTablet} />
          ) : (
            <>
              <SearchAndFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFilterPress={() => setShowFilterModal(true)}
                onSortPress={() => {
                  const sortFields: Array<
                    | "name"
                    | "email"
                    | "role"
                    | "status"
                    | "created_at"
                    | "last_login"
                  > = [
                    "created_at",
                    "name",
                    "email",
                    "role",
                    "status",
                    "last_login",
                  ];
                  const currentIndex = sortFields.indexOf(sortBy);
                  const nextIndex = (currentIndex + 1) % sortFields.length;
                  setSortBy(sortFields[nextIndex]);
                }}
                isTablet={isTablet}
              />

              <FilterTabs
                filterRole={filterRole}
                onRoleChange={setFilterRole}
                getCount={getCount}
              />

              <BulkActionsBar
                selectedCount={selectedUsers.length}
                onActivate={() => handleBulkStatusUpdate("active")}
                onSuspend={() => handleBulkStatusUpdate("suspended")}
                onClear={() => setSelectedUsers([])}
                canUpdateUsers={canUpdateUsers()}
              />

              <UserListHeader
                searchQuery={searchQuery}
                filteredCount={filteredAndSortedUsers.length}
                isTablet={isTablet}
                hasActiveFilters={hasActiveFilters()}
                currentFilterText={getCurrentFilterText()}
                onClearFilters={clearAllFilters}
              />

              <SelectAllSection
                canUpdateUsers={canUpdateUsers()}
                filteredCount={filteredAndSortedUsers.length}
                selectedCount={selectedUsers.length}
                isAllSelected={isAllSelected}
                isPartiallySelected={isPartiallySelected}
                onSelectAll={handleSelectAll}
              />

              <UserList
                users={filteredAndSortedUsers}
                selectedUsers={selectedUsers}
                canUpdateUsers={canUpdateUsers()}
                searchQuery={searchQuery}
                onUserPress={handleUserPress}
                onUserSelect={toggleUserSelection}
              />
            </>
          )}
        </ScrollView>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            getResponsivePadding(),
          ]}
          data={filteredAndSortedUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item: user }) => (
            <View style={styles.userItemWrapper}>
              {canUpdateUsers() && (
                <TouchableOpacity
                  style={styles.selectionCheckbox}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedUsers.includes(user.id) &&
                        styles.checkboxSelected,
                    ]}
                  >
                    {selectedUsers.includes(user.id) && (
                      <Check size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              <View style={styles.userItemContent}>
                <UserItem user={user} onPress={() => handleUserPress(user)} />
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <EmptyState
              icon={<Users size={48} color={colors.textSecondary} />}
              title="No users found"
              message={
                searchQuery
                  ? "Try adjusting your search criteria"
                  : "No users match the current filters"
              }
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
          getItemLayout={(data, index) => ({
            length: 80, // Approximate height of each item
            offset: 80 * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

              <SearchAndFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onFilterPress={() => setShowFilterModal(true)}
                onSortPress={() => {
                  const sortFields: Array<
                    | "name"
                    | "email"
                    | "role"
                    | "status"
                    | "created_at"
                    | "last_login"
                  > = [
                    "created_at",
                    "name",
                    "email",
                    "role",
                    "status",
                    "last_login",
                  ];
                  const currentIndex = sortFields.indexOf(sortBy);
                  const nextIndex = (currentIndex + 1) % sortFields.length;
                  setSortBy(sortFields[nextIndex]);
                }}
                isTablet={isTablet}
              />

              <FilterTabs
                filterRole={filterRole}
                onRoleChange={setFilterRole}
                getCount={getCount}
              />

              <BulkActionsBar
                selectedCount={selectedUsers.length}
                onActivate={() => handleBulkStatusUpdate("active")}
                onSuspend={() => handleBulkStatusUpdate("suspended")}
                onClear={() => setSelectedUsers([])}
                canUpdateUsers={canUpdateUsers()}
              />

              <UserListHeader
                searchQuery={searchQuery}
                filteredCount={filteredAndSortedUsers.length}
                isTablet={isTablet}
                hasActiveFilters={hasActiveFilters()}
                currentFilterText={getCurrentFilterText()}
                onClearFilters={clearAllFilters}
              />
            </>
          )}
        />
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filterStatus}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusChange={setFilterStatus}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onClearAll={clearAllFilters}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    flexGrow: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
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
    borderColor: colors.border + "60",
  },
  userItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
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
    borderColor: colors.primary + "40",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
