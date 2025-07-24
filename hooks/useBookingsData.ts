import { useState, useMemo } from "react";
import { useAdminStore } from "@/store/admin/adminStore";
import { FilterStatus, SortOrder, BookingsFilterState } from "@/types/admin/dashboard";
import { Booking } from "@/types/admin";

export const useBookingsData = () => {
    const {
        bookings,
        routes,
        vessels,
        dashboardStats,
        updateBooking,
        addActivityLog
    } = useAdminStore();

    const [filterState, setFilterState] = useState<BookingsFilterState>({
        searchQuery: "",
        filterStatus: "all",
        sortOrder: "date_desc",
        selectedBookings: [],
    });

    // Enhanced filtering and sorting
    const filteredAndSortedBookings = useMemo(() => {
        let filtered = bookings.filter((booking) => {
            // Text search
            const searchMatch = filterState.searchQuery === "" ||
                (booking?.customerName?.toLowerCase() || "").includes(filterState.searchQuery.toLowerCase()) ||
                (booking?.routeName?.toLowerCase() || "").includes(filterState.searchQuery.toLowerCase()) ||
                (booking?.id || "").includes(filterState.searchQuery) ||
                (booking?.customerEmail?.toLowerCase() || "").includes(filterState.searchQuery.toLowerCase());

            // Status filter
            const statusMatch = filterState.filterStatus === "all" || booking.status === filterState.filterStatus;

            return searchMatch && statusMatch;
        });

        // Sorting
        return filtered.sort((a, b) => {
            switch (filterState.sortOrder) {
                case "date_asc":
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case "date_desc":
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case "amount_desc":
                    return (b.totalAmount || 0) - (a.totalAmount || 0);
                case "amount_asc":
                    return (a.totalAmount || 0) - (b.totalAmount || 0);
                case "customer_asc":
                    return (a.customerName || "").localeCompare(b.customerName || "");
                default:
                    return 0;
            }
        });
    }, [bookings, filterState]);

    // Enhanced statistics
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const todayBookings = bookings.filter(b => b.date === today);
        const yesterdayBookings = bookings.filter(b => b.date === yesterday);

        const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const yesterdayRevenue = yesterdayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
        const reservedCount = bookings.filter(b => b.status === "reserved").length;
        const cancelledCount = bookings.filter(b => b.status === "cancelled").length;
        const completedCount = bookings.filter(b => b.status === "completed").length;

        return {
            totalBookings: bookings.length,
            todayBookings: todayBookings.length,
            todayBookingsChange: yesterdayBookings.length > 0
                ? ((todayBookings.length - yesterdayBookings.length) / yesterdayBookings.length * 100).toFixed(1)
                : "0",
            todayRevenue,
            todayRevenueChange: yesterdayRevenue > 0
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
                : "0",
            totalRevenue,
            confirmedCount,
            confirmedRate: bookings.length > 0 ? (confirmedCount / bookings.length * 100).toFixed(1) : "0",
            reservedCount,
            cancelledCount,
            completedCount
        };
    }, [bookings]);

    const getStatusCount = (status: FilterStatus) => {
        if (status === "all") return bookings.length;
        return bookings.filter(b => b.status === status).length;
    };

    const updateFilterState = (updates: Partial<BookingsFilterState>) => {
        setFilterState(prev => ({ ...prev, ...updates }));
    };

    const toggleBookingSelection = (bookingId: string) => {
        setFilterState(prev => ({
            ...prev,
            selectedBookings: prev.selectedBookings.includes(bookingId)
                ? prev.selectedBookings.filter(id => id !== bookingId)
                : [...prev.selectedBookings, bookingId]
        }));
    };

    const selectAllBookings = () => {
        setFilterState(prev => ({
            ...prev,
            selectedBookings: prev.selectedBookings.length === filteredAndSortedBookings.length
                ? []
                : filteredAndSortedBookings.map(booking => booking.id)
        }));
    };

    const clearSelection = () => {
        setFilterState(prev => ({ ...prev, selectedBookings: [] }));
    };

    const hasActiveFilters = () => {
        return filterState.filterStatus !== "all" ||
            filterState.sortOrder !== "date_desc" ||
            filterState.searchQuery !== "";
    };

    const clearAllFilters = () => {
        setFilterState({
            searchQuery: "",
            filterStatus: "all",
            sortOrder: "date_desc",
            selectedBookings: [],
        });
    };

    return {
        bookings: filteredAndSortedBookings,
        filterState,
        stats,
        updateFilterState,
        toggleBookingSelection,
        selectAllBookings,
        clearSelection,
        getStatusCount,
        hasActiveFilters,
        clearAllFilters,
        updateBooking,
        addActivityLog,
    };
}; 