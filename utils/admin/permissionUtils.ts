// ============================================================================
// PERMISSION UTILITIES
// Following the same patterns as island and zone utilities
// ============================================================================

import { AdminManagement } from '@/types';
import { colors } from '@/constants/adminColors';

type Permission = AdminManagement.Permission;
type PermissionCategory = AdminManagement.PermissionCategory;
type RoleTemplate = AdminManagement.RoleTemplate;
type AdminUser = AdminManagement.AdminUser;
type PermissionFilters = AdminManagement.PermissionFilters;
type ValidationResult = AdminManagement.ValidationResult;

// ============================================================================
// PERMISSION SEARCH FUNCTIONS
// ============================================================================

export const searchPermissions = (permissions: Permission[], query: string): Permission[] => {
    if (!query.trim()) return permissions;

    const lowercaseQuery = query.toLowerCase();
    return permissions.filter(permission =>
        permission.name.toLowerCase().includes(lowercaseQuery) ||
        permission.description.toLowerCase().includes(lowercaseQuery) ||
        permission.resource.toLowerCase().includes(lowercaseQuery) ||
        permission.action.toLowerCase().includes(lowercaseQuery)
    );
};

export const searchCategories = (categories: PermissionCategory[], query: string): PermissionCategory[] => {
    if (!query.trim()) return categories;

    const lowercaseQuery = query.toLowerCase();
    return categories.filter(category =>
        category.name.toLowerCase().includes(lowercaseQuery) ||
        (category.description && category.description.toLowerCase().includes(lowercaseQuery))
    );
};

export const searchRoleTemplates = (templates: RoleTemplate[], query: string): RoleTemplate[] => {
    if (!query.trim()) return templates;

    const lowercaseQuery = query.toLowerCase();
    return templates.filter(template =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        (template.description && template.description.toLowerCase().includes(lowercaseQuery))
    );
};

// ============================================================================
// PERMISSION FILTER FUNCTIONS
// ============================================================================

export const filterPermissionsByStatus = (permissions: Permission[], isActive: boolean | null): Permission[] => {
    if (isActive === null) return permissions;
    return permissions.filter(permission => permission.is_active === isActive);
};

export const filterPermissionsByLevel = (permissions: Permission[], level: string | null): Permission[] => {
    if (!level) return permissions;
    return permissions.filter(permission => permission.level === level);
};

export const filterPermissionsByResource = (permissions: Permission[], resource: string | null): Permission[] => {
    if (!resource) return permissions;
    return permissions.filter(permission => permission.resource === resource);
};

export const filterPermissionsByCategory = (permissions: Permission[], categoryId: string | null): Permission[] => {
    if (!categoryId) return permissions;
    return permissions.filter(permission => permission.category_id === categoryId);
};

export const filterPermissions = (permissions: Permission[], filters: PermissionFilters): Permission[] => {
    let filtered = permissions;

    // Apply search filter
    if (filters.search) {
        filtered = searchPermissions(filtered, filters.search);
    }

    // Apply status filter
    if (filters.is_active !== null && filters.is_active !== undefined) {
        filtered = filterPermissionsByStatus(filtered, filters.is_active);
    }

    // Apply level filter
    if (filters.level) {
        filtered = filterPermissionsByLevel(filtered, filters.level);
    }

    // Apply resource filter
    if (filters.resource) {
        filtered = filterPermissionsByResource(filtered, filters.resource);
    }

    // Apply category filter
    if (filters.category_id) {
        filtered = filterPermissionsByCategory(filtered, filters.category_id);
    }

    return filtered;
};

// ============================================================================
// PERMISSION SORT FUNCTIONS
// ============================================================================

export const sortPermissions = (
    permissions: Permission[],
    sortBy: 'name' | 'level' | 'resource' | 'created_at',
    order: 'asc' | 'desc'
): Permission[] => {
    return [...permissions].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortBy) {
            case 'name':
                aVal = a.name?.toLowerCase() || '';
                bVal = b.name?.toLowerCase() || '';
                break;
            case 'level':
                // Sort by permission level priority
                const levelOrder = { 'read': 1, 'write': 2, 'delete': 3, 'admin': 4 };
                aVal = levelOrder[a.level] || 0;
                bVal = levelOrder[b.level] || 0;
                break;
            case 'resource':
                aVal = a.resource?.toLowerCase() || '';
                bVal = b.resource?.toLowerCase() || '';
                break;
            case 'created_at':
                aVal = new Date(a.created_at || 0).getTime();
                bVal = new Date(b.created_at || 0).getTime();
                break;
            default:
                aVal = a.name?.toLowerCase() || '';
                bVal = b.name?.toLowerCase() || '';
        }

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        return order === 'asc' ? comparison : -comparison;
    });
};

