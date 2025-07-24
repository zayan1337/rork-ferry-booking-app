// ============================================================================
// ENHANCED PERMISSION SERVICE
// Comprehensive service for permission management with Supabase
// Enhanced for production-level super admin management
// ============================================================================

import { supabase } from './supabase';
import {
    Permission,
    UserPermission,
    RolePermission,
    AdminUser,
    Role,
    PermissionFormData,
    UserPermissionFormData,
    RolePermissionFormData,
    PermissionFilters,
    UserPermissionFilters,
    PermissionStats,
    UserPermissionStats,
    DatabasePermission,
    DatabaseUserPermission,
    DatabaseRolePermission,
    PermissionResource,
    PermissionLevel,
    UserRole,
    PermissionCategory,
    PERMISSION_CATEGORIES,
    PermissionTemplate,
    PermissionTemplateFormData,
    PermissionAuditLog,
    PermissionAuditFilters,
    BulkPermissionOperation,
    SuperAdminCapabilities,
    PermissionWithDetails,
    SUPER_ADMIN_PERMISSIONS,
    PERMISSION_LEVEL_COLORS,
} from '@/types/permissions';

// ============================================================================
// PERMISSION CRUD OPERATIONS (MINIMAL FOR ADMIN MANAGEMENT)
// ============================================================================

/**
 * Fetch all permissions with optional filtering
 */
export const fetchPermissions = async (filters?: PermissionFilters): Promise<Permission[]> => {
    try {
        let query = supabase
            .from('permissions')
            .select('*')
            .order('resource', { ascending: true })
            .order('action', { ascending: true });

        // Apply filters
        if (filters?.resource && filters.resource !== 'all') {
            query = query.eq('resource', filters.resource);
        }

        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(transformDatabasePermission);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        throw new Error('Failed to fetch permissions');
    }
};

/**
 * Fetch permissions with usage statistics
 */
export const fetchPermissionsWithStats = async (filters?: PermissionFilters): Promise<PermissionWithDetails[]> => {
    try {
        const { data, error } = await supabase
            .from('permission_usage_stats')
            .select('*')
            .order('total_usage', { ascending: false });

        if (error) throw error;

        let permissions = (data || []).map(transformPermissionWithStats);

        // Apply filters
        if (filters?.search) {
            const query = filters.search.toLowerCase();
            permissions = permissions.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.resource.toLowerCase().includes(query)
            );
        }

        if (filters?.category && filters.category !== 'all') {
            permissions = permissions.filter(p => p.category === filters.category);
        }

        if (filters?.level && filters.level !== 'all') {
            permissions = permissions.filter(p => p.level === filters.level);
        }

        if (filters?.usage && filters.usage !== 'all') {
            switch (filters.usage) {
                case 'used':
                    permissions = permissions.filter(p => p.usageCount > 0);
                    break;
                case 'unused':
                    permissions = permissions.filter(p => p.usageCount === 0);
                    break;
                case 'most_used':
                    permissions = permissions.slice(0, 10);
                    break;
                case 'least_used':
                    permissions = permissions.slice(-10);
                    break;
            }
        }

        return permissions;
    } catch (error) {
        console.error('Error fetching permissions with stats:', error);
        throw new Error('Failed to fetch permissions with statistics');
    }
};

/**
 * Create a new permission
 */
export const createPermission = async (data: PermissionFormData): Promise<Permission> => {
    try {
        const permissionData = {
            name: `${data.resource}:${data.action}`,
            description: data.description,
            resource: data.resource,
            action: data.action,
        };

        const { data: result, error } = await supabase
            .from('permissions')
            .insert([permissionData])
            .select()
            .single();

        if (error) throw error;

        return transformDatabasePermission(result);
    } catch (error) {
        console.error('Error creating permission:', error);
        throw new Error('Failed to create permission');
    }
};

/**
 * Update an existing permission
 */
