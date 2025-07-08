import { create } from 'zustand';
import { AdminBooking, AdminBookingFilters, AdminPagination } from '@/types/admin';

interface AdminBookingsState {
    bookings: AdminBooking[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    filters: AdminBookingFilters;
    selectedBookings: string[];

    // Actions
    setBookings: (bookings: AdminBooking[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPagination: (pagination: AdminPagination) => void;
    setFilters: (filters: AdminBookingFilters) => void;
    updateBooking: (bookingId: string, updates: Partial<AdminBooking>) => void;
    removeBooking: (bookingId: string) => void;
    addBooking: (booking: AdminBooking) => void;
    setSelectedBookings: (bookingIds: string[]) => void;
    toggleBookingSelection: (bookingId: string) => void;
    selectAllBookings: () => void;
    clearBookingSelection: () => void;
    clearState: () => void;
}

const initialState = {
    bookings: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0
    },
    filters: {},
    selectedBookings: []
};

export const useAdminBookingsStore = create<AdminBookingsState>((set, get) => ({
    ...initialState,

    setBookings: (bookings) => set({ bookings }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    setPagination: (pagination) => set({ pagination }),

    setFilters: (filters) => set({ filters }),

    updateBooking: (bookingId, updates) => set((state) => ({
        bookings: state.bookings.map(booking =>
            booking.id === bookingId ? { ...booking, ...updates } : booking
        )
    })),

    removeBooking: (bookingId) => set((state) => ({
        bookings: state.bookings.filter(booking => booking.id !== bookingId),
        selectedBookings: state.selectedBookings.filter(id => id !== bookingId),
        pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1)
        }
    })),

    addBooking: (booking) => set((state) => ({
        bookings: [booking, ...state.bookings],
        pagination: {
            ...state.pagination,
            total: state.pagination.total + 1
        }
    })),

    setSelectedBookings: (bookingIds) => set({ selectedBookings: bookingIds }),

    toggleBookingSelection: (bookingId) => set((state) => {
        const isSelected = state.selectedBookings.includes(bookingId);
        return {
            selectedBookings: isSelected
                ? state.selectedBookings.filter(id => id !== bookingId)
                : [...state.selectedBookings, bookingId]
        };
    }),

    selectAllBookings: () => set((state) => ({
        selectedBookings: state.bookings.map(booking => booking.id)
    })),

    clearBookingSelection: () => set({ selectedBookings: [] }),

    clearState: () => set(initialState)
})); 