export const sortCategories = (
    categories: PermissionCategory[],
    sortBy: 'name' | 'order_index' | 'created_at',
    order: 'asc' | 'desc'
): PermissionCategory[] => {
    return [...categories].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortBy) {
            case 'name':
                aVal = a.name?.toLowerCase() || '';
                bVal = b.name?.toLowerCase() || '';
                break;
            case 'order_index':
                aVal = a.order_index || 0;
                bVal = b.order_index || 0;
                break;
            case 'created_at':
                aVal = new Date(a.created_at || 0).getTime();
                bVal = new Date(b.created_at || 0).getTime();
                break;
            default:
                aVal = a.order_index || 0;
                bVal = b.order_index || 0;
        }

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        return order === 'asc' ? comparison : -comparison;
    });
};

// ============================================================================
// PERMISSION VALIDATION FUNCTIONS
// ============================================================================

export const validatePermission = (data: Partial<Permission>): ValidationResult => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!data.name?.trim()) {
        errors.name = 'Permission name is required';
    } else if (data.name.length < 3) {
        errors.name = 'Permission name must be at least 3 characters';
    }

    if (!data.description?.trim()) {
        errors.description = 'Permission description is required';
    } else if (data.description.length < 10) {
        errors.description = 'Permission description must be at least 10 characters';
    }

    if (!data.resource) {
        errors.resource = 'Permission resource is required';
    }

    if (!data.action) {
        errors.action = 'Permission action is required';
    }

    if (!data.level) {
        errors.level = 'Permission level is required';
    }

    if (!data.category_id) {
        errors.category_id = 'Permission category is required';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validatePermissionCategory = (data: Partial<PermissionCategory>): ValidationResult => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!data.name?.trim()) {
        errors.name = 'Category name is required';
    } else if (data.name.length < 3) {
        errors.name = 'Category name must be at least 3 characters';
    }

    if (data.order_index !== undefined && data.order_index < 0) {
        errors.order_index = 'Order index must be a positive number';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validateRoleTemplate = (data: Partial<RoleTemplate>): ValidationResult => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!data.name?.trim()) {
        errors.name = 'Template name is required';
    } else if (data.name.length < 3) {
        errors.name = 'Template name must be at least 3 characters';
    }

    if (!data.permission_ids || data.permission_ids.length === 0) {
        errors.permission_ids = 'At least one permission must be selected';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ============================================================================
// PERMISSION STATISTICS FUNCTIONS
// ============================================================================

export const calculatePermissionStats = (permissions: Permission[]) => {
    const total = permissions.length;
    const active = permissions.filter(p => p.is_active).length;
    const inactive = total - active;
    const critical = permissions.filter(p => p.is_critical).length;

    // Group by level
    const byLevel = permissions.reduce((acc, permission) => {
        acc[permission.level] = (acc[permission.level] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Group by resource
    const byResource = permissions.reduce((acc, permission) => {
        acc[permission.resource] = (acc[permission.resource] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        total,
        active,
        inactive,
        critical,
        byLevel,
        byResource
    };
};

export const calculateCategoryStats = (categories: PermissionCategory[]) => {
    const total = categories.length;
    const active = categories.filter(c => c.is_active).length;
    const inactive = total - active;

    return {
        total,
        active,
        inactive
    };
};

export const calculateUserPermissionStats = (users: AdminUser[]) => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const usersWithPermissions = users.filter(u => (u.direct_permissions?.length || 0) > 0).length;
    const superAdmins = users.filter(u => u.is_super_admin).length;

    return {
        totalUsers,
        activeUsers,
        usersWithPermissions,
        superAdmins
    };
};

// ============================================================================
// PERMISSION UTILITY FUNCTIONS
// ============================================================================

export const getPermissionLevelColor = (level: string): string => {
    switch (level) {
        case 'read': return colors.info;
        case 'write': return colors.warning;
        case 'delete': return colors.danger;
        case 'admin': return colors.primaryDark;
        default: return colors.textSecondary;
    }
};

export const getPermissionLevelIcon = (level: string): string => {
    switch (level) {
        case 'read': return 'Eye';
        case 'write': return 'Edit';
        case 'delete': return 'Trash2';
        case 'admin': return 'Key';
        default: return 'Circle';
    }
};

export const getRoleTemplateColor = (templateName: string): string => {
    const colors_map: Record<string, string> = {
        'Super Administrator': '#DC2626',
        'Operations Manager': '#2563EB',
        'Customer Service': '#059669',
        'Financial Officer': '#D97706',
        'Content Manager': '#7C3AED'
    };

    return colors_map[templateName] || colors.primary;
};

export const formatPermissionName = (resource: string, action: string): string => {
    const resourceMap: Record<string, string> = {
        'dashboard': 'Dashboard',
        'bookings': 'Bookings',
        'routes': 'Routes',
        'trips': 'Trips',
        'vessels': 'Vessels',
        'islands': 'Islands',
        'zones': 'Zones',
        'faq': 'FAQ',
        'content': 'Content',
        'users': 'Users',
        'agents': 'Agents',
        'passengers': 'Passengers',
        'wallets': 'Wallets',
        'payments': 'Payments',
        'notifications': 'Notifications',
        'bulk_messages': 'Bulk Messages',
        'reports': 'Reports',
        'settings': 'Settings',
        'permissions': 'Permissions',
        'activity_logs': 'Activity Logs'
    };

    const actionMap: Record<string, string> = {
        'view': 'View',
        'create': 'Create',
        'update': 'Update',
        'delete': 'Delete',
        'manage': 'Manage',
        'export': 'Export',
        'cancel': 'Cancel',
        'send': 'Send'
    };

    const resourceName = resourceMap[resource] || resource;
    const actionName = actionMap[action] || action;

    return `${actionName} ${resourceName}`;
};

export const checkPermissionDependencies = (
    permissionId: string,
    selectedPermissions: string[],
    allPermissions: Permission[]
): { satisfied: boolean; missing: string[] } => {
    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission?.dependencies || permission.dependencies.length === 0) {
        return { satisfied: true, missing: [] };
    }

    const missing = permission.dependencies.filter(dep => !selectedPermissions.includes(dep));
    return {
        satisfied: missing.length === 0,
        missing
    };
};

export const getPermissionDependents = (
    permissionId: string,
    allPermissions: Permission[]
): Permission[] => {
    return allPermissions.filter(p => p.dependencies?.includes(permissionId));
};

// ============================================================================
// PERMISSION GROUPING FUNCTIONS
// ============================================================================

export const groupPermissionsByCategory = (
    permissions: Permission[],
    categories: PermissionCategory[]
): Array<PermissionCategory & { permissions: Permission[] }> => {
    return categories.map(category => ({
        ...category,
        permissions: permissions.filter(p => p.category_id === category.id)
    }));
};

export const groupPermissionsByResource = (permissions: Permission[]): Record<string, Permission[]> => {
    return permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
            acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);
};

export const groupPermissionsByLevel = (permissions: Permission[]): Record<string, Permission[]> => {
    return permissions.reduce((acc, permission) => {
        if (!acc[permission.level]) {
            acc[permission.level] = [];
        }
        acc[permission.level].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);
};

// ============================================================================
// PERMISSION BULK OPERATIONS
// ============================================================================

export const selectAllPermissions = (permissions: Permission[]): string[] => {
    return permissions.filter(p => p.is_active).map(p => p.id);
};

export const selectCategoryPermissions = (
    categoryId: string,
    permissions: Permission[]
): string[] => {
    return permissions
        .filter(p => p.category_id === categoryId && p.is_active)
        .map(p => p.id);
};

export const selectPermissionsByLevel = (
    level: string,
    permissions: Permission[]
): string[] => {
    return permissions
        .filter(p => p.level === level && p.is_active)
        .map(p => p.id);
};

export const selectPermissionsByResource = (
    resource: string,
    permissions: Permission[]
): string[] => {
    return permissions
        .filter(p => p.resource === resource && p.is_active)
        .map(p => p.id);
}; 