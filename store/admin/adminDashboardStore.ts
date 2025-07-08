import { create } from 'zustand';
import { AdminDashboardStats, AdminAlert } from '@/types/admin';

interface AdminDashboardState {
    stats: AdminDashboardStats | null;
    alerts: AdminAlert[];
    loading: boolean;
    error: string | null;
    unreadAlertsCount: number;

    // Actions
    setStats: (stats: AdminDashboardStats | null) => void;
    setAlerts: (alerts: AdminAlert[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    markAlertAsRead: (alertId: string) => void;
    markAllAlertsAsRead: () => void;
    addAlert: (alert: Omit<AdminAlert, 'id' | 'created_at'>) => void;
    dismissAlert: (alertId: string) => void;
}

export const useAdminDashboardStore = create<AdminDashboardState>((set, get) => ({
    stats: null,
    alerts: [],
    loading: false,
    error: null,
    unreadAlertsCount: 0,

    setStats: (stats) => set({ stats }),

    setAlerts: (alerts) => set({
        alerts,
        unreadAlertsCount: alerts.filter(alert => !alert.is_read).length
    }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    markAlertAsRead: (alertId) => set((state) => {
        const updatedAlerts = state.alerts.map(alert =>
            alert.id === alertId ? { ...alert, is_read: true } : alert
        );
        return {
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.is_read).length
        };
    }),

    markAllAlertsAsRead: () => set((state) => ({
        alerts: state.alerts.map(alert => ({ ...alert, is_read: true })),
        unreadAlertsCount: 0
    })),

    addAlert: (alertData) => set((state) => {
        const newAlert: AdminAlert = {
            ...alertData,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            is_read: false
        };

        return {
            alerts: [newAlert, ...state.alerts],
            unreadAlertsCount: state.unreadAlertsCount + 1
        };
    }),

    dismissAlert: (alertId) => set((state) => {
        const updatedAlerts = state.alerts.filter(alert => alert.id !== alertId);
        return {
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.is_read).length
        };
    })
})); 