export const updatePermission = async (
    id: string,
    data: Partial<PermissionFormData>
): Promise<Permission> => {
    try {
        const updateData: any = {};

        if (data.description !== undefined) {
            updateData.description = data.description;
        }

        if (data.resource || data.action) {
            // If updating resource or action, regenerate the name
            const currentPermission = await getPermissionById(id);
            const resource = data.resource || currentPermission.resource;
            const action = data.action || currentPermission.action;
            updateData.name = `${resource}:${action}`;

            if (data.resource) updateData.resource = data.resource;
            if (data.action) updateData.action = data.action;
        }

        const { data: result, error } = await supabase
            .from('permissions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return transformDatabasePermission(result);
    } catch (error) {
        console.error('Error updating permission:', error);
        throw new Error('Failed to update permission');
    }
};

/**
 * Delete a permission
 */
export const deletePermission = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('permissions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting permission:', error);
        throw new Error('Failed to delete permission');
    }
};

/**
 * Get a single permission by ID
 */
export const getPermissionById = async (id: string): Promise<Permission> => {
    try {
        const { data, error } = await supabase
            .from('permissions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Permission not found');

        return transformDatabasePermission(data);
    } catch (error) {
        console.error('Error fetching permission:', error);
        throw new Error('Failed to fetch permission');
    }
};

// ============================================================================
// USER PERMISSION MANAGEMENT
// ============================================================================

/**
 * Fetch admin users with their permissions using enhanced view
 */
export const fetchAdminUsers = async (filters?: UserPermissionFilters): Promise<AdminUser[]> => {
    try {
        // Use the admin-specific view for better performance
        let query = supabase
            .from('admin_users_permissions_view')
            .select('*')
            .order('full_name', { ascending: true });

        // Apply filters
        if (filters?.role && filters.role !== 'all') {
            query = query.eq('role', filters.role);
        }

        if (filters?.is_active !== undefined) {
            query = query.eq('is_active', filters.is_active);
        }

        if (filters?.is_super_admin !== undefined) {
            query = query.eq('is_super_admin', filters.is_super_admin);
        }

        if (filters?.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        if (filters?.last_login_days) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filters.last_login_days);
            query = query.gte('last_login', cutoffDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        // Get all available permissions for super admin logic
        const allPermissions = await fetchPermissions();

        const users = (data || []).map(userData => {
            const user = transformEnhancedUserPermissionView(userData);

            // Super admins should have access to all permissions
            if (user.is_super_admin) {
                user.all_permissions = allPermissions;
            }

            return user;
        });

        return users;
    } catch (error) {
        console.error('Error fetching admin users:', error);
        throw new Error('Failed to fetch admin users');
    }
};

/**
 * Grant permissions to a user with audit trail
 */
export const grantUserPermissions = async (data: UserPermissionFormData): Promise<void> => {
    try {
        const { user_id, permission_ids, expires_at, reason } = data;

        // Get current user ID for granted_by field
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('User not authenticated');

        // Get user profile to get the actual profile ID
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) throw new Error('User profile not found');

        // Use the new database function for better audit trail
        const { error } = await supabase.rpc('grant_user_permissions_with_audit', {
            user_id_param: user_id,
            permission_ids_param: permission_ids,
            granted_by_param: profile.id,
            expires_at_param: expires_at || null,
            reason_param: reason || null,
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error granting user permissions:', error);
        throw new Error('Failed to grant user permissions');
    }
};

/**
 * Revoke a permission from a user
 */
export const revokeUserPermission = async (user_id: string, permission_id: string): Promise<void> => {
    try {
        // Get current user ID for revoked_by field
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('User not authenticated');

        // Get user profile to get the actual profile ID
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) throw new Error('User profile not found');

        // Use the new database function for better audit trail
        const { error } = await supabase.rpc('revoke_user_permissions_with_audit', {
            user_id_param: user_id,
            permission_ids_param: [permission_id],
            revoked_by_param: profile.id,
            reason_param: 'Permission revoked by admin',
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error revoking user permission:', error);
        throw new Error('Failed to revoke user permission');
    }
};

/**
 * Get all permissions for a specific user
 */
export const getUserPermissions = async (user_id: string): Promise<UserPermission[]> => {
    try {
        const { data, error } = await supabase
            .from('user_permissions')
            .select(`
        *,
        permissions!inner(*),
        granted_by_user:user_profiles!user_permissions_granted_by_fkey(
          id,
          full_name,
          email
        )
      `)
            .eq('user_id', user_id)
            .eq('is_active', true);

        if (error) throw error;

        return (data || []).map(transformUserPermission);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        throw new Error('Failed to fetch user permissions');
    }
};

// ============================================================================
// PERMISSION TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Fetch all permission templates
 */
export const fetchPermissionTemplates = async (): Promise<PermissionTemplate[]> => {
    try {
        const { data, error } = await supabase
            .from('permission_template_details')
            .select('*')
            .eq('is_active', true)
            .order('is_system_template', { ascending: false })
            .order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map(transformPermissionTemplate);
    } catch (error) {
        console.error('Error fetching permission templates:', error);
        throw new Error('Failed to fetch permission templates');
    }
};

/**
 * Create a new permission template
 */
export const createPermissionTemplate = async (data: PermissionTemplateFormData): Promise<PermissionTemplate> => {
    try {
        // Get current user ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('User not authenticated');

        // Create template
        const { data: template, error: templateError } = await supabase
            .from('permission_templates')
            .insert([{
                name: data.name,
                description: data.description,
                color: data.color,
                is_system_template: data.is_system_template || false,
                created_by: user.id,
            }])
            .select()
            .single();

        if (templateError) throw templateError;

        // Add permissions to template
        if (data.permission_ids.length > 0) {
            const templatePermissions = data.permission_ids.map(permission_id => ({
                template_id: template.id,
                permission_id,
            }));

            const { error: permError } = await supabase
                .from('permission_template_permissions')
                .insert(templatePermissions);

            if (permError) throw permError;
        }

        // Fetch the complete template
        return await getPermissionTemplateById(template.id);
    } catch (error) {
        console.error('Error creating permission template:', error);
        throw new Error('Failed to create permission template');
    }
};

/**
 * Update a permission template
 */
export const updatePermissionTemplate = async (
    id: string,
    data: Partial<PermissionTemplateFormData>
): Promise<PermissionTemplate> => {
    try {
        // Update template basic info
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.description) updateData.description = data.description;
        if (data.color) updateData.color = data.color;

        if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
                .from('permission_templates')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        }

        // Update permissions if provided
        if (data.permission_ids) {
            // Remove existing permissions
            await supabase
                .from('permission_template_permissions')
                .delete()
                .eq('template_id', id);

            // Add new permissions
            if (data.permission_ids.length > 0) {
                const templatePermissions = data.permission_ids.map(permission_id => ({
                    template_id: id,
                    permission_id,
                }));

                const { error } = await supabase
                    .from('permission_template_permissions')
                    .insert(templatePermissions);

                if (error) throw error;
            }
        }

        // Fetch the updated template
        return await getPermissionTemplateById(id);
    } catch (error) {
        console.error('Error updating permission template:', error);
        throw new Error('Failed to update permission template');
    }
};

/**
 * Delete a permission template
 */
export const deletePermissionTemplate = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('permission_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting permission template:', error);
        throw new Error('Failed to delete permission template');
    }
};

