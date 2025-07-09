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
                return adminPermissions.filter(permission =>
                    (permission?.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (permission?.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                );
            default:
                return [];
        }
    }, [activeTab, searchQuery, alerts, activityLogs, adminPermissions]);

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
                                <View style={styles.sectionHeader}>
                                    <SectionHeader
                                        title="Admin Permissions"
                                        subtitle="Manage user roles and permissions"
                                    />
                                    <Button
                                        title="Add Permission"
                                        variant="primary"
                                        size="small"
                                        icon={<Plus size={16} color="white" />}
                                        onPress={() => {
                                            setSelectedPermission(null);
                                            setShowPermissionModal(true);
                                        }}
                                    />
                                </View>

                                {filteredData.length === 0 ? (
                                    <EmptyState
                                        icon={<Shield size={48} color={colors.textSecondary} />}
                                        title="No permissions found"
                                        message="Add permissions to manage admin access"
                                    />
                                ) : (
                                    <View style={styles.permissionsList}>
                                        {(filteredData as AdminPermission[]).map((permission) => (
                                            <View key={permission.id} style={styles.permissionCard}>
                                                <View style={styles.permissionHeader}>
                                                    <View style={styles.permissionIcon}>
                                                        <Shield size={20} color={colors.primary} />
                                                    </View>
                                                    <View style={styles.permissionInfo}>
                                                        <Text style={styles.permissionName}>{permission.name}</Text>
                                                        <Text style={styles.permissionDescription}>{permission.description}</Text>
                                                        <Text style={styles.permissionScope}>Scope: {permission.action || "All"}</Text>
                                                    </View>
                                                    <View style={styles.permissionActions}>
                                                        <TouchableOpacity
                                                            style={styles.actionButton}
                                                            onPress={() => {
                                                                setSelectedPermission(permission);
                                                                setShowPermissionModal(true);
                                                            }}
                                                        >
                                                            <Edit size={16} color={colors.primary} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.actionButton}
                                                            onPress={() => {
                                                                Alert.alert(
                                                                    "Delete Permission",
                                                                    "Are you sure?",
                                                                    [
                                                                        { text: "Cancel" },
                                                                        { text: "Delete", style: "destructive" }
                                                                    ]
                                                                );
                                                            }}
                                                        >
                                                            <Trash2 size={16} color={colors.danger} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                                <View style={styles.permissionRoles}>
                                                    {["admin", "manager"].map((role) => (
                                                        <View key={role} style={styles.roleTag}>
                                                            <Text style={styles.roleTagText}>{role}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
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
                        <View style={styles.sectionHeader}>
                            <SectionHeader
                                title="System Alerts"
                                subtitle={`${alerts.filter(a => !a.read).length} unread alerts`}
                            />
                            {alerts.filter(a => !a.read).length > 0 && (
                                <Button
                                    title="Mark All Read"
                                    variant="outline"
                                    size="small"
                                    onPress={markAllAlertsAsRead}
                                />
                            )}
                        </View>

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
                        <View style={styles.sectionHeader}>
                            <SectionHeader
                                title="Activity Logs"
                                subtitle="System activity and audit trail"
                            />
                            {canExportReports() && (
                                <Button
                                    title="Export"
                                    variant="outline"
                                    size="small"
                                    icon={<Download size={16} color={colors.primary} />}
                                    onPress={handleExportActivity}
                                />
                            )}
                        </View>

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
                        <SectionHeader
                            title="System Management"
                            subtitle="System status and maintenance tools"
                        />

                        {/* System Health */}
                        <View style={styles.systemHealthContainer}>
                            <Text style={styles.subsectionTitle}>System Health</Text>
                            <View style={styles.healthGrid}>
                                <View style={styles.healthItem}>
                                    <Server size={24} color={colors.success} />
                                    <Text style={styles.healthLabel}>Server</Text>
                                    <StatusBadge status="active" size="small" />
                                </View>
                                <View style={styles.healthItem}>
                                    <Database size={24} color={colors.success} />
                                    <Text style={styles.healthLabel}>Database</Text>
                                    <StatusBadge status="active" size="small" />
                                </View>
                                <View style={styles.healthItem}>
                                    <Wifi size={24} color={colors.success} />
                                    <Text style={styles.healthLabel}>Network</Text>
                                    <StatusBadge status="active" size="small" />
                                </View>
                                <View style={styles.healthItem}>
                                    <HardDrive size={24} color={colors.warning} />
                                    <Text style={styles.healthLabel}>Storage</Text>
                                    <StatusBadge status="inactive" size="small" />
                                </View>
                            </View>
                        </View>

                        {/* System Actions */}
                        <View style={styles.systemActionsContainer}>
                            <Text style={styles.subsectionTitle}>System Actions</Text>
                            <View style={styles.systemActionsList}>
                                <TouchableOpacity
                                    style={styles.systemActionItem}
                                    onPress={handleSystemBackup}
                                >
                                    <Database size={24} color={colors.primary} />
                                    <View style={styles.systemActionInfo}>
                                        <Text style={styles.systemActionTitle}>Create Backup</Text>
                                        <Text style={styles.systemActionDescription}>
                                            Create a complete system backup
                                        </Text>
                                    </View>
                                    <Button title="Backup" variant="primary" size="small" onPress={handleSystemBackup} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.systemActionItem}
                                    onPress={() => setShowSystemModal(true)}
                                >
                                    <Settings size={24} color={colors.secondary} />
                                    <View style={styles.systemActionInfo}>
                                        <Text style={styles.systemActionTitle}>System Settings</Text>
                                        <Text style={styles.systemActionDescription}>
                                            Configure system parameters
                                        </Text>
                                    </View>
                                    <Button title="Configure" variant="outline" size="small" onPress={() => setShowSystemModal(true)} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.systemActionItem}
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
                                    <Zap size={24} color={colors.warning} />
                                    <View style={styles.systemActionInfo}>
                                        <Text style={styles.systemActionTitle}>Clear Cache</Text>
                                        <Text style={styles.systemActionDescription}>
                                            Clear system cache and temporary files
                                        </Text>
                                    </View>
                                    <Button title="Clear" variant="outline" size="small" onPress={() => {
                                        Alert.alert(
                                            "Clear Cache",
                                            "This will clear all system cache. Continue?",
                                            [
                                                { text: "Cancel" },
                                                { text: "Clear", style: "destructive" }
                                            ]
                                        );
                                    }} />
                                </TouchableOpacity>
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
    tabContent: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    // Permissions styles
    permissionsList: {
        gap: 12,
    },
    permissionCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    permissionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    permissionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + "20",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    permissionInfo: {
        flex: 1,
    },
    permissionName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    permissionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    permissionScope: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    permissionActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    permissionRoles: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    roleTag: {
        backgroundColor: colors.primary + "20",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    roleTagText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
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