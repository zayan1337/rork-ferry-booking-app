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
    Modal,
    Switch
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    Settings,
    Shield,
    Users,
    Database,
    Bell,
    Activity,
    FileText,
    Download,
    Upload,
    Key,
    Lock,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle,
    X,
    Edit,
    Trash2,
    Plus,
    Search,
    Filter,
    Calendar,
    Clock,
    Server,
    Wifi,
    HardDrive,
    Zap,
    Mail,
    MessageSquare,
    Globe,
    Save,
    RotateCcw
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import AlertItem from "@/components/admin/AlertItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import Input from "@/components/Input";
import { Alert as AdminAlert, ActivityLog as AdminActivityLog, AdminPermission } from "@/types/admin";

const { width: screenWidth } = Dimensions.get('window');

type SettingsTab = "permissions" | "alerts" | "activity" | "system" | "reports";

export default function SettingsScreen() {
    const {
        alerts,
        activityLogs,
        adminPermissions,
        systemSettings,
        dashboardStats,
        refreshData,
        markAlertAsRead,
        markAllAlertsAsRead,
        deleteAlert,
        updateSystemSettings,
        exportActivityLogs,
        exportSystemReport,
        backupDatabase,
        restoreDatabase
    } = useAdminStore();

    const {
        canManagePermissions,
        canViewActivityLogs,
        canManageSystemSettings,
        canExportReports,
        canViewAlerts
    } = useAdminPermissions();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<SettingsTab>("permissions");
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<AdminPermission | null>(null);
    const [showSystemModal, setShowSystemModal] = useState(false);
    const [tempSettings, setTempSettings] = useState<any>(systemSettings || {});
    const [selectedTimeframe, setSelectedTimeframe] = useState<"24h" | "7d" | "30d">("7d");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showUserPermissionsModal, setShowUserPermissionsModal] = useState(false);
    const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
    const [showPermissionSetModal, setShowPermissionSetModal] = useState(false);
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [selectedPermissionSet, setSelectedPermissionSet] = useState<any>(null);
    const [permissionView, setPermissionView] = useState<"users" | "roles" | "permissions">("users");
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [newRole, setNewRole] = useState({ name: "", description: "", permissions: [] as string[] });

    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    // Mock admin users data - replace with real data from your store
    const adminUsers = useMemo(() => [
        {
            id: "1",
            name: "John Admin",
            email: "john@ferry.com",
            role: "super_admin",
            status: "active",
            last_login: "2024-01-15T10:30:00Z",
            created_at: "2023-06-15T08:00:00Z",
            permissions: ["users_view", "users_create", "users_edit", "users_delete", "users_permissions", "bookings_view", "bookings_create", "system_configure", "system_backup"]
        },
        {
            id: "2",
            name: "Sarah Manager",
            email: "sarah@ferry.com",
            role: "operations_manager",
            status: "active",
            last_login: "2024-01-15T09:15:00Z",
            created_at: "2023-08-20T10:30:00Z",
            permissions: ["bookings_view", "bookings_create", "bookings_edit", "vessels_view", "vessels_edit", "trips_schedule", "users_view"]
        },
        {
            id: "3",
            name: "Mike Supervisor",
            email: "mike@ferry.com",
            role: "customer_service",
            status: "active",
            last_login: "2024-01-14T16:45:00Z",
            created_at: "2023-09-10T14:20:00Z",
            permissions: ["bookings_view", "bookings_create", "bookings_edit", "users_view", "support_access", "notifications_send"]
        },
        {
            id: "4",
            name: "Lisa Admin",
            email: "lisa@ferry.com",
            role: "financial_officer",
            status: "inactive",
            last_login: "2024-01-10T14:20:00Z",
            created_at: "2023-07-05T11:15:00Z",
            permissions: ["payments_view", "payments_process", "financial_reports", "pricing_manage", "bookings_view"]
        },
        {
            id: "5",
            name: "David Tech",
            email: "david@ferry.com",
            role: "system_operator",
            status: "active",
            last_login: "2024-01-15T07:30:00Z",
            created_at: "2023-10-12T09:45:00Z",
            permissions: ["system_view", "system_logs", "vessels_view", "trips_monitor", "bookings_view"]
        }
    ], []);

    // Enhanced permission categories and permissions
    const permissionCategories = useMemo(() => [
        {
            id: "user_management",
            name: "User Management",
            description: "User account and profile management",
            icon: "Users",
            permissions: [
                { id: "users_view", name: "View Users", description: "View user profiles and basic information", level: "read" },
                { id: "users_create", name: "Create Users", description: "Add new user accounts to the system", level: "write" },
                { id: "users_edit", name: "Edit Users", description: "Modify user profiles and information", level: "write" },
                { id: "users_delete", name: "Delete Users", description: "Remove user accounts from the system", level: "delete" },
                { id: "users_permissions", name: "Manage User Permissions", description: "Assign and modify user permissions", level: "admin" },
                { id: "users_export", name: "Export User Data", description: "Export user information and reports", level: "read" }
            ]
        },
        {
            id: "booking_management",
            name: "Booking Management",
            description: "Ferry booking operations and management",
            icon: "Calendar",
            permissions: [
                { id: "bookings_view", name: "View Bookings", description: "View booking details and history", level: "read" },
                { id: "bookings_create", name: "Create Bookings", description: "Make new ferry reservations", level: "write" },
                { id: "bookings_edit", name: "Edit Bookings", description: "Modify existing bookings", level: "write" },
                { id: "bookings_cancel", name: "Cancel Bookings", description: "Cancel and refund bookings", level: "delete" },
                { id: "bookings_checkin", name: "Check-in Management", description: "Manage passenger check-in process", level: "write" },
                { id: "bookings_reports", name: "Booking Reports", description: "Generate booking analytics and reports", level: "read" }
            ]
        },
        {
            id: "vessel_operations",
            name: "Vessel Operations",
            description: "Ferry vessel and trip management",
            icon: "Ship",
            permissions: [
                { id: "vessels_view", name: "View Vessels", description: "View vessel information and status", level: "read" },
                { id: "vessels_create", name: "Add Vessels", description: "Add new vessels to the fleet", level: "write" },
                { id: "vessels_edit", name: "Edit Vessels", description: "Modify vessel details and configurations", level: "write" },
                { id: "vessels_delete", name: "Remove Vessels", description: "Remove vessels from the fleet", level: "delete" },
                { id: "trips_schedule", name: "Schedule Trips", description: "Create and manage trip schedules", level: "write" },
                { id: "trips_monitor", name: "Monitor Operations", description: "Track real-time vessel operations", level: "read" }
            ]
        },
        {
            id: "financial_management",
            name: "Financial Management",
            description: "Payment processing and financial operations",
            icon: "DollarSign",
            permissions: [
                { id: "payments_view", name: "View Payments", description: "View payment transactions and history", level: "read" },
                { id: "payments_process", name: "Process Payments", description: "Handle payment processing and refunds", level: "write" },
                { id: "financial_reports", name: "Financial Reports", description: "Generate revenue and financial reports", level: "read" },
                { id: "pricing_manage", name: "Manage Pricing", description: "Set and modify ticket pricing", level: "write" },
                { id: "accounting_access", name: "Accounting Access", description: "Access detailed accounting information", level: "admin" }
            ]
        },
        {
            id: "system_administration",
            name: "System Administration",
            description: "System configuration and maintenance",
            icon: "Settings",
            permissions: [
                { id: "system_view", name: "View System Status", description: "Monitor system health and performance", level: "read" },
                { id: "system_configure", name: "System Configuration", description: "Modify system settings and parameters", level: "admin" },
                { id: "system_backup", name: "Backup Management", description: "Create and manage system backups", level: "admin" },
                { id: "system_logs", name: "System Logs", description: "Access and analyze system logs", level: "read" },
                { id: "system_maintenance", name: "System Maintenance", description: "Perform system maintenance operations", level: "admin" }
            ]
        },
        {
            id: "communication",
            name: "Communication",
            description: "Customer communication and support",
            icon: "MessageSquare",
            permissions: [
                { id: "notifications_send", name: "Send Notifications", description: "Send system notifications to users", level: "write" },
                { id: "support_access", name: "Customer Support", description: "Access customer support tools", level: "write" },
                { id: "announcements_manage", name: "Manage Announcements", description: "Create and manage system announcements", level: "write" },
                { id: "communication_reports", name: "Communication Reports", description: "View communication analytics", level: "read" }
            ]
        }
    ], []);

    // Predefined role templates
    const roleTemplates = useMemo(() => [
        {
            id: "super_admin",
            name: "Super Administrator",
            description: "Full system access with all permissions",
            color: "#DC2626",
            permissions: permissionCategories.flatMap(cat => cat.permissions.map(p => p.id)),
            isSystemRole: true
        },
        {
            id: "operations_manager",
            name: "Operations Manager",
            description: "Manage bookings, vessels, and day-to-day operations",
            color: "#2563EB",
            permissions: [
                "bookings_view", "bookings_create", "bookings_edit", "bookings_cancel", "bookings_checkin",
                "vessels_view", "vessels_edit", "trips_schedule", "trips_monitor",
                "users_view", "support_access", "notifications_send"
            ],
            isSystemRole: true
        },
        {
            id: "customer_service",
            name: "Customer Service",
            description: "Handle customer inquiries and basic booking management",
            color: "#059669",
            permissions: [
                "bookings_view", "bookings_create", "bookings_edit", "users_view",
                "support_access", "notifications_send", "announcements_manage"
            ],
            isSystemRole: true
        },
        {
            id: "financial_officer",
            name: "Financial Officer",
            description: "Manage payments, pricing, and financial reports",
            color: "#D97706",
            permissions: [
                "payments_view", "payments_process", "financial_reports", "pricing_manage",
                "bookings_view", "accounting_access"
            ],
            isSystemRole: true
        },
        {
            id: "system_operator",
            name: "System Operator",
            description: "Monitor system health and perform basic maintenance",
            color: "#7C3AED",
            permissions: [
                "system_view", "system_logs", "vessels_view", "trips_monitor",
                "bookings_view", "users_view"
            ],
            isSystemRole: true
        }
    ], [permissionCategories]);

    // Flatten all permissions for easy access
    const availablePermissions = useMemo(() =>
        permissionCategories.flatMap(category =>
            category.permissions.map(permission => ({
                ...permission,
                categoryId: category.id,
                categoryName: category.name
            }))
        ), [permissionCategories]);

    // Calculate statistics for different tabs
    const stats = useMemo(() => {
        const unreadAlerts = alerts.filter(a => !a.read).length;
        const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
        const recentActivity = activityLogs.filter(log => {
            const logDate = new Date(log.created_at);
            const now = new Date();
            const timeframes = {
                "24h": 24 * 60 * 60 * 1000,
                "7d": 7 * 24 * 60 * 60 * 1000,
                "30d": 30 * 24 * 60 * 60 * 1000
            };
            return now.getTime() - logDate.getTime() < timeframes[selectedTimeframe];
        }).length;

        return {
            totalAdminUsers: adminUsers.length,
            activeAdminUsers: adminUsers.filter(u => u.status === 'active').length,
            totalPermissions: availablePermissions.length,
            activePermissions: availablePermissions.length,
            totalRoles: roleTemplates.length,
            customRoles: roleTemplates.filter(r => !r.isSystemRole).length,
            permissionCategories: permissionCategories.length,
            totalAlerts: alerts.length,
            unreadAlerts,
            criticalAlerts,
            totalActivityLogs: activityLogs.length,
            recentActivity,
            systemHealth: 98.5, // This would come from actual system metrics
            lastBackup: systemSettings?.last_backup || "Never"
        };
    }, [adminUsers, availablePermissions, alerts, activityLogs, selectedTimeframe, systemSettings]);

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

    // Filter data based on search and active tab
    const filteredData = useMemo(() => {
        switch (activeTab) {
            case "alerts":
                return alerts.filter(alert =>
                    (alert?.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (alert?.message?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                );
            case "activity":
                return activityLogs.filter(log =>
                    (log?.action?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (log?.user_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (log?.details?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                );
            case "permissions":
                return adminUsers.filter(user =>
                    (user?.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (user?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (user?.role?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                );
            default:
                return [];
        }
    }, [activeTab, searchQuery, alerts, activityLogs, adminUsers]);

    const handleAlertAction = (alert: AdminAlert, action: "read" | "delete") => {
        if (!canViewAlerts()) {
            Alert.alert("Access Denied", "You don't have permission to manage alerts.");
            return;
        }

        if (action === "read") {
            markAlertAsRead(alert.id);
        } else if (action === "delete") {
            Alert.alert(
                "Delete Alert",
                "Are you sure you want to delete this alert?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteAlert(alert.id) }
                ]
            );
        }
    };

    const handleExportActivity = async () => {
        if (!canExportReports()) {
            Alert.alert("Access Denied", "You don't have permission to export reports.");
            return;
        }

        try {
            await exportActivityLogs(filteredData as AdminActivityLog[]);
            Alert.alert("Success", "Activity logs exported successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to export activity logs.");
        }
    };

    const handleSystemBackup = async () => {
        if (!canManageSystemSettings()) {
            Alert.alert("Access Denied", "You don't have permission to manage system settings.");
            return;
        }

        Alert.alert(
            "System Backup",
            "This will create a complete system backup. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Backup",
                    onPress: async () => {
                        try {
                            await backupDatabase();
                            Alert.alert("Success", "System backup completed successfully.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to create system backup.");
                        }
                    }
                }
            ]
        );
    };

    const handleSaveSettings = async () => {
        if (!canManageSystemSettings()) {
            Alert.alert("Access Denied", "You don't have permission to update system settings.");
            return;
        }

        try {
            await updateSystemSettings(tempSettings);
            setShowSystemModal(false);
            Alert.alert("Success", "System settings updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update system settings.");
        }
    };

    const handleSaveUserPermissions = async () => {
        if (!selectedUser) return;

        try {
            // Here you would typically update the user permissions in your backend/store
            // For now, we'll just update the local state
            const updatedUser = {
                ...selectedUser,
                permissions: Object.entries(userPermissions)
                    .filter(([_, enabled]) => enabled)
                    .map(([permId, _]) => permId)
            };

            // Update the admin users array (in real app, this would be done via store/API)
            console.log("Updated user permissions:", updatedUser);

            setShowUserPermissionsModal(false);
            setSelectedUser(null);
            Alert.alert("Success", "User permissions updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update user permissions.");
        }
    };

    const handlePermissionToggle = (permissionId: string) => {
        setUserPermissions(prev => ({
            ...prev,
            [permissionId]: !prev[permissionId]
        }));
    };

    const handleCreateRole = async () => {
        try {
            // Here you would typically create the role in your backend/store
            console.log("Creating new role:", newRole);

            setShowCreateRoleModal(false);
            setNewRole({ name: "", description: "", permissions: [] });
            Alert.alert("Success", "Role created successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to create role.");
        }
    };

    const handleDeleteRole = (roleId: string) => {
        Alert.alert(
            "Delete Role",
            "Are you sure you want to delete this role? Users with this role will lose their permissions.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        // Handle role deletion
                        console.log("Deleting role:", roleId);
                        Alert.alert("Success", "Role deleted successfully.");
                    }
                }
            ]
        );
    };

    const handleCloneRole = (role: any) => {
        setNewRole({
            name: `${role.name} (Copy)`,
            description: role.description,
            permissions: [...role.permissions]
        });
        setShowCreateRoleModal(true);
    };

    const getPermissionLevelColor = (level: string) => {
        switch (level) {
            case "read": return colors.success;
            case "write": return colors.primary;
            case "delete": return colors.warning;
            case "admin": return colors.danger;
            default: return colors.textSecondary;
        }
    };

    const getPermissionLevelIcon = (level: string) => {
        switch (level) {
            case "read": return <Eye size={12} color={getPermissionLevelColor(level)} />;
            case "write": return <Edit size={12} color={getPermissionLevelColor(level)} />;
            case "delete": return <Trash2 size={12} color={getPermissionLevelColor(level)} />;
            case "admin": return <Shield size={12} color={getPermissionLevelColor(level)} />;
            default: return <Eye size={12} color={getPermissionLevelColor(level)} />;
        }
    };

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    const renderTabContent = () => {
        switch (activeTab) {
            case "permissions":
                return (
                    <View style={styles.tabContent}>
                        {canManagePermissions() ? (
                            <>
                                {/* Enhanced Permission Statistics */}
                                <View style={styles.statsContainer}>
                                    <StatCard
                                        title="Admin Users"
                                        value={stats.totalAdminUsers.toString()}
                                        icon={<Users size={20} color={colors.primary} />}
                                        trend="up"
                                        trendValue={`${stats.activeAdminUsers} active`}
                                    />
                                    <StatCard
                                        title="Permission Roles"
                                        value={stats.totalRoles.toString()}
                                        icon={<Shield size={20} color={colors.secondary} />}
                                        trend="neutral"
                                        trendValue={`${stats.customRoles} custom`}
                                    />
                                    <StatCard
                                        title="Permission Categories"
                                        value={stats.permissionCategories.toString()}
                                        icon={<Settings size={20} color={colors.warning} />}
                                        trend="neutral"
                                        trendValue={`${stats.totalPermissions} total`}
                                    />
                                </View>

                                {/* Enhanced Permission Management Navigation */}
                                <View style={styles.permissionNavContainer}>
                                    <View style={styles.permissionNavTabs}>
                                        {[
                                            { key: "users", label: "Users", icon: <Users size={16} color={permissionView === "users" ? colors.primary : colors.textSecondary} /> },
                                            { key: "roles", label: "Roles", icon: <Shield size={16} color={permissionView === "roles" ? colors.primary : colors.textSecondary} /> },
                                            { key: "permissions", label: "Permissions", icon: <Key size={16} color={permissionView === "permissions" ? colors.primary : colors.textSecondary} /> }
                                        ].map((tab) => (
                                            <TouchableOpacity
                                                key={tab.key}
                                                style={[
                                                    styles.permissionNavTab,
                                                    permissionView === tab.key && styles.permissionNavTabActive
                                                ]}
                                                onPress={() => setPermissionView(tab.key as any)}
                                            >
                                                {tab.icon}
                                                <Text style={[
                                                    styles.permissionNavTabText,
                                                    permissionView === tab.key && styles.permissionNavTabTextActive
                                                ]}>
                                                    {tab.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Users View */}
                                {permissionView === "users" && (
                                    <>
                                        <SectionHeader
                                            title="Admin Users Management"
                                            subtitle={`${stats.activeAdminUsers} active users • Click to manage individual permissions`}
                                            action={
                                                <Button
                                                    title="Add User"
                                                    variant="primary"
                                                    size="small"
                                                    icon={<Plus size={16} color="white" />}
                                                    onPress={() => {
                                                        // Handle add new admin user
                                                    }}
                                                />
                                            }
                                        />

                                        {filteredData.length === 0 ? (
                                            <EmptyState
                                                icon={<Users size={48} color={colors.textSecondary} />}
                                                title="No admin users found"
                                                message="Add admin users to manage system access"
                                            />
                                        ) : (
                                            <View style={styles.usersList}>
                                                {(filteredData as any[]).map((user) => {
                                                    const userRole = roleTemplates.find(r => r.id === user.role);
                                                    return (
                                                        <TouchableOpacity
                                                            key={user.id}
                                                            style={styles.enhancedUserCard}
                                                            onPress={() => {
                                                                setSelectedUser(user);
                                                                const permissions: Record<string, boolean> = {};
                                                                availablePermissions.forEach(perm => {
                                                                    permissions[perm.id] = user.permissions.includes(perm.id);
                                                                });
                                                                setUserPermissions(permissions);
                                                                setShowUserPermissionsModal(true);
                                                            }}
                                                        >
                                                            <View style={styles.enhancedUserHeader}>
                                                                <View style={styles.userAvatarContainer}>
                                                                    <View style={[styles.userAvatar, { backgroundColor: userRole?.color || colors.primary }]}>
                                                                        <Text style={styles.userAvatarText}>
                                                                            {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                                                        </Text>
                                                                    </View>
                                                                    <StatusBadge
                                                                        status={user.status === 'active' ? 'active' : 'inactive'}
                                                                        size="small"
                                                                    />
                                                                </View>
                                                                <View style={styles.enhancedUserInfo}>
                                                                    <View style={styles.userNameRow}>
                                                                        <Text style={styles.userName}>{user.name}</Text>
                                                                        <TouchableOpacity style={styles.userActionButton}>
                                                                            <Edit size={14} color={colors.primary} />
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                    <Text style={styles.userEmail}>{user.email}</Text>
                                                                    <View style={styles.userRoleContainer}>
                                                                        <View style={[styles.roleTag, { backgroundColor: userRole?.color + "20" }]}>
                                                                            <Shield size={12} color={userRole?.color || colors.primary} />
                                                                            <Text style={[styles.roleTagText, { color: userRole?.color || colors.primary }]}>
                                                                                {userRole?.name || user.role}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                </View>
                                                            </View>

                                                            <View style={styles.enhancedUserPermissions}>
                                                                <View style={styles.permissionsHeader}>
                                                                    <Text style={styles.permissionsLabel}>
                                                                        Active Permissions ({user.permissions.length})
                                                                    </Text>
                                                                    <TouchableOpacity style={styles.viewAllButton}>
                                                                        <Text style={styles.viewAllButtonText}>View All</Text>
                                                                        <Eye size={12} color={colors.primary} />
                                                                    </TouchableOpacity>
                                                                </View>

                                                                <View style={styles.enhancedPermissionTags}>
                                                                    {user.permissions.slice(0, 4).map((permId: string) => {
                                                                        const permission = availablePermissions.find(p => p.id === permId);
                                                                        return permission ? (
                                                                            <View key={permId} style={[styles.enhancedPermissionTag, { borderColor: getPermissionLevelColor(permission.level) }]}>
                                                                                {getPermissionLevelIcon(permission.level)}
                                                                                <Text style={styles.enhancedPermissionTagText}>{permission.name}</Text>
                                                                            </View>
                                                                        ) : null;
                                                                    })}
                                                                    {user.permissions.length > 4 && (
                                                                        <View style={styles.morePermissionsTag}>
                                                                            <Text style={styles.morePermissionsText}>+{user.permissions.length - 4}</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>

                                                            <View style={styles.enhancedUserFooter}>
                                                                <View style={styles.userMetrics}>
                                                                    <View style={styles.userMetric}>
                                                                        <Clock size={12} color={colors.textSecondary} />
                                                                        <Text style={styles.userMetricText}>
                                                                            Last: {new Date(user.last_login).toLocaleDateString()}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={styles.userMetric}>
                                                                        <Calendar size={12} color={colors.textSecondary} />
                                                                        <Text style={styles.userMetricText}>
                                                                            Joined: {new Date(user.created_at).toLocaleDateString()}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </>
                                )}

                                {/* Roles View */}
                                {permissionView === "roles" && (
                                    <>
                                        <SectionHeader
                                            title="Role Management"
                                            subtitle={`${stats.totalRoles} roles available • Create custom roles for specific access levels`}
                                            action={
                                                <Button
                                                    title="Create Role"
                                                    variant="primary"
                                                    size="small"
                                                    icon={<Plus size={16} color="white" />}
                                                    onPress={() => setShowCreateRoleModal(true)}
                                                />
                                            }
                                        />

                                        <View style={styles.rolesList}>
                                            {roleTemplates.map((role) => (
                                                <View key={role.id} style={styles.roleCard}>
                                                    <View style={styles.roleHeader}>
                                                        <View style={styles.roleIconContainer}>
                                                            <View style={[styles.roleIcon, { backgroundColor: role.color + "20" }]}>
                                                                <Shield size={20} color={role.color} />
                                                            </View>
                                                        </View>
                                                        <View style={styles.roleInfo}>
                                                            <Text style={styles.roleName}>{role.name}</Text>
                                                            <Text style={styles.roleDescription}>{role.description}</Text>
                                                        </View>
                                                        <View style={styles.roleActions}>
                                                            {role.isSystemRole && (
                                                                <View style={styles.systemRoleBadge}>
                                                                    <Text style={styles.systemRoleText}>System</Text>
                                                                </View>
                                                            )}
                                                            <TouchableOpacity
                                                                style={styles.roleActionButton}
                                                                onPress={() => handleCloneRole(role)}
                                                            >
                                                                <Plus size={16} color={colors.primary} />
                                                            </TouchableOpacity>
                                                            {!role.isSystemRole && (
                                                                <TouchableOpacity
                                                                    style={styles.roleActionButton}
                                                                    onPress={() => handleDeleteRole(role.id)}
                                                                >
                                                                    <Trash2 size={16} color={colors.danger} />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    </View>

                                                    <View style={styles.rolePermissions}>
                                                        <Text style={styles.rolePermissionsLabel}>
                                                            Permissions ({role.permissions.length})
                                                        </Text>
                                                        <View style={styles.rolePermissionsList}>
                                                            {role.permissions.slice(0, 6).map((permId) => {
                                                                const permission = availablePermissions.find(p => p.id === permId);
                                                                return permission ? (
                                                                    <View key={permId} style={styles.rolePermissionItem}>
                                                                        {getPermissionLevelIcon(permission.level)}
                                                                        <Text style={styles.rolePermissionText}>{permission.name}</Text>
                                                                    </View>
                                                                ) : null;
                                                            })}
                                                            {role.permissions.length > 6 && (
                                                                <View style={styles.rolePermissionItem}>
                                                                    <Text style={styles.rolePermissionMore}>
                                                                        +{role.permissions.length - 6} more
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>

                                                    <View style={styles.roleFooter}>
                                                        <Text style={styles.roleUsageText}>
                                                            {adminUsers.filter(u => u.role === role.id).length} users assigned
                                                        </Text>
                                                        <TouchableOpacity style={styles.viewRoleButton}>
                                                            <Text style={styles.viewRoleButtonText}>View Details</Text>
                                                            <Eye size={12} color={colors.primary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Permissions View */}
                                {permissionView === "permissions" && (
                                    <>
                                        <SectionHeader
                                            title="Permission Categories"
                                            subtitle={`${stats.totalPermissions} permissions across ${stats.permissionCategories} categories`}
                                        />

                                        <View style={styles.permissionCategoriesList}>
                                            {permissionCategories.map((category) => (
                                                <View key={category.id} style={styles.permissionCategoryCard}>
                                                    <View style={styles.permissionCategoryHeader}>
                                                        <View style={styles.categoryIconContainer}>
                                                            <Settings size={20} color={colors.primary} />
                                                        </View>
                                                        <View style={styles.categoryInfo}>
                                                            <Text style={styles.categoryName}>{category.name}</Text>
                                                            <Text style={styles.categoryDescription}>{category.description}</Text>
                                                        </View>
                                                        <View style={styles.categoryStats}>
                                                            <Text style={styles.categoryStatsText}>
                                                                {category.permissions.length} permissions
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.categoryPermissions}>
                                                        {category.permissions.map((permission) => (
                                                            <View key={permission.id} style={styles.permissionDetailItem}>
                                                                <View style={styles.permissionDetailHeader}>
                                                                    <View style={styles.permissionLevelBadge}>
                                                                        {getPermissionLevelIcon(permission.level)}
                                                                        <Text style={[styles.permissionLevelText, { color: getPermissionLevelColor(permission.level) }]}>
                                                                            {permission.level.toUpperCase()}
                                                                        </Text>
                                                                    </View>
                                                                    <Text style={styles.permissionDetailName}>{permission.name}</Text>
                                                                </View>
                                                                <Text style={styles.permissionDetailDescription}>
                                                                    {permission.description}
                                                                </Text>
                                                                <View style={styles.permissionUsage}>
                                                                    <Text style={styles.permissionUsageText}>
                                                                        Used by {adminUsers.filter(u => u.permissions.includes(permission.id)).length} users
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </>
                        ) : (
                            <View style={styles.noPermissionContainer}>
                                <AlertTriangle size={48} color={colors.warning} />
                                <Text style={styles.noPermissionText}>
                                    You don't have permission to manage admin permissions.
                                </Text>
                            </View>
                        )}
                    </View>
                );

            case "alerts":
                return (
                    <View style={styles.tabContent}>
                        {/* Alert Statistics */}
                        <View style={styles.statsContainer}>
                            <StatCard
                                title="Total Alerts"
                                value={stats.totalAlerts.toString()}
                                icon={<Bell size={20} color={colors.primary} />}
                                trend="up"
                                trendValue="+5"
                            />
                            <StatCard
                                title="Unread Alerts"
                                value={stats.unreadAlerts.toString()}
                                icon={<AlertTriangle size={20} color={colors.warning} />}
                                trend={stats.unreadAlerts > 0 ? "up" : "neutral"}
                                trendValue={stats.unreadAlerts > 0 ? "Action needed" : "All clear"}
                            />
                            <StatCard
                                title="Critical Alerts"
                                value={stats.criticalAlerts.toString()}
                                icon={<X size={20} color={colors.danger} />}
                                trend={stats.criticalAlerts > 0 ? "up" : "neutral"}
                                trendValue={stats.criticalAlerts > 0 ? "High priority" : "Normal"}
                            />
                        </View>

                        <SectionHeader
                            title="System Alerts"
                            subtitle={`${stats.unreadAlerts} unread • ${stats.criticalAlerts} critical alerts`}
                            action={
                                <View style={styles.headerActions}>
                                    {alerts.filter(a => !a.read).length > 0 && (
                                        <Button
                                            title="Mark All Read"
                                            variant="outline"
                                            size="small"
                                            onPress={markAllAlertsAsRead}
                                        />
                                    )}
                                    <Button
                                        title="Filter"
                                        variant="ghost"
                                        size="small"
                                        icon={<Filter size={16} color={colors.primary} />}
                                        onPress={() => { }}
                                    />
                                </View>
                            }
                        />

                        {filteredData.length === 0 ? (
                            <EmptyState
                                icon={<Bell size={48} color={colors.textSecondary} />}
                                title="No alerts found"
                                message="System alerts will appear here"
                            />
                        ) : (
                            <View style={styles.alertsList}>
                                {(filteredData as AdminAlert[]).map((alert) => (
                                    <View key={alert.id} style={styles.alertWrapper}>
                                        <AlertItem
                                            alert={alert}
                                            onPress={() => handleAlertAction(alert, "read")}
                                        />
                                        <TouchableOpacity
                                            style={styles.deleteAlertButton}
                                            onPress={() => handleAlertAction(alert, "delete")}
                                        >
                                            <Trash2 size={16} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );

            case "activity":
                return (
                    <View style={styles.tabContent}>
                        {/* Activity Statistics */}
                        <View style={styles.statsContainer}>
                            <StatCard
                                title="Total Activity"
                                value={stats.totalActivityLogs.toString()}
                                icon={<Activity size={20} color={colors.primary} />}
                                trend="up"
                                trendValue="+12%"
                            />
                            <StatCard
                                title={`${selectedTimeframe.toUpperCase()} Activity`}
                                value={stats.recentActivity.toString()}
                                icon={<Clock size={20} color={colors.secondary} />}
                                trend="neutral"
                                trendValue="Active period"
                            />
                            <StatCard
                                title="Active Users"
                                value="24"
                                icon={<Users size={20} color={colors.success} />}
                                trend="up"
                                trendValue="+3"
                            />
                        </View>

                        {/* Timeframe Filter */}
                        <View style={styles.timeframeContainer}>
                            <Text style={styles.filterLabel}>Timeframe:</Text>
                            <View style={styles.timeframeButtons}>
                                {(["24h", "7d", "30d"] as const).map((period) => (
                                    <TouchableOpacity
                                        key={period}
                                        style={[
                                            styles.timeframeButton,
                                            selectedTimeframe === period && styles.timeframeButtonActive
                                        ]}
                                        onPress={() => setSelectedTimeframe(period)}
                                    >
                                        <Text style={[
                                            styles.timeframeButtonText,
                                            selectedTimeframe === period && styles.timeframeButtonTextActive
                                        ]}>
                                            {period === "24h" ? "24 Hours" : period === "7d" ? "7 Days" : "30 Days"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <SectionHeader
                            title="Activity Logs"
                            subtitle={`${stats.recentActivity} activities in ${selectedTimeframe} • Complete audit trail`}
                            action={
                                <View style={styles.headerActions}>
                                    {canExportReports() && (
                                        <Button
                                            title="Export"
                                            variant="outline"
                                            size="small"
                                            icon={<Download size={16} color={colors.primary} />}
                                            onPress={handleExportActivity}
                                        />
                                    )}
                                    <Button
                                        title="Filter"
                                        variant="ghost"
                                        size="small"
                                        icon={<Filter size={16} color={colors.primary} />}
                                        onPress={() => { }}
                                    />
                                </View>
                            }
                        />

                        {filteredData.length === 0 ? (
                            <EmptyState
                                icon={<Activity size={48} color={colors.textSecondary} />}
                                title="No activity logs found"
                                message="System activity will be logged here"
                            />
                        ) : (
                            <View style={styles.activityList}>
                                {(filteredData as AdminActivityLog[]).map((log) => (
                                    <View key={log.id} style={styles.activityItem}>
                                        <View style={styles.activityIcon}>
                                            <Activity size={16} color={colors.primary} />
                                        </View>
                                        <View style={styles.activityContent}>
                                            <Text style={styles.activityAction}>{log.action}</Text>
                                            <Text style={styles.activityDetails}>{log.details}</Text>
                                            <Text style={styles.activityUser}>by {log.user_name}</Text>
                                        </View>
                                        <View style={styles.activityTime}>
                                            <Text style={styles.activityTimeText}>
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </Text>
                                            <Text style={styles.activityTimeText}>
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );

            case "system":
                return (
                    <View style={styles.tabContent}>
                        {/* System Statistics */}
                        <View style={styles.statsContainer}>
                            <StatCard
                                title="System Health"
                                value={`${stats.systemHealth}%`}
                                icon={<Server size={20} color={colors.success} />}
                                trend="up"
                                trendValue="Excellent"
                            />
                            <StatCard
                                title="Uptime"
                                value="99.9%"
                                icon={<Zap size={20} color={colors.success} />}
                                trend="up"
                                trendValue="30 days"
                            />
                            <StatCard
                                title="Active Sessions"
                                value="127"
                                icon={<Users size={20} color={colors.secondary} />}
                                trend="up"
                                trendValue="+15%"
                            />
                            <StatCard
                                title="Last Backup"
                                value={stats.lastBackup}
                                icon={<Database size={20} color={colors.primary} />}
                                trend="neutral"
                                trendValue="Automated"
                            />
                        </View>

                        <SectionHeader
                            title="System Management & Monitoring"
                            subtitle="Real-time system status, performance metrics, and maintenance tools"
                        />

                        {/* Real-time System Status */}
                        <View style={styles.systemStatusContainer}>
                            <View style={styles.statusHeader}>
                                <Text style={styles.subsectionTitle}>Live System Status</Text>
                                <View style={styles.statusIndicator}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.statusText}>All Systems Operational</Text>
                                </View>
                            </View>

                            <View style={styles.statusGrid}>
                                <View style={styles.statusCard}>
                                    <View style={styles.statusCardHeader}>
                                        <Server size={20} color={colors.success} />
                                        <Text style={styles.statusCardTitle}>Server Status</Text>
                                    </View>
                                    <Text style={styles.statusCardValue}>Online</Text>
                                    <Text style={styles.statusCardMetric}>Response time: 45ms</Text>
                                    <View style={styles.statusCardFooter}>
                                        <StatusBadge status="active" size="small" />
                                        <Text style={styles.statusCardTime}>Last checked: 30s ago</Text>
                                    </View>
                                </View>

                                <View style={styles.statusCard}>
                                    <View style={styles.statusCardHeader}>
                                        <Database size={20} color={colors.success} />
                                        <Text style={styles.statusCardTitle}>Database</Text>
                                    </View>
                                    <Text style={styles.statusCardValue}>Connected</Text>
                                    <Text style={styles.statusCardMetric}>Query time: 12ms</Text>
                                    <View style={styles.statusCardFooter}>
                                        <StatusBadge status="active" size="small" />
                                        <Text style={styles.statusCardTime}>Active connections: 24</Text>
                                    </View>
                                </View>

                                <View style={styles.statusCard}>
                                    <View style={styles.statusCardHeader}>
                                        <Wifi size={20} color={colors.success} />
                                        <Text style={styles.statusCardTitle}>Network</Text>
                                    </View>
                                    <Text style={styles.statusCardValue}>Stable</Text>
                                    <Text style={styles.statusCardMetric}>Bandwidth: 85 Mbps</Text>
                                    <View style={styles.statusCardFooter}>
                                        <StatusBadge status="active" size="small" />
                                        <Text style={styles.statusCardTime}>Latency: 8ms</Text>
                                    </View>
                                </View>

                                <View style={styles.statusCard}>
                                    <View style={styles.statusCardHeader}>
                                        <HardDrive size={20} color={colors.warning} />
                                        <Text style={styles.statusCardTitle}>Storage</Text>
                                    </View>
                                    <Text style={styles.statusCardValue}>78% Used</Text>
                                    <Text style={styles.statusCardMetric}>2.1GB / 2.7GB</Text>
                                    <View style={styles.statusCardFooter}>
                                        <StatusBadge status="inactive" size="small" />
                                        <Text style={styles.statusCardTime}>Cleanup recommended</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Enhanced Performance Metrics */}
                        <View style={styles.enhancedMetricsContainer}>
                            <Text style={styles.subsectionTitle}>Performance Metrics</Text>

                            <View style={styles.metricsRow}>
                                <View style={styles.enhancedMetricCard}>
                                    <View style={styles.metricCardHeader}>
                                        <Zap size={20} color={colors.primary} />
                                        <Text style={styles.metricCardTitle}>CPU Usage</Text>
                                    </View>
                                    <Text style={styles.metricCardValue}>32%</Text>
                                    <View style={styles.enhancedMetricBar}>
                                        <View style={[styles.enhancedMetricBarFill, { width: "32%", backgroundColor: colors.primary }]} />
                                    </View>
                                    <View style={styles.metricCardFooter}>
                                        <Text style={styles.metricCardSubtext}>4 cores • 2.4GHz</Text>
                                        <Text style={styles.metricCardStatus}>Normal</Text>
                                    </View>
                                </View>

                                <View style={styles.enhancedMetricCard}>
                                    <View style={styles.metricCardHeader}>
                                        <HardDrive size={20} color={colors.warning} />
                                        <Text style={styles.metricCardTitle}>Memory</Text>
                                    </View>
                                    <Text style={styles.metricCardValue}>67%</Text>
                                    <View style={styles.enhancedMetricBar}>
                                        <View style={[styles.enhancedMetricBarFill, { width: "67%", backgroundColor: colors.warning }]} />
                                    </View>
                                    <View style={styles.metricCardFooter}>
                                        <Text style={styles.metricCardSubtext}>5.4GB / 8GB</Text>
                                        <Text style={[styles.metricCardStatus, { color: colors.warning }]}>High</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.metricsRow}>
                                <View style={styles.enhancedMetricCard}>
                                    <View style={styles.metricCardHeader}>
                                        <Database size={20} color={colors.success} />
                                        <Text style={styles.metricCardTitle}>Disk I/O</Text>
                                    </View>
                                    <Text style={styles.metricCardValue}>Low</Text>
                                    <View style={styles.enhancedMetricBar}>
                                        <View style={[styles.enhancedMetricBarFill, { width: "15%", backgroundColor: colors.success }]} />
                                    </View>
                                    <View style={styles.metricCardFooter}>
                                        <Text style={styles.metricCardSubtext}>120 IOPS</Text>
                                        <Text style={[styles.metricCardStatus, { color: colors.success }]}>Optimal</Text>
                                    </View>
                                </View>

                                <View style={styles.enhancedMetricCard}>
                                    <View style={styles.metricCardHeader}>
                                        <Wifi size={20} color={colors.primary} />
                                        <Text style={styles.metricCardTitle}>Network</Text>
                                    </View>
                                    <Text style={styles.metricCardValue}>45 MB/s</Text>
                                    <View style={styles.enhancedMetricBar}>
                                        <View style={[styles.enhancedMetricBarFill, { width: "60%", backgroundColor: colors.primary }]} />
                                    </View>
                                    <View style={styles.metricCardFooter}>
                                        <Text style={styles.metricCardSubtext}>Bandwidth usage</Text>
                                        <Text style={styles.metricCardStatus}>Stable</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* System Information */}
                        <View style={styles.systemInfoContainer}>
                            <Text style={styles.subsectionTitle}>System Information</Text>
                            <View style={styles.infoGrid}>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoLabel}>Version</Text>
                                    <Text style={styles.infoValue}>v2.4.1</Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoLabel}>Environment</Text>
                                    <Text style={styles.infoValue}>Production</Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoLabel}>Server Time</Text>
                                    <Text style={styles.infoValue}>{new Date().toLocaleTimeString()}</Text>
                                </View>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoLabel}>Timezone</Text>
                                    <Text style={styles.infoValue}>UTC+08:00</Text>
                                </View>
                            </View>
                        </View>

                        {/* Security Monitoring */}
                        <View style={styles.securityContainer}>
                            <View style={styles.securityHeader}>
                                <Text style={styles.subsectionTitle}>Security Monitoring</Text>
                                <StatusBadge status="active" size="small" />
                            </View>
                            <View style={styles.securityGrid}>
                                <View style={styles.securityItem}>
                                    <Shield size={16} color={colors.success} />
                                    <Text style={styles.securityLabel}>SSL Certificate</Text>
                                    <Text style={styles.securityStatus}>Valid until Dec 2024</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Lock size={16} color={colors.success} />
                                    <Text style={styles.securityLabel}>Firewall</Text>
                                    <Text style={styles.securityStatus}>Active</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Eye size={16} color={colors.primary} />
                                    <Text style={styles.securityLabel}>Login Attempts</Text>
                                    <Text style={styles.securityStatus}>3 failed today</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Key size={16} color={colors.success} />
                                    <Text style={styles.securityLabel}>API Keys</Text>
                                    <Text style={styles.securityStatus}>4 active</Text>
                                </View>
                            </View>
                        </View>

                        {/* Enhanced System Actions */}
                        <View style={styles.enhancedActionsContainer}>
                            <Text style={styles.subsectionTitle}>System Maintenance & Actions</Text>

                            <View style={styles.actionsGrid}>
                                {/* Primary Actions */}
                                <View style={styles.actionCategory}>
                                    <Text style={styles.actionCategoryTitle}>Database & Backup</Text>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.enhancedActionCard} onPress={handleSystemBackup}>
                                            <View style={styles.actionCardIcon}>
                                                <Database size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.actionCardTitle}>Create Backup</Text>
                                            <Text style={styles.actionCardDescription}>Full system backup</Text>
                                            <Text style={styles.actionCardTime}>Last: {stats.lastBackup}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.enhancedActionCard}>
                                            <View style={styles.actionCardIcon}>
                                                <Upload size={20} color={colors.secondary} />
                                            </View>
                                            <Text style={styles.actionCardTitle}>Restore</Text>
                                            <Text style={styles.actionCardDescription}>Restore from backup</Text>
                                            <Text style={styles.actionCardTime}>Available: 5 backups</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* System Maintenance */}
                                <View style={styles.actionCategory}>
                                    <Text style={styles.actionCategoryTitle}>System Maintenance</Text>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.enhancedActionCard}
                                            onPress={() => {
                                                Alert.alert(
                                                    "Clear Cache",
                                                    "This will clear all system cache. Continue?",
                                                    [
                                                        { text: "Cancel" },
                                                        { text: "Clear", style: "destructive" }
                                                    ]
                                                );
                                            }}
                                        >
                                            <View style={styles.actionCardIcon}>
                                                <Zap size={20} color={colors.warning} />
                                            </View>
                                            <Text style={styles.actionCardTitle}>Clear Cache</Text>
                                            <Text style={styles.actionCardDescription}>Free up space</Text>
                                            <Text style={styles.actionCardTime}>Cache: 145MB</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.enhancedActionCard}>
                                            <View style={styles.actionCardIcon}>
                                                <RotateCcw size={20} color={colors.primary} />
                                            </View>
                                            <Text style={styles.actionCardTitle}>Restart</Text>
                                            <Text style={styles.actionCardDescription}>Restart services</Text>
                                            <Text style={styles.actionCardTime}>Uptime: 30 days</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Configuration */}
                                <View style={styles.actionCategory}>
                                    <Text style={styles.actionCategoryTitle}>Configuration</Text>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.enhancedActionCard}
                                            onPress={() => setShowSystemModal(true)}
                                        >
                                            <View style={styles.actionCardIcon}>
                                                <Settings size={20} color={colors.secondary} />
                                            </View>
                                            <Text style={styles.actionCardTitle}>Settings</Text>
                                            <Text style={styles.actionCardDescription}>System config</Text>
                                            <Text style={styles.actionCardTime}>Modified: Today</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.enhancedActionCard}>
                                            <View style={styles.actionCardIcon}>
                                                <Activity size={20} color={colors.success} />
                                            </View>
                                            <Text style={styles.actionCardTitle}>Monitoring</Text>
                                            <Text style={styles.actionCardDescription}>View logs</Text>
                                            <Text style={styles.actionCardTime}>Real-time</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Quick Actions Bar */}
                            <View style={styles.quickActionsBar}>
                                <View style={styles.quickActionButton}>
                                    <Button
                                        title={isSmallScreen ? "Health" : "Health Check"}
                                        variant="outline"
                                        size="small"
                                        icon={<CheckCircle size={16} color={colors.primary} />}
                                        onPress={() => Alert.alert("Health Check", "Running system diagnostics...")}
                                    />
                                </View>
                                <View style={styles.quickActionButton}>
                                    <Button
                                        title={isSmallScreen ? "Report" : "Generate Report"}
                                        variant="outline"
                                        size="small"
                                        icon={<FileText size={16} color={colors.primary} />}
                                        onPress={() => Alert.alert("Report", "Generating system report...")}
                                    />
                                </View>
                                <View style={styles.quickActionButton}>
                                    <Button
                                        title={isSmallScreen ? "Logs" : "Export Logs"}
                                        variant="outline"
                                        size="small"
                                        icon={<Download size={16} color={colors.primary} />}
                                        onPress={() => Alert.alert("Export", "Preparing log files...")}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                );

            case "reports":
                return (
                    <View style={styles.tabContent}>
                        <SectionHeader
                            title="System Reports"
                            subtitle="Generate and download system reports"
                        />

                        <View style={styles.reportsList}>
                            {[
                                {
                                    title: "Activity Report",
                                    description: "Detailed system activity and audit logs",
                                    icon: <Activity size={24} color={colors.primary} />,
                                    action: () => exportActivityLogs(activityLogs)
                                },
                                {
                                    title: "User Report",
                                    description: "Complete user and role analytics",
                                    icon: <Users size={24} color={colors.secondary} />,
                                    action: () => exportSystemReport("users")
                                },
                                {
                                    title: "System Health Report",
                                    description: "System performance and health metrics",
                                    icon: <Server size={24} color={colors.success} />,
                                    action: () => exportSystemReport("health")
                                },
                                {
                                    title: "Security Report",
                                    description: "Security events and permission audit",
                                    icon: <Shield size={24} color={colors.danger} />,
                                    action: () => exportSystemReport("security")
                                }
                            ].map((report, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.reportItem}
                                    onPress={report.action}
                                >
                                    <View style={styles.reportIcon}>
                                        {report.icon}
                                    </View>
                                    <View style={styles.reportInfo}>
                                        <Text style={styles.reportTitle}>{report.title}</Text>
                                        <Text style={styles.reportDescription}>{report.description}</Text>
                                    </View>
                                    <Download size={20} color={colors.primary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

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
                        title: "Settings",
                    }}
                />

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    {[
                        { key: "permissions", label: "Permissions", icon: <Shield size={16} color={activeTab === "permissions" ? colors.primary : colors.primary} /> },
                        { key: "alerts", label: "Alerts", icon: <Bell size={16} color={activeTab === "alerts" ? colors.primary : colors.primary} /> },
                        { key: "activity", label: "Activity", icon: <Activity size={16} color={activeTab === "activity" ? colors.primary : colors.primary} /> },
                        { key: "system", label: "System", icon: <Settings size={16} color={activeTab === "system" ? colors.primary : colors.primary} /> },
                        { key: "reports", label: "Reports", icon: <FileText size={16} color={activeTab === "reports" ? colors.primary : colors.primary} /> }
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.key as SettingsTab)}
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

                {/* Search Bar */}
                {(activeTab === "permissions" || activeTab === "alerts" || activeTab === "activity") && (
                    <View style={styles.searchContainer}>
                        <SearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={`Search ${activeTab}...`}
                        />
                    </View>
                )}

                {/* Tab Content */}
                {renderTabContent()}
            </ScrollView>

            {/* System Settings Modal */}
            <Modal
                visible={showSystemModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSystemModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>System Settings</Text>
                            <TouchableOpacity onPress={() => setShowSystemModal(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            <View style={styles.settingSection}>
                                <Text style={styles.settingSectionTitle}>General Settings</Text>

                                <View style={styles.settingItem}>
                                    <Text style={styles.settingLabel}>Maintenance Mode</Text>
                                    <Switch
                                        value={tempSettings.maintenance_mode || false}
                                        onValueChange={(value) =>
                                            setTempSettings((prev: any) => ({ ...prev, maintenance_mode: value }))
                                        }
                                    />
                                </View>

                                <View style={styles.settingItem}>
                                    <Text style={styles.settingLabel}>Auto Backup</Text>
                                    <Switch
                                        value={tempSettings.auto_backup || false}
                                        onValueChange={(value) =>
                                            setTempSettings((prev: any) => ({ ...prev, auto_backup: value }))
                                        }
                                    />
                                </View>
                            </View>

                            <View style={styles.settingSection}>
                                <Text style={styles.settingSectionTitle}>Security Settings</Text>

                                <View style={styles.settingItem}>
                                    <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                                    <Switch
                                        value={tempSettings.two_factor_auth || false}
                                        onValueChange={(value) =>
                                            setTempSettings((prev: any) => ({ ...prev, two_factor_auth: value }))
                                        }
                                    />
                                </View>

                                <View style={styles.settingItem}>
                                    <Text style={styles.settingLabel}>Session Timeout (minutes)</Text>
                                    <Input
                                        value={(tempSettings.session_timeout || 30).toString()}
                                        onChangeText={(value) =>
                                            setTempSettings((prev: any) => ({ ...prev, session_timeout: parseInt(value) || 30 }))
                                        }
                                        keyboardType="numeric"
                                        placeholder="30"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                onPress={() => setShowSystemModal(false)}
                            />
                            <Button
                                title="Save Settings"
                                variant="primary"
                                onPress={handleSaveSettings}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Enhanced User Permissions Modal */}
            <Modal
                visible={showUserPermissionsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowUserPermissionsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.enhancedModal}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <Text style={styles.modalTitle}>
                                    Manage Permissions: {selectedUser?.name}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {selectedUser?.email} • {roleTemplates.find(r => r.id === selectedUser?.role)?.name || selectedUser?.role}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowUserPermissionsModal(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Role Template Selector */}
                            <View style={styles.roleTemplateSection}>
                                <Text style={styles.sectionTitle}>Quick Apply Role Template</Text>
                                <Text style={styles.sectionSubtitle}>Select a predefined role to quickly assign permissions</Text>

                                <View style={styles.roleTemplateList}>
                                    {roleTemplates.map((role) => (
                                        <TouchableOpacity
                                            key={role.id}
                                            style={[
                                                styles.roleTemplateItem,
                                                selectedUser?.role === role.id && styles.roleTemplateItemActive
                                            ]}
                                            onPress={() => {
                                                // Apply role template permissions
                                                const permissions: Record<string, boolean> = {};
                                                availablePermissions.forEach(perm => {
                                                    permissions[perm.id] = role.permissions.includes(perm.id);
                                                });
                                                setUserPermissions(permissions);
                                            }}
                                        >
                                            <View style={[styles.roleTemplateIcon, { backgroundColor: role.color + "20" }]}>
                                                <Shield size={16} color={role.color} />
                                            </View>
                                            <View style={styles.roleTemplateInfo}>
                                                <Text style={styles.roleTemplateName}>{role.name}</Text>
                                                <Text style={styles.roleTemplateDescription}>{role.description}</Text>
                                                <Text style={styles.roleTemplateCount}>{role.permissions.length} permissions</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Enhanced Permission Categories */}
                            <View style={styles.enhancedPermissionsSection}>
                                <Text style={styles.sectionTitle}>Individual Permissions</Text>
                                <Text style={styles.sectionSubtitle}>Fine-tune specific permissions by category</Text>

                                {permissionCategories.map((category) => (
                                    <View key={category.id} style={styles.permissionCategorySection}>
                                        <View style={styles.categorySectionHeader}>
                                            <View style={styles.categoryHeaderIcon}>
                                                <Settings size={16} color={colors.primary} />
                                            </View>
                                            <View style={styles.categoryHeaderInfo}>
                                                <Text style={styles.categorySectionTitle}>{category.name}</Text>
                                                <Text style={styles.categorySectionDescription}>{category.description}</Text>
                                            </View>
                                            <View style={styles.categoryPermissionCount}>
                                                <Text style={styles.categoryCountText}>
                                                    {category.permissions.filter(p => userPermissions[p.id]).length}/{category.permissions.length}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.categoryPermissionsList}>
                                            {category.permissions.map((permission) => (
                                                <TouchableOpacity
                                                    key={permission.id}
                                                    style={styles.enhancedPermissionCheckboxItem}
                                                    onPress={() => handlePermissionToggle(permission.id)}
                                                >
                                                    <View style={styles.permissionCheckboxContainer}>
                                                        <View style={[
                                                            styles.enhancedCheckbox,
                                                            userPermissions[permission.id] && styles.enhancedCheckboxChecked
                                                        ]}>
                                                            {userPermissions[permission.id] && (
                                                                <CheckCircle size={14} color="white" />
                                                            )}
                                                        </View>
                                                        <View style={styles.enhancedPermissionInfo}>
                                                            <View style={styles.permissionNameRow}>
                                                                <Text style={styles.enhancedPermissionName}>
                                                                    {permission.name}
                                                                </Text>
                                                                <View style={[styles.permissionLevelBadge, { backgroundColor: getPermissionLevelColor(permission.level) + "20" }]}>
                                                                    {getPermissionLevelIcon(permission.level)}
                                                                    <Text style={[styles.permissionLevelText, { color: getPermissionLevelColor(permission.level) }]}>
                                                                        {permission.level.toUpperCase()}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.enhancedPermissionDescription}>
                                                                {permission.description}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Enhanced Permission Summary */}
                            <View style={styles.enhancedPermissionSummary}>
                                <View style={styles.summaryHeader}>
                                    <Text style={styles.permissionSummaryTitle}>
                                        Permission Summary
                                    </Text>
                                    <Text style={styles.summaryCount}>
                                        {Object.values(userPermissions).filter(Boolean).length} of {availablePermissions.length} selected
                                    </Text>
                                </View>

                                <View style={styles.summaryCategories}>
                                    {permissionCategories.map((category) => {
                                        const selectedInCategory = category.permissions.filter(p => userPermissions[p.id]).length;
                                        if (selectedInCategory === 0) return null;

                                        return (
                                            <View key={category.id} style={styles.summaryCategoryItem}>
                                                <Text style={styles.summaryCategoryName}>{category.name}</Text>
                                                <Text style={styles.summaryCategoryCount}>{selectedInCategory}/{category.permissions.length}</Text>
                                                <View style={styles.summaryCategoryBar}>
                                                    <View
                                                        style={[
                                                            styles.summaryCategoryBarFill,
                                                            { width: `${(selectedInCategory / category.permissions.length) * 100}%` }
                                                        ]}
                                                    />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                onPress={() => setShowUserPermissionsModal(false)}
                            />
                            <Button
                                title="Save Permissions"
                                variant="primary"
                                onPress={handleSaveUserPermissions}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Role Modal */}
            <Modal
                visible={showCreateRoleModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateRoleModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.enhancedModal}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <Text style={styles.modalTitle}>Create New Role</Text>
                                <Text style={styles.modalSubtitle}>Define a custom role with specific permissions</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCreateRoleModal(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Role Basic Information */}
                            <View style={styles.roleBasicInfoSection}>
                                <Text style={styles.sectionTitle}>Role Information</Text>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Role Name *</Text>
                                    <Input
                                        value={newRole.name}
                                        onChangeText={(value) => setNewRole(prev => ({ ...prev, name: value }))}
                                        placeholder="Enter role name"
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Description</Text>
                                    <Input
                                        value={newRole.description}
                                        onChangeText={(value) => setNewRole(prev => ({ ...prev, description: value }))}
                                        placeholder="Describe this role's purpose"
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>
                            </View>

                            {/* Role Permissions */}
                            <View style={styles.rolePermissionsSection}>
                                <Text style={styles.sectionTitle}>Assign Permissions</Text>
                                <Text style={styles.sectionSubtitle}>Select permissions for this role</Text>

                                {permissionCategories.map((category) => (
                                    <View key={category.id} style={styles.permissionCategorySection}>
                                        <View style={styles.categorySectionHeader}>
                                            <View style={styles.categoryHeaderIcon}>
                                                <Settings size={16} color={colors.primary} />
                                            </View>
                                            <View style={styles.categoryHeaderInfo}>
                                                <Text style={styles.categorySectionTitle}>{category.name}</Text>
                                                <Text style={styles.categorySectionDescription}>{category.description}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.selectAllButton}
                                                onPress={() => {
                                                    const allSelected = category.permissions.every(p => newRole.permissions.includes(p.id));
                                                    if (allSelected) {
                                                        // Deselect all in category
                                                        setNewRole(prev => ({
                                                            ...prev,
                                                            permissions: prev.permissions.filter(id => !category.permissions.some(p => p.id === id))
                                                        }));
                                                    } else {
                                                        // Select all in category
                                                        const categoryPermIds = category.permissions.map(p => p.id);
                                                        setNewRole(prev => ({
                                                            ...prev,
                                                            permissions: [...new Set([...prev.permissions, ...categoryPermIds])]
                                                        }));
                                                    }
                                                }}
                                            >
                                                <Text style={styles.selectAllButtonText}>
                                                    {category.permissions.every(p => newRole.permissions.includes(p.id)) ? "Deselect All" : "Select All"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.categoryPermissionsList}>
                                            {category.permissions.map((permission) => (
                                                <TouchableOpacity
                                                    key={permission.id}
                                                    style={styles.enhancedPermissionCheckboxItem}
                                                    onPress={() => {
                                                        const isSelected = newRole.permissions.includes(permission.id);
                                                        if (isSelected) {
                                                            setNewRole(prev => ({
                                                                ...prev,
                                                                permissions: prev.permissions.filter(id => id !== permission.id)
                                                            }));
                                                        } else {
                                                            setNewRole(prev => ({
                                                                ...prev,
                                                                permissions: [...prev.permissions, permission.id]
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    <View style={styles.permissionCheckboxContainer}>
                                                        <View style={[
                                                            styles.enhancedCheckbox,
                                                            newRole.permissions.includes(permission.id) && styles.enhancedCheckboxChecked
                                                        ]}>
                                                            {newRole.permissions.includes(permission.id) && (
                                                                <CheckCircle size={14} color="white" />
                                                            )}
                                                        </View>
                                                        <View style={styles.enhancedPermissionInfo}>
                                                            <View style={styles.permissionNameRow}>
                                                                <Text style={styles.enhancedPermissionName}>
                                                                    {permission.name}
                                                                </Text>
                                                                <View style={[styles.permissionLevelBadge, { backgroundColor: getPermissionLevelColor(permission.level) + "20" }]}>
                                                                    {getPermissionLevelIcon(permission.level)}
                                                                    <Text style={[styles.permissionLevelText, { color: getPermissionLevelColor(permission.level) }]}>
                                                                        {permission.level.toUpperCase()}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.enhancedPermissionDescription}>
                                                                {permission.description}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Role Creation Summary */}
                            <View style={styles.roleCreationSummary}>
                                <Text style={styles.summaryTitle}>Role Summary</Text>
                                <View style={styles.summaryDetails}>
                                    <Text style={styles.summaryDetailText}>
                                        <Text style={styles.summaryDetailLabel}>Name: </Text>
                                        {newRole.name || "Untitled Role"}
                                    </Text>
                                    <Text style={styles.summaryDetailText}>
                                        <Text style={styles.summaryDetailLabel}>Permissions: </Text>
                                        {newRole.permissions.length} selected
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="ghost"
                                onPress={() => {
                                    setShowCreateRoleModal(false);
                                    setNewRole({ name: "", description: "", permissions: [] });
                                }}
                            />
                            <Button
                                title="Create Role"
                                variant="primary"
                                onPress={handleCreateRole}
                                disabled={!newRole.name.trim() || newRole.permissions.length === 0}
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
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.primary,
    },
    searchContainer: {
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },
    tabContent: {
        flex: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timeframeContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    timeframeButtons: {
        flexDirection: "row",
        gap: 8,
    },
    timeframeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timeframeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    timeframeButtonText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    timeframeButtonTextActive: {
        color: "white",
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    // User list styles
    usersList: {
        gap: 12,
    },
    userCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    userAvatarText: {
        fontSize: 16,
        fontWeight: "700",
        color: "white",
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    userRole: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    userActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    userPermissions: {
        marginBottom: 12,
    },
    permissionsLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 6,
    },
    permissionTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    permissionTag: {
        backgroundColor: colors.primary + "15",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    permissionTagText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.primary,
    },
    userFooter: {
        borderTopWidth: 1,
        borderTopColor: colors.border + "30",
        paddingTop: 8,
    },
    lastLoginText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    // Alerts styles
    alertsList: {
        gap: 12,
    },
    alertWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    deleteAlertButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.danger + "20",
    },
    // Activity styles
    activityList: {
        gap: 12,
    },
    activityItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 8,
        gap: 12,
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    activityContent: {
        flex: 1,
    },
    activityAction: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
        marginBottom: 2,
    },
    activityDetails: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    activityUser: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    activityTime: {
        alignItems: "flex-end",
    },
    activityTimeText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    // System styles
    systemHealthContainer: {
        marginBottom: 24,
    },
    healthGrid: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    healthItem: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    healthLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    healthMetric: {
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 4,
        fontWeight: "500",
    },
    systemMetricsContainer: {
        marginBottom: 24,
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    metricCard: {
        flex: 1,
        minWidth: 120,
        alignItems: "center",
        gap: 6,
    },
    metricLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "500",
        textAlign: "center",
    },
    metricValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: "700",
        textAlign: "center",
    },
    metricBar: {
        width: "100%",
        height: 6,
        backgroundColor: colors.background,
        borderRadius: 3,
        overflow: "hidden",
    },
    metricBarFill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    systemActionsContainer: {
        marginBottom: 24,
    },
    systemActionsList: {
        gap: 12,
    },
    systemActionItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    systemActionInfo: {
        flex: 1,
    },
    systemActionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    systemActionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    // Reports styles
    reportsList: {
        gap: 12,
        marginTop: 16,
    },
    reportItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    reportIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    reportInfo: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    reportDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        backgroundColor: colors.card,
        borderRadius: 20,
        margin: 20,
        maxHeight: "80%",
        width: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    modalContent: {
        padding: 20,
        maxHeight: 400,
    },
    settingSection: {
        marginBottom: 24,
    },
    settingSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + "30",
    },
    settingLabel: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    permissionsSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 16,
    },
    permissionCheckboxItem: {
        marginBottom: 16,
    },
    permissionCheckboxContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    permissionCheckboxInfo: {
        flex: 1,
    },
    permissionCheckboxName: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    permissionCheckboxDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    permissionSummary: {
        marginTop: 24,
        padding: 16,
        backgroundColor: colors.primary + "10",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary + "30",
    },
    permissionSummaryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    selectedPermissionsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    selectedPermissionItem: {
        backgroundColor: colors.primary + "20",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    selectedPermissionText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
    },
    // System Status styles
    systemStatusContainer: {
        marginBottom: 24,
    },
    statusHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    statusIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.success,
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    statusCard: {
        flex: 1,
        minWidth: "48%",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    statusCardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    statusCardValue: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 4,
    },
    statusCardMetric: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    statusCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statusCardTime: {
        fontSize: 10,
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    // Enhanced Metrics styles
    enhancedMetricsContainer: {
        marginBottom: 24,
    },
    metricsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
    },
    enhancedMetricCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    metricCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    metricCardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    metricCardValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 8,
    },
    enhancedMetricBar: {
        width: "100%",
        height: 8,
        backgroundColor: colors.background,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 12,
    },
    enhancedMetricBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    metricCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    metricCardSubtext: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    metricCardStatus: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.text,
    },
    // System Info styles
    systemInfoContainer: {
        marginBottom: 24,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    infoCard: {
        flex: 1,
        minWidth: "45%",
        alignItems: "center",
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        textAlign: "center",
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
    },
    // Security styles
    securityContainer: {
        marginBottom: 24,
    },
    securityHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    securityGrid: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    securityItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + "30",
        gap: 12,
    },
    securityLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    securityStatus: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    // Enhanced Actions styles
    enhancedActionsContainer: {
        marginBottom: 24,
    },
    actionsGrid: {
        gap: 20,
        marginBottom: 20,
    },
    actionCategory: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionCategoryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: "row",
        gap: 12,
    },
    enhancedActionCard: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    actionCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    actionCardTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
        marginBottom: 4,
    },
    actionCardDescription: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 4,
    },
    actionCardTime: {
        fontSize: 9,
        color: colors.textSecondary,
        textAlign: "center",
        fontStyle: "italic",
    },
    quickActionsBar: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    quickActionButton: {
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
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
    // Enhanced Permission Management styles
    permissionNavContainer: {
        marginBottom: 20,
    },
    permissionNavTabs: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    permissionNavTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    permissionNavTabActive: {
        backgroundColor: colors.primary + "15",
    },
    permissionNavTabText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    permissionNavTabTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },
    // Enhanced User Card styles
    enhancedUserCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    enhancedUserHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    userAvatarContainer: {
        position: "relative",
        marginRight: 16,
    },
    userStatusBadge: {
        position: "absolute",
        top: -2,
        right: -2,
    },
    enhancedUserInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    userActionButton: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: colors.primary + "15",
    },
    userRoleContainer: {
        marginTop: 8,
    },
    roleTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
        gap: 4,
    },
    roleTagText: {
        fontSize: 12,
        fontWeight: "600",
    },
    enhancedUserPermissions: {
        marginBottom: 16,
    },
    permissionsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary + "10",
    },
    viewAllButtonText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.primary,
    },
    enhancedPermissionTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    enhancedPermissionTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        gap: 6,
    },
    enhancedPermissionTagText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.text,
    },
    morePermissionsTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.textSecondary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    morePermissionsText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    enhancedUserFooter: {
        borderTopWidth: 1,
        borderTopColor: colors.border + "20",
        paddingTop: 12,
    },
    userMetrics: {
        flexDirection: "row",
        gap: 20,
    },
    userMetric: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    userMetricText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    // Role Management styles
    rolesList: {
        gap: 16,
    },
    roleCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    roleHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    roleIconContainer: {
        marginRight: 16,
    },
    roleIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    roleInfo: {
        flex: 1,
    },
    roleName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    roleDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    roleActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    systemRoleBadge: {
        backgroundColor: colors.warning + "20",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    systemRoleText: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.warning,
    },
    roleActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    rolePermissions: {
        marginBottom: 16,
    },
    rolePermissionsLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    rolePermissionsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    rolePermissionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border + "30",
        gap: 6,
    },
    rolePermissionText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.text,
    },
    rolePermissionMore: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    roleFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: colors.border + "20",
        paddingTop: 16,
    },
    roleUsageText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    viewRoleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary + "10",
    },
    viewRoleButtonText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.primary,
    },
    // Permission Categories styles
    permissionCategoriesList: {
        gap: 20,
    },
    permissionCategoryCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    permissionCategoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    categoryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    categoryDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    categoryStats: {
        alignItems: "flex-end",
    },
    categoryStatsText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    categoryPermissions: {
        gap: 12,
    },
    permissionDetailItem: {
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    permissionDetailHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 12,
    },
    permissionLevelBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border + "30",
        gap: 4,
    },
    permissionLevelText: {
        fontSize: 10,
        fontWeight: "700",
    },
    permissionDetailName: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
    },
    permissionDetailDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
    },
    permissionUsage: {
        borderTopWidth: 1,
        borderTopColor: colors.border + "20",
        paddingTop: 8,
    },
    permissionUsageText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    // Enhanced Modal styles
    enhancedModal: {
        backgroundColor: colors.card,
        borderRadius: 20,
        margin: 20,
        maxHeight: "85%",
        width: "92%",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    // Role Template Section styles
    roleTemplateSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },
    roleTemplateList: {
        gap: 12,
    },
    roleTemplateItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    roleTemplateItemActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + "10",
    },
    roleTemplateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    roleTemplateInfo: {
        flex: 1,
    },
    roleTemplateName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    roleTemplateDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        lineHeight: 16,
    },
    roleTemplateCount: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: "500",
    },
    // Enhanced Permissions Section styles
    enhancedPermissionsSection: {
        marginBottom: 24,
    },
    permissionCategorySection: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    categorySectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    categoryHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    categoryHeaderInfo: {
        flex: 1,
    },
    categorySectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    categorySectionDescription: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 14,
    },
    categoryPermissionCount: {
        alignItems: "flex-end",
    },
    categoryCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    categoryPermissionsList: {
        gap: 12,
    },
    enhancedPermissionCheckboxItem: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    enhancedCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    enhancedCheckboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    enhancedPermissionInfo: {
        flex: 1,
    },
    permissionNameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    enhancedPermissionName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
        marginRight: 8,
    },
    enhancedPermissionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    // Enhanced Permission Summary styles
    enhancedPermissionSummary: {
        backgroundColor: colors.primary + "05",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.primary + "20",
    },
    summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    summaryCount: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
    },
    summaryCategories: {
        gap: 12,
    },
    summaryCategoryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    summaryCategoryName: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.text,
        flex: 1,
    },
    summaryCategoryCount: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.primary,
        minWidth: 40,
        textAlign: "right",
    },
    summaryCategoryBar: {
        width: 60,
        height: 6,
        backgroundColor: colors.background,
        borderRadius: 3,
        overflow: "hidden",
    },
    summaryCategoryBarFill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    // Role Creation Modal styles
    roleBasicInfoSection: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    rolePermissionsSection: {
        marginBottom: 24,
    },
    selectAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.primary + "15",
        borderWidth: 1,
        borderColor: colors.primary + "30",
    },
    selectAllButtonText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.primary,
    },
    roleCreationSummary: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    summaryDetails: {
        gap: 8,
    },
    summaryDetailText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    summaryDetailLabel: {
        fontWeight: "600",
        color: colors.text,
    },
}); 