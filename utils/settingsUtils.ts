import { colors } from '@/constants/adminColors';
import {
  PermissionLevel,
  AdminUser,
  SettingsStats,
  PermissionCategory,
  RoleTemplate,
  Permission,
} from '@/types/settings';
import {
  Alert as AdminAlert,
  ActivityLog as AdminActivityLog,
} from '@/types/admin';

export const getPermissionLevelColor = (level: PermissionLevel): string => {
  switch (level) {
    case 'read':
      return colors.success;
    case 'write':
      return colors.primary;
    case 'delete':
      return colors.warning;
    case 'admin':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
};

export const getPermissionLevelIcon = (level: PermissionLevel) => {
  // This would return the appropriate icon based on level
  // Since we can't import React components here, we return the icon name
  switch (level) {
    case 'read':
      return 'Eye';
    case 'write':
      return 'Edit';
    case 'delete':
      return 'Trash2';
    case 'admin':
      return 'Shield';
    default:
      return 'Eye';
  }
};

export const calculateSettingsStats = (
  adminUsers: AdminUser[],
  permissionCategories: PermissionCategory[],
  roleTemplates: RoleTemplate[],
  alerts: AdminAlert[],
  activityLogs: AdminActivityLog[],
  selectedTimeframe: '24h' | '7d' | '30d',
  systemSettings?: any
): SettingsStats => {
  const availablePermissions = permissionCategories.flatMap(
    cat => cat.permissions
  );
  const unreadAlerts = alerts.filter(a => !a.read).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  const timeframes = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const recentActivity = activityLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const now = new Date();
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
    lastBackup: systemSettings?.last_backup || 'Never',
  };
};

export const filterSettingsData = (
  activeTab: string,
  searchQuery: string,
  alerts: AdminAlert[],
  activityLogs: AdminActivityLog[],
  adminUsers: AdminUser[]
) => {
  const query = searchQuery.toLowerCase();

  switch (activeTab) {
    case 'alerts':
      return alerts.filter(
        alert =>
          (alert?.title?.toLowerCase() || '').includes(query) ||
          (alert?.message?.toLowerCase() || '').includes(query)
      );
    case 'activity':
      return activityLogs.filter(
        log =>
          (log?.action?.toLowerCase() || '').includes(query) ||
          (log?.user_name?.toLowerCase() || '').includes(query) ||
          (log?.details?.toLowerCase() || '').includes(query)
      );
    case 'permissions':
      return adminUsers.filter(
        user =>
          (user?.name?.toLowerCase() || '').includes(query) ||
          (user?.email?.toLowerCase() || '').includes(query) ||
          (user?.role?.toLowerCase() || '').includes(query)
      );
    default:
      return [];
  }
};

export const getResponsivePadding = (screenWidth: number) => {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  return {
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  };
};

export const getUserInitials = (fullName: string): string => {
  return fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
};

export const validateRoleName = (
  name: string,
  existingRoles: RoleTemplate[]
): string | null => {
  if (!name.trim()) {
    return 'Role name is required';
  }

  if (name.length < 3) {
    return 'Role name must be at least 3 characters';
  }

  if (
    existingRoles.some(role => role.name.toLowerCase() === name.toLowerCase())
  ) {
    return 'Role name already exists';
  }

  return null;
};

export const validatePermissionSelection = (
  permissions: string[]
): string | null => {
  if (permissions.length === 0) {
    return 'At least one permission must be selected';
  }

  return null;
};

export const getUserRoleColor = (
  roleId: string,
  roleTemplates: RoleTemplate[]
): string => {
  const role = roleTemplates.find(r => r.id === roleId);
  return role?.color || colors.primary;
};

export const getPermissionsByCategory = (
  permissions: string[],
  permissionCategories: PermissionCategory[]
): Record<string, Permission[]> => {
  const result: Record<string, Permission[]> = {};

  permissionCategories.forEach(category => {
    result[category.id] = category.permissions.filter(p =>
      permissions.includes(p.id)
    );
  });

  return result;
};

export const sortUsersByStatus = (users: AdminUser[]): AdminUser[] => {
  return [...users].sort((a, b) => {
    // Active users first
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;

    // Then sort by name
    return a.name.localeCompare(b.name);
  });
};

export const formatSystemMetric = (
  value: number,
  type: 'percentage' | 'bytes' | 'count'
): string => {
  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'bytes':
      if (value < 1024) return `${value}B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
      if (value < 1024 * 1024 * 1024)
        return `${(value / (1024 * 1024)).toFixed(1)}MB`;
      return `${(value / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    case 'count':
      return value.toLocaleString();
    default:
      return value.toString();
  }
};
