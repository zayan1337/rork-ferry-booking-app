import { useCallback, useMemo, useState } from 'react';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import {
  AdminBooking,
  BookingStatus,
  AdminBookingFilters,
} from '@/types/admin/management';
import {
  formatBookingStatus,
  getBookingStatusColor,
  getBookingStatusIcon,
  formatPaymentStatus,
  getPaymentStatusColor,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  isBookingExpired,
  isBookingActive,
  formatRouteName,
  formatPassengerCount,
  formatBookingNumber,
  validateBookingData,
  sortBookingsByPriority,
  searchBookings,
} from '@/utils/admin/bookingManagementUtils';

// ============================================================================
// BOOKING MANAGEMENT HOOK INTERFACE
// ============================================================================

export interface UseAdminBookingManagementReturn {
  // Data
  bookings: AdminBooking[];
  stats: {
    totalBookings: number;
    todayBookings: number;
    todayBookingsChange: string;
    todayRevenue: number;
    todayRevenueChange: string;
    totalRevenue: number;
    confirmedCount: number;
    confirmedRate: string;
    reservedCount: number;
    cancelledCount: number;
    completedCount: number;
  };
  filters: AdminBookingFilters;

  // Loading states
  loading: boolean;
  statsLoading: boolean;
  updating: boolean;
  refreshing: boolean;
  hasFetched: boolean;

  // Search and filtering
  searchQuery: string;
  sortBy:
    | 'created_at'
    | 'total_fare'
    | 'user_name'
    | 'route_name'
    | 'trip_travel_date';
  sortOrder: 'asc' | 'desc';

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  hasMore: boolean;

  // Computed data
  filteredBookings: AdminBooking[];
  sortedBookings: AdminBooking[];
  paginatedBookings: AdminBooking[];
  bookingsByStatus: Record<BookingStatus, AdminBooking[]>;

  // Actions
  fetchBookings: (refresh?: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchBooking: (id: string) => Promise<AdminBooking | null>;
  createBooking: (data: any) => Promise<string>;
  updateBooking: (id: string, updates: Partial<AdminBooking>) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: BookingStatus) => Promise<void>;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<AdminBookingFilters>) => void;
  clearFilters: () => void;
  setSortBy: (
    sortBy:
      | 'created_at'
      | 'total_fare'
      | 'user_name'
      | 'route_name'
      | 'trip_travel_date'
  ) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Selection actions
  toggleBookingSelection: (id: string) => void;
  selectAllBookings: () => void;
  clearSelection: () => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  loadMore: () => Promise<void>;

  // UI state
  showFilterModal: boolean;
  setShowFilterModal: (show: boolean) => void;

  // Utility actions
  handleRefresh: () => Promise<void>;
  handleBulkStatusUpdate: (status: BookingStatus) => Promise<void>;
  hasActiveFilters: () => boolean;
  getCurrentFilterText: () => { filters: string; sort: string };
  getStatusCount: (status: BookingStatus | 'all') => number;

  // Performance helpers
  getBookingStatusColor: (status: BookingStatus) => string;
  getBookingStatusIcon: (status: BookingStatus) => string;
  getPaymentStatusColor: (status?: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  formatDateTime: (date: string) => string;
  formatTime: (time: string) => string;
  formatBookingStatus: (status: BookingStatus) => string;
  formatPaymentStatus: (status?: string) => string;
  formatRouteName: (fromIsland?: string, toIsland?: string) => string;
  formatPassengerCount: (count: number) => string;
  formatBookingNumber: (bookingNumber: string) => string;
  isBookingExpired: (booking: AdminBooking) => boolean;
  isBookingActive: (booking: AdminBooking) => boolean;
  validateBookingData: (booking: Partial<AdminBooking>) => {
    isValid: boolean;
    errors: string[];
  };
}

