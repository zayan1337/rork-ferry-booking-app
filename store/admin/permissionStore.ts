// ============================================================================
// ENHANCED PERMISSION MANAGEMENT STORE FOR ADMIN MANAGEMENT
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    Permission,
    UserPermission,
    AdminUser,
    PermissionStats,
    UserPermissionFormData,
    PermissionStoreState,
    PermissionStoreActions,
    PermissionFilters,
    UserPermissionFilters,
    PermissionAuditFilters,
    Role,
    RolePermission,
    PermissionTemplate,
    PermissionAuditLog,
    PermissionHierarchy,
    PermissionFormData,
    RolePermissionFormData,
    PermissionTemplateFormData,
    BulkPermissionOperation,
    SuperAdminCapabilities,
    PermissionResource,
    PermissionLevel,
    UserPermissionStats,
} from '@/types/permissions';
import {
    fetchPermissions,
    fetchAdminUsers,
    grantUserPermissions,
    revokeUserPermission,
    getUserPermissions,
    fetchPermissionStats,
    createPermission,
    updatePermission,
    deletePermission,
    fetchPermissionTemplates,
    createPermissionTemplate,
    updatePermissionTemplate,
    deletePermissionTemplate,
    applyPermissionTemplate,
    bulkGrantPermissions,
    bulkRevokePermissions,
    fetchPermissionAuditLogs,
    promoteSuperAdmin,
    demoteSuperAdmin,
    checkUserPermission,
    getAllUserPermissions,
    getSuperAdminCapabilities,
    fetchBulkPermissionOperations,
    createBulkPermissionOperation,
    updateBulkOperationStatus,
} from '@/utils/permissionService';

const initialState: PermissionStoreState = {
    // Data
    permissions: [],
    users: [],
    roles: [],
    user_permissions: [],
    role_permissions: [],
    templates: [],
    audit_logs: [],
    permission_hierarchy: [],
    bulk_operations: [],

    // Current selections
    current_permission: null,
    current_user: null,
    current_role: null,
    current_template: null,

    // Loading states
    loading: {
        permissions: false,
        users: false,
        roles: false,
        user_permissions: false,
        role_permissions: false,
        templates: false,
        audit_logs: false,
        bulk_operations: false,
        creating: false,
        updating: false,
        deleting: false,
    },

    // Error handling
    error: null,

    // Search and filters
    search_query: '',
    filters: {},
    user_filters: {},
    audit_filters: {},

    // Pagination
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        has_more: false,
    },

    // Statistics
    stats: {} as PermissionStats,
    user_stats: {} as UserPermissionStats,

    // UI State
    ui_state: {
        selected_users: [],
        selected_permissions: [],
        bulk_operation_type: null,
        show_advanced_filters: false,
        view_mode: 'list',
    },
};

type PermissionStore = PermissionStoreState & PermissionStoreActions;

