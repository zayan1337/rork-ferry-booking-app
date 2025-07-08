export interface Permission {
    id: string;
    name: string;
    description?: string;
    resource: string;
    action: string;
    created_at: string;
}

export interface UserPermission {
    id: string;
    user_id: string;
    permission_id: string;
    granted_by: string;
    granted_at: string;
    expires_at?: string;
    is_active: boolean;
    // Joined data
    permission?: Permission;
    granted_by_name?: string;
}

export interface RolePermission {
    id: string;
    role: 'customer' | 'agent' | 'admin';
    permission_id: string;
    created_at: string;
    // Joined data
    permission?: Permission;
}

export interface UserWithPermissions {
    id: string;
    full_name: string;
    email: string;
    role: 'customer' | 'agent' | 'admin';
    is_super_admin: boolean;
    is_active: boolean;
    individual_permissions: Permission[];
    role_permissions: Permission[];
    all_permissions: Permission[];
}

export interface PermissionGroup {
    resource: string;
    permissions: Permission[];
}

export interface PermissionCheckResult {
    hasPermission: boolean;
    source?: 'super_admin' | 'individual' | 'role';
    permission?: Permission;
}

export interface PermissionAssignment {
    user_id: string;
    permission_ids: string[];
    granted_by: string;
    expires_at?: string;
}

export interface PermissionRevocation {
    user_id: string;
    permission_ids: string[];
    revoked_by: string;
}

// Resource-based permission constants
export const PERMISSION_RESOURCES = {
    DASHBOARD: 'dashboard',
    USERS: 'users',
    BOOKINGS: 'bookings',
    SCHEDULE: 'schedule',
    VESSELS: 'vessels',
    ROUTES: 'routes',
    PAYMENTS: 'payments',
    SYSTEM: 'system',
    COMMUNICATIONS: 'communications',
    REPORTS: 'reports',
} as const;

export const PERMISSION_ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    EDIT: 'edit',
    DELETE: 'delete',
    EXPORT: 'export',
    MANAGE: 'manage',
    PROCESS: 'process',
} as const;

// Predefined permission names for type safety
export const PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',
    DASHBOARD_EXPORT_REPORTS: 'dashboard.export_reports',

    // Users
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',
    USERS_MANAGE_ROLES: 'users.manage_roles',
    USERS_RESET_PASSWORD: 'users.reset_password',
    USERS_VIEW_SENSITIVE: 'users.view_sensitive',

    // Bookings
    BOOKINGS_VIEW: 'bookings.view',
    BOOKINGS_CREATE: 'bookings.create',
    BOOKINGS_EDIT: 'bookings.edit',
    BOOKINGS_CANCEL: 'bookings.cancel',
    BOOKINGS_CHECK_IN: 'bookings.check_in',
    BOOKINGS_EXPORT: 'bookings.export',

    // Schedule
    SCHEDULE_VIEW: 'schedule.view',
    SCHEDULE_CREATE: 'schedule.create',
    SCHEDULE_EDIT: 'schedule.edit',
    SCHEDULE_DELETE: 'schedule.delete',
    SCHEDULE_MANAGE_CAPACITY: 'schedule.manage_capacity',

    // Vessels
    VESSELS_VIEW: 'vessels.view',
    VESSELS_CREATE: 'vessels.create',
    VESSELS_EDIT: 'vessels.edit',
    VESSELS_DELETE: 'vessels.delete',
    VESSELS_TRACK: 'vessels.track',

    // Routes
    ROUTES_VIEW: 'routes.view',
    ROUTES_CREATE: 'routes.create',
    ROUTES_EDIT: 'routes.edit',
    ROUTES_DELETE: 'routes.delete',
    ROUTES_MANAGE_PRICING: 'routes.manage_pricing',

    // Payments
    PAYMENTS_VIEW: 'payments.view',
    PAYMENTS_PROCESS: 'payments.process',
    PAYMENTS_REFUND: 'payments.refund',
    PAYMENTS_EXPORT: 'payments.export',

    // System
    SYSTEM_MANAGE_PERMISSIONS: 'system.manage_permissions',
    SYSTEM_VIEW_LOGS: 'system.view_logs',
    SYSTEM_MANAGE_SETTINGS: 'system.manage_settings',
    SYSTEM_BACKUP_RESTORE: 'system.backup_restore',
    SYSTEM_EMERGENCY_ACTIONS: 'system.emergency_actions',

    // Communications
    COMMUNICATIONS_SEND_NOTIFICATIONS: 'communications.send_notifications',
    COMMUNICATIONS_MASS_MESSAGES: 'communications.mass_messages',
    COMMUNICATIONS_EMERGENCY_ALERTS: 'communications.emergency_alerts',

    // Reports
    REPORTS_VIEW_BASIC: 'reports.view_basic',
    REPORTS_VIEW_ADVANCED: 'reports.view_advanced',
    REPORTS_EXPORT: 'reports.export',
    REPORTS_SCHEDULE_AUTOMATED: 'reports.schedule_automated',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type PermissionResource = typeof PERMISSION_RESOURCES[keyof typeof PERMISSION_RESOURCES];
export type PermissionAction = typeof PERMISSION_ACTIONS[keyof typeof PERMISSION_ACTIONS];

// Enhanced user profile with super admin support
export interface EnhancedUserProfile {
    id: string;
    full_name: string;
    email: string;
    mobile_number: string;
    date_of_birth: string;
    role: 'customer' | 'agent' | 'admin';
    is_super_admin: boolean;
    is_active: boolean;
    accepted_terms: boolean;
    agent_discount?: number;
    credit_ceiling?: number;
    credit_balance?: number;
    free_tickets_allocation?: number;
    free_tickets_remaining?: number;
    preferred_language?: string;
    text_direction?: string;
    created_at: string;
    updated_at: string;
}

// Permission management UI types
export interface PermissionCardProps {
    permission: Permission;
    isGranted: boolean;
    isLoading: boolean;
    onToggle: (permission: Permission) => void;
    disabled?: boolean;
}

export interface PermissionGroupCardProps {
    group: PermissionGroup;
    grantedPermissions: Permission[];
    onPermissionToggle: (permission: Permission) => void;
    isLoading: boolean;
    disabled?: boolean;
}

export interface UserPermissionManagerProps {
    user: EnhancedUserProfile;
    onPermissionChange: (userId: string, permissionIds: string[], action: 'grant' | 'revoke') => Promise<void>;
    onSuperAdminToggle: (userId: string, isSuperAdmin: boolean) => Promise<void>;
    disabled?: boolean;
} 