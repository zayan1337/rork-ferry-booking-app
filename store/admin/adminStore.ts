import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  mockAlerts,
  mockBookings,
  mockUsers,
  mockVessels,
  mockRoutes,
  mockTrips,
  mockDashboardStats,
} from '@/mocks/adminData';
import {
  Alert,
  Booking,
  DashboardStats,
  Wallet,
  WalletTransaction,
  PaymentReport,
  Notification,
  BulkMessage,
  Passenger,
  PassengerManifest,
  Report,
  ActivityLog,
  AdminPermission,
} from '@/types/admin';
import { UserProfile } from '@/types/userManagement';
import { Route, Vessel, Trip } from '@/types/operations';

interface LoadingState {
  [key: string]: boolean;
}

interface AdminState {
  // Existing Data
  alerts: Alert[];
  bookings: Booking[];
  users: UserProfile[];
  vessels: Vessel[];
  routes: Route[];
  trips: Trip[];
  dashboardStats: DashboardStats;

  // New Data
  wallets: Wallet[];
  walletTransactions: WalletTransaction[];
  paymentReports: PaymentReport[];
  notifications: Notification[];
  bulkMessages: BulkMessage[];
  passengers: Passenger[];
  passengerManifests: PassengerManifest[];
  reports: Report[];
  activityLogs: ActivityLog[];
  permissions: AdminPermission[];

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
  // Existing CRUD
  addBooking: (booking: Omit<Booking, 'id' | 'created_at'>) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  addUser: (user: Omit<UserProfile, 'id' | 'created_at'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  getUser: (id: string) => UserProfile | undefined;

  addVessel: (vessel: Omit<Vessel, 'id'>) => void;
  updateVessel: (id: string, updates: Partial<Vessel>) => void;
  deleteVessel: (id: string) => void;
  getVessel: (id: string) => Promise<Vessel>;
  createVessel: (vesselData: any) => Promise<void>;

  addRoute: (route: Omit<Route, 'id'>) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;

  addTrip: (trip: Omit<Trip, 'id'>) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  getTrip: (id: string) => Promise<Trip>;
  createTrip: (tripData: any) => Promise<void>;

  // New CRUD operations
  // Wallet operations
  addWallet: (wallet: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  addWalletTransaction: (
    transaction: Omit<WalletTransaction, 'id' | 'created_at'>
  ) => void;

  // Notification operations
  addNotification: (
    notification: Omit<Notification, 'id' | 'created_at'>
  ) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  deleteNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;

  // Bulk message operations
  addBulkMessage: (message: Omit<BulkMessage, 'id' | 'created_at'>) => void;
  updateBulkMessage: (id: string, updates: Partial<BulkMessage>) => void;
  deleteBulkMessage: (id: string) => void;
  sendBulkMessage: (id: string) => Promise<void>;

  // Passenger operations
  addPassenger: (passenger: Omit<Passenger, 'id' | 'created_at'>) => void;
  updatePassenger: (id: string, updates: Partial<Passenger>) => void;
  deletePassenger: (id: string) => void;

  // Manifest operations
  addPassengerManifest: (
    manifest: Omit<PassengerManifest, 'id' | 'created_at' | 'updated_at'>
  ) => void;
  updatePassengerManifest: (
    id: string,
    updates: Partial<PassengerManifest>
  ) => void;

  // Report operations
  generateReport: (
    report: Omit<Report, 'id' | 'generated_at' | 'status' | 'row_count'>
  ) => Promise<void>;
  updateReport: (id: string, updates: Partial<Report>) => void;
  deleteReport: (id: string) => void;

  // Activity log operations
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'created_at'>) => void;

  // Permission operations
  addPermission: (
    permission: Omit<AdminPermission, 'id' | 'created_at'>
  ) => void;
  updatePermission: (id: string, updates: Partial<AdminPermission>) => void;
  deletePermission: (id: string) => void;

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

  // User management functions
  updateUserStatus: (id: string, status: string) => void;
  updateUserRole: (id: string, role: string) => void;
  exportUsersReport: (users: UserProfile[]) => Promise<void>;

  // Alert management functions
  deleteAlert: (id: string) => void;

  // System management functions
  systemSettings: any;
  adminPermissions: AdminPermission[];
  updateSystemSettings: (settings: any) => Promise<void>;
  backupDatabase: () => Promise<void>;
  restoreDatabase: () => Promise<void>;
  exportActivityLogs: (logs: ActivityLog[]) => Promise<void>;
  exportSystemReport: (type: string) => Promise<void>;
}

// Mock data for new entities
const mockWallets: Wallet[] = [
  {
    id: 'w1',
    user_id: 'u1',
    user_name: 'John Doe',
    user_email: 'john@example.com',
    balance: 150.0,
    currency: 'MVR',
    is_active: true,
    transactions: [],
    total_credits: 500.0,
    total_debits: 350.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight at 2 AM',
    type: 'system',
    priority: 'medium',
    target_users: 'all',
    is_read: false,
    sent_by: 'admin1',
    sent_by_name: 'Admin User',
    created_at: new Date().toISOString(),
  },
];

const mockBulkMessages: BulkMessage[] = [
  {
    id: 'bm1',
    title: 'Weather Alert',
    message_content: 'Due to rough weather, some trips may be delayed.',
    target_criteria: { user_roles: ['customer'] },
    recipient_count: 150,
    sent_count: 150,
    failed_count: 0,
    status: 'sent',
    sent_by: 'admin1',
    sent_by_name: 'Admin User',
    created_at: new Date().toISOString(),
  },
];

const mockPassengers: Passenger[] = [
  {
    id: 'p1',
    booking_id: 'b1',
    booking_number: 'BK12345',
    seat_id: 's1',
    seat_number: 'A1',
    passenger_name: 'Jane Smith',
    passenger_contact_number: '+960-7123456',
    check_in_status: false,
    trip_date: new Date().toISOString().split('T')[0],
    route_name: 'Male to Hulhule',
    vessel_name: 'MV Seabird',
    created_at: new Date().toISOString(),
  },
];

const mockReports: Report[] = [
  {
    id: 'r1',
    report_type: 'booking',
    title: 'Monthly Booking Report',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    status: 'completed',
    format: 'pdf',
    row_count: 1250,
    generated_by: 'admin1',
    generated_by_name: 'Admin User',
    generated_at: new Date().toISOString(),
  },
];

const mockActivityLogs: ActivityLog[] = [
  {
    id: 'al1',
    user_id: 'admin1',
    user_name: 'Admin User',
    action: 'booking_created',
    details: 'Created booking BK12345',
    ip_address: '192.168.1.1',
    created_at: new Date().toISOString(),
  },
];

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // Existing data
      alerts: mockAlerts || [],
      bookings: mockBookings || [],
      users: mockUsers || [],
      vessels: mockVessels || [],
      routes: mockRoutes || [],
      trips: mockTrips || [],
      dashboardStats: mockDashboardStats || {
        totalUsers: 0,
        totalBookings: 0,
        totalRevenue: 0,
        completedTrips: 0,
        pendingBookings: 0,
        activeUsers: 0,
        recentBookings: [],
        userGrowth: 0,
        revenueGrowth: 0,
        systemHealth: {
          status: 'healthy',
          last_backup: '',
          database_size: '',
          active_sessions: 0,
        },
      },