/**
 * Get permission template by ID
 */
export const getPermissionTemplateById = async (id: string): Promise<PermissionTemplate> => {
    try {
        const { data, error } = await supabase
            .from('permission_template_details')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Permission template not found');

        return transformPermissionTemplate(data);
    } catch (error) {
        console.error('Error fetching permission template:', error);
        throw new Error('Failed to fetch permission template');
    }
};

/**
 * Apply permission template to users
 */
export const applyPermissionTemplate = async (template_id: string, user_ids: string[]): Promise<void> => {
    try {
        // Get current user ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('User not authenticated');

        // Apply template to each user using database function
        for (const user_id of user_ids) {
            const { error } = await supabase.rpc('apply_permission_template', {
                template_id,
                user_id,
                granted_by_user_id: user.id,
            });

            if (error) throw error;
        }
    } catch (error) {
        console.error('Error applying permission template:', error);
        throw new Error('Failed to apply permission template');
    }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Perform bulk permission operations
 */
export const bulkGrantPermissions = async (operation: BulkPermissionOperation): Promise<void> => {
    try {
        if (operation.type === 'template' && operation.template_id) {
            await applyPermissionTemplate(operation.template_id, operation.user_ids);
        } else if (operation.type === 'grant' && operation.permission_ids) {
            for (const user_id of operation.user_ids) {
                await grantUserPermissions({
                    user_id,
                    permission_ids: operation.permission_ids,
                    expires_at: operation.expires_at,
                    reason: operation.reason,
                });
            }
        }
    } catch (error) {
        console.error('Error performing bulk grant operation:', error);
        throw new Error('Failed to perform bulk grant operation');
    }
};

/**
 * Bulk revoke permissions
 */
export const bulkRevokePermissions = async (user_ids: string[], permission_ids: string[]): Promise<void> => {
    try {
        const { error } = await supabase
            .from('user_permissions')
            .delete()
            .in('user_id', user_ids)
            .in('permission_id', permission_ids);

        if (error) throw error;
    } catch (error) {
        console.error('Error performing bulk revoke operation:', error);
        throw new Error('Failed to perform bulk revoke operation');
    }
};

/**
 * Fetch bulk permission operations
 */
export const fetchBulkPermissionOperations = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('bulk_permission_operations_details')
            .select('*')
            .order('performed_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error fetching bulk operations:', error);
        throw new Error('Failed to fetch bulk operations');
    }
};

