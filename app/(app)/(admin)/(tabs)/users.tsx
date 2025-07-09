import React, { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
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
    Download
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import UserItem from "@/components/admin/UserItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";

const { width: screenWidth } = Dimensions.get('window');

export default function ManagementScreen() {
    const adminStore = useAdminStore();
    const users = adminStore?.users || [];
    const refreshData = adminStore?.refreshData || (() => Promise.resolve());

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"users" | "reports" | "system">("users");

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

    const filteredUsers = users?.filter((user) => {
        if (!user) return false;
        const name = user.name || "";
        const email = user.email || "";
        const role = user.role || "";
        const id = user.id || "";
        const query = searchQuery?.toLowerCase() || "";

        return name.toLowerCase().includes(query) ||
            email.toLowerCase().includes(query) ||
            role.toLowerCase().includes(query) ||
            id.toLowerCase().includes(query);
    }) || [];

    // Calculate stats with null safety
    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => u?.status === "active")?.length || 0;
    const adminUsers = users?.filter(u => u?.role === "admin")?.length || 0;
    const customerUsers = users?.filter(u => u?.role === "customer")?.length || 0;

    const reports = [
        {
            id: "revenue",
            title: "Revenue Analytics",
            description: "Monthly revenue and profit analysis with detailed breakdowns",
            icon: <TrendingUp size={isTablet ? 24 : 20} color={colors.success} />,
            period: "Last 30 days",
        },
        {
            id: "bookings",
            title: "Booking Reports",
            description: "Booking trends and customer analytics dashboard",
            icon: <BarChart size={isTablet ? 24 : 20} color={colors.primary} />,
            period: "Last 7 days",
        },
        {
            id: "vessels",
            title: "Fleet Performance",
            description: "Vessel utilization and maintenance reports",
            icon: <FileText size={isTablet ? 24 : 20} color={colors.secondary} />,
            period: "Real-time",
        },
    ];

    const systemTools = [
        {
            id: "notifications",
            title: "System Notifications",
            description: "Manage global alerts and announcements across the platform",
            icon: <Bell size={isTablet ? 24 : 20} color={colors.warning} />,
            action: "Configure",
        },
        {
            id: "database",
            title: "Database Management",
            description: "Backup, restore, and maintenance tools for system data",
            icon: <Database size={isTablet ? 24 : 20} color={colors.danger} />,
            action: "Manage",
        },
        {
            id: "export",
            title: "Data Export",
            description: "Export system data and reports in various formats",
            icon: <Download size={isTablet ? 24 : 20} color={colors.primary} />,
            action: "Export",
        },
    ];

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    const ReportItem = ({ report }: { report: any }) => (
        <TouchableOpacity
            style={[styles.itemCard, { padding: isTablet ? 20 : 16 }]}
            onPress={() => router.push(`../reports/${report?.id || ""}`)}
            accessibilityRole="button"
            accessibilityLabel={`View ${report?.title} report`}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemTitleContainer}>
                    {report?.icon}
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { fontSize: isTablet ? 18 : 16 }]}>
                            {report?.title || "Unknown Report"}
                        </Text>
                        <Text style={[styles.itemDescription, { fontSize: isTablet ? 15 : 14 }]}>
                            {report?.description || "No description"}
                        </Text>
                        <Text style={[styles.itemPeriod, { fontSize: isTablet ? 13 : 12 }]}>
                            {report?.period || ""}
                        </Text>
                    </View>
                </View>
                <View style={styles.arrowContainer}>
                    <Text style={[styles.arrowText, { fontSize: isTablet ? 24 : 20 }]}>→</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const SystemToolItem = ({ tool }: { tool: any }) => (
        <TouchableOpacity
            style={[styles.itemCard, { padding: isTablet ? 20 : 16 }]}
            onPress={() => {/* Navigate to tool */ }}
            accessibilityRole="button"
            accessibilityLabel={`${tool?.action} ${tool?.title}`}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemTitleContainer}>
                    {tool?.icon}
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemTitle, { fontSize: isTablet ? 18 : 16 }]}>
                            {tool?.title || "Unknown Tool"}
                        </Text>
                        <Text style={[styles.itemDescription, { fontSize: isTablet ? 15 : 14 }]}>
                            {tool?.description || "No description"}
                        </Text>
                    </View>
                </View>
                <View style={styles.actionBadge}>
                    <Text style={[styles.actionText, { fontSize: isTablet ? 13 : 12 }]}>
                        {tool?.action || "Open"}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
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
                    title: "Management",
                    headerRight: () => (
                        <Button
                            title={isSmallScreen ? "New" : "New User"}
                            variant="primary"
                            size={isTablet ? "medium" : "small"}
                            icon={<Plus size={isTablet ? 18 : 16} color="#FFFFFF" />}
                            onPress={() => router.push("../user/new")}
                        />
                    ),
                }}
            />

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <SectionHeader 
                    title="User Overview" 
                    subtitle="System statistics"
                    size={isTablet ? "large" : "medium"}
                />
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Total Users"
                        value={totalUsers.toString()}
                        subtitle="+8% this month"
                        icon={<Users size={isTablet ? 20 : 18} color={colors.primary} />}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Active Users"
                        value={activeUsers.toString()}
                        subtitle="+5% this week"
                        icon={<UserCheck size={isTablet ? 20 : 18} color={colors.success} />}
                        color={colors.success}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Admins"
                        value={adminUsers.toString()}
                        subtitle="No change"
                        icon={<Shield size={isTablet ? 20 : 18} color={colors.warning} />}
                        color={colors.warning}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Customers"
                        value={customerUsers.toString()}
                        subtitle="+12% growth"
                        icon={<Users size={isTablet ? 20 : 18} color={colors.secondary} />}
                        color={colors.secondary}
                        size={isTablet ? "large" : "medium"}
                    />
                </View>
            </View>

            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { padding: isTablet ? 6 : 4 }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "users" && styles.activeTab, {
                        paddingVertical: isTablet ? 16 : 12,
                        paddingHorizontal: isTablet ? 20 : 16,
                    }]}
                    onPress={() => setActiveTab("users")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "users" }}
                >
                    <Users
                        size={isTablet ? 22 : 20}
                        color={activeTab === "users" ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === "users" && styles.activeTabText,
                        { fontSize: isTablet ? 16 : 14 }
                    ]}>
                        Users
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "reports" && styles.activeTab, {
                        paddingVertical: isTablet ? 16 : 12,
                        paddingHorizontal: isTablet ? 20 : 16,
                    }]}
                    onPress={() => setActiveTab("reports")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "reports" }}
                >
                    <BarChart
                        size={isTablet ? 22 : 20}
                        color={activeTab === "reports" ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === "reports" && styles.activeTabText,
                        { fontSize: isTablet ? 16 : 14 }
                    ]}>
                        Reports
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "system" && styles.activeTab, {
                        paddingVertical: isTablet ? 16 : 12,
                        paddingHorizontal: isTablet ? 20 : 16,
                    }]}
                    onPress={() => setActiveTab("system")}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === "system" }}
                >
                    <Settings
                        size={isTablet ? 22 : 20}
                        color={activeTab === "system" ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === "system" && styles.activeTabText,
                        { fontSize: isTablet ? 16 : 14 }
                    ]}>
                        System
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar (only for users) */}
            {activeTab === "users" && (
                <View style={styles.searchContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search users by name, email, or role..."
                    />
                </View>
            )}

            {/* Content based on active tab */}
            {activeTab === "users" ? (
                <View style={styles.section}>
                    <SectionHeader
                        title="User Management"
                        subtitle={`${filteredUsers?.length || 0} ${filteredUsers?.length === 1 ? 'user' : 'users'}`}
                        size={isTablet ? "large" : "medium"}
                        action={
                            <Button
                                title="Export"
                                variant="ghost"
                                size="small"
                                onPress={() => {/* TODO: Export users */}}
                            />
                        }
                    />

                    {(!filteredUsers || filteredUsers.length === 0) ? (
                        <EmptyState
                            title="No users found"
                            message={searchQuery 
                                ? "No users match your search criteria. Try adjusting your search terms." 
                                : "No users available yet. Add your first user to get started."
                            }
                            icon={<Users size={isTablet ? 56 : 48} color={colors.textSecondary} />}
                            action={
                                !searchQuery ? (
                                    <Button
                                        title="Add First User"
                                        variant="primary"
                                        size={isTablet ? "large" : "medium"}
                                        icon={<Plus size={isTablet ? 20 : 18} color="white" />}
                                        onPress={() => router.push("../user/new")}
                                    />
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            {filteredUsers.slice(0, 10).map((user, index) => (
                                <UserItem
                                    key={user?.id || index}
                                    user={user}
                                    onPress={() => router.push(`../user/${user?.id || ""}`)}
                                />
                            ))}

                            {filteredUsers.length > 10 && (
                                <View style={styles.loadMoreContainer}>
                                    <Button
                                        title="Load More Users"
                                        variant="outline"
                                        size={isTablet ? "large" : "medium"}
                                        onPress={() => {/* TODO: Pagination */}}
                                        fullWidth={isSmallScreen}
                                    />
                                </View>
                            )}
                        </>
                    )}

                    <View style={styles.actionContainer}>
                        <Button
                            title="Add New User"
                            variant="primary"
                            size={isTablet ? "large" : "medium"}
                            icon={<Plus size={isTablet ? 20 : 18} color="white" />}
                            onPress={() => router.push("../user/new")}
                            fullWidth={isSmallScreen}
                        />
                    </View>
                </View>
            ) : activeTab === "reports" ? (
                <View style={styles.section}>
                    <SectionHeader
                        title="Analytics & Reports"
                        subtitle="Comprehensive system insights"
                        size={isTablet ? "large" : "medium"}
                        action={
                            <Button
                                title="Schedule"
                                variant="ghost"
                                size="small"
                                onPress={() => {/* TODO: Schedule reports */}}
                            />
                        }
                    />

                    <Text style={[styles.sectionDescription, { fontSize: isTablet ? 16 : 14 }]}>
                        Generate and view comprehensive reports on system performance, revenue, and user analytics.
                    </Text>

                    {reports.map((report, index) => (
                        <ReportItem key={report?.id || index} report={report} />
                    ))}

                    <View style={styles.actionContainer}>
                        <Button
                            title="Generate Custom Report"
                            variant="secondary"
                            size={isTablet ? "large" : "medium"}
                            icon={<FileText size={isTablet ? 20 : 18} color="white" />}
                            onPress={() => {/* Navigate to custom report */ }}
                            fullWidth={isSmallScreen}
                        />
                    </View>
                </View>
            ) : (
                <View style={styles.section}>
                    <SectionHeader
                        title="System Tools"
                        subtitle="Administrative controls"
                        size={isTablet ? "large" : "medium"}
                        action={
                            <Button
                                title="Backup"
                                variant="ghost"
                                size="small"
                                onPress={() => {/* TODO: System backup */}}
                            />
                        }
                    />

                    <Text style={[styles.sectionDescription, { fontSize: isTablet ? 16 : 14 }]}>
                        Manage system-wide settings, notifications, and maintenance tools for optimal performance.
                    </Text>

                    {systemTools.map((tool, index) => (
                        <SystemToolItem key={tool?.id || index} tool={tool} />
                    ))}

                    <View style={styles.actionContainer}>
                        <Button
                            title="Advanced Settings"
                            variant="secondary"
                            size={isTablet ? "large" : "medium"}
                            icon={<Settings size={isTablet ? 20 : 18} color="white" />}
                            onPress={() => {/* Navigate to advanced settings */ }}
                            fullWidth={isSmallScreen}
                        />
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        paddingBottom: 32,
    },
    statsContainer: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        gap: 8,
    },
    activeTab: {
        backgroundColor: colors.primary + "15",
    },
    tabText: {
        fontWeight: "600",
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.primary,
        fontWeight: "700",
    },
    searchContainer: {
        marginBottom: 20,
    },
    section: {
        marginBottom: 28,
    },
    sectionDescription: {
        color: colors.textSecondary,
        marginBottom: 20,
        lineHeight: 1.5,
        fontWeight: "500",
    },
    itemCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    itemTitleContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 16,
        flex: 1,
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
        lineHeight: 1.3,
    },
    itemDescription: {
        color: colors.textSecondary,
        marginBottom: 6,
        lineHeight: 1.4,
        fontWeight: "500",
    },
    itemPeriod: {
        color: colors.primary,
        fontWeight: "600",
    },
    arrowContainer: {
        padding: 4,
    },
    arrowText: {
        color: colors.textSecondary,
        fontWeight: "300",
    },
    actionBadge: {
        backgroundColor: colors.primary + "15",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    actionText: {
        color: colors.primary,
        fontWeight: "600",
    },
    loadMoreContainer: {
        marginTop: 16,
        alignItems: "center",
    },
    actionContainer: {
        marginTop: 20,
    },
}); 
