// ============================================================================
// PERMISSION MANAGEMENT HOOKS
// Custom hooks for permission management functionality
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    usePermissionStore,
    useFilteredPermissions,
    useFilteredAdminUsers,
    useFilteredTemplates,
    useFilteredAuditLogs,
    usePermissionStats,
    useUserPermissionStats,
    usePermissionLoading,
    usePermissionError,
    usePermissionUIState,
} from '@/store/admin/permissionStore';
import {
    Permission,
    AdminUser,
    UserPermission,
    RolePermission,
    PermissionFormData,
    UserPermissionFormData,
    RolePermissionFormData,
    PermissionFilters,
    UserPermissionFilters,
    PermissionAuditFilters,
    PermissionTemplate,
    PermissionTemplateFormData,
    BulkPermissionOperation,
    SuperAdminCapabilities,
    PermissionLevel,
    PermissionResource,
    UserRole,
    PermissionCategory,
} from '@/types/permissions';

// MINIMAL ADMIN PERMISSION MANAGEMENT HOOK
// Only for super admin managing admins and their permissions
export const usePermissionManagement = () => {
    const store = usePermissionStore();
    const permissions = store.permissions;
    const admins = store.users;
    const stats = store.stats;
    const loading = store.loading;
    const error = store.error;
    const user_permissions = store.user_permissions;

    // Actions
    const fetchPermissions = store.fetchPermissions;
    const fetchAdmins = store.fetchAdmins;
    const fetchUserPermissions = store.fetchUserPermissions;
    const grantUserPermissions = store.grantUserPermissions;
    const revokeUserPermission = store.revokeUserPermission;
    const fetchStats = store.fetchStats;

    return {
        permissions,
        admins,
        stats,
        loading,
        error,
        user_permissions,
        fetchPermissions,
        fetchAdmins,
        fetchUserPermissions,
        grantUserPermissions,
        revokeUserPermission,
        fetchStats,
    };
};

// Enhanced Permission CRUD Hook
export const usePermissionCrud = () => {
    const { superAdminCapabilities } = usePermissionManagement();
    const store = usePermissionStore();

    const createPermission = useCallback(async (data: PermissionFormData) => {
        if (!superAdminCapabilities.canCreatePermissions) {
            throw new Error('Insufficient permissions to create permissions');
        }
        return await store.createPermission(data);
    }, [store, superAdminCapabilities.canCreatePermissions]);

    const updatePermission = useCallback(async (id: string, data: Partial<PermissionFormData>) => {
        if (!superAdminCapabilities.canManageSystem) {
            throw new Error('Insufficient permissions to update permissions');
        }
        return await store.updatePermission(id, data);
    }, [store, superAdminCapabilities.canManageSystem]);

    const deletePermission = useCallback(async (id: string) => {
        if (!superAdminCapabilities.canDeletePermissions) {
            throw new Error('Insufficient permissions to delete permissions');
        }
        return await store.deletePermission(id);
    }, [store, superAdminCapabilities.canDeletePermissions]);

    return {
        createPermission,
        updatePermission,
        deletePermission,
        canCreatePermissions: superAdminCapabilities.canCreatePermissions,
        canDeletePermissions: superAdminCapabilities.canDeletePermissions,
        canManageSystem: superAdminCapabilities.canManageSystem,
    };
};

