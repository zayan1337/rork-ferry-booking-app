import { useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { AdminPermission, PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '@/types/admin';

export const useAdminPermissions = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { getUserPermissions, hasPermission, adminUsers, data: permissions, fetchAll, loading } = usePermissionStore();

    // Auto-fetch permission data when authenticated
    useEffect(() => {
        if (isAuthenticated && user?.profile?.id && permissions.length === 0 && !loading.fetchAll) {
            fetchAll();
        }
    }, [isAuthenticated, user?.profile?.id, permissions.length, loading.fetchAll, fetchAll]);

    // Get current user's admin profile
    const currentAdminUser = useMemo(() => {
        if (!user?.profile?.id) return null;
        return adminUsers.find((u: any) => u.id === user.profile?.id);
    }, [user?.profile?.id, adminUsers]);

    // Check if current user is super admin
    const isSuperAdmin = useMemo(() => {
        return currentAdminUser?.is_super_admin === true;
    }, [currentAdminUser]);

    // Get all possible permissions for super admin (from database)
    const getAllPossiblePermissions = (): AdminPermission[] => {
        return permissions.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            resource: p.resource as any,
            action: p.action as any,
            created_at: p.created_at
        }));
    };

    // Get admin permissions based on database data
    const getAdminPermissions = (): AdminPermission[] => {
        if (!isAuthenticated || !user?.profile || !currentAdminUser) {
            return [];
        }

        // Super admins get all permissions
        if (isSuperAdmin) {
            return getAllPossiblePermissions();
        }

        // Regular users get their assigned permissions
        const userPermissionIds = getUserPermissions(user.profile.id);
        return convertPermissionIdsToAdminPermissions(userPermissionIds);
    };

    // Convert permission IDs to AdminPermission objects
    const convertPermissionIdsToAdminPermissions = (permissionIds: string[]): AdminPermission[] => {
        return permissions
            .filter(p => permissionIds.includes(p.id))
            .map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                resource: p.resource as any,
                action: p.action as any,
                created_at: p.created_at
            }));
    };

    // Main permission check function
    const hasPermissionCheck = (resource: string, action: string): boolean => {
        if (!isAuthenticated || !user?.profile) {
            return false;
        }

        // Super admins have all permissions
        if (isSuperAdmin) {
            return true;
        }

        // Check specific permission
        if (user.profile.id) {
            return hasPermission(user.profile.id, resource, action);
        }

        return false;
    };

    // Tab access permissions
    const canAccessTab = (tabPermissions: string[]): boolean => {
        if (!isAuthenticated || !user?.profile) {
            return false;
        }

        // Super admins can access all tabs
        if (isSuperAdmin) {
            return true;
        }

        // Check if user has any of the required permissions
        return tabPermissions.some(permission => {
            const [resource, action] = permission.split(':');
            return hasPermissionCheck(resource, action);
        });
    };

    // =====================================================
    // SPECIFIC PERMISSION CHECKS
    // =====================================================

    // Dashboard permissions
    const canViewDashboard = () => hasPermissionCheck(PERMISSION_RESOURCES.DASHBOARD, PERMISSION_ACTIONS.VIEW);

    // Booking permissions
    const canViewBookings = () => hasPermissionCheck(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.VIEW);
    const canCreateBookings = () => hasPermissionCheck(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.CREATE);
    const canUpdateBookings = () => hasPermissionCheck(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.UPDATE);
    const canCancelBookings = () => hasPermissionCheck(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.CANCEL);
    const canExportBookings = () => hasPermissionCheck(PERMISSION_RESOURCES.BOOKINGS, PERMISSION_ACTIONS.EXPORT);

    // Operations permissions (Routes, Trips, Vessels)
    const canViewRoutes = () => hasPermissionCheck(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.VIEW);
    const canCreateRoutes = () => hasPermissionCheck(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.CREATE);
    const canUpdateRoutes = () => hasPermissionCheck(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.UPDATE);
    const canDeleteRoutes = () => hasPermissionCheck(PERMISSION_RESOURCES.ROUTES, PERMISSION_ACTIONS.DELETE);
    const canManageRoutes = () => canCreateRoutes() || canUpdateRoutes() || canDeleteRoutes();

    const canViewTrips = () => hasPermissionCheck(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.VIEW);
    const canCreateTrips = () => hasPermissionCheck(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.CREATE);
    const canUpdateTrips = () => hasPermissionCheck(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteTrips = () => hasPermissionCheck(PERMISSION_RESOURCES.TRIPS, PERMISSION_ACTIONS.DELETE);
    const canManageTrips = () => canCreateTrips() || canUpdateTrips() || canDeleteTrips();

    const canViewVessels = () => hasPermissionCheck(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.VIEW);
    const canCreateVessels = () => hasPermissionCheck(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.CREATE);
    const canUpdateVessels = () => hasPermissionCheck(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteVessels = () => hasPermissionCheck(PERMISSION_RESOURCES.VESSELS, PERMISSION_ACTIONS.DELETE);
    const canManageVessels = () => canCreateVessels() || canUpdateVessels() || canDeleteVessels();

    // Content Management permissions (Islands, Zones, FAQ, Content)
    const canViewIslands = () => hasPermissionCheck(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.VIEW);
    const canCreateIslands = () => hasPermissionCheck(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.CREATE);
    const canUpdateIslands = () => hasPermissionCheck(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteIslands = () => hasPermissionCheck(PERMISSION_RESOURCES.ISLANDS, PERMISSION_ACTIONS.DELETE);
    const canManageIslands = () => canCreateIslands() || canUpdateIslands() || canDeleteIslands();

    const canViewZones = () => hasPermissionCheck(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.VIEW);
    const canCreateZones = () => hasPermissionCheck(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.CREATE);
    const canUpdateZones = () => hasPermissionCheck(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.UPDATE);
    const canDeleteZones = () => hasPermissionCheck(PERMISSION_RESOURCES.ZONES, PERMISSION_ACTIONS.DELETE);
    const canManageZones = () => canCreateZones() || canUpdateZones() || canDeleteZones();

    const canViewFAQ = () => hasPermissionCheck(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.VIEW);
    const canCreateFAQ = () => hasPermissionCheck(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.CREATE);
    const canUpdateFAQ = () => hasPermissionCheck(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.UPDATE);
    const canDeleteFAQ = () => hasPermissionCheck(PERMISSION_RESOURCES.FAQ, PERMISSION_ACTIONS.DELETE);
    const canManageFAQ = () => canCreateFAQ() || canUpdateFAQ() || canDeleteFAQ();

    const canViewContent = () => hasPermissionCheck(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.VIEW);
    const canCreateContent = () => hasPermissionCheck(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.CREATE);
    const canUpdateContent = () => hasPermissionCheck(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.UPDATE);
    const canDeleteContent = () => hasPermissionCheck(PERMISSION_RESOURCES.CONTENT, PERMISSION_ACTIONS.DELETE);
    const canManageContent = () => canCreateContent() || canUpdateContent() || canDeleteContent();

    // User management permissions
    const canViewUsers = () => hasPermissionCheck(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.VIEW);
    const canCreateUsers = () => hasPermissionCheck(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.CREATE);
    const canUpdateUsers = () => hasPermissionCheck(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.UPDATE);
    const canDeleteUsers = () => hasPermissionCheck(PERMISSION_RESOURCES.USERS, PERMISSION_ACTIONS.DELETE);
    const canManageUsers = () => canCreateUsers() || canUpdateUsers() || canDeleteUsers();

    const canManageRoles = () => hasPermissionCheck(PERMISSION_RESOURCES.PERMISSIONS, PERMISSION_ACTIONS.MANAGE);

    const canViewAgents = () => hasPermissionCheck(PERMISSION_RESOURCES.AGENTS, PERMISSION_ACTIONS.VIEW);
    const canManageAgents = () => hasPermissionCheck(PERMISSION_RESOURCES.AGENTS, PERMISSION_ACTIONS.MANAGE);

    const canViewPassengers = () => hasPermissionCheck(PERMISSION_RESOURCES.PASSENGERS, PERMISSION_ACTIONS.VIEW);
    const canManagePassengers = () => hasPermissionCheck(PERMISSION_RESOURCES.PASSENGERS, PERMISSION_ACTIONS.MANAGE);

    // Financial permissions
    const canViewWallets = () => hasPermissionCheck(PERMISSION_RESOURCES.WALLETS, PERMISSION_ACTIONS.VIEW);
    const canManageWallets = () => hasPermissionCheck(PERMISSION_RESOURCES.WALLETS, PERMISSION_ACTIONS.MANAGE);

    const canViewPayments = () => hasPermissionCheck(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.VIEW);
    const canManagePayments = () => hasPermissionCheck(PERMISSION_RESOURCES.PAYMENTS, PERMISSION_ACTIONS.MANAGE);

    // Communication permissions
    const canViewNotifications = () => hasPermissionCheck(PERMISSION_RESOURCES.NOTIFICATIONS, PERMISSION_ACTIONS.VIEW);
    const canSendNotifications = () => hasPermissionCheck(PERMISSION_RESOURCES.NOTIFICATIONS, PERMISSION_ACTIONS.SEND);

    const canViewBulkMessages = () => hasPermissionCheck(PERMISSION_RESOURCES.BULK_MESSAGES, PERMISSION_ACTIONS.VIEW);
    const canSendBulkMessages = () => hasPermissionCheck(PERMISSION_RESOURCES.BULK_MESSAGES, PERMISSION_ACTIONS.SEND);

    // Settings and administration permissions
    const canViewReports = () => hasPermissionCheck(PERMISSION_RESOURCES.REPORTS, PERMISSION_ACTIONS.VIEW);
    const canCreateReports = () => hasPermissionCheck(PERMISSION_RESOURCES.REPORTS, PERMISSION_ACTIONS.CREATE);
    const canExportReports = () => hasPermissionCheck(PERMISSION_RESOURCES.REPORTS, PERMISSION_ACTIONS.EXPORT);

    const canViewSettings = () => hasPermissionCheck(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.VIEW);
    const canManageSettings = () => hasPermissionCheck(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.MANAGE);
    const canManageSystemSettings = () => hasPermissionCheck(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.MANAGE);

    const canViewPermissions = () => hasPermissionCheck(PERMISSION_RESOURCES.PERMISSIONS, PERMISSION_ACTIONS.VIEW);
    const canManagePermissions = () => hasPermissionCheck(PERMISSION_RESOURCES.PERMISSIONS, PERMISSION_ACTIONS.MANAGE);

    const canViewActivityLogs = () => hasPermissionCheck(PERMISSION_RESOURCES.ACTIVITY_LOGS, PERMISSION_ACTIONS.VIEW);
    const canViewAlerts = () => hasPermissionCheck(PERMISSION_RESOURCES.SETTINGS, PERMISSION_ACTIONS.VIEW); // Alerts are part of settings

    // =====================================================
    // TAB ACCESS PERMISSIONS
    // =====================================================

    const canAccessOperationsTab = () => canViewRoutes() || canViewTrips() || canViewVessels();
    const canAccessUsersTab = () => canViewUsers() || canViewAgents() || canViewPassengers();
    const canAccessFinanceTab = () => canViewWallets() || canViewPayments();
    const canAccessCommunicationsTab = () => canViewNotifications() || canViewBulkMessages();
    const canAccessSettingsTab = () => canViewSettings() || canViewReports() || canViewPermissions() || canViewActivityLogs();

    // Check if admin has any permissions at all
    const hasAnyPermissions = (): boolean => {
        // Super admins always have access
        if (isSuperAdmin) return true;

        // Check if user has any direct permissions
        const userPerms = getUserPermissions();
        if (userPerms.length > 0) return true;

        // Check if any tab access functions return true
        return canViewDashboard() ||
            canViewBookings() ||
            canAccessOperationsTab() ||
            canAccessUsersTab() ||
            canAccessFinanceTab() ||
            canAccessCommunicationsTab() ||
            canAccessSettingsTab();
    };

    // Get list of accessible tabs for the current user
    const getAccessibleTabs = () => {
        const tabs = [];

        if (canViewDashboard()) {
            tabs.push({ name: 'dashboard', title: 'Dashboard', permission: 'dashboard:view' });
        }
        if (canViewBookings()) {
            tabs.push({ name: 'bookings', title: 'Bookings', permission: 'bookings:view' });
        }
        if (canAccessOperationsTab()) {
            tabs.push({ name: 'operations', title: 'Operations', permission: 'operations access' });
        }
        if (canAccessUsersTab()) {
            tabs.push({ name: 'users', title: 'Users', permission: 'users access' });
        }
        if (canAccessFinanceTab()) {
            tabs.push({ name: 'finance', title: 'Finance', permission: 'finance access' });
        }
        if (canAccessCommunicationsTab()) {
            tabs.push({ name: 'communications', title: 'Communications', permission: 'communications access' });
        }
        if (canAccessSettingsTab()) {
            tabs.push({ name: 'settings', title: 'Settings', permission: 'settings access' });
        }

        return tabs;
    };

    return {
        // User state
        currentAdminUser,
        isSuperAdmin,
        getAdminPermissions,
        hasPermissionCheck,
        canAccessTab,
        hasAnyPermissions,
        getAccessibleTabs,

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

        // Content Management
        canViewIslands,
        canCreateIslands,
        canUpdateIslands,
        canDeleteIslands,
        canManageIslands,

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

        // Finance
        canViewWallets,
        canManageWallets,

        canViewPayments,
        canManagePayments,

        // Communications
        canViewNotifications,
        canSendNotifications,

        canViewBulkMessages,
        canSendBulkMessages,

        // Settings & Administration
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

        // Tab Access
        canAccessOperationsTab,
        canAccessUsersTab,
        canAccessFinanceTab,
        canAccessCommunicationsTab,
        canAccessSettingsTab,
    };
}; 