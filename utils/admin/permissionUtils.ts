import { PERMISSIONS, PermissionName } from '@/types/permissions';

// Default permission sets for different roles
export const ROLE_PERMISSION_TEMPLATES = {
    REGULAR_ADMIN: [
        // Dashboard access
        PERMISSIONS.DASHBOARD_VIEW,

        // Users - view and basic management
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.USERS_EDIT,
        PERMISSIONS.USERS_RESET_PASSWORD,

        // Bookings - full management
        PERMISSIONS.BOOKINGS_VIEW,
        PERMISSIONS.BOOKINGS_CREATE,
        PERMISSIONS.BOOKINGS_EDIT,
        PERMISSIONS.BOOKINGS_CANCEL,
        PERMISSIONS.BOOKINGS_CHECK_IN,
        PERMISSIONS.BOOKINGS_EXPORT,

        // Schedule - full management
        PERMISSIONS.SCHEDULE_VIEW,
        PERMISSIONS.SCHEDULE_CREATE,
        PERMISSIONS.SCHEDULE_EDIT,
        PERMISSIONS.SCHEDULE_DELETE,
        PERMISSIONS.SCHEDULE_MANAGE_CAPACITY,

        // Vessels - view and basic management
        PERMISSIONS.VESSELS_VIEW,
        PERMISSIONS.VESSELS_EDIT,
        PERMISSIONS.VESSELS_TRACK,

        // Routes - view and basic management
        PERMISSIONS.ROUTES_VIEW,
        PERMISSIONS.ROUTES_EDIT,
        PERMISSIONS.ROUTES_MANAGE_PRICING,

        // Payments - view and process
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.PAYMENTS_EXPORT,

        // Communications
        PERMISSIONS.COMMUNICATIONS_SEND_NOTIFICATIONS,

        // Reports - basic reporting
        PERMISSIONS.REPORTS_VIEW_BASIC,
        PERMISSIONS.REPORTS_EXPORT,
    ] as PermissionName[],

    SENIOR_ADMIN: [
        // All regular admin permissions
        ...this.REGULAR_ADMIN,

        // Additional user management
        PERMISSIONS.USERS_CREATE,
        PERMISSIONS.USERS_DELETE,
        PERMISSIONS.USERS_VIEW_SENSITIVE,
        PERMISSIONS.USERS_MANAGE_ROLES,

        // Additional vessel management
        PERMISSIONS.VESSELS_CREATE,
        PERMISSIONS.VESSELS_DELETE,

        // Additional route management
        PERMISSIONS.ROUTES_CREATE,
        PERMISSIONS.ROUTES_DELETE,

        // Payment refunds
        PERMISSIONS.PAYMENTS_REFUND,

        // System management (limited)
        PERMISSIONS.SYSTEM_VIEW_LOGS,
        PERMISSIONS.SYSTEM_MANAGE_SETTINGS,

        // Advanced communications
        PERMISSIONS.COMMUNICATIONS_MASS_MESSAGES,

        // Advanced reporting
        PERMISSIONS.REPORTS_VIEW_ADVANCED,
        PERMISSIONS.REPORTS_SCHEDULE_AUTOMATED,
    ] as PermissionName[],

    AGENT: [
        // Dashboard access
        PERMISSIONS.DASHBOARD_VIEW,

        // Users - limited access
        PERMISSIONS.USERS_VIEW,

        // Bookings - core functions
        PERMISSIONS.BOOKINGS_VIEW,
        PERMISSIONS.BOOKINGS_CREATE,
        PERMISSIONS.BOOKINGS_EDIT,
        PERMISSIONS.BOOKINGS_CANCEL,
        PERMISSIONS.BOOKINGS_CHECK_IN,

        // Schedule - view only
        PERMISSIONS.SCHEDULE_VIEW,

        // Vessels - view only
        PERMISSIONS.VESSELS_VIEW,

        // Routes - view only
        PERMISSIONS.ROUTES_VIEW,

        // Payments - basic access
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,

        // Basic reports
        PERMISSIONS.REPORTS_VIEW_BASIC,
    ] as PermissionName[],
} as const;