// Super Admin User Management Hook
export const useSuperAdminUserManagement = () => {
    const { superAdminCapabilities } = usePermissionManagement();
    const store = usePermissionStore();

    const promoteSuperAdmin = useCallback(async (userId: string) => {
        if (!superAdminCapabilities.canAssignSuperAdmin) {
            throw new Error('Insufficient permissions to promote super admin');
        }
        return await store.promoteSuperAdmin(userId);
    }, [store, superAdminCapabilities.canAssignSuperAdmin]);

    const demoteSuperAdmin = useCallback(async (userId: string) => {
        if (!superAdminCapabilities.canAssignSuperAdmin) {
            throw new Error('Insufficient permissions to demote super admin');
        }
        return await store.demoteSuperAdmin(userId);
    }, [store, superAdminCapabilities.canAssignSuperAdmin]);

    const grantUserPermissions = useCallback(async (data: UserPermissionFormData) => {
        if (!superAdminCapabilities.canManageAllUsers) {
            throw new Error('Insufficient permissions to grant user permissions');
        }
        return await store.grantUserPermissions(data);
    }, [store, superAdminCapabilities.canManageAllUsers]);

    const revokeUserPermission = useCallback(async (userId: string, permissionId: string) => {
        if (!superAdminCapabilities.canManageAllUsers) {
            throw new Error('Insufficient permissions to revoke user permissions');
        }
        return await store.revokeUserPermission(userId, permissionId);
    }, [store, superAdminCapabilities.canManageAllUsers]);

    return {
        promoteSuperAdmin,
        demoteSuperAdmin,
        grantUserPermissions,
        revokeUserPermission,
        canAssignSuperAdmin: superAdminCapabilities.canAssignSuperAdmin,
        canManageAllUsers: superAdminCapabilities.canManageAllUsers,
    };
};

// Permission Template Management Hook
export const usePermissionTemplateManagement = () => {
    const { superAdminCapabilities } = usePermissionManagement();
    const store = usePermissionStore();

    const createTemplate = useCallback(async (data: PermissionTemplateFormData) => {
        if (!superAdminCapabilities.canManageTemplates) {
            throw new Error('Insufficient permissions to create templates');
        }
        return await store.createTemplate(data);
    }, [store, superAdminCapabilities.canManageTemplates]);

    const updateTemplate = useCallback(async (id: string, data: Partial<PermissionTemplateFormData>) => {
        if (!superAdminCapabilities.canManageTemplates) {
            throw new Error('Insufficient permissions to update templates');
        }
        return await store.updateTemplate(id, data);
    }, [store, superAdminCapabilities.canManageTemplates]);

    const deleteTemplate = useCallback(async (id: string) => {
        if (!superAdminCapabilities.canManageTemplates) {
            throw new Error('Insufficient permissions to delete templates');
        }
        return await store.deleteTemplate(id);
    }, [store, superAdminCapabilities.canManageTemplates]);

    const applyTemplate = useCallback(async (templateId: string, userIds: string[]) => {
        if (!superAdminCapabilities.canManageAllUsers) {
            throw new Error('Insufficient permissions to apply templates to users');
        }
        return await store.applyTemplate(templateId, userIds);
    }, [store, superAdminCapabilities.canManageAllUsers]);

    return {
        createTemplate,
        updateTemplate,
        deleteTemplate,
        applyTemplate,
        canManageTemplates: superAdminCapabilities.canManageTemplates,
    };
};

