import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabase';
import type {
    Permission,
    UserWithPermissions,
    PermissionCheckResult,
    PermissionName,
    PERMISSIONS,
    EnhancedUserProfile,
    PermissionGroup
} from '@/types/permissions';

export const usePermissions = () => {
    const { user, isAuthenticated } = useAuthStore();
    const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if current user is super admin
    const isSuperAdmin = useMemo(() => {
        return user?.profile?.is_super_admin || false;
    }, [user?.profile?.is_super_admin]);

    // Load user permissions
    const loadUserPermissions = useCallback(async () => {
        if (!isAuthenticated || !user?.id) {
            setUserPermissions([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Check if user is super admin directly from user profile
            const isUserSuperAdmin = user?.profile?.is_super_admin || false;

            // If super admin, get all permissions
            if (isUserSuperAdmin) {
                const { data: allPerms, error: allPermsError } = await supabase
                    .from('permissions')
                    .select('*')
                    .order('resource, action');

                if (allPermsError) throw allPermsError;
                setUserPermissions(allPerms || []);
                setLoading(false);
                return;
            }

            // Get user's individual permissions and role-based permissions
            const { data: userPermData, error: userPermError } = await supabase
                .from('user_permissions_view')
                .select('*')
                .eq('id', user.id)
                .single();

            if (userPermError) {
                console.error('Error loading user permissions:', userPermError);
                setError('Failed to load permissions');
                setLoading(false);
                return;
            }

            // Combine individual and role permissions
            const individualPerms = userPermData?.individual_permissions || [];
            const rolePerms = userPermData?.role_permissions || [];
            const combinedPerms = [...individualPerms, ...rolePerms];

            // Remove duplicates based on permission name
            const uniquePerms = combinedPerms.filter((perm, index, self) =>
                index === self.findIndex(p => p.name === perm.name)
            );

            setUserPermissions(uniquePerms);
            setLoading(false);
        } catch (err) {
            console.error('Error loading permissions:', err);
            setError(err instanceof Error ? err.message : 'Failed to load permissions');
            setLoading(false);
        }
    }, [isAuthenticated, user?.id, user?.profile?.is_super_admin]);

    // Load all available permissions (for management interfaces)
    const loadAllPermissions = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('permissions')
                .select('*')
                .order('resource, action');

            if (error) throw error;
            setAllPermissions(data || []);
        } catch (err) {
            console.error('Error loading all permissions:', err);
        }
    }, []);

    // Check if user has specific permission
    const hasPermission = useCallback((permissionName: PermissionName): PermissionCheckResult => {
        if (!isAuthenticated || !user?.profile) {
            return { hasPermission: false };
        }

        // Super admin has all permissions
        if (isSuperAdmin) {
            return {
                hasPermission: true,
                source: 'super_admin',
                permission: allPermissions.find(p => p.name === permissionName)
            };
        }

        // Check in user's loaded permissions
        const permission = userPermissions.find(p => p.name === permissionName);
        if (permission) {
            return {
                hasPermission: true,
                source: 'individual', // Could be either individual or role, but we'll call it individual for simplicity
                permission
            };
        }

        return { hasPermission: false };
    }, [isAuthenticated, user?.profile, isSuperAdmin, userPermissions, allPermissions]);

    // Check if user has any permission from a list
    const hasAnyPermission = useCallback((permissionNames: PermissionName[]): boolean => {
        return permissionNames.some(name => hasPermission(name).hasPermission);
    }, [hasPermission]);

    // Check if user has all permissions from a list
    const hasAllPermissions = useCallback((permissionNames: PermissionName[]): boolean => {
        return permissionNames.every(name => hasPermission(name).hasPermission);
    }, [hasPermission]);

    // Check resource-level access (has any permission for a resource)
    const hasResourceAccess = useCallback((resource: string): boolean => {
        if (!isAuthenticated || !user?.profile) return false;
        if (isSuperAdmin) return true;

        return userPermissions.some(p => p.resource === resource);
    }, [isAuthenticated, user?.profile, isSuperAdmin, userPermissions]);

    // Group permissions by resource for UI display
    const permissionGroups = useMemo((): PermissionGroup[] => {
        const groups: { [key: string]: Permission[] } = {};

        allPermissions.forEach(permission => {
            if (!groups[permission.resource]) {
                groups[permission.resource] = [];
            }
            groups[permission.resource].push(permission);
        });

        return Object.entries(groups).map(([resource, permissions]) => ({
            resource,
            permissions: permissions.sort((a, b) => a.action.localeCompare(b.action))
        })).sort((a, b) => a.resource.localeCompare(b.resource));
    }, [allPermissions]);

    // Get current user's permission status for each permission group
    const getUserPermissionGroups = useMemo((): PermissionGroup[] => {
        return permissionGroups.map(group => ({
            ...group,
            permissions: group.permissions.map(permission => ({
                ...permission,
                isGranted: hasPermission(permission.name as PermissionName).hasPermission
            }))
        }));
    }, [permissionGroups, hasPermission]);

    // Convenience methods for common permission checks
    const canManageUsers = useCallback(() => hasAnyPermission([
        PERMISSIONS.USERS_CREATE,
        PERMISSIONS.USERS_EDIT,
        PERMISSIONS.USERS_DELETE,
        PERMISSIONS.USERS_MANAGE_ROLES
    ]), [hasAnyPermission]);

    const canManageBookings = useCallback(() => hasAnyPermission([
        PERMISSIONS.BOOKINGS_CREATE,
        PERMISSIONS.BOOKINGS_EDIT,
        PERMISSIONS.BOOKINGS_CANCEL
    ]), [hasAnyPermission]);

    const canManageSystem = useCallback(() => hasAnyPermission([
        PERMISSIONS.SYSTEM_MANAGE_PERMISSIONS,
        PERMISSIONS.SYSTEM_MANAGE_SETTINGS,
        PERMISSIONS.SYSTEM_VIEW_LOGS
    ]), [hasAnyPermission]);

    // Load permissions on mount and when user changes
    useEffect(() => {
        const loadPermissions = async () => {
            if (!isAuthenticated || !user?.id) {
                setUserPermissions([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Load all permissions first (for management interfaces)
                const { data: allPermsData, error: allPermsError } = await supabase
                    .from('permissions')
                    .select('*')
                    .order('resource, action');

                if (allPermsError) {
                    console.error('Error loading all permissions:', allPermsError);
                } else {
                    setAllPermissions(allPermsData || []);
                }

                // Check if user is super admin directly from user profile
                const isUserSuperAdmin = user?.profile?.is_super_admin || false;

                // If super admin, use all permissions as user permissions
                if (isUserSuperAdmin) {
                    setUserPermissions(allPermsData || []);
                    setLoading(false);
                    return;
                }

                // Get user's individual permissions and role-based permissions
                const { data: userPermData, error: userPermError } = await supabase
                    .from('user_permissions_view')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (userPermError) {
                    console.error('Error loading user permissions:', userPermError);
                    setError('Failed to load permissions');
                    setLoading(false);
                    return;
                }

                // Combine individual and role permissions
                const individualPerms = userPermData?.individual_permissions || [];
                const rolePerms = userPermData?.role_permissions || [];
                const combinedPerms = [...individualPerms, ...rolePerms];

                // Remove duplicates based on permission name
                const uniquePerms = combinedPerms.filter((perm, index, self) =>
                    index === self.findIndex(p => p.name === perm.name)
                );

                setUserPermissions(uniquePerms);
                setLoading(false);
            } catch (err) {
                console.error('Error loading permissions:', err);
                setError(err instanceof Error ? err.message : 'Failed to load permissions');
                setLoading(false);
            }
        };

        loadPermissions();
    }, [isAuthenticated, user?.id, user?.profile?.is_super_admin]);

    return {
        // Permission data
        userPermissions,
        allPermissions,
        permissionGroups,
        getUserPermissionGroups,

        // Loading states
        loading,
        error,

        // User info
        isSuperAdmin,
        currentUser: user?.profile as EnhancedUserProfile,

        // Permission checking methods
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasResourceAccess,

        // Convenience methods
        canManageUsers,
        canManageBookings,
        canManageSystem,

        // Data refresh
        refreshPermissions: loadUserPermissions,
        refreshAllPermissions: loadAllPermissions,
    };
};

// Specialized hook for permission management (super admin only)
export const usePermissionManagement = () => {
    const { isSuperAdmin, currentUser } = usePermissions();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Grant permissions to a user
    const grantPermissions = useCallback(async (
        userId: string,
        permissionIds: string[],
        expiresAt?: string
    ) => {
        if (!isSuperAdmin || !currentUser) {
            throw new Error('Insufficient permissions');
        }

        try {
            setLoading(true);
            setError(null);

            const permissionRecords = permissionIds.map(permissionId => ({
                user_id: userId,
                permission_id: permissionId,
                granted_by: currentUser.id,
                expires_at: expiresAt || null,
                is_active: true
            }));

            const { error } = await supabase
                .from('user_permissions')
                .upsert(permissionRecords, {
                    onConflict: 'user_id,permission_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;

            setLoading(false);
            return { success: true };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to grant permissions';
            setError(errorMessage);
            setLoading(false);
            throw new Error(errorMessage);
        }
    }, [isSuperAdmin, currentUser]);

    // Revoke permissions from a user
    const revokePermissions = useCallback(async (userId: string, permissionIds: string[]) => {
        if (!isSuperAdmin || !currentUser) {
            throw new Error('Insufficient permissions');
        }

        try {
            setLoading(true);
            setError(null);

            const { error } = await supabase
                .from('user_permissions')
                .delete()
                .eq('user_id', userId)
                .in('permission_id', permissionIds);

            if (error) throw error;

            setLoading(false);
            return { success: true };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to revoke permissions';
            setError(errorMessage);
            setLoading(false);
            throw new Error(errorMessage);
        }
    }, [isSuperAdmin, currentUser]);

    // Toggle super admin status
    const toggleSuperAdmin = useCallback(async (userId: string, isSuperAdmin: boolean) => {
        if (!currentUser?.is_super_admin) {
            throw new Error('Insufficient permissions');
        }

        try {
            setLoading(true);
            setError(null);

            const { error } = await supabase
                .from('user_profiles')
                .update({ is_super_admin: isSuperAdmin })
                .eq('id', userId);

            if (error) throw error;

            setLoading(false);
            return { success: true };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update super admin status';
            setError(errorMessage);
            setLoading(false);
            throw new Error(errorMessage);
        }
    }, [currentUser?.is_super_admin]);

    // Get user with permissions
    const getUserWithPermissions = useCallback(async (userId: string): Promise<UserWithPermissions | null> => {
        try {
            const { data, error } = await supabase
                .from('user_permissions_view')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (!data) return null;

            const individualPerms = data.individual_permissions || [];
            const rolePerms = data.role_permissions || [];
            const allPerms = [...individualPerms, ...rolePerms];

            // Remove duplicates
            const uniquePerms = allPerms.filter((perm, index, self) =>
                index === self.findIndex(p => p.name === perm.name)
            );

            return {
                id: data.id,
                full_name: data.full_name,
                email: data.email,
                role: data.role,
                is_super_admin: data.is_super_admin,
                is_active: data.is_active,
                individual_permissions: individualPerms,
                role_permissions: rolePerms,
                all_permissions: uniquePerms
            };
        } catch (err) {
            console.error('Error fetching user permissions:', err);
            return null;
        }
    }, []);

    return {
        loading,
        error,
        grantPermissions,
        revokePermissions,
        toggleSuperAdmin,
        getUserWithPermissions,
        canManagePermissions: isSuperAdmin,
    };
}; 