// ============================================================================
// BOOKING MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useAdminBookingManagement = (
  initialSearchQuery: string = '',
  initialFilters: AdminBookingFilters = {
    searchQuery: '',
    filterStatus: 'all',
    filterAgent: 'all',
    filterRoute: 'all',
    filterDateRange: { start: null, end: null },
    sortBy: 'created_at',
    sortOrder: 'desc',
    selectedBookings: [],
  },
  initialSortBy:
    | 'created_at'
    | 'total_fare'
    | 'user_name'
    | 'route_name'
    | 'trip_travel_date' = 'created_at',
  initialSortOrder: 'asc' | 'desc' = 'desc'
): UseAdminBookingManagementReturn => {
  // ========================================================================
  // STORE ACCESS
  // ========================================================================

  const bookingStore = useAdminBookingStore();

  const {
    // State
    bookings,
    stats,
    filters,
    loading,
    statsLoading,
    updating,
    hasFetched,
    currentPage,
    itemsPerPage,
    totalItems,
    hasMore,
    error,

    // Actions
    fetchBookings,
    fetchStats,
    fetchBooking,
    createBooking,
    updateBooking,
    deleteBooking,
    updateBookingStatus,
    bulkUpdateStatus,

    // Filter and search
    setFilters,
    clearFilters,
    setSearchQuery,
    setSortBy,
    setSortOrder,

    // Selection
    toggleBookingSelection,
    selectAllBookings,
    clearSelection,

    // Pagination
    setCurrentPage,
    setItemsPerPage,
    loadMore,

    // Utility
    getFilteredBookings,
    getStatusCount,
  } = bookingStore;

  // ========================================================================
  // LOCAL STATE
  // ========================================================================

  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // ========================================================================
  // COMPUTED DATA
  // ========================================================================

  // Filtered bookings based on search query
  const filteredBookings = useMemo(() => {
    return searchBookings(bookings, filters.searchQuery);
  }, [bookings, filters.searchQuery]);

  // Sorted bookings
  const sortedBookings = useMemo(() => {
    return sortBookingsByPriority(filteredBookings);
  }, [filteredBookings]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBookings.slice(startIndex, endIndex);
  }, [sortedBookings, currentPage, itemsPerPage]);

  // Bookings grouped by status
  const bookingsByStatus = useMemo(() => {
    const grouped: Record<BookingStatus, AdminBooking[]> = {
      reserved: [],
      pending_payment: [],
      confirmed: [],
      checked_in: [],
      completed: [],
      cancelled: [],
    };

    bookings.forEach(booking => {
      if (grouped[booking.status]) {
        grouped[booking.status].push(booking);
      }
    });

    return grouped;
  }, [bookings]);

  // ========================================================================
  // ACTIONS
  // ========================================================================

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBookings(true), fetchStats()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchBookings, fetchStats]);

  // Handle bulk status update
  const handleBulkStatusUpdate = useCallback(
    async (status: BookingStatus) => {
      if (filters.selectedBookings.length === 0) return;

      try {
        await bulkUpdateStatus(filters.selectedBookings, status);
        clearSelection();
      } catch (error) {
        console.error('Error bulk updating bookings:', error);
        throw error;
      }
    },
    [filters.selectedBookings, bulkUpdateStatus, clearSelection]
  );

  // Check if there are active filters
  const hasActiveFilters = useCallback((): boolean => {
    return (
      filters.filterStatus !== 'all' ||
      filters.filterAgent !== 'all' ||
      filters.filterRoute !== 'all' ||
      filters.filterDateRange.start !== null ||
      filters.filterDateRange.end !== null ||
      filters.sortBy !== 'created_at' ||
      filters.sortOrder !== 'desc' ||
      filters.searchQuery !== ''
    );
  }, [filters]);

  // Get current filter text for display
  const getCurrentFilterText = useCallback(() => {
    const filterText = [];

    if (filters.filterStatus !== 'all') {
      filterText.push(`Status: ${formatBookingStatus(filters.filterStatus)}`);
    }

    if (filters.filterAgent !== 'all') {
      const agent = bookings.find(b => b.agent_id === filters.filterAgent);
      if (agent?.agent_name) {
        filterText.push(`Agent: ${agent.agent_name}`);
      }
    }

    if (filters.filterRoute !== 'all') {
      filterText.push(`Route: ${filters.filterRoute}`);
    }

    const sortText = {
      created_at:
        filters.sortOrder === 'desc'
          ? 'Date (Newest first)'
          : 'Date (Oldest first)',
      total_fare:
        filters.sortOrder === 'desc'
          ? 'Amount (High to Low)'
          : 'Amount (Low to High)',
      user_name:
        filters.sortOrder === 'asc' ? 'Customer (A-Z)' : 'Customer (Z-A)',
      route_name: filters.sortOrder === 'asc' ? 'Route (A-Z)' : 'Route (Z-A)',
      trip_travel_date:
        filters.sortOrder === 'desc'
          ? 'Travel Date (Latest first)'
          : 'Travel Date (Earliest first)',
    };

    return {
      filters: filterText.length > 0 ? filterText.join(', ') : 'All bookings',
      sort: sortText[filters.sortBy] || 'Date (Newest first)',
    };
  }, [filters, bookings, formatBookingStatus]);

  // ========================================================================
  // COMPUTED STATS FOR UI
  // ========================================================================

  // Transform stats for BookingsStats component
  const transformedStats = useMemo(() => {
    // Use stats from the store (calculated from all bookings) instead of current page bookings
    return {
      totalBookings: stats.total_bookings || 0,
      todayBookings: stats.today_bookings || 0,
      todayBookingsChange: stats.today_bookings_change || '0',
      todayRevenue: stats.today_revenue || 0,
      todayRevenueChange: stats.today_revenue_change || '0',
      totalRevenue: stats.total_revenue || 0,
      confirmedCount: stats.confirmed_count || 0,
      confirmedRate: stats.confirmed_rate || '0',
      reservedCount: stats.reserved_count || 0,
      cancelledCount: stats.cancelled_count || 0,
      completedCount: stats.completed_count || 0,
    };
  }, [stats]);

  // ========================================================================
  // RETURN INTERFACE
  // ========================================================================

  return {
    // Data
    bookings,
    stats: transformedStats,
    filters,

    // Loading states
    loading,
    statsLoading,
    updating,
    refreshing,
    hasFetched,

    // Search and filtering
    searchQuery: filters.searchQuery,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,

    // Pagination
    currentPage,
    itemsPerPage,
    totalItems,
    hasMore,

    // Computed data
    filteredBookings,
    sortedBookings,
    paginatedBookings,
    bookingsByStatus,

    // Actions
    fetchBookings,
    fetchStats,
    fetchBooking,
    createBooking,
    updateBooking,
    deleteBooking,
    updateBookingStatus,
    bulkUpdateStatus,

    // Search and filter actions
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,

    // Selection actions
    toggleBookingSelection,
    selectAllBookings,
    clearSelection,

    // Pagination actions
    setCurrentPage,
    setItemsPerPage,
    loadMore,

    // UI state
    showFilterModal,
    setShowFilterModal,

    // Utility actions
    handleRefresh,
    handleBulkStatusUpdate,
    hasActiveFilters,
    getCurrentFilterText,
    getStatusCount,

    // Performance helpers
    getBookingStatusColor,
    getBookingStatusIcon,
    getPaymentStatusColor,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatTime,
    formatBookingStatus,
    formatPaymentStatus,
    formatRouteName,
    formatPassengerCount,
    formatBookingNumber,
    isBookingExpired,
    isBookingActive,
    validateBookingData,
  };
};