export const usePermissionStore = create<PermissionStore>()(
    devtools((set, get) => ({
        ...initialState,

        // Permission CRUD
        fetchPermissions: async (filters?: PermissionFilters) => {
            set(state => ({ loading: { ...state.loading, permissions: true }, error: null }));
            try {
                const permissions = await fetchPermissions(filters);
                set(state => ({ permissions, loading: { ...state.loading, permissions: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch permissions', loading: { ...state.loading, permissions: false } }));
            }
        },

        createPermission: async (data: PermissionFormData) => {
            set(state => ({ loading: { ...state.loading, creating: true }, error: null }));
            try {
                const permission = await createPermission(data);
                set(state => ({
                    permissions: [...get().permissions, permission],
                    loading: { ...get().loading, creating: false }
                }));
                return permission;
            } catch (error) {
                set(state => ({ error: 'Failed to create permission', loading: { ...state.loading, creating: false } }));
                throw error;
            }
        },

        updatePermission: async (id: string, data: Partial<PermissionFormData>) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                const permission = await updatePermission(id, data);
                set(state => ({
                    permissions: state.permissions.map(p => p.id === id ? permission : p),
                    loading: { ...state.loading, updating: false }
                }));
                return permission;
            } catch (error) {
                set(state => ({ error: 'Failed to update permission', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        deletePermission: async (id: string) => {
            set(state => ({ loading: { ...state.loading, deleting: true }, error: null }));
            try {
                await deletePermission(id);
                set(state => ({
                    permissions: state.permissions.filter(p => p.id !== id),
                    loading: { ...state.loading, deleting: false }
                }));
            } catch (error) {
                set(state => ({ error: 'Failed to delete permission', loading: { ...state.loading, deleting: false } }));
                throw error;
            }
        },

        // User permission management
        fetchUsers: async (filters?: UserPermissionFilters) => {
            set(state => ({ loading: { ...state.loading, users: true }, error: null }));
            try {
                const users = await fetchAdminUsers(filters);
                set(state => ({ users, loading: { ...state.loading, users: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch users', loading: { ...state.loading, users: false } }));
            }
        },

        fetchUserPermissions: async (user_id: string) => {
            set(state => ({ loading: { ...state.loading, user_permissions: true }, error: null }));
            try {
                const user_permissions = await getUserPermissions(user_id);
                set(state => ({ user_permissions, loading: { ...state.loading, user_permissions: false } }));
                return user_permissions;
            } catch (error) {
                set(state => ({ error: 'Failed to fetch user permissions', loading: { ...state.loading, user_permissions: false } }));
                return [];
            }
        },

        grantUserPermissions: async (data: UserPermissionFormData) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                await grantUserPermissions(data);
                await get().fetchUsers();
                await get().fetchUserPermissions(data.user_id);
                set(state => ({ loading: { ...state.loading, updating: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to grant user permissions', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        revokeUserPermission: async (user_id: string, permission_id: string) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                await revokeUserPermission(user_id, permission_id);
                await get().fetchUsers();
                await get().fetchUserPermissions(user_id);
                set(state => ({ loading: { ...state.loading, updating: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to revoke user permission', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        // Role permission management
        fetchRoles: async () => {
            set(state => ({ loading: { ...state.loading, roles: true }, error: null }));
            try {
                // TODO: Implement fetchRoles when available
                set(state => ({ loading: { ...state.loading, roles: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch roles', loading: { ...state.loading, roles: false } }));
            }
        },

        updateRolePermissions: async (data: RolePermissionFormData) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                // TODO: Implement updateRolePermissions when available
                set(state => ({ loading: { ...state.loading, updating: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to update role permissions', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        // Template management
        fetchTemplates: async () => {
            set(state => ({ loading: { ...state.loading, templates: true }, error: null }));
            try {
                const templates = await fetchPermissionTemplates();
                set(state => ({ templates, loading: { ...state.loading, templates: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch templates', loading: { ...state.loading, templates: false } }));
            }
        },

        createTemplate: async (data: PermissionTemplateFormData) => {
            set(state => ({ loading: { ...state.loading, creating: true }, error: null }));
            try {
                const template = await createPermissionTemplate(data);
                set(state => ({
                    templates: [...get().templates, template],
                    loading: { ...get().loading, creating: false }
                }));
                return template;
            } catch (error) {
                set(state => ({ error: 'Failed to create template', loading: { ...state.loading, creating: false } }));
                throw error;
            }
        },

        updateTemplate: async (id: string, data: Partial<PermissionTemplateFormData>) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                const template = await updatePermissionTemplate(id, data);
                set(state => ({
                    templates: state.templates.map(t => t.id === id ? template : t),
                    loading: { ...state.loading, updating: false }
                }));
                return template;
            } catch (error) {
                set(state => ({ error: 'Failed to update template', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        deleteTemplate: async (id: string) => {
            set(state => ({ loading: { ...state.loading, deleting: true }, error: null }));
            try {
                await deletePermissionTemplate(id);
                set(state => ({
                    templates: state.templates.filter(t => t.id !== id),
                    loading: { ...state.loading, deleting: false }
                }));
            } catch (error) {
                set(state => ({ error: 'Failed to delete template', loading: { ...state.loading, deleting: false } }));
                throw error;
            }
        },

        applyTemplate: async (template_id: string, user_ids: string[]) => {
            set(state => ({ loading: { ...state.loading, bulk_operations: true }, error: null }));
            try {
                await applyPermissionTemplate(template_id, user_ids);
                await get().fetchUsers();
                set(state => ({ loading: { ...state.loading, bulk_operations: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to apply template', loading: { ...state.loading, bulk_operations: false } }));
                throw error;
            }
        },

        // Bulk operations
        fetchBulkOperations: async () => {
            set(state => ({ loading: { ...state.loading, bulk_operations: true }, error: null }));
            try {
                const operations = await fetchBulkPermissionOperations();
                set(state => ({ bulk_operations: operations, loading: { ...state.loading, bulk_operations: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch bulk operations', loading: { ...state.loading, bulk_operations: false } }));
            }
        },

        createBulkOperation: async (data: BulkPermissionOperation) => {
            set(state => ({ loading: { ...state.loading, bulk_operations: true }, error: null }));
            try {
                const operation = await createBulkPermissionOperation(data);
                set(state => ({ bulk_operations: [...get().bulk_operations, operation], loading: { ...state.loading, bulk_operations: false } }));
                return operation;
            } catch (error) {
                set(state => ({ error: 'Failed to create bulk operation', loading: { ...state.loading, bulk_operations: false } }));
                throw error;
            }
        },

        updateBulkOperationStatus: async (operation_id: string, status: 'completed' | 'failed') => {
            set(state => ({ loading: { ...state.loading, bulk_operations: true }, error: null }));
            try {
                await updateBulkOperationStatus(operation_id, status);
                await get().fetchBulkOperations();
                set(state => ({ loading: { ...state.loading, bulk_operations: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to update bulk operation status', loading: { ...state.loading, bulk_operations: false } }));
                throw error;
            }
        },

        bulkGrantPermissions: async (operation: BulkPermissionOperation) => {
            set(state => ({ loading: { ...state.loading, bulk_operations: true }, error: null }));
            try {
                await bulkGrantPermissions(operation);
                await get().fetchUsers();
                set(state => ({ loading: { ...state.loading, bulk_operations: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to bulk grant permissions', loading: { ...state.loading, bulk_operations: false } }));
                throw error;
            }
        },

        bulkRevokePermissions: async (user_ids: string[], permission_ids: string[]) => {
            set(state => ({ loading: { ...state.loading, bulk_operations: true }, error: null }));
            try {
                await bulkRevokePermissions(user_ids, permission_ids);
                await get().fetchUsers();
                set(state => ({ loading: { ...state.loading, bulk_operations: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to bulk revoke permissions', loading: { ...state.loading, bulk_operations: false } }));
                throw error;
            }
        },

        bulkApplyTemplate: async (template_id: string, user_ids: string[]) => {
            return get().applyTemplate(template_id, user_ids);
        },

        // Audit trail
        fetchAuditLogs: async (filters?: PermissionAuditFilters) => {
            set(state => ({ loading: { ...state.loading, audit_logs: true }, error: null }));
            try {
                const audit_logs = await fetchPermissionAuditLogs(filters);
                set(state => ({ audit_logs, loading: { ...state.loading, audit_logs: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch audit logs', loading: { ...state.loading, audit_logs: false } }));
            }
        },

        // Search and filter
        setSearchQuery: (query: string) => {
            set({ search_query: query });
        },

        setFilters: (filters: Partial<PermissionFilters>) => {
            set(state => ({ filters: { ...state.filters, ...filters } }));
        },

        setUserFilters: (filters: Partial<UserPermissionFilters>) => {
            set(state => ({ user_filters: { ...state.user_filters, ...filters } }));
        },

        setAuditFilters: (filters: Partial<PermissionAuditFilters>) => {
            set(state => ({ audit_filters: { ...state.audit_filters, ...filters } }));
        },

        clearFilters: () => {
            set({ filters: {}, user_filters: {}, audit_filters: {} });
        },

        // Statistics
        calculateStats: () => {
            // Implementation for calculating stats
        },

        calculateUserStats: () => {
            // Implementation for calculating user stats
        },

        // UI State management
        setSelectedUsers: (user_ids: string[]) => {
            set(state => ({ ui_state: { ...state.ui_state, selected_users: user_ids } }));
        },

        setSelectedPermissions: (permission_ids: string[]) => {
            set(state => ({ ui_state: { ...state.ui_state, selected_permissions: permission_ids } }));
        },

        setBulkOperationType: (type: 'grant' | 'revoke' | 'template' | null) => {
            set(state => ({ ui_state: { ...state.ui_state, bulk_operation_type: type } }));
        },

        setShowAdvancedFilters: (show: boolean) => {
            set(state => ({ ui_state: { ...state.ui_state, show_advanced_filters: show } }));
        },

        setViewMode: (mode: 'list' | 'grid' | 'tree') => {
            set(state => ({ ui_state: { ...state.ui_state, view_mode: mode } }));
        },

        // Super Admin operations
        promoteSuperAdmin: async (user_id: string) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                await promoteSuperAdmin(user_id);
                await get().fetchUsers();
                set(state => ({ loading: { ...state.loading, updating: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to promote super admin', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        demoteSuperAdmin: async (user_id: string) => {
            set(state => ({ loading: { ...state.loading, updating: true }, error: null }));
            try {
                await demoteSuperAdmin(user_id);
                await get().fetchUsers();
                set(state => ({ loading: { ...state.loading, updating: false } }));
            } catch (error) {
                set(state => ({ error: 'Failed to demote super admin', loading: { ...state.loading, updating: false } }));
                throw error;
            }
        },

        createSystemPermission: async (data: PermissionFormData) => {
            return get().createPermission(data);
        },

        // Utility
        checkUserPermission: (user_id: string, resource: PermissionResource, action: PermissionLevel) => {
            // Implementation for checking user permission
            return false;
        },

        getUserPermissions: (user_id: string) => {
            const user = get().users.find(u => u.id === user_id);
            return user?.all_permissions || [];
        },

        getRolePermissions: (role: string) => {
            // TODO: Implement getRolePermissions when available
            return [];
        },

        getSuperAdminCapabilities: (user_id: string) => {
            // Implementation for getting super admin capabilities
            return {} as SuperAdminCapabilities;
        },

        // Error handling
        clearError: () => {
            set({ error: null });
        },

        setError: (error: string) => {
            set({ error });
        },

        // Reset
        reset: () => {
            set(initialState);
        },

        // Statistics
        fetchStats: async () => {
            set(state => ({ error: null }));
            try {
                const stats = await fetchPermissionStats();
                set(state => ({ stats }));
            } catch (error) {
                set(state => ({ error: 'Failed to fetch stats' }));
            }
        },

        // Alias for backward compatibility
        fetchAdmins: async () => {
            return get().fetchUsers();
        },
    }))
); 