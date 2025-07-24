import { useAuthStore } from '@/store/authStore';
import { AdminPermission, PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '@/types/admin';
import { useEnhancedAdminPermissions } from './usePermissionManagement';

export const useAdminPermissions = () => {
    const { user, isAuthenticated } = useAuthStore();

    // Use the new enhanced permission system
    const enhancedPermissions = useEnhancedAdminPermissions();

    // Transform permissions to maintain compatibility with existing code
    const userPermissions: AdminPermission[] = (enhancedPermissions.permissions || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        resource: p.resource,
        action: p.action,
        created_at: p.created_at,
    }));

    // Use enhanced permission system for all permission checks
    const hasPermission = enhancedPermissions.hasPermission;
    const canAccessTab = (tabPermissions: string[]): boolean => {
        if (!isAuthenticated || !user?.profile) {
            return false;
        }

        if (tabPermissions.length === 0) {
            return true; // No permissions required
        }

        return tabPermissions.some(permission => {
            const [resource, action] = permission.split(':');
            return hasPermission(resource as any, action as any);
        });
    };

    // All permission checks now use the enhanced system
    const canViewDashboard = enhancedPermissions.canViewDashboard;
    const canViewBookings = enhancedPermissions.canViewBookings;
    const canCreateBookings = enhancedPermissions.canCreateBookings;
    const canUpdateBookings = enhancedPermissions.canUpdateBookings;
    const canCancelBookings = () => hasPermission('bookings', 'cancel');
    const canExportBookings = () => hasPermission('bookings', 'export');

    // Operations permissions
    const canViewRoutes = () => hasPermission('routes', 'view');
    const canCreateRoutes = () => hasPermission('routes', 'create');
    const canUpdateRoutes = () => hasPermission('routes', 'update');
    const canDeleteRoutes = () => hasPermission('routes', 'delete');
    const canManageRoutes = () => hasPermission('routes', 'manage') || canCreateRoutes() || canUpdateRoutes() || canDeleteRoutes();

    const canViewTrips = () => hasPermission('trips', 'view');
    const canCreateTrips = () => hasPermission('trips', 'create');
    const canUpdateTrips = () => hasPermission('trips', 'update');
    const canDeleteTrips = () => hasPermission('trips', 'delete');
    const canManageTrips = () => hasPermission('trips', 'manage') || canCreateTrips() || canUpdateTrips() || canDeleteTrips();

    const canViewVessels = () => hasPermission('vessels', 'view');
    const canCreateVessels = () => hasPermission('vessels', 'create');
    const canUpdateVessels = () => hasPermission('vessels', 'update');
    const canDeleteVessels = () => hasPermission('vessels', 'delete');
    const canManageVessels = () => hasPermission('vessels', 'manage') || canCreateVessels() || canUpdateVessels() || canDeleteVessels();

    // Islands permissions
    const canViewIslands = () => hasPermission('islands', 'view');
    const canCreateIslands = () => hasPermission('islands', 'create');
    const canUpdateIslands = () => hasPermission('islands', 'update');
    const canDeleteIslands = () => hasPermission('islands', 'delete');
    const canManageIslands = () => hasPermission('islands', 'manage') || canCreateIslands() || canUpdateIslands() || canDeleteIslands();

    // Content Management permissions
    const canViewZones = () => hasPermission('zones', 'view');
    const canCreateZones = () => hasPermission('zones', 'create');
    const canUpdateZones = () => hasPermission('zones', 'update');
    const canDeleteZones = () => hasPermission('zones', 'delete');
    const canManageZones = () => hasPermission('zones', 'manage') || canCreateZones() || canUpdateZones() || canDeleteZones();

    const canViewFAQ = () => hasPermission('faq', 'view');
    const canCreateFAQ = () => hasPermission('faq', 'create');
    const canUpdateFAQ = () => hasPermission('faq', 'update');
    const canDeleteFAQ = () => hasPermission('faq', 'delete');
    const canManageFAQ = () => hasPermission('faq', 'manage') || canCreateFAQ() || canUpdateFAQ() || canDeleteFAQ();

    const canViewContent = () => hasPermission('content', 'view');
    const canCreateContent = () => hasPermission('content', 'create');
    const canUpdateContent = () => hasPermission('content', 'update');
    const canDeleteContent = () => hasPermission('content', 'delete');
    const canManageContent = () => hasPermission('content', 'manage') || canCreateContent() || canUpdateContent() || canDeleteContent();

    // User management permissions
    const canViewUsers = enhancedPermissions.canViewUsers;
    const canCreateUsers = enhancedPermissions.canCreateUsers;
    const canUpdateUsers = enhancedPermissions.canUpdateUsers;
    const canDeleteUsers = enhancedPermissions.canDeleteUsers;
    const canManageUsers = () => hasPermission('users', 'manage') || canCreateUsers() || canUpdateUsers() || canDeleteUsers();
    const canManageRoles = () => hasPermission('permissions', 'manage');

    const canViewAgents = () => hasPermission('agents', 'view');
    const canManageAgents = () => hasPermission('agents', 'manage');

    const canViewPassengers = () => hasPermission('passengers', 'view');
    const canManagePassengers = () => hasPermission('passengers', 'manage');

    // Financial permissions
    const canViewWallets = () => hasPermission('wallets', 'view');
    const canManageWallets = () => hasPermission('wallets', 'manage');
    const canViewPayments = () => hasPermission('payments', 'view');
    const canManagePayments = () => hasPermission('payments', 'manage');

    // Communication permissions
    const canViewNotifications = () => hasPermission('notifications', 'view');
    const canSendNotifications = () => hasPermission('notifications', 'send');
    const canViewBulkMessages = () => hasPermission('bulk_messages', 'view');
    const canSendBulkMessages = () => hasPermission('bulk_messages', 'send');

    // Settings and reports permissions
    const canViewReports = () => hasPermission('reports', 'view');
    const canCreateReports = () => hasPermission('reports', 'create');
    const canExportReports = () => hasPermission('reports', 'export');

    const canViewSettings = enhancedPermissions.canViewSettings;
    const canManageSettings = enhancedPermissions.canManageSettings;
    const canManageSystemSettings = () => hasPermission('settings', 'manage');

    const canViewPermissions = () => hasPermission('permissions', 'view');
    const canManagePermissions = enhancedPermissions.canManagePermissions;

    const canViewActivityLogs = () => hasPermission('activity_logs', 'view');
    const canViewAlerts = () => hasPermission('settings', 'view'); // Alerts are part of settings

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