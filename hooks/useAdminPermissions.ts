import { useAuthStore } from '@/store/authStore';
import { AdminPermission, PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '@/types/admin';

export const useAdminPermissions = () => {
    const { user, isAuthenticated } = useAuthStore();

    // Mock admin permissions - In real app, this would come from user profile or API
    const getAdminPermissions = (): AdminPermission[] => {
        if (!isAuthenticated || !user?.profile || user.profile.role !== 'admin') {
            return [];
        }

        // For now, return all permissions for admin users
        // In production, this should be fetched from the database based on user's role
        const allPermissions: AdminPermission[] = [
            // Dashboard permissions
            { id: '1', name: 'dashboard:view', description: 'View dashboard', resource: PERMISSION_RESOURCES.DASHBOARD, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },

            // Booking permissions
            { id: '2', name: 'bookings:view', description: 'View bookings', resource: PERMISSION_RESOURCES.BOOKINGS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '3', name: 'bookings:create', description: 'Create bookings', resource: PERMISSION_RESOURCES.BOOKINGS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '4', name: 'bookings:update', description: 'Update bookings', resource: PERMISSION_RESOURCES.BOOKINGS, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '5', name: 'bookings:cancel', description: 'Cancel bookings', resource: PERMISSION_RESOURCES.BOOKINGS, action: PERMISSION_ACTIONS.CANCEL, created_at: new Date().toISOString() },
            { id: '6', name: 'bookings:export', description: 'Export bookings', resource: PERMISSION_RESOURCES.BOOKINGS, action: PERMISSION_ACTIONS.EXPORT, created_at: new Date().toISOString() },

            // Operations permissions (Routes, Trips, Vessels)
            { id: '7', name: 'routes:view', description: 'View routes', resource: PERMISSION_RESOURCES.ROUTES, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '8', name: 'routes:create', description: 'Create routes', resource: PERMISSION_RESOURCES.ROUTES, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '9', name: 'routes:update', description: 'Update routes', resource: PERMISSION_RESOURCES.ROUTES, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '10', name: 'routes:delete', description: 'Delete routes', resource: PERMISSION_RESOURCES.ROUTES, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            { id: '11', name: 'trips:view', description: 'View trips', resource: PERMISSION_RESOURCES.TRIPS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '12', name: 'trips:create', description: 'Create trips', resource: PERMISSION_RESOURCES.TRIPS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '13', name: 'trips:update', description: 'Update trips', resource: PERMISSION_RESOURCES.TRIPS, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '14', name: 'trips:delete', description: 'Delete trips', resource: PERMISSION_RESOURCES.TRIPS, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            { id: '15', name: 'vessels:view', description: 'View vessels', resource: PERMISSION_RESOURCES.VESSELS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '16', name: 'vessels:create', description: 'Create vessels', resource: PERMISSION_RESOURCES.VESSELS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '17', name: 'vessels:update', description: 'Update vessels', resource: PERMISSION_RESOURCES.VESSELS, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '18', name: 'vessels:delete', description: 'Delete vessels', resource: PERMISSION_RESOURCES.VESSELS, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            // Islands permissions
            { id: '19', name: 'islands:view', description: 'View islands', resource: PERMISSION_RESOURCES.ISLANDS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '20', name: 'islands:create', description: 'Create islands', resource: PERMISSION_RESOURCES.ISLANDS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '21', name: 'islands:update', description: 'Update islands', resource: PERMISSION_RESOURCES.ISLANDS, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '22', name: 'islands:delete', description: 'Delete islands', resource: PERMISSION_RESOURCES.ISLANDS, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            // Content Management permissions
            { id: '23', name: 'zones:view', description: 'View zones', resource: PERMISSION_RESOURCES.ZONES, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '24', name: 'zones:create', description: 'Create zones', resource: PERMISSION_RESOURCES.ZONES, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '25', name: 'zones:update', description: 'Update zones', resource: PERMISSION_RESOURCES.ZONES, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '26', name: 'zones:delete', description: 'Delete zones', resource: PERMISSION_RESOURCES.ZONES, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            { id: '27', name: 'faq:view', description: 'View FAQ', resource: PERMISSION_RESOURCES.FAQ, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '28', name: 'faq:create', description: 'Create FAQ', resource: PERMISSION_RESOURCES.FAQ, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '29', name: 'faq:update', description: 'Update FAQ', resource: PERMISSION_RESOURCES.FAQ, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '30', name: 'faq:delete', description: 'Delete FAQ', resource: PERMISSION_RESOURCES.FAQ, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            { id: '31', name: 'content:view', description: 'View content', resource: PERMISSION_RESOURCES.CONTENT, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '32', name: 'content:create', description: 'Create content', resource: PERMISSION_RESOURCES.CONTENT, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '33', name: 'content:update', description: 'Update content', resource: PERMISSION_RESOURCES.CONTENT, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '34', name: 'content:delete', description: 'Delete content', resource: PERMISSION_RESOURCES.CONTENT, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            { id: '35', name: 'translations:view', description: 'View translations', resource: PERMISSION_RESOURCES.TRANSLATIONS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '36', name: 'translations:create', description: 'Create translations', resource: PERMISSION_RESOURCES.TRANSLATIONS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '37', name: 'translations:update', description: 'Update translations', resource: PERMISSION_RESOURCES.TRANSLATIONS, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '38', name: 'translations:delete', description: 'Delete translations', resource: PERMISSION_RESOURCES.TRANSLATIONS, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },
            { id: '39', name: 'translations:export', description: 'Export translations', resource: PERMISSION_RESOURCES.TRANSLATIONS, action: PERMISSION_ACTIONS.EXPORT, created_at: new Date().toISOString() },

            // User management permissions
            { id: '40', name: 'users:view', description: 'View users', resource: PERMISSION_RESOURCES.USERS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '41', name: 'users:create', description: 'Create users', resource: PERMISSION_RESOURCES.USERS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '42', name: 'users:update', description: 'Update users', resource: PERMISSION_RESOURCES.USERS, action: PERMISSION_ACTIONS.UPDATE, created_at: new Date().toISOString() },
            { id: '43', name: 'users:delete', description: 'Delete users', resource: PERMISSION_RESOURCES.USERS, action: PERMISSION_ACTIONS.DELETE, created_at: new Date().toISOString() },

            { id: '44', name: 'agents:view', description: 'View agents', resource: PERMISSION_RESOURCES.AGENTS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '45', name: 'agents:manage', description: 'Manage agents', resource: PERMISSION_RESOURCES.AGENTS, action: PERMISSION_ACTIONS.MANAGE, created_at: new Date().toISOString() },

            { id: '46', name: 'passengers:view', description: 'View passengers', resource: PERMISSION_RESOURCES.PASSENGERS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '47', name: 'passengers:manage', description: 'Manage passengers', resource: PERMISSION_RESOURCES.PASSENGERS, action: PERMISSION_ACTIONS.MANAGE, created_at: new Date().toISOString() },

            // Financial permissions
            { id: '31', name: 'wallets:view', description: 'View wallets', resource: PERMISSION_RESOURCES.WALLETS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '32', name: 'wallets:manage', description: 'Manage wallets', resource: PERMISSION_RESOURCES.WALLETS, action: PERMISSION_ACTIONS.MANAGE, created_at: new Date().toISOString() },
            { id: '33', name: 'payments:view', description: 'View payments', resource: PERMISSION_RESOURCES.PAYMENTS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '34', name: 'payments:manage', description: 'Manage payments', resource: PERMISSION_RESOURCES.PAYMENTS, action: PERMISSION_ACTIONS.MANAGE, created_at: new Date().toISOString() },

            // Communication permissions
            { id: '35', name: 'notifications:view', description: 'View notifications', resource: PERMISSION_RESOURCES.NOTIFICATIONS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '36', name: 'notifications:send', description: 'Send notifications', resource: PERMISSION_RESOURCES.NOTIFICATIONS, action: PERMISSION_ACTIONS.SEND, created_at: new Date().toISOString() },
            { id: '37', name: 'bulk_messages:view', description: 'View bulk messages', resource: PERMISSION_RESOURCES.BULK_MESSAGES, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '38', name: 'bulk_messages:send', description: 'Send bulk messages', resource: PERMISSION_RESOURCES.BULK_MESSAGES, action: PERMISSION_ACTIONS.SEND, created_at: new Date().toISOString() },

            // Settings and administration
            { id: '39', name: 'reports:view', description: 'View reports', resource: PERMISSION_RESOURCES.REPORTS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '40', name: 'reports:create', description: 'Create reports', resource: PERMISSION_RESOURCES.REPORTS, action: PERMISSION_ACTIONS.CREATE, created_at: new Date().toISOString() },
            { id: '41', name: 'reports:export', description: 'Export reports', resource: PERMISSION_RESOURCES.REPORTS, action: PERMISSION_ACTIONS.EXPORT, created_at: new Date().toISOString() },

            { id: '42', name: 'settings:view', description: 'View settings', resource: PERMISSION_RESOURCES.SETTINGS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '43', name: 'settings:manage', description: 'Manage settings', resource: PERMISSION_RESOURCES.SETTINGS, action: PERMISSION_ACTIONS.MANAGE, created_at: new Date().toISOString() },

            { id: '44', name: 'permissions:view', description: 'View permissions', resource: PERMISSION_RESOURCES.PERMISSIONS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() },
            { id: '45', name: 'permissions:manage', description: 'Manage permissions', resource: PERMISSION_RESOURCES.PERMISSIONS, action: PERMISSION_ACTIONS.MANAGE, created_at: new Date().toISOString() },

            { id: '46', name: 'activity_logs:view', description: 'View activity logs', resource: PERMISSION_RESOURCES.ACTIVITY_LOGS, action: PERMISSION_ACTIONS.VIEW, created_at: new Date().toISOString() }
        ];

        return allPermissions;
    };

    const userPermissions = getAdminPermissions();

    // Check if user has a specific permission
    const hasPermission = (resource: string, action: string): boolean => {
        if (!isAuthenticated || !user?.profile) {
            return false;
        }

        // Super admin access
        if (user.profile.role === 'admin') {
            return userPermissions.some(p => p.resource === resource && p.action === action);
        }

        return false;
    };

    // Check if user can access a specific tab
    const canAccessTab = (tabPermissions: string[]): boolean => {
        if (!isAuthenticated || !user?.profile) {
            return false;
        }

        if (tabPermissions.length === 0) {
            return true; // No permissions required
        }

        return tabPermissions.some(permission => {
            const [resource, action] = permission.split(':');
            return hasPermission(resource, action);
        });
    };

    // Specific permission check functions
    const canViewDashboard = () => hasPermission(PERMISSION_RESOURCES.DASHBOARD, PERMISSION_ACTIONS.VIEW);

    // Booking permissions
    const canViewBookings = () => hasPermission(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.VIEW);
    const canCreateBookings = () => hasPermission(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.CREATE);
    const canUpdateBookings = () => hasPermission(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.UPDATE);
    const canCancelBookings = () => hasPermission(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.CANCEL);
    const canExportBookings = () => hasPermission(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.EXPORT);

    // Operations permissions
    const canViewRoutes = () => hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.VIEW);
    const canCreateRoutes = () => hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.CREATE);
    const canUpdateRoutes = () => hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.UPDATE);
    const canDeleteRoutes = () => hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.DELETE);
    const canManageRoutes = () => hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.DELETE);

    const canViewTrips = () => hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.VIEW);
    const canCreateTrips = () => hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.CREATE);
    const canUpdateTrips = () => hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteTrips = () => hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.DELETE);
    const canManageTrips = () => hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.DELETE);

    const canViewVessels = () => hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.VIEW);
    const canCreateVessels = () => hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.CREATE);
    const canUpdateVessels = () => hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteVessels = () => hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.DELETE);
    const canManageVessels = () => hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.DELETE);

    // Islands permissions
    const canViewIslands = () => hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.VIEW);
    const canCreateIslands = () => hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.CREATE);
    const canUpdateIslands = () => hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteIslands = () => hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.DELETE);
    const canManageIslands = () => hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.DELETE);

    // Content Management permissions
    const canViewZones = () => hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.VIEW);
    const canCreateZones = () => hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.CREATE);
    const canUpdateZones = () => hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.UPDATE);
    const canDeleteZones = () => hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.DELETE);
    const canManageZones = () => hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.DELETE);

    const canViewFAQ = () => hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.VIEW);
    const canCreateFAQ = () => hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.CREATE);
    const canUpdateFAQ = () => hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.UPDATE);
    const canDeleteFAQ = () => hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.DELETE);
    const canManageFAQ = () => hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.DELETE);

    const canViewContent = () => hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.VIEW);
    const canCreateContent = () => hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.CREATE);
    const canUpdateContent = () => hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.UPDATE);
    const canDeleteContent = () => hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.DELETE);
    const canManageContent = () => hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.DELETE);

    const canViewTranslations = () => hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.VIEW);
    const canCreateTranslations = () => hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.CREATE);
    const canUpdateTranslations = () => hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteTranslations = () => hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.DELETE);
    const canExportTranslations = () => hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.EXPORT);
    const canManageTranslations = () => hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.TRANSLATIONS, PERMISSION_ACTIONS.DELETE);

    // User management permissions
    const canViewUsers = () => hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.VIEW);
    const canCreateUsers = () => hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.CREATE);
    const canUpdateUsers = () => hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteUsers = () => hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.DELETE);
    const canManageUsers = () => hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.CREATE) ||
        hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.UPDATE) ||
        hasPermission(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.DELETE);
    const canManageRoles = () => hasPermission(PERMISSION_RESOURCES.PERMISSIONS, PERMISSION_ACTIONS.MANAGE);

    const canViewAgents = () => hasPermission(PERMISSION_RESOURCES.AGENTS, PERMISSION_ACTIONS.VIEW);
    const canManageAgents = () => hasPermission(PERMISSION_RESOURCES.AGENTS, PERMISSION_ACTIONS.MANAGE);

    const canViewPassengers = () => hasPermission(PERMISSION_RESOURCES.PASSENGERS, PERMISSION_ACTIONS.VIEW);
    const canManagePassengers = () => hasPermission(PERMISSION_RESOURCES.PASSENGERS, PERMISSION_ACTIONS.MANAGE);

    // Financial permissions
    const canViewWallets = () => hasPermission(PERMISSION_RESOURCES.WALLETS, PERMISSION_ACTIONS.VIEW);
    const canManageWallets = () => hasPermission(PERMISSION_RESOURCES.WALLETS, PERMISSION_ACTIONS.MANAGE);
    const canViewPayments = () => hasPermission(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.VIEW);
    const canManagePayments = () => hasPermission(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.MANAGE);

    // Communication permissions
    const canViewNotifications = () => hasPermission(PERMISSION_RESOURCES.NOTIFICATIONS, PERMISSION_ACTIONS.VIEW);
    const canSendNotifications = () => hasPermission(PERMISSION_RESOURCES.NOTIFICATIONS, PERMISSION_ACTIONS.SEND);
    const canViewBulkMessages = () => hasPermission(PERMISSION_RESOURCES.BULK_MESSAGES, PERMISSION_ACTIONS.VIEW);
    const canSendBulkMessages = () => hasPermission(PERMISSION_RESOURCES.BULK_MESSAGES, PERMISSION_ACTIONS.SEND);

    // Settings and reports permissions
    const canViewReports = () => hasPermission(PERMISSION_RESOURCES.REPORTS, PERMISSION_ACTIONS.VIEW);
    const canCreateReports = () => hasPermission(PERMISSION_RESOURCES.REPORTS, PERMISSION_ACTIONS.CREATE);
    const canExportReports = () => hasPermission(PERMISSION_RESOURCES.REPORTS, PERMISSION_ACTIONS.EXPORT);

    const canViewSettings = () => hasPermission(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.VIEW);
    const canManageSettings = () => hasPermission(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.MANAGE);
    const canManageSystemSettings = () => hasPermission(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.MANAGE);

    const canViewPermissions = () => hasPermission(PERMISSION_RESOURCES.PERMISSIONS, PERMISSION_ACTIONS.VIEW);
    const canManagePermissions = () => hasPermission(PERMISSION_RESOURCES.PERMISSIONS, PERMISSION_ACTIONS.MANAGE);

    const canViewActivityLogs = () => hasPermission(PERMISSION_RESOURCES.ACTIVITY_LOGS, PERMISSION_ACTIONS.VIEW);
    const canViewAlerts = () => hasPermission(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.VIEW); // Alerts are part of settings

    // Tab access functions
    const canAccessOperationsTab = () => canViewRoutes() || canViewTrips() || canViewVessels();
    const canAccessUsersTab = () => canViewUsers() || canViewAgents() || canViewPassengers();
    const canAccessFinanceTab = () => canViewWallets() || canViewPayments();
    const canAccessCommunicationsTab = () => canViewNotifications() || canViewBulkMessages();
    const canAccessSettingsTab = () => canViewSettings() || canViewReports() || canViewPermissions() || canViewActivityLogs();

    return {
        userPermissions,
        hasPermission,
        canAccessTab,

        // Dashboard
        canViewDashboard,

        // Bookings
        canViewBookings,
        canCreateBookings,
        canUpdateBookings,
        canCancelBookings,
        canExportBookings,

        // Operations
        canViewRoutes,
        canCreateRoutes,
        canUpdateRoutes,
        canDeleteRoutes,
        canManageRoutes,
        canViewTrips,
        canCreateTrips,
        canUpdateTrips,
        canDeleteTrips,
        canManageTrips,
        canViewVessels,
        canCreateVessels,
        canUpdateVessels,
        canDeleteVessels,
        canManageVessels,
        canAccessOperationsTab,

        // Islands
        canViewIslands,
        canCreateIslands,
        canUpdateIslands,
        canDeleteIslands,
        canManageIslands,

        // Content Management
        canViewZones,
        canCreateZones,
        canUpdateZones,
        canDeleteZones,
        canManageZones,
        canViewFAQ,
        canCreateFAQ,
        canUpdateFAQ,
        canDeleteFAQ,
        canManageFAQ,
        canViewContent,
        canCreateContent,
        canUpdateContent,
        canDeleteContent,
        canManageContent,
        canViewTranslations,
        canCreateTranslations,
        canUpdateTranslations,
        canDeleteTranslations,
        canExportTranslations,
        canManageTranslations,

        // Users
        canViewUsers,
        canCreateUsers,
        canUpdateUsers,
        canDeleteUsers,
        canManageUsers,
        canManageRoles,
        canViewAgents,
        canManageAgents,
        canViewPassengers,
        canManagePassengers,
        canAccessUsersTab,

        // Finance
        canViewWallets,
        canManageWallets,
        canViewPayments,
        canManagePayments,
        canAccessFinanceTab,

        // Communications
        canViewNotifications,
        canSendNotifications,
        canViewBulkMessages,
        canSendBulkMessages,
        canAccessCommunicationsTab,

        // Settings
        canViewReports,
        canCreateReports,
        canExportReports,
        canViewSettings,
        canManageSettings,
        canManageSystemSettings,
        canViewPermissions,
        canManagePermissions,
        canViewActivityLogs,
        canViewAlerts,
        canAccessSettingsTab,
    };
}; 