// Bulk Permission Operations Hook
export const useBulkPermissionOperations = () => {
    const { superAdminCapabilities, uiState } = usePermissionManagement();
    const store = usePermissionStore();

    const selectedUsers = uiState.selected_users;
    const selectedPermissions = uiState.selected_permissions;
    const bulkOperationType = uiState.bulk_operation_type;

    const selectAllUsers = useCallback(() => {
        const { users } = store;
        store.setSelectedUsers(users.map(user => user.id));
    }, [store]);

    const clearUserSelection = useCallback(() => {
        store.setSelectedUsers([]);
    }, [store]);

    const selectAllPermissions = useCallback(() => {
        const { permissions } = store;
        store.setSelectedPermissions(permissions.map(permission => permission.id));
    }, [store]);

    const clearPermissionSelection = useCallback(() => {
        store.setSelectedPermissions([]);
    }, [store]);

    const toggleUserSelection = useCallback((userId: string) => {
        const current = [...selectedUsers];
        const index = current.indexOf(userId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(userId);
        }
        store.setSelectedUsers(current);
    }, [store, selectedUsers]);

    const togglePermissionSelection = useCallback((permissionId: string) => {
        const current = [...selectedPermissions];
        const index = current.indexOf(permissionId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(permissionId);
        }
        store.setSelectedPermissions(current);
    }, [store, selectedPermissions]);

    const setBulkOperationType = useCallback((type: 'grant' | 'revoke' | 'template' | null) => {
        store.setBulkOperationType(type);
    }, [store]);

    const performBulkGrant = useCallback(async (userIds: string[], permissionIds: string[]) => {
        if (!superAdminCapabilities.canBulkOperations) {
            throw new Error('Insufficient permissions for bulk operations');
        }
        const operation: BulkPermissionOperation = {
            type: 'grant',
            user_ids: userIds,
            permission_ids: permissionIds,
        };
        return await store.bulkGrantPermissions(operation);
    }, [store, superAdminCapabilities.canBulkOperations]);

    const performBulkRevoke = useCallback(async (userIds: string[], permissionIds: string[]) => {
        if (!superAdminCapabilities.canBulkOperations) {
            throw new Error('Insufficient permissions for bulk operations');
        }
        return await store.bulkRevokePermissions(userIds, permissionIds);
    }, [store, superAdminCapabilities.canBulkOperations]);

    const performBulkApplyTemplate = useCallback(async (templateId: string, userIds: string[]) => {
        if (!superAdminCapabilities.canBulkOperations) {
            throw new Error('Insufficient permissions for bulk operations');
        }
        return await store.bulkApplyTemplate(templateId, userIds);
    }, [store, superAdminCapabilities.canBulkOperations]);

    return {
        selectedUsers,
        selectedPermissions,
        bulkOperationType,
        selectAllUsers,
        clearUserSelection,
        selectAllPermissions,
        clearPermissionSelection,
        toggleUserSelection,
        togglePermissionSelection,
        setBulkOperationType,
        performBulkGrant,
        performBulkRevoke,
        performBulkApplyTemplate,
        canBulkOperations: superAdminCapabilities.canBulkOperations,
    };
};

// Permission Audit Trail Hook
export const usePermissionAuditTrail = () => {
    const { superAdminCapabilities, auditLogs } = usePermissionManagement();
    const store = usePermissionStore();

    const fetchAuditLogs = useCallback(async (filters?: PermissionAuditFilters) => {
        if (!superAdminCapabilities.canViewAuditLogs) {
            throw new Error('Insufficient permissions to view audit logs');
        }
        return await store.fetchAuditLogs(filters);
    }, [store, superAdminCapabilities.canViewAuditLogs]);

    const setAuditFilters = useCallback((filters: Partial<PermissionAuditFilters>) => {
        store.setAuditFilters(filters);
    }, [store]);

    return {
        auditLogs,
        filteredAuditLogs: auditLogs, // Implement filtering logic if needed
        fetchAuditLogs,
        setAuditFilters,
        canViewAuditLogs: superAdminCapabilities.canViewAuditLogs,
    };
};

// Enhanced Permission Filters Hook
export const usePermissionFilters = () => {
    const store = usePermissionStore();
    const { filters, user_filters, ui_state } = store;

    const categoryFilter = filters.category || 'all';
    const levelFilter = filters.level || 'all';
    const usageFilter = filters.usage || 'all';
    const roleFilter = user_filters.role || 'all';
    const activeFilter = user_filters.is_active?.toString() || 'all';
    const superAdminFilter = user_filters.is_super_admin?.toString() || 'all';
    const showAdvancedFilters = ui_state.show_advanced_filters;

    const setCategoryFilter = useCallback((category: PermissionCategory | 'all') => {
        store.setFilters({ category: category === 'all' ? undefined : category });
    }, [store]);

    const setLevelFilter = useCallback((level: PermissionLevel | 'all') => {
        store.setFilters({ level: level === 'all' ? undefined : level });
    }, [store]);

    const setUsageFilter = useCallback((usage: string) => {
        store.setFilters({ usage: usage as any });
    }, [store]);

    const setRoleFilter = useCallback((role: UserRole | 'all') => {
        store.setUserFilters({ role: role === 'all' ? undefined : role });
    }, [store]);

    const setActiveFilter = useCallback((active: string) => {
        const isActive = active === 'all' ? undefined : active === 'true';
        store.setUserFilters({ is_active: isActive });
    }, [store]);

    const setSuperAdminFilter = useCallback((superAdmin: string) => {
        const isSuperAdmin = superAdmin === 'all' ? undefined : superAdmin === 'true';
        store.setUserFilters({ is_super_admin: isSuperAdmin });
    }, [store]);

    const toggleAdvancedFilters = useCallback(() => {
        store.setShowAdvancedFilters(!showAdvancedFilters);
    }, [store, showAdvancedFilters]);

    const filteredPermissions = useFilteredPermissions();
    const filteredUsers = useFilteredAdminUsers();

    return {
        categoryFilter,
        setCategoryFilter,
        levelFilter,
        setLevelFilter,
        usageFilter,
        setUsageFilter,
        roleFilter,
        setRoleFilter,
        activeFilter,
        setActiveFilter,
        superAdminFilter,
        setSuperAdminFilter,
        showAdvancedFilters,
        toggleAdvancedFilters,
        filteredPermissions,
        filteredUsers,
    };
};

