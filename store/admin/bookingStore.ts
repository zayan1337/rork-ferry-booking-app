import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import {
  AdminBooking,
  AdminBookingStats,
  AdminBookingFilters,
  AdminBookingFormData,
  BookingStatus,
} from '@/types/admin/management';

interface AdminBookingState {
  // Data
  bookings: AdminBooking[];
  stats: AdminBookingStats;
  filters: AdminBookingFilters;

  // Loading states
  loading: boolean;
  statsLoading: boolean;
  updating: boolean;
  hasFetched: boolean;

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  hasMore: boolean;

  // Error handling
  error: string | null;

  // Actions
  fetchBookings: (refresh?: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchBooking: (id: string) => Promise<AdminBooking | null>;
  createBooking: (data: AdminBookingFormData) => Promise<string>;
  updateBooking: (id: string, updates: Partial<AdminBooking>) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: BookingStatus) => Promise<void>;

  // Filter and search
  setFilters: (filters: Partial<AdminBookingFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: AdminBookingFilters['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Selection
  toggleBookingSelection: (id: string) => void;
  selectAllBookings: () => void;
  clearSelection: () => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  loadMore: () => Promise<void>;

  // Utility
  getFilteredBookings: () => AdminBooking[];
  getStatusCount: (status: BookingStatus | 'all') => number;
}

const initialFilters: AdminBookingFilters = {
  searchQuery: '',
  filterStatus: 'all',
  filterAgent: 'all',
  filterRoute: 'all',
  filterDateRange: {
    start: null,
    end: null,
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
  selectedBookings: [],
};

const initialStats: AdminBookingStats = {
  total_bookings: 0,
  today_bookings: 0,
  today_bookings_change: '0',
  today_revenue: 0,
  today_revenue_change: '0',
  total_revenue: 0,
  confirmed_count: 0,
  confirmed_rate: '0',
  reserved_count: 0,
  cancelled_count: 0,
  completed_count: 0,
  pending_payment_count: 0,
  checked_in_count: 0,
};

export const useAdminBookingStore = create<AdminBookingState>((set, get) => ({
  // Initial state
  bookings: [],
  stats: initialStats,
  filters: initialFilters,
  loading: false,
  statsLoading: false,
  updating: false,
  hasFetched: false,
  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,
  hasMore: true,
  error: null,

  // Fetch bookings from admin_bookings_view
  fetchBookings: async (refresh = false) => {
    const { filters, currentPage, itemsPerPage } = get();

    // If refreshing, reset to page 1 and clear existing bookings
    if (refresh) {
      set({
        loading: true,
        error: null,
        currentPage: 1,
        bookings: [],
      });
    } else {
      set({ loading: true, error: null });
    }

    try {
      // First, let's test if we can connect to the database and get any bookings
      const { count: totalBookings, error: countError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // If there are no bookings at all, return early
      if (totalBookings === 0) {
        set({
          bookings: [],
          totalItems: 0,
          hasMore: false,
          currentPage: 1,
          loading: false,
          hasFetched: true,
        });
        return;
      }

      // Try to fetch from admin_bookings_view first, fallback to bookings table
      let query = supabase
        .from('admin_bookings_view')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.searchQuery) {
        query = query.or(
          `user_name.ilike.%${filters.searchQuery}%,` +
            `user_email.ilike.%${filters.searchQuery}%,` +
            `booking_number.ilike.%${filters.searchQuery}%,` +
            `route_name.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters.filterStatus !== 'all') {
        query = query.eq('status', filters.filterStatus);
      }

      if (filters.filterAgent !== 'all') {
        query = query.eq('agent_id', filters.filterAgent);
      }

      if (filters.filterRoute !== 'all') {
        query = query.eq('route_name', filters.filterRoute);
      }

      if (filters.filterDateRange.start) {
        query = query.gte('created_at', filters.filterDateRange.start);
      }

      if (filters.filterDateRange.end) {
        query = query.lte('created_at', filters.filterDateRange.end);
      }

      // Apply sorting
      const sortColumn =
        filters.sortBy === 'created_at' ? 'created_at' : filters.sortBy;
      query = query.order(sortColumn, {
        ascending: filters.sortOrder === 'asc',
      });

      // Apply pagination
      const from = refresh ? 0 : (get().currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      let { data, error, count } = await query;

      // If admin_bookings_view doesn't exist, fallback to bookings table
      if (
        error &&
        error.message?.includes('relation "admin_bookings_view" does not exist')
      ) {
        // Fallback query to bookings table with basic joins
        const fallbackQuery = supabase.from('bookings').select(
          `
            *,
            user_profiles!bookings_user_id_fkey (
              full_name,
              email,
              mobile
            ),
            trips!bookings_trip_id_fkey (
              travel_date,
              departure_time,
              base_fare,
              vessels (
                name,
                capacity
              ),
              routes (
                name,
                from_island:islands!routes_from_island_id_fkey (name),
                to_island:islands!routes_to_island_id_fkey (name)
              )
            ),
            agent_profiles!bookings_agent_id_fkey (
              full_name,
              email
            ),
            passengers (count)
          `,
          { count: 'exact' }
        );

        // Apply basic filters for fallback
        if (filters.searchQuery) {
          fallbackQuery.or(
            `user_profiles.full_name.ilike.%${filters.searchQuery}%,` +
              `user_profiles.email.ilike.%${filters.searchQuery}%,` +
              `booking_number.ilike.%${filters.searchQuery}%`
          );
        }

        if (filters.filterStatus !== 'all') {
          fallbackQuery.eq('status', filters.filterStatus);
        }

        // Apply sorting and pagination
        const sortColumn =
          filters.sortBy === 'created_at' ? 'created_at' : filters.sortBy;
        fallbackQuery.order(sortColumn, {
          ascending: filters.sortOrder === 'asc',
        });
        const fallbackFrom = refresh
          ? 0
          : (get().currentPage - 1) * itemsPerPage;
        const fallbackTo = fallbackFrom + itemsPerPage - 1;
        fallbackQuery.range(fallbackFrom, fallbackTo);

        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
        count = fallbackResult.count;

        // Transform the data to match AdminBooking interface
        if (data) {
          data = data.map((booking: any) => ({
            id: booking.id,
            booking_number: booking.booking_number,
            user_id: booking.user_id,
            trip_id: booking.trip_id,
            is_round_trip: booking.is_round_trip,
            return_booking_id: booking.return_booking_id,
            status: booking.status,
            total_fare: booking.total_fare,
            qr_code_url: booking.qr_code_url,
            check_in_status: booking.check_in_status,
            agent_id: booking.agent_id,
            agent_client_id: booking.agent_client_id,
            payment_method_type: booking.payment_method_type,
            round_trip_group_id: booking.round_trip_group_id,
            created_at: booking.created_at,
            updated_at: booking.updated_at,
            // Joined data
            user_name: booking.user_profiles?.full_name,
            user_email: booking.user_profiles?.email,
            user_mobile: booking.user_profiles?.mobile,
            trip_travel_date: booking.trips?.travel_date,
            trip_departure_time: booking.trips?.departure_time,
            trip_base_fare: booking.trips?.base_fare,
            vessel_name: booking.trips?.vessels?.name,
            vessel_capacity: booking.trips?.vessels?.capacity,
            route_name: booking.trips?.routes?.name,
            from_island_name: booking.trips?.routes?.from_island?.name,
            to_island_name: booking.trips?.routes?.to_island?.name,
            agent_name: booking.agent_profiles?.full_name,
            agent_email: booking.agent_profiles?.email,
            passenger_count: booking.passengers?.[0]?.count || 0,
            payment_status: booking.payment_status,
            payment_amount: booking.payment_amount,
            payment_method: booking.payment_method,
          }));
        }
      }

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const bookings = data || [];
      const totalItems = count || 0;
      const hasMore = from + bookings.length < totalItems;

      // Debug: Check for duplicate IDs in the fetched data
      const bookingIds = bookings.map(b => b.id);
      const uniqueIds = new Set(bookingIds);
      if (bookingIds.length !== uniqueIds.size) {
        console.warn(
          'Duplicate booking IDs detected in fetched data:',
          bookingIds.filter((id, index) => bookingIds.indexOf(id) !== index)
        );
      }

      set({
        bookings: refresh
          ? bookings
          : (() => {
              const existingBookings = get().bookings;
              const existingIds = new Set(existingBookings.map(b => b.id));
              const newBookings = bookings.filter(
                newBooking => !existingIds.has(newBooking.id)
              );
              return [...existingBookings, ...newBookings];
            })(),
        totalItems,
        hasMore,
        currentPage: refresh ? 1 : currentPage,
        loading: false,
        hasFetched: true,
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to fetch bookings',
        loading: false,
      });
    }
  },

  // Fetch booking statistics
  fetchStats: async () => {
    set({ statsLoading: true });

    try {
      // First, let's check if there are any bookings at all
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Try to fetch from admin_dashboard_stats view
      const { data, error } = await supabase
        .from('admin_dashboard_stats')
        .select('*')
        .single();

      if (error) {
        // Calculate stats manually from bookings table
        const today = new Date().toISOString().split('T')[0];
        const { count: todayBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today);

        const { data: statusCounts } = await supabase
          .from('bookings')
          .select('status, total_fare, created_at');

        const confirmedCount =
          statusCounts?.filter(b => b.status === 'confirmed').length || 0;
        const cancelledCount =
          statusCounts?.filter(b => b.status === 'cancelled').length || 0;
        const pendingPaymentCount =
          statusCounts?.filter(b => b.status === 'pending_payment').length || 0;
        const totalRevenue =
          statusCounts?.reduce((sum, b) => sum + (b.total_fare || 0), 0) || 0;
        const todayRevenue =
          statusCounts
            ?.filter(b => b.created_at?.startsWith(today))
            .reduce((sum, b) => sum + (b.total_fare || 0), 0) || 0;

        const stats: AdminBookingStats = {
          total_bookings: totalBookings || 0,
          today_bookings: todayBookings || 0,
          today_bookings_change: '0',
          today_revenue: todayRevenue,
          today_revenue_change: '0',
          total_revenue: totalRevenue,
          confirmed_count: confirmedCount,
          confirmed_rate:
            (totalBookings || 0) > 0
              ? ((confirmedCount / (totalBookings || 0)) * 100).toFixed(1)
              : '0',
          reserved_count:
            statusCounts?.filter(b => b.status === 'reserved').length || 0,
          cancelled_count: cancelledCount,
          completed_count:
            statusCounts?.filter(b => b.status === 'completed').length || 0,
          pending_payment_count: pendingPaymentCount,
          checked_in_count:
            statusCounts?.filter(b => b.status === 'checked_in').length || 0,
        };

        set({ stats, statsLoading: false });
      } else if (data) {
        const stats: AdminBookingStats = {
          total_bookings: data.total_bookings || 0,
          today_bookings: data.today_bookings || 0,
          today_bookings_change: '0',
          today_revenue: Number(data.today_revenue) || 0,
          today_revenue_change: '0',
          total_revenue: Number(data.total_revenue) || 0,
          confirmed_count: data.confirmed_count || 0,
          confirmed_rate:
            data.total_bookings > 0
              ? ((data.confirmed_count / data.total_bookings) * 100).toFixed(1)
              : '0',
          reserved_count: data.reserved_count || 0,
          cancelled_count: data.cancelled_count || 0,
          completed_count: data.completed_count || 0,
          pending_payment_count: data.pending_payment_count || 0,
          checked_in_count: data.checked_in_count || 0,
        };

        set({ stats, statsLoading: false });
      }
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      set({ statsLoading: false });
    }
  },

  // Fetch single booking
  fetchBooking: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_bookings_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching booking:', error);
      return null;
    }
  },

  // Create new booking
  createBooking: async (data: AdminBookingFormData) => {
    set({ updating: true, error: null });

    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: data.user_id,
          trip_id: data.trip_id,
          is_round_trip: data.is_round_trip,
          return_booking_id: data.return_booking_id,
          total_fare: data.total_fare,
          agent_id: data.agent_id,
          agent_client_id: data.agent_client_id,
          payment_method_type: data.payment_method_type,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create passengers if provided
      if (data.passengers.length > 0 && booking) {
        const passengers = data.passengers.map(passenger => ({
          booking_id: booking.id,
          passenger_name: passenger.passenger_name,
          passenger_contact_number: passenger.passenger_contact_number,
          special_assistance_request: passenger.special_assistance_request,
        }));

        const { error: passengerError } = await supabase
          .from('passengers')
          .insert(passengers);

        if (passengerError) throw passengerError;
      }

      set({ updating: false });
      return booking.id;
    } catch (error) {
      console.error('Error creating booking:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to create booking',
        updating: false,
      });
      throw error;
    }
  },

  // Update booking
  updateBooking: async (id: string, updates: Partial<AdminBooking>) => {
    set({ updating: true, error: null });

    try {
      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Refresh bookings list
      await get().fetchBookings(true);
      set({ updating: false });
    } catch (error) {
      console.error('Error updating booking:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update booking',
        updating: false,
      });
      throw error;
    }
  },

  // Delete booking
  deleteBooking: async (id: string) => {
    set({ updating: true, error: null });

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id);

      if (error) throw error;

      // Refresh bookings list
      await get().fetchBookings(true);
      set({ updating: false });
    } catch (error) {
      console.error('Error deleting booking:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to delete booking',
        updating: false,
      });
      throw error;
    }
  },

  // Update booking status
  updateBookingStatus: async (id: string, status: BookingStatus) => {
    return get().updateBooking(id, { status });
  },

  // Bulk update status
  bulkUpdateStatus: async (ids: string[], status: BookingStatus) => {
    set({ updating: true, error: null });

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .in('id', ids);

      if (error) throw error;

      // Refresh bookings list
      await get().fetchBookings(true);
      set({ updating: false });
    } catch (error) {
      console.error('Error bulk updating bookings:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to update bookings',
        updating: false,
      });
      throw error;
    }
  },

  // Filter and search actions
  setFilters: (filters: Partial<AdminBookingFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1, // Reset to first page when filters change
    }));
    get().fetchBookings(true);
  },

  clearFilters: () => {
    set({ filters: initialFilters, currentPage: 1 });
    get().fetchBookings(true);
  },

  setSearchQuery: (query: string) => {
    get().setFilters({ searchQuery: query });
  },

  setSortBy: (sortBy: AdminBookingFilters['sortBy']) => {
    get().setFilters({ sortBy });
  },

  setSortOrder: (order: 'asc' | 'desc') => {
    get().setFilters({ sortOrder: order });
  },

  // Selection actions
  toggleBookingSelection: (id: string) => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedBookings: state.filters.selectedBookings.includes(id)
          ? state.filters.selectedBookings.filter(bookingId => bookingId !== id)
          : [...state.filters.selectedBookings, id],
      },
    }));
  },

  selectAllBookings: () => {
    const { bookings, filters } = get();
    const allIds = bookings.map(booking => booking.id);
    const isAllSelected = filters.selectedBookings.length === allIds.length;

    set(state => ({
      filters: {
        ...state.filters,
        selectedBookings: isAllSelected ? [] : allIds,
      },
    }));
  },

  clearSelection: () => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedBookings: [],
      },
    }));
  },

  // Pagination actions
  setCurrentPage: (page: number) => {
    set({ currentPage: page });
  },

  setItemsPerPage: (items: number) => {
    set({ itemsPerPage: items, currentPage: 1 });
    get().fetchBookings(true);
  },

  loadMore: async () => {
    const { hasMore, loading } = get();
    if (!hasMore || loading) return;

    set(state => ({ currentPage: state.currentPage + 1 }));
    await get().fetchBookings();
  },

  // Utility functions
  getFilteredBookings: () => {
    return get().bookings;
  },

  getStatusCount: (status: BookingStatus | 'all') => {
    const { stats } = get();
    if (status === 'all') return stats.total_bookings || 0;

    switch (status) {
      case 'reserved':
        return stats.reserved_count || 0;
      case 'pending_payment':
        return stats.pending_payment_count || 0;
      case 'confirmed':
        return stats.confirmed_count || 0;
      case 'checked_in':
        return stats.checked_in_count || 0;
      case 'completed':
        return stats.completed_count || 0;
      case 'cancelled':
        return stats.cancelled_count || 0;
      default:
        return 0;
    }
  },
}));
