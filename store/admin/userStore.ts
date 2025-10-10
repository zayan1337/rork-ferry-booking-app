import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { UserProfile, UserStats, UserFilters } from '@/types/userManagement';

// ============================================================================
// USER STORE STATE INTERFACE
// ============================================================================

interface UserState {
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
}

// ============================================================================
// USER STORE IMPLEMENTATION
// ============================================================================

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  users: [],
  currentUser: null,
  stats: {
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    suspended_users: 0,
    banned_users: 0,
    admin_count: 0,
    agent_count: 0,
    customer_count: 0,
    passenger_count: 0,
    new_users_today: 0,
    new_users_this_week: 0,
    new_users_this_month: 0,
    verified_users: 0,
    unverified_users: 0,
    users_with_bookings: 0,
    average_user_age: 0,
    top_locations: [],
    user_growth_trend: [],
  },

  loading: false,
  error: null,

  searchQuery: '',
  filters: {},
  sortBy: 'created_at',
  sortOrder: 'desc',

  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  fetchAll: async () => {
    set({ loading: true, error: null });

    try {
      const {
        searchQuery,
        filters,
        sortBy,
        sortOrder,
        currentPage,
        itemsPerPage,
      } = get();

      // Fetch ALL users from user_profiles table without any filters
      // Filters will be applied in the component/hook layer
      const userQuery = supabase.from('user_profiles').select('*');

      const { data: userData, error: userError } = await userQuery;

      if (userError) throw userError;

      // Transform user_profiles data
      const transformedUsers: UserProfile[] = (userData || []).map(user => ({
        id: user.id,
        name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
        role: user.role as
          | 'admin'
          | 'agent'
          | 'customer'
          | 'passenger'
          | 'captain',
        status: user.is_active ? 'active' : 'inactive',
        email_verified: true,
        mobile_verified: true,
        date_of_birth: user.date_of_birth,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        total_bookings: 0, // Will be updated with booking stats
        total_spent: 0,
      }));

      // Always fetch passengers (no filtering at fetch level)
      let allUsers = [...transformedUsers];

      // Fetch ALL passengers from passengers table
      const passengerQuery = supabase.from('passengers').select(`
          id,
          passenger_name,
          passenger_contact_number,
          created_at,
          booking_id
        `);

      const { data: passengerData, error: passengerError } =
        await passengerQuery;

      if (passengerError) {
        console.error('Error fetching passengers:', passengerError);
      } else {
        // Transform passengers data
        const transformedPassengers: UserProfile[] = (passengerData || []).map(
          passenger => ({
            id: passenger.id,
            name: passenger.passenger_name,
            email: '', // Passengers don't have emails in the table
            mobile_number: passenger.passenger_contact_number,
            role: 'passenger' as const,
            status: 'active' as const,
            email_verified: false,
            mobile_verified: true,
            date_of_birth: '',
            created_at: passenger.created_at,
            updated_at: passenger.created_at,
            last_login: undefined,
            total_bookings: 1, // Each passenger record represents one booking
            total_spent: 0,
          })
        );

        allUsers = [...transformedUsers, ...transformedPassengers];
      }

      // Store ALL users without filtering
      // Filtering, sorting, and pagination will be handled in the hook layer
      set({
        users: allUsers,
        totalItems: allUsers.length,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        loading: false,
      });
    }
  },

  fetchById: async (id: string) => {
    set({ loading: true, error: null });

    try {
      // Try to fetch from all_users_view (includes both user_profiles and passengers)
      const { data, error } = await supabase
        .from('all_users_view')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        // User found in the view
        const user: UserProfile = {
          id: data.id,
          name: data.full_name,
          email: data.email || '',
          mobile_number: data.mobile_number,
          role: data.role as
            | 'admin'
            | 'agent'
            | 'customer'
            | 'passenger'
            | 'captain',
          status: data.status || 'active',
          email_verified: true,
          mobile_verified: true,
          date_of_birth: data.date_of_birth || '',
          created_at: data.created_at,
          updated_at: data.created_at, // Use created_at as updated_at for passengers
          last_login: data.last_login,
          total_bookings: data.total_bookings || 0,
          total_spent: data.total_spent || 0,
          total_trips: data.total_trips || 0,
          average_rating: data.average_rating || 0,
          wallet_balance: data.wallet_balance || 0,
          credit_score: data.credit_score || 0,
          loyalty_points: data.loyalty_points || 0,
        };

        set({ currentUser: user, loading: false });
        return user;
      }

      // If not found in the view
      set({ loading: false, currentUser: null });
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch user',
        loading: false,
      });
      return null;
    }
  },

  create: async (userData: Partial<UserProfile> & { password?: string }) => {
    set({ loading: true, error: null });

    try {
      // Create user in auth.users first
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: userData.email!,
          password: userData.password || 'tempPassword123!',
          email_confirm: true,
        });

      if (authError) throw authError;

      // Create user profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: userData.name,
          email: userData.email,
          mobile_number: userData.mobile_number,
          role: userData.role,
          is_active: userData.status === 'active',
          date_of_birth: userData.date_of_birth,
        })
        .select()
        .single();

      if (error) throw error;

      const newUser: UserProfile = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        mobile_number: data.mobile_number,
        role: data.role,
        status: data.is_active ? 'active' : 'inactive',
        email_verified: true,
        mobile_verified: true,
        date_of_birth: data.date_of_birth,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Refresh the users list
      await get().fetchAll();

      set({ loading: false });
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create user',
        loading: false,
      });
      throw error;
    }
  },

  update: async (id: string, updates: Partial<UserProfile>) => {
    set({ loading: true, error: null });

    try {
      // Prepare update data
      const updateData: any = {};

      if (updates.name) updateData.full_name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.mobile_number)
        updateData.mobile_number = updates.mobile_number;
      if (updates.role) updateData.role = updates.role;
      if (updates.date_of_birth)
        updateData.date_of_birth = updates.date_of_birth;

      // Handle status update using the new status field
      if (updates.status) {
        updateData.status = updates.status;
        updateData.is_active = updates.status === 'active';
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedUser: UserProfile = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        mobile_number: data.mobile_number,
        role: data.role,
        status: data.status || (data.is_active ? 'active' : 'inactive'),
        email_verified: true,
        mobile_verified: true,
        date_of_birth: data.date_of_birth,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Update in local state
      set(state => ({
        users: state.users.map(user => (user.id === id ? updatedUser : user)),
        currentUser:
          state.currentUser?.id === id ? updatedUser : state.currentUser,
        loading: false,
      }));

      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update user',
        loading: false,
      });
      throw error;
    }
  },

  delete: async (id: string) => {
    set({ loading: true, error: null });

    try {
      // Delete from user_profiles (cascade will handle auth.users)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      set(state => ({
        users: state.users.filter(user => user.id !== id),
        currentUser: state.currentUser?.id === id ? null : state.currentUser,
        loading: false,
      }));
    } catch (error) {
      console.error('Error deleting user:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete user',
        loading: false,
      });
      throw error;
    }
  },

  updateStatus: async (id: string, status: string) => {
    set({ loading: true, error: null });

    try {
      // Use the update_user_status function for both user_profiles and passengers
      const { error } = await supabase.rpc('update_user_status', {
        user_id: id,
        new_status: status,
        reason: null,
        admin_id: null,
      });

      if (error) throw error;

      // Update in local state
      set(state => ({
        users: state.users.map(user =>
          user.id === id
            ? {
                ...user,
                status: status as
                  | 'active'
                  | 'inactive'
                  | 'suspended'
                  | 'banned',
              }
            : user
        ),
        currentUser:
          state.currentUser?.id === id
            ? {
                ...state.currentUser,
                status: status as
                  | 'active'
                  | 'inactive'
                  | 'suspended'
                  | 'banned',
              }
            : state.currentUser,
        loading: false,
      }));
    } catch (error) {
      console.error('Error updating user status:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update user status',
        loading: false,
      });
      throw error;
    }
  },

  updateRole: async (id: string, role: string) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', id);

      if (error) throw error;

      // Update in local state
      set(state => ({
        users: state.users.map(user =>
          user.id === id
            ? {
                ...user,
                role: role as
                  | 'admin'
                  | 'agent'
                  | 'customer'
                  | 'passenger'
                  | 'captain',
              }
            : user
        ),
        currentUser:
          state.currentUser?.id === id
            ? {
                ...state.currentUser,
                role: role as
                  | 'admin'
                  | 'agent'
                  | 'customer'
                  | 'passenger'
                  | 'captain',
              }
            : state.currentUser,
        loading: false,
      }));
    } catch (error) {
      console.error('Error updating user role:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update user role',
        loading: false,
      });
      throw error;
    }
  },

  // ========================================================================
  // SEARCH AND FILTER ACTIONS
  // ========================================================================

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, currentPage: 1 });
    // No need to refetch - filtering is done client-side in the hook
  },

  setFilters: (filters: Partial<UserFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1,
    }));
    // No need to refetch - filtering is done client-side in the hook
  },

  clearFilters: () => {
    set({
      filters: {},
      searchQuery: '',
      currentPage: 1,
    });
    // No need to refetch - filtering is done client-side in the hook
  },

  setSortBy: (
    sortBy: 'name' | 'email' | 'role' | 'status' | 'created_at' | 'last_login'
  ) => {
    set({ sortBy });
    // No need to refetch - sorting is done client-side in the hook
  },

  setSortOrder: (order: 'asc' | 'desc') => {
    set({ sortOrder: order });
    // No need to refetch - sorting is done client-side in the hook
  },

  // ========================================================================
  // PAGINATION ACTIONS
  // ========================================================================

  setCurrentPage: (page: number) => {
    set({ currentPage: page });
    // No need to refetch - pagination is done client-side in the hook
  },

  setItemsPerPage: (items: number) => {
    set({ itemsPerPage: items, currentPage: 1 });
    // No need to refetch - pagination is done client-side in the hook
  },

  loadMore: () => {
    const { currentPage, totalItems, itemsPerPage } = get();
    const hasMore = currentPage * itemsPerPage < totalItems;

    if (hasMore) {
      set({ currentPage: currentPage + 1 });
    }
  },

  // ========================================================================
  // STATS ACTIONS
  // ========================================================================

  fetchStats: async () => {
    set({ loading: true, error: null });

    try {
      // Get ALL user_profiles counts (no pagination for stats)
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('role, is_active, created_at, date_of_birth');

      if (userError) throw userError;

      // Get passengers count
      const { count: passengerCount, error: passengerError } = await supabase
        .from('passengers')
        .select('*', { count: 'exact', head: true });

      if (passengerError) {
        console.error('Error fetching passenger count:', passengerError);
      }

      // Get users with bookings
      const { data: usersWithBookings, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id')
        .not('user_id', 'is', null);

      if (bookingError) {
        console.error('Error fetching users with bookings:', bookingError);
      }

      const uniqueUsersWithBookings = new Set(
        usersWithBookings?.map(b => b.user_id) || []
      ).size;

      // Calculate age statistics
      const validBirthDates = userProfiles?.filter(u => u.date_of_birth) || [];
      const totalAge = validBirthDates.reduce((sum, user) => {
        const birthDate = new Date(user.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          return sum + age - 1;
        }
        return sum + age;
      }, 0);

      const averageAge =
        validBirthDates.length > 0
          ? Math.round(totalAge / validBirthDates.length)
          : 0;

      // Calculate time-based statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newUsersToday =
        userProfiles?.filter(u => new Date(u.created_at) >= today).length || 0;

      const newUsersThisWeek =
        userProfiles?.filter(u => new Date(u.created_at) >= weekAgo).length ||
        0;

      const newUsersThisMonth =
        userProfiles?.filter(u => new Date(u.created_at) >= monthAgo).length ||
        0;

      // Calculate stats
      const stats: UserStats = {
        total_users: (userProfiles?.length || 0) + (passengerCount || 0),
        active_users: userProfiles?.filter(u => u.is_active).length || 0,
        inactive_users: userProfiles?.filter(u => !u.is_active).length || 0,
        suspended_users: 0, // Not implemented in current schema
        banned_users: 0, // Not implemented in current schema
        admin_count: userProfiles?.filter(u => u.role === 'admin').length || 0,
        agent_count: userProfiles?.filter(u => u.role === 'agent').length || 0,
        customer_count:
          userProfiles?.filter(u => u.role === 'customer').length || 0,
        passenger_count: passengerCount || 0,
        new_users_today: newUsersToday,
        new_users_this_week: newUsersThisWeek,
        new_users_this_month: newUsersThisMonth,
        verified_users: userProfiles?.length || 0, // All user_profiles users are considered verified
        unverified_users: passengerCount || 0, // Passengers are unverified
        users_with_bookings: uniqueUsersWithBookings,
        average_user_age: averageAge,
        top_locations: [],
        user_growth_trend: [],
      };

      set({ stats, loading: false });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to fetch user stats',
        loading: false,
      });
    }
  },

  // ========================================================================
  // UTILITY ACTIONS
  // ========================================================================

  reset: () => {
    set({
      users: [],
      currentUser: null,
      stats: {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        suspended_users: 0,
        banned_users: 0,
        admin_count: 0,
        agent_count: 0,
        customer_count: 0,
        passenger_count: 0,
        new_users_today: 0,
        new_users_this_week: 0,
        new_users_this_month: 0,
        verified_users: 0,
        unverified_users: 0,
        users_with_bookings: 0,
        average_user_age: 0,
        top_locations: [],
        user_growth_trend: [],
      },
      loading: false,
      error: null,
      searchQuery: '',
      filters: {},
      sortBy: 'created_at',
      sortOrder: 'desc',
      currentPage: 1,
      itemsPerPage: 20,
      totalItems: 0,
    });
  },
}));
