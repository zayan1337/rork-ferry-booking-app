import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';

// Import types from the management types file (following existing patterns)
type Permission = AdminManagement.Permission;
type PermissionCategory = AdminManagement.PermissionCategory;
type RoleTemplate = AdminManagement.RoleTemplate;
type UserPermission = AdminManagement.UserPermission;
type AdminUser = AdminManagement.AdminUser;
type PermissionFormData = AdminManagement.PermissionFormData;
type RoleTemplateFormData = AdminManagement.RoleTemplateFormData;
type PermissionStats = AdminManagement.PermissionStats;
type PermissionFilters = AdminManagement.PermissionFilters;
type PermissionStoreState = AdminManagement.PermissionStoreState;
type PermissionStoreActions = AdminManagement.PermissionStoreActions;
type LoadingStates = AdminManagement.LoadingStates;
type ValidationResult = AdminManagement.ValidationResult;

// ============================================================================
// PERMISSION STORE INTERFACES
// ============================================================================

interface PermissionStore
  extends PermissionStoreState,
    PermissionStoreActions {}

export const usePermissionStore = create<PermissionStore>()((set, get) => ({
  // Initial state
  data: [],
  currentItem: null,
  loading: {
    fetchAll: false,
    create: false,
    update: false,
    delete: false,
  },
  error: null,
  searchQuery: '',
  filters: {
    search: '',
    is_active: null,
  },
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    totalCategories: 0,
    totalRoleTemplates: 0,
    totalAdminUsers: 0,
    usersWithPermissions: 0,
    recentPermissionChanges: 0,
  },
  categories: [],
  roleTemplates: [],
  adminUsers: [],
  userPermissions: [],
  filteredPermissions: [],
  sortedPermissions: [],
  sortBy: 'name',
  sortOrder: 'asc',
  lastFetch: null,

  // Following the existing pattern from island store
  fetchAll: async () => {
    const currentState = get();

    // Prevent multiple simultaneous fetches
    if (currentState.loading.fetchAll) {
      return;
    }

    // Skip fetch if data already exists and is recent (less than 5 minutes old)
    const hasData =
      currentState.data.length > 0 && currentState.adminUsers.length > 0;
    const lastFetch = currentState.lastFetch;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    if (hasData && lastFetch && lastFetch > fiveMinutesAgo) {
      return;
    }

    set({ loading: { ...get().loading, fetchAll: true }, error: null });
    try {
      const [permissionsRes, categoriesRes, roleTemplatesRes, adminUsersRes] =
        await Promise.all([
          supabase
            .from('permissions_with_category')
            .select('*')
            .order('category_name')
            .order('name'),
          supabase
            .from('permission_categories_with_stats')
            .select('*')
            .order('order_index'),
          supabase
            .from('role_templates_with_stats')
            .select('*')
            .order('is_system_role', { ascending: false })
            .order('name'),
          supabase.from('admin_users_only').select('*').order('full_name'),
        ]);

      // Handle errors gracefully - if views don't exist, use fallback data
      if (permissionsRes.error) {
        console.warn(
          'Permission Store: permissions_with_category view not found, using fallback'
        );
      }
      if (categoriesRes.error) {
        console.warn(
          'Permission Store: permission_categories_with_stats view not found, using fallback'
        );
      }
      if (roleTemplatesRes.error) {
        console.warn(
          'Permission Store: role_templates_with_stats view not found, using fallback'
        );
      }
      if (adminUsersRes.error) {
        console.warn(
          'Permission Store: admin_users_only view not found, using fallback'
        );
      }

      // Create fallback admin user data if views don't exist
      let adminUsers = adminUsersRes.data || [];

      // If no admin users found from view, try to get from user_profiles directly
      if (adminUsers.length === 0 && adminUsersRes.error) {
        const { data: fallbackUsers, error: fallbackError } = await supabase
          .from('user_profiles')
          .select('*')
          .in('role', ['admin', 'super_admin']);

        if (!fallbackError && fallbackUsers) {
          adminUsers = fallbackUsers.map(user => ({
            ...user,
            is_super_admin: user.role === 'super_admin' || user.is_super_admin,
            direct_permissions: [],
            active_permission_count: 0,
          }));
        }
      }

      set({
        data: permissionsRes.data || [],
        categories: categoriesRes.data || [],
        roleTemplates: roleTemplatesRes.data || [],
        adminUsers,
        lastFetch: Date.now(),
        loading: { ...get().loading, fetchAll: false },
      });

      // Calculate stats
      get().calculateStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        loading: { ...get().loading, fetchAll: false },
      });
    }
  },

  fetchById: async (id: string) => {
    const items = get().data;
    const item = items.find(p => p.id === id);
    if (item) {
      set({ currentItem: item });
      return item;
    }
    return null;
  },

  create: async (data: PermissionFormData) => {
    set({ loading: { ...get().loading, create: true }, error: null });
    try {
      const { data: newItem, error } = await supabase
        .from('permissions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      set({ loading: { ...get().loading, create: false } });
      await get().fetchAll();
      return newItem;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create permission',
        loading: { ...get().loading, create: false },
      });
      throw error;
    }
  },

  update: async (id: string, data: Partial<PermissionFormData>) => {
    set({ loading: { ...get().loading, update: true }, error: null });
    try {
      const { data: updatedItem, error } = await supabase
        .from('permissions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set({ loading: { ...get().loading, update: false } });
      await get().fetchAll();
      return updatedItem;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update permission',
        loading: { ...get().loading, update: false },
      });
      throw error;
    }
  },

  delete: async (id: string) => {
    set({ loading: { ...get().loading, delete: true }, error: null });
    try {
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set({ loading: { ...get().loading, delete: false } });
      await get().fetchAll();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete permission',
        loading: { ...get().loading, delete: false },
      });
      throw error;
    }
  },

  setCurrentItem: (item: Permission | null) => set({ currentItem: item }),
  clearError: () => set({ error: null }),
  setError: (error: string) => set({ error }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  clearFilters: () => set({ filters: { search: '', is_active: null } }),
  refreshAll: async () => await get().fetchAll(),
  resetStore: () =>
    set({
      data: [],
      currentItem: null,
      loading: { fetchAll: false, create: false, update: false, delete: false },
      error: null,
      searchQuery: '',
      filters: { search: '', is_active: null },
    }),

  // Permission-specific actions
  fetchCategories: async () => await get().fetchAll(),
  fetchRoleTemplates: async () => await get().fetchAll(),
  fetchAdminUsers: async () => await get().fetchAll(),

  fetchUserPermissions: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*, permission:permissions(*)')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      set({ userPermissions: data || [] });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch user permissions',
      });
    }
  },

  grantPermission: async (
    userId: string,
    permissionId: string,
    grantedBy: string
  ) => {
    try {
      // First check if permission already exists
      const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('permission_id', permissionId)
        .single();

      let data, error;

      if (existing) {
        // Update existing permission
        const updateResult = await supabase
          .from('user_permissions')
          .update({
            is_active: true,
            granted_by: grantedBy,
            granted_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('permission_id', permissionId)
          .select();

        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Insert new permission
        const insertResult = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            permission_id: permissionId,
            granted_by: grantedBy,
            is_active: true,
          })
          .select();

        data = insertResult.data;
        error = insertResult.error;
      }

      if (error) {
        throw error;
      }

      // Wait a bit for database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      await Promise.all([
        get().fetchUserPermissions(userId),
        get().fetchAdminUsers(),
      ]);
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to grant permission',
      });
    }
  },

  revokePermission: async (userId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('permission_id', permissionId);

      if (error) throw error;
      await Promise.all([
        get().fetchUserPermissions(userId),
        get().fetchAdminUsers(),
      ]);
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to revoke permission',
      });
    }
  },

  updateUserPermissions: async (
    userId: string,
    permissionIds: string[],
    grantedBy: string
  ) => {
    try {
      // Deactivate existing permissions
      await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Insert new permissions
      if (permissionIds.length > 0) {
        const newPermissions = permissionIds.map(permissionId => ({
          user_id: userId,
          permission_id: permissionId,
          granted_by: grantedBy,
          is_active: true,
        }));

        const { error } = await supabase
          .from('user_permissions')
          .upsert(newPermissions);
        if (error) throw error;
      }

      await Promise.all([
        get().fetchUserPermissions(userId),
        get().fetchAdminUsers(),
      ]);
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update user permissions',
      });
    }
  },

  applyRoleTemplate: async (
    userId: string,
    roleTemplateId: string,
    grantedBy: string
  ) => {
    try {
      const template = get().roleTemplates.find(t => t.id === roleTemplateId);
      if (!template?.permission_ids) throw new Error('Template not found');

      await get().updateUserPermissions(
        userId,
        template.permission_ids,
        grantedBy
      );
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to apply role template',
      });
    }
  },

  createRoleTemplate: async (roleTemplate: RoleTemplateFormData) => {
    try {
      const { data: newTemplate, error: templateError } = await supabase
        .from('role_templates')
        .insert({
          name: roleTemplate.name,
          description: roleTemplate.description,
          is_system_role: roleTemplate.is_system_role,
          is_active: roleTemplate.is_active,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (roleTemplate.permission_ids.length > 0) {
        const templatePermissions = roleTemplate.permission_ids.map(
          permissionId => ({
            role_template_id: newTemplate.id,
            permission_id: permissionId,
          })
        );

        const { error: permError } = await supabase
          .from('role_template_permissions')
          .insert(templatePermissions);

        if (permError) throw permError;
      }

      await get().fetchAll();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create role template',
      });
    }
  },

  getUserPermissions: (userId: string): string[] => {
    const user = get().adminUsers.find(u => u.id === userId);
    return user?.direct_permissions || [];
  },

  hasPermission: (
    userId: string,
    resource: string,
    action: string
  ): boolean => {
    // First check if user is super admin
    const user = get().adminUsers.find(u => u.id === userId);
    if (user?.is_super_admin === true) {
      return true; // Super admins have all permissions
    }

    // Check specific permissions
    const userPermissions = get().getUserPermissions(userId);
    const permissions = get().data;

    return permissions.some(
      p =>
        userPermissions.includes(p.id) &&
        p.resource === resource &&
        p.action === action &&
        p.is_active
    );
  },

  setSortBy: (sortBy: 'name' | 'level' | 'resource' | 'created_at') =>
    set({ sortBy }),
  setSortOrder: (order: 'asc' | 'desc') => set({ sortOrder: order }),
  setFilters: (filters: Partial<PermissionFilters>) =>
    set({ filters: { ...get().filters, ...filters } }),

  // Search and filter functions
  searchItems: (items: Permission[], query: string) =>
    items.filter(
      item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    ),

  filterItems: (items: Permission[], filters: PermissionFilters) =>
    items.filter(item => {
      if (filters.is_active !== null && item.is_active !== filters.is_active)
        return false;
      if (filters.category_id && item.category_id !== filters.category_id)
        return false;
      if (filters.level && item.level !== filters.level) return false;
      if (filters.resource && item.resource !== filters.resource) return false;
      return true;
    }),

  sortItems: (items: Permission[], sortBy: string, order: 'asc' | 'desc') =>
    [...items].sort((a, b) => {
      const aVal = a[sortBy as keyof Permission];
      const bVal = b[sortBy as keyof Permission];
      if (aVal === undefined || bVal === undefined) return 0;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return order === 'asc' ? comparison : -comparison;
    }),

  calculateStats: () => {
    const permissions = get().data;
    const categories = get().categories;
    const roleTemplates = get().roleTemplates;
    const adminUsers = get().adminUsers;

    set({
      stats: {
        total: permissions.length,
        active: permissions.filter(p => p.is_active).length,
        inactive: permissions.filter(p => !p.is_active).length,
        totalCategories: categories.length,
        totalRoleTemplates: roleTemplates.length,
        totalAdminUsers: adminUsers.length,
        usersWithPermissions: adminUsers.filter(
          u => (u.direct_permissions?.length || 0) > 0
        ).length,
        recentPermissionChanges: 0, // This would need to be calculated from audit logs
      },
    });
  },
}));