// Permission categories for organized display
export const PERMISSION_CATEGORIES = {
    DASHBOARD: {
        name: 'Dashboard',
        description: 'Access to main dashboard and overview',
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.DASHBOARD_EXPORT_REPORTS,
        ]
    },
    USERS: {
        name: 'User Management',
        description: 'Manage users, roles, and permissions',
        permissions: [
            PERMISSIONS.USERS_VIEW,
            PERMISSIONS.USERS_CREATE,
            PERMISSIONS.USERS_EDIT,
            PERMISSIONS.USERS_DELETE,
            PERMISSIONS.USERS_MANAGE_ROLES,
            PERMISSIONS.USERS_RESET_PASSWORD,
            PERMISSIONS.USERS_VIEW_SENSITIVE,
        ]
    },
    BOOKINGS: {
        name: 'Booking Management',
        description: 'Manage bookings and check-ins',
        permissions: [
            PERMISSIONS.BOOKINGS_VIEW,
            PERMISSIONS.BOOKINGS_CREATE,
            PERMISSIONS.BOOKINGS_EDIT,
            PERMISSIONS.BOOKINGS_CANCEL,
            PERMISSIONS.BOOKINGS_CHECK_IN,
            PERMISSIONS.BOOKINGS_EXPORT,
        ]
    },
    SCHEDULE: {
        name: 'Schedule Management',
        description: 'Manage ferry schedules and trips',
        permissions: [
            PERMISSIONS.SCHEDULE_VIEW,
            PERMISSIONS.SCHEDULE_CREATE,
            PERMISSIONS.SCHEDULE_EDIT,
            PERMISSIONS.SCHEDULE_DELETE,
            PERMISSIONS.SCHEDULE_MANAGE_CAPACITY,
        ]
    },
    VESSELS: {
        name: 'Vessel Management',
        description: 'Manage fleet and vessel information',
        permissions: [
            PERMISSIONS.VESSELS_VIEW,
            PERMISSIONS.VESSELS_CREATE,
            PERMISSIONS.VESSELS_EDIT,
            PERMISSIONS.VESSELS_DELETE,
            PERMISSIONS.VESSELS_TRACK,
        ]
    },
    ROUTES: {
        name: 'Route Management',
        description: 'Manage routes and pricing',
        permissions: [
            PERMISSIONS.ROUTES_VIEW,
            PERMISSIONS.ROUTES_CREATE,
            PERMISSIONS.ROUTES_EDIT,
            PERMISSIONS.ROUTES_DELETE,
            PERMISSIONS.ROUTES_MANAGE_PRICING,
        ]
    },
    PAYMENTS: {
        name: 'Payment Management',
        description: 'Process payments and refunds',
        permissions: [
            PERMISSIONS.PAYMENTS_VIEW,
            PERMISSIONS.PAYMENTS_PROCESS,
            PERMISSIONS.PAYMENTS_REFUND,
            PERMISSIONS.PAYMENTS_EXPORT,
        ]
    },
    SYSTEM: {
        name: 'System Administration',
        description: 'System settings and maintenance',
        permissions: [
            PERMISSIONS.SYSTEM_MANAGE_PERMISSIONS,
            PERMISSIONS.SYSTEM_VIEW_LOGS,
            PERMISSIONS.SYSTEM_MANAGE_SETTINGS,
            PERMISSIONS.SYSTEM_BACKUP_RESTORE,
            PERMISSIONS.SYSTEM_EMERGENCY_ACTIONS,
        ]
    },
    COMMUNICATIONS: {
        name: 'Communications',
        description: 'Notifications and messaging',
        permissions: [
            PERMISSIONS.COMMUNICATIONS_SEND_NOTIFICATIONS,
            PERMISSIONS.COMMUNICATIONS_MASS_MESSAGES,
            PERMISSIONS.COMMUNICATIONS_EMERGENCY_ALERTS,
        ]
    },
    REPORTS: {
        name: 'Reports & Analytics',
        description: 'Generate and view reports',
        permissions: [
            PERMISSIONS.REPORTS_VIEW_BASIC,
            PERMISSIONS.REPORTS_VIEW_ADVANCED,
            PERMISSIONS.REPORTS_EXPORT,
            PERMISSIONS.REPORTS_SCHEDULE_AUTOMATED,
        ]
    },
} as const;