      // New data
      wallets: mockWallets,
      walletTransactions: [],
      paymentReports: [],
      notifications: mockNotifications,
      bulkMessages: mockBulkMessages,
      passengers: mockPassengers,
      passengerManifests: [],
      reports: mockReports,
      activityLogs: mockActivityLogs,
      permissions: [],

      // Loading states
      loading: {},

      // Pagination and filtering
      currentPage: 1,
      itemsPerPage: 20,
      searchQueries: {},
      filters: {},

      unreadAlertsCount: mockAlerts.filter(alert => !alert.read).length,

      // Alert management
      markAlertAsRead: id =>
        set(state => {
          const updatedAlerts = state.alerts.map(alert =>
            alert.id === id ? { ...alert, read: true } : alert
          );
          return {
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.read)
              .length,
          };
        }),

      markAllAlertsAsRead: () =>
        set(state => ({
          alerts: state.alerts.map(alert => ({ ...alert, read: true })),
          unreadAlertsCount: 0,
        })),

      addAlert: alert =>
        set(state => ({
          alerts: [{ ...alert, id: Date.now().toString() }, ...state.alerts],
          unreadAlertsCount: state.unreadAlertsCount + 1,
        })),

      dismissAlert: id =>
        set(state => {
          const updatedAlerts = state.alerts.filter(alert => alert.id !== id);
          return {
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.read)
              .length,
          };
        }),

      // Existing CRUD operations
      addBooking: booking =>
        set(state => ({
          bookings: [
            {
              ...booking,
              id: `b${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
            ...state.bookings,
          ],
        })),

      updateBooking: (id, updates) =>
        set(state => ({
          bookings: state.bookings.map(booking =>
            booking.id === id ? { ...booking, ...updates } : booking
          ),
        })),

      deleteBooking: id =>
        set(state => ({
          bookings: state.bookings.filter(booking => booking.id !== id),
        })),

      addUser: user =>
        set(state => {
          const newUser = {
            ...user,
            id: `u${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Ensure users array exists
          const currentUsers = Array.isArray(state.users) ? state.users : [];

          return {
            users: [newUser, ...currentUsers],
          };
        }),

      updateUser: (id, updates) =>
        set(state => {
          // Ensure users array exists
          if (!Array.isArray(state.users)) {
            console.warn('updateUser: users array is not available');
            return state;
          }

          return {
            users: state.users.map(user =>
              user.id === id
                ? { ...user, ...updates, updated_at: new Date().toISOString() }
                : user
            ),
          };
        }),

      deleteUser: id =>
        set(state => {
          // Ensure users array exists
          if (!Array.isArray(state.users)) {
            console.warn('deleteUser: users array is not available');
            return state;
          }

          return {
            users: state.users.filter(user => user.id !== id),
          };
        }),

      getUser: id => {
        const state = get();
        if (!state.users || !Array.isArray(state.users)) {
          console.warn(
            'getUser: users array is not available or not an array',
            state.users
          );
          return undefined;
        }
        return state.users.find(user => user.id === id);
      },

      addVessel: vessel =>
        set(state => ({
          vessels: [
            {
              ...vessel,
              id: `v${Date.now()}`,
            },
            ...state.vessels,
          ],
        })),

      updateVessel: (id, updates) =>
        set(state => ({
          vessels: state.vessels.map(vessel =>
            vessel.id === id ? { ...vessel, ...updates } : vessel
          ),
        })),

      deleteVessel: id =>
        set(state => ({
          vessels: state.vessels.filter(vessel => vessel.id !== id),
        })),

      getVessel: async id => {
        const state = get();
        const vessel = state.vessels?.find(v => v.id === id);
        if (!vessel) {
          throw new Error(`Vessel with id ${id} not found`);
        }
        return vessel;
      },

      createVessel: async vesselData => {
        const state = get();
        const newVessel = {
          ...vesselData,
          id: `v${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set(state => ({
          vessels: [newVessel, ...state.vessels],
        }));
      },

      addRoute: route =>
        set(state => ({
          routes: [
            {
              ...route,
              id: `r${Date.now()}`,
            },
            ...state.routes,
          ],
        })),

      updateRoute: (id, updates) =>
        set(state => ({
          routes: state.routes.map(route =>
            route.id === id ? { ...route, ...updates } : route
          ),
        })),

      deleteRoute: id =>
        set(state => ({
          routes: state.routes.filter(route => route.id !== id),
        })),

      addTrip: trip =>
        set(state => ({
          trips: [
            {
              ...trip,
              id: `t${Date.now()}`,
            },
            ...state.trips,
          ],
        })),

      updateTrip: (id, updates) =>
        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === id ? { ...trip, ...updates } : trip
          ),
        })),

      deleteTrip: id =>
        set(state => ({
          trips: state.trips.filter(trip => trip.id !== id),
        })),

      getTrip: async id => {
        const state = get();
        const trip = state.trips?.find(t => t.id === id);
        if (!trip) {
          throw new Error(`Trip with id ${id} not found`);
        }
        return trip;
      },

      createTrip: async tripData => {
        const state = get();
        const newTrip = {
          ...tripData,
          id: `t${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set(state => ({
          trips: [newTrip, ...state.trips],
        }));
      },

      // New CRUD operations
      // Wallet operations
      addWallet: wallet =>
        set(state => ({
          wallets: [
            {
              ...wallet,
              id: `w${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...state.wallets,
          ],
        })),

      updateWallet: (id, updates) =>
        set(state => ({
          wallets: state.wallets.map(wallet =>
            wallet.id === id
              ? { ...wallet, ...updates, updated_at: new Date().toISOString() }
              : wallet
          ),
        })),

      addWalletTransaction: transaction =>
        set(state => ({
          walletTransactions: [
            {
              ...transaction,
              id: `wt${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            ...state.walletTransactions,
          ],
        })),

      // Notification operations
      addNotification: notification =>
        set(state => ({
          notifications: [
            {
              ...notification,
              id: `n${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),

      updateNotification: (id, updates) =>
        set(state => ({
          notifications: state.notifications.map(notification =>
            notification.id === id
              ? { ...notification, ...updates }
              : notification
          ),
        })),

      deleteNotification: id =>
        set(state => ({
          notifications: state.notifications.filter(
            notification => notification.id !== id
          ),
        })),

      markNotificationAsRead: id =>
        set(state => ({
          notifications: state.notifications.map(notification =>
            notification.id === id
              ? { ...notification, is_read: true }
              : notification
          ),
        })),

      // Bulk message operations
      addBulkMessage: message =>
        set(state => ({
          bulkMessages: [
            {
              ...message,
              id: `bm${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            ...state.bulkMessages,
          ],
        })),

      updateBulkMessage: (id, updates) =>
        set(state => ({
          bulkMessages: state.bulkMessages.map(message =>
            message.id === id ? { ...message, ...updates } : message
          ),
        })),

      deleteBulkMessage: id =>
        set(state => ({
          bulkMessages: state.bulkMessages.filter(message => message.id !== id),
        })),

      sendBulkMessage: async id => {
        set(state => ({
          bulkMessages: state.bulkMessages.map(message =>
            message.id === id ? { ...message, status: 'sending' } : message
          ),
        }));

        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 2000));

        set(state => ({
          bulkMessages: state.bulkMessages.map(message =>
            message.id === id
              ? {
                  ...message,
                  status: 'sent',
                  sent_count: message.recipient_count,
                }
              : message
          ),
        }));
      },

      // Passenger operations
      addPassenger: passenger =>
        set(state => ({
          passengers: [
            {
              ...passenger,
              id: `p${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            ...state.passengers,
          ],
        })),

      updatePassenger: (id, updates) =>
        set(state => ({
          passengers: state.passengers.map(passenger =>
            passenger.id === id ? { ...passenger, ...updates } : passenger
          ),
        })),

      deletePassenger: id =>
        set(state => ({
          passengers: state.passengers.filter(passenger => passenger.id !== id),
        })),

      // Manifest operations
      addPassengerManifest: manifest =>
        set(state => ({
          passengerManifests: [
            {
              ...manifest,
              id: `pm${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...state.passengerManifests,
          ],
        })),

      updatePassengerManifest: (id, updates) =>
        set(state => ({
          passengerManifests: state.passengerManifests.map(manifest =>
            manifest.id === id
              ? {
                  ...manifest,
                  ...updates,
                  updated_at: new Date().toISOString(),
                }
              : manifest
          ),
        })),

      // Report operations
      generateReport: async report => {
        const newReport = {
          ...report,
          id: `r${Date.now()}`,
          generated_at: new Date().toISOString(),
          status: 'generating' as const,
          row_count: 0,
        };

        set(state => ({
          reports: [newReport, ...state.reports],
        }));

        // Simulate report generation
        await new Promise(resolve => setTimeout(resolve, 3000));

        set(state => ({
          reports: state.reports.map(r =>
            r.id === newReport.id
              ? {
                  ...r,
                  status: 'completed' as const,
                  row_count: Math.floor(Math.random() * 1000) + 100,
                  report_url: `https://example.com/reports/${newReport.id}.pdf`,
                }
              : r
          ),
        }));
      },

      updateReport: (id, updates) =>
        set(state => ({
          reports: state.reports.map(report =>
            report.id === id ? { ...report, ...updates } : report
          ),
        })),

      deleteReport: id =>
        set(state => ({
          reports: state.reports.filter(report => report.id !== id),
        })),

      // Activity log operations
      addActivityLog: log =>
        set(state => ({
          activityLogs: [
            {
              ...log,
              id: `al${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            ...state.activityLogs,
          ],
        })),

      // Permission operations
      addPermission: permission =>
        set(state => ({
          permissions: [
            {
              ...permission,
              id: `perm${Date.now()}`,
              created_at: new Date().toISOString(),
            },
            ...state.permissions,
          ],
        })),

      updatePermission: (id, updates) =>
        set(state => ({
          permissions: state.permissions.map(permission =>
            permission.id === id ? { ...permission, ...updates } : permission
          ),
        })),

      deletePermission: id =>
        set(state => ({
          permissions: state.permissions.filter(
            permission => permission.id !== id
          ),
        })),

      // Utility functions
      setLoading: (key, value) =>
        set(state => ({
          loading: { ...state.loading, [key]: value },
        })),

      setSearchQuery: (key, query) =>
        set(state => ({
          searchQueries: { ...state.searchQueries, [key]: query },
        })),

      setFilter: (key, filter) =>
        set(state => ({
          filters: { ...state.filters, [key]: filter },
        })),

      refreshData: async () => {
        set({ loading: { ...get().loading, refresh: true } });
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ loading: { ...get().loading, refresh: false } });
      },

      // UI state
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // User preferences
      darkMode: false,
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),

      // User management functions
      updateUserStatus: (id, status) =>
        set(state => ({
          users: state.users.map(user =>
            user.id === id
              ? {
                  ...user,
                  status: status as 'active' | 'inactive' | 'suspended',
                }
              : user
          ),
        })),

      updateUserRole: (id, role) =>
        set(state => ({
          users: state.users.map(user =>
            user.id === id
              ? {
                  ...user,
                  role: role as 'customer' | 'agent' | 'admin' | 'captain',
                }
              : user
          ),
        })),

      exportUsersReport: async users => {
        console.log('Exporting users report:', users);
        // Simulate file saving
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Users report exported successfully!');
      },

      // Alert management functions
      deleteAlert: id =>
        set(state => ({
          alerts: state.alerts.filter(alert => alert.id !== id),
        })),

      // System management functions
      systemSettings: {},
      adminPermissions: [],
      updateSystemSettings: async settings => {
        console.log('Updating system settings:', settings);
        // Simulate saving settings
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('System settings updated successfully!');
      },
      backupDatabase: async () => {
        console.log('Backing up database...');
        // Simulate backup
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Database backed up successfully!');
      },
      restoreDatabase: async () => {
        console.log('Restoring database...');
        // Simulate restore
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Database restored successfully!');
      },
      exportActivityLogs: async logs => {
        console.log('Exporting activity logs:', logs);
        // Simulate file saving
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Activity logs exported successfully!');
      },
      exportSystemReport: async type => {
        console.log('Exporting system report of type:', type);
        // Simulate file saving
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('System report exported successfully!');
      },
    }),
    {
      name: 'admin-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        itemsPerPage: state.itemsPerPage,
      }),
    }
  )
);
