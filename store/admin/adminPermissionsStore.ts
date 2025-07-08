import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import type {
    Permission,
    UserPermission,
    RolePermission,
    UserWithPermissions,
    PermissionGroup,
    EnhancedUserProfile
} from '@/types/permissions';

interface PermissionState {
    // Data
    permissions: Permission[];
    userPermissions: UserPermission[];
    rolePermissions: RolePermission[];
    adminUsers: EnhancedUserProfile[];

    // UI State
    loading: {
        permissions: boolean;
        userPermissions: boolean;
        saving: boolean;
        users: boolean;
    };
    error: string | null;

    // Actions
    loadPermissions: () => Promise<void>;
    loadUserPermissions: (userId: string) => Promise<UserWithPermissions | null>;
    loadAdminUsers: () => Promise<void>;
    grantUserPermissions: (userId: string, permissionIds: string[], grantedBy: string) => Promise<void>;
    revokeUserPermissions: (userId: string, permissionIds: string[]) => Promise<void>;
    toggleSuperAdmin: (userId: string, isSuperAdmin: boolean) => Promise<void>;
    updateUserRole: (userId: string, role: 'admin' | 'agent') => Promise<void>;
    setError: (error: string | null) => void;
    clearError: () => void;
}

export const useAdminPermissionsStore = create<PermissionState>()(
    persist(
        (set, get) => ({
            // Initial state
            permissions: [],
            userPermissions: [],
            rolePermissions: [],
            adminUsers: [],

            loading: {
                permissions: false,
                userPermissions: false,
                saving: false,
                users: false,
            },
            error: null,

            setError: (error) => set({ error }),
            clearError: () => set({ error: null }),

            // Load all available permissions
            loadPermissions: async () => {
                set(state => ({
                    loading: { ...state.loading, permissions: true },
                    error: null
                }));

                try {
                    const { data, error } = await supabase
                        .from('permissions')
                        .select('*')
                        .order('resource, action');

                    if (error) throw error;

                    set(state => ({
                        permissions: data || [],
                        loading: { ...state.loading, permissions: false }
                    }));
                } catch (error) {
                    console.error('Error loading permissions:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to load permissions',
                        loading: { ...state.loading, permissions: false }
                    }));
                }
            },

            // Load user permissions with full details
            loadUserPermissions: async (userId: string) => {
                set(state => ({
                    loading: { ...state.loading, userPermissions: true },
                    error: null
                }));

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

                    const userWithPermissions: UserWithPermissions = {
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

                    set(state => ({
                        loading: { ...state.loading, userPermissions: false }
                    }));

                    return userWithPermissions;
                } catch (error) {
                    console.error('Error loading user permissions:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to load user permissions',
                        loading: { ...state.loading, userPermissions: false }
                    }));
                    return null;
                }
            },

            // Load admin users
            loadAdminUsers: async () => {
                set(state => ({
                    loading: { ...state.loading, users: true },
                    error: null
                }));

                try {
                    const { data, error } = await supabase
                        .from('admin_users_view')
                        .select('*')
                        .in('role', ['admin', 'agent'])
                        .eq('is_active', true)
                        .order('full_name');

                    if (error) throw error;

                    set(state => ({
                        adminUsers: data || [],
                        loading: { ...state.loading, users: false }
                    }));
                } catch (error) {
                    console.error('Error loading admin users:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to load admin users',
                        loading: { ...state.loading, users: false }
                    }));
                }
            },

            // Grant permissions to user
            grantUserPermissions: async (userId: string, permissionIds: string[], grantedBy: string) => {
                set(state => ({
                    loading: { ...state.loading, saving: true },
                    error: null
                }));

                try {
                    const permissionRecords = permissionIds.map(permissionId => ({
                        user_id: userId,
                        permission_id: permissionId,
                        granted_by: grantedBy,
                        is_active: true
                    }));

                    const { error } = await supabase
                        .from('user_permissions')
                        .upsert(permissionRecords, {
                            onConflict: 'user_id,permission_id',
                            ignoreDuplicates: false
                        });

                    if (error) throw error;

                    // Log activity
                    await supabase
                        .from('activity_logs')
                        .insert({
                            user_id: grantedBy,
                            action: 'Permissions Granted',
                            details: `Granted ${permissionIds.length} permissions to user ${userId}`,
                        });

                    set(state => ({
                        loading: { ...state.loading, saving: false }
                    }));
                } catch (error) {
                    console.error('Error granting permissions:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to grant permissions',
                        loading: { ...state.loading, saving: false }
                    }));
                    throw error;
                }
            },

            // Revoke permissions from user
            revokeUserPermissions: async (userId: string, permissionIds: string[]) => {
                set(state => ({
                    loading: { ...state.loading, saving: true },
                    error: null
                }));

                try {
                    const { error } = await supabase
                        .from('user_permissions')
                        .delete()
                        .eq('user_id', userId)
                        .in('permission_id', permissionIds);

                    if (error) throw error;

                    set(state => ({
                        loading: { ...state.loading, saving: false }
                    }));
                } catch (error) {
                    console.error('Error revoking permissions:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to revoke permissions',
                        loading: { ...state.loading, saving: false }
                    }));
                    throw error;
                }
            },

            // Toggle super admin status
            toggleSuperAdmin: async (userId: string, isSuperAdmin: boolean) => {
                set(state => ({
                    loading: { ...state.loading, saving: true },
                    error: null
                }));

                try {
                    const { error } = await supabase
                        .from('user_profiles')
                        .update({ is_super_admin: isSuperAdmin })
                        .eq('id', userId);

                    if (error) throw error;

                    // Update local state
                    set(state => ({
                        adminUsers: state.adminUsers.map(user =>
                            user.id === userId
                                ? { ...user, is_super_admin: isSuperAdmin }
                                : user
                        ),
                        loading: { ...state.loading, saving: false }
                    }));
                } catch (error) {
                    console.error('Error updating super admin status:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to update super admin status',
                        loading: { ...state.loading, saving: false }
                    }));
                    throw error;
                }
            },

            // Update user role
            updateUserRole: async (userId: string, role: 'admin' | 'agent') => {
                set(state => ({
                    loading: { ...state.loading, saving: true },
                    error: null
                }));

                try {
                    const { error } = await supabase
                        .from('user_profiles')
                        .update({ role })
                        .eq('id', userId);

                    if (error) throw error;

                    // Update local state
                    set(state => ({
                        adminUsers: state.adminUsers.map(user =>
                            user.id === userId
                                ? { ...user, role }
                                : user
                        ),
                        loading: { ...state.loading, saving: false }
                    }));
                } catch (error) {
                    console.error('Error updating user role:', error);
                    set(state => ({
                        error: error instanceof Error ? error.message : 'Failed to update user role',
                        loading: { ...state.loading, saving: false }
                    }));
                    throw error;
                }
            },
        }),
        {
            name: 'admin-permissions-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                // Only persist essential data, not loading states
                permissions: state.permissions,
                adminUsers: state.adminUsers,
            }),
        }
    )
); 