/**
 * Create a bulk permission operation
 */
export const createBulkPermissionOperation = async (operation: BulkPermissionOperation): Promise<any> => {
    try {
        // Get current user ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('bulk_permission_operations')
            .insert([{
                operation_type: operation.type,
                user_ids: operation.user_ids,
                permission_ids: operation.permission_ids,
                template_id: operation.template_id,
                status: 'pending',
                total_users: operation.user_ids.length,
                completed_users: 0,
                failed_users: 0,
                expires_at: operation.expires_at,
                reason: operation.reason,
                performed_by: user.id,
            }])
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error creating bulk operation:', error);
        throw new Error('Failed to create bulk operation');
    }
};

/**
 * Update bulk operation status
 */
export const updateBulkOperationStatus = async (
    id: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    completed_users?: number,
    failed_users?: number,
    error_details?: any
): Promise<void> => {
    try {
        const updateData: any = { status };

        if (completed_users !== undefined) updateData.completed_users = completed_users;
        if (failed_users !== undefined) updateData.failed_users = failed_users;
        if (error_details !== undefined) updateData.error_details = error_details;

        if (status === 'completed' || status === 'failed') {
            updateData.completed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('bulk_permission_operations')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating bulk operation status:', error);
        throw new Error('Failed to update bulk operation status');
    }
};

// ============================================================================
// AUDIT TRAIL MANAGEMENT
// ============================================================================

/**
 * Fetch permission audit logs with enhanced details
 */
export const fetchPermissionAuditLogs = async (filters?: PermissionAuditFilters): Promise<PermissionAuditLog[]> => {
    try {
        let query = supabase
            .from('permission_audit_log_details')
            .select('*')
            .order('performed_at', { ascending: false })
            .limit(100);

        // Apply filters
        if (filters?.action_type && filters.action_type !== 'all') {
            query = query.eq('action_type', filters.action_type);
        }

        if (filters?.entity_type && filters.entity_type !== 'all') {
            query = query.eq('entity_type', filters.entity_type);
        }

        if (filters?.target_user_id) {
            query = query.eq('target_user_id', filters.target_user_id);
        }

        if (filters?.performed_by) {
            query = query.eq('performed_by', filters.performed_by);
        }

        if (filters?.date_from) {
            query = query.gte('performed_at', filters.date_from);
        }

        if (filters?.date_to) {
            query = query.lte('performed_at', filters.date_to);
        }

        if (filters?.search) {
            query = query.or(`performed_by_name.ilike.%${filters.search}%,target_user_name.ilike.%${filters.search}%,permission_name.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(transformAuditLog);
    } catch (error) {
        console.error('Error fetching permission audit logs:', error);
        throw new Error('Failed to fetch permission audit logs');
    }
};

// ============================================================================
// SUPER ADMIN OPERATIONS
// ============================================================================

/**
 * Promote user to super admin
 */
export const promoteSuperAdmin = async (user_id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_super_admin: true })
            .eq('id', user_id);

        if (error) throw error;
    } catch (error) {
        console.error('Error promoting user to super admin:', error);
        throw new Error('Failed to promote user to super admin');
    }
};

/**
 * Demote user from super admin
 */
export const demoteSuperAdmin = async (user_id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_super_admin: false })
            .eq('id', user_id);

        if (error) throw error;
    } catch (error) {
        console.error('Error demoting user from super admin:', error);
        throw new Error('Failed to demote user from super admin');
    }
};

/**
 * Get super admin capabilities for a user
 */
export const getSuperAdminCapabilities = async (user_id: string): Promise<SuperAdminCapabilities> => {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('is_super_admin, role')
            .eq('id', user_id)
            .single();

        if (error) throw error;

        const isSuperAdmin = profile?.is_super_admin || false;
        const isAdmin = profile?.role === 'admin';

        return {
            canManageAllUsers: isSuperAdmin,
            canAssignSuperAdmin: isSuperAdmin,
            canCreatePermissions: isSuperAdmin,
            canDeletePermissions: isSuperAdmin,
            canManageRoles: isSuperAdmin || isAdmin,
            canViewAuditLogs: isSuperAdmin || isAdmin,
            canBulkOperations: isSuperAdmin || isAdmin,
            canManageTemplates: isSuperAdmin || isAdmin,
            canManageSystem: isSuperAdmin,
        };
    } catch (error) {
        console.error('Error getting super admin capabilities:', error);
        return {
            canManageAllUsers: false,
            canAssignSuperAdmin: false,
            canCreatePermissions: false,
            canDeletePermissions: false,
            canManageRoles: false,
            canViewAuditLogs: false,
            canBulkOperations: false,
            canManageTemplates: false,
            canManageSystem: false,
        };
    }
};

// ============================================================================
// PERMISSION CHECKING UTILITIES
// ============================================================================

/**
 * Check if a user has a specific permission
 */
export const checkUserPermission = async (
    user_id: string,
    resource: PermissionResource,
    action: PermissionLevel
): Promise<boolean> => {
    try {
        // First check if user is super admin
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('is_super_admin, role')
            .eq('id', user_id)
            .single();

        if (profileError) throw profileError;
        if (profile?.is_super_admin) return true;

        // Check individual user permissions
        const { data: userPermissions, error: userError } = await supabase
            .from('user_permissions')
            .select(`
        permissions!inner(resource, action)
      `)
            .eq('user_id', user_id)
            .eq('is_active', true)
            .eq('permissions.resource', resource)
            .eq('permissions.action', action);

        if (userError) throw userError;
        if (userPermissions && userPermissions.length > 0) return true;

        // Check role-based permissions
        if (profile?.role) {
            const { data: rolePermissions, error: roleError } = await supabase
                .from('role_permissions')
                .select(`
          permissions!inner(resource, action)
        `)
                .eq('role', profile.role)
                .eq('permissions.resource', resource)
                .eq('permissions.action', action);

            if (roleError) throw roleError;
            if (rolePermissions && rolePermissions.length > 0) return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking user permission:', error);
        return false;
    }
};

/**
 * Get role-based permissions
 */
export const getRolePermissions = async (role: string): Promise<Permission[]> => {
    try {
        const { data, error } = await supabase
            .from('role_permissions')
            .select(`
                permissions(*)
            `)
            .eq('role', role);

        if (error) throw error;

        return (data || []).map((item: any) => transformDatabasePermission(item.permissions));
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        return [];
    }
};

/**
 * Get all permissions for a user (both individual and role-based)
 */
export const getAllUserPermissions = async (user_id: string): Promise<Permission[]> => {
    try {
        const userPermissions = await getUserPermissions(user_id);

        // Get user's role
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user_id)
            .single();

        if (profileError) throw profileError;

        let rolePermissions: Permission[] = [];
        if (profile?.role) {
            rolePermissions = await getRolePermissions(profile.role);
        }

        // Combine and deduplicate permissions
        const allPermissions = [
            ...userPermissions.map(up => up.permission!).filter(Boolean),
            ...rolePermissions
        ];

        // Remove duplicates based on permission ID
        const uniquePermissions = allPermissions.filter(
            (permission, index, self) =>
                index === self.findIndex(p => p.id === permission.id)
        );

        return uniquePermissions;
    } catch (error) {
        console.error('Error getting all user permissions:', error);
        return [];
    }
};

/**
 * Check if user can manage permissions
 */
export const canUserManagePermissions = async (user_id: string): Promise<boolean> => {
    try {
        const capabilities = await getSuperAdminCapabilities(user_id);
        return capabilities.canManageRoles;
    } catch (error) {
        console.error('Error checking permission management capability:', error);
        return false;
    }
};

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

/**
 * Calculate permission statistics
 */
export const calculatePermissionStats = async (): Promise<PermissionStats> => {
    try {
        // Get basic permission counts
        const { data: permissions, error: permError } = await supabase
            .from('permissions')
            .select('resource, action');

        if (permError) throw permError;

        // Get user counts by role
        const { data: users, error: userError } = await supabase
            .from('user_profiles')
            .select('role, is_super_admin, is_active')
            .in('role', ['admin', 'agent']);

        if (userError) throw userError;

        // Get recent permission changes
        const { data: recentChanges, error: changesError } = await supabase
            .from('permission_audit_log')
            .select('id')
            .gte('performed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (changesError) throw changesError;

        // Get permission usage stats
        const { data: usageStats, error: usageError } = await supabase
            .from('permission_usage_stats')
            .select('*');

        if (usageError) throw usageError;

        // Calculate statistics
        const permissionsByCategory: Record<PermissionCategory, number> = {
            dashboard: 0,
            bookings: 0,
            operations: 0,
            content: 0,
            users: 0,
            finance: 0,
            communications: 0,
            reports: 0,
            settings: 0,
            system: 0,
        };

        const permissionsByLevel: Record<PermissionLevel, number> = {
            view: 0,
            create: 0,
            update: 0,
            delete: 0,
            manage: 0,
            export: 0,
            send: 0,
            approve: 0,
            cancel: 0,
        };

        // Count permissions by category and level
        permissions?.forEach(perm => {
            // Map resource to category
            const category = mapResourceToCategory(perm.resource);
            if (category) {
                permissionsByCategory[category]++;
            }

            // Count by action/level
            const level = perm.action as PermissionLevel;
            if (level in permissionsByLevel) {
                permissionsByLevel[level]++;
            }
        });

        const usersByRole: Record<UserRole, number> = {
            admin: users?.filter(u => u.role === 'admin').length || 0,
            agent: users?.filter(u => u.role === 'agent').length || 0,
            customer: 0, // We don't typically manage customer permissions in admin
        };

        // Get top/bottom usage permissions
        const sortedUsage = (usageStats || []).sort((a, b) => b.total_usage - a.total_usage);
        const mostUsed = sortedUsage.slice(0, 5).map(transformPermissionWithStats);
        const leastUsed = sortedUsage.slice(-5).map(transformPermissionWithStats);
        const unused = sortedUsage.filter(p => p.total_usage === 0).map(p => transformDatabasePermission(p));

        return {
            total_permissions: permissions?.length || 0,
            permissions_by_category: permissionsByCategory,
            permissions_by_level: permissionsByLevel,
            total_users: users?.length || 0,
            users_by_role: usersByRole,
            total_roles: 3, // admin, agent, customer
            active_permissions: permissions?.length || 0,
            recent_permission_changes: recentChanges?.length || 0,
            permission_usage: {
                most_used: mostUsed,
                least_used: leastUsed,
                unused,
            },
            permission_trends: {
                grants_last_7_days: 0,
                revokes_last_7_days: 0,
                new_permissions_last_30_days: 0,
            },
            security_metrics: {
                super_admin_count: users?.filter(u => u.is_super_admin).length || 0,
                users_with_expired_permissions: 0,
                inactive_users_with_permissions: users?.filter(u => !u.is_active).length || 0,
            },
        };
    } catch (error) {
        console.error('Error calculating permission stats:', error);
        throw new Error('Failed to calculate permission statistics');
    }
};

/**
 * Fetch permission statistics
 */
export const fetchPermissionStats = async (): Promise<PermissionStats> => {
    try {
        const { data, error } = await supabase.rpc('get_permission_statistics');
        if (error) throw error;
        return data?.[0] || {};
    } catch (error) {
        console.error('Error fetching permission stats:', error);
        throw new Error('Failed to fetch permission stats');
    }
};

// ============================================================================
// SEED DATA AND SYSTEM PERMISSIONS
// ============================================================================

/**
 * Initialize system permissions
 */
export const initializeSystemPermissions = async (): Promise<void> => {
    try {
        const systemPermissions = getSystemPermissions();

        // Check if permissions already exist
        const { data: existingPermissions, error } = await supabase
            .from('permissions')
            .select('name');

        if (error) throw error;

        const existingNames = new Set(existingPermissions?.map(p => p.name) || []);
        const newPermissions = systemPermissions.filter(p => !existingNames.has(p.name));

        if (newPermissions.length > 0) {
            const { error: insertError } = await supabase
                .from('permissions')
                .insert(newPermissions);

            if (insertError) throw insertError;
        }
    } catch (error) {
        console.error('Error initializing system permissions:', error);
        throw new Error('Failed to initialize system permissions');
    }
};

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform database permission to application permission
 */
const transformDatabasePermission = (dbPerm: any): Permission => {
    const category = mapResourceToCategory(dbPerm.resource);
    const level = dbPerm.action as PermissionLevel;

    return {
        id: dbPerm.id,
        name: dbPerm.name,
        description: dbPerm.description || '',
        resource: dbPerm.resource,
        action: dbPerm.action,
        category: category || 'system',
        level,
        created_at: dbPerm.created_at,
    };
};

/**
 * Transform permission with usage statistics
 */
const transformPermissionWithStats = (data: any): PermissionWithDetails => {
    const permission = transformDatabasePermission(data);

    return {
        ...permission,
        usageCount: data.total_usage || 0,
        userCount: data.user_count || 0,
        roleCount: data.role_count || 0,
        isSystemPermission: SUPER_ADMIN_PERMISSIONS.includes(`${data.resource}:${data.action}` as any),
        lastGrantedAt: data.last_granted_at,
        recentGrants: data.recent_grants || 0,
    };
};

/**
 * Transform enhanced user permission view data
 */
const transformEnhancedUserPermissionView = (data: any): AdminUser => {
    const individualPermissions = Array.isArray(data.individual_permissions)
        ? data.individual_permissions.map((p: any) => transformUserPermissionData(p))
        : [];

    const rolePermissions = Array.isArray(data.role_permissions)
        ? data.role_permissions.map((p: any) => transformDatabasePermission(p))
        : [];

    // For super admins, they should have access to all permissions
    // We'll combine individual and role permissions, and super admins get everything
    const allPermissions = [...rolePermissions];

    // Add individual permissions that aren't already in role permissions
    individualPermissions.forEach((userPerm: any) => {
        if (userPerm.permission && !allPermissions.find(p => p.id === userPerm.permission!.id)) {
            allPermissions.push(userPerm.permission);
        }
    });

    return {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        is_super_admin: data.is_super_admin,
        is_active: data.is_active,
        last_login: data.last_login || null,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        individual_permissions: individualPermissions,
        role_permissions: rolePermissions,
        all_permissions: allPermissions,
        individual_permission_count: data.individual_permission_count || 0,
        role_permission_count: data.role_permission_count || 0,
        total_permission_count: data.total_permission_count || 0,
        last_permission_change: data.last_permission_change,
    };
};

/**
 * Transform permission template
 */
const transformPermissionTemplate = (data: any): PermissionTemplate => {
    return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        color: data.color || '#2563EB',
        is_system_template: data.is_system_template || false,
        is_active: data.is_active !== false,
        created_by: data.created_by,
        created_by_name: data.created_by_name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        permission_count: data.permission_count || 0,
        permissions: Array.isArray(data.permissions)
            ? data.permissions.map(transformDatabasePermission)
            : [],
    };
};

/**
 * Transform audit log with enhanced details
 */
const transformAuditLog = (data: any): PermissionAuditLog => {
    return {
        id: data.id,
        action_type: data.action_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        permission_id: data.permission_id,
        target_user_id: data.target_user_id,
        target_role: data.target_role,
        old_values: data.old_values,
        new_values: data.new_values,
        performed_by: data.performed_by,
        performed_at: data.performed_at,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        reason: data.reason,
        performed_by_user: data.performed_by_name ? {
            id: data.performed_by,
            full_name: data.performed_by_name,
            email: data.performed_by_email,
        } : undefined,
        permission: data.permission_name ? {
            id: data.permission_id,
            name: data.permission_name,
            resource: data.permission_resource,
            action: data.permission_action,
            description: '',
            category: 'system' as any,
            level: data.permission_action as any,
            created_at: data.performed_at,
        } : undefined,
        target_user: data.target_user_name ? {
            id: data.target_user_id,
            full_name: data.target_user_name,
            email: data.target_user_email,
        } : undefined,
        // Enhanced fields
        formatted_performed_at: data.formatted_performed_at,
        formatted_date: data.formatted_date,
        formatted_time: data.formatted_time,
        time_ago: data.time_ago,
        action_description: data.action_description,
        entity_description: data.entity_description,
    };
};

/**
 * Transform user permission data
 */
const transformUserPermission = (data: any): UserPermission => {
    return {
        id: data.id,
        user_id: data.user_id,
        permission_id: data.permission_id,
        granted_by: data.granted_by,
        granted_at: data.granted_at,
        expires_at: data.expires_at,
        is_active: data.is_active,
        permission: data.permissions ? transformDatabasePermission(data.permissions) : undefined,
        granted_by_user: data.granted_by_user ? {
            id: data.granted_by_user.id,
            full_name: data.granted_by_user.full_name,
            email: data.granted_by_user.email,
        } : undefined,
    };
};

/**
 * Transform user permission data from JSON
 */
const transformUserPermissionData = (data: any): UserPermission => {
    return {
        id: data.id || '',
        user_id: data.user_id || '',
        permission_id: data.permission_id || '',
        granted_by: data.granted_by || '',
        granted_at: data.granted_at || new Date().toISOString(),
        expires_at: data.expires_at || null,
        is_active: data.is_active !== false,
        permission: data.permission ? transformDatabasePermission(data.permission) : undefined,
    };
};

/**
 * Map resource to category
 */
const mapResourceToCategory = (resource: string): PermissionCategory | null => {
    const resourceToCategoryMap: Record<string, PermissionCategory> = {
        dashboard: 'dashboard',
        bookings: 'bookings',
        routes: 'operations',
        trips: 'operations',
        vessels: 'operations',
        islands: 'operations',
        zones: 'content',
        faq: 'content',
        content: 'content',
        users: 'users',
        agents: 'users',
        passengers: 'users',
        wallets: 'finance',
        payments: 'finance',
        notifications: 'communications',
        bulk_messages: 'communications',
        reports: 'reports',
        settings: 'settings',
        permissions: 'settings',
        activity_logs: 'system',
    };

    return resourceToCategoryMap[resource] || null;
};

/**
 * Get system permissions that should be created by default
 */
const getSystemPermissions = () => {
    const resources = [
        'dashboard', 'bookings', 'routes', 'trips', 'vessels', 'islands', 'zones',
        'faq', 'content', 'users', 'agents', 'passengers', 'wallets', 'payments',
        'notifications', 'bulk_messages', 'reports', 'settings', 'permissions', 'activity_logs'
    ];

    const actions = ['view', 'create', 'update', 'delete', 'manage', 'export', 'send', 'approve', 'cancel'];

    const permissions = [];

    for (const resource of resources) {
        for (const action of actions) {
            // Only add relevant action/resource combinations
            if (isValidPermissionCombination(resource, action)) {
                permissions.push({
                    name: `${resource}:${action}`,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
                    resource,
                    action,
                });
            }
        }
    }

    return permissions;
};

/**
 * Check if a permission combination is valid
 */
const isValidPermissionCombination = (resource: string, action: string): boolean => {
    // Define which actions are valid for which resources
    const validCombinations: Record<string, string[]> = {
        dashboard: ['view'],
        bookings: ['view', 'create', 'update', 'delete', 'cancel', 'export'],
        routes: ['view', 'create', 'update', 'delete', 'manage'],
        trips: ['view', 'create', 'update', 'delete', 'manage'],
        vessels: ['view', 'create', 'update', 'delete', 'manage'],
        islands: ['view', 'create', 'update', 'delete', 'manage'],
        zones: ['view', 'create', 'update', 'delete', 'manage'],
        faq: ['view', 'create', 'update', 'delete', 'manage'],
        content: ['view', 'create', 'update', 'delete', 'manage'],
        users: ['view', 'create', 'update', 'delete', 'manage', 'export'],
        agents: ['view', 'manage'],
        passengers: ['view', 'manage'],
        wallets: ['view', 'manage'],
        payments: ['view', 'manage', 'export'],
        notifications: ['view', 'send', 'manage'],
        bulk_messages: ['view', 'send', 'manage'],
        reports: ['view', 'create', 'export'],
        settings: ['view', 'manage'],
        permissions: ['view', 'manage'],
        activity_logs: ['view', 'export'],
    };

    return validCombinations[resource]?.includes(action) || false;
}; 