// Helper functions
export const getPermissionsForRole = (role: keyof typeof ROLE_PERMISSION_TEMPLATES): PermissionName[] => {
    return ROLE_PERMISSION_TEMPLATES[role] || [];
};

export const getPermissionsByCategory = (category: keyof typeof PERMISSION_CATEGORIES): PermissionName[] => {
    return PERMISSION_CATEGORIES[category]?.permissions || [];
};

export const getAllPermissions = (): PermissionName[] => {
    return Object.values(PERMISSIONS);
};

export const getCriticalPermissions = (): PermissionName[] => {
    return [
        PERMISSIONS.SYSTEM_MANAGE_PERMISSIONS,
        PERMISSIONS.SYSTEM_BACKUP_RESTORE,
        PERMISSIONS.SYSTEM_EMERGENCY_ACTIONS,
        PERMISSIONS.USERS_DELETE,
        PERMISSIONS.USERS_MANAGE_ROLES,
        PERMISSIONS.COMMUNICATIONS_EMERGENCY_ALERTS,
    ];
};

export const getBasicPermissions = (): PermissionName[] => {
    return [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.BOOKINGS_VIEW,
        PERMISSIONS.SCHEDULE_VIEW,
        PERMISSIONS.ROUTES_VIEW,
        PERMISSIONS.REPORTS_VIEW_BASIC,
    ];
};

// Permission validation
export const validatePermissionSet = (permissions: PermissionName[]): {
    isValid: boolean;
    missingDependencies: PermissionName[];
    warnings: string[];
} => {
    const missingDependencies: PermissionName[] = [];
    const warnings: string[] = [];

    // Check for permission dependencies
    if (permissions.includes(PERMISSIONS.USERS_DELETE) && !permissions.includes(PERMISSIONS.USERS_VIEW)) {
        missingDependencies.push(PERMISSIONS.USERS_VIEW);
    }

    if (permissions.includes(PERMISSIONS.BOOKINGS_EDIT) && !permissions.includes(PERMISSIONS.BOOKINGS_VIEW)) {
        missingDependencies.push(PERMISSIONS.BOOKINGS_VIEW);
    }

    // Add warnings for potentially dangerous combinations
    if (permissions.includes(PERMISSIONS.SYSTEM_EMERGENCY_ACTIONS)) {
        warnings.push('Emergency actions permission grants significant system control');
    }

    if (permissions.includes(PERMISSIONS.USERS_DELETE)) {
        warnings.push('User deletion permission can permanently remove user data');
    }

    return {
        isValid: missingDependencies.length === 0,
        missingDependencies,
        warnings,
    };
};

// Format permission name for display
export const formatPermissionName = (permission: PermissionName): string => {
    return permission
        .split('.')
        .map(part => part.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' '))
        .join(' - ');
};

