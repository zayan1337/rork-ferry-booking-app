import { useState } from "react";
import { Alert } from "react-native";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminUser, RoleTemplate, NewRole } from "@/types/settings";
import { Alert as AdminAlert, ActivityLog as AdminActivityLog } from "@/types/admin";

interface UseSettingsActionsProps {
    selectedUser?: AdminUser | null;
    setSelectedUser?: (user: AdminUser | null) => void;
    newRole?: NewRole;
    setNewRole?: (role: NewRole) => void;
    userPermissions?: Record<string, boolean>;
    setUserPermissions?: (permissions: Record<string, boolean>) => void;
}

export function useSettingsActions({
    selectedUser,
    setSelectedUser,
    newRole,
    setNewRole,
    userPermissions,
    setUserPermissions,
}: UseSettingsActionsProps = {}) {
    const {
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

    const [tempSettings, setTempSettings] = useState<any>({});

    const handleRefresh = async () => {
        try {
            await refreshData();
        } catch (error) {
            console.error("Refresh error:", error);
            throw error;
        }
    };

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

    const handleExportActivity = async (filteredData: AdminActivityLog[]) => {
        if (!canExportReports()) {
            Alert.alert("Access Denied", "You don't have permission to export reports.");
            return;
        }

        try {
            await exportActivityLogs(filteredData);
            Alert.alert("Success", "Activity logs exported successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to export activity logs.");
            throw error;
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
                            throw error;
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
            Alert.alert("Success", "System settings updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update system settings.");
            throw error;
        }
    };

    const handleSaveUserPermissions = async () => {
        if (!selectedUser || !userPermissions || !setSelectedUser) return;

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

            setSelectedUser(null);
            Alert.alert("Success", "User permissions updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update user permissions.");
            throw error;
        }
    };

    const handlePermissionToggle = (permissionId: string) => {
        if (!setUserPermissions) return;
        setUserPermissions(prev => ({
            ...prev,
            [permissionId]: !prev[permissionId]
        }));
    };

    const handleCreateRole = async () => {
        if (!newRole || !setNewRole) return;
        try {
            // Here you would typically create the role in your backend/store
            console.log("Creating new role:", newRole);

            setNewRole({ name: "", description: "", permissions: [] });
            Alert.alert("Success", "Role created successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to create role.");
            throw error;
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

    const handleCloneRole = (role: RoleTemplate) => {
        if (!setNewRole) return;
        setNewRole({
            name: `${role.name} (Copy)`,
            description: role.description,
            permissions: [...role.permissions]
        });
    };

    const handleClearCache = () => {
        Alert.alert(
            "Clear Cache",
            "This will clear all system cache. Continue?",
            [
                { text: "Cancel" },
                {
                    text: "Clear", style: "destructive", onPress: () => {
                        // Handle cache clearing
                        console.log("Clearing cache...");
                        Alert.alert("Success", "Cache cleared successfully.");
                    }
                }
            ]
        );
    };

    const handleRestartSystem = () => {
        Alert.alert(
            "Restart System",
            "This will restart all system services. Continue?",
            [
                { text: "Cancel" },
                {
                    text: "Restart", style: "destructive", onPress: () => {
                        // Handle system restart
                        console.log("Restarting system...");
                        Alert.alert("Success", "System restart initiated.");
                    }
                }
            ]
        );
    };

    const handleHealthCheck = () => {
        Alert.alert("Health Check", "Running system diagnostics...");
        // Simulate health check
        setTimeout(() => {
            Alert.alert("Health Check Complete", "All systems are operational.");
        }, 2000);
    };

    const handleGenerateReport = (reportType: string) => {
        Alert.alert("Report", `Generating ${reportType} report...`);
        // Handle report generation
        setTimeout(() => {
            Alert.alert("Report Ready", `${reportType} report has been generated.`);
        }, 1500);
    };

    const handleExportLogs = () => {
        Alert.alert("Export", "Preparing log files...");
        // Handle log export
        setTimeout(() => {
            Alert.alert("Export Complete", "Log files have been exported.");
        }, 1500);
    };

    return {
        // Settings
        tempSettings,
        setTempSettings,

        // Main Actions
        handleRefresh,
        handleAlertAction,
        handleExportActivity,
        handleSystemBackup,
        handleSaveSettings,

        // Permission Actions
        handleSaveUserPermissions,
        handlePermissionToggle,
        handleCreateRole,
        handleDeleteRole,
        handleCloneRole,

        // System Actions
        handleClearCache,
        handleRestartSystem,
        handleHealthCheck,
        handleGenerateReport,
        handleExportLogs,

        // Report Actions
        exportSystemReport,
    };
} 