export type DashboardWelcomeProps = {
    adminName: string;
    adminRole: string;
    unreadNotifications: number;
    todayBookings: number;
    activeTripsCount: number;
    alertsCount: number;
    onPress: () => void;
    isTablet: boolean;
};

export type SystemHealthData = {
    database: "healthy" | "warning" | "critical";
    api: "online" | "offline";
    load: "normal" | "high" | "critical";
    backup: string;
};

export type QuickAction = {
    id: string;
    title: string;
    icon: string;
    action: string;
    permission?: boolean;
};

export type DashboardStatsData = {
    todayBookings: number;
    activeTripsCount: number;
    totalWalletBalance: number;
    unreadNotifications: number;
    dailyBookingsRevenue: number;
    activeUsersTotal: number;
    onlineUsers: number;
    walletCount: number;
    dailyBookingsChange: number;
    dailyRevenueChange: number;
};

export type FilterStatus = "all" | "reserved" | "confirmed" | "cancelled" | "completed";
export type SortOrder = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "customer_asc";

export type BookingsFilterState = {
    searchQuery: string;
    filterStatus: FilterStatus;
    sortOrder: SortOrder;
    selectedBookings: string[];
};

export type OperationsSection = "routes" | "trips" | "vessels" | "schedule";

export type OperationsStatsData = {
    activeRoutes: number;
    totalRoutes: number;
    activeVessels: number;
    totalVessels: number;
    todayTrips: number;
    totalCapacity: number;
}; 