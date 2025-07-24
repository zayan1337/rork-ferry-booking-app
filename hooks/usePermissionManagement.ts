// ============================================================================
// PERMISSION MANAGEMENT HOOK
// Following the same patterns as island and zone management hooks
// ============================================================================

import { useMemo, useCallback } from 'react';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { AdminManagement } from '@/types';
import * as PermissionUtils from '@/utils/admin/permissionUtils';

type Permission = AdminManagement.Permission;
type PermissionCategory = AdminManagement.PermissionCategory;
type RoleTemplate = AdminManagement.RoleTemplate;
type AdminUser = AdminManagement.AdminUser;
type PermissionFormData = AdminManagement.PermissionFormData;
type PermissionCategoryFormData = AdminManagement.PermissionCategoryFormData;
type RoleTemplateFormData = AdminManagement.RoleTemplateFormData;
type PermissionFilters = AdminManagement.PermissionFilters;
type PermissionStats = AdminManagement.PermissionStats;
type LoadingStates = AdminManagement.LoadingStates;
type ValidationResult = AdminManagement.ValidationResult;

// ============================================================================
// PERMISSION MANAGEMENT HOOK
// ============================================================================

export const usePermissionManagement = () => {
    const {
        // State
        data: permissions,
        categories,
        roleTemplates,
        adminUsers,
        userPermissions,
        currentItem,
        loading,
        error,
        searchQuery,
        filters,
        stats,
        sortBy,
        sortOrder,

        // Actions
        fetchAll,
        fetchById,
        create,
        update,
        delete: deletePermission,
        setCurrentItem,
        clearError,
        setError,
        setSearchQuery,
        clearFilters,
        refreshAll,
        resetStore,

        // Permission-specific actions
        fetchCategories,
        fetchRoleTemplates,
        fetchAdminUsers,
        fetchUserPermissions,
        grantPermission,
        revokePermission,
        updateUserPermissions,
        applyRoleTemplate,
        createRoleTemplate,
        getUserPermissions,
        hasPermission,
        setSortBy,
        setSortOrder,
        setFilters,

        // Search and filter functions
        searchItems,
        filterItems,
        sortItems,
        calculateStats,
    } = usePermissionStore();

    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================

    // Filtered and sorted permissions
    const filteredPermissions = useMemo(() => {
        let filtered = permissions;

        // Apply search
        if (searchQuery) {
            filtered = PermissionUtils.searchPermissions(filtered, searchQuery);
        }

        // Apply filters
        filtered = PermissionUtils.filterPermissions(filtered, filters);

        // Apply sorting
        filtered = PermissionUtils.sortPermissions(filtered, sortBy, sortOrder);

        return filtered;
    }, [permissions, searchQuery, filters, sortBy, sortOrder]);

    // Filtered and sorted categories
    const filteredCategories = useMemo(() => {
        let filtered = categories;

        if (searchQuery) {
            filtered = PermissionUtils.searchCategories(filtered, searchQuery);
        }

        return PermissionUtils.sortCategories(filtered, 'order_index', 'asc');
    }, [categories, searchQuery]);

    // Filtered role templates
    const filteredRoleTemplates = useMemo(() => {
        let filtered = roleTemplates;

        if (searchQuery) {
            filtered = PermissionUtils.searchRoleTemplates(filtered, searchQuery);
        }

        return filtered;
    }, [roleTemplates, searchQuery]);

    // Permissions grouped by category
    const permissionsByCategory = useMemo(() => {
        return PermissionUtils.groupPermissionsByCategory(filteredPermissions, filteredCategories);
    }, [filteredPermissions, filteredCategories]);

    // Permission statistics
    const permissionStats = useMemo(() => {
        return PermissionUtils.calculatePermissionStats(permissions);
    }, [permissions]);

    // Category statistics
    const categoryStats = useMemo(() => {
        return PermissionUtils.calculateCategoryStats(categories);
    }, [categories]);

    // User permission statistics
    const userStats = useMemo(() => {
        return PermissionUtils.calculateUserPermissionStats(adminUsers);
    }, [adminUsers]);

    // ============================================================================
    // PERMISSION CRUD OPERATIONS
    // ============================================================================

    const createPermission = useCallback(async (data: PermissionFormData): Promise<Permission> => {
        const validation = PermissionUtils.validatePermission(data);
        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors)[0]);
        }
        return await create(data);
    }, [create]);

    const updatePermission = useCallback(async (id: string, data: Partial<PermissionFormData>): Promise<Permission> => {
        const validation = PermissionUtils.validatePermission(data);
        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors)[0]);
        }
        return await update(id, data);
    }, [update]);

    const removePermission = useCallback(async (id: string): Promise<void> => {
        // Check if permission is used in role templates
        const templatesUsingPermission = roleTemplates.filter(template =>
            template.permission_ids?.includes(id)
        );

        if (templatesUsingPermission.length > 0) {
            const templateNames = templatesUsingPermission.map(t => t.name).join(', ');
            throw new Error(`Cannot delete permission. It's used in role templates: ${templateNames}`);
        }

        // Check if permission is assigned to users
        const usersWithPermission = adminUsers.filter(user =>
            user.direct_permissions?.includes(id)
        );

        if (usersWithPermission.length > 0) {
            throw new Error(`Cannot delete permission. It's assigned to ${usersWithPermission.length} user(s).`);
        }

        await deletePermission(id);
    }, [deletePermission, roleTemplates, adminUsers]);

    // ============================================================================
    // CATEGORY MANAGEMENT
    // ============================================================================

    const createCategory = useCallback(async (data: PermissionCategoryFormData): Promise<void> => {
        const validation = PermissionUtils.validatePermissionCategory(data);
        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors)[0]);
        }
        // Implementation would depend on having category CRUD in the store
        // For now, we'll throw an error to indicate it's not implemented
        throw new Error('Category management not yet implemented');
    }, []);

    // ============================================================================
    // ROLE TEMPLATE MANAGEMENT
    // ============================================================================

    const createTemplate = useCallback(async (data: RoleTemplateFormData): Promise<void> => {
        const validation = PermissionUtils.validateRoleTemplate(data);
        if (!validation.isValid) {
            throw new Error(Object.values(validation.errors)[0]);
        }
        await createRoleTemplate(data);
    }, [createRoleTemplate]);

    const applyTemplate = useCallback(async (userId: string, templateId: string, grantedBy: string): Promise<void> => {
        await applyRoleTemplate(userId, templateId, grantedBy);
    }, [applyRoleTemplate]);

    // ============================================================================
    // USER PERMISSION MANAGEMENT
    // ============================================================================

    const grantUserPermission = useCallback(async (userId: string, permissionId: string, grantedBy: string): Promise<void> => {
        // Check dependencies
        const permission = permissions.find(p => p.id === permissionId);
        const userCurrentPermissions = getUserPermissions(userId);

        if (permission?.dependencies) {
            const dependencyCheck = PermissionUtils.checkPermissionDependencies(
                permissionId,
                userCurrentPermissions,
                permissions
            );

            if (!dependencyCheck.satisfied) {
                const missingPermissions = dependencyCheck.missing
                    .map(id => permissions.find(p => p.id === id)?.name || id)
                    .join(', ');
                throw new Error(`Cannot grant permission. Missing dependencies: ${missingPermissions}`);
            }
        }

        await grantPermission(userId, permissionId, grantedBy);
    }, [grantPermission, getUserPermissions, permissions]);

    const revokeUserPermission = useCallback(async (userId: string, permissionId: string): Promise<void> => {
        // Check if other permissions depend on this one
        const dependents = PermissionUtils.getPermissionDependents(permissionId, permissions);
        const userCurrentPermissions = getUserPermissions(userId);

        const conflictingDependents = dependents.filter(dep =>
            userCurrentPermissions.includes(dep.id)
        );

        if (conflictingDependents.length > 0) {
            const dependentNames = conflictingDependents.map(p => p.name).join(', ');
            throw new Error(`Cannot revoke permission. Other permissions depend on it: ${dependentNames}`);
        }

        await revokePermission(userId, permissionId);
    }, [revokePermission, getUserPermissions, permissions]);

    const updateAllUserPermissions = useCallback(async (userId: string, permissionIds: string[], grantedBy: string): Promise<void> => {
        // Validate all dependencies
        for (const permissionId of permissionIds) {
            const dependencyCheck = PermissionUtils.checkPermissionDependencies(
                permissionId,
                permissionIds,
                permissions
            );

            if (!dependencyCheck.satisfied) {
                const permission = permissions.find(p => p.id === permissionId);
                const missingPermissions = dependencyCheck.missing
                    .map(id => permissions.find(p => p.id === id)?.name || id)
                    .join(', ');
                throw new Error(`Cannot assign "${permission?.name}". Missing dependencies: ${missingPermissions}`);
            }
        }

        await updateUserPermissions(userId, permissionIds, grantedBy);
    }, [updateUserPermissions, permissions]);

    // ============================================================================
    // BULK OPERATIONS
    // ============================================================================

    const bulkSelectPermissions = useCallback((action: 'all' | 'none' | 'category' | 'level' | 'resource', value?: string): string[] => {
        switch (action) {
            case 'all':
                return PermissionUtils.selectAllPermissions(filteredPermissions);
            case 'none':
                return [];
            case 'category':
                return value ? PermissionUtils.selectCategoryPermissions(value, filteredPermissions) : [];
            case 'level':
                return value ? PermissionUtils.selectPermissionsByLevel(value, filteredPermissions) : [];
            case 'resource':
                return value ? PermissionUtils.selectPermissionsByResource(value, filteredPermissions) : [];
            default:
                return [];
        }
    }, [filteredPermissions]);

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const getPermission = useCallback((id: string): Permission | undefined => {
        return permissions.find(p => p.id === id);
    }, [permissions]);

    const getCategory = useCallback((id: string): PermissionCategory | undefined => {
        return categories.find(c => c.id === id);
    }, [categories]);

    const getRoleTemplate = useCallback((id: string): RoleTemplate | undefined => {
        return roleTemplates.find(t => t.id === id);
    }, [roleTemplates]);

    const getAdminUser = useCallback((id: string): AdminUser | undefined => {
        return adminUsers.find(u => u.id === id);
    }, [adminUsers]);

    const validatePermissionData = useCallback((data: Partial<PermissionFormData>): ValidationResult => {
        return PermissionUtils.validatePermission(data);
    }, []);

    const validateCategoryData = useCallback((data: Partial<PermissionCategoryFormData>): ValidationResult => {
        return PermissionUtils.validatePermissionCategory(data);
    }, []);

    const validateTemplateData = useCallback((data: Partial<RoleTemplateFormData>): ValidationResult => {
        return PermissionUtils.validateRoleTemplate(data);
    }, []);

    // ============================================================================
    // SEARCH AND FILTER HELPERS
    // ============================================================================

    const searchPermissions = useCallback((query: string) => {
        setSearchQuery(query);
    }, [setSearchQuery]);

    const applyFilters = useCallback((newFilters: Partial<PermissionFilters>) => {
        setFilters(newFilters);
    }, [setFilters]);

    const applySorting = useCallback((newSortBy: 'name' | 'level' | 'resource' | 'created_at', newSortOrder: 'asc' | 'desc') => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
    }, [setSortBy, setSortOrder]);

    const resetFilters = useCallback(() => {
        clearFilters();
        setSearchQuery('');
    }, [clearFilters, setSearchQuery]);

    // ============================================================================
    // RETURN HOOK INTERFACE
    // ============================================================================

    return {
        // Data
        permissions: filteredPermissions,
        categories: filteredCategories,
        roleTemplates: filteredRoleTemplates,
        adminUsers,
        userPermissions,
        permissionsByCategory,
        currentPermission: currentItem,

        // State
        loading,
        error,
        searchQuery,
        filters,
        sortBy,
        sortOrder,

        // Statistics
        stats,
        permissionStats,
        categoryStats,
        userStats,

        // CRUD Operations
        loadAll: fetchAll,
        loadById: fetchById,
        createPermission,
        updatePermission,
        removePermission,
        refreshData: refreshAll,

        // Category Management
        createCategory,

        // Role Template Management
        createTemplate,
        applyTemplate,

        // User Permission Management
        grantUserPermission,
        revokeUserPermission,
        updateAllUserPermissions,
        loadUserPermissions: fetchUserPermissions,

        // Utility Functions
        getPermission,
        getCategory,
        getRoleTemplate,
        getAdminUser,
        getUserPermissions,
        hasUserPermission: hasPermission,

        // Validation
        validatePermissionData,
        validateCategoryData,
        validateTemplateData,

        // Search and Filter
        searchPermissions,
        applyFilters,
        applySorting,
        resetFilters,

        // Bulk Operations
        bulkSelectPermissions,

        // State Management
        setCurrentPermission: setCurrentItem,
        clearError,
        resetStore,
    };
};

export type PermissionManagementHook = ReturnType<typeof usePermissionManagement>; 