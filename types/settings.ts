export type SettingsTab =
  | 'permissions'
  | 'alerts'
  | 'activity'
  | 'system'
  | 'reports'
  | 'islands'
  | 'zones'
  | 'faq'
  | 'content';

export type PermissionView = 'users' | 'roles' | 'permissions';

export type PermissionLevel = 'read' | 'write' | 'delete' | 'admin';

export interface Permission {
  id: string;
  name: string;
  description: string;
  level: PermissionLevel;
}

export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  permissions: Permission[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  last_login: string;
  created_at: string;
  permissions: string[];
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  isSystemRole: boolean;
}

export interface NewRole {
  name: string;
  description: string;
  permissions: string[];
}

export interface SystemSettings {
  maintenance_mode?: boolean;
  auto_backup?: boolean;
  two_factor_auth?: boolean;
  session_timeout?: number;
  last_backup?: string;
}

export interface SettingsStats {
  totalAdminUsers: number;
  activeAdminUsers: number;
  totalPermissions: number;
  activePermissions: number;
  totalRoles: number;
  customRoles: number;
  permissionCategories: number;
  totalAlerts: number;
  unreadAlerts: number;
  criticalAlerts: number;
  totalActivityLogs: number;
  recentActivity: number;
  systemHealth: number;
  lastBackup: string;
}

export interface SettingsActions {
  handleRefresh: () => Promise<void>;
  handleAlertAction: (alert: any, action: 'read' | 'delete') => void;
  handleExportActivity: () => Promise<void>;
  handleSystemBackup: () => Promise<void>;
  handleSaveSettings: () => Promise<void>;
  handleDeleteRole: (roleId: string) => void;
}

export interface PermissionCategoryCardProps {
  category: PermissionCategory;
  adminUsers: AdminUser[];
}

export interface StatusCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  status: 'active' | 'warning' | 'inactive';
  metric?: string;
  time?: string;
}

export interface MetricCardProps {
  title: string;
  value: string;
  percentage: number;
  color: string;
  subtext: string;
  status: string;
}

export interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  time?: string;
  onPress: () => void;
}

export interface TimeframeType {
  '24h': number;
  '7d': number;
  '30d': number;
}

export interface SecurityItem {
  icon: React.ReactNode;
  label: string;
  status: string;
}
