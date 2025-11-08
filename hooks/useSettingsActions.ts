import { useState } from 'react';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminUser, RoleTemplate, NewRole } from '@/types/settings';
import {
  Alert as AdminAlert,
  ActivityLog as AdminActivityLog,
} from '@/types/admin';
import { useAlertContext } from '@/components/AlertProvider';

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
    restoreDatabase,
  } = useAdminStore();

  const {
    canManagePermissions,
    canViewActivityLogs,
    canManageSystemSettings,
    canExportReports,
    canViewAlerts,
  } = useAdminPermissions();

  const { showError, showSuccess, showConfirmation, showInfo } =
    useAlertContext();
  const [tempSettings, setTempSettings] = useState<any>({});

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Refresh error:', error);
      throw error;
    }
  };

  const handleAlertAction = (alert: AdminAlert, action: 'read' | 'delete') => {
    if (!canViewAlerts()) {
      showError('Access Denied', "You don't have permission to manage alerts.");
      return;
    }

    if (action === 'read') {
      markAlertAsRead(alert.id);
    } else if (action === 'delete') {
      showConfirmation(
        'Delete Alert',
        'Are you sure you want to delete this alert?',
        () => deleteAlert(alert.id),
        undefined,
        true
      );
    }
  };

  const handleExportActivity = async (filteredData: AdminActivityLog[]) => {
    if (!canExportReports()) {
      showError(
        'Access Denied',
        "You don't have permission to export reports."
      );
      return;
    }

    try {
      await exportActivityLogs(filteredData);
      showSuccess('Success', 'Activity logs exported successfully.');
    } catch (error) {
      showError('Error', 'Failed to export activity logs.');
      throw error;
    }
  };

  const handleSystemBackup = async () => {
    if (!canManageSystemSettings()) {
      showError(
        'Access Denied',
        "You don't have permission to manage system settings."
      );
      return;
    }

    showConfirmation(
      'System Backup',
      'This will create a complete system backup. Continue?',
      async () => {
        try {
          await backupDatabase();
          showSuccess('Success', 'System backup completed successfully.');
        } catch (error) {
          showError('Error', 'Failed to create system backup.');
          throw error;
        }
      },
      undefined,
      false
    );
  };

  const handleSaveSettings = async () => {
    if (!canManageSystemSettings()) {
      showError(
        'Access Denied',
        "You don't have permission to update system settings."
      );
      return;
    }

    try {
      await updateSystemSettings(tempSettings);
      showSuccess('Success', 'System settings updated successfully.');
    } catch (error) {
      showError('Error', 'Failed to update system settings.');
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
          .map(([permId, _]) => permId),
      };

      // Update the admin users array (in real app, this would be done via store/API)

      setSelectedUser(null);
      showSuccess('Success', 'User permissions updated successfully.');
    } catch (error) {
      showError('Error', 'Failed to update user permissions.');
      throw error;
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (!setUserPermissions || !userPermissions) return;
    setUserPermissions({
      ...userPermissions,
      [permissionId]: !userPermissions[permissionId],
    });
  };

  const handleCreateRole = async () => {
    if (!newRole || !setNewRole) return;
    try {
      // Here you would typically create the role in your backend/store

      setNewRole({ name: '', description: '', permissions: [] });
      showSuccess('Success', 'Role created successfully.');
    } catch (error) {
      showError('Error', 'Failed to create role.');
      throw error;
    }
  };

  const handleDeleteRole = (roleId: string) => {
    showConfirmation(
      'Delete Role',
      'Are you sure you want to delete this role? Users with this role will lose their permissions.',
      () => {
        // Handle role deletion
        showSuccess('Success', 'Role deleted successfully.');
      },
      undefined,
      true
    );
  };

  const handleCloneRole = (role: RoleTemplate) => {
    if (!setNewRole) return;
    setNewRole({
      name: `${role.name} (Copy)`,
      description: role.description,
      permissions: [...role.permissions],
    });
  };

  const handleClearCache = () => {
    showConfirmation(
      'Clear Cache',
      'This will clear all system cache. Continue?',
      () => {
        // Handle cache clearing
        showSuccess('Success', 'Cache cleared successfully.');
      },
      undefined,
      true
    );
  };

  const handleRestartSystem = () => {
    showConfirmation(
      'Restart System',
      'This will restart all system services. Continue?',
      () => {
        // Handle system restart
        showSuccess('Success', 'System restart initiated.');
      },
      undefined,
      true
    );
  };

  const handleHealthCheck = () => {
    showInfo('Health Check', 'Running system diagnostics...');
    // Simulate health check
    setTimeout(() => {
      showSuccess('Health Check Complete', 'All systems are operational.');
    }, 2000);
  };

  const handleGenerateReport = (reportType: string) => {
    showInfo('Report', `Generating ${reportType} report...`);
    // Handle report generation
    setTimeout(() => {
      showSuccess('Report Ready', `${reportType} report has been generated.`);
    }, 1500);
  };

  const handleExportLogs = () => {
    showInfo('Export', 'Preparing log files...');
    // Handle log export
    setTimeout(() => {
      showSuccess('Export Complete', 'Log files have been exported.');
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
