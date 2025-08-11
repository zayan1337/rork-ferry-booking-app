// Admin Dashboard Types
export type OperationsSection = "routes" | "trips" | "vessels" | "schedule";

export interface OperationsStatsData {
    activeRoutes: number;
    totalRoutes: number;
    activeVessels: number;
    totalVessels: number;
    todayTrips: number;
    totalRevenue30d: number;
}

// Booking filter and sort types
export type FilterStatus = "all" | "reserved" | "confirmed" | "cancelled" | "completed";
export type SortOrder = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "customer_asc";

export interface BookingsFilterState {
    searchQuery: string;
    filterStatus: FilterStatus;
    sortOrder: SortOrder;
    selectedBookings: string[];
}

// Dashboard stats data
export interface DashboardStatsData {
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
}

export interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: string;
    route: string;
    color: string;
    permissions: string[];
}

export interface DashboardWidget {
    id: string;
    type: "stats" | "chart" | "list" | "quick_actions";
    title: string;
    data: any;
    size: "small" | "medium" | "large";
    position: {
        row: number;
        col: number;
    };
    visible: boolean;
    permissions: string[];
}

export interface DashboardLayout {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    is_default: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface AdminDashboardState {
    activeLayout: string;
    layouts: DashboardLayout[];
    customization: {
        theme: "light" | "dark";
        sidebar_collapsed: boolean;
        widget_settings: Record<string, any>;
    };
}

// Chart and Stats Data Types
export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string[];
        borderColor?: string[];
        borderWidth?: number;
    }[];
}

export interface TimeSeriesData {
    date: string;
    value: number;
    label?: string;
}

export interface StatsCardData {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: string;
    trend?: "up" | "down";
    trendValue?: string;
    size?: "small" | "medium" | "large";
}

// User Management Dashboard Types
export interface UserManagementStats {
    totalUsers: number;
    activeUsers: number;
    activeRate: string;
    adminCount: number;
    agentCount: number;
    customerCount: number;
    passengerCount: number;
    newUsersThisMonth: number;
    suspendedCount: number;
}

// Operations Dashboard Types
export interface OperationsDashboardStats {
    routes: {
        total: number;
        active: number;
        inactive: number;
        maintenance: number;
    };
    vessels: {
        total: number;
        active: number;
        maintenance: number;
        inactive: number;
    };
    trips: {
        today: number;
        scheduled: number;
        completed: number;
        cancelled: number;
    };
    capacity: {
        total: number;
        utilized: number;
        available: number;
    };
}

// Finance Dashboard Types
export interface FinanceDashboardStats {
    revenue: {
        today: number;
        thisMonth: number;
        lastMonth: number;
        growth: number;
    };
    wallets: {
        total: number;
        active: number;
        totalBalance: number;
        transactionsToday: number;
    };
    payments: {
        completed: number;
        pending: number;
        failed: number;
        totalValue: number;
    };
}

// Communications Dashboard Types
export interface CommunicationsDashboardStats {
    notifications: {
        total: number;
        sent: number;
        pending: number;
        failed: number;
    };
    bulkMessages: {
        total: number;
        sent: number;
        draft: number;
        scheduled: number;
    };
    engagement: {
        openRate: number;
        responseRate: number;
        averageReachTime: number;
    };
}

// Bookings Dashboard Types
export interface BookingsDashboardStats {
    bookings: {
        total: number;
        confirmed: number;
        pending: number;
        cancelled: number;
    };
    revenue: {
        total: number;
        today: number;
        thisWeek: number;
        thisMonth: number;
    };
    occupancy: {
        rate: number;
        trend: "up" | "down";
        comparison: number;
    };
} 