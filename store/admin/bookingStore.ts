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
      // Use the admin_bookings_view which has all the necessary joins
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

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      // Transform the data to match AdminBooking interface
      const transformedBookings: AdminBooking[] = (data || []).map(
        (booking: any) => ({
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
          // Data from the view
          user_name: booking.user_name,
          user_email: booking.user_email,
          user_mobile: booking.user_mobile,
          trip_travel_date: booking.trip_travel_date,
          trip_departure_time: booking.trip_departure_time,
          trip_base_fare: booking.trip_base_fare,
          vessel_name: booking.vessel_name,
          vessel_capacity: booking.vessel_capacity,
          route_name: booking.route_name,
          from_island_name: booking.from_island_name,
          to_island_name: booking.to_island_name,
          agent_name: booking.agent_name,
          agent_email: booking.agent_email,
          passenger_count: booking.passenger_count || 0,
          payment_status: booking.payment_status,
          payment_amount: booking.payment_amount,
          payment_method: booking.payment_method,
        })
      );

      const totalItems = count || 0;
      const hasMore = from + transformedBookings.length < totalItems;

      set({
        bookings: refresh
          ? transformedBookings
          : (() => {
              const existingBookings = get().bookings;
              const existingIds = new Set(existingBookings.map(b => b.id));
              const newBookings = transformedBookings.filter(
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
      // Get all bookings to calculate stats
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, total_fare, created_at')
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings for stats:', bookingsError);
        throw bookingsError;
      }

      const bookings = allBookings || [];

      // Calculate today's date
      const today = new Date().toISOString().split('T')[0];

      // Calculate statistics
      const totalBookings = bookings.length;
      const todayBookings = bookings.filter(b =>
        b.created_at?.startsWith(today)
      ).length;
      const totalRevenue = bookings.reduce(
        (sum, b) => sum + (b.total_fare || 0),
        0
      );
      const todayRevenue = bookings
        .filter(b => b.created_at?.startsWith(today))
        .reduce((sum, b) => sum + (b.total_fare || 0), 0);

      // Count by status
      const statusCounts = {
        confirmed: 0,
        reserved: 0,
        pending_payment: 0,
        cancelled: 0,
        completed: 0,
        checked_in: 0,
      };

      bookings.forEach(booking => {
        if (
          statusCounts[booking.status as keyof typeof statusCounts] !==
          undefined
        ) {
          statusCounts[booking.status as keyof typeof statusCounts]++;
        }
      });

      const confirmedCount = statusCounts.confirmed;
      const confirmedRate =
        totalBookings > 0
          ? ((confirmedCount / totalBookings) * 100).toFixed(1)
          : '0';

      // Calculate change percentages (simplified - you can enhance this)
      const todayBookingsChange = '0'; // TODO: Calculate actual change
      const todayRevenueChange = '0'; // TODO: Calculate actual change

      const stats: AdminBookingStats = {
        total_bookings: totalBookings,
        today_bookings: todayBookings,
        today_bookings_change: todayBookingsChange,
        today_revenue: todayRevenue,
        today_revenue_change: todayRevenueChange,
        total_revenue: totalRevenue,
        confirmed_count: confirmedCount,
        confirmed_rate: confirmedRate,
        reserved_count: statusCounts.reserved,
        cancelled_count: statusCounts.cancelled,
        completed_count: statusCounts.completed,
        pending_payment_count: statusCounts.pending_payment,
        checked_in_count: statusCounts.checked_in,
      };

      set({ stats, statsLoading: false });
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
      // Get current authenticated admin user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Admin must be authenticated to create booking');
      }

      // Create the booking first
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: data.user_id, // Use the selected customer's user ID
          trip_id: data.trip_id,
          is_round_trip: data.is_round_trip,
          return_booking_id: data.return_booking_id,
          total_fare: data.total_fare,
          agent_id: data.agent_id,
          agent_client_id: data.agent_client_id,
          payment_method_type: data.payment_method_type,
          status: 'confirmed', // Admin bookings are confirmed by default
          check_in_status: false,
        })
        .select('id, booking_number')
        .single();

      if (error) throw error;

      // Generate QR code URL using the auto-generated booking number
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Booking: ${booking.booking_number}`)}`;

      // Update booking with QR code URL
      const { error: qrUpdateError } = await supabase
        .from('bookings')
        .update({ qr_code_url: qrCodeUrl })
        .eq('id', booking.id);

      if (qrUpdateError) {
        console.error('Failed to update QR code URL:', qrUpdateError);
      }

      // Create passengers if provided
      if (data.passengers.length > 0 && booking) {
        const passengers = data.passengers.map(passenger => ({
          booking_id: booking.id,
          passenger_name: passenger.passenger_name,
          passenger_contact_number: passenger.passenger_contact_number,
          special_assistance_request: passenger.special_assistance_request,
          seat_id: passenger.seat_id || null,
        }));

        const { error: passengerError } = await supabase
          .from('passengers')
          .insert(passengers);

        if (passengerError) throw passengerError;
      }

      // Reserve seats if seat_ids are provided
      if (data.passengers.length > 0 && booking) {
        const seatReservations = data.passengers
          .filter(passenger => passenger.seat_id)
          .map(passenger => ({
            trip_id: data.trip_id,
            seat_id: passenger.seat_id!,
            booking_id: booking.id,
            is_available: false,
            is_reserved: false,
            // Clear temporary reservation fields
            user_id: null,
            session_id: null,
            temp_reservation_expiry: null,
            last_activity: new Date().toISOString(),
          }));

        if (seatReservations.length > 0) {
          const { error: seatError } = await supabase
            .from('seat_reservations')
            .upsert(seatReservations, { onConflict: 'trip_id,seat_id' });

          if (seatError) {
            console.warn('Failed to reserve seats:', seatError);
          }
        }
      }

      // Create payment record
      const { error: paymentError } = await supabase.from('payments').insert({
        booking_id: booking.id,
        payment_method: data.payment_method_type as any,
        amount: data.total_fare,
        status: 'completed', // Admin bookings are paid by default
      });

      if (paymentError) {
        console.warn('Failed to create payment record:', paymentError);
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
      // Filter out fields that don't exist in the bookings table
      // These fields come from joins in views (like trip_travel_date, from_island_name, etc.)
      const validBookingFields: (keyof AdminBooking)[] = [
        'user_id',
        'trip_id',
        'is_round_trip',
        'return_booking_id',
        'status',
        'total_fare',
        'qr_code_url',
        'check_in_status',
        'checked_in_at',
        'checked_in_by',
        'agent_id',
        'agent_client_id',
        'payment_method_type',
        'round_trip_group_id',
      ];

      const filteredUpdates: Partial<AdminBooking> = {};
      for (const key of validBookingFields) {
        const value = updates[key];
        if (value !== undefined) {
          (
            filteredUpdates as Record<
              keyof AdminBooking,
              AdminBooking[keyof AdminBooking]
            >
          )[key] = value;
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(filteredUpdates)
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

    if (status === 'all') return stats.total_bookings;

    // Use stats counts instead of filtering paginated bookings
    switch (status) {
      case 'reserved':
        return stats.reserved_count;
      case 'pending_payment':
        return stats.pending_payment_count;
      case 'confirmed':
        return stats.confirmed_count;
      case 'checked_in':
        return stats.checked_in_count;
      case 'completed':
        return stats.completed_count;
      case 'cancelled':
        return stats.cancelled_count;
      default:
        return 0;
    }
  },
}));
