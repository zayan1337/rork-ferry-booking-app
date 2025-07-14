import React, { useState, useMemo } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
    Alert,
    Modal
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    Users,
    Plus,
    Shield,
    UserCheck,
    BarChart,
    Settings,
    TrendingUp,
    FileText,
    Bell,
    Lock,
    Database,
    Download,
    Filter,
    ArrowUpDown,
    Search,
    Mail,
    Phone,
    Calendar,
    Eye,
    Edit,
    Trash2,
    AlertTriangle,
    X,
    Check,
    Crown,
    User,
    UserX,
    Activity
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import UserItem from "@/components/admin/UserItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { UserProfile } from "@/types/userManagement";

// Users Components
import UserStats from "@/components/admin/users/UserStats";

const { width: screenWidth } = Dimensions.get('window');

type FilterRole = "all" | "admin" | "agent" | "customer" | "passenger";
type FilterStatus = "all" | "active" | "inactive" | "suspended";
type SortOrder = "name_asc" | "name_desc" | "date_desc" | "date_asc" | "role_asc" | "status_asc";

export default function UsersScreen() {
    const {
        users,
        passengers,
        dashboardStats,
        refreshData,
        updateUserStatus,
        updateUserRole,
        deleteUser,
        exportUsersReport
    } = useAdminStore();

    const {
        canViewUsers,
        canCreateUsers,
        canUpdateUsers,
        canDeleteUsers,
        canManageRoles,
        canExportReports
    } = useAdminPermissions();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<FilterRole>("all");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "agents" | "passengers">("overview");

    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshData();
        } catch (error) {
            console.error("Refresh error:", error);
        } finally {
            setRefreshing(false);
        }
    };

    // Enhanced filtering and sorting
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = users.filter((user) => {
            // Text search
            const searchMatch = searchQuery === "" ||
                (user?.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (user?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (user?.mobile_number?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (user?.id || "").includes(searchQuery);

            // Role filter
            const roleMatch = filterRole === "all" || user.role === filterRole;

            // Status filter
            const statusMatch = filterStatus === "all" || user.status === filterStatus;

            return searchMatch && roleMatch && statusMatch;
        });

        // Sorting
        return filtered.sort((a, b) => {
            switch (sortOrder) {
                case "name_asc":
                    return (a.name || "").localeCompare(b.name || "");
                case "name_desc":
                    return (b.name || "").localeCompare(a.name || "");
                case "date_asc":
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case "date_desc":
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case "role_asc":
                    return (a.role || "").localeCompare(b.role || "");
                case "status_asc":
                    return (a.status || "").localeCompare(b.status || "");
                default:
                    return 0;
            }
        });
    }, [users, searchQuery, filterRole, filterStatus, sortOrder]);

    // Enhanced statistics
    const stats = useMemo(() => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === "active").length;
        const adminCount = users.filter(u => u.role === "admin").length;
        const agentCount = users.filter(u => u.role === "agent").length;
        const customerCount = users.filter(u => u.role === "customer").length;
        const passengerCount = passengers?.length || 0;
        const newUsersThisMonth = users.filter(u => {
            const userDate = new Date(u.created_at);
            const now = new Date();
            return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
        }).length;

        return {
            totalUsers,
            activeUsers,
            activeRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(1) : "0",
            adminCount,
            agentCount,
            customerCount,
            passengerCount,
            newUsersThisMonth,
            suspendedCount: users.filter(u => u.status === "suspended").length
        };
    }, [users, passengers]);

    const handleUserPress = (user: UserProfile) => {
        if (canViewUsers()) {
            router.push(`../user/${user.id}` as any);
        }
    };

    const handleNewUser = () => {
        if (canCreateUsers()) {
            router.push("../user/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create users.");
        }
    };

    const handleExport = async () => {
        if (canExportReports()) {
            try {
                await exportUsersReport(filteredAndSortedUsers);
                Alert.alert("Success", "Users report exported successfully.");
            } catch (error) {
                Alert.alert("Error", "Failed to export users report.");
            }
        } else {
            Alert.alert("Access Denied", "You don't have permission to export reports.");
        }
    };

    const handleBulkStatusUpdate = async (status: string) => {
        if (!canUpdateUsers()) {
            Alert.alert("Access Denied", "You don't have permission to update users.");
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
                                await updateUserStatus(userId, status);
                            }
                            setSelectedUsers([]);
                            Alert.alert("Success", "Users updated successfully.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to update users.");
                        }
                    }
                }
            ]
        );
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
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
            setSelectedUsers(filteredAndSortedUsers.map(user => user.id));
        }
    };

    const isAllSelected = filteredAndSortedUsers.length > 0 && selectedUsers.length === filteredAndSortedUsers.length;
    const isPartiallySelected = selectedUsers.length > 0 && selectedUsers.length < filteredAndSortedUsers.length;

    const getCount = (role: FilterRole, status?: FilterStatus) => {
        let filtered = users;
        if (role !== "all") {
            if (role === "agent") {
                filtered = users.filter(u => u.role === "agent");
            } else if (role === "passenger") {
                // Convert passengers to user-like objects for counting
                return passengers?.length || 0;
            } else {
                filtered = users.filter(u => u.role === role);
            }
        }
        if (status && status !== "all") {
            filtered = filtered.filter(u => u.status === status);
        }
        return filtered.length;
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "admin":
                return <Crown size={16} color={colors.danger} />;
            case "agent":
                return <UserCheck size={16} color={colors.primary} />;
            case "customer":
                return <User size={16} color={colors.secondary} />;
            case "passenger":
                return <Users size={16} color={colors.success} />;
            default:
                return <User size={16} color={colors.textSecondary} />;
        }
    };

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    // Helper function to get current filter/sort display text
    const getCurrentFilterText = () => {
        let filterText = [];

        if (filterRole !== "all") {
            filterText.push(`Role: ${filterRole.charAt(0).toUpperCase() + filterRole.slice(1)}`);
        }

        if (filterStatus !== "all") {
            filterText.push(`Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`);
        }

        const sortText = {
            "date_desc": "Date (Newest first)",
            "date_asc": "Date (Oldest first)",
            "name_asc": "Name (A-Z)",
            "name_desc": "Name (Z-A)",
            "role_asc": "Role (A-Z)",
            "status_asc": "Status (A-Z)"
        };

        return {
            filters: filterText.length > 0 ? filterText.join(", ") : "All users",
            sort: sortText[sortOrder]
        };
    };

    // Helper to check if any filters are active
    const hasActiveFilters = () => {
        return filterRole !== "all" || filterStatus !== "all" || sortOrder !== "date_desc" || searchQuery !== "";
    };

    // Clear all filters function
    const clearAllFilters = () => {
        setFilterRole("all");
        setFilterStatus("all");
        setSortOrder("date_desc");
        setSearchQuery("");
        setSelectedUsers([]);
    };

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
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
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

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    {[
                        { key: "overview", label: "Overview", icon: <BarChart size={16} color={activeTab === "overview" ? colors.primary : colors.primary} /> },
                        { key: "users", label: "All Users", icon: <Users size={16} color={activeTab === "users" ? colors.primary : colors.primary} /> },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.key as any)}
                        >
                            {tab.icon}
                            <Text style={[
                                styles.tabText,
                                activeTab === tab.key && styles.tabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === "overview" ? (
                    <UserStats stats={stats} isTablet={isTablet} />
                ) : (
                    <>
                        {/* Enhanced Search and Filter */}
                        <View style={styles.searchContainer}>
                            <View style={styles.searchWrapper}>
                                <SearchBar
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Search by name, email, phone, or ID..."
                                />
                            </View>
                            <Button
                                title=""
                                variant="outline"
                                size={isTablet ? "large" : "medium"}
                                icon={<Filter size={isTablet ? 20 : 18} color={colors.primary} />}
                                onPress={() => setShowFilterModal(true)}
                            />
                            <Button
                                title=""
                                variant="outline"
                                size={isTablet ? "large" : "medium"}
                                icon={<ArrowUpDown size={isTablet ? 20 : 18} color={colors.primary} />}
                                onPress={() => {
                                    const sortOptions: SortOrder[] = ["date_desc", "date_asc", "name_asc", "name_desc", "role_asc", "status_asc"];
                                    const currentIndex = sortOptions.indexOf(sortOrder);
                                    const nextIndex = (currentIndex + 1) % sortOptions.length;
                                    setSortOrder(sortOptions[nextIndex]);
                                }}
                            />
                        </View>

                        {/* Filter Tabs */}
                        <View style={styles.filterTabs}>
                            {(["all", "admin", "agent", "customer", "passenger"] as FilterRole[]).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.filterTab,
                                        filterRole === role && styles.filterTabActive
                                    ]}
                                    onPress={() => setFilterRole(role)}
                                >
                                    <Text style={[
                                        styles.filterTabText,
                                        filterRole === role && styles.filterTabTextActive
                                    ]}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </Text>
                                    <Text style={[
                                        styles.filterTabCount,
                                        filterRole === role && styles.filterTabCountActive
                                    ]}>
                                        {getCount(role)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Bulk Actions Bar */}
                        {selectedUsers.length > 0 && (
                            <View style={styles.bulkActionsBar}>
                                <Text style={styles.bulkActionsText}>
                                    {selectedUsers.length} user(s) selected
                                </Text>
                                <View style={styles.bulkActionsButtons}>
                                    {canUpdateUsers() && (
                                        <>
                                            <Button
                                                title="Activate"
                                                variant="primary"
                                                size="small"
                                                onPress={() => handleBulkStatusUpdate("active")}
                                            />
                                            <Button
                                                title="Suspend"
                                                variant="danger"
                                                size="small"
                                                onPress={() => handleBulkStatusUpdate("suspended")}
                                            />
                                        </>
                                    )}
                                    <Button
                                        title="Clear"
                                        variant="ghost"
                                        size="small"
                                        onPress={() => setSelectedUsers([])}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Users List */}
                        <View style={styles.section}>
                            <View style={styles.usersHeader}>
                                <SectionHeader
                                    title={searchQuery ? "Search Results" : "Users"}
                                    subtitle={`${filteredAndSortedUsers.length} ${filteredAndSortedUsers.length === 1 ? 'user' : 'users'} found`}
                                    size={isTablet ? "large" : "medium"}
                                />
                            </View>

                            {/* Compact Filter Status - Full width */}
                            {(hasActiveFilters() || filteredAndSortedUsers.length > 0) && (
                                <View style={styles.compactFilterStatus}>
                                    <Text style={styles.compactFilterText}>
                                        {getCurrentFilterText().filters}
                                    </Text>
                                    <View style={styles.filterStatusDivider}>
                                        <Text style={styles.compactFilterText}>
                                            {getCurrentFilterText().sort}
                                        </Text>
                                        {hasActiveFilters() && (
                                            <TouchableOpacity
                                                style={styles.clearFiltersButton}
                                                onPress={clearAllFilters}
                                                accessibilityRole="button"
                                                accessibilityLabel="Clear all filters"
                                            >
                                                <X size={14} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Select All Section - Simple checkbox and text */}
                            {canUpdateUsers() && filteredAndSortedUsers.length > 0 && (
                                <View>
                                    <TouchableOpacity
                                        style={styles.selectAllButton}
                                        onPress={handleSelectAll}
                                        accessibilityRole="button"
                                        accessibilityLabel={isAllSelected ? "Deselect all users" : "Select all users"}
                                    >
                                        <View style={[
                                            styles.selectAllCheckboxLarge,
                                            isAllSelected && styles.checkboxSelected,
                                            isPartiallySelected && styles.checkboxPartial
                                        ]}>
                                            {isAllSelected && (
                                                <Check size={14} color="white" />
                                            )}
                                            {isPartiallySelected && !isAllSelected && (
                                                <View style={styles.partialCheckmark} />
                                            )}
                                        </View>
                                        <Text style={styles.selectAllTextLarge}>
                                            {isAllSelected ? "Deselect All" : "Select All"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Content Area */}
                            {filteredAndSortedUsers.length === 0 ? (
                                <EmptyState
                                    icon={<Users size={48} color={colors.textSecondary} />}
                                    title="No users found"
                                    message={searchQuery ? "Try adjusting your search criteria" : "No users match the current filters"}
                                />
                            ) : (
                                <View style={styles.usersList}>
                                    {filteredAndSortedUsers.map((user) => (
                                        <View key={user.id} style={styles.userItemWrapper}>
                                            {canUpdateUsers() && (
                                                <TouchableOpacity
                                                    style={styles.selectionCheckbox}
                                                    onPress={() => toggleUserSelection(user.id)}
                                                >
                                                    <View style={[
                                                        styles.checkbox,
                                                        selectedUsers.includes(user.id) && styles.checkboxSelected
                                                    ]}>
                                                        {selectedUsers.includes(user.id) && (
                                                            <Check size={14} color="white" />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                            <View style={styles.userItemContent}>
                                                <UserItem
                                                    user={user}
                                                    onPress={() => handleUserPress(user)}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.filterModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter & Sort</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Status</Text>
                            {[
                                { key: "all", label: "All Status" },
                                { key: "active", label: "Active" },
                                { key: "inactive", label: "Inactive" },
                                { key: "suspended", label: "Suspended" }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterOption,
                                        filterStatus === option.key && styles.filterOptionSelected
                                    ]}
                                    onPress={() => setFilterStatus(option.key as FilterStatus)}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        filterStatus === option.key && styles.filterOptionTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {filterStatus === option.key && (
                                        <Check size={16} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort by</Text>
                            {[
                                { key: "date_desc", label: "Date (Newest)" },
                                { key: "date_asc", label: "Date (Oldest)" },
                                { key: "name_asc", label: "Name (A-Z)" },
                                { key: "name_desc", label: "Name (Z-A)" },
                                { key: "role_asc", label: "Role" },
                                { key: "status_asc", label: "Status" }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterOption,
                                        sortOrder === option.key && styles.filterOptionSelected
                                    ]}
                                    onPress={() => setSortOrder(option.key as SortOrder)}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        sortOrder === option.key && styles.filterOptionTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {sortOrder === option.key && (
                                        <Check size={16} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <Button
                                title="Clear All"
                                variant="ghost"
                                onPress={clearAllFilters}
                            />
                            <Button
                                title="Apply"
                                variant="primary"
                                onPress={() => setShowFilterModal(false)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    tabContainer: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.primary + "15",
    },
    tabText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.primary,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    searchWrapper: {
        flex: 1,
    },
    filterTabs: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    filterTabActive: {
        backgroundColor: colors.primary + "15",
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.textSecondary,
        marginBottom: 2,
    },
    filterTabTextActive: {
        color: colors.primary,
    },
    filterTabCount: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    filterTabCountActive: {
        color: colors.primary,
    },
    bulkActionsBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.primary + "10",
        borderWidth: 1,
        borderColor: colors.primary + "30",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    bulkActionsText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.primary,
    },
    bulkActionsButtons: {
        flexDirection: "row",
        gap: 8,
    },
    section: {
        marginBottom: 24,
    },
    usersHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    compactFilterStatus: {
        paddingHorizontal: 0,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + "40",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterStatusDivider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    compactFilterText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    clearFiltersButton: {
        padding: 2,
        borderRadius: 2,
    },
    selectAllButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        gap: 12,
    },
    selectAllCheckboxLarge: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.primary + "40",
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
    },
    selectAllTextLarge: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.primary,
    },
    usersList: {
        gap: 12,
        marginTop: 16,
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
    checkboxPartial: {
        backgroundColor: colors.primary + "40",
        borderColor: colors.primary,
    },
    partialCheckmark: {
        width: 8,
        height: 2,
        backgroundColor: colors.primary,
        borderRadius: 1,
    },
    userItemContent: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    filterModal: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    filterOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    filterOptionSelected: {
        backgroundColor: colors.primary + "10",
    },
    filterOptionText: {
        fontSize: 14,
        color: colors.text,
    },
    filterOptionTextSelected: {
        color: colors.primary,
        fontWeight: "500",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
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
}); 
