import { create } from 'zustand';
import { AdminUser, AdminUserFilters, AdminPagination } from '@/types/admin';

interface AdminUsersState {
    users: AdminUser[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    filters: AdminUserFilters;
    selectedUsers: string[];

    // Actions
    setUsers: (users: AdminUser[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPagination: (pagination: AdminPagination) => void;
    setFilters: (filters: AdminUserFilters) => void;
    updateUser: (userId: string, updates: Partial<AdminUser>) => void;
    removeUser: (userId: string) => void;
    addUser: (user: AdminUser) => void;
    setSelectedUsers: (userIds: string[]) => void;
    toggleUserSelection: (userId: string) => void;
    selectAllUsers: () => void;
    clearUserSelection: () => void;
    clearState: () => void;

    // Filter helpers
    getActiveUsers: () => AdminUser[];
    getInactiveUsers: () => AdminUser[];
    getUsersByRole: (role: AdminUser['role']) => AdminUser[];
}

const initialState = {
    users: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0
    },
    filters: {},
    selectedUsers: []
};

export const useAdminUsersStore = create<AdminUsersState>((set, get) => ({
    ...initialState,

    setUsers: (users) => set({ users }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    setPagination: (pagination) => set({ pagination }),

    setFilters: (filters) => set({ filters }),

    updateUser: (userId, updates) => set((state) => ({
        users: state.users.map(user =>
            user.id === userId ? { ...user, ...updates } : user
        )
    })),

    removeUser: (userId) => set((state) => ({
        users: state.users.filter(user => user.id !== userId),
        selectedUsers: state.selectedUsers.filter(id => id !== userId),
        pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1)
        }
    })),

    addUser: (user) => set((state) => ({
        users: [user, ...state.users],
        pagination: {
            ...state.pagination,
            total: state.pagination.total + 1
        }
    })),

    setSelectedUsers: (userIds) => set({ selectedUsers: userIds }),

    toggleUserSelection: (userId) => set((state) => {
        const isSelected = state.selectedUsers.includes(userId);
        return {
            selectedUsers: isSelected
                ? state.selectedUsers.filter(id => id !== userId)
                : [...state.selectedUsers, userId]
        };
    }),

    selectAllUsers: () => set((state) => ({
        selectedUsers: state.users.map(user => user.id)
    })),

    clearUserSelection: () => set({ selectedUsers: [] }),

    clearState: () => set(initialState),

    // Filter helpers
    getActiveUsers: () => get().users.filter(user => user.is_active),

    getInactiveUsers: () => get().users.filter(user => !user.is_active),

    getUsersByRole: (role) => get().users.filter(user => user.role === role)
})); 