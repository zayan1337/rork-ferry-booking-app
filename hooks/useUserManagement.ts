import { useCallback, useMemo } from 'react';
import { useUserStore } from '@/store/admin/userStore';
import { UserProfile, UserStats, UserFilters } from '@/types/userManagement';

// ============================================================================
// USER MANAGEMENT HOOK INTERFACE
// ============================================================================

export interface UseUserManagementReturn {
  // Data
  users: UserProfile[];
  currentUser: UserProfile | null;
  stats: UserStats;

  // Loading states
  loading: boolean;
  error: string | null;

  // Search and filtering
  searchQuery: string;
  filters: UserFilters;
  sortBy: 'name' | 'email' | 'role' | 'status' | 'created_at' | 'last_login';
  sortOrder: 'asc' | 'desc';

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;

  // Computed data
  filteredUsers: UserProfile[];
  sortedUsers: UserProfile[];
  paginatedUsers: UserProfile[];
  usersByRole: Record<string, UserProfile[]>;

  // Actions
  fetchAll: () => Promise<void>;
  fetchById: (id: string) => Promise<UserProfile | null>;
  create: (
    userData: Partial<UserProfile> & { password?: string }
  ) => Promise<UserProfile>;
  update: (id: string, updates: Partial<UserProfile>) => Promise<UserProfile>;
  delete: (id: string) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  updateRole: (id: string, role: string) => Promise<void>;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  clearFilters: () => void;
  setSortBy: (
    sortBy: 'name' | 'email' | 'role' | 'status' | 'created_at' | 'last_login'
  ) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  loadMore: () => void;

  // Stats actions
  fetchStats: () => Promise<void>;

  // Utility actions
  reset: () => void;

  // Performance helpers
  getRoleIcon: (role: string) => string;
  getStatusColor: (status: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

// ============================================================================
// USER MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useUserManagement = (
  // Optional parameters for pre-filtering
  initialSearchQuery: string = '',
  initialFilters: UserFilters = {},
  initialSortBy:
    | 'name'
    | 'email'
    | 'role'
    | 'status'
    | 'created_at'
    | 'last_login' = 'created_at',
  initialSortOrder: 'asc' | 'desc' = 'desc'
): UseUserManagementReturn => {
  // ========================================================================
  // STORE ACCESS
  // ========================================================================

  const userStore = useUserStore();

  const {
    users,
    currentUser,
    stats,
    loading,
    error,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
    totalItems,
    fetchAll,
    fetchById,
    create,
    update,
    delete: deleteUser,
    updateStatus,
    updateRole,
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    setCurrentPage,
    setItemsPerPage,
    loadMore,
    fetchStats,
    reset,
  } = userStore;

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  // Filtered users based on current search and filters
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.mobile_number?.toLowerCase().includes(query) ||
          user.id?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    return filtered;
  }, [users, searchQuery, filters]);

  // Sorted users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '').getTime();
          bValue = new Date(b.created_at || '').getTime();
          break;
        case 'last_login':
          aValue = new Date(a.last_login || '').getTime();
          bValue = new Date(b.last_login || '').getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredUsers, sortBy, sortOrder]);

  // Users grouped by role
  const usersByRole = useMemo(() => {
    const grouped: Record<string, UserProfile[]> = {};
    users.forEach(user => {
      const role = user.role || 'unknown';
      if (!grouped[role]) {
        grouped[role] = [];
      }
      grouped[role].push(user);
    });
    return grouped;
  }, [users]);

  // Paginated users for display (accumulated for infinite scroll)
  const paginatedUsers = useMemo(() => {
    const totalToShow = currentPage * itemsPerPage;
    return sortedUsers.slice(0, totalToShow);
  }, [sortedUsers, currentPage, itemsPerPage]);

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'agent':
        return '👤';
      case 'customer':
        return '👥';
      case 'passenger':
        return '🚶';
      case 'captain':
        return '⚓';
      default:
        return '👤';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return '#10B981'; // green
      case 'inactive':
        return '#6B7280'; // gray
      case 'suspended':
        return '#F59E0B'; // yellow
      case 'banned':
        return '#EF4444'; // red
      default:
        return '#6B7280'; // gray
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MVR',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // ========================================================================
  // RETURN OBJECT
  // ========================================================================

  return {
    // Data
    users,
    currentUser,
    stats,

    // Loading states
    loading,
    error,

    // Search and filtering
    searchQuery,
    filters,
    sortBy,
    sortOrder,

    // Pagination
    currentPage,
    itemsPerPage,
    totalItems,

    // Computed data
    filteredUsers,
    sortedUsers,
    paginatedUsers,
    usersByRole,

    // Actions
    fetchAll,
    fetchById,
    create,
    update,
    delete: deleteUser,
    updateStatus,
    updateRole,

    // Search and filter actions
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,

    // Pagination actions
    setCurrentPage,
    setItemsPerPage,
    loadMore,

    // Stats actions
    fetchStats,

    // Utility actions
    reset,

    // Performance helpers
    getRoleIcon,
    getStatusColor,
    formatCurrency,
    formatDate,
  };
};