// Get permission description
export const getPermissionDescription = (permission: PermissionName): string => {
    const descriptions: Record<PermissionName, string> = {
        [PERMISSIONS.DASHBOARD_VIEW]: 'View the main dashboard and overview statistics',
        [PERMISSIONS.DASHBOARD_EXPORT_REPORTS]: 'Export dashboard reports and analytics',

        [PERMISSIONS.USERS_VIEW]: 'View user profiles and basic information',
        [PERMISSIONS.USERS_CREATE]: 'Create new user accounts',
        [PERMISSIONS.USERS_EDIT]: 'Edit existing user information',
        [PERMISSIONS.USERS_DELETE]: 'Delete user accounts permanently',
        [PERMISSIONS.USERS_MANAGE_ROLES]: 'Change user roles and permissions',
        [PERMISSIONS.USERS_RESET_PASSWORD]: 'Reset user passwords',
        [PERMISSIONS.USERS_VIEW_SENSITIVE]: 'View sensitive user information',

        [PERMISSIONS.BOOKINGS_VIEW]: 'View booking information and details',
        [PERMISSIONS.BOOKINGS_CREATE]: 'Create new bookings',
        [PERMISSIONS.BOOKINGS_EDIT]: 'Modify existing bookings',
        [PERMISSIONS.BOOKINGS_CANCEL]: 'Cancel bookings',
        [PERMISSIONS.BOOKINGS_CHECK_IN]: 'Process passenger check-ins',
        [PERMISSIONS.BOOKINGS_EXPORT]: 'Export booking data and reports',

        [PERMISSIONS.SCHEDULE_VIEW]: 'View ferry schedules and timetables',
        [PERMISSIONS.SCHEDULE_CREATE]: 'Create new schedules and trips',
        [PERMISSIONS.SCHEDULE_EDIT]: 'Modify existing schedules',
        [PERMISSIONS.SCHEDULE_DELETE]: 'Delete schedules and trips',
        [PERMISSIONS.SCHEDULE_MANAGE_CAPACITY]: 'Manage vessel capacity and availability',

        [PERMISSIONS.VESSELS_VIEW]: 'View vessel information and status',
        [PERMISSIONS.VESSELS_CREATE]: 'Add new vessels to the fleet',
        [PERMISSIONS.VESSELS_EDIT]: 'Modify vessel information',
        [PERMISSIONS.VESSELS_DELETE]: 'Remove vessels from the fleet',
        [PERMISSIONS.VESSELS_TRACK]: 'Track vessel locations and status',

        [PERMISSIONS.ROUTES_VIEW]: 'View route information and schedules',
        [PERMISSIONS.ROUTES_CREATE]: 'Create new routes',
        [PERMISSIONS.ROUTES_EDIT]: 'Modify existing routes',
        [PERMISSIONS.ROUTES_DELETE]: 'Delete routes',
        [PERMISSIONS.ROUTES_MANAGE_PRICING]: 'Set and modify route pricing',

        [PERMISSIONS.PAYMENTS_VIEW]: 'View payment information and transactions',
        [PERMISSIONS.PAYMENTS_PROCESS]: 'Process customer payments',
        [PERMISSIONS.PAYMENTS_REFUND]: 'Issue refunds to customers',
        [PERMISSIONS.PAYMENTS_EXPORT]: 'Export payment and financial reports',

        [PERMISSIONS.SYSTEM_MANAGE_PERMISSIONS]: 'Manage user permissions and access control',
        [PERMISSIONS.SYSTEM_VIEW_LOGS]: 'View system logs and audit trails',
        [PERMISSIONS.SYSTEM_MANAGE_SETTINGS]: 'Modify system configuration and settings',
        [PERMISSIONS.SYSTEM_BACKUP_RESTORE]: 'Perform system backups and restores',
        [PERMISSIONS.SYSTEM_EMERGENCY_ACTIONS]: 'Execute emergency system procedures',

        [PERMISSIONS.COMMUNICATIONS_SEND_NOTIFICATIONS]: 'Send notifications to users',
        [PERMISSIONS.COMMUNICATIONS_MASS_MESSAGES]: 'Send mass messages to multiple users',
        [PERMISSIONS.COMMUNICATIONS_EMERGENCY_ALERTS]: 'Send emergency alerts system-wide',

        [PERMISSIONS.REPORTS_VIEW_BASIC]: 'View basic reports and analytics',
        [PERMISSIONS.REPORTS_VIEW_ADVANCED]: 'View advanced reports and detailed analytics',
        [PERMISSIONS.REPORTS_EXPORT]: 'Export reports in various formats',
        [PERMISSIONS.REPORTS_SCHEDULE_AUTOMATED]: 'Schedule automated report generation',
    };

    return descriptions[permission] || 'Permission description not available';
}; 