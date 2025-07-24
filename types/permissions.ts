// ============================================================================
// PERMISSION MANAGEMENT TYPES
// Comprehensive types for permission system with Supabase integration
// Enhanced for production-level super admin management
// ============================================================================

// ============================================================================
// DATABASE TYPES (matching Supabase schema)
// ============================================================================

export interface DatabasePermission {
    id: string;
    name: string;
    description: string | null;
    resource: string;
    action: string;
    created_at: string;
}

export interface DatabaseRolePermission {
    id: string;
    role: 'admin' | 'agent' | 'customer';
    permission_id: string;
    created_at: string;
}

export interface DatabaseUserPermission {
    id: string;
    user_id: string;
    permission_id: string;
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
    is_active: boolean;
}

// ============================================================================
// ENHANCED PERMISSION TYPES
// ============================================================================

export interface Permission {
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
    category: PermissionCategory;
    level: PermissionLevel;
    created_at: string;
}

export interface PermissionWithDetails extends Permission {
    usageCount: number;
    userCount: number;
    roleCount: number;
    isSystemPermission: boolean;
    lastGrantedAt?: string;
    recentGrants: number;
}

export interface UserPermission {
    id: string;
    user_id: string;
    permission_id: string;
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
    is_active: boolean;
    permission?: Permission;
    granted_by_user?: {
        id: string;
        full_name: string;
        email: string;
    };
}

export interface RolePermission {
    id: string;
    role: UserRole;
    permission_id: string;
    created_at: string;
    permission?: Permission;
}

// ============================================================================
// PERMISSION TEMPLATES
// ============================================================================

export interface PermissionTemplate {
    id: string;
    name: string;
    description: string;
    color: string;
    is_system_template: boolean;
    is_active: boolean;
    created_by?: string;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
    permission_count: number;
    permissions: Permission[];
}

export interface PermissionTemplateFormData {
    name: string;
    description: string;
    color: string;
    permission_ids: string[];
    is_system_template?: boolean;
}

// ============================================================================
// AUDIT TRAIL TYPES
// ============================================================================

export interface PermissionAuditLog {
    id: string;
    action_type: 'GRANT' | 'REVOKE' | 'CREATE' | 'UPDATE' | 'DELETE';
    entity_type: 'USER_PERMISSION' | 'ROLE_PERMISSION' | 'PERMISSION';
    entity_id: string;
    permission_id?: string;
    target_user_id?: string;
    target_role?: UserRole;
    old_values?: any;
    new_values?: any;
    performed_by: string;
    performed_at: string;
    ip_address?: string;
    user_agent?: string;
    reason?: string;
    performed_by_user?: {
        id: string;
        full_name: string;
        email: string;
    };
    permission?: Permission;
    target_user?: {
        id: string;
        full_name: string;
        email: string;
    };
    // Enhanced fields from database view
    formatted_performed_at?: string;
    formatted_date?: string;
    formatted_time?: string;
    time_ago?: string;
    action_description?: string;
    entity_description?: string;
}

export interface PermissionAuditFilters {
    action_type?: string | 'all';
    entity_type?: string | 'all';
    target_user_id?: string;
    performed_by?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
}

// ============================================================================
// PERMISSION SYSTEM CONFIGURATION
// ============================================================================

export type PermissionCategory =
    | 'dashboard'
    | 'bookings'
    | 'operations'
    | 'content'
    | 'users'
    | 'finance'
    | 'communications'
    | 'reports'
    | 'settings'
    | 'system';

export type PermissionLevel =
    | 'view'
    | 'create'
    | 'update'
    | 'delete'
    | 'manage'
    | 'export'
    | 'send'
    | 'approve'
    | 'cancel';

export type UserRole = 'admin' | 'agent' | 'customer';

export type PermissionResource =
    | 'dashboard'
    | 'bookings'
    | 'routes'
    | 'trips'
    | 'vessels'
    | 'islands'
    | 'zones'
    | 'faq'
    | 'content'
    | 'users'
    | 'agents'
    | 'passengers'
    | 'wallets'
    | 'payments'
    | 'notifications'
    | 'bulk_messages'
    | 'reports'
    | 'settings'
    | 'permissions'
    | 'activity_logs';

// ============================================================================
// ENHANCED ROLE MANAGEMENT
// ============================================================================