// Permission Analytics Hook
export const usePermissionAnalytics = () => {
    const { stats, userStats } = usePermissionManagement();
    const store = usePermissionStore();

    const calculateStats = useCallback(() => {
        store.calculateStats();
    }, [store]);

    const calculateUserStats = useCallback(() => {
        store.calculateUserStats();
    }, [store]);

    return {
        stats,
        userStats,
        calculateStats,
        calculateUserStats,
    };
};

// Permission Validation Hook
export const usePermissionValidation = () => {
    const { user } = useAuthStore();
    const store = usePermissionStore();

    const validateUserAccess = useCallback((requiredPermissions: { resource: PermissionResource; action: PermissionLevel }[]) => {
        if (!user?.profile?.id) return false;

        return requiredPermissions.every(({ resource, action }) => {
            return store.checkUserPermission(user.profile!.id, resource, action);
        });
    }, [store, user?.profile?.id]);

    const validateBulkOperation = useCallback((userIds: string[], permissionIds: string[]) => {
        // Add validation logic for bulk operations
        const MAX_BULK_SIZE = 100; // from constants

        if (userIds.length > MAX_BULK_SIZE || permissionIds.length > MAX_BULK_SIZE) {
            return { valid: false, error: `Bulk operation size exceeds limit of ${MAX_BULK_SIZE}` };
        }

        if (userIds.length === 0 || permissionIds.length === 0) {
            return { valid: false, error: 'Must select at least one user and one permission' };
        }

        return { valid: true, error: null };
    }, []);

    return {
        validateUserAccess,
        validateBulkOperation,
    };
};

// Backward compatibility hooks - keeping existing implementations that were removed
export const useUserPermissionManagement = useSuperAdminUserManagement;
export const useRolePermissionManagement = () => {
    const store = usePermissionStore();

    const updateRolePermissions = useCallback(async (data: RolePermissionFormData) => {
        return await store.updateRolePermissions(data);
    }, [store]);

    const getRolePermissions = useCallback(async (role: UserRole) => {
        return await store.getRolePermissions(role);
    }, [store]);

    return {
        updateRolePermissions,
        getRolePermissions,
    };
};

