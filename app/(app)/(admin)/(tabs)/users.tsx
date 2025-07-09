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
import { User as AdminUser } from "@/types/admin";

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
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "date_desc":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
            const userDate = new Date(u.createdAt);
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

    const handleUserPress = (user: AdminUser) => {
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
                                    <Button
                                        title=""
                                        variant="ghost"
                                        size="small"
                                        icon={<Download size={16} color={colors.primary} />}
                                        onPress={handleExport}
                                    />
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
                        { key: "overview", label: "Overview", icon: <BarChart size={16} color={activeTab === "overview" ? "white" : colors.primary} /> },
                        { key: "users", label: "All Users", icon: <Users size={16} color={activeTab === "users" ? "white" : colors.primary} /> },
                        { key: "agents", label: "Agents", icon: <UserCheck size={16} color={activeTab === "agents" ? "white" : colors.primary} /> },
                        { key: "passengers", label: "Passengers", icon: <User size={16} color={activeTab === "passengers" ? "white" : colors.primary} /> }
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
                    <>
                        {/* Enhanced Stats */}
                        <View style={styles.statsContainer}>
                            <SectionHeader
                                title="User Analytics"
                                subtitle="User statistics and trends"
                                size={isTablet ? "large" : "medium"}
                            />
                            <View style={styles.statsGrid}>
                                <StatCard
                                    title="Total Users"
                                    value={stats.totalUsers.toString()}
                                    subtitle={`${stats.newUsersThisMonth} new this month`}
                                    icon={<Users size={isTablet ? 20 : 18} color={colors.primary} />}
                                    size={isTablet ? "large" : "medium"}
                                />
                                <StatCard
                                    title="Active Users"
                                    value={stats.activeUsers.toString()}
                                    subtitle={`${stats.activeRate}% active rate`}
                                    icon={<Activity size={isTablet ? 20 : 18} color={colors.success} />}
                                    color={colors.success}
                                    size={isTablet ? "large" : "medium"}
                                />
                                <StatCard
                                    title="Agents"
                                    value={stats.agentCount.toString()}
                                    subtitle={`${stats.adminCount} admins`}
                                    icon={<UserCheck size={isTablet ? 20 : 18} color={colors.secondary} />}
                                    color={colors.secondary}
                                    size={isTablet ? "large" : "medium"}
                                />
                                <StatCard
                                    title="Passengers"
                                    value={stats.passengerCount.toString()}
                                    subtitle={`${stats.customerCount} customers`}
                                    icon={<User size={isTablet ? 20 : 18} color="#FF9500" />}
                                    color="#FF9500"
                                    size={isTablet ? "large" : "medium"}
                                />
                            </View>
                        </View>

                        {/* Role Distribution */}
                        <View style={styles.roleDistributionContainer}>
                            <SectionHeader
                                title="Role Distribution"
                                subtitle="User roles breakdown"
                                size={isTablet ? "large" : "medium"}
                            />
                            <View style={styles.roleGrid}>
                                {[
                                    { role: "admin", label: "Admins", count: stats.adminCount, color: colors.danger },
                                    { role: "agent", label: "Agents", count: stats.agentCount, color: colors.primary },
                                    { role: "customer", label: "Customers", count: stats.customerCount, color: colors.secondary },
                                    { role: "passenger", label: "Passengers", count: stats.passengerCount, color: colors.success }
                                ].map((item) => (
                                    <View key={item.role} style={styles.roleItem}>
                                        <View style={[styles.roleIcon, { backgroundColor: item.color + "20" }]}>
                                            {getRoleIcon(item.role)}
                                        </View>
                                        <Text style={styles.roleCount}>{item.count}</Text>
                                        <Text style={styles.roleLabel}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.quickStatsContainer}>
                            <SectionHeader
                                title="Status Overview"
                                subtitle="Current user status distribution"
                                size={isTablet ? "large" : "medium"}
                            />
                            <View style={styles.quickStatsGrid}>
                                <View style={styles.quickStatItem}>
                                    <Text style={styles.quickStatValue}>0</Text>
                                    <Text style={styles.quickStatLabel}>Pending Approval</Text>
                                    <StatusBadge status="inactive" size="small" />
                                </View>
                                <View style={styles.quickStatItem}>
                                    <Text style={styles.quickStatValue}>{stats.suspendedCount}</Text>
                                    <Text style={styles.quickStatLabel}>Suspended</Text>
                                    <StatusBadge status="suspended" size="small" />
                                </View>
                                <View style={styles.quickStatItem}>
                                    <Text style={styles.quickStatValue}>{stats.activeUsers}</Text>
                                    <Text style={styles.quickStatLabel}>Active</Text>
                                    <StatusBadge status="active" size="small" />
                                </View>
                            </View>
                        </View>
                    </>
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
                            <SectionHeader
                                title={searchQuery ? "Search Results" : "Users"}
                                subtitle={`${filteredAndSortedUsers.length} ${filteredAndSortedUsers.length === 1 ? 'user' : 'users'} found`}
                                size={isTablet ? "large" : "medium"}
                            />

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
                                onPress={() => {
                                    setFilterRole("all");
                                    setFilterStatus("all");
                                    setSortOrder("date_desc");
                                    setSearchQuery("");
                                }}
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
        backgroundColor: colors.background,
    },
    contentContainer: {
        flexGrow: 1,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
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
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: "white",
    },
    statsContainer: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 16,
    },
    roleDistributionContainer: {
        marginBottom: 24,
    },
    roleGrid: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    roleItem: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    roleIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    roleCount: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
    },
    roleLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    quickStatsContainer: {
        marginBottom: 24,
    },
    quickStatsGrid: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    quickStatItem: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        gap: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    quickStatValue: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
    },
    quickStatLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
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
        backgroundColor: colors.primary,
    },
    filterTabText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
        marginBottom: 2,
    },
    filterTabTextActive: {
        color: "white",
    },
    filterTabCount: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    filterTabCountActive: {
        color: "white",
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
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
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