export interface Role {
    id: string;
    name: string;
    description: string;
    color: string;
    permissions: string[];
    user_count: number;
    is_system_role: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoleTemplate {
    id: string;
    name: string;
    description: string;
    color: string;
    permissions: string[];
    isSystemRole: boolean;
}

export interface RoleFormData {
    name: string;
    description: string;
    color: string;
    permission_ids: string[];
}

// ============================================================================
// ENHANCED USER MANAGEMENT WITH PERMISSIONS
// ============================================================================

export interface AdminUser {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    is_super_admin: boolean;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
    updated_at: string;
    individual_permissions: UserPermission[];
    role_permissions: Permission[];
    all_permissions: Permission[];
    individual_permission_count: number;
    role_permission_count: number;
    total_permission_count: number;
    last_permission_change: string | null;
}

export interface PermissionUser {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    is_super_admin: boolean;
    is_active: boolean;
    permission_count: number;
    last_permission_update: string | null;
    last_login: string | null;
}

// ============================================================================
// ENHANCED FORM DATA TYPES
// ============================================================================

export interface PermissionFormData {
    name: string;
    description: string;
    resource: PermissionResource;
    action: PermissionLevel;
}

export interface UserPermissionFormData {
    user_id: string;
    permission_ids: string[];
    expires_at?: string;
    reason?: string;
}

export interface RolePermissionFormData {
    role: UserRole;
    permission_ids: string[];
    reason?: string;
}

export interface BulkPermissionOperation {
    type: 'grant' | 'revoke' | 'template';
    user_ids: string[];
    permission_ids?: string[];
    template_id?: string;
    expires_at?: string;
    reason?: string;
}

export interface BulkOperationRecord {
    id: string;
    operation_type: string;
    user_ids: string[];
    permission_ids?: string[];
    template_id?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    total_users: number;
    completed_users: number;
    failed_users: number;
    expires_at?: string;
    reason?: string;
    performed_by: string;
    performed_at: string;
    completed_at?: string;
    error_details?: any;
    performed_by_name?: string;
    performed_by_email?: string;
    template_name?: string;
    template_color?: string;
    status_color?: string;
    progress_percentage?: number;
}

// ============================================================================
// ENHANCED FILTER AND SEARCH TYPES
// ============================================================================

export interface PermissionFilters {
    category?: PermissionCategory | 'all';
    level?: PermissionLevel | 'all';
    resource?: PermissionResource | 'all';
    is_active?: boolean;
    search?: string;
    usage?: 'all' | 'used' | 'unused' | 'most_used' | 'least_used';
}

export interface UserPermissionFilters {
    role?: UserRole | 'all';
    is_active?: boolean;
    has_permissions?: boolean;
    is_super_admin?: boolean;
    search?: string;
    last_login_days?: number;
}

export interface PermissionSearchParams {
    query: string;
    category?: PermissionCategory;
    level?: PermissionLevel;
    resource?: PermissionResource;
}

// ============================================================================
// ENHANCED STATISTICS AND ANALYTICS
// ============================================================================

export interface PermissionStats {
    total_permissions: number;
    permissions_by_category: Record<PermissionCategory, number>;
    permissions_by_level: Record<PermissionLevel, number>;
    total_users: number;
    users_by_role: Record<UserRole, number>;
    total_roles: number;
    active_permissions: number;
    recent_permission_changes: number;
    permission_usage: {
        most_used: PermissionWithDetails[];
        least_used: PermissionWithDetails[];
        unused: Permission[];
    };
    permission_trends: {
        grants_last_7_days: number;
        revokes_last_7_days: number;
        new_permissions_last_30_days: number;
    };
    security_metrics: {
        super_admin_count: number;
        users_with_expired_permissions: number;
        inactive_users_with_permissions: number;
    };
}

export interface UserPermissionStats {
    total_admin_users: number;
    active_admin_users: number;
    users_with_custom_permissions: number;
    permission_distribution: Record<string, number>;
    recent_permission_grants: number;
    recent_permission_revokes: number;
    template_usage: Record<string, number>;
    compliance_metrics: {
        users_needing_review: number;
        permissions_expiring_soon: number;
        inactive_users: number;
    };
}

// ============================================================================
// PERMISSION INHERITANCE AND HIERARCHY
// ============================================================================

export interface PermissionInheritance {
    id: string;
    parent_permission_id: string;
    child_permission_id: string;
    inheritance_type: 'IMPLIES' | 'REQUIRES';
    created_at: string;
    parent_permission?: Permission;
    child_permission?: Permission;
}

export interface PermissionHierarchy {
    permission: Permission;
    children: PermissionHierarchy[];
    parents: Permission[];
    implies: Permission[];
    requires: Permission[];
}

// ============================================================================
// PERMISSION CHECK TYPES
// ============================================================================

export interface PermissionCheck {
    resource: PermissionResource;
    action: PermissionLevel;
    required: boolean;
}

export interface TabPermissions {
    tab_id: string;
    tab_name: string;
    required_permissions: PermissionCheck[];
    optional_permissions: PermissionCheck[];
}

export interface SuperAdminCapabilities {
    canManageAllUsers: boolean;
    canAssignSuperAdmin: boolean;
    canCreatePermissions: boolean;
    canDeletePermissions: boolean;
    canManageRoles: boolean;
    canViewAuditLogs: boolean;
    canBulkOperations: boolean;
    canManageTemplates: boolean;
    canManageSystem: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PermissionApiResponse {
    permissions: Permission[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}

export interface UserPermissionApiResponse {
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}

export interface PermissionTemplateApiResponse {
    templates: PermissionTemplate[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}

export interface AuditLogApiResponse {
    logs: PermissionAuditLog[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}

// ============================================================================
// ENHANCED STORE INTERFACES
// ============================================================================

export interface PermissionStoreState {
    // Data
    permissions: Permission[];
    users: AdminUser[];
    roles: Role[];
    user_permissions: UserPermission[];
    role_permissions: RolePermission[];
    templates: PermissionTemplate[];
    audit_logs: PermissionAuditLog[];
    permission_hierarchy: PermissionHierarchy[];
    bulk_operations: BulkOperationRecord[];

    // Current selections
    current_permission: Permission | null;
    current_user: AdminUser | null;
    current_role: Role | null;
    current_template: PermissionTemplate | null;

    // Loading states
    loading: {
        permissions: boolean;
        users: boolean;
        roles: boolean;
        user_permissions: boolean;
        role_permissions: boolean;
        templates: boolean;
        audit_logs: boolean;
        bulk_operations: boolean;
        creating: boolean;
        updating: boolean;
        deleting: boolean;
    };

    // Error handling
    error: string | null;

    // Search and filters
    search_query: string;
    filters: PermissionFilters;
    user_filters: UserPermissionFilters;
    audit_filters: PermissionAuditFilters;

    // Pagination
    pagination: {
        page: number;
        limit: number;
        total: number;
        has_more: boolean;
    };

    // Statistics
    stats: PermissionStats;
    user_stats: UserPermissionStats;

    // UI State
    ui_state: {
        selected_users: string[];
        selected_permissions: string[];
        bulk_operation_type: 'grant' | 'revoke' | 'template' | null;
        show_advanced_filters: boolean;
        view_mode: 'list' | 'grid' | 'tree';
    };
}

export interface PermissionStoreActions {
    // Permission CRUD
    fetchPermissions: (filters?: PermissionFilters) => Promise<void>;
    createPermission: (data: PermissionFormData) => Promise<Permission>;
    updatePermission: (id: string, data: Partial<PermissionFormData>) => Promise<Permission>;
    deletePermission: (id: string) => Promise<void>;

    // User permission management
    fetchUsers: (filters?: UserPermissionFilters) => Promise<void>;
    fetchUserPermissions: (user_id: string) => Promise<UserPermission[]>;
    grantUserPermissions: (data: UserPermissionFormData) => Promise<void>;
    revokeUserPermission: (user_id: string, permission_id: string) => Promise<void>;

    // Role permission management
    fetchRoles: () => Promise<void>;
    updateRolePermissions: (data: RolePermissionFormData) => Promise<void>;

    // Template management
    fetchTemplates: () => Promise<void>;
    createTemplate: (data: PermissionTemplateFormData) => Promise<PermissionTemplate>;
    updateTemplate: (id: string, data: Partial<PermissionTemplateFormData>) => Promise<PermissionTemplate>;
    deleteTemplate: (id: string) => Promise<void>;
    applyTemplate: (template_id: string, user_ids: string[]) => Promise<void>;

    // Bulk operations
    fetchBulkOperations: () => Promise<void>;
    createBulkOperation: (data: BulkPermissionOperation) => Promise<any>;
    updateBulkOperationStatus: (operation_id: string, status: 'completed' | 'failed') => Promise<void>;
    bulkGrantPermissions: (operation: BulkPermissionOperation) => Promise<void>;
    bulkRevokePermissions: (user_ids: string[], permission_ids: string[]) => Promise<void>;
    bulkApplyTemplate: (template_id: string, user_ids: string[]) => Promise<void>;

    // Audit trail
    fetchAuditLogs: (filters?: PermissionAuditFilters) => Promise<void>;

    // Search and filter
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<PermissionFilters>) => void;
    setUserFilters: (filters: Partial<UserPermissionFilters>) => void;
    setAuditFilters: (filters: Partial<PermissionAuditFilters>) => void;
    clearFilters: () => void;

    // Statistics
    calculateStats: () => void;
    calculateUserStats: () => void;

    // UI State management
    setSelectedUsers: (user_ids: string[]) => void;
    setSelectedPermissions: (permission_ids: string[]) => void;
    setBulkOperationType: (type: 'grant' | 'revoke' | 'template' | null) => void;
    setShowAdvancedFilters: (show: boolean) => void;
    setViewMode: (mode: 'list' | 'grid' | 'tree') => void;

    // Super Admin operations
    promoteSuperAdmin: (user_id: string) => Promise<void>;
    demoteSuperAdmin: (user_id: string) => Promise<void>;
    createSystemPermission: (data: PermissionFormData) => Promise<Permission>;

    // Utility
    checkUserPermission: (user_id: string, resource: PermissionResource, action: PermissionLevel) => boolean;
    getUserPermissions: (user_id: string) => Permission[];
    getRolePermissions: (role: UserRole) => Permission[];
    getSuperAdminCapabilities: (user_id: string) => SuperAdminCapabilities;

    // Error handling
    clearError: () => void;
    setError: (error: string) => void;

    // Reset
    reset: () => void;

    // Initialization
    initializeStore?: () => Promise<void>;
}

// ============================================================================
// CONSTANTS AND CONFIGURATIONS
// ============================================================================

export const PERMISSION_RESOURCES: Record<string, PermissionResource> = {
    DASHBOARD: 'dashboard',
    BOOKINGS: 'bookings',
    ROUTES: 'routes',
    TRIPS: 'trips',
    VESSELS: 'vessels',
    ISLANDS: 'islands',
    ZONES: 'zones',
    FAQ: 'faq',
    CONTENT: 'content',
    USERS: 'users',
    AGENTS: 'agents',
    PASSENGERS: 'passengers',
    WALLETS: 'wallets',
    PAYMENTS: 'payments',
    NOTIFICATIONS: 'notifications',
    BULK_MESSAGES: 'bulk_messages',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    PERMISSIONS: 'permissions',
    ACTIVITY_LOGS: 'activity_logs',
} as const;

export const PERMISSION_ACTIONS: Record<string, PermissionLevel> = {
    VIEW: 'view',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    MANAGE: 'manage',
    EXPORT: 'export',
    SEND: 'send',
    APPROVE: 'approve',
    CANCEL: 'cancel',
} as const;

export const PERMISSION_CATEGORIES: Record<string, PermissionCategory> = {
    DASHBOARD: 'dashboard',
    BOOKINGS: 'bookings',
    OPERATIONS: 'operations',
    CONTENT: 'content',
    USERS: 'users',
    FINANCE: 'finance',
    COMMUNICATIONS: 'communications',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    SYSTEM: 'system',
} as const;

export const SUPER_ADMIN_PERMISSIONS = [
    'permissions:manage',
    'users:manage',
    'settings:manage',
    'system:manage',
] as const;

// ============================================================================
// DEFAULT VALUES AND CONFIGURATIONS
// ============================================================================

export const DEFAULT_PERMISSION_FILTERS: PermissionFilters = {
    category: 'all',
    level: 'all',
    resource: 'all',
    is_active: true,
    search: '',
    usage: 'all',
};

export const DEFAULT_USER_PERMISSION_FILTERS: UserPermissionFilters = {
    role: 'all',
    is_active: true,
    has_permissions: true,
    search: '',
};

export const DEFAULT_AUDIT_FILTERS: PermissionAuditFilters = {
    action_type: 'all',
    entity_type: 'all',
    search: '',
};

export const ITEMS_PER_PAGE = 20;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_PERMISSION_NAME_LENGTH = 100;
export const MAX_BULK_OPERATION_SIZE = 100;

// ============================================================================
// PERMISSION LEVEL CONFIGURATIONS
// ============================================================================

export const PERMISSION_LEVEL_HIERARCHY: Record<PermissionLevel, number> = {
    view: 1,
    create: 2,
    update: 3,
    delete: 4,
    manage: 5,
    export: 2,
    send: 3,
    approve: 4,
    cancel: 3,
};

export const PERMISSION_LEVEL_COLORS: Record<PermissionLevel, string> = {
    view: '#6B7280',
    create: '#10B981',
    update: '#F59E0B',
    delete: '#EF4444',
    manage: '#8B5CF6',
    export: '#06B6D4',
    send: '#3B82F6',
    approve: '#84CC16',
    cancel: '#F97316',
};

export const PERMISSION_CATEGORY_COLORS: Record<PermissionCategory, string> = {
    dashboard: '#6366F1',
    bookings: '#EF4444',
    operations: '#F59E0B',
    content: '#10B981',
    users: '#8B5CF6',
    finance: '#06B6D4',
    communications: '#3B82F6',
    reports: '#84CC16',
    settings: '#6B7280',
    system: '#DC2626',
};

export const SYSTEM_PERMISSION_TEMPLATES = [
    'Super Administrator',
    'Operations Manager',
    'Customer Service',
    'Financial Officer',
    'Content Manager',
    'Agent Supervisor',
] as const; 