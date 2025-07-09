import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";
import { mockAlerts, mockBookings, mockUsers, mockVessels, mockRoutes, mockTrips, mockDashboardStats } from "@/mocks/adminData";
import { Alert, Booking, User, Vessel, Route, Trip, DashboardStats } from "@/types/admin";

interface LoadingState {
  [key: string]: boolean;
}

interface AdminState {
  // Data
  alerts: Alert[];
  bookings: Booking[];
  users: User[];
  vessels: Vessel[];
  routes: Route[];
  trips: Trip[];
  dashboardStats: DashboardStats;

  // Loading states
  loading: LoadingState;

  // Pagination and filtering
  currentPage: number;
  itemsPerPage: number;
  searchQueries: { [key: string]: string };
  filters: { [key: string]: any };

  // Alert management
  unreadAlertsCount: number;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  addAlert: (alert: Alert) => void;
  dismissAlert: (id: string) => void;

  // CRUD operations
  // Bookings
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Vessels
  addVessel: (vessel: Omit<Vessel, 'id'>) => void;
  updateVessel: (id: string, updates: Partial<Vessel>) => void;
  deleteVessel: (id: string) => void;

  // Routes
  addRoute: (route: Omit<Route, 'id'>) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;

  // Trips
  addTrip: (trip: Omit<Trip, 'id'>) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;

  // Utility functions
  setLoading: (key: string, value: boolean) => void;
  setSearchQuery: (key: string, query: string) => void;
  setFilter: (key: string, filter: any) => void;
  refreshData: () => Promise<void>;

  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // User preferences
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // Initial data
      alerts: mockAlerts,
      bookings: mockBookings,
      users: mockUsers,
      vessels: mockVessels,
      routes: mockRoutes,
      trips: mockTrips,
      dashboardStats: mockDashboardStats,

      // Loading states
      loading: {},

      // Pagination and filtering
      currentPage: 1,
      itemsPerPage: 20,
      searchQueries: {},
      filters: {},

      unreadAlertsCount: mockAlerts.filter(alert => !alert.read).length,

      // Alert management
      markAlertAsRead: (id) =>
        set((state) => {
          const updatedAlerts = state.alerts.map((alert) =>
            alert.id === id ? { ...alert, read: true } : alert
          );
          return {
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.read).length
          };
        }),

      markAllAlertsAsRead: () =>
        set((state) => ({
          alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
          unreadAlertsCount: 0
        })),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [{ ...alert, id: Date.now().toString() }, ...state.alerts],
          unreadAlertsCount: state.unreadAlertsCount + 1
        })),

      dismissAlert: (id) =>
        set((state) => {
          const updatedAlerts = state.alerts.filter((alert) => alert.id !== id);
          return {
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.read).length
          };
        }),

      // CRUD operations
      // Bookings
      addBooking: (booking) =>
        set((state) => ({
          bookings: [{
            ...booking,
            id: `b${Date.now()}`,
            createdAt: new Date().toISOString()
          }, ...state.bookings]
        })),

      updateBooking: (id, updates) =>
        set((state) => ({
          bookings: state.bookings.map((booking) =>
            booking.id === id ? { ...booking, ...updates } : booking
          )
        })),

      deleteBooking: (id) =>
        set((state) => ({
          bookings: state.bookings.filter((booking) => booking.id !== id)
        })),

      // Users
      addUser: (user) =>
        set((state) => ({
          users: [{
            ...user,
            id: `u${Date.now()}`,
            createdAt: new Date().toISOString()
          }, ...state.users]
        })),

      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...updates } : user
          )
        })),

      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((user) => user.id !== id)
        })),

      // Vessels
      addVessel: (vessel) =>
        set((state) => ({
          vessels: [{
            ...vessel,
            id: `v${Date.now()}`
          }, ...state.vessels]
        })),

      updateVessel: (id, updates) =>
        set((state) => ({
          vessels: state.vessels.map((vessel) =>
            vessel.id === id ? { ...vessel, ...updates } : vessel
          )
        })),

      deleteVessel: (id) =>
        set((state) => ({
          vessels: state.vessels.filter((vessel) => vessel.id !== id)
        })),

      // Routes
      addRoute: (route) =>
        set((state) => ({
          routes: [{
            ...route,
            id: `r${Date.now()}`
          }, ...state.routes]
        })),

      updateRoute: (id, updates) =>
        set((state) => ({
          routes: state.routes.map((route) =>
            route.id === id ? { ...route, ...updates } : route
          )
        })),

      deleteRoute: (id) =>
        set((state) => ({
          routes: state.routes.filter((route) => route.id !== id)
        })),

      // Trips
      addTrip: (trip) =>
        set((state) => ({
          trips: [{
            ...trip,
            id: `t${Date.now()}`
          }, ...state.trips]
        })),

      updateTrip: (id, updates) =>
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === id ? { ...trip, ...updates } : trip
          )
        })),

      deleteTrip: (id) =>
        set((state) => ({
          trips: state.trips.filter((trip) => trip.id !== id)
        })),

      // Utility functions
      setLoading: (key, value) =>
        set((state) => ({
          loading: { ...state.loading, [key]: value }
        })),

      setSearchQuery: (key, query) =>
        set((state) => ({
          searchQueries: { ...state.searchQueries, [key]: query }
        })),

      setFilter: (key, filter) =>
        set((state) => ({
          filters: { ...state.filters, [key]: filter }
        })),

      refreshData: async () => {
        set({ loading: { ...get().loading, refresh: true } });
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ loading: { ...get().loading, refresh: false } });
      },

      // UI state
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // User preferences
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "admin-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        itemsPerPage: state.itemsPerPage,
      }),
    }
  )
);