import { useState, useMemo } from 'react';
import {
  AdminUser,
  PermissionCategory,
  RoleTemplate,
  SystemSettings,
  SettingsStats,
  PermissionView,
  SettingsTab,
  Permission,
  NewRole,
} from '@/types/settings';

export function useSettingsData() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SettingsTab>('permissions');
  const [permissionView, setPermissionView] = useState<PermissionView>('users');
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '24h' | '7d' | '30d'
  >('7d');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [newRole, setNewRole] = useState<NewRole>({
    name: '',
    description: '',
    permissions: [],
  });
  const [userPermissions, setUserPermissions] = useState<
    Record<string, boolean>
  >({});

  // Mock admin users data
  const adminUsers = useMemo(
    () => [
      {
        id: '1',
        name: 'John Admin',
        email: 'john@ferry.com',
        role: 'super_admin',
        status: 'active' as const,
        last_login: '2024-01-15T10:30:00Z',
        created_at: '2023-06-15T08:00:00Z',
        permissions: [
          'users_view',
          'users_create',
          'users_edit',
          'users_delete',
          'users_permissions',
          'bookings_view',
          'bookings_create',
          'system_configure',
          'system_backup',
        ],
      },
      {
        id: '2',
        name: 'Sarah Manager',
        email: 'sarah@ferry.com',
        role: 'operations_manager',
        status: 'active' as const,
        last_login: '2024-01-15T09:15:00Z',
        created_at: '2023-08-20T10:30:00Z',
        permissions: [
          'bookings_view',
          'bookings_create',
          'bookings_edit',
          'vessels_view',
          'vessels_edit',
          'trips_schedule',
          'users_view',
        ],
      },
      {
        id: '3',
        name: 'Mike Supervisor',
        email: 'mike@ferry.com',
        role: 'customer_service',
        status: 'active' as const,
        last_login: '2024-01-14T16:45:00Z',
        created_at: '2023-09-10T14:20:00Z',
        permissions: [
          'bookings_view',
          'bookings_create',
          'bookings_edit',
          'users_view',
          'support_access',
          'notifications_send',
        ],
      },
      {
        id: '4',
        name: 'Lisa Admin',
        email: 'lisa@ferry.com',
        role: 'financial_officer',
        status: 'inactive' as const,
        last_login: '2024-01-10T14:20:00Z',
        created_at: '2023-07-05T11:15:00Z',
        permissions: [
          'payments_view',
          'payments_process',
          'financial_reports',
          'pricing_manage',
          'bookings_view',
        ],
      },
      {
        id: '5',
        name: 'David Tech',
        email: 'david@ferry.com',
        role: 'system_operator',
        status: 'active' as const,
        last_login: '2024-01-15T07:30:00Z',
        created_at: '2023-10-12T09:45:00Z',
        permissions: [
          'system_view',
          'system_logs',
          'vessels_view',
          'trips_monitor',
          'bookings_view',
        ],
      },
    ],
    []
  );

  // Enhanced permission categories and permissions
  const permissionCategories = useMemo(
    () => [
      {
        id: 'user_management',
        name: 'User Management',
        description: 'User account and profile management',
        icon: 'Users',
        permissions: [
          {
            id: 'users_view',
            name: 'View Users',
            description: 'View user profiles and basic information',
            level: 'read' as const,
          },
          {
            id: 'users_create',
            name: 'Create Users',
            description: 'Add new user accounts to the system',
            level: 'write' as const,
          },
          {
            id: 'users_edit',
            name: 'Edit Users',
            description: 'Modify user profiles and information',
            level: 'write' as const,
          },
          {
            id: 'users_delete',
            name: 'Delete Users',
            description: 'Remove user accounts from the system',
            level: 'delete' as const,
          },
          {
            id: 'users_permissions',
            name: 'Manage User Permissions',
            description: 'Assign and modify user permissions',
            level: 'admin' as const,
          },
          {
            id: 'users_export',
            name: 'Export User Data',
            description: 'Export user information and reports',
            level: 'read' as const,
          },
        ],
      },
      {
        id: 'booking_management',
        name: 'Booking Management',
        description: 'Ferry booking operations and management',
        icon: 'Calendar',
        permissions: [
          {
            id: 'bookings_view',
            name: 'View Bookings',
            description: 'View booking details and history',
            level: 'read' as const,
          },
          {
            id: 'bookings_create',
            name: 'Create Bookings',
            description: 'Make new ferry reservations',
            level: 'write' as const,
          },
          {
            id: 'bookings_edit',
            name: 'Edit Bookings',
            description: 'Modify existing bookings',
            level: 'write' as const,
          },
          {
            id: 'bookings_cancel',
            name: 'Cancel Bookings',
            description: 'Cancel and refund bookings',
            level: 'delete' as const,
          },
          {
            id: 'bookings_checkin',
            name: 'Check-in Management',
            description: 'Manage passenger check-in process',
            level: 'write' as const,
          },
          {
            id: 'bookings_reports',
            name: 'Booking Reports',
            description: 'Generate booking analytics and reports',
            level: 'read' as const,
          },
        ],
      },
      {
        id: 'vessel_operations',
        name: 'Vessel Operations',
        description: 'Ferry vessel and trip management',
        icon: 'Ship',
        permissions: [
          {
            id: 'vessels_view',
            name: 'View Vessels',
            description: 'View vessel information and status',
            level: 'read' as const,
          },
          {
            id: 'vessels_create',
            name: 'Add Vessels',
            description: 'Add new vessels to the fleet',
            level: 'write' as const,
          },
          {
            id: 'vessels_edit',
            name: 'Edit Vessels',
            description: 'Modify vessel details and configurations',
            level: 'write' as const,
          },
          {
            id: 'vessels_delete',
            name: 'Remove Vessels',
            description: 'Remove vessels from the fleet',
            level: 'delete' as const,
          },
          {
            id: 'trips_schedule',
            name: 'Schedule Trips',
            description: 'Create and manage trip schedules',
            level: 'write' as const,
          },
          {
            id: 'trips_monitor',
            name: 'Monitor Operations',
            description: 'Track real-time vessel operations',
            level: 'read' as const,
          },
        ],
      },
      {
        id: 'financial_management',
        name: 'Financial Management',
        description: 'Payment processing and financial operations',
        icon: 'DollarSign',
        permissions: [
          {
            id: 'payments_view',
            name: 'View Payments',
            description: 'View payment transactions and history',
            level: 'read' as const,
          },
          {
            id: 'payments_process',
            name: 'Process Payments',
            description: 'Handle payment processing and refunds',
            level: 'write' as const,
          },
          {
            id: 'financial_reports',
            name: 'Financial Reports',
            description: 'Generate revenue and financial reports',
            level: 'read' as const,
          },
          {
            id: 'pricing_manage',
            name: 'Manage Pricing',
            description: 'Set and modify ticket pricing',
            level: 'write' as const,
          },
          {
            id: 'accounting_access',
            name: 'Accounting Access',
            description: 'Access detailed accounting information',
            level: 'admin' as const,
          },
        ],
      },
      {
        id: 'system_administration',
        name: 'System Administration',
        description: 'System configuration and maintenance',
        icon: 'Settings',
        permissions: [
          {
            id: 'system_view',
            name: 'View System Status',
            description: 'Monitor system health and performance',
            level: 'read' as const,
          },
          {
            id: 'system_configure',
            name: 'System Configuration',
            description: 'Modify system settings and parameters',
            level: 'admin' as const,
          },
          {
            id: 'system_backup',
            name: 'Backup Management',
            description: 'Create and manage system backups',
            level: 'admin' as const,
          },
          {
            id: 'system_logs',
            name: 'System Logs',
            description: 'Access and analyze system logs',
            level: 'read' as const,
          },
          {
            id: 'system_maintenance',
            name: 'System Maintenance',
            description: 'Perform system maintenance operations',
            level: 'admin' as const,
          },
        ],
      },
      {
        id: 'communication',
        name: 'Communication',
        description: 'Customer communication and support',
        icon: 'MessageSquare',
        permissions: [
          {
            id: 'notifications_send',
            name: 'Send Notifications',
            description: 'Send system notifications to users',
            level: 'write' as const,
          },
          {
            id: 'support_access',
            name: 'Customer Support',
            description: 'Access customer support tools',
            level: 'write' as const,
          },
          {
            id: 'announcements_manage',
            name: 'Manage Announcements',
            description: 'Create and manage system announcements',
            level: 'write' as const,
          },
          {
            id: 'communication_reports',
            name: 'Communication Reports',
            description: 'View communication analytics',
            level: 'read' as const,
          },
        ],
      },
    ],
    []
  );

  // Predefined role templates
  const roleTemplates = useMemo(
    () => [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        color: '#DC2626',
        permissions: permissionCategories.flatMap(cat =>
          cat.permissions.map(p => p.id)
        ),
        isSystemRole: true,
      },
      {
        id: 'operations_manager',
        name: 'Operations Manager',
        description: 'Manage bookings, vessels, and day-to-day operations',
        color: '#2563EB',
        permissions: [
          'bookings_view',
          'bookings_create',
          'bookings_edit',
          'bookings_cancel',
          'bookings_checkin',
          'vessels_view',
          'vessels_edit',
          'trips_schedule',
          'trips_monitor',
          'users_view',
          'support_access',
          'notifications_send',
        ],
        isSystemRole: true,
      },
      {
        id: 'customer_service',
        name: 'Customer Service',
        description: 'Handle customer inquiries and basic booking management',
        color: '#059669',
        permissions: [
          'bookings_view',
          'bookings_create',
          'bookings_edit',
          'users_view',
          'support_access',
          'notifications_send',
          'announcements_manage',
        ],
        isSystemRole: true,
      },
      {
        id: 'financial_officer',
        name: 'Financial Officer',
        description: 'Manage payments, pricing, and financial reports',
        color: '#D97706',
        permissions: [
          'payments_view',
          'payments_process',
          'financial_reports',
          'pricing_manage',
          'bookings_view',
          'accounting_access',
        ],
        isSystemRole: true,
      },
      {
        id: 'system_operator',
        name: 'System Operator',
        description: 'Monitor system health and perform basic maintenance',
        color: '#7C3AED',
        permissions: [
          'system_view',
          'system_logs',
          'vessels_view',
          'trips_monitor',
          'bookings_view',
          'users_view',
        ],
        isSystemRole: true,
      },
    ],
    [permissionCategories]
  );

  // Flatten all permissions for easy access
  const availablePermissions = useMemo(
    () =>
      permissionCategories.flatMap(category =>
        category.permissions.map(permission => ({
          ...permission,
          categoryId: category.id,
          categoryName: category.name,
        }))
      ),
    [permissionCategories]
  );

  return {
    // State
    refreshing,
    setRefreshing,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    permissionView,
    setPermissionView,
    selectedTimeframe,
    setSelectedTimeframe,
    selectedUser,
    setSelectedUser,
    selectedRole,
    setSelectedRole,
    newRole,
    setNewRole,
    userPermissions,
    setUserPermissions,

    // Data
    adminUsers,
    permissionCategories,
    roleTemplates,
    availablePermissions,
  };
}
