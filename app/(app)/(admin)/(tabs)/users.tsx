import React, { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity
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

export default function ManagementScreen() {
    const adminStore = useAdminStore();
    const users = adminStore?.users || [];
    const refreshData = adminStore?.refreshData || (() => Promise.resolve());

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"users" | "reports" | "system">("users");

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
            description: "Monthly revenue and profit analysis",
            icon: <TrendingUp size={20} color={colors.success} />,
            period: "Last 30 days",
        },
        {
            id: "bookings",
            title: "Booking Reports",
            description: "Booking trends and customer analytics",
            icon: <BarChart size={20} color={colors.primary} />,
            period: "Last 7 days",
        },
        {
            id: "vessels",
            title: "Fleet Performance",
            description: "Vessel utilization and maintenance reports",
            icon: <FileText size={20} color={colors.secondary} />,
            period: "Real-time",
        },
    ];

    const systemTools = [
        {
            id: "notifications",
            title: "System Notifications",
            description: "Manage global alerts and announcements",
            icon: <Bell size={20} color={colors.warning} />,
            action: "Configure",
        },
        {
            id: "database",
            title: "Database Management",
            description: "Backup, restore, and maintenance tools",
            icon: <Database size={20} color={colors.danger} />,
            action: "Manage",
        },
        {
            id: "export",
            title: "Data Export",
            description: "Export system data and reports",
            icon: <Download size={20} color={colors.primary} />,
            action: "Export",
        },
    ];

    const ReportItem = ({ report }: { report: any }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => router.push(`../reports/${report?.id || ""}`)}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemTitleContainer}>
                    {report?.icon}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{report?.title || "Unknown Report"}</Text>
                        <Text style={styles.itemDescription}>{report?.description || "No description"}</Text>
                        <Text style={styles.itemPeriod}>{report?.period || ""}</Text>
                    </View>
                </View>
                <Text style={styles.arrowText}>→</Text>
            </View>
        </TouchableOpacity>
    );

    const SystemToolItem = ({ tool }: { tool: any }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => {/* Navigate to tool */ }}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemTitleContainer}>
                    {tool?.icon}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{tool?.title || "Unknown Tool"}</Text>
                        <Text style={styles.itemDescription}>{tool?.description || "No description"}</Text>
                    </View>
                </View>
                <View style={styles.actionBadge}>
                    <Text style={styles.actionText}>{tool?.action || "Open"}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            <Stack.Screen
                options={{
                    title: "Management",
                    headerRight: () => (
                        <Button
                            title="New User"
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color="#FFFFFF" />}
                            onPress={() => router.push("../user/new")}
                        />
                    ),
                }}
            />

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Total Users"
                    value={totalUsers.toString()}
                    icon={<Users size={24} color={colors.primary} />}
                    subtitle="+8%"
                />
                <StatCard
                    title="Active Users"
                    value={activeUsers.toString()}
                    icon={<UserCheck size={24} color={colors.success} />}
                    subtitle="+5%"
                />
                <StatCard
                    title="Admins"
                    value={adminUsers.toString()}
                    icon={<Shield size={24} color={colors.warning} />}
                    subtitle="0%"
                />
                <StatCard
                    title="Customers"
                    value={customerUsers.toString()}
                    icon={<Users size={24} color={colors.secondary} />}
                    subtitle="+12%"
                />
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "users" && styles.activeTab]}
                    onPress={() => setActiveTab("users")}
                >
                    <Users
                        size={20}
                        color={activeTab === "users" ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === "users" && styles.activeTabText
                    ]}>
                        Users
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "reports" && styles.activeTab]}
                    onPress={() => setActiveTab("reports")}
                >
                    <BarChart
                        size={20}
                        color={activeTab === "reports" ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === "reports" && styles.activeTabText
                    ]}>
                        Reports
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === "system" && styles.activeTab]}
                    onPress={() => setActiveTab("system")}
                >
                    <Settings
                        size={20}
                        color={activeTab === "system" ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        activeTab === "system" && styles.activeTabText
                    ]}>
                        System
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar (only for users) */}
            {activeTab === "users" && (
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search users..."
                />
            )}

            {/* Content based on active tab */}
            {activeTab === "users" ? (
                <View style={styles.section}>
                    <SectionHeader
                        title={`User Management (${filteredUsers?.length || 0})`}
                        onSeeAll={() => {/* Navigate to full users */ }}
                    />

                    {(!filteredUsers || filteredUsers.length === 0) ? (
                        <EmptyState
                            title="No users found"
                            message={searchQuery ? "No users match your search criteria" : "No users available"}
                            icon={<Users size={48} color={colors.textSecondary} />}
                        />
                    ) : (
                        filteredUsers.slice(0, 10).map((user, index) => (
                            <UserItem
                                key={user?.id || index}
                                user={user}
                                onPress={() => router.push(`../user/${user?.id || ""}`)}
                            />
                        ))
                    )}

                    <View style={styles.actionButton}>
                        <Button
                            title="Add New User"
                            variant="outline"
                            icon={<Plus size={18} color={colors.primary} />}
                            onPress={() => router.push("../user/new")}
                            fullWidth
                        />
                    </View>
                </View>
            ) : activeTab === "reports" ? (
                <View style={styles.section}>
                    <SectionHeader
                        title="Analytics & Reports"
                        onSeeAll={() => {/* Navigate to full reports */ }}
                    />

                    <Text style={styles.sectionDescription}>
                        Generate and view comprehensive reports on system performance, revenue, and user analytics.
                    </Text>

                    {reports.map((report, index) => (
                        <ReportItem key={report?.id || index} report={report} />
                    ))}

                    <View style={styles.actionButton}>
                        <Button
                            title="Generate Custom Report"
                            variant="outline"
                            icon={<FileText size={18} color={colors.primary} />}
                            onPress={() => {/* Navigate to custom report */ }}
                            fullWidth
                        />
                    </View>
                </View>
            ) : (
                <View style={styles.section}>
                    <SectionHeader
                        title="System Tools"
                        onSeeAll={() => {/* Navigate to advanced settings */ }}
                    />

                    <Text style={styles.sectionDescription}>
                        Manage system-wide settings, notifications, and maintenance tools.
                    </Text>

                    {systemTools.map((tool, index) => (
                        <SystemToolItem key={tool?.id || index} tool={tool} />
                    ))}

                    <View style={styles.actionButton}>
                        <Button
                            title="Advanced Settings"
                            variant="outline"
                            icon={<Settings size={18} color={colors.primary} />}
                            onPress={() => {/* Navigate to advanced settings */ }}
                            fullWidth
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
        padding: 16,
        paddingBottom: 32,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    activeTab: {
        backgroundColor: colors.primary + "10",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.primary,
        fontWeight: "600",
    },
    section: {
        marginBottom: 24,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    itemCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemTitleContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        flex: 1,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    itemDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 4,
        lineHeight: 18,
    },
    itemPeriod: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "500",
    },
    arrowText: {
        fontSize: 18,
        color: colors.textSecondary,
        fontWeight: "300",
    },
    actionBadge: {
        backgroundColor: colors.primary + "10",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    actionText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "600",
    },
    actionButton: {
        marginTop: 16,
    },
}); 