export const useUserPermissions = (userId?: string) => {
    const { user } = useAuthStore();
    const store = usePermissionStore();
    const targetUserId = userId || user?.profile?.id;

    const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (targetUserId) {
            setLoading(true);
            try {
                // Use the user_permissions array from the store directly
                const userPerms = store.user_permissions.filter(up => up.user_id === targetUserId && up.is_active);
                setUserPermissions(userPerms);
                setLoading(false);
            } catch (error) {
                console.error('Error getting user permissions:', error);
                setUserPermissions([]);
                setLoading(false);
            }
        }
    }, [targetUserId, store.user_permissions]);

    const hasPermission = useCallback((resource: PermissionResource, action: PermissionLevel): boolean => {
        if (!targetUserId) return false;
        if (user?.profile?.is_super_admin === true) return true;
        return userPermissions.some(p => p.resource === resource && p.action === action);
    }, [targetUserId, user?.profile?.is_super_admin, userPermissions]);

    const canView = useCallback((resource: PermissionResource) => hasPermission(resource, 'view'), [hasPermission]);
    const canCreate = useCallback((resource: PermissionResource) => hasPermission(resource, 'create'), [hasPermission]);
    const canUpdate = useCallback((resource: PermissionResource) => hasPermission(resource, 'update'), [hasPermission]);
    const canDelete = useCallback((resource: PermissionResource) => hasPermission(resource, 'delete'), [hasPermission]);
    const canManage = useCallback((resource: PermissionResource) => hasPermission(resource, 'manage'), [hasPermission]);

    return {
        permissions: userPermissions,
        loading,
        hasPermission,
        canView,
        canCreate,
        canUpdate,
        canDelete,
        canManage,
    };
};

export const usePermissionForm = (initialData?: Partial<PermissionFormData>) => {
    const [formData, setFormData] = useState<PermissionFormData>({
        name: '',
        description: '',
        resource: 'dashboard',
        action: 'view',
        ...initialData,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof PermissionFormData, string>>>({});

    const updateField = useCallback((field: keyof PermissionFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    }, [errors]);

    const validateForm = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof PermissionFormData, string>> = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.resource) newErrors.resource = 'Resource is required';
        if (!formData.action) newErrors.action = 'Action is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            description: '',
            resource: 'dashboard',
            action: 'view',
            ...initialData,
        });
        setErrors({});
    }, [initialData]);

    return {
        formData,
        errors,
        updateField,
        validateForm,
        resetForm,
        isValid: Object.keys(errors).length === 0,
    };
};

export const usePermissionUtils = () => {
    const store = usePermissionStore();

    const getPermissionById = useCallback((id: string): Permission | undefined => {
        return store.permissions.find(p => p.id === id);
    }, [store.permissions]);

    const getUserById = useCallback((id: string): AdminUser | undefined => {
        return store.users.find(u => u.id === id);
    }, [store.users]);

    const formatPermissionName = useCallback((resource: string, action: string): string => {
        return `${resource}:${action}`;
    }, []);

    return {
        getPermissionById,
        getUserById,
        formatPermissionName,
    };
};

export const useEnhancedAdminPermissions = (userId?: string) => {
    const userPermissions = useUserPermissions(userId);

    const canViewDashboard = () => userPermissions.canView('dashboard');
    const canViewBookings = () => userPermissions.canView('bookings');
    const canCreateBookings = () => userPermissions.canCreate('bookings');
    const canUpdateBookings = () => userPermissions.canUpdate('bookings');
    const canDeleteBookings = () => userPermissions.canDelete('bookings');
    const canViewUsers = () => userPermissions.canView('users');
    const canCreateUsers = () => userPermissions.canCreate('users');
    const canUpdateUsers = () => userPermissions.canUpdate('users');
    const canDeleteUsers = () => userPermissions.canDelete('users');
    const canManagePermissions = () => userPermissions.canManage('permissions');
    const canViewSettings = () => userPermissions.canView('settings');
    const canManageSettings = () => userPermissions.canManage('settings');

    return {
        ...userPermissions,
        canViewDashboard,
        canViewBookings,
        canCreateBookings,
        canUpdateBookings,
        canDeleteBookings,
        canViewUsers,
        canCreateUsers,
        canUpdateUsers,
        canDeleteUsers,
        canManagePermissions,
        canViewSettings,
        canManageSettings,
    };
};

// Export enhanced hooks with aliases for the PermissionsTab
export const useEnhancedPermissionManagement = usePermissionManagement;
export const useEnhancedPermissionCrud = usePermissionCrud;
export const useEnhancedPermissionFilters = usePermissionFilters;
export const useEnhancedPermissionAnalytics = usePermissionAnalytics; 